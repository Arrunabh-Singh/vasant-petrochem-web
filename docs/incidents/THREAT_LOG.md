# Threat Log

Dated entries only — one per quarterly review (`docs/security/quarterly-checklist.md`)
or actual incident (`docs/runbooks/incident-response.md`'s post-mortem step).
"Checked, nothing found" is a valid, worthwhile entry.

Log started: 2026-08-16 (security-hardening wave — see `audit.md`,
`docs/THREAT_MODEL.md`, `docs/document-storage-hardening.md`).

<!-- Add entries below, most recent first. Format:

## YYYY-MM-DD — <one-line summary>

**Type:** quarterly review | incident
**Found:** ...
**Action taken:** ...
**Follow-up:** ...

-->

## 2026-08-16 — Final-verification sweep of the security-hardening wave

**Type:** implementation-time review (functions as the first quarterly-style pass)

**Found:**
1. Three distinct Supabase/Postgres default-privilege behaviors silently
   over-granted new tables and functions to `anon`/`authenticated`
   during the wave itself (Supabase's default ACL for tables, the same
   default ACL for functions, and vanilla Postgres's implicit
   `GRANT EXECUTE ... TO PUBLIC` on new functions). Caught via
   `get_advisors(type: "security")` mid-wave — one instance
   (`public.vault_key_for`, which returns raw document-encryption keys)
   was briefly callable by `anon` before the fix landed. Full writeup:
   the memory note `supabase_default_privilege_traps.md`.
2. `storage.buckets`, `storage.buckets_analytics`, and `storage.objects`
   — Supabase's own tables, not this project's — hold DELETE/TRUNCATE
   grants for `anon`/`authenticated` that the `postgres` role cannot
   revoke (not a member of the owning `supabase_storage_admin` role).
   Assessed and accepted as low risk — see
   `docs/security/quarterly-checklist.md`'s Storage item for the reasoning.

**Action taken:** Item 1 fixed same-session via
`20260816120001`, `20260816120011`, and `20260816120012`. Item 2 is not
fixable from SQL at this privilege level; documented instead.

**Follow-up:** Re-run `get_advisors` after every future migration batch,
not just at the end of a wave — item 1 would have shipped to production
undetected otherwise. Revisit item 2 if Supabase ever exposes a
project-level control for it.
