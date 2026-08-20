-- VASANT_HUB_BLUEPRINT.md §3.4 + §7 F8: the golden rule is that the cloud
-- never pushes to the factory -- it only ever writes a *request* row here;
-- the factory pulls it over outbound TLS (app/api/control/pull) and acks
-- (app/api/control/ack). Nothing in this schema, or anywhere in this
-- repo, opens an inbound path to the PLC.

create schema if not exists control;
grant usage on schema control to authenticated, service_role;

create table control.control_request (
  id           uuid primary key default gen_random_uuid(),
  device_id    uuid not null references iot.device(id),
  action       text not null,
  seq          bigint not null,
  ttl_seconds  int not null default 30 check (ttl_seconds > 0),
  signature    text not null, -- HMAC(device_id|action|seq) with TELEMETRY_HMAC_SECRET, verified by the gateway
  requested_by text not null,
  approved_by  text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'pulled', 'executed', 'expired')),
  requested_at timestamptz not null default now(),
  approved_at  timestamptz,
  pulled_at    timestamptz,
  executed_at  timestamptz,
  unique (device_id, seq)
);

create index control_request_status_idx on control.control_request (status);

-- The 2-person rule lives here, not just in the app -- and approved_by is
-- derived from the deciding session, never trusted from client input,
-- for the same reason as approval_requests' maker-checker trigger.
create or replace function control.enforce_two_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    new.approved_by := app.current_email();
    new.approved_at := now();
    if new.approved_by = '' or new.approved_by = new.requested_by then
      raise exception 'control 2-person rule violation: requester cannot approve their own request';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function control.enforce_two_person() from public;

create trigger control_request_two_person
  before update on control.control_request
  for each row execute function control.enforce_two_person();

alter table control.control_request enable row level security;

create policy "authenticated can read control_request"
  on control.control_request for select
  to authenticated
  using (true);

create policy "authenticated can request control action"
  on control.control_request for insert
  to authenticated
  with check (requested_by = app.current_email());

create policy "admin approver can decide control_request"
  on control.control_request for update
  to authenticated
  using (app.has_role('admin', 'approver'))
  with check (app.has_role('admin', 'approver'));

grant select, insert, update on control.control_request to authenticated;
grant all on control.control_request to service_role;
