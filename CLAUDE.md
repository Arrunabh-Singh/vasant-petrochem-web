# CLAUDE.md — Vasant Petrochem "Vasant Hub" + ecosystem

> Single source of truth for any AI coding assistant working on Vasant Petrochem's
> software. Read this ENTIRE file before changing architecture, security, or schema.
> Companion local-ecosystem doc: `~/Vasantpetrochem/CLAUDE.md` (the Mac Hub).

---

## 0. Who we are (business context — drives every decision)
- **Vasant Petrochem**: family-run Indian **oil trader** (solvents, chemicals, fuels) with an **upcoming refinery**.
- We **use Tally Prime** (Windows/Parallels VM) as the system of record for accounting — never replace it.
- Operations we run that software must serve: **trading deals, road-tanker shipments (domestic solvents), tank-farm inventory, refinery project, compliance (GST/PESO/DPCC/etc.), and soon crude/products by sea**.
- **No in-house IT team.** Built with Claude (Claude Code / Pro). Family adopts one module at a time.
- **Hard constraint: ₹0 additional recurring spend** except optional Google Workspace email. Free tiers first; owner signs off on any paid service.

---

## 1. The two-system architecture

| System | What | Stack | Where |
|---|---|---|---|
| **Vasant Hub (this repo, `VPC`)** | Public site + admin back-office + data warehouse + IoT/control + AI gateway | Next.js 16 (App Router) + Supabase (Postgres/Auth/Storage/Realtime/Edge Fn) + Vercel | `/Users/arrunabhsingh/Vasantpetrochem/19_Website_VPC` (consolidated into the Mac Hub 2026-08-28; originally `~/Documents/VPC`) |
| **Mac Hub (local ecosystem)** | Owner's Mac "brain": all business files, planning, accounts copies, AI review queue, encrypted cloud backup, multi-laptop sync | Obsidian vault + rclone (→ Cloudflare R2) + Syncthing + bash AI scripts (Claude API) | `~/Vasantpetrochem` |
| **AI brain** | Proposes; humans approve. Two surfaces: (a) MCP server in VPC for read-only data Q&A; (b) bash scripts in Mac Hub that drop review cards | Anthropic Claude API | both |

**Relationship:** VPC is the durable, multi-user system of record + ops UI. Mac Hub is the owner's personal command center + offline-safe backup/sync. They overlap intentionally (accounts, deals, compliance) — Mac Hub mirrors and backs up; VPC is authoritative for live ops.

### Data flows (from BLUEPRINT.md)
- F1 public browse · F2 Google SSO · F3 Tally ETL (office box pulls Tally XML:9000 → encrypt → Supabase Storage → Edge Fn parses → Postgres) · F4 AI read (MCP, read-only) · F5 AI action (allowlist + 2-step) · F6 telemetry (sensors→edge→MQTT→Postgres) · F7 live dashboard (Realtime) · F8 control (cloud writes `control_request`, factory PULLS — never inbound) · F9 alerts (email/Telegram/WhatsApp).

---

## 2. Tech stack & deployment
- **Next.js 16**, React 19, Tailwind 4, TypeScript 5, zod. Scripts: `dev/build/lint/typecheck/test`.
- **Supabase**: Postgres (+RLS, PITR on paid), Auth (Google OIDC), Storage (private `vault-documents` bucket), Realtime, Edge Functions (Deno), `pg_cron`.
- **Vercel** Hobby (free) for the two Next apps + the MCP server as an API route.
- **Render** was planned for MCP but decision changed: MCP = Vercel route (zero new infra).
- **MQTT**: local Mosquitto on the factory edge gateway (LAN-only); EMQX free tier only if cross-site needed.
- **Secrets**: Supabase Vault + Vercel env + Bitwarden (family org, 2 custodians). `.env.example` only. Service-role key NEVER in browser.
- **Migrations**: `supabase/migrations/*.sql` applied in timestamp order via Supabase MCP `apply_migration` or Supabase CLI. After any schema change, re-run the security advisor (default-privilege gotchas documented in `20260816120011`/`12`).

---

## 3. Data model (Postgres, `public` + `finance`/`inventory`/`iot`/`control`/`logistics`/`market`/`trade_finance`/`vault` schemas)

### Existing (built)
- **Identity/RBAC**: `profiles`, `family_members`, `membership`, `app_role`; helpers `app.has_role(VARIADIC ARRAY['admin'::app_role,'approver'::app_role])` and `app.is_admin()` (security-definer) enforce role checks in RLS. (There is no `vault.role()` function.)
- **Finance (Tally mirror)**: `company`, `ledger` (party master), `item` (stock master), `voucher`, `voucher_line`, `bill_receivable`, `gst_summary`, `bank_statement`. Sync = nightly delta XML (TDL), upsert on `tally_guid`, tombstone on delete.
- **Inventory**: `batch`, `godown`, `stock_movement`, `inventory_level`.
- **Production**: `production_run`, `production_step`, `run_recipe` (`yield_pct` = key KPI).
- **IoT**: `device`, `telemetry_raw` (90d TTL, partitioned), `telemetry_1m/_1h/_1d`, `machine_event`, `alarm_history`.
- **Control**: `control_request` (cloud writes, factory pulls; 2-person rule).
- **Documents**: `document_meta` + Storage bucket `vault-documents`; classes + ACLs + retention.
- **Compliance**: `compliance_registry`, maker-checker `approvals`, `audit_log`, `ai_action_log`.
- **AI**: `ai_layer` tables; MCP tools in `lib/mcp-tools.ts`.

