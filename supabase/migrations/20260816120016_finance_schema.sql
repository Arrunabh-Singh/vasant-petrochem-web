-- VASANT_HUB_BLUEPRINT.md §2.1 + §2.6 (etl_run_log), F3 (Tally pull ETL).
-- New schema, so — unlike `public` — there is NO default ACL here at all:
-- service_role gets zero automatic grants and needs them explicitly, same
-- as authenticated (see the memory note on Supabase default-privilege
-- traps from this session).

create schema if not exists finance;
grant usage on schema finance to authenticated, service_role;

create table finance.company (
  id           uuid primary key default gen_random_uuid(),
  tally_guid   text unique,
  name         text not null,
  gstin        text,
  address      text,
  fy           text,
  created_at   timestamptz not null default now()
);

create table finance.ledger (
  id               uuid primary key default gen_random_uuid(),
  tally_guid       text unique,
  name             text not null,
  ledger_type      text not null check (ledger_type in ('sundry_debtor', 'sundry_creditor', 'bank', 'cash', 'other')),
  gstin            text,
  phone            text,
  address          text,
  opening_balance  numeric not null default 0,
  superseded       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table finance.item (
  id             uuid primary key default gen_random_uuid(),
  tally_guid     text unique,
  name           text not null,
  unit           text,
  gst_hsn        text,
  gst_rate       numeric,
  batch_tracked  boolean not null default false,
  opening_stock  numeric not null default 0,
  superseded     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table finance.voucher (
  id              uuid primary key default gen_random_uuid(),
  tally_guid      text unique,
  voucher_type    text not null,
  voucher_number  text,
  voucher_date    date not null,
  party_id        uuid references finance.ledger(id),
  amount          numeric not null,
  gst_tax_amount  numeric not null default 0,
  tally_state     text not null default 'created' check (tally_state in ('created', 'edited', 'deleted')),
  superseded      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table finance.voucher_line (
  id           uuid primary key default gen_random_uuid(),
  voucher_id   uuid not null references finance.voucher(id) on delete cascade,
  item_id      uuid references finance.item(id),
  qty          numeric,
  rate         numeric,
  amount       numeric not null,
  tax_amount   numeric not null default 0
);

create table finance.bill_receivable (
  id            uuid primary key default gen_random_uuid(),
  voucher_id    uuid not null references finance.voucher(id) on delete cascade,
  party_id      uuid not null references finance.ledger(id),
  bill_amount   numeric not null,
  paid_amount   numeric not null default 0,
  due_date      date,
  status        text not null default 'open' check (status in ('open', 'partial', 'closed')),
  updated_at    timestamptz not null default now()
);

create table finance.gst_summary (
  id                uuid primary key default gen_random_uuid(),
  period            text not null, -- yyyymm
  gstin             text not null,
  sales_amt         numeric not null default 0,
  tax_amt           numeric not null default 0,
  purchases_amt     numeric not null default 0,
  itc_amt           numeric not null default 0,
  gstreturn_status  text,
  unique (period, gstin)
);

create table finance.bank_statement (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references finance.ledger(id),
  txn_date    date not null,
  amount      numeric not null,
  narration   text,
  chq_no      text,
  reconciled  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- R1 in THREAT_MODEL.md: "no silent failures" -- every ETL run, success
-- or failure, gets a row. The daily mismatch report + notify() on 2
-- consecutive misses (blueprint P1 exit criteria) both read this.
create table finance.etl_run_log (
  id             uuid primary key default gen_random_uuid(),
  source         text not null default 'tally',
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running' check (status in ('running', 'ok', 'failed')),
  rows_processed int not null default 0,
  mismatches     int not null default 0,
  error          text
);

create index voucher_party_idx on finance.voucher (party_id);
create index voucher_line_voucher_idx on finance.voucher_line (voucher_id);
create index bill_receivable_party_idx on finance.bill_receivable (party_id);
create index etl_run_log_started_idx on finance.etl_run_log (started_at desc);

alter table finance.company enable row level security;
alter table finance.ledger enable row level security;
alter table finance.item enable row level security;
alter table finance.voucher enable row level security;
alter table finance.voucher_line enable row level security;
alter table finance.bill_receivable enable row level security;
alter table finance.gst_summary enable row level security;
alter table finance.bank_statement enable row level security;
alter table finance.etl_run_log enable row level security;

-- Finance is the most sensitive class in the threat model (A1, "protect
-- with everything") -- admin/approver only, no family-viewer default.
do $$
declare
  t text;
begin
  foreach t in array array['company','ledger','item','voucher','voucher_line','bill_receivable','gst_summary','bank_statement','etl_run_log']
  loop
    execute format(
      'create policy "admin approver can read %1$I" on finance.%1$I for select to authenticated using (app.has_role(''admin'',''approver''))',
      t
    );
  end loop;
end $$;

grant select on all tables in schema finance to authenticated;
grant all on all tables in schema finance to service_role;
grant usage on all sequences in schema finance to service_role;
