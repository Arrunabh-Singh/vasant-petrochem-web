# Vasant Hub — Systems Blueprint v0.1

**Project:** Vasant Hub — one digital operations hub for Vasant Petrochem
**Scope:** Finance (Tally Prime) + AI analytics (Claude) + Live factory IoT + Control plane
**Owner context:** Family-run Indian petrochemical manufacturer & trader. No in-house IT team. Built with an AI coding assistant (Claude Code). Phase 0 hardening is tracked separately.
**Status:** Design blueprint (no code). Decisions are final within this doc; alternatives noted in one line each.

---

## 0. Document Map & Reading Guide

| Section | Who reads it |
|---|---|
| 1. Goals & principles | Everyone |
| 2. System diagram | Builders / family (conceptual) |
| 3. Data model | Builders |
| 4. Identity & security | Everyone — this is the critical section |
| 5. Deployment topology | Builders / sysadmin (family member) |
| 6. Phased roadmap | Owner (budget/approval) |
| 7. Key technical decisions | Builders |
| 8. Risk register | Everyone |
| 9. Cost estimate | Owner |

**Design principles (non-negotiable):**
1. **Identity everywhere.** Every row, action, and sensor reading is tied to an identity or a device credential. No anonymous control.
2. **RLS is the security floor.** Row-Level Security in Postgres enforces access; application code is not trusted to enforce security.
3. **Control plane is a separate world.** Web/cloud credentials can never touch factory actuation. Control is engineered to *fail safe*: no signal = safe state.
4. **Tally stays the system of record for accounting.** Vasant Hub reads from Tally; it never writes back in v1 (write-back locked behind an approval workflow in P5).
5. **Boring technology.** Prefer managed services and standard patterns. The family can't run Kubernetes or a Kafka cluster.
6. **Everything is audited.** Every AI action, every control action, every schema change, every login.
7. **Assume network failure at the factory.** Edge must store data locally and catch up later.

---

## 1. System Diagram (ASCII)

