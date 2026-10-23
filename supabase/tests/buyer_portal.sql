-- Acceptance for 20261023120000_buyer_portal.sql: buyers see only their own
-- organisation, a quotation is accepted only by its admin or approver, with a
-- recent sign-in (and the authenticator app once set up), and only once the
-- organisation is approved on a clear screening under 12 months old. Shares
-- open documents to the right people, and every function refuses the roles it
-- was not granted to.
--
-- Scratch database only; Supabase's auth and storage schemas are stand-ins.
--   createdb scratch && psql -v ON_ERROR_STOP=1 -d scratch -f supabase/tests/buyer_portal.sql
\set ON_ERROR_STOP on
begin;

-- Stand-ins for what Supabase provides ------------------------------------------
do $$ begin
  create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin; exception when duplicate_object then null; end $$;
create schema auth;
create function auth.email() returns text language sql stable as $$ select nullif(current_setting('test.email', true), '') $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('test.jwt', true), '')::jsonb $$;
create table auth.mfa_factors (user_id uuid not null, status text not null);
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);

\i supabase/migrations/20260816120001_identity_and_rbac.sql

-- The shapes production has, as far as the portal reaches ----------------------
create table public.audit_log (
  id bigint generated always as identity primary key, actor_email text, action text, object_type text, object_id text,
  meta jsonb, before jsonb, after jsonb, outcome text, reason text, created_at timestamptz not null default now()
);
create type public.lead_status as enum ('new', 'contacted', 'quoted', 'won', 'lost');
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(), reference text, name text not null, email text not null, company text,
  phone text, message text, product_label text, quantity text, request_type text, lines jsonb,
  delivery_city text, delivery_country text, status public.lead_status not null default 'new',
  created_at timestamptz not null default now()
);
create schema logistics;
create table logistics.counterparty_sanction (
  id bigint generated always as identity primary key, party_name text not null, screening_status text not null,
  ofac_match boolean not null default false, screened_at timestamptz not null default now()
);
create table logistics.shipment (
  id bigint generated always as identity primary key, shipment_no text not null, status text not null, product text,
  qty numeric, uom text, vehicle_no text, transporter_name text, eway_no text, dispatch_date date, eta date,
  delivered_date date, updated_at timestamptz not null default now()
);

create type public.doc_class as enum ('tds', 'purchase-bills', 'sales-bills', 'gst', 'contracts', 'coa', 'hr', 'bank');
create table public.documents (id uuid primary key, doc_class public.doc_class not null, status text not null default 'active',
  logical_name text not null, size_bytes bigint not null default 1);
create table public.document_versions (doc_id uuid not null references public.documents (id), version int not null, path text not null);
create table public.document_acl (doc_id uuid not null, subject_email text not null, expires_at timestamptz);
create table public.class_acl (doc_class public.doc_class not null, subject_email text not null);
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_acl enable row level security;
alter table public.class_acl enable row level security;
-- The two read policies exactly as production has them before this migration.
create policy "visibility = acl match or class acl match or admin/approver" on public.documents for select to authenticated
  using (
    app.has_role('admin', 'approver')
    or (
      documents.status <> 'quarantined'
      and (
        exists (select 1 from public.document_acl a where a.doc_id = documents.id and a.subject_email = app.current_email()
                and (a.expires_at is null or a.expires_at > now()))
        or exists (select 1 from public.class_acl c where c.doc_class = documents.doc_class and c.subject_email = app.current_email())
      )
    )
  );
create policy "versions visible if parent document is" on public.document_versions for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_versions.doc_id
                 and (exists (select 1 from public.document_acl a where a.doc_id = d.id and a.subject_email = app.current_email())
                      or app.has_role('admin', 'approver'))));
create policy "acl visible to subjects and admins" on public.document_acl for select to authenticated
  using (subject_email = app.current_email() or app.has_role('admin', 'approver'));
create policy "class acl visible to subjects and admins" on public.class_acl for select to authenticated
  using (subject_email = app.current_email() or app.has_role('admin', 'approver'));
