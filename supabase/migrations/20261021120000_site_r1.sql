-- Release 1 of the new public site (site/, on Cloudflare Workers): what its
-- enquiry endpoints store, the tap counts behind ad measurement, and the live
-- offers board. ADR-0001 and ADR-0002; docs/adr.
--
-- Least privilege. The site's Worker holds only the publishable key, and it
-- never touches these tables. Every write goes through a SECURITY DEFINER
-- function that first checks the site token: a secret in Vault, which the
-- owner copies once into the Worker's SITE_TOKEN. Someone who finds the
-- publishable key still cannot skip the site's own checks (origin, timing,
-- Turnstile, schema), because the functions refuse calls without the token.
--
-- Purely additive. The current site keeps inserting through its anon policy
-- until the cutover; the cleanup PR after it drops that policy.
--
-- Function grants are revoked from anon and authenticated by name, not only
-- from PUBLIC: Supabase grants EXECUTE to those roles directly
-- (20260816120011_fix_function_default_privileges.sql).

-- 1. The site token --------------------------------------------------------

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'site-token:public-site',
  'Shared with the public site Worker (its SITE_TOKEN): proves a call came through the site''s own checks'
)
where not exists (select 1 from vault.secrets where name = 'site-token:public-site');

create or replace function public.site_token_ok(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_token, '') <> ''
     and p_token = (select decrypted_secret from vault.decrypted_secrets where name = 'site-token:public-site' limit 1)
$$;

revoke all on function public.site_token_ok(text) from public, anon, authenticated;

-- 2. What an enquiry from the new site carries --------------------------------

alter table public.quote_requests
  add column if not exists request_type     text,
  add column if not exists lines            jsonb,
  add column if not exists delivery_city    text,
  add column if not exists delivery_country text,
  add column if not exists delivery_port    text,
  add column if not exists required_by      date,
  add column if not exists offer_ref        uuid,
  add column if not exists utm_source       text,
  add column if not exists utm_medium       text,
  add column if not exists utm_campaign     text,
  add column if not exists utm_content      text,
  add column if not exists utm_term         text,
  add column if not exists landing_page     text,
  add column if not exists referrer         text;

comment on column public.quote_requests.lines is
  'The quote list: [{slug, name, code, qty, unit, pack, notes}], at most 20 products.';
comment on column public.quote_requests.offer_ref is
  'The live offer (market.offer) the buyer asked about, if any.';

alter table public.quote_requests drop constraint if exists quote_site_r1_check;
alter table public.quote_requests
  add constraint quote_site_r1_check check (
    (request_type is null or request_type in ('quote', 'sample', 'contract', 'source', 'document', 'supplier', 'general'))
    and (lines is null or (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 20 and octet_length(lines::text) <= 20000))
    and (delivery_city    is null or char_length(delivery_city)    <= 120)
    and (delivery_country is null or char_length(delivery_country) <= 60)
    and (delivery_port    is null or char_length(delivery_port)    <= 80)
    and (utm_source       is null or char_length(utm_source)       <= 120)
    and (utm_medium       is null or char_length(utm_medium)       <= 120)
    and (utm_campaign     is null or char_length(utm_campaign)     <= 120)
    and (utm_content      is null or char_length(utm_content)      <= 120)
    and (utm_term         is null or char_length(utm_term)         <= 120)
    and (landing_page     is null or char_length(landing_page)     <= 200)
    and (referrer         is null or char_length(referrer)         <= 120)
  );

alter table public.tds_requests
  add column if not exists product_slug text,
  add column if not exists ip_hash      text;

alter table public.tds_requests drop constraint if exists tds_site_r1_check;
alter table public.tds_requests
  add constraint tds_site_r1_check check (
    (product_slug is null or char_length(product_slug) <= 80)
    and (product_label is null or char_length(product_label) <= 200)
    and (ip_hash is null or char_length(ip_hash) <= 128)
  );

-- 3. The site's write functions -------------------------------------------------
-- The existing triggers still apply to every insert: the enquiry reference
-- (assign_enquiry_reference) and the rate limits (prevent_spam, keyed on
-- ip_hash). A rejected insert raises 'rate limit exceeded', which the site
-- turns into "try again later".

