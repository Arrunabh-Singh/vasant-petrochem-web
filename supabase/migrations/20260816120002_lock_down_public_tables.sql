-- audit.md C1 + C3: the original three tables were created before the
-- default-privilege fix (previous migration), so their existing anon/
-- authenticated grants must be revoked explicitly -- ALTER DEFAULT
-- PRIVILEGES only affects tables created after it runs, not these three.

-- ---------------------------------------------------------------------
-- products: public reads published rows; admin manages everything.
-- ---------------------------------------------------------------------
drop policy if exists "authenticated can manage products" on public.products;
drop policy if exists "public can read published products" on public.products;

create policy "anyone can read published products"
  on public.products for select
  using (published = true);

create policy "admin can manage products"
  on public.products for all
  to authenticated
  using (app.is_admin())
  with check (app.is_admin());

revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- ---------------------------------------------------------------------
-- quote_requests: anon can insert (the public quote form); only admin
-- reads/updates -- customer PII must never be readable by a throwaway
-- Supabase signup session.
-- ---------------------------------------------------------------------
drop policy if exists "anon can submit quote requests" on public.quote_requests;
drop policy if exists "authenticated can read quote requests" on public.quote_requests;
drop policy if exists "authenticated can update quote requests" on public.quote_requests;

create policy "anon can submit quote requests"
  on public.quote_requests for insert
  to anon
  with check (true);

create policy "admin can read quote requests"
  on public.quote_requests for select
  to authenticated
  using (app.is_admin());

create policy "admin can update quote requests"
  on public.quote_requests for update
  to authenticated
  using (app.is_admin())
  with check (app.is_admin());

revoke all on public.quote_requests from anon, authenticated;
grant insert on public.quote_requests to anon;
grant select, update on public.quote_requests to authenticated;

-- ---------------------------------------------------------------------
-- tds_requests: anon can log a request; only admin reads visitor emails.
-- ---------------------------------------------------------------------
drop policy if exists "anon can log tds requests" on public.tds_requests;
drop policy if exists "authenticated can read tds requests" on public.tds_requests;

create policy "anon can log tds requests"
  on public.tds_requests for insert
  to anon
  with check (true);

create policy "admin can read tds requests"
  on public.tds_requests for select
  to authenticated
  using (app.is_admin());

revoke all on public.tds_requests from anon, authenticated;
grant insert on public.tds_requests to anon;
grant select on public.tds_requests to authenticated;

-- Sequences: none of the three tables use serial/identity columns (all
-- PKs are gen_random_uuid()), but revoke defensively per audit.md C3.
revoke all on all sequences in schema public from anon, authenticated;
