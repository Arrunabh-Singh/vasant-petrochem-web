-- VASANT_HUB_BLUEPRINT.md §2.2 (inventory/batches) + §2.3 (production runs).

create schema if not exists inventory;
grant usage on schema inventory to authenticated, service_role;
create schema if not exists production;
grant usage on schema production to authenticated, service_role;

create table inventory.godown (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  location text,
  type     text not null default 'factory' check (type in ('factory', 'office', 'store'))
);

create table inventory.batch (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references finance.item(id),
  batch_no   text not null,
  mfg_date   date,
  exp_date   date,
  qty_in     numeric not null default 0,
  qty_avail  numeric not null default 0,
  godown_id  uuid references inventory.godown(id),
  quality_ref text,
  unique (item_id, batch_no)
);

create table inventory.stock_movement (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references finance.item(id),
  batch_id   uuid references inventory.batch(id),
  direction  text not null check (direction in ('in', 'out')),
  qty        numeric not null,
  unit       text,
  ref_type   text not null check (ref_type in ('voucher', 'manual')),
  ref_id     uuid,
  done_by    text not null,
  created_at timestamptz not null default now()
);

-- Trigger-maintained per blueprint §2.2. Kept intentionally simple (no
-- godown-level netting beyond the moved batch) -- correct for the single-
-- site v1 this schema serves; revisit if a second site is ever added.
-- item_id/batch_id/godown_id form the natural key, but batch_id/godown_id
-- are nullable, and a primary key constraint can't take expressions
-- (only bare columns) -- so the technical PK is a surrogate id, and the
-- real uniqueness constraint is the expression index below, which
-- ON CONFLICT then targets directly.
create table inventory.inventory_level (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references finance.item(id),
  batch_id     uuid references inventory.batch(id),
  godown_id    uuid references inventory.godown(id),
  qty          numeric not null default 0,
  last_updated timestamptz not null default now()
);

create unique index inventory_level_natural_key_idx on inventory.inventory_level (
  item_id,
  coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(godown_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create or replace function inventory.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta numeric := case when new.direction = 'in' then new.qty else -new.qty end;
begin
  insert into inventory.inventory_level (item_id, batch_id, godown_id, qty, last_updated)
  values (new.item_id, new.batch_id, null, delta, now())
  on conflict (item_id, (coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid)), (coalesce(godown_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do update set qty = inventory.inventory_level.qty + delta, last_updated = now();
  return new;
end;
$$;
revoke execute on function inventory.apply_stock_movement() from public;

create trigger stock_movement_apply
  after insert on inventory.stock_movement
  for each row execute function inventory.apply_stock_movement();

create table production.run_recipe (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  item_id     uuid references finance.item(id),
  steps       jsonb not null default '[]'::jsonb, -- [{step_name, target_temp, target_pressure, alarms}]
  created_at  timestamptz not null default now()
);

create table production.production_run (
  id           uuid primary key default gen_random_uuid(),
  run_no       text not null unique,
  item_id      uuid references finance.item(id),
  batch_id     uuid references inventory.batch(id),
  recipe_id    uuid references production.run_recipe(id),
  start_at     timestamptz,
  end_at       timestamptz,
  planned_qty  numeric,
  actual_qty   numeric,
  yield_pct    numeric generated always as (
    case when planned_qty is not null and planned_qty > 0 and actual_qty is not null
      then round((actual_qty / planned_qty) * 100, 2)
      else null end
  ) stored,
  status       text not null default 'planned' check (status in ('planned', 'running', 'completed', 'aborted')),
  created_at   timestamptz not null default now()
);

create table production.production_step (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references production.production_run(id) on delete cascade,
  step_name  text not null,
  start_at   timestamptz,
  end_at     timestamptz,
  params     jsonb not null default '{}'::jsonb,
  status     text not null default 'pending' check (status in ('pending', 'running', 'done', 'aborted'))
);

alter table inventory.godown enable row level security;
alter table inventory.batch enable row level security;
alter table inventory.stock_movement enable row level security;
alter table inventory.inventory_level enable row level security;
alter table production.run_recipe enable row level security;
alter table production.production_run enable row level security;
alter table production.production_step enable row level security;

-- Inventory/production is plant-ops visibility, not finance-grade
-- sensitive -- open to any active app_user to read (blueprint §2.5:
-- "ops: full inventory view"), write restricted to admin/approver.
create policy "authenticated can read godown" on inventory.godown for select to authenticated using (true);
create policy "admin approver can manage godown" on inventory.godown for all to authenticated using (app.has_role('admin','approver')) with check (app.has_role('admin','approver'));

create policy "authenticated can read batch" on inventory.batch for select to authenticated using (true);
create policy "admin approver can manage batch" on inventory.batch for all to authenticated using (app.has_role('admin','approver')) with check (app.has_role('admin','approver'));

create policy "authenticated can read stock_movement" on inventory.stock_movement for select to authenticated using (true);
create policy "admin approver can manage stock_movement" on inventory.stock_movement for all to authenticated using (app.has_role('admin','approver')) with check (app.has_role('admin','approver'));

create policy "authenticated can read inventory_level" on inventory.inventory_level for select to authenticated using (true);

create policy "authenticated can read run_recipe" on production.run_recipe for select to authenticated using (true);
create policy "admin approver can manage run_recipe" on production.run_recipe for all to authenticated using (app.has_role('admin','approver')) with check (app.has_role('admin','approver'));

create policy "authenticated can read production_run" on production.production_run for select to authenticated using (true);
create policy "admin approver can manage production_run" on production.production_run for all to authenticated using (app.has_role('admin','approver')) with check (app.has_role('admin','approver'));

create policy "authenticated can read production_step" on production.production_step for select to authenticated using (true);
create policy "admin approver can manage production_step" on production.production_step for all to authenticated using (app.has_role('admin','approver')) with check (app.has_role('admin','approver'));

grant select on all tables in schema inventory to authenticated;
grant all on all tables in schema inventory to service_role;
grant select on all tables in schema production to authenticated;
grant all on all tables in schema production to service_role;
