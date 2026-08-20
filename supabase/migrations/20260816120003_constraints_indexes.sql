-- audit.md M3: length caps + FK integrity. lead_status is already a
-- Postgres enum (see 20260816112241_create_quote_requests.sql), so the
-- status CHECK from M3's original SQL is already satisfied and omitted.

alter table public.quote_requests
  add constraint quote_len_check check (
    char_length(name) between 1 and 200
    and char_length(email) between 3 and 320
    and (message is null or char_length(message) <= 5000)
    and (company is null or char_length(company) <= 200)
    and (product_label is null or char_length(product_label) <= 200)
    and (quantity is null or char_length(quantity) <= 100)
    and (source_page is null or char_length(source_page) <= 200)
  );

alter table public.tds_requests
  add constraint tds_email_check check (char_length(email) between 3 and 320);

alter table public.tds_requests
  add constraint tds_product_fk foreign key (product_id) references public.products(id);

create index if not exists tds_requests_product_id_idx on public.tds_requests(product_id);

-- audit.md M6: unindexed FK on quote_requests.product_id, and the unused
-- status index (admin dashboard filters client-side, see
-- app/components/admin/LeadsTable.tsx -- it fetches all rows once and
-- filters in the browser, never `where status = ...`).
create index if not exists quote_requests_product_id_idx on public.quote_requests(product_id);
drop index if exists public.quote_requests_status_idx;
