# Office box setup

This is the always-on machine (repurposed PC or Raspberry Pi, ₹0–7k)
that replaces "mom's laptop runs a task at 11pm" — the failure mode the
infra review flagged as the #1 risk (laptop sleep, Windows Update
reboots, someone using Tally mid-copy). This box just needs to be on and
online; it never needs anyone at the keyboard.

## What it does

- **Tally pull** (`tally-pull.mjs`, every 30 min): polls Tally Prime's
  server-mode HTTP interface for a delta export, encrypts it, uploads it
  to the hub. Queues locally if the hub is unreachable and flushes the
  queue on the next successful run.
- **Backup** (`backup.sh`, daily 02:30): `pg_dump` → `age`-encrypt → NAS.
  Supabase Free has no automatic backups — this *is* the backup.
- **Keepalive** (`keepalive.sh`, daily): one cheap read so Supabase
  Free's 7-day idle pause never triggers.

## Prerequisites

- Node.js 20.6+ (for native `--env-file` support), `age`, `rclone`,
  `pg_dump` (from `postgresql-client`).
- Tally Prime running in **server mode** with the HTTP interface enabled
  on the same LAN (F12 > Advanced Configuration in Tally).
- A dedicated, unattended-friendly account on this box — see
  `docs/OWNER_CHECKLIST.md` for the office/factory hardening steps
  (BitLocker/VeraCrypt, non-admin daily user, egress allowlist).

## Setup

1. Copy this whole `office-box/` directory to `/opt/vasant-hub/office-box`
   on the box (or wherever `WorkingDirectory` in the `.service` files
   points — edit those paths if you use a different location).
2. `cp .env.example .env` and fill in every value. The upload ticket and
   the Tally ETL encryption key both come from an admin who's logged
   into the hub — see the comments in `.env.example` for exactly which
   admin action produces each one.
3. Generate the backup keypair **once**, anywhere secure, not on this box
   long-term: `age-keygen -o vasant-hub-backup-key.txt`. Put the public
   key (the `# public key: age1...` line) in `.env` as `AGE_PUBLIC_KEY`.
   The private key file goes in the company bank locker / a secured
   offline location — never in git, never on a machine that's online.
4. `rclone config` — add a remote named `nas` pointing at wherever the
   office NAS lives (SFTP/SMB, whatever it supports).
5. Install the systemd units:
   ```bash
   sudo cp vasant-*.service vasant-*.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now vasant-tally-pull.timer vasant-backup.timer vasant-keepalive.timer
   ```
6. **Validate against the real Tally instance.** `tally-pull.mjs`'s
   export XML request follows Tally's documented TDL Collection-export
   format, but it was written without a real Tally Prime install to test
   against (this repo was built on macOS, where Tally doesn't run).
   Run `node --env-file=.env tally-pull.mjs` once by hand, check
   `finance.etl_run_log` in the hub for the parse result, and adjust the
   `buildExportEnvelope()` request shape / `parse-tally`'s field mapping
   to match whatever Tally actually returns. This is the one piece of
   the whole wave that genuinely needs a real Tally Prime instance to
   finish — everything else is already verified.

## Rotating credentials

- Upload ticket expires per its `ttlMinutes` (90-day cap) — re-mint from
  the admin UI before it lapses, or `tally-pull.mjs` starts queueing
  locally and alerting via `finance.etl_run_log` failures.
- `TALLY_ETL_ENCRYPTION_KEY` only changes if the Vault secret is rotated
  — re-copy it from `vault.decrypted_secrets` if that ever happens.

## Quarterly restore drill

`docs/OWNER_CHECKLIST.md` #11: a backup that's never been restored is a
hypothesis, not a backup. Every quarter, decrypt one `backups/*.sql.age`
file with the offline private key and restore it into a scratch Postgres
instance to confirm the whole chain still works.
