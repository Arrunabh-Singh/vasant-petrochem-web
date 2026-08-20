-- Decision 3 completion: storage.objects is now deny-all (see
-- 20260816120006), so the direct `supabase.storage.from('tds').upload()`
-- session-client call in the pre-wave app/actions/products.ts no longer
-- works. TDS becomes a normal vault document class instead of a bespoke
-- path column. Safe to drop-and-replace outright: zero existing rows
-- have ever had tds_path set (verified live before this migration).
alter table public.products
  drop column tds_path,
  add column tds_document_id uuid references public.documents(id) on delete set null;