```
                              ┌─────────────────────────────────────────────────────────────┐
                              │                        CLOUD (public internet)              │
                              │                                                             │
   Public visitors            │   ┌──────────────────┐      ┌──────────────────────┐        │
   ──────────────────────────▶│   │  Public website   │      │  Vasant Hub App      │        │
                              │   │  (Next.js)        │      │  (Next.js)           │        │
                              │   │  Vercel           │      │  Vercel              │        │
                              │   └────────┬─────────┘      └──────────┬───────────┘        │
                              │            │  public pages             │ sessions (JWT)     │
                              │            ▼                          ▼                     │
   Family members        ┌────┴──────────────────────────────────────────────┴──────┐        │
   (Google Workspace     │                     SUPABASE (single project)             │        │
   SSO via OIDC)  ──────▶│  Auth (Google SSO)   Postgres (+RLS)   Realtime  Storage   │        │
                              │                            ▲            ▲                    │
                              └──────┬─────────────────────┴────────────┴───┬────────────┘ │
                                     │                                      │               │
        ┌────────────────────────────┼───────────────────┐                  │               │
        │                            │                   │                  │               │
        ▼                            ▼                   ▼                  │               │
  ┌──────────────┐          ┌────────────────┐   ┌──────────────────┐        │               │
  │ AI LAYER     │          │ TALLY ETL      │   │ ALERTING         │        │               │
  │ MCP server   │          │ (office Win PC)│   │ WhatsApp/Telegram│        │               │
  │ + Claude     │          │ nightly export │   │ /Email (via      │        │               │
  │ (Cloud +     │          │ → encrypt →    │   │ edge functions / │        │               │
  │  Claude Code)│          │ upload S3      │   │ Twilio/msg91)    │        │               │
  └──────────────┘          └────────────────┘   └──────────────────┘        │               │
                              ▲                                                              │
                              │                                                              │
                              │  HTTPS + OAuth (Google) | HTTPS (scoped tokens)              │
                              │                                                              │
 ┌────────────────────────────┴──────────────────────────────────────────────┐              │
 │                        FACTORY LAN (OT network)                           │              │
 │                                                                           │              │
 │  ┌──────────┐  Modbus/ ┌────────────────────┐   ┌───────────────────┐     │              │
 │  │ Sensors  │─────────▶│  Edge Gateway      │   │ MQTT bridge →     │     │              │
 │  │ temp/    │  RTU/     │  (industrial mini- │──▶│ cloud broker      │─────┘              │
 │  │ pressure │  analog   │  PC / Raspberry Pi)│   │ (EMQX cloud /     │                    │
 │  │ tank lvl │          │  - Modbus master   │   │  on VPS)          │                    │
 │  │ flow     │          │  - local MQTT      │   └───────────────────┘                    │
 │  │ machine  │          │  - offline buffer  │                                            │
 │  └──────────┘          │  - TLS client certs│                                            │
 │                        └─────────┬──────────┘                                            │
 │                                  │  local commands (only)                                │
 │                                  ▼                                                       │
 │  ┌──────────┐            ┌──────────────────┐   ┌───────────────────────────┐            │
 │  │ Motors / │◀──────────▶│  PLC / Relay     │   │  CONTROL PC (hardened,     │            │
 │  │ pumps /  │            │  controllers     │   │  isolated VLAN,           │            │
 │  │ valves   │            │  (fail-safe:     │   │  local-only web UI)       │            │
 │  └──────────┘            │   de-energize on │   │  - approval queue         │            │
 │                          │   loss of signal)│   │  - 2-person rule          │            │
 │                          └──────────────────┘   │  - full audit trail       │            │
 │                                                 └───────────────────────────┘            │
 │        OT Firewall: egress allowlist (MQTT 8883, HTTPS), ingress ONLY from control PC     │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Data flows (numbered):**

| # | Flow | Path | Transport |
|---|---|---|---|
| F1 | Public browsing | Visitor → Next.js public site → Supabase (public marketing rows) | HTTPS |
| F2 | Family login | Browser → Supabase Auth Google SSO → JWT session | HTTPS / OIDC |
| F3 | Finance ETL | Tally Prime (server mode) → **always-on office box pulls delta XML (HTTP:9000)** → encrypt (age/openssl) → upload to Supabase Storage (private bucket) → edge function parses → Postgres (finance schema) | HTTPS, pull-scheduled on the office box (no dependence on laptop wake-state) |
| F4 | AI read | Claude (Claude.ai / Claude Code / Desktop) → MCP client → Vasant MCP server (hosted) → Postgres read-only queries (RLS-scoped service account w/ role=ai_reader) | Streamable HTTP / OAuth |
| F5 | AI action | Claude → MCP server → **action gateway** (allowlist + 2-step confirm + actor identity pin) → Postgres (draft/approved states) or alerting API | Same as F4, action tools gated |
| F6 | Telemetry | Sensors → Edge gateway (Modbus poll) → local MQTT (QoS 1, retained) → cloud MQTT bridge TLS (mutual cert auth) → EMQX rule → Supabase Realtime/Postgres (telemetry table, downsample) | MQTT over TLS 8883 |
| F7 | Live dashboard | Browser → Next.js (ISR/CSR) → Supabase Realtime subscription (RLS-filtered) → chart | WebSocket |
| F8 | Control | Operator (role=operator+approver) → Vasant Hub control module → Supabase `control_requests` row → **push-only relay** (not direct internet → control PC) → PLC / relay module | HTTPS + local polling; no inbound firewall holes |
| F9 | Alerts | Postgres triggers / Edge function cron → WhatsApp (Twilio/msg91), email (Resend), Telegram | HTTPS |

**Golden rule:** F8 never goes cloud → PLC directly. The cloud stores a *request*; the factory pulls it. If the factory link is down, the plant keeps running exactly as before.

---

## 2. Data Model Overview

All tables live in Postgres (Supabase), `public` schema (or `vantel`, `finance`, `iot`, `control` schemas in P3+). RLS enabled on every table — no exceptions.

### 2.1 Finance (source: Tally ETL)

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `company` | Mirror Tally company profile | id, tally_guid, name, gstin, address, fy | 1 row per company (currently 1) |
| `ledger` (party master) | Customers/suppliers/accounts | id, tally_guid, name, ledger_type (sundry_debtor/creditor/bank/...), gstin, phone, address, opening_balance | Party master sync |
| `item` (stock master) | Products: solvents, chemicals | id, tally_guid, name, unit, gst_hsn, gst_rate, batch_tracked (bool), opening stock | HSN + GST rate copied from Tally |
| `voucher` (invoices/transactions) | Sales, purchases, payments, receipts, journals | id, tally_guid, voucher_type, voucher_number, date, party_id→ledger, amount, gst_tax_amount, status (tally_state: created/edited/deleted) | Delta sync via `alter_id`; upsert keyed on tally_guid |
| `voucher_line` | Line items of vouchers | voucher_id, item_id, qty, rate, amount, tax_amount | Inventory vouchers only |
| `bill_receivable` (receivables) | Invoice-level outstanding | voucher_id, party_id, bill_amount, paid_amount, due_date, status (open/partial/closed) | Bill-wise tracking from Tally |
| `gst_summary` | Monthly GST snapshot | period (yyyymm), gstin, sales_amt, tax_amt, purchases_amt, itc_amt, gstreturn_status | Cross-check vs GSTR-1/3B exports |
| `bank_statement` | Imported bank lines (optional, P5) | account_id, date, amount, narration, chq_no, reconciled (bool) | For recon vs `bill_receivable` |

**Tally sync semantics:** nightly delta export (TDL `TYPE=Collection`, batched by date, `ALTER ID` deltas). Upsert; a Tally *deletion* in v1 marks `superseded=true` + tombstone in `etl_run_log` rather than hard delete, so family can see what changed.

### 2.2 Inventory & Batches

| Table | Purpose | Key columns |
|---|---|---|
| `batch` | Batch/lot tracking (solvent lots) | id, item_id, batch_no, mfg_date, exp_date, qty_in, qty_avail, godown, quality_ref |
| `godown` | Warehouse locations | id, name, location, type (factory/office/store) |
| `stock_movement` | All inward/outward (from vouchers + manual adjustments) | id, item_id, batch_id, direction, qty, unit, ref_type (voucher/manual), ref_id, done_by |
| `inventory_level` | Live aggregatable stock snapshot (updated by trigger) | item_id, batch_id, godown_id, qty, last_updated |

Telemetry tank levels (P3) will correlate against `inventory_level` for a "book vs physical" reconciliation view — a headline feature (variance detection: leak/theft/measurement error).

### 2.3 Production Runs

| Table | Purpose | Key columns |
|---|---|---|
| `production_run` | A distillation/blending batch | id, run_no, item_id→output, batch_id, start_at, end_at, planned_qty, actual_qty, yield_pct, status (planned/running/completed/aborted) |
| `production_step` | Sub-steps (heating, reflux, transfer) | run_id, step_name, start/end, sensor_profile_id, params (temp curve targets), status |
| `run_recipe` | Parametrised recipe (reusable) | id, name, item_id, step sequence, target temps/pressures, alarms |

P3 minimum: log runs manually from dashboard; sensor linkage follows in P4. `yield_pct` is the single most valuable ops KPI.

### 2.4 Sensor Telemetry (IoT)

| Table | Purpose | Key design |
|---|---|---|
| `device` | Registered sensors/machines | id, name, type (temp/pressure/level/flow/machine), unit, location, edge_gateway_id |
| `telemetry_raw` | Every reading (append-only) | device_id, ts, value, quality (good/stale), gateway_id | Partitioned by month (see §7.3); RLS rls_level=iotsensor; Retention: raw 90 days, agg forever |
| `telemetry_1m` / `_1h` / `_1d` | Downsampled aggregates (min/max/avg/last) | device_id, period_start, avg, min, max, last | Written by gateway or edge function; feeds all dashboards |
| `machine_event` | Machine on/off/fault transitions | device_id, event (start/stop/fault/clear), ts, fault_code | Drives OEE + alerts |
| `alarm_history` | Raised + acknowledged alarms | id, device_id, rule_id, severity, raised_at, acked_by, acked_at, cleared_at |

Telemetry numeric columns are `double precision`; timestamps `timestamptz`, always UTC. All flows through the `%` downsampling pipeline; dashboards never query `telemetry_raw` directly.

### 2.5 Users, Roles, Permissions

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | Extends `auth.users` (JIT trigger on signup) | id (→auth.users), full_name, phone, role, photo_url, google_workspace_email |
| `family_members` | Who is "in the family" + status | id, profile_id, relationship, joined_at, is_active |
| `membership` | RBAC bindings (family business = single tenant, but keep multi-tenant shape for future) | id, profile_id, role, scope (finance/iot/control/all), is_active |
| `app_role` (lookup) | Role catalogue | role, permissions (text[]) |

**Roles (decisive):**

| Role | Finance data | Inventory | Telemetry (view) | Control | AI actions | Notes |
|---|---|---|---|---|---|---|
| `owner` (Pa/Parent) | full | full | full | approve+execute | approve | God mode, 2SV enforced |
| `accounts` (Mom/Dad @ accounts) | full | view | — | — | suggest only | Tally is theirs |
| `ops` (Plant manager) | view | full | full | request | suggest + confirm own ops actions | No finance edits |
| `operator` (shift staff) | — | view plant stock | full | request (no approve) | — | Digital sign-in |
| `viewer` (other family) | view (no GST numbers) | view | view | — | suggest only | PII-masked |

Permissions are **deny-by-default via RLS + a single `permissions()` SQL helper** (security-definer) so roles can never be abused client-side.

### 2.6 Audit Log

| Table | Purpose | Key columns |
|---|---|---|
| `audit_log` | Every meaningful event | id, ts, actor_type (user/service/ai/device/system), actor_id, action, object_type, object_id, before (jsonb), after (jsonb), ip, user_agent, outcome (ok/denied/failed), reason |
| `ai_action_log` | Every AI-initiated action | id, ts, requested_by (Google account), tool_name, params (jsonb), approval_by, approved_at, status (pending/approved/rejected/executed/failed), execution_result, mcp_session_id |

Writes to `audit_log` from server-side code + triggers; RLS: `owner` + `auditor` (role added in P5) can read, nobody deletes (append-only; retention 7 yrs). This satisfies: *if Claude did it, mom can see exactly what, when, and why.* Family trust in the AI layer depends on this table existing from day one.

### 2.7 Documents

| Table/Feature | Purpose |
|---|---|
| Supabase Storage, private bucket `vault-documents` | Invoices PDFs, sample certs (COA), contracts; object-level ACLs (owner/accounts) |
| `document_meta` | id, path, uploaded_by, entity_type/entity_id (invoice, batch, party), tags, checksum |

### 2.8 RLS → role mapping (how it binds)

```
-- canonical helper (security definer, runs 1/policy)
create schema vault; -- reserved for helpers
create or replace function vault.role() returns text ... as $$
  select coalesce((
    select r.role from public.membership r
    where r.profile_id = auth.uid() and r.is_active), 'viewer');
