-- FEATURE_BACKLOG.md wave 2, A7/A8/A9/B6: one table, four features. A
-- licence, an insurance policy, a contract renewal, and an e-way bill are
-- all the same shape -- a dated obligation with an owner and a countdown.

create type public.compliance_kind as enum ('licence', 'insurance', 'contract', 'eway', 'registration');

create table public.compliance_items (
  id          uuid primary key default gen_random_uuid(),
  kind        public.compliance_kind not null,
  label       text not null,
  identifier  text,
  issued_on   date,
  expires_on  date not null,
  owner_email text not null,
  doc_id      uuid references public.documents(id) on delete set null,
  notes       text,
  status      text not null default 'active' check (status in ('active', 'renewed', 'lapsed', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index compliance_items_expires_idx on public.compliance_items (expires_on) where status = 'active';

create trigger compliance_items_set_updated_at
  before update on public.compliance_items
  for each row execute function public.set_updated_at();

create view public.compliance_due with (security_invoker = true) as
select *, (expires_on - current_date) as days_remaining
from public.compliance_items
where status = 'active'
order by expires_on asc;

alter table public.compliance_items enable row level security;

-- Licence/insurance/contract expiry is something the whole family
-- benefits from seeing ("a lapse = plant shutdown") -- read is open to
-- any active app_user; only admin/approver can create or edit entries.
create policy "authenticated can read compliance_items"
  on public.compliance_items for select
  to authenticated
  using (true);

create policy "admin approver can manage compliance_items"
  on public.compliance_items for all
  to authenticated
  using (app.has_role('admin', 'approver'))
  with check (app.has_role('admin', 'approver'));

grant select on public.compliance_items to authenticated;
grant insert, update, delete on public.compliance_items to authenticated;
grant select on public.compliance_due to authenticated;
