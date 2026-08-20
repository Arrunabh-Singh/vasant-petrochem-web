-- VASANT_HUB_BLUEPRINT.md §2.4, with decision 7 applied: NO telemetry_raw
-- and no monthly partitioning. Raw readings stay in SQLite on the edge
-- gateway (90d); the cloud only ever receives 1-minute aggregates
-- (~30-60MB/yr against the 500MB Supabase Free read-only wall, vs. ~1.5GB/
-- yr if raw rows landed here).

create schema if not exists iot;
grant usage on schema iot to authenticated, service_role;

create table iot.device (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('temp', 'pressure', 'level', 'flow', 'machine')),
  unit       text,
  location   text,
  gateway_id text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Per-device HMAC secret, hashed at rest -- app/api/telemetry/ingest
-- verifies against secret_hash, never stores or logs the plaintext.
create table iot.device_credential (
  device_id   uuid primary key references iot.device(id) on delete cascade,
  secret_hash text not null,
  rotated_at  timestamptz not null default now()
);

create table iot.telemetry_1m (
  device_id    uuid not null references iot.device(id),
  period_start timestamptz not null,
  avg          double precision,
  min          double precision,
  max          double precision,
  last         double precision,
  primary key (device_id, period_start)
);

create table iot.telemetry_1h (
  device_id    uuid not null references iot.device(id),
  period_start timestamptz not null,
  avg          double precision,
  min          double precision,
  max          double precision,
  last         double precision,
  primary key (device_id, period_start)
);

create table iot.telemetry_1d (
  device_id    uuid not null references iot.device(id),
  period_start timestamptz not null,
  avg          double precision,
  min          double precision,
  max          double precision,
  last         double precision,
  primary key (device_id, period_start)
);

create table iot.machine_event (
  id         uuid primary key default gen_random_uuid(),
  device_id  uuid not null references iot.device(id),
  event      text not null check (event in ('start', 'stop', 'fault', 'clear')),
  ts         timestamptz not null default now(),
  fault_code text
);

create table iot.alarm_history (
  id         uuid primary key default gen_random_uuid(),
  device_id  uuid not null references iot.device(id),
  rule_id    text,
  severity   text not null check (severity in ('info', 'warning', 'critical')),
  raised_at  timestamptz not null default now(),
  acked_by   text,
  acked_at   timestamptz,
  cleared_at timestamptz
);

create index telemetry_1m_device_period_idx on iot.telemetry_1m (device_id, period_start desc);
create index telemetry_1h_device_period_idx on iot.telemetry_1h (device_id, period_start desc);
create index telemetry_1d_device_period_idx on iot.telemetry_1d (device_id, period_start desc);
create index alarm_history_device_idx on iot.alarm_history (device_id, raised_at desc);

alter table iot.device enable row level security;
alter table iot.device_credential enable row level security;
alter table iot.telemetry_1m enable row level security;
alter table iot.telemetry_1h enable row level security;
alter table iot.telemetry_1d enable row level security;
alter table iot.machine_event enable row level security;
alter table iot.alarm_history enable row level security;

-- Live plant status is family-visible (blueprint §2.5); the actual
-- ingest write path is service_role only (app/api/telemetry/ingest),
-- validated by device HMAC, never by a Supabase session.
create policy "authenticated can read device" on iot.device for select to authenticated using (true);
create policy "admin approver can manage device" on iot.device for all to authenticated using (app.has_role('admin', 'approver')) with check (app.has_role('admin', 'approver'));

-- device_credential holds a secret hash -- admin-only, never family-readable.
create policy "admin can manage device_credential" on iot.device_credential for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy "authenticated can read telemetry_1m" on iot.telemetry_1m for select to authenticated using (true);
create policy "authenticated can read telemetry_1h" on iot.telemetry_1h for select to authenticated using (true);
create policy "authenticated can read telemetry_1d" on iot.telemetry_1d for select to authenticated using (true);
create policy "authenticated can read machine_event" on iot.machine_event for select to authenticated using (true);
create policy "authenticated can read alarm_history" on iot.alarm_history for select to authenticated using (true);
create policy "admin approver can ack alarm_history" on iot.alarm_history for update to authenticated using (app.has_role('admin', 'approver')) with check (app.has_role('admin', 'approver'));

grant select on iot.device, iot.telemetry_1m, iot.telemetry_1h, iot.telemetry_1d, iot.machine_event, iot.alarm_history to authenticated;
grant insert, update, delete on iot.device to authenticated;
grant select, insert, update, delete on iot.device_credential to authenticated;
grant update on iot.alarm_history to authenticated;
grant all on all tables in schema iot to service_role;
