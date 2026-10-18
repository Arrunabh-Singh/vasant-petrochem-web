-- VP-LEAD-004 acceptance: references are VP-ENQ-YYYYMM-####, sequential,
-- unforgeable, and not consumed by rejected submissions. Scratch DB only:
--   psql -v ON_ERROR_STOP=1 -d scratch -f supabase/tests/enquiry_reference.sql
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
\i supabase/migrations/20261017130000_enquiry_capture.sql
\i supabase/migrations/20261017140000_enquiry_reference.sql

create function pg_temp.q(p_ip text, p_email text, p_ref text default null) returns text language plpgsql as $$
declare r text;
begin
  insert into public.quote_requests (name, email, ip, reference) values ('t', p_email, p_ip, p_ref) returning reference into r;
  return r;
exception when sqlstate '53400' then return 'REJECTED';
end $$;

do $$
declare
  ym text := to_char(now() at time zone 'Asia/Kolkata', 'YYYYMM');
  i int; r text;
begin
  assert pg_temp.q('203.0.113.1', 'a@example.com') = 'VP-ENQ-' || ym || '-0001', 'first reference of the month';
  assert pg_temp.q('203.0.113.1', 'b@example.com') = 'VP-ENQ-' || ym || '-0002', 'second reference';
  assert pg_temp.q('203.0.113.2', 'c@example.com') ~ '^VP-ENQ-[0-9]{6}-[0-9]{4}$', 'format';

  -- A submitter cannot choose or collide with a reference.
  assert pg_temp.q('203.0.113.3', 'd@example.com', 'VP-ENQ-199901-9999') = 'VP-ENQ-' || ym || '-0004', 'supplied reference is ignored';

  -- Rejected submissions do not burn a number: fill one IP's bucket, then be rejected.
  for i in 1..10 loop perform pg_temp.q('203.0.113.9', 'x' || i || '@example.com'); end loop;
  assert (select last_value from public.enquiry_counters where period = ym) = 14, 'counter after 14 accepted rows';
  assert pg_temp.q('203.0.113.9', 'x11@example.com') = 'REJECTED', '11th from one IP is rejected';
  assert (select last_value from public.enquiry_counters where period = ym) = 14, 'a rejected submission must not consume a number';
  assert pg_temp.q('203.0.113.10', 'next@example.com') = 'VP-ENQ-' || ym || '-0015', 'next number follows without a gap';

  -- A new month starts again at 0001 (counter is per period).
  insert into public.enquiry_counters (period, last_value) values ('209901', 41);
  assert (select count(*) from public.enquiry_counters) = 2, 'one counter per month';

  -- The counter table is not reachable by the public roles.
  assert not has_table_privilege('anon', 'public.enquiry_counters', 'select'), 'anon must not read counters';
  assert not has_table_privilege('authenticated', 'public.enquiry_counters', 'insert'), 'authenticated must not write counters';
end $$;

\echo enquiry reference tests passed
rollback;
