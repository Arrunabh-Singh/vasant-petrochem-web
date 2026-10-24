-- Acceptance for 20261021120000_site_r1.sql: the site's functions refuse calls
-- without the site token, the limits hold, offers need a second person to go
-- live, and only the intended roles can call each function.
--
-- Scratch database only. Supabase's own schemas (vault, auth, cron, app) are
-- replaced by minimal stand-ins below.
--   createdb scratch && psql -v ON_ERROR_STOP=1 -d scratch -f supabase/tests/site_r1.sql
\set ON_ERROR_STOP on
begin;

-- Stand-ins for what Supabase provides ------------------------------------------
do $$ begin
  create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin; exception when duplicate_object then null; end $$;

create schema extensions;
create extension if not exists pgcrypto schema extensions;
create schema vault;
create table vault.secrets (name text primary key, secret text not null, description text);
create function vault.create_secret(p_secret text, p_name text, p_description text) returns uuid
  language sql as $$ insert into vault.secrets values (p_name, p_secret, p_description); select gen_random_uuid() $$;
create view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;

create schema auth;
create function auth.email() returns text language sql stable as $$ select nullif(current_setting('test.email', true), '') $$;
create schema cron;
create table cron.jobs (name text primary key, schedule text, command text);
create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint
  language sql as $$ insert into cron.jobs values (p_name, p_schedule, p_command) on conflict (name) do update set schedule = excluded.schedule, command = excluded.command; select 1::bigint $$;

create type public.app_role as enum ('admin', 'approver', 'uploader', 'reader', 'family-viewer', 'ca');
create table public.app_users (email text primary key, role public.app_role not null, is_active boolean not null default true);
create schema app;
create function app.current_email() returns text language sql stable as $$ select lower(coalesce(auth.email(), '')) $$;
create function app.has_role(variadic roles public.app_role[]) returns boolean language sql stable as $$
  select exists (select 1 from public.app_users u where u.email = app.current_email() and u.is_active and u.role = any(roles))
$$;
create table public.audit_log (id bigint generated always as identity, actor_email text, action text, object_id text, meta jsonb);
create function public.log_event(p_action text, p_object_type text, p_object_id text default null, p_meta jsonb default '{}',
  p_before jsonb default null, p_after jsonb default null, p_outcome text default 'ok', p_reason text default null, p_actor_email text default null)
  returns void language sql as $$
  insert into public.audit_log (actor_email, action, object_id, meta)
  values (coalesce(nullif(app.current_email(), ''), p_actor_email, 'service'), p_action, p_object_id, p_meta) $$;
create schema market;

-- The tables as production has them (the columns these functions write) ---------
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, company text, product_label text, quantity text,
  message text, source_page text, phone text,
  created_at timestamptz not null default now()
);
create table public.tds_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null, product_label text,
  created_at timestamptz not null default now()
);
\i supabase/migrations/20260816120004_rate_limit.sql
\i supabase/migrations/20261017120000_rate_limit_hardening.sql
\i supabase/migrations/20261017130000_enquiry_capture.sql
\i supabase/migrations/20261017140000_enquiry_reference.sql
\i supabase/migrations/20261021120000_site_r1.sql
\i supabase/migrations/20261023180000_site_token_hash.sql

