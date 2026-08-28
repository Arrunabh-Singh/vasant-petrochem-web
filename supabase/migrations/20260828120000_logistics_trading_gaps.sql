-- ============================================================================
-- 20260828120000_logistics_trading_gaps.sql
-- Closes capability gaps vs ETRM / fleet-intelligence peers (2026-08-28):
-- logistics/shipments, fleet/vehicles, vessels, sanctions screening,
-- in-transit inventory, market price benchmarks, crude assays, trade finance
-- (LC / BL). Road-tanker first, sea-ready. RLS reuses app.has_role().
-- ============================================================================

create schema if not exists logistics;
create schema if not exists market;
create schema if not exists trade_finance;

create table if not exists logistics.shipment (
  id                bigint generated always as identity primary key,
  company_id        bigint,
  shipment_no       text not null,
  mode              text not null default 'road' check (mode in ('road','rail','sea','pipeline')),
  contract_ref      text,
  counterparty_name text,
  counterparty_ref  bigint,
  incoterm          text,
  origin            text,
  destination       text,
  product           text,
  qty               numeric(18,3),
  uom               text default 'KL',
  transporter_name  text,
  vehicle_no        text,
  vessel_id         bigint,
  driver_name       text,
  driver_phone      text,
  load_date         date,
  dispatch_date     date,
  eta               date,
  delivered_date    date,
  eway_no           text,
  eway_expiry       date,
  freight           numeric(14,2),
  freight_currency  text default 'INR',
  status            text not null default 'booked'
                    check (status in ('booked','loading','in_transit','delivered','returned','disputed')),
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists shipment_status_idx on logistics.shipment (status);
create index if not exists shipment_eta_idx on logistics.shipment (eta);
create index if not exists shipment_eway_idx on logistics.shipment (eway_expiry);

create table if not exists logistics.fleet_vehicle (
  id                bigint generated always as identity primary key,
  vehicle_no        text not null unique,
  transporter_name  text,
  tanker_type       text,
  capacity_kl       numeric(10,3),
  rto               text,
  insurance_expiry date,
  fitness_expiry   date,
  puc_expiry        date,
  permit_expiry    date,
  is_active         boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now()
);

create table if not exists logistics.vessel (
  id                bigint generated always as identity primary key,
  name              text not null unique,
  imo_no            text,
  flag_state        text,
  owner_name        text,
  pi_club          text,
  mmsi              text,
  sanctions_flag    text not null default 'clear' check (sanctions_flag in ('clear','watch','blocked')),
  last_screened_at  timestamptz,
  notes             text,
  created_at        timestamptz not null default now()
);

create table if not exists logistics.counterparty_sanction (
  id                bigint generated always as identity primary key,
  party_ref         bigint,
  party_name        text not null,
  screening_status  text not null default 'pending' check (screening_status in ('pending','clear','watch','blocked')),
  ofac_match        boolean not null default false,
  g7_pricecap_ok    boolean,
  screened_at       timestamptz not null default now(),
  screened_by       uuid default auth.uid(),
  source            text,
  notes             text
);
create index if not exists cp_sanction_status_idx on logistics.counterparty_sanction (screening_status);

create table if not exists logistics.in_transit_inventory (
  id                bigint generated always as identity primary key,
  shipment_id       bigint references logistics.shipment(id) on delete set null,
  product           text,
  qty               numeric(18,3),
  uom               text default 'KL',
  position_type     text not null check (position_type in ('sold_not_delivered','bought_not_received','in_pipeline')),
  expected_settle   date,
  created_at        timestamptz not null default now()
);

create table if not exists market.price_benchmark (
  id                bigint generated always as identity primary key,
  grade             text not null,
  source            text,
  price             numeric(18,4) not null,
  currency          text default 'USD',
  uom               text default 'bbl',
  as_of             date not null,
  created_at        timestamptz not null default now()
);
create index if not exists bench_grade_asof_idx on market.price_benchmark (grade, as_of);

create table if not exists market.crude_assay (
  id                bigint generated always as identity primary key,
  crude_grade       text not null,
  origin            text,
  api_gravity       numeric(6,2),
  sulphur_pct       numeric(6,4),
  tans              numeric(8,2),
  yield_profile     jsonb,
  source            text,
  created_at        timestamptz not null default now()
);

create table if not exists trade_finance.letter_of_credit (
  id                bigint generated always as identity primary key,
  lc_no             text not null unique,
  shipment_id       bigint references logistics.shipment(id) on delete set null,
  issuing_bank      text,
  beneficiary       text,
  amount            numeric(18,2),
  currency          text default 'USD',
  expiry            date,
  status            text not null default 'open' check (status in ('open','utilised','expired','cancelled')),
  created_at        timestamptz not null default now()
);

create table if not exists trade_finance.bill_of_lading (
  id                bigint generated always as identity primary key,
  bl_no             text not null unique,
  shipment_id       bigint references logistics.shipment(id) on delete set null,
  title_holder      text,
  issued_at         date,
  surrendered       boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table logistics.shipment            enable row level security;
alter table logistics.fleet_vehicle       enable row level security;
alter table logistics.vessel              enable row level security;
alter table logistics.counterparty_sanction enable row level security;
alter table logistics.in_transit_inventory enable row level security;
alter table market.price_benchmark        enable row level security;
alter table market.crude_assay            enable row level security;
alter table trade_finance.letter_of_credit enable row level security;
alter table trade_finance.bill_of_lading   enable row level security;

drop policy if exists shipment_read             on logistics.shipment;
drop policy if exists fleet_vehicle_read        on logistics.fleet_vehicle;
drop policy if exists vessel_read               on logistics.vessel;
drop policy if exists in_transit_inventory_read on logistics.in_transit_inventory;
drop policy if exists price_benchmark_read      on market.price_benchmark;
drop policy if exists crude_assay_read          on market.crude_assay;
drop policy if exists letter_of_credit_read     on trade_finance.letter_of_credit;
drop policy if exists bill_of_lading_read       on trade_finance.bill_of_lading;

create policy shipment_read             on logistics.shipment            for select to authenticated using (true);
create policy fleet_vehicle_read        on logistics.fleet_vehicle       for select to authenticated using (true);
create policy vessel_read               on logistics.vessel              for select to authenticated using (true);
create policy in_transit_inventory_read on logistics.in_transit_inventory for select to authenticated using (true);
create policy price_benchmark_read      on market.price_benchmark       for select to authenticated using (true);
create policy crude_assay_read          on market.crude_assay            for select to authenticated using (true);
create policy letter_of_credit_read     on trade_finance.letter_of_credit for select to authenticated using (true);
create policy bill_of_lading_read       on trade_finance.bill_of_lading  for select to authenticated using (true);

drop policy if exists counterparty_sanction_read on logistics.counterparty_sanction;
create policy counterparty_sanction_read on logistics.counterparty_sanction
  for select to authenticated
  using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));

