#!/usr/bin/env bash
# Supabase Free pauses a project after 7 days with no activity. The
# nightly GitHub Actions backup job already causes activity, but that
# depends on the owner having added SUPABASE_DB_URL as a repo secret —
# until then, this is the fallback: one cheap read, run daily from the
# office box regardless of whether Tally sync itself ran.
set -euo pipefail
: "${NEXT_PUBLIC_SUPABASE_URL:?Set NEXT_PUBLIC_SUPABASE_URL in .env}"
: "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:?Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env}"

curl -sS -o /dev/null -w "keepalive ping: HTTP %{http_code}\n" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}" \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=id&limit=1"