### Added 2026-08-28 (gap-closing migration `20260828120000_logistics_trading_gaps.sql`)
Closes the gaps vs ETRM / fleet-intelligence peers. Road-tanker first; sea-ready.
- `logistics.shipment` — road/rail/sea cargo; e-way + ETA drive alerts; `vessel_id` for sea.
- `logistics.fleet_vehicle` — tankers + insurance/fitness/PUC/permit expiry.
- `logistics.vessel` — sea vessels; `sanctions_flag`, `mmsi` (AIS-ready), P&I club.
- `logistics.counterparty_sanction` — **OFAC / G7 price-cap / PEP screening** of parties AND vessels (audit-trail, legally material for oil).
- `logistics.in_transit_inventory` — sold-not-delivered / bought-not-received / in-pipeline.
- `market.price_benchmark` — Platts/Argus/MOPS (manual entry to start; later automate) → P&L/MTM.
- `market.crude_assay` — crude grades (API, sulphur, TAN, yields) → refinery crack-margin.
- `trade_finance.letter_of_credit`, `trade_finance.bill_of_lading` — LC/BL/title.

**RLS**: all new tables deny-by-default. Operational tables (`shipment`, `fleet_vehicle`, `vessel`, `in_transit_inventory`, `price_benchmark`, `crude_assay`, `letter_of_credit`, `bill_of_lading`) are `SELECT` to any `authenticated` user. `counterparty_sanction` is `SELECT`-restricted to admin/approver. All writes use `FOR ALL` gated by `app.has_role(VARIADIC ARRAY['admin'::app_role, 'approver'::app_role])` (the project's existing role helper — there is no `vault.role()` function). Service-role (Tally/ETL) bypasses RLS.

---

## 4. Security model (non-negotiable — see `audit.md`, `THREAT_MODEL.md`, `docs/document-storage-hardening.md`)
1. **Identity everywhere** — every row/action/sensor tied to an identity or device credential.
2. **RLS is the floor** — DB enforces access; client code is NOT trusted.
3. **Control plane isolated** — cloud never touches actuation directly; factory pulls `control_request`; fail-safe de-energizes on lost heartbeat. No remote control of safety-critical systems.
4. **Tally = SOF** — Hub reads; write-back only via approval, gated ≥6 mo stable sync.
5. **Boring tech**, **everything audited**, **assume factory network failure** (edge buffers locally).
6. **AI read-only by default** — `readOnlyHint:true` on MCP tools; action tools behind explicit allowlist (`create_alert_rule`, `flag_invoice_for_review`, `suggest_control_action`); actor identity pinned to the human's Google account; data Claude reads is treated as untrusted (prompt-injection mitigation).

---

## 5. AI / human-in-the-loop (the rule for BOTH systems)
- **AI proposes, human approves.** No financial/control action without a human click.
- **VPC side**: MCP server (read-only) + action allowlist + `ai_action_log`.
- **Mac Hub side**: AI scripts write **proposal cards** to `~/Vasantpetrochem/12_AI_Review/` (Frontmatter: type/status:pending/confidence/proposed_action/destination/source_file). Owner edits `status: approved|rejected` in Obsidian, then runs `12_AI_Review/apply_approved.sh` to file them. Nothing moves without that.
- **Scope control**: `12_AI_Review/ai_scope.txt` excludes folders from AI reads (e.g. bank). API key in `11_IT_Ops/.ai_key_DO_NOT_SHARE.txt` (chmod 600), backed up encrypted.
- **Mac Hub automations** (run via launchd; 7am AI pass, 9pm backup): `inbox_process.sh` (classify+extract inbox docs), `meeting_actions.sh`, `compliance_watch.sh` (licence expiry), `logistics_watch.sh` (e-way/delivery alerts), `tally_pull.sh` (Tally companies via HTTP:9000), `briefing.sh` (daily digest), all orchestrated by `run_all.sh`. Core helper: `ai_core.sh` (`ai_ask`, `new_card`).

---

## 6. Gap analysis vs peers (ETRM: ION/RightAngle, Molecule, opsPhlo, Aspect, Vakt; fleet: Kpler, MarineTraffic, BASSnet) — and what we did
| Peer capability | VPC before 2026-08-28 | Action taken |
|---|---|---|
| Logistics & shipments (sea/road/rail) | only minor dispatch log (P2) | **Added** `logistics.shipment` + Mac Hub `13_Logistics_Shipments/` + `logistics_watch.sh` |
| Vessel chartering / laytime / demurrage / AIS | none | **Added** `logistics.vessel` (sanctions_flag, mmsi) + Mac Hub `14_Fleet_Vessels/` (road first; sea-ready) |
| Trading deal capture + benchmark pricing (Dated Brent/WTI/Dubai/MOPS) | Tally vouchers only | **Added** `market.price_benchmark` (manual→automate); deal-capture layer still P5 (Tally SOF) |
| Positions / P&L MTM / VaR / credit limits | none | Partially: benchmarks + margin analysis backlog; full MTM engine deferred (needs deal layer) |
| **Sanctions / OFAC / G7 price-cap / CBAM screening (party + vessel)** | licence cockpit + GST only | **Added** `logistics.counterparty_sanction` + Mac Hub `17_Sanctions_Screening/` |
| Market price feeds (Platts/Argus) | none | **Added** `market.price_benchmark` (manual entry; automate later) |
| Bulk tank-farm + in-transit + open-position inventory | batch/godown + tank *sensors* | **Added** `logistics.in_transit_inventory` + Mac Hub `15_Inventory_TankFarm/` |
| Crude assay / refinery crack-margin | generic production yield | **Added** `market.crude_assay` + Mac Hub `16_Market_Prices/Assays/` |
| Trade finance (LC / BL / title) | none | **Added** `trade_finance.letter_of_credit`, `trade_finance.bill_of_lading` + Mac Hub `18_Trade_Finance/` |

**Still open (documented, not yet built):** deal/position MTM engine, automated benchmark feed, AIS vessel-tracking integration, demurrage calculator, hedge accounting, CBAM emissions tracking. (Logistics admin UI + sanctions screening UI were built 2026-08-28 — see below.) These are the next build wave.

---

## 7. Build plan (close remaining gaps — priority order)
1. **Logistics admin UI** (VPC) — **DONE 2026-08-28**. Routes: `/admin/logistics/shipments`, `/admin/logistics/vehicles`, `/admin/logistics/sanctions`. List + create forms backed by `lib/logistics.ts` (reads) and `app/actions/shipment.ts` (writes, gated by `requireAdmin()`). Shipments show e-way/expiry/ETA; vehicles show statutory renewals; sanctions shows OFAC/G7 price-cap status. Next: edit/delete actions, delivery confirmation, e-way-expiry badges wired to `logistics_watch` alerts + WhatsApp/Telegram.
2. **Sanctions screening UI** — **DONE 2026-08-28** (see above).
3. **Benchmarks + margin**: manual price entry UI → refinery crack-margin + deal P&L drafts (human-approved).
4. **In-transit inventory** view (book vs physical, sold-not-delivered).
5. **Trade finance**: LC/BL linkage to shipments; title tracking.
6. **Mac Hub AI capture**: extend `inbox_process.sh` to emit `shipment_capture` / `vessel_capture` cards (AI already classifies); add demurrage/ETA alert type to `logistics_watch.sh`.
7. **Sea mode**: when vessels move crude/products, add charter-party + laytime/demurrage fields + AIS feed.

---

## 8. Conventions (do this or the audit advisor will yell)
- **Migrations**: new file `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`; include RLS + comments; apply via Supabase MCP `apply_migration`; re-run security advisor after.
- **Never** put `service_role` in client; never commit secrets; `.env.example` documents names only.
- **Frontend**: App Router. Public site under `app/(site)/`; admin gated by `lib/rbac.ts` + `proxy.ts` under `app/admin/`; API routes under `app/api/`.
- **AI**: read-only default; actions behind allowlist; log to `ai_action_log` with requester identity.
- **Naming**: snake_case DB, kebab TS files, folders numbered in Mac Hub (00–18).
- **Tests**: `node --test` (crypto, origin allowlist, retention math, etc.) — keep green.

---

## 9. Key files to know
- Blueprint/backlog/threat: `docs/VASANT_HUB_BLUEPRINT.md`, `docs/FEATURE_BACKLOG.md`, `docs/THREAT_MODEL.md`, `audit.md`.
- RBAC/security: `lib/rbac.ts`, `proxy.ts`, `lib/crypto.ts`, `lib/vault-key.ts`.
- AI: `lib/mcp-tools.ts`, `app/api/mcp/route.ts`, `app/actions/mcp.ts`, `supabase/migrations/20260816120023_ai_layer.sql`.
- Tally ETL: `tools/office-box/`, `supabase/functions/parse-tally/`, `supabase/migrations/20260816120022_tally_etl_key.sql`.
- Gap migration: `supabase/migrations/20260828120000_logistics_trading_gaps.sql`.
- Mac Hub scripts: `~/Vasantpetrochem/11_IT_Ops/Scripts/*.sh`, review queue `~/Vasantpetrochem/12_AI_Review/`.

---

## 10. Open questions for the owner
1. Google Workspace domain + 2SV enforcement date (blocks SSO rollout).
2. Tally version (4.0+?) and TDL export acceptance on mom's machine.
3. Which 3–5 sensors first (tank levels #1) — hardware is the only non-free cost.
4. Road-tanker vs sea split NOW (road confirmed primary; sea deferred but schema-ready).
5. Sanctions screening source (free UN/OFAC list CSV vs paid Kpler/screening API) — legally material.
6. Benchmark price source (manual entry now vs paid Platts/Argus feed later).
