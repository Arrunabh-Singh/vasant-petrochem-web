-- VASANT_HUB_BLUEPRINT.md §3.5 + THREAT_MODEL.md C4: read-only by
-- default, no model-authored SQL, allowlisted parameterized tools on a
-- row-capped SELECT-only surface, actor identity pinned to the human who
-- asked, full audit including rejections.

create schema if not exists ai;
grant usage on schema ai to service_role;

-- Pre-aggregated, non-row-level views only — never raw finance/document
-- tables. A prompt injection that gets a tool called still can't walk
-- individual customer rows one at a time; each view is already the
-- summary shape the tool is allowed to answer with.
create view ai.v_receivables as
select l.name as party_name, sum(br.bill_amount - br.paid_amount) as outstanding, min(br.due_date) as earliest_due
from finance.bill_receivable br
join finance.ledger l on l.id = br.party_id
where br.status in ('open', 'partial')
group by l.name;

create view ai.v_ledger_aging as
select
  l.name as party_name,
  sum(case when current_date - br.due_date between 0 and 30 then br.bill_amount - br.paid_amount else 0 end) as bucket_0_30,
  sum(case when current_date - br.due_date between 31 and 60 then br.bill_amount - br.paid_amount else 0 end) as bucket_31_60,
  sum(case when current_date - br.due_date between 61 and 90 then br.bill_amount - br.paid_amount else 0 end) as bucket_61_90,
  sum(case when current_date - br.due_date > 90 then br.bill_amount - br.paid_amount else 0 end) as bucket_90_plus
from finance.bill_receivable br
join finance.ledger l on l.id = br.party_id
where br.status in ('open', 'partial')
group by l.name;

create view ai.v_item_stats as
select i.id as item_id, i.name as item_name, i.unit, coalesce(sum(inv.qty), 0) as current_stock
from finance.item i
left join inventory.inventory_level inv on inv.item_id = i.id
group by i.id, i.name, i.unit;

create view ai.v_gst_summary as
select period, gstin, sales_amt, tax_amt, purchases_amt, itc_amt, gstreturn_status
from finance.gst_summary;

-- Metadata only — class/name/status, never bytes, never a signed URL.
-- FEATURE_BACKLOG.md wave 2 C1 "AI answer citations": this is what lets
-- an AI answer point at a real document without ever handling its
-- content directly.
create view ai.v_document_index as
select id, doc_class, logical_name, status, created_at
from public.documents
where status in ('active', 'superseded');

