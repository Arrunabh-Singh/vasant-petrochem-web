-- Release 2: the buyer portal (www.vasantpetrochem.com/account) and the hub's
-- sales desk. Buyers see their enquiries, accept or decline quotations, follow
-- their orders and dispatches, and download the documents shared with them.
--
-- Accounts are by invitation. The sales desk invites a buyer, usually when a
-- quotation is ready, and an organisation's admin can invite colleagues.
-- Nobody signs up, so Supabase's "Allow new users to sign up" stays off. The
-- `portal` Edge Function, which holds the service role, creates the sign-in
-- and stores and serves files.
--
-- Least privilege, as on the public site:
-- - The tables live in `portal` and `sales`, which the Data API does not
--   expose. RLS is on, and neither anon nor authenticated has a grant on them.
-- - Every read and change is a SECURITY DEFINER function in `public` that
--   checks the caller first: a member of the organisation (the email Supabase
--   Auth proved), or staff (app.is_staff() to read, app.has_role('admin',
--   'approver') to change). The one the Edge Function calls after storing a
--   KYC file runs only as the service role and takes the caller's email from it.
-- - Organisation admins and finance users need an authenticator app: their
--   token must be verified with it (aal2) for anything (ADR-0003).
-- - Accepting or declining a quotation and managing members need a sign-in
--   in the last 15 minutes (the token's `amr` time), and aal2 for anyone who
--   has set up an authenticator app.
-- - Only an organisation the sales desk has approved can accept a quotation,
--   and approval needs a clear sanctions screening from the last 12 months:
--   a trigger enforces it, so not even the service role can skip it.
-- - Every change is written to public.audit_log.
--
-- Purely additive and safe to run again. Applied through the Supabase MCP,
-- which holds a top-level DROP for confirmation, so nothing here drops.
-- Function grants are revoked from anon and authenticated by name, not only
-- from PUBLIC (20260816120011_fix_function_default_privileges.sql).
set lock_timeout = '10s';

-- 1. Schemas -----------------------------------------------------------------

create schema if not exists portal;
create schema if not exists sales;
comment on schema portal is
  'The buyer portal: organisations, members, KYC and shared documents. Not exposed by the Data API; reached only through public.portal_* and public.sales_* functions.';
comment on schema sales is
  'Quotations and orders. Not exposed by the Data API; reached only through public.portal_* and public.sales_* functions.';
revoke all on schema portal, sales from public, anon, authenticated;

-- 2. Organisations and members -------------------------------------------------

create table if not exists portal.organization (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 160),
  country      text not null default 'IN' check (country ~ '^[A-Z]{2}$'),
  tax_id       text check (tax_id is null or char_length(tax_id) between 5 and 40),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  screening_id bigint references logistics.counterparty_sanction (id),
  approved_by  text,
  approved_at  timestamptz,
  created_by   text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint organization_approved check (
    status <> 'approved' or (approved_by is not null and approved_at is not null and screening_id is not null)
  )
);
comment on table portal.organization is
  'A buyer''s company. Approved by the sales desk after KYC and a clear sanctions screening; only an approved one can accept a quotation.';

