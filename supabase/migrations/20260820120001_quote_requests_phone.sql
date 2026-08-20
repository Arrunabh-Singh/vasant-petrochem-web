-- The quote form asks for a phone / WhatsApp number (it is the field the
-- mobile design leads with, and for bulk enquiries it is how the desk
-- actually replies). Without a column the value was being dropped on insert.

alter table public.quote_requests add column if not exists phone text;

-- Match the length-cap style of quote_len_check (20260816120003).
alter table public.quote_requests drop constraint if exists quote_phone_check;
alter table public.quote_requests
  add constraint quote_phone_check check (phone is null or char_length(phone) <= 40);
