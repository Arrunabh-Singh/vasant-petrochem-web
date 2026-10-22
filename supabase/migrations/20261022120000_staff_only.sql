-- Staff only (22 Oct 2026).
--
-- Supabase sign-ups are open (email and Google), so anyone can hold an
-- `authenticated` session without ever passing the hub's allowlist. Several
-- policies and functions took "authenticated" to mean "staff"; they now ask
-- app.is_staff(): an active row in public.app_users. Release 2's buyer
-- accounts depend on this.
--
-- It also lets the hub, and the Mac Hub's Tally sync, use the tally,
-- logistics, market and trade_finance schemas: no role had been granted them,
-- so those pages could never show data. Row-level security keeps them
-- staff-only. (The schemas must also be listed under Supabase > Project
-- Settings > Data API > Exposed schemas; that is a dashboard setting.)
--
-- Applied through the Supabase MCP, which holds a top-level DROP for a
-- confirmation, so policies change with ALTER POLICY and functions with
-- CREATE OR REPLACE. Safe to run again.
set lock_timeout = '10s';

create or replace function app.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.app_users u
    where u.email = app.current_email() and u.is_active
  )
$$;
revoke all on function app.is_staff() from public;
grant execute on function app.is_staff() to authenticated, service_role;
comment on function app.is_staff() is
  'True for an active public.app_users row (any role). The test every staff-only policy and function uses; a buyer account is never staff.';

-- 1. Reads: every SELECT policy open to any signed-in user now needs staff.
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where 'authenticated' = any (roles) and cmd = 'SELECT' and qual = 'true'
  loop
    execute format('alter policy %I on %I.%I using (app.is_staff())', r.policyname, r.schemaname, r.tablename);
    n := n + 1;
  end loop;
  raise notice 'staff_only: % read policies now need staff', n;
end $$;

-- 2. Requests: only staff may file a control or an approval request.
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'control' and tablename = 'control_request'
             and policyname = 'authenticated can request control action') then
    alter policy "authenticated can request control action" on control.control_request
      with check (app.is_staff() and requested_by = app.current_email());
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'approval_requests'
             and policyname = 'authenticated can request approval') then
    alter policy "authenticated can request approval" on public.approval_requests
      with check (app.is_staff() and requested_by = app.current_email());
  end if;
end $$;

-- 3. Functions a signed-in caller can reach.
-- control_request_create: as before, but staff only.
create or replace function public.control_request_create(p_device_id uuid, p_action text, p_ttl_seconds int default 30)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester text := app.current_email();
  next_seq bigint;
  new_id uuid;
begin
  if requester = '' or not app.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select coalesce(max(seq), 0) + 1 into next_seq
  from control.control_request
  where device_id = p_device_id;

  insert into control.control_request (device_id, action, seq, ttl_seconds, signature, requested_by)
  values (p_device_id, p_action, next_seq, p_ttl_seconds, '', requester)
  returning id into new_id;

  perform public.log_event('control_request_created', 'control_request', new_id::text,
    jsonb_build_object('device_id', p_device_id, 'action', p_action, 'seq', next_seq), null, null, 'ok', null, requester);

  return new_id;
end;
$$;
revoke execute on function public.control_request_create(uuid, text, int) from public;
grant execute on function public.control_request_create(uuid, text, int) to authenticated;

-- log_event: as before, but a signed-in caller must be staff. The service
-- role (no email) and the definer functions that log on a staff member's
-- behalf are unaffected.
create or replace function public.log_event(
  p_action text,
  p_object_type text,
  p_object_id text default null,
  p_meta jsonb default '{}'::jsonb,
  p_before jsonb default null,
  p_after jsonb default null,
  p_outcome text default 'ok',
  p_reason text default null,
  p_actor_email text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_actor text;
begin
  if p_action !~ '^[a-z_]+$' then
    raise exception 'invalid action: %', p_action;
  end if;
  if p_outcome not in ('ok', 'denied', 'failed') then
    raise exception 'invalid outcome: %', p_outcome;
  end if;

  resolved_actor := nullif(app.current_email(), '');
  if resolved_actor is not null and not app.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if resolved_actor is null then
    resolved_actor := coalesce(nullif(p_actor_email, ''), 'service');
  end if;

  insert into public.audit_log (actor_email, action, object_type, object_id, meta, before, after, outcome, reason)
  values (resolved_actor, p_action, p_object_type, p_object_id, coalesce(p_meta, '{}'::jsonb), p_before, p_after, coalesce(p_outcome, 'ok'), p_reason);
end;
$$;
revoke all on function public.log_event(text, text, text, jsonb, jsonb, jsonb, text, text, text) from public;
grant execute on function public.log_event(text, text, text, jsonb, jsonb, jsonb, text, text, text)
  to authenticated, service_role;

-- retention_for is a date calculation only the service role uses.
do $$ begin
  if to_regprocedure('public.retention_for(public.doc_class, integer)') is not null then
    revoke execute on function public.retention_for(public.doc_class, integer) from authenticated;
  end if;
end $$;

-- 4. Documents: the read policy's subqueries compared each ACL table with
-- itself (unqualified columns bind to the inner table), so per-document
-- grants never matched and any class grant showed every class.
do $$ begin
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
          )
        )
      );
  end if;
end $$;

-- 5. The data schemas the hub and the Tally sync use, now that their
-- policies are staff-only. Writes stay with the admin/approver FOR ALL
-- policies; anon gets nothing.
do $$
declare
  s text;
begin
  foreach s in array array['tally', 'logistics', 'market', 'trade_finance'] loop
    if exists (select 1 from pg_namespace where nspname = s) then
      execute format('grant usage on schema %I to authenticated, service_role', s);
      execute format('grant select, insert, update, delete on all tables in schema %I to authenticated', s);
      execute format('grant all on all tables in schema %I to service_role', s);
      execute format('grant usage, select on all sequences in schema %I to authenticated, service_role', s);
      execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to authenticated', s);
      execute format('alter default privileges in schema %I grant all on tables to service_role', s);
      execute format('alter default privileges in schema %I grant usage, select on sequences to authenticated, service_role', s);
    end if;
  end loop;
end $$;
