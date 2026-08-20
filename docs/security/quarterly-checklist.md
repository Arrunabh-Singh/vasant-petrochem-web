# Quarterly Pentest-Lite Checklist

Source: `THREAT_MODEL.md` §5, one afternoon, owner + AI assistant. Write
what you find to `docs/incidents/THREAT_LOG.md` with the date, even when
everything checks out clean — "checked, nothing found" is itself the
record that the review happened.

- [ ] **Workspace/Google**: 2SV/hardware key still enforced on the admin
      account; login audit reviewed for unfamiliar devices/geos; no
      shared accounts (`/admin/security` → "Who has access" — every row
      should be one real person, one real Google account)
- [ ] **Supabase advisors clean**: run the security advisor
      (`get_advisors` via the Supabase MCP, or Dashboard → Advisors);
      the only expected finding is "leaked password protection" if
      owner checklist #5 is still open, and four `SECURITY DEFINER`
      functions intentionally exposed to `authenticated`
      (`acl_grant`, `acl_revoke`, `log_event`, `retention_for` — each
      has its own internal authorization check; see the migration
      comments in `supabase/migrations/2026081612000{7,8}_*.sql`)
- [ ] **RLS reviewed line-by-line** on any table touched since the last
      review; no `TRUNCATE`/`DELETE` granted to `anon`/`authenticated`
      beyond what each table's own migration explicitly documents
- [ ] **PITR verified** (owner checklist #4) — if still on Free, confirm
      the office-box + GitHub Actions backup chain both ran successfully
      in the last 24h
- [ ] **Secrets**: service-role key rotation is due at 90 days — check
      the date of the last rotation; MCP tokens all expired or revoked
      (they're 15-minute TTL, so this should always be clean); office-box
      upload ticket + device tickets not close to their expiry;
      `git log --all -p | grep -i "service_role\|SUPABASE_SERVICE"` for
      anything that shouldn't be there
- [ ] **Repo/CI**: branch protection + Dependabot + CodeQL still active;
      `package-lock.json` committed and current; no secrets in recent
      commits (GitHub's own secret scanning should already have caught
      this, but check manually too)
- [ ] **Storage**: all 10 buckets private (`select id, public from
      storage.buckets` — every row `public = false`); the
      `security-sweep-buckets` cron job's last few runs show 0 alerts.
      Known, accepted platform constraint (2026-08-16 finding — see
      `docs/incidents/THREAT_LOG.md`): `storage.buckets`,
      `storage.buckets_analytics`, and `storage.objects` are owned by
      Supabase's own `supabase_storage_admin` role and ship with
      DELETE/TRUNCATE granted to `anon`/`authenticated` — the `postgres`
      role this project runs migrations as has no privilege to revoke
      those grants (confirmed: not a member of `supabase_storage_admin`).
      Assessed as low real-world risk because `anon`/`authenticated`
      cannot log in directly (`rolcanlogin = false`) and PostgREST never
      issues a raw `TRUNCATE` through its REST surface — reaching this
      would require an already-catastrophic direct Postgres credential
      leak, not just an RLS/policy mistake. If Supabase ever exposes a
      way to adjust this (a project setting, a support request), revisit.
- [ ] **AI layer**: review the quarter's `ai_action_log` on
      `/admin/security` — zero `denied` entries for reasons other than
      an expected budget/scope check; run one manual prompt-injection
      test (ask Claude to summarize a document whose `logical_name`
      contains an embedded instruction, confirm it's treated as inert
      data, not followed)
- [ ] **Telemetry/control** (once hardware exists): device tickets
      rotated on schedule; `control.control_request` has zero rows where
      `approved_by = requested_by` (the DB trigger should make this
      structurally impossible, but verify); watchdog test — kill the
      gateway's network link, confirm actuators de-energize
- [ ] **Office/Tally machine**: egress allowlist intact; BitLocker/
      VeraCrypt still enabled; last backup restore drill date (owner
      checklist #9) isn't more than 90 days old
- [ ] **Compliance cockpit** (`/admin/compliance`): no lapsed items with
      no owner assigned; every item due within 30 days has a named owner
      who knows about it

**Escalate to a professional immediately if any of these is true:**
1. A credential was actually *used* by an unauthorized party.
2. A real secret entered a chat, commit, or third-party tool.
3. Any unexplained control-plane or safety event — actuation without
   approval, a watchdog failure, `control.control_request` showing a
   status change nobody can account for.
4. Party count with GSTIN/PAN crosses ~1,000, or an auditor/insurer/
   regulator formally asks for a security review.
5. Any breach attempt gets past 2SV, or an incident you can't fully
   explain within a day of triage.