-- hub_ai: nologin, exists only so a future direct-Postgres-connection MCP
-- path (decision 11) has somewhere to grant into without inventing a
-- password. This wave's actual MCP route goes through the RPC wrappers
-- below via service_role, same as every other cross-schema access this
-- wave (see 20260816120021's header comment for why).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'hub_ai') then
    create role hub_ai nologin;
  end if;
end $$;
grant usage on schema ai to hub_ai;
grant select on ai.v_receivables, ai.v_ledger_aging, ai.v_item_stats, ai.v_gst_summary, ai.v_document_index to hub_ai;

create or replace function public.ai_get_receivables(p_limit int default 20)
returns setof ai.v_receivables
language sql security definer set search_path = '' stable as $$
  select * from ai.v_receivables order by outstanding desc limit least(coalesce(p_limit, 20), 100)
$$;

create or replace function public.ai_get_ledger_aging(p_limit int default 20)
returns setof ai.v_ledger_aging
language sql security definer set search_path = '' stable as $$
  select * from ai.v_ledger_aging order by bucket_90_plus desc limit least(coalesce(p_limit, 20), 100)
$$;

create or replace function public.ai_get_item_stats(p_limit int default 20)
returns setof ai.v_item_stats
language sql security definer set search_path = '' stable as $$
  select * from ai.v_item_stats order by item_name limit least(coalesce(p_limit, 20), 100)
$$;

create or replace function public.ai_get_gst_summary(p_period text default null, p_limit int default 20)
returns setof ai.v_gst_summary
language sql security definer set search_path = '' stable as $$
  select * from ai.v_gst_summary
  where p_period is null or period = p_period
  order by period desc limit least(coalesce(p_limit, 20), 100)
$$;

create or replace function public.ai_get_document_index(p_doc_class text default null, p_limit int default 20)
returns setof ai.v_document_index
language sql security definer set search_path = '' stable as $$
  select * from ai.v_document_index
  where p_doc_class is null or doc_class::text = p_doc_class
  order by created_at desc limit least(coalesce(p_limit, 20), 100)
$$;

revoke execute on function public.ai_get_receivables(int) from public;
revoke execute on function public.ai_get_ledger_aging(int) from public;
revoke execute on function public.ai_get_item_stats(int) from public;
revoke execute on function public.ai_get_gst_summary(text, int) from public;
revoke execute on function public.ai_get_document_index(text, int) from public;
grant execute on function public.ai_get_receivables(int) to service_role;
grant execute on function public.ai_get_ledger_aging(int) to service_role;
grant execute on function public.ai_get_item_stats(int) to service_role;
grant execute on function public.ai_get_gst_summary(text, int) to service_role;
grant execute on function public.ai_get_document_index(text, int) to service_role;

-- Append-only, 7-year retention (matches audit_log's rationale) — every
-- call, allowed or rejected, so ai_action_log is a complete record of
-- "what the AI did, tried, and was refused."
create table public.ai_action_log (
  id              bigint generated always as identity primary key,
  mcp_token_id    uuid,
  requester_email text not null,
  tool_name       text not null,
  params          jsonb not null default '{}'::jsonb,
  status          text not null check (status in ('allowed', 'denied', 'executed', 'failed')),
  row_count       int,
  input_tokens    int,
  output_tokens   int,
  error           text,
  created_at      timestamptz not null default now()
);

create index ai_action_log_created_idx on public.ai_action_log (created_at desc);
create index ai_action_log_requester_idx on public.ai_action_log (requester_email);

create table public.mcp_tokens (
  id                   uuid primary key default gen_random_uuid(),
  token_hash           text not null unique,
  requester_email      text not null,
  scope                text not null default 'read-only',
  monthly_token_budget int not null default 200000 check (monthly_token_budget > 0),
  expires_at           timestamptz not null,
  revoked_at           timestamptz,
  created_at           timestamptz not null default now()
);

alter table public.ai_action_log enable row level security;
alter table public.mcp_tokens enable row level security;

create policy "admin approver can read ai_action_log"
  on public.ai_action_log for select
  to authenticated
  using (app.has_role('admin', 'approver'));

create policy "admin can manage mcp_tokens"
  on public.mcp_tokens for all
  to authenticated
  using (app.is_admin())
  with check (app.is_admin());

grant select on public.ai_action_log to authenticated;
grant select, insert, update, delete on public.mcp_tokens to authenticated;

create or replace function public.log_ai_action(
  p_mcp_token_id uuid,
  p_requester_email text,
  p_tool_name text,
  p_params jsonb,
  p_status text,
  p_row_count int default null,
  p_input_tokens int default null,
  p_output_tokens int default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('allowed', 'denied', 'executed', 'failed') then
    raise exception 'invalid status: %', p_status;
  end if;
  insert into public.ai_action_log
    (mcp_token_id, requester_email, tool_name, params, status, row_count, input_tokens, output_tokens, error)
  values
    (p_mcp_token_id, p_requester_email, p_tool_name, coalesce(p_params, '{}'::jsonb), p_status, p_row_count, p_input_tokens, p_output_tokens, p_error);
end;
$$;
revoke execute on function public.log_ai_action(uuid, text, text, jsonb, text, int, int, int, text) from public;
grant execute on function public.log_ai_action(uuid, text, text, jsonb, text, int, int, int, text) to service_role;

-- The month's token spend for a token, used to enforce
-- monthly_token_budget before executing the next tool call.
create or replace function public.ai_month_token_usage(p_mcp_token_id uuid)
returns bigint
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(sum(coalesce(input_tokens, 0) + coalesce(output_tokens, 0)), 0)
  from public.ai_action_log
  where mcp_token_id = p_mcp_token_id
    and created_at >= date_trunc('month', now())
$$;
revoke execute on function public.ai_month_token_usage(uuid) from public;
grant execute on function public.ai_month_token_usage(uuid) to service_role;