-- Helpers: run a statement, report its SQLSTATE (or 'ok') ---------------------------
create function pg_temp.try(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlstate;
end $$;
create function pg_temp.as_user(p_email text) returns void language sql as $$ select set_config('test.email', coalesce(p_email, ''), true) $$;

do $$
declare
  tok text := (select secret from vault.secrets where name = 'site-token:public-site');
  ref text;
  i int;
  a uuid;
  b uuid;
  too_many jsonb := (select jsonb_agg(jsonb_build_object('slug', 'base-oil-sn150', 'qty', '1')) from generate_series(1, 21));
begin
  assert tok ~ '^[0-9a-f]{64}$', 'the migration creates a 32-byte site token';
  -- Vault keeps only the token's SHA-256 (20261023180000). Until it does, even the right token is refused.
  assert pg_temp.try(format($q$select public.submit_enquiry('{"name":"A","email":"a@example.com"}', %L)$q$, tok)) = '42501', 'no stored hash: refused';
  perform vault.create_secret(encode(extensions.digest(tok, 'sha256'), 'hex'), 'site-token-sha256:public-site', 'test');

  -- Enquiries --------------------------------------------------------------------
  assert pg_temp.try($q$select public.submit_enquiry('{"name":"A","email":"a@example.com"}', '')$q$) = '42501', 'no token: refused';
  assert pg_temp.try($q$select public.submit_enquiry('{"name":"A","email":"a@example.com"}', 'not-the-token')$q$) = '42501', 'wrong token: refused';

  ref := public.submit_enquiry(jsonb_build_object(
    'request_type', 'quote', 'name', 'Asha', 'email', 'asha@example.com', 'company', 'Acme',
    'lines', '[{"slug":"base-oil-sn150","name":"Base Oil SN150","code":"SN-150","qty":"20","unit":"MT","pack":"","notes":""}]'::jsonb,
    'product_label', 'Base Oil SN150 (SN-150)', 'quantity', '20 MT', 'delivery_city', 'Pune, Maharashtra',
    'required_by', to_char(now() + interval '10 days', 'YYYY-MM-DD'), 'utm_source', 'linkedin', 'utm_campaign', 'base-oils',
    'landing_page', '/products/base-oil-sn150', 'source_page', '/quote', 'ip_hash', 'h1', 'offer_ref', ''), tok);
  assert ref ~ '^VP-ENQ-[0-9]{6}-[0-9]{4}$', 'a valid enquiry returns its reference';
  assert (select request_type = 'quote' and jsonb_array_length(lines) = 1 and utm_source = 'linkedin' and offer_ref is null
          and delivery_city = 'Pune, Maharashtra' and company = 'Acme'
          from public.quote_requests where reference = ref), 'the new fields are stored';

  assert pg_temp.try(format($q$select public.submit_enquiry(%L, %L)$q$,
    jsonb_build_object('name', 'B', 'email', 'b@example.com', 'request_type', 'bribe'), tok)) = '23514', 'unknown request type: refused';
  assert pg_temp.try(format($q$select public.submit_enquiry(%L, %L)$q$,
    jsonb_build_object('name', 'B', 'email', 'b@example.com', 'lines', too_many), tok)) = '23514', 'more than 20 products: refused';
  assert pg_temp.try(format($q$select public.submit_enquiry(%L, %L)$q$,
    jsonb_build_object('name', 'B', 'email', 'b@example.com', 'utm_source', repeat('x', 121)), tok)) = '23514', 'over-long campaign tag: refused';

  -- The rate limit still applies, keyed on the address hash.
  for i in 1..9 loop
    perform public.submit_enquiry(jsonb_build_object('name', 'C', 'email', 'c' || i || '@example.com', 'ip_hash', 'h1'), tok);
  end loop;
  assert pg_temp.try(format($q$select public.submit_enquiry(%L, %L)$q$,
    jsonb_build_object('name', 'C', 'email', 'c11@example.com', 'ip_hash', 'h1'), tok)) = '53400', '11th enquiry from one address in an hour: refused';

  -- TDS requests -----------------------------------------------------------------
  assert pg_temp.try($q$select public.log_tds_request('{"email":"t@example.com"}', '')$q$) = '42501', 'TDS log without token: refused';
  perform public.log_tds_request(jsonb_build_object('email', 't@example.com', 'product_slug', 'base-oil-sn150', 'ip_hash', 'h2'), tok);
  assert (select count(*) from public.tds_requests where product_slug = 'base-oil-sn150' and ip_hash = 'h2') = 1, 'TDS request stored';

  -- Taps -------------------------------------------------------------------------
  assert pg_temp.try($q$select public.log_click('{"kind":"tel","page":"/"}', '')$q$) = '42501', 'tap without token: refused';
  assert pg_temp.try(format($q$select public.log_click(%L, %L)$q$, '{"kind":"fax","page":"/"}', tok)) = '23514', 'unknown tap kind: refused';
  assert pg_temp.try(format($q$select public.log_click(%L, %L)$q$, '{"kind":"tel","page":"https://evil.example"}', tok)) = '23514', 'page must be a site path';
  for i in 1..60 loop
    perform public.log_click(jsonb_build_object('kind', 'whatsapp', 'page', '/products/base-oil-sn150', 'ip_hash', 'h3'), tok);
  end loop;
  assert pg_temp.try(format($q$select public.log_click(%L, %L)$q$,
    jsonb_build_object('kind', 'whatsapp', 'page', '/', 'ip_hash', 'h3'), tok)) = '53400', '61st tap in an hour from one address: refused';
  assert exists (select 1 from cron.jobs where name = 'click-events-retention' and command like '%13 months%'), 'taps are deleted after 13 months';

  -- Offers: four eyes --------------------------------------------------------------
  insert into public.app_users values ('ravi@vasant.example', 'approver'), ('meera@vasant.example', 'admin'), ('guest@vasant.example', 'reader');

  perform pg_temp.as_user('guest@vasant.example');
  assert pg_temp.try($q$select public.offer_propose('{"product_slug":"base-oil-sn500","title":"20 MT SN500","quantity":20,"uom":"MT","location":"Mangaliya","basis":"Ex-works","valid_until":"2099-01-01"}')$q$) = '42501',
    'a reader cannot propose';

  perform pg_temp.as_user('ravi@vasant.example');
  a := public.offer_propose(jsonb_build_object('product_slug', 'base-oil-sn500', 'title', '20 MT SN500 in drums', 'quantity', 20, 'uom', 'MT',
    'location', 'Mangaliya, Indore', 'basis', 'Ex-works', 'valid_until', to_char(now() + interval '5 days', 'YYYY-MM-DD')));
  assert (select status = 'pending' and proposed_by = 'ravi@vasant.example' from market.offer where id = a), 'a proposal starts pending';
  assert (select count(*) from public.list_offers()) = 0, 'a pending offer is not public';
  assert pg_temp.try(format($q$select public.offer_review(%L, 'publish')$q$, a)) = '42501', 'the proposer cannot publish their own offer';

  perform pg_temp.as_user('meera@vasant.example');
  perform public.offer_review(a, 'publish');
  assert (select status = 'published' and approved_by = 'meera@vasant.example' and approved_at is not null from market.offer where id = a),
    'a second person publishes it, recorded as the approver';
  assert (select count(*) from public.list_offers()) = 1, 'a published, valid offer is public';
  assert pg_temp.try(format($q$update market.offer set approved_by = 'ravi@vasant.example' where id = %L$q$, a)) = '23514',
    'the table itself refuses an approver who proposed the offer';

  -- An AI agent's proposal still needs a person, and not the person who asked for it.
  b := public.ai_propose_offer(jsonb_build_object('product_slug', 'paving-bitumen-vg30', 'title', '50 MT VG30', 'quantity', 50, 'uom', 'MT',
    'location', 'Mangaliya, Indore', 'basis', 'Ex-works', 'valid_until', to_char(now() + interval '3 days', 'YYYY-MM-DD')), 'meera@vasant.example');
  assert (select proposed_via = 'mcp' and status = 'pending' from market.offer where id = b), 'MCP proposals are pending and marked';
  assert pg_temp.try(format($q$select public.offer_review(%L, 'publish')$q$, b)) = '42501', 'the requester cannot publish what their agent proposed';
  assert pg_temp.try($q$select public.ai_propose_offer('{"product_slug":"x"}', '')$q$) = '22023', 'an MCP proposal needs a requester';

  -- Expired and withdrawn lots are hidden.
  update market.offer set valid_until = (now() at time zone 'Asia/Kolkata')::date - 1 where id = a;
  assert (select count(*) from public.list_offers()) = 0, 'an expired offer is not public';
  assert pg_temp.try($q$select public.offer_propose('{"product_slug":"base-oil-sn500","title":"Old lot","quantity":1,"uom":"MT","location":"Indore","basis":"Ex-works","valid_until":"2000-01-01"}')$q$) = '22023',
    'an offer cannot be proposed already expired';
  perform public.offer_review(b, 'withdraw');
  assert (select status from market.offer where id = b) = 'withdrawn', 'an offer can be withdrawn';
  assert (select count(*) from public.audit_log where action in ('offer_proposed', 'offer_published', 'offer_withdrawn')) = 4, 'every offer step is audited';

  -- Who may call what ----------------------------------------------------------------
  assert has_function_privilege('anon', 'public.submit_enquiry(jsonb, text)', 'execute'), 'the site can submit enquiries';
  assert has_function_privilege('anon', 'public.list_offers()', 'execute'), 'the site can list offers';
  assert not has_function_privilege('anon', 'public.offer_review(uuid, text)', 'execute'), 'anon cannot review offers';
  assert not has_function_privilege('anon', 'public.offers_for_review()', 'execute'), 'anon cannot see offers under review';
  assert not has_function_privilege('authenticated', 'public.ai_propose_offer(jsonb, text)', 'execute'), 'only the MCP server proposes for agents';
  assert not has_function_privilege('anon', 'public.site_token_ok(text)', 'execute'), 'the token check is internal';
  assert not has_function_privilege('authenticated', 'public.offer_insert(jsonb, text, text)', 'execute'), 'the shared insert is internal';
  assert not has_table_privilege('anon', 'public.click_events', 'select'), 'anon cannot read taps';
  assert not has_table_privilege('authenticated', 'market.offer', 'update'), 'staff cannot edit offers around the functions';
end $$;

\echo site r1 tests passed
rollback;