-- One organisation per email: a person signs in and is that company's buyer.
create table if not exists portal.member (
  email        text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  org_id       uuid not null references portal.organization (id) on delete cascade,
  role         text not null check (role in ('admin', 'approver', 'buyer', 'finance')),
  invited_by   text not null,
  invited_at   timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists member_org_idx on portal.member (org_id);
comment on table portal.member is
  'Who may sign in to the portal for an organisation. admin: everything, including members; approver: accepts and declines quotations; buyer: sees and enquires; finance: also sees invoices and KYC.';

-- Approval needs a clear screening, not older than 12 months, every time.
create or replace function portal.check_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  checked boolean := false;
begin
  if new.status = 'approved' then
    if tg_op = 'INSERT' then
      checked := true;
    else
      checked := old.status is distinct from 'approved' or old.screening_id is distinct from new.screening_id;
    end if;
  end if;
  if checked then
    if not exists (
      select 1 from logistics.counterparty_sanction s
      where s.id = new.screening_id and s.screening_status = 'clear' and not s.ofac_match
        and s.screened_at > now() - interval '12 months'
    ) then
      raise exception 'approval needs a clear sanctions screening from the last 12 months' using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger organization_check before insert or update on portal.organization
  for each row execute function portal.check_organization();

-- 3. KYC documents, quotations, orders, shares, privacy requests ---------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc', 'kyc', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create table if not exists portal.kyc_document (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references portal.organization (id) on delete cascade,
  kind        text not null check (kind in ('gst-certificate', 'iec', 'trade-licence', 'incorporation', 'tax-registration', 'other')),
  object_path text not null unique check (object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$'),
  file_name   text not null check (char_length(file_name) between 1 and 200),
  mime        text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes  int not null check (size_bytes between 1 and 10485760),
  sha256      text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 500),
  constraint kyc_path_is_org check (object_path like org_id::text || '/%')
);
create index if not exists kyc_document_org_idx on portal.kyc_document (org_id, uploaded_at desc);

-- VP-QUO-YYYYMM-#### and VP-ORD-YYYYMM-####, per Indian calendar month, as
-- enquiries are numbered (20261017140000_enquiry_reference.sql).
create table if not exists sales.counter (
  kind       text not null check (kind in ('QUO', 'ORD')),
  period     text not null check (period ~ '^[0-9]{6}$'),
  last_value int  not null check (last_value > 0),
  primary key (kind, period)
);

create or replace function sales.next_reference(p_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p   text := to_char(now() at time zone 'Asia/Kolkata', 'YYYYMM');
  seq int;
begin
  insert into sales.counter as c (kind, period, last_value) values (p_kind, p, 1)
  on conflict (kind, period) do update set last_value = c.last_value + 1
  returning last_value into seq;
  return 'VP-' || p_kind || '-' || p || '-' || lpad(seq::text, 4, '0');
end;
$$;

create table if not exists sales.quotation (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,
  org_id        uuid not null references portal.organization (id),
  request_id    uuid references public.quote_requests (id) on delete set null,
  status        text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'withdrawn')),
  currency      text not null default 'INR' check (currency in ('INR', 'USD', 'AED', 'EUR')),
  basis         text not null check (char_length(basis) between 2 and 120),
  payment_terms text not null check (char_length(payment_terms) between 2 and 200),
  valid_until   date not null,
  notes         text check (notes is null or char_length(notes) <= 1000),
  created_by    text not null,
  created_at    timestamptz not null default now(),
  sent_by       text,
  sent_at       timestamptz,
  decided_by    text,
  decided_at    timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 500),
  updated_at    timestamptz not null default now(),
  constraint quotation_sent check (status in ('draft', 'withdrawn') or (sent_by is not null and sent_at is not null)),
  constraint quotation_decided check (status not in ('accepted', 'declined') or (decided_by is not null and decided_at is not null))
);
create index if not exists quotation_org_idx on sales.quotation (org_id, created_at desc);
comment on table sales.quotation is
  'A price offer to one organisation. Drafted and sent by the sales desk; accepted or declined by the buyer''s admin or approver while valid.';

create table if not exists sales.quotation_line (
  quotation_id uuid not null references sales.quotation (id) on delete cascade,
  position     int not null check (position between 1 and 20),
  product_slug text check (product_slug is null or (product_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(product_slug) <= 80)),
  description  text not null check (char_length(description) between 2 and 200),
  pack         text check (pack is null or char_length(pack) <= 80),
  quantity     numeric(12, 3) not null check (quantity > 0),
  uom          text not null check (uom in ('MT', 'kL', 'L', 'kg', 'drums', 'pails')),
  unit_price   numeric(14, 2) not null check (unit_price >= 0),
  primary key (quotation_id, position)
);

