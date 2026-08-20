create table public.tds_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_id uuid references public.products(id) on delete set null,
  product_label text,
  created_at timestamptz not null default now()
);

alter table public.tds_requests enable row level security;

create policy "anon can log tds requests"
  on public.tds_requests for insert
  to anon
  with check (true);

create policy "authenticated can read tds requests"
  on public.tds_requests for select
  to authenticated
  using (true);

create index tds_requests_created_at_idx on public.tds_requests (created_at desc);
