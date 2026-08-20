-- Correction: PostgREST only exposes schemas on the project's "Exposed
-- schemas" allowlist (Settings > API), which defaults to `public` alone
-- and is a dashboard-only setting no migration or MCP tool can change.
-- finance/inventory/production/iot/control are NOT on that list, so
-- .from()/.schema() calls against them from supabase-js would fail
-- regardless of how correct the RLS/grants are. Rather than depend on a
-- dashboard setting the owner hasn't configured (docs/OWNER_CHECKLIST.md
-- doesn't need a new entry for this because of the fix below), the app
-- layer talks to iot/control exclusively through public-schema RPC
-- functions -- which PostgREST always exposes at /rest/v1/rpc/<name>
-- regardless of which schema the function body reads from.

create or replace function public.iot_ingest_telemetry(p_device_id uuid, p_readings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  device_active boolean;
  n int;
begin
  select is_active into device_active from iot.device where id = p_device_id;
  if device_active is null or device_active = false then
    raise exception 'unknown or inactive device';
  end if;

  insert into iot.telemetry_1m (device_id, period_start, avg, min, max, last)
  select
    p_device_id,
    (r ->> 'periodStart')::timestamptz,
    (r ->> 'avg')::double precision,
    (r ->> 'min')::double precision,
    (r ->> 'max')::double precision,
    (r ->> 'last')::double precision
  from jsonb_array_elements(p_readings) r
  on conflict (device_id, period_start)
  do update set avg = excluded.avg, min = excluded.min, max = excluded.max, last = excluded.last;

  get diagnostics n = row_count;
  return jsonb_build_object('accepted', n);
end;
$$;
revoke execute on function public.iot_ingest_telemetry(uuid, jsonb) from public;
grant execute on function public.iot_ingest_telemetry(uuid, jsonb) to service_role;

-- F8's golden rule, enforced here too: this function only ever returns
-- rows the cloud already approved -- there is no function anywhere that
-- writes a command straight to a device.
create or replace function public.control_pull(p_device_id uuid)
returns setof control.control_request
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update control.control_request
  set status = 'pulled', pulled_at = now()
  where device_id = p_device_id
    and status = 'approved'
    and approved_at > now() - make_interval(secs => ttl_seconds)
  returning *;
end;
$$;
revoke execute on function public.control_pull(uuid) from public;
grant execute on function public.control_pull(uuid) to service_role;

create or replace function public.control_ack(p_device_id uuid, p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected int;
begin
  update control.control_request
  set status = 'executed', executed_at = now()
  where id = p_request_id and device_id = p_device_id and status = 'pulled';
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;
revoke execute on function public.control_ack(uuid, uuid) from public;
grant execute on function public.control_ack(uuid, uuid) to service_role;

-- Requester identity is derived from the caller's own session, never
-- trusted from a parameter -- same reasoning as approval_requests and
-- control.enforce_two_person(). seq is assigned atomically here so two
-- concurrent requests for the same device can never collide.
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
  if requester = '' then
    raise exception 'not authorized';
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
