insert into storage.buckets (id, name, public)
values ('tds', 'tds', false);

-- Bucket is private; only authenticated (admin) can manage files.
-- Downloads are served exclusively via server-issued signed URLs after
-- email capture, never via direct anon access.
create policy "authenticated can manage tds files"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'tds')
  with check (bucket_id = 'tds');
