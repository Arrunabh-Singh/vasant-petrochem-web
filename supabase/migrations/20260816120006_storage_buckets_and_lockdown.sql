-- document-storage-hardening.md §2.1 + §2.3: one bucket per document
-- class (a leaked key or a flipped `public` flag now costs one class, not
-- the whole archive), and NO direct client access to storage.objects at
-- all — every read/write goes through app/api/documents/* (service role),
-- which does its own per-document authorization. This supersedes
-- audit.md C1's "admin can manage tds files" policy (decision 3): admin
-- TDS uploads move to the vault route in Phase 4.

update storage.buckets
set file_size_limit = 15728640, -- 15 MB
    allowed_mime_types = array['application/pdf']
where id = 'tds';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('purchase-bills', 'purchase-bills', false, 26214400, array['application/pdf','image/jpeg','image/png','image/tiff']),
  ('sales-bills',    'sales-bills',    false, 26214400, array['application/pdf','image/jpeg','image/png','image/tiff']),
  ('gst',            'gst',            false, 26214400, array['application/pdf','image/jpeg','image/png']),
  ('contracts',      'contracts',      false, 26214400, array['application/pdf']),
  ('coa',            'coa',            false, 26214400, array['application/pdf','image/tiff']),
  ('hr',             'hr',             false, 15728640, array['application/pdf','image/jpeg','image/png']),
  ('bank',           'bank',           false, 52428800, array['application/pdf','image/tiff']),
  ('quarantine',     'quarantine',     false, 52428800, array['application/pdf','image/jpeg','image/png','image/tiff']),
  -- Phase 6: Tally office-box uploads land here already age-encrypted, so
  -- the MIME type is opaque ciphertext, not the original XML.
  ('etl-inbox',      'etl-inbox',      false, 26214400, array['application/octet-stream'])
on conflict (id) do nothing;

drop policy if exists "authenticated can manage tds files" on storage.objects;

-- Deny-by-default at the DB layer. Real access happens via
-- app/api/documents/[docId]/download and /upload (service role), which
-- perform their own per-document authorization. Nothing here is the
-- control — the route handler is — but this removes "guess a path
-- directly against Supabase" as an attack surface entirely.
create policy "no direct reads" on storage.objects for select using (false);
create policy "no direct inserts" on storage.objects for insert with check (false);
create policy "no direct updates" on storage.objects for update using (false);
create policy "no direct deletes" on storage.objects for delete using (false);

-- Guardrail against a bucket accidentally flipped to public (T3 in
-- document-storage-hardening.md): Phase 8's cron sweep inserts here, and
-- Phase 5's security page surfaces it.
create table public.security_alerts (
  id         bigint generated always as identity primary key,
  kind       text not null,
  detail     text not null,
  severity   text not null default 'warning' check (severity in ('info','warning','critical')),
  created_at timestamptz not null default now(),
  acked_at   timestamptz,
  acked_by   text
);

alter table public.security_alerts enable row level security;

create policy "admin can manage security_alerts"
  on public.security_alerts for all
  to authenticated
  using (app.is_admin())
  with check (app.is_admin());

grant select, insert, update on public.security_alerts to authenticated;
