-- Every service-role-initiated write this wave (ticket uploads, telemetry
-- ingest, control acks, ETL, cron) is performed by an identified principal
-- who has no Supabase JWT of their own. Without this, every such event
-- would log as generic "service" with the real actor buried in meta.
--
-- p_actor_email is only ever used when app.current_email() is empty, which
-- can only happen for a service_role connection — an `authenticated`
-- session always carries a JWT-derived email, so a logged-in user can
-- never use this parameter to spoof a different actor.
-- create or replace can't change a function's parameter list — adding
-- p_actor_email would otherwise create a second overload alongside the
-- old 8-arg one instead of replacing it. Drop the old signature first so
-- there is exactly one log_event.
drop function if exists public.log_event(text, text, text, jsonb, jsonb, jsonb, text, text);

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
