# Incident Response — "We got breached" 30-minute runbook

Source: `document-storage-hardening.md` §6, adapted to the tables and
admin pages this wave actually built. Whichever it is — a download you
can't explain, a phished Google account, a leaked URL, a public bucket
flag, a ransom note, an "AI said something it shouldn't" report — run
the same five phases. Assume the worst until proven otherwise.

## Phase 1 — Freeze (minutes 0–10)

| Action | Where |
|---|---|
| **Flip breach-mode on** | `/admin/security` → "Freeze everything". This alone blocks every other admin write in the app via `lib/rbac.ts`'s `requireAdmin()` check, and fires a critical alert through `lib/notify.ts` (Telegram/Resend if configured, otherwise the alert is at least logged and visible on the same page) |
| Revoke Supabase sessions | SQL: `delete from auth.sessions;` |
| Kill the Google session | Google account security → "Sign out all other devices"; if Workspace, admin console → force sign-out |
| Rotate the service-role key | Supabase dashboard → Project → Settings → API → rotate `service_role` (old key stops working immediately) — then update it in Vercel env vars and redeploy |
| Rotate any MCP tokens | `/admin/security` → revoke every live token in the MCP tokens list |
| Kill bucket `public` flags (belt & braces) | SQL: `update storage.buckets set public = false;` (the nightly `security-sweep-buckets` cron job would also catch this, but don't wait for 3am) |
| Isolate the office box / Tally machine | Physically unplug from the router, or disable its VPN/network connection |
| Record the moment | Note `T0` — every table below is timestamped against it. **Do not delete anything.** |

## Phase 2 — Assess (minutes 10–25)

1. `/admin/security`'s "Recent activity" panel — or directly:
   ```sql
   select * from public.audit_log where created_at >= '<T0>'::timestamptz - interval '14 days' order by id desc limit 500;
   ```
   Look for `download_ok` rows with unfamiliar actors, or a `download_denied`/`control_2fa_violation`-style surge (probing).
2. `select * from storage.objects where last_accessed_at >= '<T0>'::timestamptz;` per bucket — which objects were touched.
3. `select * from auth.audit_log_entries order by created_at desc limit 200;` — sign-in IPs, providers.
4. `/admin/security`'s AI trust panel — any `ai_action_log` rows with an unfamiliar `requester_email`, or a spike in `denied` outcomes.
5. Is Supabase PITR on (owner checklist #4)? If yes, note the safe restore point. If not, the newest usable backup is whatever the office box or GitHub Actions produced most recently — check `finance.etl_run_log` and the backup workflow's last successful run.
6. Classify severity: (a) a single document URL leaked → low-medium; (b) class-wide (public bucket, stolen admin session) → high; (c) a storage sync or DB dump was stolen → critical, involve counsel immediately.

## Phase 3 — Notify (minutes 25–40)

- **Customers** — if invoices/bills/COAs were exposed, they contain GSTIN, names, values; notify affected counterparties in writing, ideally through the CA.
- **GST/IT authorities** — no statutory duty to report document theft per se, but if filing data was accessed or could be tampered with, have the CA verify filings and involve the jurisdictional officer if tampering looks credible.
- **DPDP Act 2023** — customer and employee data (including masked Aadhaar) is in scope. Where the breach is likely to cause harm, the Data Fiduciary must notify the Data Protection Board and affected persons. Confirm the current form/timeline with counsel before touching the portal. This is exactly why the append-only `audit_log` matters — it's the proof of what was and wasn't accessed.
- **Insurers** — cyber policy if one exists.
- Not a press release. Affected parties + regulators, plus a written note for `docs/incidents/THREAT_LOG.md` and the family WhatsApp/Telegram.

## Phase 4 — Recover

1. Restore affected objects from the office-box/GitHub-Actions backups or a PITR point (once enabled) — use `document_versions`' copy-on-write paths so nothing overwrites evidence.
2. Re-key: create fresh `doc-key:*` secrets in Supabase Vault for any encrypted class that was exposed, re-encrypt affected documents, retire the old keys.
3. Re-provision: new `service_role` key (should already be done in Phase 1), new Google password + hardware-key 2FA, re-issue the office box's upload ticket and device tickets (old ones still work until their TTL — short TTLs make this cheap).
4. Clear breach-mode on `/admin/security` only after every step above is done, in order: storage → app → office box/ETL → MCP/AI layer, smoke-testing the download gate after each.

## Phase 5 — Post-mortem (within 7 days)

- Which threat scenario was it, and which two independent controls failed? (Design rule from `document-storage-hardening.md`: if only one control was protecting it, that is itself the finding.)
- Was `audit_log` complete for the window? Was `download_ok` written before bytes left the server in every case? Any gap = the log-before-issue ordering wasn't honored somewhere.
- Did the `security-sweep-buckets` cron job fire before the incident, and did anyone see the alert?
- Was the backup actually restorable? (An answer of "we didn't test it" is itself the finding — see owner checklist #9.)
- Update `docs/incidents/THREAT_LOG.md` with the incident, open follow-up issues for the gaps, schedule a re-test in 90 days.
