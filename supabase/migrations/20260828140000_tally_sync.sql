-- ============================================================================
-- 20260828140000_tally_sync.sql
-- Tally Prime sync landing tables. The Mac Hub (11_IT_Ops/Scripts/tally_sync.py)
-- pulls Companies / Ledgers / Stock Items over Tally's HTTP server (port 9000)
-- and upserts here via the service-role REST API. VPC admin pages read them.
-- RLS: any authenticated user can read; only admin/approver (or the service
-- role used by the Hub script) can write.
-- ============================================================================

create schema if not exists tally;

create table if not exists tally.company (
  name         text primary key,
  tally_guid   text,
  last_synced  timestamptz not null default now(),
  raw_json     jsonb
);

create table if not exists tally.ledger (
  company        text not null,
  name           text not null,
  parent         text,
  closing_amount numeric,
  closing_type   text,
  opening_amount numeric,
  opening_type   text,
  last_synced    timestamptz not null default now(),
  raw_json       jsonb,
  primary key (company, name)
);

create table if not exists tally.stock_item (
  company      text not null,
  name         text not null,
  parent       text,
  closing_qty  numeric,
  closing_value numeric,
  rate         numeric,
  last_synced  timestamptz not null default now(),
  raw_json     jsonb,
  primary key (company, name)
);

create table if not exists tally.sync_log (
  id         bigint generated always as identity primary key,
  ran_at     timestamptz not null default now(),
  status     text not null,
  companies  integer not null default 0,
  ledgers    integer not null default 0,
  stock      integer not null default 0,
  error      text
);

alter table tally.company     enable row level security;
alter table tally.ledger      enable row level security;
alter table tally.stock_item  enable row level security;
alter table tally.sync_log    enable row level security;

-- Read: any authenticated user
create policy tally_company_read    on tally.company    for select to authenticated using (true);
create policy tally_ledger_read     on tally.ledger     for select to authenticated using (true);
create policy tally_stock_read      on tally.stock_item for select to authenticated using (true);
create policy tally_sync_log_read   on tally.sync_log   for select to authenticated using (true);

-- Write: admin/approver only (the Hub script uses the service role, which bypasses RLS)
create policy tally_company_write   on tally.company    for all to authenticated using (app.has_role('admin', 'approver')) with check (app.has_role('admin', 'approver'));
create policy tally_ledger_write    on tally.ledger     for all to authenticated using (app.has_role('admin', 'approver')) with check (app.has_role('admin', 'approver'));
create policy tally_stock_write    on tally.stock_item for all to authenticated using (app.has_role('admin', 'approver')) with check (app.has_role('admin', 'approver'));
create policy tally_sync_log_write  on tally.sync_log   for all to authenticated using (app.has_role('admin', 'approver')) with check (app.has_role('admin', 'approver'));
