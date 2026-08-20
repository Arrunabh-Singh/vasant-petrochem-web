-- document-storage-hardening.md §3.2 + §4.1, adapted to reuse Phase 1's
-- app_users/app.* helpers instead of a separate identity check.

create type public.doc_class as enum
  ('tds', 'purchase-bills', 'sales-bills', 'gst', 'contracts', 'coa', 'hr', 'bank');

create type public.acl_level as enum ('view', 'approve', 'upload');

-- §4.1 legal retention schedule (India). FY-anchored classes (bills, GST,
-- bank statements) use "financial year + 8 years" measured from the FY
-- end (31 Mar) — the safe rule that covers both CGST §36(2) (~7y from the
-- GSTR-9 due date) and IT Rule 6F(5) (6y from AY end) at once. Classes
-- without a clean FY anchor (contracts, coa, hr, tds) use upload date as
-- the floor; extend via legal_hold when a real trigger event (contract
-- termination, employment end) is known.
create or replace function public.retention_for(p_class public.doc_class, p_fy int default null)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case p_class
    when 'purchase-bills' then make_date(coalesce(p_fy, extract(year from current_date)::int) + 8, 3, 31)
    when 'sales-bills'    then make_date(coalesce(p_fy, extract(year from current_date)::int) + 8, 3, 31)
    when 'gst'            then make_date(coalesce(p_fy, extract(year from current_date)::int) + 8, 3, 31)
    when 'bank'           then make_date(coalesce(p_fy, extract(year from current_date)::int) + 8, 3, 31)
    when 'contracts'      then (current_date + interval '8 years')::date
    when 'coa'            then (current_date + interval '6 years')::date
    when 'hr'             then (current_date + interval '7 years')::date
    when 'tds'            then (current_date + interval '3 years')::date
  end
$$;
revoke all on function public.retention_for(public.doc_class, int) from public;
grant execute on function public.retention_for(public.doc_class, int) to authenticated, service_role;

create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  doc_class       public.doc_class not null,
  path            text not null unique,
  logical_name    text not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'active', 'superseded', 'soft_deleted', 'legal_hold', 'quarantined')),
  legal_hold      boolean not null default false,
  encrypted       boolean not null default false,
  checksum_sha256 text not null,
  size_bytes      bigint not null check (size_bytes > 0),
  version         int not null default 1,
  retention_until date not null,
  metadata        jsonb not null default '{}'::jsonb,
  created_by      text not null references public.app_users(email),
  created_at      timestamptz not null default now()
);

create table public.document_versions (
  doc_id          uuid not null references public.documents(id) on delete cascade,
  version         int not null,
  path            text not null unique,
  checksum_sha256 text not null,
  size_bytes      bigint not null,
  uploaded_by     text not null,
  created_at      timestamptz not null default now(),
  primary key (doc_id, version)
);

create table public.document_acl (
  id            uuid primary key default gen_random_uuid(),
  doc_id        uuid not null references public.documents(id) on delete cascade,
  subject_email text not null,
  level         public.acl_level not null default 'view',
  granted_by    text not null,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (doc_id, subject_email)
);

-- Class-wide grants (family-viewer / CA groups). Admin-only to insert, and
-- hr/bank are never grantable class-wide (enforced in acl_grant below) —
-- doc-hardening §3.1: family-viewer's default groups never include hr/bank.
create table public.class_acl (
  doc_class     public.doc_class not null,
  subject_email text not null,
  level         public.acl_level not null default 'view',
  granted_by    text not null,
  created_at    timestamptz not null default now(),
  primary key (doc_class, subject_email)
);

create index documents_doc_class_idx on public.documents (doc_class);
create index documents_retention_idx on public.documents (retention_until) where legal_hold = false;
create index document_acl_subject_idx on public.document_acl (subject_email);
create index class_acl_subject_idx on public.class_acl (subject_email);

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_acl enable row level security;
alter table public.class_acl enable row level security;

