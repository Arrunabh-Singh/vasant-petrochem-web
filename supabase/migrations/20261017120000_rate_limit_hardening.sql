-- VP-SEC-003: rate limiting on the public write endpoints.
--
-- Replaces public.prevent_spam() (20260816120004). Three problems with it:
--   1. `if new.ip is null then return new` -- a request with no resolvable
--      address skipped the limit entirely. Now an unknown address shares one
--      (larger) bucket instead of being exempt.
--   2. No per-email cap. Once the enquiry form sends an acknowledgement email
--      (VP-LEAD-002), an uncapped form lets anyone use us to mail a victim.
--   3. The application keyed on x-forwarded-for, which behind Cloudflare is a
--      Cloudflare edge address, so unrelated visitors shared one bucket. The
--      application now reads cf-connecting-ip (lib/client-ip.ts); this
--      function is unchanged in what `ip` means.
--
-- CREATE OR REPLACE keeps the existing ACL (EXECUTE already revoked from
-- PUBLIC in 20260816120012), and the triggers keep pointing at the same name.
-- Rejections surface to the app as an error whose message is
-- 'rate limit exceeded', which the server actions log and turn into a
-- friendly "try again later".

create or replace function public.prevent_spam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ip_count    int;
  email_count int;
  ip_cap      constant int := case when new.ip is null then 30 else 10 end;
  email_cap   constant int := 5;
begin
  execute format(
    'select count(*) from public.%I where ip is not distinct from $1 and created_at > now() - interval ''1 hour''',
    tg_table_name
  ) into ip_count using new.ip;

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