$$ security definer stable;

-- Example policy (finance):
create policy "finance_read" on public.voucher
  for select to authenticated
  using (vault.role() in ('owner','accounts','ops'));

-- Example policy (control):
create policy "control_request_insert" on control.control_request
  for insert to authenticated
  with check (vault.role() in ('owner','ops','operator'));
```

- `viewer` rows that contain GSTIN/financial amounts are masked by returning `null` via a view (`voucher_view`) — not by RLS alone (RLS filters rows; masking hides cells).
- Realtime subscriptions automatically respect RLS: a `viewer` never receives a finance-row broadcast.
- Service-role key is **never** used for browser sessions; it lives only in server-side code (edge functions / cron) inside Supabase.

---

## 3. Identity & Security Model

### 3.1 Authentication
- **Google Workspace SSO (`@vasantpetrochem.com` domain) via Supabase Auth (OIDC).** One-click login with Google; no passwords for the family. Google Workspace account management = employee off-boarding becomes *remove the Google account* → Supabase JIT profile trigger deactivates `membership`.
- **2-Step Verification (2SV) enforced at the Workspace level for all family accounts** (admin console; no exceptions, incl. the owner).
- New sign-ins allowed only if email domain matches allowlist `@vasantpetrochem.com` (login rate limiting + account lockout on N failures, plus Google's own protections).
- Sessions: short-lived JWT (Supabase default) + refresh; force re-auth for `control` module (re-prompt password/2SV before approving a control action).

### 3.2 Authorization
- RBAC (roles above) enforced at the DB by RLS + views; UI hides buttons but DB is the authority.
- **Dual authorization for control (2-person rule):** requester ≠ approver mandatory; owner can override in emergencies with a recorded reason + immediate alert to all owners.

### 3.3 Service-role & key custody rules
1. `service_role` key lives only in: Supabase Vault (server secrets) / Vercel server env / edge function env. Never in the browser bundle, never in git (gitignored + secret scanner on push).
2. Two family custodians (owner + accounts holder) hold the keys in a shared password manager (Bitwarden family org) with 2FA; rotation every 90 days.
3. A second, **least-privilege Postgres role** (`hub_etl`, `hub_ai`) is created for ETL writes and AI reads respectively — narrower than `service_role` (see §3.5).

### 3.4 Control-plane isolation (non-negotiable)
| Domain | Cloud (web) | Factory control |
|---|---|---|
| Network | Public internet, Vercel/Supabase | Private LAN, isolated VLAN |
| Credentials | Google SSO JWTs | Device certs (mTLS), local keys |
| Failure mode | Site down = annoying | Control PC auto-fails-safe (relays de-energize on lost heartbeat) |
| Path to actuation | Cloud writes `control_request` row only | Factory **pulls** requests over outbound TLS; no inbound firewall rule |
| Data | Finance, telemetry mirrors | Live states, actuation history stay local; summary mirrored out |

- No VPN hole into the factory internet-facing infrastructure. The control PC has no inbound listening port on WAN.
- PLC/relay logic: watchdog timer — command messages carry monotonically increasing seq + TTL; no heartbeat for > 5 s ⇒ actuators return to safe state.
- **Absolutely no** remote actuation of safety-critical systems (relief valves, scrubber, boiler interlocks). Those remain locked local, physically keyed.

### 3.5 AI layer security (the pattern)
![There is no image; described in text]

```
Claude (Cloud/Desktop/Code) → MCP client → HTTPS (Streamable HTTP)
        │  OAuth 2.0 (auth code + PKCE) with Google Workspace
        ▼
 Vasant MCP Gateway (small Next.js / Node service on Render)
   ├─ validates Google token + membership role
   ├─ issues session-scoped MCP token (TTL 15 min, scope-PINned: "read-only" or "actions:report+ops_view")
   ▼
 MCP Server (tools) ──▶ Postgres: connects with dedicated Postgres role
                          `hub_ai`: GRANT SELECT ONLY on finance/iot views,
                          NO UPDATE/DELETE/TRUNCATE, RLS-bound to ai_reader
