-- Release 2, part 2 of 3: the buyer portal's functions, called from
-- www.vasantpetrochem.com/account and by the `portal` Edge Function. The
-- tables and helpers they use are in 20261023120000_buyer_portal.sql, whose
-- header explains the access model. Purely additive and safe to run again.

-- 1. The buyer's functions (signed in, a member) --------------------------------

create or replace function public.portal_me()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me  portal.member;
  org portal.organization;
begin
  select m.* into me from portal.member m where m.email = app.current_email();
  if not found then
    return null;
  end if;
  select o.* into org from portal.organization o where o.id = me.org_id;
  if me.last_seen_at is null or me.last_seen_at < now() - interval '1 hour' then
    update portal.member set last_seen_at = now() where email = me.email;
  end if;
  return jsonb_build_object(
    'email', me.email,
    'role', me.role,
    'org', jsonb_build_object('id', org.id, 'name', org.name, 'country', org.country, 'status', org.status,
                              'cleared', portal.org_cleared(org.id)),
    'mfa', exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
  );
end;
$$;

create or replace function public.portal_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me portal.member := portal.me(array['admin', 'approver', 'buyer', 'finance']);
begin
  return coalesce((
    select jsonb_agg(x.j order by x.created_at desc)
    from (
      select r.created_at, jsonb_build_object(
        'reference', r.reference, 'created_at', r.created_at, 'type', r.request_type, 'status', r.status,
        'product_label', r.product_label, 'quantity', r.quantity, 'lines', r.lines, 'requested_by', lower(r.email)
      ) as j
      from public.quote_requests r
      where lower(r.email) in (select m.email from portal.member m where m.org_id = me.org_id)
         or r.id in (select q.request_id from sales.quotation q where q.org_id = me.org_id)
      order by r.created_at desc
      limit 100
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.portal_quotations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me portal.member := portal.me(array['admin', 'approver', 'buyer', 'finance']);
begin
  return coalesce((
    select jsonb_agg(sales.quotation_json(q) - 'lines' order by q.sent_at desc)
    from sales.quotation q
    where q.org_id = me.org_id and q.sent_at is not null
  ), '[]'::jsonb);
end;
$$;

create or replace function public.portal_quotation(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me  portal.member := portal.me(array['admin', 'approver', 'buyer', 'finance']);
  rec sales.quotation;
begin
  select q.* into rec from sales.quotation q where q.id = p_id and q.org_id = me.org_id and q.sent_at is not null;
  if not found then
    raise exception 'quotation not found' using errcode = 'P0002';
  end if;
  return sales.quotation_json(rec);
end;
$$;

create or replace function public.portal_quotation_decide(p_id uuid, p_decision text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me  portal.member := portal.me(array['admin', 'approver']);
  rec sales.quotation;
begin
  perform portal.require_fresh();
  if p_decision is null or p_decision not in ('accept', 'decline') then
    raise exception 'unknown decision' using errcode = '22023';
  end if;
  select q.* into rec from sales.quotation q
  where q.id = p_id and q.org_id = me.org_id and q.sent_at is not null
  for update;
  if not found then
    raise exception 'quotation not found' using errcode = 'P0002';
  end if;
  if rec.status <> 'sent' then
    raise exception 'this quotation is already %', rec.status using errcode = '22023';
  end if;
  if rec.valid_until < sales.today() then
    raise exception 'this quotation has expired' using errcode = '22023', hint = 'expired';
  end if;
  if p_decision = 'accept' and not portal.org_cleared(me.org_id) then
    raise exception 'your organisation is not verified yet' using errcode = '42501', hint = 'verification';
  end if;

  update sales.quotation
  set status = case when p_decision = 'accept' then 'accepted' else 'declined' end,
      decided_by = me.email, decided_at = now(),
      decision_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''), updated_at = now()
  where id = p_id
  returning * into rec;

  perform portal.log(case when p_decision = 'accept' then 'quotation_accepted' else 'quotation_declined' end,
    'quotation', rec.id::text, jsonb_build_object('reference', rec.reference, 'org_id', rec.org_id));
  return sales.quotation_json(rec);
end;
$$;

create or replace function public.portal_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me portal.member := portal.me(array['admin', 'approver', 'buyer', 'finance']);
begin
  return coalesce((
    select jsonb_agg(sales.order_json(o) order by o.created_at desc)
    from sales.sales_order o where o.org_id = me.org_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.portal_documents()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me portal.member := portal.me(array['admin', 'approver', 'buyer', 'finance']);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'name', d.logical_name, 'class', d.doc_class, 'size', d.size_bytes,
      'shared_at', s.shared_at, 'expires_at', s.expires_at, 'order_reference', o.reference
    ) order by s.shared_at desc)
    from portal.document_share s
    join public.documents d on d.id = s.doc_id
    left join sales.sales_order o on o.id = s.order_id
    where s.org_id = me.org_id
      and (s.expires_at is null or s.expires_at > now())
      and d.status in ('active', 'superseded', 'legal_hold')
      and (d.doc_class <> 'sales-bills' or me.role in ('admin', 'finance'))
  ), '[]'::jsonb);
end;
$$;

create or replace function public.portal_team()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me portal.member := portal.me(array['admin', 'approver', 'buyer', 'finance']);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'email', m.email, 'role', m.role, 'invited_by', m.invited_by, 'invited_at', m.invited_at, 'last_seen_at', m.last_seen_at
    ) order by m.invited_at)
    from portal.member m where m.org_id = me.org_id
  ), '[]'::jsonb);
