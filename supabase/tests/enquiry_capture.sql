-- VP-LEAD-001: the capture migration is additive and the rate limit follows
-- ip_hash (falling back to the raw ip) on quote_requests, ip on tds_requests.
-- Scratch database only; rolls back:
--   psql -v ON_ERROR_STOP=1 -d scratch -f supabase/tests/enquiry_capture.sql
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
-- A pre-existing row from before the migration must survive it untouched.
\i supabase/migrations/20260816120004_rate_limit.sql
insert into public.quote_requests (name, email, ip) values ('old', 'old@example.com', '198.18.0.1');
\i supabase/migrations/20261017120000_rate_limit_hardening.sql
\i supabase/migrations/20261017130000_enquiry_capture.sql

create function pg_temp.q(p_ip text, p_hash text, p_email text) returns boolean language plpgsql as $$
begin
  insert into public.quote_requests (name, email, ip, ip_hash) values ('t', p_email, p_ip, p_hash);
  return true;
exception when sqlstate '53400' then return false;
end $$;
create function pg_temp.t(p_ip text, p_email text) returns boolean language plpgsql as $$
begin
  insert into public.tds_requests (email, ip) values (p_email, p_ip);
  return true;
exception when sqlstate '53400' then return false;
end $$;

do $$
declare i int;
begin
  assert (select count(*) from public.quote_requests where email = 'old@example.com' and reference is null and ip_hash is null) = 1,
    'existing rows survive the migration with NULL in the new columns';

  -- Rate limit keys on ip_hash when present; the raw ip is not stored alongside it.
  for i in 1..10 loop
    assert pg_temp.q(null, 'hash-A', 'h' || i || '@example.com'), 'hash submission ' || i;
  end loop;
  assert not pg_temp.q(null, 'hash-A', 'h11@example.com'), '11th submission with one ip_hash must be rejected';
  assert pg_temp.q(null, 'hash-B', 'other@example.com'), 'a different ip_hash is unaffected';

  -- Application not yet storing hashes (no service key): raw ip still limits.
  for i in 1..10 loop
    assert pg_temp.q('203.0.113.50', null, 'r' || i || '@example.com'), 'raw submission ' || i;
  end loop;
  assert not pg_temp.q('203.0.113.50', null, 'r11@example.com'), '11th submission with one raw ip must be rejected';

  -- An ip_hash row and a raw-ip row from the same person are different keys by design.
  assert pg_temp.q('203.0.113.50', 'hash-C', 'mixed@example.com'), 'hash wins over raw ip when both are present';

  -- tds_requests has no ip_hash column and keeps working.
  for i in 1..10 loop
    assert pg_temp.t('192.0.2.77', 'td' || i || '@example.com'), 'tds ' || i;
  end loop;
  assert not pg_temp.t('192.0.2.77', 'td11@example.com'), '11th TDS request must be rejected';

  -- Constraints.
  begin
    insert into public.quote_requests (name, email, reference) values ('t', 'c1@example.com', repeat('x', 41));
    assert false, 'over-long reference must be rejected';
  exception when check_violation then null; end;
  begin
    insert into public.quote_requests (name, email, reference) values ('t', 'c2@example.com', 'VP-ENQ-202610-0001');
    insert into public.quote_requests (name, email, reference) values ('t', 'c3@example.com', 'VP-ENQ-202610-0001');
    assert false, 'duplicate reference must be rejected';
  exception when unique_violation then null; end;
end $$;

\echo enquiry capture tests passed
rollback;