create table if not exists sales.sales_order (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique,
  quotation_id uuid not null unique references sales.quotation (id),
  org_id       uuid not null references portal.organization (id),
  po_number    text check (po_number is null or char_length(po_number) <= 60),
  status       text not null default 'confirmed' check (status in ('confirmed', 'dispatched', 'delivered', 'cancelled')),
  created_by   text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists sales_order_org_idx on sales.sales_order (org_id, created_at desc);
comment on table sales.sales_order is
  'An order the sales desk confirmed from an accepted quotation. Its dispatches are logistics.shipment rows with this order_id.';

alter table logistics.shipment add column if not exists order_id uuid references sales.sales_order (id);
create index if not exists shipment_order_idx on logistics.shipment (order_id) where order_id is not null;

-- A vault document shared with every member of an organisation (invoices
-- only with its admins and finance), optionally under an order.
create table if not exists portal.document_share (
  doc_id     uuid not null references public.documents (id) on delete cascade,
  org_id     uuid not null references portal.organization (id) on delete cascade,
  order_id   uuid references sales.sales_order (id) on delete set null,
  shared_by  text not null,
  shared_at  timestamptz not null default now(),
  expires_at timestamptz,
  primary key (doc_id, org_id)
);
create index if not exists document_share_org_idx on portal.document_share (org_id);

-- DPDP Act 2023 and GDPR: a copy of a person's data is immediate (portal_export);
-- erasure is a request the sales desk handles, because invoices and contracts
-- must be kept for the statutory period.
create table if not exists portal.privacy_request (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  kind       text not null check (kind in ('erasure', 'correction')),
  note       text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  handled_by text,
  handled_at timestamptz,
  outcome    text check (outcome is null or char_length(outcome) <= 1000)
);

do $$
declare
  t text;
begin
  foreach t in array array['portal.organization', 'portal.member', 'portal.kyc_document', 'portal.document_share',
                           'portal.privacy_request', 'sales.counter', 'sales.quotation', 'sales.quotation_line', 'sales.sales_order'] loop
    execute format('alter table %s enable row level security', t);
    execute format('revoke all on %s from public, anon, authenticated', t);
  end loop;
end;
$$;

-- 4. Helpers (not callable through the API) -------------------------------------

-- The member with this email, in an organisation that is not suspended, and
-- holding one of p_roles; otherwise "not allowed".
create or replace function portal.member_check(p_email text, p_roles text[])
returns portal.member
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me portal.member;
begin
  select m.* into me
  from portal.member m join portal.organization o on o.id = m.org_id
  where m.email = lower(coalesce(p_email, '')) and o.status <> 'suspended';
  if not found or not (me.role = any (p_roles)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return me;
end;
$$;

-- The signed-in caller as a member holding one of p_roles. Admins and
-- finance users must have verified this sign-in with their authenticator app.
create or replace function portal.me(p_roles text[])
returns portal.member
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me portal.member := portal.member_check(app.current_email(), p_roles);
begin
  if me.role in ('admin', 'finance') and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'confirm with your authenticator app to continue' using errcode = '28000', hint = 'mfa';
  end if;
  return me;
end;
$$;

-- A sensitive change needs a recent sign-in, and the authenticator app once
-- the person has set one up.
create or replace function portal.require_fresh()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims   jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  verified bigint;
begin
  select max((a->>'timestamp')::bigint) into verified
  from jsonb_array_elements(case when jsonb_typeof(claims->'amr') = 'array' then claims->'amr' else '[]'::jsonb end) a;
  if coalesce(verified, 0) < extract(epoch from now())::bigint - 15 * 60 then
    raise exception 'sign in again to continue' using errcode = '28000', hint = 'reauth';
  end if;
  if coalesce(claims->>'aal', 'aal1') <> 'aal2'
     and exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified') then
    raise exception 'confirm with your authenticator app to continue' using errcode = '28000', hint = 'mfa';
  end if;
end;
$$;

-- Approved, with its clear screening still under 12 months old.
create or replace function portal.org_cleared(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from portal.organization o
    join logistics.counterparty_sanction s on s.id = o.screening_id
    where o.id = p_org and o.status = 'approved'
      and s.screening_status = 'clear' and not s.ofac_match
      and s.screened_at > now() - interval '12 months'
  )
$$;

-- Buyers are not staff, so public.log_event refuses them; the portal's own
-- functions write the audit row directly, with the email Supabase Auth proved.
create or replace function portal.log(p_action text, p_object_type text, p_object_id text, p_meta jsonb default '{}'::jsonb, p_actor text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_email, action, object_type, object_id, meta, outcome)
  values (coalesce(nullif(lower(p_actor), ''), nullif(app.current_email(), ''), 'service'), p_action, p_object_type, p_object_id, coalesce(p_meta, '{}'::jsonb), 'ok')
$$;

create or replace function sales.today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

create or replace function sales.quotation_json(q sales.quotation, p_staff boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', q.id, 'reference', q.reference, 'status', q.status,
    'expired', q.status = 'sent' and q.valid_until < sales.today(),
    'currency', q.currency, 'basis', q.basis, 'payment_terms', q.payment_terms,
    'valid_until', q.valid_until, 'notes', q.notes, 'sent_at', q.sent_at,
    'decided_by', q.decided_by, 'decided_at', q.decided_at, 'decision_note', q.decision_note,
    'request_reference', (select r.reference from public.quote_requests r where r.id = q.request_id),
    'order_reference', (select o.reference from sales.sales_order o where o.quotation_id = q.id),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', l.position, 'product_slug', l.product_slug, 'description', l.description, 'pack', l.pack,
        'quantity', l.quantity, 'uom', l.uom, 'unit_price', l.unit_price, 'amount', round(l.quantity * l.unit_price, 2)
      ) order by l.position)
      from sales.quotation_line l where l.quotation_id = q.id
    ), '[]'::jsonb),
    'total', coalesce((select round(sum(l.quantity * l.unit_price), 2) from sales.quotation_line l where l.quotation_id = q.id), 0)
  ) || case when p_staff then jsonb_build_object(
    'org_id', q.org_id, 'org_name', (select o.name from portal.organization o where o.id = q.org_id),
    'request_id', q.request_id, 'created_by', q.created_by, 'created_at', q.created_at, 'sent_by', q.sent_by
  ) else '{}'::jsonb end