end;
$$;

-- p_role: the member's new role, or null to remove them.
create or replace function public.portal_member_update(p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me     portal.member := portal.me(array['admin']);
  target portal.member;
begin
  perform portal.require_fresh();
  if p_role is not null and p_role not in ('admin', 'approver', 'buyer', 'finance') then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  select m.* into target from portal.member m where m.email = lower(p_email) and m.org_id = me.org_id for update;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if target.role = 'admin' and p_role is distinct from 'admin'
     and (select count(*) from portal.member m where m.org_id = me.org_id and m.role = 'admin') = 1 then
    raise exception 'an organisation keeps at least one admin' using errcode = '22023';
  end if;
  if p_role is null then
    delete from portal.member where email = target.email;
    perform portal.log('member_removed', 'member', target.email, jsonb_build_object('org_id', me.org_id));
  else
    update portal.member set role = p_role where email = target.email;
    perform portal.log('member_role_changed', 'member', target.email,
      jsonb_build_object('org_id', me.org_id, 'from', target.role, 'to', p_role));
  end if;
end;
$$;

create or replace function public.portal_kyc()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me portal.member := portal.me(array['admin', 'finance']);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', k.id, 'kind', k.kind, 'file_name', k.file_name, 'size', k.size_bytes, 'status', k.status,
      'uploaded_by', k.uploaded_by, 'uploaded_at', k.uploaded_at, 'review_note', k.review_note
    ) order by k.uploaded_at desc)
    from portal.kyc_document k where k.org_id = me.org_id
  ), '[]'::jsonb);
end;
$$;

-- Everything the portal holds about the caller (DPDP Act 2023 s.11, GDPR art. 15).
create or replace function public.portal_export()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me_email text := app.current_email();
  result   jsonb;
begin
  if me_email = '' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  result := jsonb_build_object(
    'exported_at', now(),
    'email', me_email,
    'membership', (select to_jsonb(m) from portal.member m where m.email = me_email),
    'enquiries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reference', r.reference, 'created_at', r.created_at, 'name', r.name, 'email', r.email, 'company', r.company,
        'phone', r.phone, 'message', r.message, 'lines', r.lines, 'delivery_city', r.delivery_city,
        'delivery_country', r.delivery_country, 'status', r.status
      ) order by r.created_at)
      from public.quote_requests r where lower(r.email) = me_email
    ), '[]'::jsonb),
    'decisions', coalesce((
      select jsonb_agg(jsonb_build_object('reference', q.reference, 'status', q.status, 'decided_at', q.decided_at, 'note', q.decision_note))
      from sales.quotation q where q.decided_by = me_email
    ), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object('kind', p.kind, 'created_at', p.created_at, 'handled_at', p.handled_at, 'outcome', p.outcome))
      from portal.privacy_request p where p.email = me_email
    ), '[]'::jsonb)
  );
  perform portal.log('privacy_export', 'person', me_email);
  return result;
end;
$$;

