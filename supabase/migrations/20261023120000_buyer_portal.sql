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
-- In three files, applied in this order: this one (the tables and helpers),
-- 20261023120100_portal_functions.sql (the buyer's functions) and
-- 20261023120200_sales_desk.sql (the sales desk's). As one file it was too
-- large for the Supabase MCP, which timed out on it. Each file sets its own
-- functions' grants, so none is callable before its grants are in place.
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
