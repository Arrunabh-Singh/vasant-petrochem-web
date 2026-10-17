-- Document vault OCR search: the column the shipped feature already depends on.
--
-- CLAUDE.md §7 records this migration as delivered on 2026-08-28, and
-- lib/documents.ts writes documents.extracted_text on every upload while
-- lib/admin.ts selects and ilike-searches it — but the migration itself was
-- never committed. Against a database built from migrations alone (the
-- reconstitution path in the root CLAUDE.md §8) public.documents has no such
-- column, so PostgREST rejects the whole select: /admin/documents fails to
-- load and every upload's finalising update errors after the file is already
-- in storage. Recreated here under the filename the docs already cite.
--
-- Idempotent, per the project's migration convention.

alter table public.documents
  add column if not exists extracted_text text;

comment on column public.documents.extracted_text is
  'Best-effort PDF text extracted at upload time by unpdf (lib/documents.ts). '
  'Null means not a PDF, extraction failed, or the document predates OCR — '
  'never an error condition; extraction must never block an upload.';

-- Cheap projection for the vault list, which needs to render an "OCR" badge
-- but not the text itself. Without it lib/admin.ts had to select the full
-- extracted_text of every document just to test it for null, pulling the
-- entire OCR corpus over the wire on each page load.
alter table public.documents
  add column if not exists has_ocr boolean
  generated always as (extracted_text is not null) stored;

comment on column public.documents.has_ocr is
  'Generated. Lets the vault list show the OCR badge without transferring the text.';

-- Search is `ilike '%term%'` on both fields — a leading wildcard, so btree is
-- useless and Postgres would seq-scan and detoast every document body. pg_trgm
-- is available on all Supabase projects and lives in the extensions schema by
-- convention.
create extension if not exists pg_trgm with schema extensions;

create index if not exists documents_extracted_text_trgm
  on public.documents using gin (extracted_text extensions.gin_trgm_ops);

create index if not exists documents_logical_name_trgm
  on public.documents using gin (logical_name extensions.gin_trgm_ops);

-- No new policy: extracted_text and has_ocr inherit the existing
-- row-level ACL on public.documents ("visibility = acl match or class acl
-- match or admin/approver"), and every read path uses the caller's session
-- client, so a user can only ever search text on rows they can already see.