create or replace function public.portal_privacy_request(p_kind text, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me_email text := app.current_email();
  new_id   uuid;
begin
  if me_email = '' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if (select count(*) from portal.privacy_request p where p.email = me_email and p.handled_at is null) >= 3 then
    raise exception 'you already have requests waiting' using errcode = '53400';
  end if;
  insert into portal.privacy_request (email, kind, note)
  values (me_email, p_kind, nullif(left(btrim(coalesce(p_note, '')), 1000), ''))
  returning id into new_id;
  perform portal.log('privacy_request', 'privacy_request', new_id::text, jsonb_build_object('kind', p_kind));
  return new_id;
end;
$$;

-- Invitations, by the sales desk (any organisation) or an organisation's
-- admin (their own). The `portal` Edge Function calls this with the inviter's
-- token, then creates the sign-in and sends the email.
create or replace function public.portal_invite(p_org uuid, p_email text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor    text := app.current_email();
  staff    boolean := app.has_role('admin', 'approver');
  invitee  text := lower(btrim(coalesce(p_email, '')));
  existing portal.member;
  me       portal.member;
  again    boolean;
begin
  if not staff then
    me := portal.me(array['admin']);
    perform portal.require_fresh();
    if me.org_id is distinct from p_org then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  if p_role is null or p_role not in ('admin', 'approver', 'buyer', 'finance') then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  if invitee !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(invitee) > 320 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if exists (select 1 from public.app_users u where u.email = invitee) then
    raise exception 'staff accounts cannot join an organisation' using errcode = '22023';
  end if;
  if not exists (select 1 from portal.organization o where o.id = p_org and o.status <> 'suspended') then
    raise exception 'organisation not found' using errcode = 'P0002';
  end if;

  select m.* into existing from portal.member m where m.email = invitee;
  again := found;
  if again and existing.org_id <> p_org then
    raise exception 'this person already belongs to another organisation' using errcode = '23505';
  end if;
  if not again then
    insert into portal.member (email, org_id, role, invited_by) values (invitee, p_org, p_role, actor);
  end if;
  perform portal.log('member_invited', 'member', invitee, jsonb_build_object('org_id', p_org, 'role', p_role, 'repeat', again));
  return jsonb_build_object('email', invitee, 'org_id', p_org, 'repeat', again, 'by_staff', staff,
    'org_name', (select o.name from portal.organization o where o.id = p_org));
end;
$$;

-- 2. The Edge Function's functions (service role, with the caller's email) ------

-- After it has checked the file's type, size and bytes and stored it.
create or replace function public.portal_svc_kyc_record(
  p_actor text, p_kind text, p_path text, p_name text, p_mime text, p_size int, p_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me     portal.member := portal.member_check(p_actor, array['admin', 'finance']);
  new_id uuid;
begin
  insert into portal.kyc_document (org_id, kind, object_path, file_name, mime, size_bytes, sha256, uploaded_by)
  values (me.org_id, p_kind, p_path, left(p_name, 200), p_mime, p_size, p_sha256, me.email)
  returning id into new_id;
  perform portal.log('kyc_uploaded', 'kyc_document', new_id::text, jsonb_build_object('org_id', me.org_id, 'kind', p_kind), me.email);
  return new_id;
end;
$$;

-- Where a KYC file the caller may open is stored: their own organisation's
-- (admin or finance), or any organisation's for staff. The Edge Function calls
-- it with the caller's token, then signs a short-lived link.
create or replace function public.portal_kyc_file(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k  portal.kyc_document;
  me portal.member;
begin
  if not app.is_staff() then
    me := portal.me(array['admin', 'finance']);
  end if;
  select * into k from portal.kyc_document where id = p_id and (me.email is null or org_id = me.org_id);
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  perform portal.log('kyc_opened', 'kyc_document', k.id::text, jsonb_build_object('org_id', k.org_id));
  return jsonb_build_object('bucket', 'kyc', 'path', k.object_path, 'name', k.file_name, 'mime', k.mime);
end;
$$;

-- 3. Who may call what -------------------------------------------------------------

do $$
declare
  f text;
  buyer text[] := array[
    'public.portal_me()', 'public.portal_requests()', 'public.portal_quotations()', 'public.portal_quotation(uuid)',
    'public.portal_quotation_decide(uuid, text, text)', 'public.portal_orders()', 'public.portal_documents()',
    'public.portal_team()', 'public.portal_member_update(text, text)', 'public.portal_kyc()', 'public.portal_export()',
    'public.portal_privacy_request(text, text)', 'public.portal_invite(uuid, text, text)', 'public.portal_kyc_file(uuid)'];
  svc text[] := array['public.portal_svc_kyc_record(text, text, text, text, text, int, text)'];
begin
  foreach f in array buyer || svc loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  -- Signed-in callers; each function checks who they are itself.
  foreach f in array buyer loop
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  -- The portal Edge Function only.
  foreach f in array svc loop
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