create or replace function public.submit_enquiry(p jsonb, token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref text;
  t   text := nullif(p->>'request_type', '');
begin
  if not public.site_token_ok(token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'invalid enquiry' using errcode = '22023';
  end if;

  insert into public.quote_requests (
    request_type, name, email, company, phone, message, lines, product_label, quantity,
    delivery_city, delivery_country, delivery_port, required_by, offer_ref,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page, referrer,
    source_page, ip_hash, user_agent
  ) values (
    t,
    p->>'name',
    p->>'email',
    nullif(p->>'company', ''),
    nullif(p->>'phone', ''),
    nullif(p->>'message', ''),
    case when jsonb_typeof(p->'lines') = 'array' and jsonb_array_length(p->'lines') > 0 then p->'lines' end,
    nullif(p->>'product_label', ''),
    nullif(p->>'quantity', ''),
    nullif(p->>'delivery_city', ''),
    nullif(p->>'delivery_country', ''),
    nullif(p->>'delivery_port', ''),
    nullif(p->>'required_by', '')::date,
    case when p->>'offer_ref' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (p->>'offer_ref')::uuid end,
    nullif(p->>'utm_source', ''),
    nullif(p->>'utm_medium', ''),
    nullif(p->>'utm_campaign', ''),
    nullif(p->>'utm_content', ''),
    nullif(p->>'utm_term', ''),
    nullif(p->>'landing_page', ''),
    nullif(p->>'referrer', ''),
    nullif(p->>'source_page', ''),
    nullif(p->>'ip_hash', ''),
    nullif(p->>'user_agent', '')
  )
  returning reference into ref;

  return ref;
end;
$$;

create or replace function public.log_tds_request(p jsonb, token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.site_token_ok(token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.tds_requests (email, product_slug, product_label, ip_hash)
  values (p->>'email', nullif(p->>'product_slug', ''), nullif(p->>'product_label', ''), nullif(p->>'ip_hash', ''));
end;
$$;

-- 4. Call, WhatsApp and email taps (VP-LEAD-007) --------------------------------
-- No personal data: the page, the campaign tags and a keyed hash of the
-- address (to limit abuse). Kept 13 months, then deleted by pg_cron.

create table if not exists public.click_events (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('tel', 'whatsapp', 'email')),
  page         text not null check (page ~ '^/' and char_length(page) <= 200),
  utm_source   text check (utm_source   is null or char_length(utm_source)   <= 120),
  utm_medium   text check (utm_medium   is null or char_length(utm_medium)   <= 120),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 120),
  utm_content  text check (utm_content  is null or char_length(utm_content)  <= 120),
  utm_term     text check (utm_term     is null or char_length(utm_term)     <= 120),
  landing_page text check (landing_page is null or char_length(landing_page) <= 200),
  referrer     text check (referrer     is null or char_length(referrer)     <= 120),
  ip_hash      text check (ip_hash      is null or char_length(ip_hash)      <= 128),
  created_at   timestamptz not null default now()
);

comment on table public.click_events is
  'Taps on call, WhatsApp and email links on the public site, with campaign tags. No personal data; 13-month retention.';

create index if not exists click_events_created_at_idx on public.click_events (created_at desc);
create index if not exists click_events_ip_hash_idx on public.click_events (ip_hash, created_at desc);

alter table public.click_events enable row level security;
revoke all on public.click_events from anon, authenticated;
grant select on public.click_events to authenticated;
drop policy if exists click_events_read on public.click_events;
create policy click_events_read on public.click_events
  for select to authenticated
  using (app.has_role(VARIADIC ARRAY['admin'::public.app_role, 'approver'::public.app_role]));

create or replace function public.log_click(p jsonb, token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  key text := nullif(p->>'ip_hash', '');
  -- 60 taps an hour from one address is far beyond a person; an unknown
  -- address shares one larger bucket rather than skipping the limit.
  cap constant int := case when key is null then 600 else 60 end;
begin
  if not public.site_token_ok(token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.click_events
       where ip_hash is not distinct from key and created_at > now() - interval '1 hour') >= cap then
    raise exception 'rate limit exceeded' using errcode = '53400';
  end if;
  insert into public.click_events (kind, page, utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page, referrer, ip_hash)
  values (
    p->>'kind', p->>'page',
    nullif(p->>'utm_source', ''), nullif(p->>'utm_medium', ''), nullif(p->>'utm_campaign', ''),
    nullif(p->>'utm_content', ''), nullif(p->>'utm_term', ''),
    nullif(p->>'landing_page', ''), nullif(p->>'referrer', ''), key
  );
end;
$$;

select cron.schedule('click-events-retention', '17 3 * * *', $$
  delete from public.click_events where created_at < now() - interval '13 months';
$$);

-- 5. The live offers board ---------------------------------------------------------
-- Lots the sales desk puts up for sale. Anyone may propose one (staff in the
-- hub, or an AI agent through the MCP tool propose_offer), but only a
-- different person can publish it: the approver is always the signed-in
-- user, set by the function, and the table refuses an approver who is also
-- the proposer. No grants on the table at all; staff and the site reach it
-- only through the functions below.

create table if not exists market.offer (
  id            uuid primary key default gen_random_uuid(),
  product_slug  text not null check (product_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(product_slug) <= 80),
  title         text not null check (char_length(title) between 3 and 120),
  quantity      numeric(12, 3) not null check (quantity > 0),
  uom           text not null check (uom in ('MT', 'kL', 'L', 'kg', 'drums', 'pails')),
  location      text not null check (char_length(location) between 2 and 120),
  basis         text not null check (char_length(basis) between 2 and 120),
  valid_until   date not null,
  notes         text check (notes is null or char_length(notes) <= 500),
  status        text not null default 'pending' check (status in ('pending', 'published', 'withdrawn')),
  proposed_by   text not null check (char_length(proposed_by) between 3 and 320),
  proposed_via  text not null default 'hub' check (proposed_via in ('hub', 'mcp')),
  approved_by   text,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint offer_four_eyes check (approved_by is null or lower(approved_by) <> lower(proposed_by)),
  constraint offer_published_is_approved check (status <> 'published' or (approved_by is not null and approved_at is not null))
);

comment on table market.offer is
  'The public site''s live offers board. Proposed by staff or an AI agent, published only by a different approver (four eyes).';

create index if not exists offer_status_valid_idx on market.offer (status, valid_until);

alter table market.offer enable row level security;
revoke all on market.offer from anon, authenticated;

-- What the public sees: published lots still valid today (India time).
create or replace function public.list_offers()
returns table (
  id uuid, product_slug text, title text, quantity numeric, uom text,
  location text, basis text, valid_until date, notes text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.product_slug, o.title, o.quantity, o.uom, o.location, o.basis, o.valid_until, o.notes
  from market.offer o
  where o.status = 'published'
    and o.valid_until >= (now() at time zone 'Asia/Kolkata')::date
  order by o.valid_until, o.created_at
  limit 50
$$;

-- One insert path for both proposers, so the checks cannot drift apart.
create or replace function public.offer_insert(p jsonb, p_by text, p_via text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'invalid offer' using errcode = '22023';
  end if;
  if (p->>'valid_until')::date < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'an offer must be valid today or later' using errcode = '22023';
  end if;
  insert into market.offer (product_slug, title, quantity, uom, location, basis, valid_until, notes, proposed_by, proposed_via)
  values (
    p->>'product_slug', p->>'title', (p->>'quantity')::numeric, p->>'uom', p->>'location', p->>'basis',
    (p->>'valid_until')::date, nullif(p->>'notes', ''), lower(p_by), p_via
  )
  returning id into new_id;
  perform public.log_event('offer_proposed', 'offer', new_id::text, jsonb_build_object('via', p_via), null, p, 'ok', null, p_by);
  return new_id;
end;
$$;

revoke all on function public.offer_insert(jsonb, text, text) from public, anon, authenticated;

-- Staff in the hub.
create or replace function public.offer_propose(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.has_role(VARIADIC ARRAY['admin'::public.app_role, 'approver'::public.app_role]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return public.offer_insert(p, app.current_email(), 'hub');
end;
$$;

create or replace function public.offer_review(p_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me  text := app.current_email();
  cur market.offer%rowtype;
begin
  if not app.has_role(VARIADIC ARRAY['admin'::public.app_role, 'approver'::public.app_role]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into cur from market.offer where id = p_id for update;
  if not found then
    raise exception 'offer not found' using errcode = 'P0002';
  end if;

  if p_action = 'publish' then
    if cur.status <> 'pending' then
      raise exception 'only a pending offer can be published' using errcode = '22023';
    end if;
    if lower(cur.proposed_by) = me then
      raise exception 'an offer must be published by someone other than its proposer' using errcode = '42501';
    end if;
    update market.offer set status = 'published', approved_by = me, approved_at = now(), updated_at = now() where id = p_id;
  elsif p_action = 'withdraw' then
    update market.offer set status = 'withdrawn', updated_at = now() where id = p_id;
  else
    raise exception 'unknown action' using errcode = '22023';
  end if;

  perform public.log_event('offer_' || case when p_action = 'publish' then 'published' else 'withdrawn' end,
    'offer', p_id::text, '{}'::jsonb, to_jsonb(cur), null, 'ok', null, null);
end;
$$;

create or replace function public.offers_for_review()
returns table (
  id uuid, product_slug text, title text, quantity numeric, uom text, location text, basis text,
  valid_until date, notes text, status text, proposed_by text, proposed_via text,
  approved_by text, approved_at timestamptz, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.has_role(VARIADIC ARRAY['admin'::public.app_role, 'approver'::public.app_role]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select o.id, o.product_slug, o.title, o.quantity, o.uom, o.location, o.basis, o.valid_until, o.notes,
           o.status, o.proposed_by, o.proposed_via, o.approved_by, o.approved_at, o.created_at
    from market.offer o
    where o.status <> 'withdrawn' or o.updated_at > now() - interval '30 days'
    order by (o.status = 'pending') desc, o.created_at desc
    limit 200;
end;
$$;

-- AI agents, through the MCP server (service role; the requester is the
-- human whose MCP token made the call, logged in ai_action_log).
create or replace function public.ai_propose_offer(p jsonb, p_requester_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(p_requester_email, '') !~ '^[^@\s]+@[^@\s]+$' then
    raise exception 'a requester is required' using errcode = '22023';
  end if;
  return public.offer_insert(p, p_requester_email, 'mcp');
end;
$$;

create or replace function public.ai_get_offers(p_limit int default 20)
returns table (
  id uuid, product_slug text, title text, quantity numeric, uom text, location text,
  basis text, valid_until date, status text, proposed_via text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.product_slug, o.title, o.quantity, o.uom, o.location, o.basis, o.valid_until, o.status, o.proposed_via, o.created_at
  from market.offer o
  where o.status <> 'withdrawn'
  order by o.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;

-- 6. Who may call what ---------------------------------------------------------

revoke all on function public.submit_enquiry(jsonb, text)  from public, anon, authenticated;
revoke all on function public.log_tds_request(jsonb, text) from public, anon, authenticated;
revoke all on function public.log_click(jsonb, text)       from public, anon, authenticated;
revoke all on function public.list_offers()                from public, anon, authenticated;
revoke all on function public.offer_propose(jsonb)         from public, anon, authenticated;
revoke all on function public.offer_review(uuid, text)     from public, anon, authenticated;
revoke all on function public.offers_for_review()          from public, anon, authenticated;
revoke all on function public.ai_propose_offer(jsonb, text) from public, anon, authenticated;
revoke all on function public.ai_get_offers(int)           from public, anon, authenticated;

-- The public site (publishable key = anon): its four calls, each gated by the site token or read-only.
grant execute on function public.submit_enquiry(jsonb, text)  to anon;
grant execute on function public.log_tds_request(jsonb, text) to anon;
grant execute on function public.log_click(jsonb, text)       to anon;
grant execute on function public.list_offers()                to anon, authenticated;
-- Staff in the hub (each function checks the role itself).
grant execute on function public.offer_propose(jsonb)         to authenticated;
grant execute on function public.offer_review(uuid, text)     to authenticated;
grant execute on function public.offers_for_review()          to authenticated;
-- The MCP server.
grant execute on function public.ai_propose_offer(jsonb, text) to service_role;
grant execute on function public.ai_get_offers(int)           to service_role;
