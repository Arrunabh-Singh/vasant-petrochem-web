-- Pulled forward from Phase 5 (F3 breach-mode / F4 holiday-mode) because
-- lib/rbac.ts's requireAdmin() reads this table on every admin write from
-- Phase 2 onward. Phase 5 adds the admin toggle UI and the holiday-mode
-- scheduler; this migration only creates the table so nothing 404s in the
-- meantime.
create table public.system_flags (
  key        text primary key,
  value      boolean not null default false,
  note       text,
  set_by     text,
  updated_at timestamptz not null default now()
);

insert into public.system_flags (key, value) values
  ('breach_mode', false),
  ('holiday_mode', false)
on conflict (key) do nothing;

alter table public.system_flags enable row level security;

create policy "authenticated can read system_flags"
  on public.system_flags for select
  to authenticated
  using (true);

create policy "admin can manage system_flags"
  on public.system_flags for all
  to authenticated
  using (app.is_admin())
  with check (app.is_admin());

grant select on public.system_flags to authenticated;
grant insert, update, delete on public.system_flags to authenticated;

create trigger system_flags_set_updated_at
  before update on public.system_flags
  for each row execute function public.set_updated_at();
