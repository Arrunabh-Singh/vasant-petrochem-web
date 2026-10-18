-- VP-LEAD-001: server-side enquiry capture.
--
-- quote_requests already holds name/company/email/phone/product/quantity/
-- message/source_page/created_at (the page the form was submitted from IS the
-- `source`). This adds the rest of the MNC schema as nullable columns, so old
-- and new application code can both run against it:
--   reference   - VP-ENQ-YYYYMM-#### (assigned by VP-LEAD-004)
--   ip_hash     - HMAC of the visitor address; replaces storing the raw `ip`
--   user_agent
-- Purely additive: apply BEFORE deploying the application change.

alter table public.quote_requests
  add column if not exists reference  text,
  add column if not exists ip_hash    text,
  add column if not exists user_agent text;

alter table public.quote_requests drop constraint if exists quote_capture_len_check;
alter table public.quote_requests
  add constraint quote_capture_len_check check (
    (reference  is null or char_length(reference)  <= 40)
    and (ip_hash    is null or char_length(ip_hash)    <= 128)
    and (user_agent is null or char_length(user_agent) <= 400)
  );

create unique index if not exists quote_requests_reference_key
  on public.quote_requests (reference) where reference is not null;

-- prevent_spam() (20261017120000) keyed on the raw `ip` column. Key on the
-- hash when the application stored one, else the raw address, so limits keep
-- working through the changeover. to_jsonb(t) returns NULL (not an error) for
-- a column the table lacks, so one function serves quote_requests (has
-- ip_hash) and tds_requests (does not).
-- ponytail: evaluating to_jsonb per row is a seq scan of the last hour's rows;
-- fine at enquiry volumes, add an expression index if these tables grow.
create or replace function public.prevent_spam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ip_key      text := coalesce(to_jsonb(new)->>'ip_hash', to_jsonb(new)->>'ip');
  ip_count    int;
  email_count int;
  ip_cap      constant int := case when ip_key is null then 30 else 10 end;
  email_cap   constant int := 5;
begin
  execute format(
    'select count(*) from public.%I t
      where coalesce(to_jsonb(t)->>''ip_hash'', to_jsonb(t)->>''ip'') is not distinct from $1
        and t.created_at > now() - interval ''1 hour''',
    tg_table_name
  ) into ip_count using ip_key;

  if ip_count >= ip_cap then
    raise exception 'rate limit exceeded' using errcode = '53400';
  end if;

  execute format(
    'select count(*) from public.%I where lower(email) = lower($1) and created_at > now() - interval ''1 hour''',
    tg_table_name
  ) into email_count using new.email;

  if email_count >= email_cap then
    raise exception 'rate limit exceeded' using errcode = '53400';
  end if;

  return new;
end;
$$;