-- Quarantine is visible to admin/approver on purpose (doc-hardening §4.3:
-- "a quarantine is visible to admin so it can't be used as a silent-
-- censorship channel") — only non-privileged viewers have it filtered out.
create policy "visibility = acl match or class acl match or admin/approver"
  on public.documents for select
  to authenticated
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

create policy "admin can manage documents"
  on public.documents for all
  to authenticated
  using (app.has_role('admin', 'approver'))
  with check (app.has_role('admin', 'approver'));

create policy "versions visible if parent document is"
  on public.document_versions for select
  to authenticated
  using (exists (
    select 1 from public.documents d where d.id = doc_id
    and (
      exists (select 1 from public.document_acl a where a.doc_id = d.id and a.subject_email = app.current_email())
      or exists (select 1 from public.class_acl c where c.doc_class = d.doc_class and c.subject_email = app.current_email())
      or app.has_role('admin', 'approver')
    )
  ));

create policy "admin can manage document_versions"
  on public.document_versions for all
  to authenticated
  using (app.has_role('admin', 'approver'))
  with check (app.has_role('admin', 'approver'));

create policy "acl visible to subjects and admins"
  on public.document_acl for select
  to authenticated
  using (subject_email = app.current_email() or app.has_role('admin', 'approver'));

-- Grant/revoke only via the security-definer RPCs below (validates the
-- granter's role) — no direct table writes for anyone, admin included.
create policy "no direct acl writes" on public.document_acl for insert with check (false);
create policy "no direct acl updates" on public.document_acl for update using (false);
create policy "no direct acl deletes" on public.document_acl for delete using (false);

create policy "class acl visible to subjects and admins"
  on public.class_acl for select
  to authenticated
  using (subject_email = app.current_email() or app.has_role('admin', 'approver'));
create policy "no direct class acl writes" on public.class_acl for insert with check (false);
create policy "no direct class acl deletes" on public.class_acl for delete using (false);

grant select on public.documents to authenticated;
grant select, insert, update on public.document_versions to authenticated;
grant select on public.document_acl to authenticated;
grant select on public.class_acl to authenticated;

create or replace function public.acl_grant(p_doc_id uuid, p_subject_email text, p_level public.acl_level default 'view')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  granter text := app.current_email();
  granter_role public.app_role;
  target_class public.doc_class;
begin
  select role into granter_role from public.app_users where email = granter and is_active;
  select doc_class into target_class from public.documents where id = p_doc_id;

  if target_class is null then
    raise exception 'document not found';
  end if;
  if granter_role is null or granter_role not in ('admin', 'approver') then
    raise exception 'only admin/approver can grant document access';
  end if;
  if granter_role = 'approver' and target_class in ('hr', 'bank') then
    raise exception 'approver cannot grant access to hr/bank without admin';
  end if;

  insert into public.document_acl (doc_id, subject_email, level, granted_by)
  values (p_doc_id, lower(p_subject_email), p_level, granter)
  on conflict (doc_id, subject_email) do update set level = excluded.level, granted_by = excluded.granted_by;

  perform public.log_event('acl_grant', 'document', p_doc_id::text,
    jsonb_build_object('subject', lower(p_subject_email), 'level', p_level));
end;
$$;

create or replace function public.acl_revoke(p_doc_id uuid, p_subject_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  granter text := app.current_email();
  granter_role public.app_role;
begin
  select role into granter_role from public.app_users where email = granter and is_active;
  if granter_role is null or granter_role not in ('admin', 'approver') then
    raise exception 'only admin/approver can revoke document access';
  end if;

  delete from public.document_acl where doc_id = p_doc_id and subject_email = lower(p_subject_email);

  perform public.log_event('acl_revoke', 'document', p_doc_id::text,
    jsonb_build_object('subject', lower(p_subject_email)));
end;
$$;

revoke all on function public.acl_grant(uuid, text, public.acl_level) from public;
revoke all on function public.acl_revoke(uuid, text) from public;
grant execute on function public.acl_grant(uuid, text, public.acl_level) to authenticated, service_role;
grant execute on function public.acl_revoke(uuid, text) to authenticated, service_role;
