-- Held, not a migration: the back office is on hold (owner, 23 October 2026),
-- so these functions are not in production and nobody can create an
-- organisation or send a quotation yet. When it resumes, move this file to
-- supabase/migrations/ under a new timestamp. Through the Supabase MCP, a
-- request carrying sales_quotation_save never reached the database (the
-- other functions did), so reword that function or apply with the Supabase CLI.
--
-- Release 2's third part: the sales desk's functions, called by staff from
-- the hub. The tables and helpers they use are in
-- 20261023120000_buyer_portal.sql, whose header explains the access model.
-- Purely additive and safe to run again.

-- 1. The sales desk (staff in the hub) ------------------------------------------

create or replace function sales.require_desk(p_write boolean)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (p_write and not app.has_role('admin', 'approver')) or (not p_write and not app.is_staff()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return app.current_email();
end;
$$;
revoke all on function sales.require_desk(boolean) from public, anon, authenticated;

create or replace function public.sales_orgs()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform sales.require_desk(false);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'country', o.country, 'tax_id', o.tax_id, 'status', o.status,
      'cleared', portal.org_cleared(o.id), 'approved_by', o.approved_by, 'approved_at', o.approved_at,
      'members', (select count(*) from portal.member m where m.org_id = o.id),
      'kyc_pending', (select count(*) from portal.kyc_document k where k.org_id = o.id and k.status = 'pending'),
      'created_at', o.created_at
    ) order by o.name)
    from portal.organization o
  ), '[]'::jsonb);
end;
$$;