```

- **Read-only by default**: every tool statically declares `readOnlyHint: true`; a server-side middleware asserts tool ∈ `READ_ALLOWLIST` before executing. No tool can mutate.
- **Action tools (P2 step 2) are a tiny explicit allowlist** — e.g. `create_alert_rule`, `flag_invoice_for_review`, `suggest_control_action` (creates a draft row only). Anything else = rejected with audit entry.
- **Actor identity pinning**: the MCP session binds the *Google identity* of the human who asked; Claude can't act "as the owner" — the log records the requester's email, the tool, params, and the approval path.
- **Claude Code (dev-time) access** uses the same MCP server; require a flag `--allowed-roles owner,ops` on the config + dedicated scope so dev tooling never has write creds shared with production data.
- Prompt-injection mitigation: telemetry/party data that Claude reads is treated as untrusted; the hub's System Prompt forbids acting on instructions found inside data.

### 3.6 Secrets management
- Supabase Vault (server-side) + Vercel env var encryption for deployment secrets.
- Bitwarden (family org) as the human layer; no secrets in code/repos; CI secret scanning on every push.
- Keys never in `.env` committed; `.env.example` documents names only.

### 3.7 Backup & Disaster Recovery
| Asset | Strategy |
|---|---|
| Postgres (Supabase) | **PITR enabled** (paid plan, 7-day window) + weekly logical dump (pg_dump) → encrypted (age keys, 2 custodians) → Supabase Storage private bucket + 1 offsite (Backblaze B2 private) |
| Supabase Storage | Cross-region copy optional; primary = private bucket; docs re-uploadable |
| Factory edge | Local SQLite/parquet files rotated daily; cloud mirror is the recovery source |
| Control PC | Local snapshot; config in git (infra-as-code repo) |
| DR drill | Quarterly (owner + Claude Code assist): restore a *copy* of the DB, verify dashboards, attempt one control-draft approval end-to-end. Time-boxed 1 day. |

### 3.8 Incident response basics (family-friendly, no SOC)
1. **Detect:** PagerDuty-style optional; initially: WhatsApp alert on auth failures, control attempts denied, ETL job missing.
2. **Contain:** revoke Google account(s) (single action, kills all sessions); rotate Supabase project keys; pull control PC off network (physical switch).
3. **Investigate:** `audit_log` + `ai_action_log` are the first stop; restore from PITR if tampering suspected.
4. **Learn:** 30-min family debrief, one-line "after action" saved to `docs/incidents/`.
Blood-pressure budget: runbooks are owned by the family; keep them to 1 page.

---

## 4. Deployment Topology

```
┌─────────────────────────────── CLOUD ───────────────────────────────┐
│ Vercel      → nextjs sites (public + hub app), zero servers          │
│ Supabase    → Postgres(+RLS/PITR), Auth(Google OIDC), Storage,       │
│               Realtime, Edge Functions (ETL parse, alerts, cron)     │
│ Render      → MCP server (small Node container, autosuspend off)      │
│ EMQX Cloud  → Serverless MQTT (TLS 8883, mutual cert auth)           │
│               (fallback: Mosquitto on $6 VPS)                        │
│ Upstash     → Redis for rate limits/session cache + dashboard cooldown│
│              (can defer; optional from P2)                            │
│ WhatsApp    → Twilio WhatsApp API (msg91 as India fallback)           │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────── FACTORY EDGE ─────────────────────────────┐
│ Edge GW: repurposed office PC / Raspberry Pi 5 (~₹0–7k)              │
│   - Node-RED (Modbus TCP/RTU master → JSON)                          │
│   - local Mosquitto (LAN-only, QoS1, retained) + per-device creds    │
│   - SQLite buffer (90d+ raw, 1-min downsampling to cloud)            │
│   - watchdog: telemetry heartbeat to control PC                      │
│ OT firewall: egress-only rules on the existing router/switch;        │
│              no inbound from internet; VLAN isolates OT from office  │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────── OFFICE (Tally) ───────────────────────────┐
│ Tally Prime on mom's Windows laptop (system of record)               │
│   - Tally in server mode (HTTP:9000); the always-on office box       │
│     PULLS delta XML on its own schedule                              │
│   - fallback: TDL export on Tally company-close, swept by the box    │
│   - box age-encrypts + uploads to Supabase Storage private bucket    │
│   - laptop hardening: VeraCrypt on Tally data, non-admin user,       │
│     daily NAS copy (stolen-laptop scenario)                          │
│   - WhatsApp confirmation to owner when export fails 2 nights        │
└──────────────────────────────────────────────────────────────────────┘
```

**Networking specifics:**
- Edge GW publishes to `vasant/<site>/<device>/telemetry` on the LAN Mosquitto, QoS 1, retained on last-value topics; gateway is sole bridge to the cloud (1-min aggregates over HTTPS).
- EMQX Cloud (if ever re-added for a 2nd site): ACL publish-only on own tenant prefix; client-cert CN = gateway identity.
- Supabase Realtime: one channel `iot:dashboard` filtered by RLS; dashboard throttles to 1 Hz via 1s aggregation in the browser; heavy charts read `telemetry_1m`.
- MCP server on Vercel as a Next.js API route (simpler ops; **decision: host MCP as a Next.js API route on Vercel** — zero new infrastructure, same deploy pipeline).

---

## 5. Phased Roadmap

> **Phase 0 (hardening)** is tracked separately (audit.md) — this plan assumes it lands before P1 goes live.

| Phase | Scope | Effort (weeks)* | Exit criteria |
|---|---|---|---|
| **P0** | Hardening: secret hygiene, Google SSO + domain allowlist, 2SV, RLS baseline on existing site, audit trigger, backups | 2–3 | All existing tables RLS-on; no `service_role` in client; SSO-only logins |
| **P1 — Finance warehouse** | Tally TDL delta exporter + Windows scheduler; encrypted upload; parser → `finance` schema; invoice-view + receivables board; GST snapshot; first "books vs hub" reconciliation | 4–6 | Nightly sync runs 14 consecutive nights w/o manual fix; receivables board matches Tally list; mom signs off |
| **P2 — AI layer** | MCP gateway (OAuth+roles); read-only tools (ledger aging, item stats, GST summary, receivables); Claude in-club dashboard; then action allowlist (flag invoice, create reminder, suggest control) w/ approval + full audit | 3–4 | Owner asks Claude 5 real questions/week; every AI action appears in audit log w/ requester identity; zero rejected out-of-allowlist actions in 2 wks |
| **P3 — IoT telemetry** | Edge GW purchase/wiring; Modbus polling; MQTT → EMQX → Postgres; downsampling; live dashboard (temps, levels, flows, machine states); alarm rules (level high/low, temp deviation, machine stalled w/ auto WhatsApp) | 5–7 | Sensors stream ≥ 99% uptime over 2 wks; alarm on a real tank level test; dashboard viewable on phone |
| **P4 — Control plane** | Control PC + relay modules; local UI; 2-person approval into cloud `control_requests`; heartbeat fail-safe; audit of every actuation; emergency stop button (local, hardwired) | 4–6 | Dry-run on 2 non-critical pumps: request→approve→actuate→verify cycle < 30s; fail-safe proven by unplugging network (pump de-energizes) |
| **P5 — Advanced** | Bank statement import + auto-recon vs receivables; yield analytics per recipe; AI ops advisor (recommends batch parameters from historical runs); write-back drafts to Tally w/ approval | 5–7 | Recon accuracy > 90% on 3 months data; AI advisor used on 1 real production run; owner approves |

**Total ≈ 23–33 weeks of focused build via Claude Code (spread over ~9–12 months of family reality).**

*Effort = focused working weeks by the build agent(s); add 50% for family learning/context switching.

**Dependencies:** P1 → P2 (AI reads need finance schema). P3 standalone (can start early if hardware procurement lags). P4 depends on P3 (control needs live device registry). P5 on everything.

---

## 6. Key Technical Decisions

| # | Decision | Chosen | Alternatives (one line) |
|---|---|---|---|
| 1 | **Tally export path** | **PRIMARY: pull model — always-on office box (repurposed PC / Pi, ₹0–7k) polls Tally Prime server mode (HTTP:9000, supported on 4.x) for delta XML; FALLBACK: TDL export triggered on company-close event, encrypted file swept by the same box. Never depends on mom's laptop being awake at a fixed hour** | TallyODBC (deprecated ≥ v4.0, read-only) · 11pm Windows Task Scheduler export (breaks on laptop sleep/reboot/gaming — rejected) · CSV (loses structure) |
| 2 | **ETL orchestration** | **Supabase Edge Functions + pg_cron (cloud side) + cron on the always-on office box (pull side) — no framework; Vercel cron limited to 1×/day on Hobby, so ALL sub-daily jobs live in pg_cron/edge functions** | Dagster/Airflow (overkill, new infra) · prefect (same) · Kafka (no) |
| 3 | **MQTT broker** | **₹0-only: v1 runs Mosquitto ON the factory gateway (LAN-only, no cloud broker at all); EMQX Cloud Serverless free tier (≤ 1,000 conns, ₹0) only when cross-site/broker-in-cloud is actually needed** | HiveMQ Cloud (pricier) · AWS IoT Core (region/lock-in) · paid Mosquitto VPS (rejected: costs money for zero v1 benefit) |
| 4 | **MQTT transport** | **Native MQTT over TLS 8883 (gateway⇄broker) + MQTT-over-WebSocket 443 (browser only, where broker supports; else Realtime)** | WebSocket-only (fine for browsers, edge prefers native QoS1) |
| 5 | **Telemetry storage** | **Plain Postgres + monthly RANGE partitioning + aggregates (1m/1h/1d) + 90-day raw TTL** | TimescaleDB (Supabase add-on cost; pg partitioning + agg tables cover 50K reads/hr easily) · InfluxDB (second store, no RLS) |
| 6 | **Live dashboard transport** | **Supabase Realtime (postgres_changes, RLS-filtered)** for event layers; polls every 30 s for aggregates | Direct WebSocket to broker (bypasses RLS) · Firebase (parallel identity) |
| 7 | **AI connection** | **Own MCP server (remote, Streamable HTTP) behind OAuth (Google), hosted as Vercel route; scope-pinned tokens; read-only default + tiny action allowlist** | Anthropic SDK direct (no tool registry/audit) · Managed MCP (Composio etc.) (adds vendor + cost, less control of RLS) |
| 8 | **Message queue** | **None in v1.** Supabase Realtime + EMQX rules + pg triggers cover all flows; Upstash Redis only for rate-limits later | RabbitMQ/Kafka (ops burden, no need at this scale) |
| 9 | **Alerts (WhatsApp/SMS/email)** | **₹0-only: email via Resend free tier (3,000/mo) + Telegram bot (free) as the push channel; WhatsApp Business App (free) for manual ops; Twilio/msg91 only if a paid channel becomes a hard requirement** | Twilio WhatsApp (~₹1,500–3,000/mo, rejected for v1) · SMS (deliverability issues + cost) |
| 10 | **GST / PII (data residency)** | **Supabase region = Singapore (or Mumbai if GB: INR billing; choose Mumbai for residency comfort), private buckets encrypted, GSTIN masked for `viewer`, Tally stays source** | India CDN for public site (Vercel auto) · storing GSTN in plain views (no) |
| 11 | **Dashboard framework** | **Next.js + Recharts (light) then shadcn/ui charts; no heavy BI** | Power BI/Tableau (non-devs won't maintain) · Metabase (extra auth model) |
| 12 | **Edge compute** | **Node-RED on a repurposed office PC / Raspberry Pi 5 (~₹7k) — ₹0-first** (visual, family-debuggable) | bare Python (needs dev for every sensor) · industrial mini-PC (₹35–60k, deferred) |
| 13 | **Auth sessions** | Supabase Auth Google OIDC, JWT+refresh, `page` revalidation on control module | Clerk/Auth0 (another vendor; Supabase already in stack) |

---

## 7. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Data quality from Tally** (masters renamed, invoices edited, GSTIN typos) | High | Med | Parser validation rules + daily delta report "hub-vs-Tally mismatches" surfaced to mom; no silent failures; `etl_run_log` per-run stats |
| R2 | **Factory power/network loss** | High | Med | Edge GW battery/online UPS + SQLite buffer 24h; catch-up on reconnect; dashboard shows "stale" badges; control fail-safe is independent of network |
| R3 | **OT safety — remote actuation error** | Low (by design) | **Critical** | No internet-to-PLC path (pull model); watchdog fail-safe; 2-person rule; physical E-stop; safety-critical systems excluded from remote control; P4 dry-run proofs |
| R4 | **Broker/cloud outage** | Med | Med | Local gateway Mosquitto keeps LAN traffic alive with zero cloud dependency; edge buffers; dashboard shows "stale" badges; own daily dumps are the only backups (Free has none) |
| R5 | **Vendor lock-in (Supabase, EMQX, Vercel)** | Med | Low–Med | All layers chosen for boring-portability: Postgres is Postgres; MQTT is MQTT; Next.js is portable to any host; keep SQL in migrations from day 1 (supabase CLI) |
| R6 | **Family adoption & training** | High | Med | Phased rollout one module at a time; WhatsApp-first UX (dashboard link in chat); 1-page "how to read this" per screen; Claude answers questions in family chat |
| R7 | **Cost creep** | Med | Med | **Zero-cost mandate: ₹0 recurring except Workspace (owner sign-off required for ANY paid service) — see §8**; free tiers first; monthly spend review confirms ₹0 |
| R8 | **AI hallucination on business data (wrong receivables claim)** | Med | Med | Read-only P2 gate; every AI answer cites the rows it used; audit log; owner override |
| R9 | **Credential theft / insider misuse** | Low–Med | High | 2SV everywhere; RLS deny-by-default; key custody rules; revocation = 1 Google action |
| R10 | **Regulatory (GSTN confidentiality, e-way bills)** | Med | Med | Data residency (IN region), GSTIN masked at Viewer tier, no scraping; Tally/portal remain the filing channel |
| R11 | **Scope creep / "massive undertaking" burn-out** | High | Med | Roadmap gated by exit criteria; each phase is shippable & Useful on its own; stop-criteria reviewed every phase |

---

## 8. Cost Estimate (indicative, INR ≈ $1 = ₹88) — ZERO-COST REVISION (2026-08-16)

**Hard constraint: ₹0 additional recurring spend. Only optional exception: Google Workspace email (per-person accounts + passkeys are the security baseline the whole plan relies on — 1–2 accounts minimum, ~₹136–170/user/mo Business Starter IN region).**

### 8.1 Cloud — recurring monthly

| Item | Choice | Est. ₹/mo | Notes |
|---|---|---|---|
| Vercel | **Hobby (free)** | ₹0 | 2 projects, 100 GB bandwidth, serverless functions + server actions included. Pro only if bandwidth/build minutes become a real limit. |
| Supabase | **Free tier** | ₹0 | 500 MB DB (hard read-only stop — raw telemetry stays at the edge, aggregates only in Postgres), 1 GB storage, **5 GB egress/mo** (not 2 GB), Edge Functions included (500K/mo). ⚠️ **No automatic backups on Free (2026) + no PITR — own daily encrypted `pg_dump` to NAS/Storage IS the backup, tested quarterly**; project pauses after 7 days idle → daily keepalive call. |
| MQTT broker | **Local Mosquitto on gateway (LAN-only) / EMQX free tier** | ₹0 | Devices talk to the gateway on the LAN; cloud bridge only when needed. EMQX free ≤ 1,000 conns. No VPS at all. |
| Render MCP instance | not started | ₹0 | MCP server = Vercel route in the Hobby plan. |
| Alerts | **Resend free tier (3,000/mo) + Telegram** | ₹0 | Retry on: alarms (WhatsApp via free Business App for ops staff), ETL-failure pings, daily digest. |
| Offsite backups | **Office NAS (existing) + home USB + optional B2 free 10 GB** | ₹0 | **Daily** encrypted `pg_dump` + Tally data-folder copies; quarterly restore drill. 3-2-1 rule satisfied with zero new spend. |
| Google Workspace | **optional — THE only accepted cost** | ₹0–850 | 1–2 paid accounts (owner + mom) to start; rest of family on `viewer` shared-in-vault entries are not allowed — unique accounts, start minimal, grow. |
| Email delivery (Resend) | free tier | ₹0 | 3,000/mo covers alerts + digests. |
| **Cloud monthly total** | | **≈ ₹0** (+ ₹136–850 optional Workspace) | Zero-cost mode holds until quotas are genuinely hit (paying later is a decision, not a default). |

### 8.2 One-time / hardware (zero-cost-first; staged, each item separately sanctioned)

| Item | Est. ₹ | Zero-cost path |
|---|---|---|
| Edge gateway | ₹0–7,000 | **Repurpose an old office PC/laptop (Linux) — ₹0.** Raspberry Pi 5 (~₹7k) only if nothing spare. Industrial mini-PC deferred. |
| Sensors (level/temp/flow) | **₹0 until P3 approved** | Hardware cannot be ₹0. Before any purchase: run the **manual dip-stick workflow (wave-2 D4, ₹0)** on the hub so the process exists first. P3 starter = 1–2 certified radar level sensors on the top tanks only (~₹25–60k one-time, owner-sign-off). |
| Control modules / PLC | ₹0 now | P4 is late-stage; pull-model + watchdog can be proven with relays on existing gear if ever. |
| OT network | ₹0 | v1: single gateway with egress-only rules on the existing router/switch. |
| Office UPS for Tally PC | ₹0 (usually exists) | Verify before buying. |
| Professional help (sensor wiring / PLC commissioning) | ₹0 until P3 | Optional; needed only when Ex-rated hardware is installed. |
| **One-time total (zero-cost mode)** | **≈ ₹0** | Sensors remain the only real floor — and only when P3 is formally approved. |

### 8.3 Lifetime projection (zero-cost mode)
- **Year 1:** ₹0 cloud + ₹0 hardware (P1/P2 are pure software on free tiers) + optional Workspace ₹7–10k/yr ≈ **₹7–10k/yr if Workspace is taken, else ₹0**.
- **P3+ (physical plant):** one-time ₹25–60k for 1–2 certified tank sensors when approved — the only spend that cannot be made free, because it is physics.
- **Hidden future cost (flagged):** Claude API usage for the AI layer is usage-billed (~$ per million tokens) — design P2 read-queries to be cacheable and cheap (aggregates over raw), cap per-user monthly tokens, and keep most family queries on free-tier models initially. This is a *decision-to-pay* later, never a default.

---

## 9. Open Questions for the Owner (to close before P1)

1. Confirm Google Workspace domain + 2SV enforcement date.
2. Confirm Tally version (4.0+ ?) and whether TDL add-ons are acceptable on mom's machine (read-only export — no risk to Tally data).
3. Sensor list + which 3–5 are highest priority (tank levels #1).
4. Which motors/pumps are in-scope for P4 control (start with 2 non-critical).
5. Zero-cost mandate sign-off: ₹0 recurring accepted (except Google Workspace email ~₹136–170/user/mo — confirm headcount; all paid services require owner approval; see §8).
6. WhatsApp number for alerts (owner or ops manager).

---

*Appendix A: Reference architecture pattern notes (research digest)*
- Tally: XML/TDL export via Tally Connector HTTP:9000 or file-drop XML; ODBC deprecated ≥ v4.0 → use TDL XML delta export; open-source TDL export add-ons exist (tally-database-loader format) to model the schema mapping.
- Supabase: multi-tenant RLS = `memberships(profile_id, role)` + security-definer helper + JWT claims; Realtime respects RLS; service_role server-only; PITR + weekly dumps recommended.
- MCP: remote MCP servers use Streamable HTTP + OAuth 2.0 (auth-code/PKCE) with scope-pinned tokens; read-only hint (`readOnlyHint`) on tools; action tools behind explicit allowlist + user-identity pinning.
- MQTT: EMQX Serverless free tier ≤ ~1,000 connections w/ TLS + ACLs; native MQTT (QoS 1) for devices, WebSocket 443 only when browsers must talk to broker directly (we avoid that — Realtime instead).