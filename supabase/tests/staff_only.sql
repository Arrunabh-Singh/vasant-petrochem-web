-- Acceptance for 20261022120000_staff_only.sql. A signed-in account that is
-- not staff (an open sign-up, a future buyer) reads nothing from the staff
-- tables, cannot file a control or approval request and cannot write the
-- audit log. Staff work as before. A per-document grant shows that document,
-- and a class grant shows that class only.
--
-- Scratch database only; Supabase's auth schema is a stand-in.
--   createdb scratch && psql -v ON_ERROR_STOP=1 -d scratch -f supabase/tests/staff_only.sql
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

-- The real identity model: app_users, app.current_email, app.has_role (seeds the owner as admin).
\i supabase/migrations/20260816120001_identity_and_rbac.sql

-- The shapes production has, as far as these policies and functions reach -------
create schema tally;
create table tally.ledger (company text, name text, primary key (company, name));
alter table tally.ledger enable row level security;
create policy tally_ledger_read on tally.ledger for select to authenticated using (true);
create policy tally_ledger_write on tally.ledger for all to authenticated
  using (app.has_role('admin', 'approver')) with check (app.has_role('admin', 'approver'));
insert into tally.ledger values ('Vasant Petrochem', 'A trading party');

create table public.compliance_items (id int primary key);
alter table public.compliance_items enable row level security;
create policy "authenticated can read compliance_items" on public.compliance_items for select to authenticated using (true);
grant select on public.compliance_items to authenticated;
insert into public.compliance_items values (1);

create schema control;
grant usage on schema control to authenticated;
create table control.control_request (
  id uuid primary key default gen_random_uuid(), device_id uuid not null, action text not null, seq bigint not null,
  ttl_seconds int not null, signature text not null, requested_by text not null, status text not null default 'pending'
);
alter table control.control_request enable row level security;
create policy "authenticated can read control_request" on control.control_request for select to authenticated using (true);
create policy "authenticated can request control action" on control.control_request for insert to authenticated
  with check (requested_by = app.current_email());
grant select, insert on control.control_request to authenticated;

create table public.approval_requests (id bigint generated always as identity primary key, subject text not null, requested_by text not null);
alter table public.approval_requests enable row level security;
create policy "authenticated can request approval" on public.approval_requests for insert to authenticated
  with check (requested_by = app.current_email());
grant insert on public.approval_requests to authenticated;

create table public.audit_log (
  id bigint generated always as identity primary key, actor_email text, action text, object_type text, object_id text,
  meta jsonb, before jsonb, after jsonb, outcome text, reason text
);

create type public.doc_class as enum ('tds', 'contracts', 'hr');
create table public.documents (id uuid primary key, doc_class public.doc_class not null, status text not null default 'active');
create table public.document_acl (doc_id uuid not null, subject_email text not null, expires_at timestamptz);
create table public.class_acl (doc_class public.doc_class not null, subject_email text not null);
alter table public.documents enable row level security;
alter table public.document_acl enable row level security;
alter table public.class_acl enable row level security;
-- The policy exactly as production has it, unqualified columns and all.
create policy "visibility = acl match or class acl match or admin/approver"
  on public.documents for select to authenticated
  using (
    app.has_role('admin', 'approver')
    or (
      status <> 'quarantined'
      and (
        exists (select 1 from public.document_acl a where a.doc_id = id and a.subject_email = app.current_email()
                and (a.expires_at is null or a.expires_at > now()))
        or exists (select 1 from public.class_acl c where c.doc_class = doc_class and c.subject_email = app.current_email())
      )
    )
  );
create policy "acl visible to subjects and admins" on public.document_acl for select to authenticated
  using (subject_email = app.current_email() or app.has_role('admin', 'approver'));
create policy "class acl visible to subjects and admins" on public.class_acl for select to authenticated
  using (subject_email = app.current_email() or app.has_role('admin', 'approver'));
grant select on public.documents, public.document_acl, public.class_acl to authenticated;

create function public.retention_for(p_class public.doc_class, p_fy int default null) returns date
  language sql stable as $$ select current_date $$;
revoke all on function public.retention_for(public.doc_class, int) from public;  -- as production has it
grant execute on function public.retention_for(public.doc_class, int) to authenticated;

-- The migration, twice: running it again must change nothing ----------------------
\i supabase/migrations/20261022120000_staff_only.sql
\i supabase/migrations/20261022120000_staff_only.sql

