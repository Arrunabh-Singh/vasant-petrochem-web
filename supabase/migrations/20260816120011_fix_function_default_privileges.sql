-- URGENT correction. The Phase 1 default-privilege fix
-- (20260816120001_identity_and_rbac.sql) covered tables and sequences but
-- missed functions — Supabase's project template also auto-grants EXECUTE
-- on every new public-schema function to anon/authenticated/service_role.
-- Worse, every `revoke all on function X from public` written since then
-- was a no-op against this: `public` is the pseudo-role, and the default
-- ACL grants EXECUTE directly to `anon`/`authenticated` by name, which
-- `revoke ... from public` does not touch.
--
-- Confirmed live and critical: public.vault_key_for(text) — which returns
-- the raw AES-256-GCM key for any document class with no internal auth
-- check at all — was executable by `anon`. Any unauthenticated visitor
-- could have called /rest/v1/rpc/vault_key_for with {"p_class":"bank"}
-- and received the encryption key for the bank document class. Fixing
-- the default (so this can't recur) and explicitly revoking from every
-- function created so far, by role name, not by the PUBLIC pseudo-role.

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- Trigger-only functions: no external caller should ever invoke these
-- directly via /rest/v1/rpc/*.
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.prevent_spam() from anon, authenticated;

-- Utility/audit functions: harmless to authenticated, but anon (an
-- unauthenticated visitor) has no legitimate reason to call any of them.
revoke execute on function public.retention_for(public.doc_class, int) from anon;
revoke execute on function public.log_event(text, text, text, jsonb, jsonb, jsonb, text, text, text) from anon;
revoke execute on function public.acl_grant(uuid, text, public.acl_level) from anon;
revoke execute on function public.acl_revoke(uuid, text) from anon;

-- The critical one: service_role only, no exceptions. The internal query
-- has no authorization check of its own — the grant IS the control.
revoke execute on function public.vault_key_for(text) from anon, authenticated;