create or replace function public.sales_org(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  o portal.organization;
begin
  perform sales.require_desk(false);
  select * into o from portal.organization where id = p_id;
  if not found then
    raise exception 'organisation not found' using errcode = 'P0002';
  end if;
  return to_jsonb(o) || jsonb_build_object(
    'cleared', portal.org_cleared(o.id),
    'screening', (select to_jsonb(s) from logistics.counterparty_sanction s where s.id = o.screening_id),
    'members', coalesce((select jsonb_agg(to_jsonb(m) order by m.invited_at) from portal.member m where m.org_id = o.id), '[]'::jsonb),
    'kyc', coalesce((select jsonb_agg(to_jsonb(k) - 'object_path' order by k.uploaded_at desc) from portal.kyc_document k where k.org_id = o.id), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object('doc_id', s.doc_id, 'name', d.logical_name, 'class', d.doc_class,
        'order_id', s.order_id, 'shared_by', s.shared_by, 'shared_at', s.shared_at, 'expires_at', s.expires_at) order by s.shared_at desc)
      from portal.document_share s join public.documents d on d.id = s.doc_id where s.org_id = o.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Create (no id) or edit an organisation's details.
create or replace function public.sales_org_save(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me  text := sales.require_desk(true);
  oid uuid := case when p->>'id' ~ '^[0-9a-f-]{36}$' then (p->>'id')::uuid end;
begin
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'invalid organisation' using errcode = '22023';
  end if;
  if oid is null then
    insert into portal.organization (name, country, tax_id, created_by)
    values (btrim(p->>'name'), coalesce(upper(nullif(p->>'country', '')), 'IN'), nullif(btrim(coalesce(p->>'tax_id', '')), ''), me)
    returning id into oid;
    perform portal.log('organization_created', 'organization', oid::text, p - 'id');
  else
    update portal.organization
    set name = btrim(p->>'name'), country = coalesce(upper(nullif(p->>'country', '')), 'IN'),
        tax_id = nullif(btrim(coalesce(p->>'tax_id', '')), '')
    where id = oid;
    if not found then
      raise exception 'organisation not found' using errcode = 'P0002';
    end if;
    perform portal.log('organization_updated', 'organization', oid::text, p - 'id');
  end if;
  return oid;
end;
$$;

-- approve (with the screening it rests on), suspend, or reinstate (back to pending).
create or replace function public.sales_org_review(p_id uuid, p_action text, p_screening bigint default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := sales.require_desk(true);
begin
  if p_action = 'approve' then
    update portal.organization
    set status = 'approved', screening_id = p_screening, approved_by = me, approved_at = now()
    where id = p_id;
  elsif p_action = 'suspend' then
    update portal.organization set status = 'suspended' where id = p_id;
  elsif p_action = 'reinstate' then
    update portal.organization set status = 'pending', approved_by = null, approved_at = null where id = p_id;
  else
    raise exception 'unknown action' using errcode = '22023';
  end if;
  if not found then
    raise exception 'organisation not found' using errcode = 'P0002';
  end if;
  perform portal.log('organization_' || case p_action when 'approve' then 'approved' when 'suspend' then 'suspended' else 'reinstated' end,
    'organization', p_id::text, jsonb_build_object('screening_id', p_screening));
end;
$$;

create or replace function public.sales_kyc_review(p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := sales.require_desk(true);
begin
  if p_status is null or p_status not in ('accepted', 'rejected') then
    raise exception 'unknown status' using errcode = '22023';
  end if;
  update portal.kyc_document
  set status = p_status, reviewed_by = me, reviewed_at = now(), review_note = nullif(left(btrim(coalesce(p_note, '')), 500), '')
  where id = p_id;
  if not found then
    raise exception 'document not found' using errcode = 'P0002';
  end if;
  perform portal.log('kyc_' || p_status, 'kyc_document', p_id::text);
end;
$$;

create or replace function public.sales_member_remove(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := sales.require_desk(true);
  m  portal.member;
begin
  delete from portal.member where email = lower(p_email) returning * into m;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  perform portal.log('member_removed', 'member', m.email, jsonb_build_object('org_id', m.org_id));
end;
$$;

-- Create (no id) or edit a draft: its terms and its lines, replaced whole.
create or replace function public.sales_quotation_save(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me   text := sales.require_desk(true);
  qid  uuid := case when p->>'id' ~ '^[0-9a-f-]{36}$' then (p->>'id')::uuid end;
  cur  sales.quotation;
  line jsonb;
  pos  int := 0;
begin
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'lines') is distinct from 'array'
     or jsonb_array_length(p->'lines') not between 1 and 20 then
    raise exception 'a quotation needs between 1 and 20 lines' using errcode = '22023';
  end if;
  if (p->>'valid_until')::date < sales.today() then
    raise exception 'a quotation must be valid today or later' using errcode = '22023';
  end if;

  if qid is null then
    insert into sales.quotation (reference, org_id, request_id, currency, basis, payment_terms, valid_until, notes, created_by)
    values (
      sales.next_reference('QUO'), (p->>'org_id')::uuid,
      case when p->>'request_id' ~ '^[0-9a-f-]{36}$' then (p->>'request_id')::uuid end,
      coalesce(nullif(p->>'currency', ''), 'INR'), btrim(p->>'basis'), btrim(p->>'payment_terms'),
      (p->>'valid_until')::date, nullif(btrim(coalesce(p->>'notes', '')), ''), me
    )
    returning id into qid;
  else
    select * into cur from sales.quotation where id = qid for update;
    if not found then
      raise exception 'quotation not found' using errcode = 'P0002';
    end if;
    if cur.status <> 'draft' then
      raise exception 'only a draft can be edited' using errcode = '22023';
    end if;
    update sales.quotation
    set currency = coalesce(nullif(p->>'currency', ''), 'INR'), basis = btrim(p->>'basis'),
        payment_terms = btrim(p->>'payment_terms'), valid_until = (p->>'valid_until')::date,
        notes = nullif(btrim(coalesce(p->>'notes', '')), ''), updated_at = now()
    where id = qid;
    delete from sales.quotation_line where quotation_id = qid;
  end if;

  for line in select * from jsonb_array_elements(p->'lines') loop
    pos := pos + 1;
    insert into sales.quotation_line (quotation_id, position, product_slug, description, pack, quantity, uom, unit_price)
    values (
      qid, pos, nullif(line->>'product_slug', ''), btrim(line->>'description'), nullif(btrim(coalesce(line->>'pack', '')), ''),
      (line->>'quantity')::numeric, line->>'uom', (line->>'unit_price')::numeric
    );
  end loop;

  perform portal.log(case when cur.id is null then 'quotation_drafted' else 'quotation_edited' end, 'quotation', qid::text,
    jsonb_build_object('lines', pos));
  return qid;
end;
$$;

create or replace function public.sales_quotation_send(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me  text := sales.require_desk(true);
  rec sales.quotation;
begin
  select * into rec from sales.quotation where id = p_id for update;
  if not found then
    raise exception 'quotation not found' using errcode = 'P0002';
  end if;
  if rec.status <> 'draft' then
    raise exception 'only a draft can be sent' using errcode = '22023';
  end if;
  if rec.valid_until < sales.today() then
    raise exception 'its validity has passed; edit the date first' using errcode = '22023';
  end if;
  if not exists (select 1 from portal.member m where m.org_id = rec.org_id) then
    raise exception 'invite someone from the organisation first' using errcode = '22023';
  end if;
  update sales.quotation set status = 'sent', sent_by = me, sent_at = now(), updated_at = now() where id = p_id;
  update public.quote_requests set status = 'quoted' where id = rec.request_id and status in ('new', 'contacted');
  perform portal.log('quotation_sent', 'quotation', p_id::text, jsonb_build_object('reference', rec.reference, 'org_id', rec.org_id));
end;
$$;

create or replace function public.sales_quotation_withdraw(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := sales.require_desk(true);
begin
  update sales.quotation set status = 'withdrawn', updated_at = now() where id = p_id and status in ('draft', 'sent');
  if not found then
    raise exception 'only a draft or a sent quotation can be withdrawn' using errcode = '22023';
  end if;
  perform portal.log('quotation_withdrawn', 'quotation', p_id::text);
end;
$$;

create or replace function public.sales_quotations(p_org uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform sales.require_desk(false);
  return coalesce((
    select jsonb_agg(x.j order by x.created_at desc)
    from (
      select q.created_at, sales.quotation_json(q, true) - 'lines' as j
      from sales.quotation q where p_org is null or q.org_id = p_org
      order by q.created_at desc limit 200
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.sales_quotation(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rec sales.quotation;
begin
  perform sales.require_desk(false);
  select * into rec from sales.quotation where id = p_id;
  if not found then
    raise exception 'quotation not found' using errcode = 'P0002';
  end if;
  return sales.quotation_json(rec, true);
end;
$$;

-- An order from an accepted quotation, once the organisation is still cleared.
create or replace function public.sales_order_confirm(p_quotation uuid, p_po text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me  text := sales.require_desk(true);
  rec sales.quotation;
  oid uuid;
begin
  select * into rec from sales.quotation where id = p_quotation for update;
  if not found then
    raise exception 'quotation not found' using errcode = 'P0002';
  end if;
  if rec.status <> 'accepted' then
    raise exception 'only an accepted quotation becomes an order' using errcode = '22023';
  end if;
  if not portal.org_cleared(rec.org_id) then
    raise exception 'the organisation''s approval or screening has lapsed' using errcode = '22023';
  end if;
  insert into sales.sales_order (reference, quotation_id, org_id, po_number, created_by)
  values (sales.next_reference('ORD'), rec.id, rec.org_id, nullif(left(btrim(coalesce(p_po, '')), 60), ''), me)
  returning id into oid;
  update public.quote_requests set status = 'won' where id = rec.request_id;
  perform portal.log('order_confirmed', 'order', oid::text, jsonb_build_object('quotation', rec.reference, 'org_id', rec.org_id));
  return oid;
end;
$$;

create or replace function public.sales_order_update(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := sales.require_desk(true);
begin
  if p_status is null or p_status not in ('confirmed', 'dispatched', 'delivered', 'cancelled') then
    raise exception 'unknown status' using errcode = '22023';
  end if;
  update sales.sales_order set status = p_status, updated_at = now() where id = p_id;
  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  perform portal.log('order_' || p_status, 'order', p_id::text);
end;
$$;

create or replace function public.sales_orders(p_org uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform sales.require_desk(false);
  return coalesce((
    select jsonb_agg(x.j order by x.created_at desc)
    from (
      select o.created_at, sales.order_json(o) || jsonb_build_object('org_id', o.org_id,
        'org_name', (select g.name from portal.organization g where g.id = o.org_id)) as j
      from sales.sales_order o where p_org is null or o.org_id = p_org
      order by o.created_at desc limit 200
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Put a dispatch under an order (p_order null takes it off again).
create or replace function public.sales_shipment_link(p_shipment bigint, p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := sales.require_desk(true);
begin
  update logistics.shipment set order_id = p_order, updated_at = now() where id = p_shipment;
  if not found then
    raise exception 'shipment not found' using errcode = 'P0002';
  end if;
  perform portal.log('shipment_linked', 'shipment', p_shipment::text, jsonb_build_object('order_id', p_order));
end;
$$;

-- Share a vault document with an organisation, or stop (p_share false).
create or replace function public.sales_document_share(
  p_doc uuid, p_org uuid, p_share boolean default true, p_order uuid default null, p_expires timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := sales.require_desk(true);
begin
  if p_share then
    insert into portal.document_share (doc_id, org_id, order_id, shared_by, expires_at)
    values (p_doc, p_org, p_order, me, p_expires)
    on conflict (doc_id, org_id) do update set order_id = excluded.order_id, shared_by = excluded.shared_by,
      shared_at = now(), expires_at = excluded.expires_at;
    perform portal.log('document_shared', 'document', p_doc::text, jsonb_build_object('org_id', p_org, 'expires_at', p_expires));
  else
    delete from portal.document_share where doc_id = p_doc and org_id = p_org;
    perform portal.log('document_unshared', 'document', p_doc::text, jsonb_build_object('org_id', p_org));
  end if;
end;
$$;

create or replace function public.sales_privacy_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform sales.require_desk(false);
  return coalesce((select jsonb_agg(to_jsonb(p) order by (p.handled_at is null) desc, p.created_at desc) from portal.privacy_request p), '[]'::jsonb);
end;
$$;

create or replace function public.sales_privacy_handled(p_id uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := sales.require_desk(true);
begin
  update portal.privacy_request set handled_by = me, handled_at = now(), outcome = left(btrim(coalesce(p_outcome, '')), 1000)
  where id = p_id and handled_at is null;
  if not found then
    raise exception 'request not found or already handled' using errcode = 'P0002';
  end if;
  perform portal.log('privacy_request_handled', 'privacy_request', p_id::text);
end;
$$;

-- 2. Who may call what -------------------------------------------------------------

do $$
declare
  f text;
  desk text[] := array[
    'public.sales_orgs()', 'public.sales_org(uuid)', 'public.sales_org_save(jsonb)', 'public.sales_org_review(uuid, text, bigint)',
    'public.sales_kyc_review(uuid, text, text)', 'public.sales_member_remove(text)', 'public.sales_quotation_save(jsonb)',
    'public.sales_quotation_send(uuid)', 'public.sales_quotation_withdraw(uuid)', 'public.sales_quotations(uuid)',
    'public.sales_quotation(uuid)', 'public.sales_order_confirm(uuid, text)', 'public.sales_order_update(uuid, text)',
    'public.sales_orders(uuid)', 'public.sales_shipment_link(bigint, uuid)',
    'public.sales_document_share(uuid, uuid, boolean, uuid, timestamptz)', 'public.sales_privacy_requests()',
    'public.sales_privacy_handled(uuid, text)'];
begin
  foreach f in array desk loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    -- Staff in the hub; each function checks who they are itself.
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
