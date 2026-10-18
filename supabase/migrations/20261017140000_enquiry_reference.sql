-- VP-LEAD-004: enquiry reference numbers, VP-ENQ-YYYYMM-####.
--
-- Assigned in the database so they are unique and gap-free per month even
-- with concurrent submissions: the per-month counter is bumped with an upsert,
-- which takes a row lock held until the inserting transaction ends. If the
-- insert later fails (e.g. the rate-limit trigger rejects it) the counter
-- change rolls back with it, so rejected submissions do not burn numbers.
-- The month is the Indian calendar month (the business and its buyers are in
-- IST), not UTC.

create table if not exists public.enquiry_counters (
  period     text primary key check (period ~ '^[0-9]{6}$'),
  last_value int  not null check (last_value > 0)
);

-- Deny-by-default: no policies. Only the SECURITY DEFINER trigger touches it.
alter table public.enquiry_counters enable row level security;
revoke all on public.enquiry_counters from anon, authenticated;

create or replace function public.assign_enquiry_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p   text := to_char(now() at time zone 'Asia/Kolkata', 'YYYYMM');
  seq int;
begin
  insert into public.enquiry_counters as c (period, last_value)
  values (p, 1)
  on conflict (period) do update set last_value = c.last_value + 1
  returning last_value into seq;

  -- Always overwrite: a submitter must not be able to choose their own reference.
  new.reference := 'VP-ENQ-' || p || '-' || lpad(seq::text, 4, '0');
  return new;
end;
$$;

revoke execute on function public.assign_enquiry_reference() from public;

-- Trigger names sort before quote_requests_rate_limit, so a rejected
-- submission is rolled back together with its counter increment.
create or replace trigger quote_requests_assign_reference
  before insert on public.quote_requests
  for each row execute function public.assign_enquiry_reference();
