# Owner Checklist

Everything in this file is a console click, a DNS record, a piece of
hardware, or a value only a human with account access can supply — none
of it can be done from code. Grouped by urgency, not by which doc raised
it originally.

## Do before anything else touches production

1. **Make the GitHub repo private**, then rotate any key that ever
   touched it while it was public (`audit.md` C2):
   ```bash
   gh repo edit Arrunabh-Singh/vasant-petrochem-web --visibility private
   ```
   Do this **before** adding any of the GitHub Actions secrets below —
   secrets on a public repo are a much bigger blast radius.

2. **Set `SUPABASE_SERVICE_ROLE_KEY`** in Vercel's environment variables
   and in your own `.env.local` for local dev. This is the single
   biggest blocker right now: the TDS download gate, the entire document
   vault (upload/download), telemetry ingest, the control-plane pull/ack
   routes, and the MCP server all use the service-role client and throw
   without this key. Get it from Supabase Dashboard → Project Settings →
   API → `service_role` secret. (`audit.md` I-24 — this was already
   blank before this wave; it blocks noticeably more now that the vault
   exists.)

3. **Google 2-Step Verification**, hardware key preferred, on the admin
   Google account (`audit.md` H1). This is the account that can log into
   `/admin` — compromise of it is compromise of everything.

## Before the first real document/bill/bank statement is uploaded

4. **Enable Supabase Pro + PITR.** Free has no automatic backups and no
   point-in-time recovery — the nightly `pg_dump` (GitHub Actions +
   office-box `backup.sh`) is the only safety net until this is on
   (`document-storage-hardening.md` §7).
5. **Supabase Auth settings**: enable leaked-password protection, disable
   email/password signup (Auth → Providers → Email) since admins
   authenticate via Google only. This is the one remaining item the
   Supabase security advisor still flags — everything else it would
   normally catch was fixed in migrations.

## Set up the automated backup + keepalive chain

6. Generate the backup keypair **once**, somewhere secure, not on any
   machine that stays online: `age-keygen -o vasant-hub-backup-key.txt`.
   The **public** key goes into two places (GitHub Actions secret
   `AGE_PUBLIC_KEY`, and the office box's `.env`); the **private** key
   goes in the company bank locker or an equivalent offline location —
   never in git, never on an internet-connected machine.
7. Add GitHub repo secrets so `.github/workflows/backup.yml` stops
   no-op'ing: `SUPABASE_DB_URL` (Dashboard → Settings → Database →
   connection string) and `AGE_PUBLIC_KEY`. This workflow also serves as
   the automated anti-idle keepalive (Free pauses a project after 7 days
   with no activity).
8. Set up the office box per `tools/office-box/README.md` — the
   always-on machine that replaces "mom's laptop runs a task at 11pm."
   It runs the Tally pull, the backup script, and its own keepalive ping.
9. **Quarterly restore drill.** A backup that's never been restored is a
   hypothesis, not a backup — decrypt one `.sql.age` file and actually
   restore it into a scratch database. Put a recurring reminder
   somewhere durable (the security page, a calendar entry — this repo
   can't remind you on its own).

## Security hygiene (do these, then repeat quarterly)

10. GitHub: branch protection on `main` (require PR + review), enable
    Dependabot alerts + auto-updates, enable CodeQL default setup,
    require signed commits (`audit.md` C6, I-20).
11. DNS: publish `v=spf1 -all` on `vasantpetrochem.com` (or
    `include:_spf.google.com ~all` once Workspace is adopted), tighten
    DMARC to `p=reject`, repoint `rua=` off the third-party mailbox it
    currently points at (`audit.md` C5).
12. Run `docs/security/quarterly-checklist.md` every quarter.

## Vendor accounts to create when ready (nothing breaks without them)

13. **Telegram bot** (primary alert channel) + **Resend account**
    (fallback, 100/day cap) — set `TELEGRAM_BOT_TOKEN`,
    `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`. Until these
    are set, alerts land as `security_alerts` rows (visible on
    `/admin/security`) and console logs only — nothing crashes.
14. **`CRON_SECRET`** in Vercel, matching Vercel's own convention, so
    `/api/cron/daily-digest` only responds to Vercel Cron. Optional —
    the route works without it, just less strictly gated.

## Answer before Tally/IoT/control work goes further

15. Blueprint §9: confirm Tally version (TDL add-ons need 4.0+), the
    sensor priority list (tank levels first), which 2 non-critical
    pumps are in scope for the control-plane dry run, a monthly cloud
    budget ceiling, and the WhatsApp/Telegram number alerts should reach.
16. **Validate `tools/office-box/tally-pull.mjs` and `tools/tdl/vasant-export.txt`
    against a real Tally Prime instance.** Both were written against
    Tally's documented XML/TDL export format without a real Tally
    install to test against (this repo was built on macOS, where Tally
    doesn't run) — everything else in the wave is verified, this one
    piece genuinely needs real Tally to finish. See
    `tools/office-box/README.md`'s setup steps.
17. Laptop hardening for the Tally machine: VeraCrypt on the Tally data
    folder (Windows Home has no BitLocker), a non-admin daily-use
    account, daily NAS copy of Tally's own backup.

## If something goes wrong

18. Run `docs/runbooks/incident-response.md` — the 30-minute "we got
    breached" playbook. It also covers what to do the moment before
    you're sure it's real (freeze first, investigate after).