$$;

create or replace function sales.order_json(o sales.sales_order)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id, 'reference', o.reference, 'status', o.status, 'po_number', o.po_number, 'created_at', o.created_at,
    'quotation_id', q.id, 'quotation_reference', q.reference, 'currency', q.currency,
    'total', coalesce((select round(sum(l.quantity * l.unit_price), 2) from sales.quotation_line l where l.quotation_id = q.id), 0),
    'shipments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'shipment_no', s.shipment_no, 'status', s.status, 'product', s.product, 'qty', s.qty, 'uom', s.uom,
        'vehicle_no', s.vehicle_no, 'transporter', s.transporter_name, 'eway_no', s.eway_no,
        'dispatch_date', s.dispatch_date, 'eta', s.eta, 'delivered_date', s.delivered_date
      ) order by s.dispatch_date nulls last, s.id)
      from logistics.shipment s where s.order_id = o.id
    ), '[]'::jsonb)
  )
  from sales.quotation q where q.id = o.quotation_id
$$;

-- Used by the documents read policy, so it runs for any signed-in caller.
create or replace function app.doc_shared_with_me(p_doc uuid, p_class public.doc_class)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from portal.document_share s
    join portal.member m on m.org_id = s.org_id
    join portal.organization o on o.id = s.org_id
    where s.doc_id = p_doc and m.email = app.current_email() and o.status <> 'suspended'
      and (s.expires_at is null or s.expires_at > now())
      and (p_class <> 'sales-bills' or m.role in ('admin', 'finance'))
      and (m.role not in ('admin', 'finance') or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2')
  )
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'portal.check_organization()', 'sales.next_reference(text)', 'portal.member_check(text, text[])', 'portal.me(text[])',
    'portal.require_fresh()', 'portal.org_cleared(uuid)', 'portal.log(text, text, text, jsonb, text)', 'sales.today()',
    'sales.quotation_json(sales.quotation, boolean)', 'sales.order_json(sales.sales_order)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;
