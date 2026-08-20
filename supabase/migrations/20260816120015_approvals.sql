-- FEATURE_BACKLOG.md wave 2, A4 maker-checker: "one enters, another
-- authorizes; no self-approval over threshold; immutable trail." The
-- 2-person rule is enforced in the database (a trigger), not just in the
-- UI, so it can't be bypassed by a future code change or a direct API call.

create type public.approval_kind as enum ('expense', 'purchase_order', 'payout', 'other');

create table public.approval_requests (
  id           uuid primary key default gen_random_uuid(),
  kind         public.approval_kind not null,
  subject      text not null,
  amount       numeric,
  requested_by text not null,
  approved_by  text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason       text,
  doc_id       uuid references public.documents(id) on delete set null,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz
);

create index approval_requests_status_idx on public.approval_requests (status);

create or replace function public.enforce_maker_checker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending' then
    -- approved_by is derived from the caller's own session, never trusted
    -- from client input -- otherwise any admin/approver could set it to
    -- someone else's email and forge who actually decided the request.
    new.approved_by := app.current_email();
    if new.approved_by = '' or new.approved_by = new.requested_by then
      raise exception 'maker-checker violation: requester cannot decide their own request';
    end if;
    new.decided_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_maker_checker() from public;

create trigger approval_requests_maker_checker
  before update on public.approval_requests
  for each row execute function public.enforce_maker_checker();

alter table public.approval_requests enable row level security;

create policy "requester or admin/approver can read approval_requests"
  on public.approval_requests for select
  to authenticated
  using (requested_by = app.current_email() or app.has_role('admin', 'approver'));

create policy "authenticated can request approval"
  on public.approval_requests for insert
  to authenticated
  with check (requested_by = app.current_email());

create policy "admin approver can decide approval_requests"
  on public.approval_requests for update
  to authenticated
  using (app.has_role('admin', 'approver'))
  with check (app.has_role('admin', 'approver'));

grant select, insert, update on public.approval_requests to authenticated;

-- F3 breach-mode / F4 holiday-mode already exist (public.system_flags,
-- pulled forward to Phase 2 because lib/rbac.ts reads it from the start).
-- Nothing further to create here.
