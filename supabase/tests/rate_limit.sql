-- VP-SEC-003 acceptance test for public.prevent_spam().
--
-- Self-contained: builds stub tables with just the columns the trigger reads,
-- applies the two migrations that define it, asserts, and ROLLS BACK. Run
-- against a scratch database, never production:
--
--   createdb scratch && psql -v ON_ERROR_STOP=1 -d scratch -f supabase/tests/rate_limit.sql
--
-- Prints "rate limit tests passed" or aborts on the first failed assertion.
\set ON_ERROR_STOP on
begin;

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null,
  created_at timestamptz not null default now()
);
create table public.tds_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);
\i supabase/migrations/20260816120004_rate_limit.sql
\i supabase/migrations/20261017120000_rate_limit_hardening.sql

-- true = accepted, false = rejected by the rate limit.
create function pg_temp.quote(p_ip text, p_email text) returns boolean language plpgsql as $$
begin
  insert into public.quote_requests (name, email, ip) values ('t', p_email, p_ip);
  return true;
exception when sqlstate '53400' then
  return false;
end $$;
create function pg_temp.tds(p_ip text, p_email text) returns boolean language plpgsql as $$
begin
  insert into public.tds_requests (email, ip) values (p_email, p_ip);
  return true;
exception when sqlstate '53400' then
  return false;
end $$;

do $$
declare i int; ok boolean;
begin
  -- 1. Eleven rapid submissions from one IP: ten accepted, the eleventh rejected.
  for i in 1..10 loop
    assert pg_temp.quote('203.0.113.7', 'a' || i || '@example.com'), 'submission ' || i || ' should be accepted';
  end loop;
  assert not pg_temp.quote('203.0.113.7', 'a11@example.com'), 'the 11th submission from one IP must be rejected';
  assert (select count(*) from public.quote_requests where ip = '203.0.113.7') = 10, 'a rejected insert must leave no row';

  -- 2. A different IP is unaffected.
  assert pg_temp.quote('203.0.113.8', 'b1@example.com'), 'another IP must not be limited';

  -- 3. Per-email cap (5/hour), across different IPs, case-insensitive.
  for i in 1..5 loop
    assert pg_temp.quote('198.51.100.' || i, case when i % 2 = 0 then 'VICTIM@Example.com' else 'victim@example.com' end),
      'email submission ' || i || ' should be accepted';
  end loop;
  assert not pg_temp.quote('198.51.100.99', 'Victim@EXAMPLE.com'), 'the 6th submission for one email must be rejected';

  -- 4. Unknown IP no longer bypasses the limit: it shares one bucket of 30.
  for i in 1..30 loop
    assert pg_temp.quote(null, 'n' || i || '@example.com'), 'unknown-IP submission ' || i || ' should be accepted';
  end loop;
  assert not pg_temp.quote(null, 'n31@example.com'), 'the 31st unknown-IP submission must be rejected';

  -- 5. Same rules on the TDS gate.
  for i in 1..10 loop
    assert pg_temp.tds('192.0.2.1', 't' || i || '@example.com'), 'tds ' || i || ' should be accepted';
  end loop;
  assert not pg_temp.tds('192.0.2.1', 't11@example.com'), 'the 11th TDS request from one IP must be rejected';
  for i in 1..5 loop
    assert pg_temp.tds('192.0.2.' || (10 + i), 'tdsvictim@example.com'), 'tds email ' || i || ' should be accepted';
  end loop;
  assert not pg_temp.tds('192.0.2.99', 'TDSVICTIM@example.com'), 'the 6th TDS request for one email must be rejected';

  -- 6. Old rows fall out of the one-hour window.
  update public.quote_requests set created_at = now() - interval '2 hours' where ip = '203.0.113.7';
  assert pg_temp.quote('203.0.113.7', 'fresh@example.com'), 'submissions older than an hour must not count';
end $$;

\echo rate limit tests passed
rollback;
