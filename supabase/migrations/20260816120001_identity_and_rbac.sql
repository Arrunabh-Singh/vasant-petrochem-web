-- Root-cause fix for audit.md C3, applied once instead of per-table.
--
-- Supabase's project template sets a default ACL (see pg_default_acl) that
-- grants anon/authenticated/service_role ALL privileges — including
-- TRUNCATE, which RLS cannot block — on every NEW table created in the
-- `public` schema by the `postgres` role (the role every migration,
-- including this one, runs as). That default ACL is exactly how
-- products/quote_requests/tds_requests ended up with TRUNCATE granted to
-- anon (C3) despite nobody writing a GRANT statement for it. Patching each
-- table after the fact is the trap: the very next `create table` silently
-- reopens the hole. Fix the default instead, so every table created from
-- this point forward in `public` — in this migration and every later one —
-- starts with zero anon/authenticated privileges until explicitly granted.
-- service_role is left alone: it is the trusted server-only key, already
-- bypasses RLS (rolbypassrls), and every server action already gates access
-- to it behind SUPABASE_SERVICE_ROLE_KEY.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

create type public.app_role as enum
  ('admin', 'approver', 'uploader', 'reader', 'family-viewer', 'ca');

create table public.app_users (
  email      text primary key,
  role       public.app_role not null default 'reader',
  groups     text[] not null default '{}',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.app_users is
  'The one identity/role table for the hub — unifies audit.md C1''s admin '
  'allowlist, document-storage-hardening.md''s app_users, and the '
  'blueprint''s profiles/membership/app_role into a single source of truth.';

-- app schema: identity/RBAC helper functions, callable from any RLS policy
-- as a one-liner instead of repeating the same EXISTS subquery everywhere.
create schema if not exists app;
grant usage on schema app to authenticated, service_role;

create or replace function app.current_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.email(), ''))
$$;

create or replace function app.has_role(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_users u
    where u.email = app.current_email()
      and u.is_active
      and u.role = any(roles)
  )
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.has_role('admin')
$$;

revoke all on function app.current_email() from public;
revoke all on function app.has_role(public.app_role[]) from public;
revoke all on function app.is_admin() from public;
grant execute on function app.current_email() to authenticated, service_role;
grant execute on function app.has_role(public.app_role[]) to authenticated, service_role;
grant execute on function app.is_admin() to authenticated, service_role;

alter table public.app_users enable row level security;

create policy "self can read own row"
  on public.app_users for select
  to authenticated
  using (email = app.current_email());

create policy "admin can manage app_users"
  on public.app_users for all
  to authenticated
  using (app.is_admin())
  with check (app.is_admin());

grant select, insert, update, delete on public.app_users to authenticated;

-- Break-glass seed: the owner account, matching audit.md C1's remediation
-- and the existing ADMIN_ALLOWED_EMAILS env var. lib/rbac.ts (Phase 2)
-- ORs this table with the env allowlist, so a bad seed here can never lock
-- the owner out — the env var is the fallback, not the primary.
insert into public.app_users (email, role)
values ('arrunabh.s@gmail.com', 'admin')
on conflict (email) do nothing;
