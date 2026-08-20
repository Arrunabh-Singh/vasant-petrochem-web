-- prevent_spam and set_updated_at predate the habit (established from
-- document_vault.sql onward) of explicitly revoking from PUBLIC on every
-- new function. Postgres's CREATE FUNCTION implicitly grants EXECUTE to
-- PUBLIC unless revoked -- a third and distinct default-privilege
-- surprise from the two already fixed in this session (Supabase's
-- default ACL for tables and for functions, both grant directly to named
-- roles; this one is vanilla Postgres granting to the PUBLIC pseudo-role).
-- Trigger firing does not require the DML role to hold EXECUTE on the
-- trigger function, so this is safe to revoke without touching the
-- rate-limit or updated_at behavior (verified live: anon insert into
-- tds_requests still fires prevent_spam correctly after this revoke).
revoke execute on function public.prevent_spam() from public;
revoke execute on function public.set_updated_at() from public;
