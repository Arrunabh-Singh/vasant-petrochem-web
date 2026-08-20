-- Decision 2: one audit table instead of audit.md M2's audit_log and
-- document-storage-hardening.md §3.3's doc_events as two separate tables.
-- audit_log is the union of both column sets; doc_events below is a view
-- over it so every query written in doc-hardening §3.3/§6.2 still works
-- verbatim. Comes before document_vault (next migration) because that
-- migration's acl_grant()/acl_revoke() RPCs call log_event().

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_email text not null,
  actor_type  text not null default 'user' check (actor_type in ('user', 'service', 'ai', 'device', 'system')),
  action      text not null check (action ~ '^[a-z_]+$'),
  object_type text not null,
  object_id   text,
  before      jsonb,
  after       jsonb,
  meta        jsonb not null default '{}'::jsonb,
  ip          text,
  user_agent  text,
  outcome     text not null default 'ok' check (outcome in ('ok', 'denied', 'failed')),
  reason      text,
  created_at  timestamptz not null default now()
);

create index audit_log_object_idx on public.audit_log (object_type, object_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

comment on table public.audit_log is
  'Append-only. Every meaningful event: admin actions, document access, '
  'AI actions, control actions, schema changes. RLS + the fact that only '
  'log_event() can write to it (authenticated has no direct INSERT grant) '
  'is what makes it append-only in practice, not just by convention.';

-- document-storage-hardening.md §3.3's exact query shape
-- (`select * from doc_events order by id desc limit 200`) works against
-- this unchanged.
-- security_invoker: a plain view runs with the OWNER's (postgres)
-- privileges against the base table by default, which bypasses RLS
-- entirely and would leak every actor's rows to any authenticated caller.
-- security_invoker makes it run as the querying user instead, so the
-- audit_log RLS policy above still applies through the view.
create view public.doc_events with (security_invoker = true) as
select id, object_id::uuid as doc_id, actor_email, action, meta, created_at
from public.audit_log
where object_type = 'document';

grant select on public.doc_events to authenticated;

alter table public.audit_log enable row level security;

create policy "admin approver can read audit_log"
  on public.audit_log for select
  to authenticated
  using (app.has_role('admin', 'approver'));

-- Deliberately no insert/update/delete grant to authenticated at all —
-- every write goes through log_event() (security definer), so even a
-- well-formed direct INSERT from an authenticated session is rejected at
-- the grant level, not just by RLS.
grant select on public.audit_log to authenticated;

create or replace function public.log_event(
  p_action text,
  p_object_type text,
  p_object_id text default null,
  p_meta jsonb default '{}'::jsonb,
  p_before jsonb default null,
  p_after jsonb default null,
  p_outcome text default 'ok',
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_action !~ '^[a-z_]+$' then
    raise exception 'invalid action: %', p_action;
  end if;
  if p_outcome not in ('ok', 'denied', 'failed') then
    raise exception 'invalid outcome: %', p_outcome;
  end if;

  insert into public.audit_log (actor_email, action, object_type, object_id, meta, before, after, outcome, reason)
  values (
    coalesce(nullif(app.current_email(), ''), 'service'),
    p_action,
    p_object_type,
    p_object_id,
    coalesce(p_meta, '{}'::jsonb),
    p_before,
    p_after,
    coalesce(p_outcome, 'ok'),
    p_reason
  );
end;
$$;

revoke all on function public.log_event(text, text, text, jsonb, jsonb, jsonb, text, text) from public;
grant execute on function public.log_event(text, text, text, jsonb, jsonb, jsonb, text, text)
  to authenticated, service_role;
