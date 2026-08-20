# Vasant Hub

Vasant Petrochem's public website, admin back-office, document vault,
and the foundation for the wider digital operations hub described in
`docs/VASANT_HUB_BLUEPRINT.md`. Next.js (App Router) + Supabase
(Postgres, Auth, Storage).

## What's here

| Area | Where |
|---|---|
| Public site (catalog, quotes, TDS gate) | `app/(site)/`, `app/actions/{quote,tds}.ts` |
| Admin back-office | `app/admin/`, gated by `lib/rbac.ts` + `proxy.ts` |
| Document vault (encrypted classes, ACLs, retention) | `app/api/documents/`, `lib/{crypto,documents,document-policy}.ts` |
| Compliance / maker-checker approvals / breach-mode | `app/admin/(dashboard)/{compliance,approvals,security}/` |
| Hub data model (finance/inventory/production/iot/control) | `supabase/migrations/202608161200{16..22}_*.sql` |
| Tally ETL (pull model — see blueprint decision 1) | `tools/office-box/`, `supabase/functions/parse-tally/` |
| Telemetry + control-plane APIs | `app/api/telemetry/`, `app/api/control/` |
| Read-only MCP server for AI queries | `app/api/mcp/`, `lib/mcp-tools.ts` |
| All schema history | `supabase/migrations/` (applied in order; see `supabase/config.toml`) |

Design docs (read before changing anything security- or architecture-
related): `audit.md`, `docs/THREAT_MODEL.md`,
`docs/document-storage-hardening.md`, `docs/VASANT_HUB_BLUEPRINT.md`,
`docs/FEATURE_BACKLOG.md`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values — see docs/OWNER_CHECKLIST.md
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin routes are
under `/admin`, gated by Google OAuth + the `app_users` table (see
`lib/rbac.ts`).

**Before the vault/telemetry/control/MCP routes will work locally**, set
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local` — see
`docs/OWNER_CHECKLIST.md` item 2.

## Scripts

```bash
npm run dev         # dev server
npm run build        # production build
npm run lint          # eslint
npm run typecheck   # tsc --noEmit
npm test               # node --test (crypto, origin allowlist, retention math, etc.)
```

## Database migrations

`supabase/migrations/` is the source of truth, applied to the live
project in order. To add a new one, write the `.sql` file with the next
timestamp and apply it via the Supabase MCP's `apply_migration` (or the
Supabase CLI once linked). After any schema change, re-run the security
advisor — this project hit three distinct default-privilege surprises
during development (Supabase's default ACL over-granting new tables and
functions, plus vanilla Postgres granting `EXECUTE` to `PUBLIC` on new
functions); see the migration comments around
`20260816120001_identity_and_rbac.sql` and
`20260816120011_fix_function_default_privileges.sql` for the fix and why
it's needed on every new schema.

## Owner-only setup

Everything that needs a human with account access (Google 2SV, DNS
records, GitHub repo settings, the office box, backup keys, vendor
accounts) is tracked in `docs/OWNER_CHECKLIST.md` — start there.

## Deploying

Deployed on Vercel. `vercel.json` declares the one cron job Vercel's
Hobby plan allows (daily digest bridge — see
`app/api/cron/daily-digest/route.ts`); everything sub-daily runs in
`pg_cron` inside Postgres instead (`20260816120024_cron_jobs.sql`).
