create type public.lead_status as enum ('new', 'contacted', 'quoted', 'won', 'lost');

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  product_id uuid references public.products(id) on delete set null,
  product_label text,
  quantity text,
  message text,
  source_page text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.quote_requests enable row level security;

-- Anon may only ever insert. No anon select: a leaked publishable key must
-- never expose the customer list.
create policy "anon can submit quote requests"
  on public.quote_requests for insert
  to anon
  with check (true);

create policy "authenticated can read quote requests"
  on public.quote_requests for select
  to authenticated
  using (true);

create policy "authenticated can update quote requests"
  on public.quote_requests for update
  to authenticated
  using (true)
  with check (true);

create index quote_requests_created_at_idx on public.quote_requests (created_at desc);
create index quote_requests_status_idx on public.quote_requests (status);
