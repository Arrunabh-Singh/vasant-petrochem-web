create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  code text not null,
  description text not null,
  specs jsonb not null default '[]'::jsonb,
  applications text[] not null default '{}',
  industries text[] not null default '{}',
  packaging text,
  tds_path text,
  display_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "public can read published products"
  on public.products for select
  to anon, authenticated
  using (published = true);

create policy "authenticated can manage products"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

create index products_display_order_idx on public.products (display_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
