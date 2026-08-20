-- audit.md H3: no rate limiting on public form submissions. One trigger
-- function shared by both tables (parameterised by TG_TABLE_NAME) instead
-- of two near-identical copies.

alter table public.quote_requests add column if not exists ip text;
alter table public.tds_requests add column if not exists ip text;

create or replace function public.prevent_spam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count int;
begin
  if new.ip is null then
    return new;
  end if;

  execute format(
    'select count(*) from public.%I where ip = $1 and created_at > now() - interval ''1 hour''',
    tg_table_name
  ) into recent_count using new.ip;

  if recent_count >= 10 then
    raise exception 'rate limit exceeded';
  end if;

  return new;
end;
$$;

create trigger quote_requests_rate_limit
  before insert on public.quote_requests
  for each row execute function public.prevent_spam();

create trigger tds_requests_rate_limit
  before insert on public.tds_requests
  for each row execute function public.prevent_spam();
