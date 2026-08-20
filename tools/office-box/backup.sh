#!/usr/bin/env bash
# Decision 6, primary backup path: Supabase Free has no automatic
# backups and no PITR, so this dump *is* the backup. The GitHub Actions
# workflow (.github/workflows/backup.yml) is the automated offsite leg;
# this script is the one with NAS access, so it's the primary.
#
# Requires: pg_dump, age (https://age-encryption.org), rclone configured
# with a remote named "nas" (see README.md).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL in .env (Supabase Dashboard > Settings > Database > Connection string)}"
: "${AGE_PUBLIC_KEY:?Set AGE_PUBLIC_KEY in .env — the public half only, generated once with: age-keygen -o vasant-hub-backup-key.txt}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="$SCRIPT_DIR/backups"
OUT_FILE="$OUT_DIR/vasant-hub-${STAMP}.sql.age"

mkdir -p "$OUT_DIR"

pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges \
  | age -r "$AGE_PUBLIC_KEY" -o "$OUT_FILE"

echo "wrote $OUT_FILE"

# NAS copy (decision 6's primary offsite leg). Configure once with
# `rclone config` — see README.md.
if command -v rclone >/dev/null && rclone listremotes | grep -q '^nas:'; then
  rclone copy "$OUT_FILE" nas:vasant-hub-backups/
  echo "synced to NAS"
else
  echo "WARNING: rclone remote 'nas' not configured — backup stayed local only" >&2
fi

# Keep 14 days of local copies; NAS/USB rotation covers longer retention.
find "$OUT_DIR" -name '*.sql.age' -mtime +14 -delete

echo "Reminder: rotate the weekly USB backup per docs/OWNER_CHECKLIST.md #11 — a backup never restored is a hypothesis, not a backup."