-- Helpers the test roles can call --------------------------------------------------
create schema t;
grant usage on schema t to authenticated, service_role;
create function t.try(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlstate;
end $$;
create function t.as_user(p_email text) returns void language sql as $$ select set_config('test.email', coalesce(p_email, ''), true) $$;
grant execute on all functions in schema t to authenticated, service_role;

insert into public.documents values
  ('00000000-0000-0000-0000-00000000000a', 'tds', 'active'),
  ('00000000-0000-0000-0000-00000000000b', 'hr', 'active');
insert into public.document_acl values ('00000000-0000-0000-0000-00000000000a', 'buyer@example.com', null);
insert into public.app_users (email, role) values ('ca@example.com', 'ca');
insert into public.class_acl values ('tds', 'ca@example.com');

do $$ begin
  assert not exists (select 1 from pg_policies where 'authenticated' = any (roles) and cmd = 'SELECT' and qual = 'true'),
    'no read policy is left open to every signed-in user';
  assert app.is_staff() is false, 'no email, not staff';
end $$;

-- An open sign-up: signed in, but not staff.
select t.as_user('stranger@example.com');
set local role authenticated;
do $$ begin
  assert not app.is_staff(), 'a stranger is not staff';
  assert (select count(*) from tally.ledger) = 0, 'a stranger reads no ledger';
  assert (select count(*) from public.compliance_items) = 0, 'a stranger reads no compliance items';
  assert (select count(*) from public.documents) = 0, 'a stranger sees no documents';
  assert t.try($q$insert into public.approval_requests (subject, requested_by) values ('x', 'stranger@example.com')$q$) = '42501',
    'a stranger cannot file an approval request';
  assert t.try($q$insert into control.control_request (device_id, action, seq, ttl_seconds, signature, requested_by)
                  values (gen_random_uuid(), 'open', 1, 30, '', 'stranger@example.com')$q$) = '42501',
    'a stranger cannot insert a control request';
  assert t.try($q$select public.control_request_create(gen_random_uuid(), 'open')$q$) = '42501',
    'a stranger cannot call control_request_create';
  assert t.try($q$select public.log_event('fake_event', 'test')$q$) = '42501', 'a stranger cannot write the audit log';
  assert t.try($q$select public.retention_for('tds')$q$) = '42501', 'retention_for is for the service role only';
end $$;
reset role;

-- The owner (the seeded admin): everything works as before.
select t.as_user('arrunabh.s@gmail.com');
set local role authenticated;
do $$ begin
  assert app.is_staff(), 'the owner is staff';
  assert (select count(*) from tally.ledger) = 1, 'staff read the ledger';
  assert (select count(*) from public.compliance_items) = 1, 'staff read compliance items';
  assert (select count(*) from public.documents) = 2, 'admin sees every document';
  assert t.try($q$insert into public.approval_requests (subject, requested_by) values ('x', 'arrunabh.s@gmail.com')$q$) = 'ok',
    'staff file approval requests';
  assert t.try($q$select public.control_request_create(gen_random_uuid(), 'open')$q$) = 'ok', 'staff call control_request_create';
  assert t.try($q$select public.log_event('test_event', 'test')$q$) = 'ok', 'staff write the audit log';
end $$;
reset role;

-- Documents: a per-document grant shows that document; a class grant shows that class only.
select t.as_user('buyer@example.com');
set local role authenticated;
do $$ begin
  assert (select array_agg(id) from public.documents) = array['00000000-0000-0000-0000-00000000000a']::uuid[],
    'a per-document grant shows exactly that document';
end $$;
reset role;
select t.as_user('ca@example.com');
set local role authenticated;
do $$ begin
  assert (select array_agg(id) from public.documents) = array['00000000-0000-0000-0000-00000000000a']::uuid[],
    'a class grant shows that class, not every class';
end $$;
reset role;

-- The service role (no email) still logs on someone's behalf.
select t.as_user(null);
set local role service_role;
do $$ begin
  assert t.try($q$select public.log_event('office_box_upload', 'document', null, '{}', null, null, 'ok', null, 'office-box')$q$) = 'ok',
    'the service role writes the audit log';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.audit_log where actor_email = 'office-box') = 1, 'logged as the named actor';
  assert (select count(*) from public.audit_log where actor_email = 'stranger@example.com') = 0, 'nothing logged as the stranger';
  assert (select count(*) from control.control_request) = 1, 'only the owner''s control request exists';
  assert (select count(*) from public.approval_requests) = 1, 'only the owner''s approval request exists';
end $$;

rollback;
\echo staff_only: all checks passed