grant select on public.documents, public.document_versions, public.document_acl, public.class_acl to authenticated;

-- app.is_staff() and the staff-only log_event come from the previous migration.
\i supabase/migrations/20261022120000_staff_only.sql

-- The migration, twice: running it again must change nothing ----------------------
\i supabase/migrations/20261023120000_buyer_portal.sql
\i supabase/migrations/20261023120000_buyer_portal.sql

-- Helpers ---------------------------------------------------------------------------
create schema t;
grant usage on schema t to anon, authenticated, service_role;
create function t.try(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlstate;
end $$;
-- Sign in as p_email; p_age is how long ago the sign-in was, p_aal the assurance level.
create function t.as_user(p_email text, p_age interval default interval '1 minute', p_aal text default 'aal1') returns void language sql as $$
  select set_config('test.email', coalesce(p_email, ''), true),
         set_config('test.uid', case when p_email is null then '' else md5(p_email)::uuid::text end, true),
         set_config('test.jwt', case when p_email is null then '' else jsonb_build_object('aal', p_aal,
           'amr', jsonb_build_array(jsonb_build_object('method', 'otp', 'timestamp', extract(epoch from now() - p_age)::bigint)))::text end, true)
$$;
create table t.ids (k text primary key, v text);
grant select, insert on t.ids to authenticated, service_role;
create function t.id(k text) returns text language sql stable as $$ select v from t.ids where ids.k = id.k $$;
grant execute on all functions in schema t to anon, authenticated, service_role;

insert into public.app_users (email, role) values ('desk@vasantpetrochem.com', 'approver');
-- "Today" is India's date, which runs ahead of UTC after 18:30 UTC.
insert into t.ids select 'today', sales.today()::text;
insert into public.quote_requests (reference, name, email, company) values ('VP-ENQ-202610-0001', 'Asha', 'Admin@Acme.example', 'Acme');
insert into t.ids select 'r1', id::text from public.quote_requests;
insert into logistics.counterparty_sanction (party_name, screening_status) values ('Acme', 'blocked');
insert into logistics.counterparty_sanction (party_name, screening_status, screened_at) values ('Acme', 'clear', now() - interval '13 months');
insert into logistics.counterparty_sanction (party_name, screening_status) values ('Acme', 'clear');
insert into logistics.shipment (shipment_no, status, product, qty, uom, vehicle_no, dispatch_date) values ('SH-1', 'in_transit', 'Base Oil SN500', 20, 'kL', 'MP09 AB 1234', current_date);
insert into public.documents (id, doc_class, logical_name) values
  ('00000000-0000-0000-0000-0000000000d1', 'coa', 'Test report.pdf'),
  ('00000000-0000-0000-0000-0000000000d2', 'sales-bills', 'Invoice.pdf');
insert into public.document_versions values ('00000000-0000-0000-0000-0000000000d1', 1, 'coa/d1.pdf'), ('00000000-0000-0000-0000-0000000000d2', 1, 'sales-bills/d2.pdf');

do $$ begin
  assert (select count(*) from storage.buckets where id = 'kyc' and not public) = 1, 'a private kyc bucket';
  assert not has_schema_privilege('authenticated', 'portal', 'usage'), 'signed-in callers cannot reach the portal schema';
  assert not has_schema_privilege('anon', 'sales', 'usage'), 'nor the sales schema';
  assert not has_function_privilege('anon', 'public.portal_me()', 'execute'), 'anon cannot call the portal';
  assert not has_function_privilege('authenticated', 'public.portal_svc_kyc_record(text, text, text, text, text, int, text)', 'execute'),
    'only the Edge Function records KYC files';
  assert has_function_privilege('authenticated', 'public.portal_kyc_file(uuid)', 'execute'), 'KYC files open with the caller''s own token';
end $$;

-- The sales desk sets up Acme and Beta, and invites their people. ---------------------
select t.as_user('desk@vasantpetrochem.com');
set local role authenticated;
insert into t.ids select 'acme', public.sales_org_save('{"name": "Acme Lubricants", "country": "ae", "tax_id": "100200300400003"}')::text;
insert into t.ids select 'beta', public.sales_org_save('{"name": "Beta Oils"}')::text;
select public.portal_invite(t.id('acme')::uuid, 'Admin@Acme.example', 'admin');
select public.portal_invite(t.id('acme')::uuid, 'buyer@acme.example', 'buyer');
select public.portal_invite(t.id('beta')::uuid, 'admin@beta.example', 'admin');
select public.portal_invite(t.id('acme')::uuid, 'approver@acme.example', 'approver');
do $$ begin
  assert t.try($q$select public.portal_invite(t.id('beta')::uuid, 'buyer@acme.example', 'buyer')$q$) = '23505', 'one organisation per person';
  assert t.try($q$select public.portal_invite(t.id('acme')::uuid, 'desk@vasantpetrochem.com', 'buyer')$q$) = '22023', 'staff are never members';
  assert (public.portal_invite(t.id('acme')::uuid, 'admin@acme.example', 'admin')->>'repeat')::boolean, 'a second invitation is a repeat';
  assert t.try($q$select public.sales_quotation_save('{"org_id": "00000000-0000-0000-0000-000000000000", "basis": "Ex-works", "payment_terms": "Advance", "valid_until": "2000-01-01", "lines": [{"description": "x", "quantity": 1, "uom": "kL", "unit_price": 1}]}')$q$) = '22023',
    'a quotation is valid today or later';
end $$;
insert into t.ids select 'q1', public.sales_quotation_save(jsonb_build_object(
  'org_id', t.id('acme'), 'request_id', t.id('r1'),
  'basis', 'Delivered Dubai', 'payment_terms', '100% advance', 'currency', 'AED', 'valid_until', current_date + 7,
  'lines', jsonb_build_array(
    jsonb_build_object('product_slug', 'base-oil-sn500', 'description', 'Base Oil SN500', 'pack', '210 L drum', 'quantity', 80, 'uom', 'drums', 'unit_price', 812.50),
    jsonb_build_object('description', 'Freight', 'quantity', 1, 'uom', 'kL', 'unit_price', 1500))))::text;
reset role;

-- Acme's buyer sees nothing until the quotation is sent. ----------------------------
select t.as_user('buyer@acme.example');
set local role authenticated;
do $$ begin
  assert public.portal_me()->>'role' = 'buyer', 'the buyer is a member';
  assert public.portal_me()->'org'->>'country' = 'AE', 'country codes are upper case';
  assert jsonb_array_length(public.portal_quotations()) = 0, 'a draft is not shown';
  assert jsonb_array_length(public.portal_requests()) = 1, 'the organisation''s enquiries are shown';
  assert t.try('select count(*) from portal.member') = '42501', 'the tables are out of reach';
end $$;
reset role;

select t.as_user('desk@vasantpetrochem.com');
set local role authenticated;
select public.sales_quotation_send(t.id('q1')::uuid);
do $$ begin
  assert t.try($q$select public.sales_quotation_send(t.id('q1')::uuid)$q$) = '22023', 'sent once';
end $$;
reset role;
do $$ begin
  assert (select status from public.quote_requests limit 1) = 'quoted', 'the enquiry moves to quoted';
end $$;

-- Who may see and decide. ---------------------------------------------------------------
select t.as_user('buyer@acme.example');
set local role authenticated;
do $$
declare q jsonb := public.portal_quotation(t.id('q1')::uuid);
begin
  assert q->>'reference' ~ '^VP-QUO-[0-9]{6}-0001$', 'a quotation reference';
  assert (q->>'total')::numeric = 66500.00, 'the total is the sum of the lines';
  assert jsonb_array_length(q->'lines') = 2, 'both lines';
  assert t.try($q$select public.portal_quotation_decide(t.id('q1')::uuid, 'accept')$q$) = '42501', 'a buyer cannot accept';
end $$;
reset role;

select t.as_user('admin@beta.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert t.try($q$select public.portal_quotation(t.id('q1')::uuid)$q$) = 'P0002', 'another organisation cannot see it';
  assert t.try($q$select public.portal_quotation_decide(t.id('q1')::uuid, 'accept')$q$) = 'P0002', 'nor accept it';
end $$;
reset role;

select t.as_user('stranger@example.com');
set local role authenticated;
do $$ begin
  assert public.portal_me() is null, 'a stranger has no account';
  assert t.try('select public.portal_requests()') = '42501', 'and sees nothing';
end $$;
reset role;

select t.as_user('admin@acme.example', interval '1 hour', 'aal2');
set local role authenticated;
do $$ begin
  assert t.try($q$select public.portal_quotation_decide(t.id('q1')::uuid, 'accept')$q$) = '28000', 'an old sign-in must sign in again';
end $$;
reset role;

select t.as_user('admin@acme.example');
set local role authenticated;
do $$ begin
  assert t.try('select public.portal_quotations()') = '28000', 'an admin always confirms with the authenticator app';
  assert (select count(*) from public.documents) = 0, 'and sees no documents without it';
end $$;
reset role;

select t.as_user('admin@acme.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert t.try($q$select public.portal_quotation_decide(t.id('q1')::uuid, 'accept')$q$) = '42501', 'not before the organisation is approved';
end $$;
reset role;

-- Approval rests on a clear screening under 12 months old. ---------------------------
select t.as_user('desk@vasantpetrochem.com');
set local role authenticated;
do $$ begin
  assert t.try($q$select public.sales_org_review(t.id('acme')::uuid, 'approve', null)$q$) = '23514', 'no screening, no approval';
  assert t.try($q$select public.sales_org_review(t.id('acme')::uuid, 'approve', 1)$q$) = '23514', 'a blocked screening';
  assert t.try($q$select public.sales_org_review(t.id('acme')::uuid, 'approve', 2)$q$) = '23514', 'a clear screening over 12 months old';
  assert t.try($q$select public.sales_org_review(t.id('acme')::uuid, 'approve', 3)$q$) = 'ok', 'a recent clear screening';
end $$;
reset role;
do $$ begin
  assert t.try($q$update portal.organization set status = 'approved', screening_id = 1, approved_by = 'x', approved_at = now() where id = t.id('beta')::uuid$q$) = '23514',
    'even a direct update cannot approve without a clear screening';
end $$;

select t.as_user('admin@acme.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$
declare q jsonb;
begin
  q := public.portal_quotation_decide(t.id('q1')::uuid, 'accept', 'Please ship in two lots');
  assert q->>'status' = 'accepted' and q->>'decided_by' = 'admin@acme.example', 'accepted by the admin';
  assert t.try($q$select public.portal_quotation_decide(t.id('q1')::uuid, 'decline')$q$) = '22023', 'decided once';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.audit_log where action = 'quotation_accepted' and actor_email = 'admin@acme.example') = 1,
    'the acceptance is audited under the buyer''s email';
end $$;

-- An order, a dispatch and the documents. -------------------------------------------------
select t.as_user('desk@vasantpetrochem.com');
set local role authenticated;
insert into t.ids select 'o1', public.sales_order_confirm(t.id('q1')::uuid, 'PO-778')::text;
select public.sales_shipment_link(1, t.id('o1')::uuid);
select public.sales_document_share('00000000-0000-0000-0000-0000000000d1', t.id('acme')::uuid, true, t.id('o1')::uuid);
select public.sales_document_share('00000000-0000-0000-0000-0000000000d2', t.id('acme')::uuid, true, t.id('o1')::uuid);
do $$ begin
  assert t.try($q$select public.sales_order_confirm(t.id('q1')::uuid)$q$) = '23505', 'one order per quotation';
end $$;
reset role;
do $$ begin
  assert (select status from public.quote_requests limit 1) = 'won', 'the enquiry is won';
end $$;

select t.as_user('buyer@acme.example');
set local role authenticated;
do $$
declare o jsonb := public.portal_orders()->0;
begin
  assert o->>'reference' ~ '^VP-ORD-[0-9]{6}-0001$' and o->>'po_number' = 'PO-778', 'the order and its PO';
  assert o->'shipments'->0->>'vehicle_no' = 'MP09 AB 1234', 'its dispatch';
  assert (select array_agg(logical_name) from public.documents) = array['Test report.pdf'], 'a buyer sees the test report, not the invoice';
  assert (select count(*) from public.document_versions) = 1, 'and only that document''s versions';
  assert jsonb_array_length(public.portal_documents()) = 1, 'the portal lists the same';
end $$;
reset role;

select t.as_user('admin@acme.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert (select count(*) from public.documents) = 2, 'the admin sees the invoice too';
end $$;
reset role;

select t.as_user('admin@beta.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert (select count(*) from public.documents) = 0, 'another organisation sees no documents';
  assert jsonb_array_length(public.portal_orders()) = 0, 'and no orders';
end $$;
reset role;

-- KYC files go through the Edge Function only. --------------------------------------------
select t.as_user(null);
set local role service_role;
do $$ begin
  assert t.try(format($q$select public.portal_svc_kyc_record('admin@acme.example', 'gst-certificate', '%s/00000000-0000-0000-0000-0000000000a1.pdf', 'GST.pdf', 'application/pdf', 52000, repeat('a', 64))$q$, t.id('acme'))) = 'ok',
    'the admin''s upload is recorded';
  assert t.try(format($q$select public.portal_svc_kyc_record('buyer@acme.example', 'iec', '%s/00000000-0000-0000-0000-0000000000a2.pdf', 'IEC.pdf', 'application/pdf', 52000, repeat('a', 64))$q$, t.id('acme'))) = '42501',
    'a buyer cannot upload KYC';
  assert t.try(format($q$select public.portal_svc_kyc_record('admin@acme.example', 'iec', '%s/00000000-0000-0000-0000-0000000000a3.pdf', 'IEC.pdf', 'application/pdf', 52000, repeat('a', 64))$q$, t.id('beta'))) = '23514',
    'a file can only be filed under its own organisation';
end $$;
reset role;
insert into t.ids select 'k1', id::text from portal.kyc_document;
select t.as_user('admin@beta.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert t.try($q$select public.portal_kyc_file(t.id('k1')::uuid)$q$) = 'P0002', 'another organisation cannot open it';
end $$;
reset role;
select t.as_user('buyer@acme.example');
set local role authenticated;
do $$ begin
  assert t.try($q$select public.portal_kyc_file(t.id('k1')::uuid)$q$) = '42501', 'nor can a buyer';
end $$;
reset role;
select t.as_user('admin@acme.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert public.portal_kyc_file(t.id('k1')::uuid)->>'path' like t.id('acme') || '/%', 'its admin can';
end $$;
reset role;
select t.as_user('desk@vasantpetrochem.com');
set local role authenticated;
do $$ begin
  assert public.portal_kyc_file(t.id('k1')::uuid)->>'bucket' = 'kyc', 'staff open any';
end $$;
reset role;

-- An authenticator app, once set up, is needed for decisions. ---------------------------
select t.as_user('desk@vasantpetrochem.com');
set local role authenticated;
insert into t.ids select 'q2', public.sales_quotation_save(jsonb_build_object(
  'org_id', t.id('acme'), 'basis', 'Ex-works Mangaliya', 'payment_terms', '30 days', 'valid_until', t.id('today'),
  'lines', jsonb_build_array(jsonb_build_object('description', 'Paving Bitumen VG30', 'quantity', 20, 'uom', 'MT', 'unit_price', 41000))))::text;
insert into t.ids select 'q3', public.sales_quotation_save(jsonb_build_object(
  'org_id', t.id('acme'), 'basis', 'Ex-works Mangaliya', 'payment_terms', '30 days', 'valid_until', t.id('today'),
  'lines', jsonb_build_array(jsonb_build_object('description', 'Light Diesel Oil', 'quantity', 12, 'uom', 'kL', 'unit_price', 70000))))::text;
select public.sales_quotation_send(t.id('q2')::uuid);
select public.sales_quotation_send(t.id('q3')::uuid);
reset role;

select t.as_user('approver@acme.example');
set local role authenticated;
do $$ begin
  assert not (public.portal_me()->>'mfa')::boolean, 'no app set up';
  assert public.portal_quotation_decide(t.id('q3')::uuid, 'accept')->>'status' = 'accepted', 'an approver without one needs only a recent sign-in';
end $$;
reset role;
insert into auth.mfa_factors values (md5('approver@acme.example')::uuid, 'verified');

select t.as_user('approver@acme.example');
set local role authenticated;
do $$ begin
  assert (public.portal_me()->>'mfa')::boolean, 'the portal knows the app is set up';
  assert t.try($q$select public.portal_quotation_decide(t.id('q2')::uuid, 'decline')$q$) = '28000', 'then aal1 is not enough';
end $$;
reset role;
select t.as_user('approver@acme.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert public.portal_quotation_decide(t.id('q2')::uuid, 'decline')->>'status' = 'declined', 'aal2 is';
end $$;
reset role;

-- Members: the admin manages their own organisation, and keeps one admin. ---------------
select t.as_user('admin@acme.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert t.try($q$select public.portal_invite(t.id('beta')::uuid, 'x@acme.example', 'buyer')$q$) = '42501', 'only into their own organisation';
  assert t.try($q$select public.portal_invite(t.id('acme')::uuid, 'finance@acme.example', 'finance')$q$) = 'ok', 'a colleague';
  assert t.try($q$select public.portal_member_update('admin@acme.example', 'buyer')$q$) = '22023', 'the last admin stays an admin';
  assert t.try($q$select public.portal_member_update('buyer@acme.example', 'approver')$q$) = 'ok', 'a role changes';
  assert t.try($q$select public.portal_member_update('finance@acme.example', null)$q$) = 'ok', 'a member is removed';
  assert jsonb_array_length(public.portal_team()) = 3, 'three members left';
end $$;
reset role;

-- Expiry, privacy, suspension. ----------------------------------------------------------------
update sales.quotation set status = 'sent', decided_by = null, decided_at = null, valid_until = current_date - 1 where id = t.id('q2')::uuid;
select t.as_user('admin@acme.example', interval '1 minute', 'aal2');
set local role authenticated;
do $$ begin
  assert t.try($q$select public.portal_quotation_decide(t.id('q2')::uuid, 'accept')$q$) = '22023', 'an expired quotation cannot be accepted';
  assert (public.portal_quotation(t.id('q2')::uuid)->>'expired')::boolean, 'and shows as expired';
  assert public.portal_export()->>'email' = 'admin@acme.example', 'a copy of their data';
  assert jsonb_array_length(public.portal_export()->'enquiries') = 1, 'with their enquiry';
  perform public.portal_privacy_request('erasure', 'Please delete my data');
  perform public.portal_privacy_request('correction');
  perform public.portal_privacy_request('correction');
  assert t.try($q$select public.portal_privacy_request('erasure')$q$) = '53400', 'three waiting requests at most';
end $$;
reset role;

select t.as_user('desk@vasantpetrochem.com');
set local role authenticated;
select public.sales_org_review(t.id('acme')::uuid, 'suspend');
do $$ begin
  assert jsonb_array_length(public.sales_privacy_requests()) = 3, 'the desk sees the requests';
end $$;
reset role;

select t.as_user('buyer@acme.example');
set local role authenticated;
do $$ begin
  assert public.portal_me()->'org'->>'status' = 'suspended', 'the portal says the account is suspended';
  assert t.try('select public.portal_quotations()') = '42501', 'and shows nothing else';
  assert (select count(*) from public.documents) = 0, 'shared documents close too';
end $$;
reset role;

-- A buyer is never staff, and the desk's functions say so. -------------------------------
select t.as_user('admin@beta.example');
set local role authenticated;
do $$ begin
  assert t.try('select public.sales_orgs()') = '42501', 'a buyer cannot read the desk';
  assert t.try($q$select public.sales_org_review(t.id('beta')::uuid, 'approve', 3)$q$) = '42501', 'or approve itself';
end $$;
reset role;

rollback;
\echo buyer_portal: all checks passed