revoke all on function app.doc_shared_with_me(uuid, public.doc_class) from public, anon;
grant execute on function app.doc_shared_with_me(uuid, public.doc_class) to authenticated, service_role;

-- 5. Documents: a share makes a document visible to that organisation --------

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents'
             and policyname = 'visibility = acl match or class acl match or admin/approver') then
    alter policy "visibility = acl match or class acl match or admin/approver" on public.documents
      using (
        app.has_role('admin', 'approver')
        or (
          documents.status <> 'quarantined'
          and (
            exists (select 1 from public.document_acl a
                    where a.doc_id = documents.id and a.subject_email = app.current_email()
                      and (a.expires_at is null or a.expires_at > now()))
            or exists (select 1 from public.class_acl c
                       where c.doc_class = documents.doc_class and c.subject_email = app.current_email())
            or app.doc_shared_with_me(documents.id, documents.doc_class)
          )
        )
      );
  end if;
  -- A version is visible exactly when its document is (the documents policy
  -- applies inside this subquery), so expiry, quarantine and shares carry over.
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_versions'
             and policyname = 'versions visible if parent document is') then
    alter policy "versions visible if parent document is" on public.document_versions
      using (exists (select 1 from public.documents d where d.id = document_versions.doc_id));
  end if;
end;
$$;

-- 6. The buyer's functions (signed in, a member) --------------------------------

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

-- 7. The Edge Function's functions (service role, with the caller's email) ------

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

-- 8. The sales desk (staff in the hub) ------------------------------------------

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

-- 9. Who may call what -------------------------------------------------------------

do $$
declare
  f text;
  buyer text[] := array[
    'public.portal_me()', 'public.portal_requests()', 'public.portal_quotations()', 'public.portal_quotation(uuid)',
    'public.portal_quotation_decide(uuid, text, text)', 'public.portal_orders()', 'public.portal_documents()',
    'public.portal_team()', 'public.portal_member_update(text, text)', 'public.portal_kyc()', 'public.portal_export()',
    'public.portal_privacy_request(text, text)', 'public.portal_invite(uuid, text, text)', 'public.portal_kyc_file(uuid)'];
  desk text[] := array[
    'public.sales_orgs()', 'public.sales_org(uuid)', 'public.sales_org_save(jsonb)', 'public.sales_org_review(uuid, text, bigint)',
    'public.sales_kyc_review(uuid, text, text)', 'public.sales_member_remove(text)', 'public.sales_quotation_save(jsonb)',
    'public.sales_quotation_send(uuid)', 'public.sales_quotation_withdraw(uuid)', 'public.sales_quotations(uuid)',
    'public.sales_quotation(uuid)', 'public.sales_order_confirm(uuid, text)', 'public.sales_order_update(uuid, text)',
    'public.sales_orders(uuid)', 'public.sales_shipment_link(bigint, uuid)',
    'public.sales_document_share(uuid, uuid, boolean, uuid, timestamptz)', 'public.sales_privacy_requests()',
    'public.sales_privacy_handled(uuid, text)'];
  svc text[] := array['public.portal_svc_kyc_record(text, text, text, text, text, int, text)'];
begin
  foreach f in array buyer || desk || svc loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  -- Signed-in callers; each function checks who they are itself.
  foreach f in array buyer || desk loop
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  -- The portal Edge Function only.
  foreach f in array svc loop
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