drop policy if exists shipment_write             on logistics.shipment;
drop policy if exists fleet_vehicle_write        on logistics.fleet_vehicle;
drop policy if exists vessel_write               on logistics.vessel;
drop policy if exists counterparty_sanction_write on logistics.counterparty_sanction;
drop policy if exists in_transit_inventory_write on logistics.in_transit_inventory;
drop policy if exists price_benchmark_write      on market.price_benchmark;
drop policy if exists crude_assay_write          on market.crude_assay;
drop policy if exists letter_of_credit_write     on trade_finance.letter_of_credit;
drop policy if exists bill_of_lading_write       on trade_finance.bill_of_lading;

create policy shipment_write             on logistics.shipment            for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));
create policy fleet_vehicle_write        on logistics.fleet_vehicle       for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));
create policy vessel_write               on logistics.vessel              for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));
create policy counterparty_sanction_write on logistics.counterparty_sanction for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));
create policy in_transit_inventory_write on logistics.in_transit_inventory for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));
create policy price_benchmark_write      on market.price_benchmark       for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));
create policy crude_assay_write          on market.crude_assay            for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));
create policy letter_of_credit_write     on trade_finance.letter_of_credit for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));
create policy bill_of_lading_write       on trade_finance.bill_of_lading  for all to authenticated using (app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role]));

comment on table logistics.shipment is 'Road/rail/sea cargo movement. Road-tanker first; sea links vessel_id. E-way + ETA drive logistics_watch alerts.';
comment on table logistics.vessel is 'Sea vessels for chartering/sanctions screening (OFAC/G7). AIS mmsi for future tracking.';
comment on table logistics.counterparty_sanction is 'OFAC / G7 price-cap / PEP screening of counterparties AND vessels. Audit-trail required for oil trading.';
comment on table market.price_benchmark is 'Manual benchmark entry to start (Platts/Argus/MOPS); later automate. Feeds P&L/MTM.';
