# Vasant Hub — STRIDE Threat Model

Compiled: 2026-08-16. Assumption: audit.md Phase-0 findings (C1–C6, H1–H4) are fixed before any hub module ships.

## 1. Assets & CIA priority

| # | Asset | Why it matters | C | I | A |
|---|---|---|---|---|---|
| A1 | Finance warehouse (invoices, ledgers, receivables, party GSTIN/PAN/bank) | Books of the business; GST compliance; trading decisions | H | H | M |
| A2 | Customer/vendor PII (email, phone, address) | India DPDP Act, trust | H | M | L |
| A3 | Documents (bills, GST returns, contracts) in private buckets | Audit/inspection evidence, contract disputes | H | H | L |
| A4 | Production telemetry (tank level, flow, pump/motor) | Live ops, book-vs-physical reconciliation, safety | M | M | H |
| A5 | Control availability + actuation integrity | Wrong/absent actuation = product loss or safety incident | L | H | H |
| A6 | AI trust + audit trail (ai_action_log) | Family trust in Claude = viability of the AI layer | M | H | L |
| A7 | Secrets (service-role key, MCP token, Google admin) | Master switch over everything above | H | H | L |
| A8 | Public site + lead pipeline | Revenue intake, reputation | M | M | H |
| A9 | Reputation | Invoice-fraud/breach headlines kill a trading family business | L | H | L |

Decisive priorities: protect A1/A7 with everything; A5 is engineered fail-safe by design; A6 is cheap to win (one append-only table), expensive to lose.

## 2. STRIDE per component

**C1 Web app (Next.js on Vercel):** forged OAuth session (L/H — PKCE + allowlist + in-action checks); XSS via JSON-LD/upload (M/M — M14, CSP, magic bytes); admin edits untracked (M/M — audit_log); PII leak via RLS gap (H/H — identity RLS + grant revocation); spam flood (H/L — rate-limit trigger); role escalation via client values (M/H — roles from JWT only + CHECKs).

**C2 Supabase:** leaked anon key vs RLS gaps (M/H — quarterly RLS re-audit); service-role key tampering (M/H — server-only, IP-allowlisted, rotated quarterly); silent tampering (L/M — triggers + updated_at); bucket misconfig/over-long signed URLs (M/H — private buckets, ≤5 min URLs, issuance audit); query exhaustion (M/M — timeouts, aggregates); SQL injection via ETL/AI (M/H — parameterized only, least-privilege roles).

**C3 Tally machine + ETL:** ransomware (H/H — isolated VLAN, egress allowlist, BitLocker, daily offsite export); shared-drive exposure (M/H — least-privilege shares); shared admin creds (M/H — per-person accounts, EDR); tampered books (L/M — sync watermark + checksums in etl_run_log); silent job failure (M/M — WhatsApp alert on 2 missed nights).

**C4 AI/MCP layer:** stolen MCP token (M/H — OAuth + PKCE, 15-min scope-pinned tokens, actor pinned in logs); **prompt injection → disallowed tool / crafted SQL (H/H — no model-authored SQL, allowlisted parameterized tools, hub_ai role SELECT-only on views)**; injected instructions exfiltrate GSTIN/PAN (M/H — row caps, PII redaction in outputs, full query audit); untraceable AI action (L/M — append-only ai_action_log, 7-yr retention); over-broad hub_ai role (M/H — views not tables, no DML grants, quarterly audit).

**C5 MQTT pipeline:** spoofed device telemetry (M/M — per-device client certs, ACL publish-only own prefix); tampered readings (M/M — range/sanity validation); **publicly readable broker (H/M — private endpoint only, TLS 8883, never exposed)**; device storm (M/M — quotas, 24h edge buffer); gateway creds reused for admin (L/M — creds scoped per device).

**C6 Edge gateway:** **stolen gateway (M/M — FDE, short-lived creds enrolled at boot, revoke on report)**; firmware tamper (M/M — signed firmware, read-only root); plaintext secrets (M/H — FDE, no long-lived creds); failure (M/M — watchdog, UPS, heartbeat); pivot into cloud (L/H — egress allowlist only, no inbound).

**C7 Control plane:** forged control_request (M/H — HMAC-signed, per-operator tokens, 2-person approval); replay/tamper (M/H — seq numbers + TTL, stale rejected); exposed contents (M/M — TLS, no secrets in payload); spammed queue (L/M — rate limits, dedupe); PLC reached via control PC (M/H — isolated VLAN, outbound polling only, watchdog fails safe; physical access is accepted residual risk).

**C8 Humans/insiders:** **shared privileged account (H/H — unique per-person Workspace accounts + passkeys, RLS by user)**; owner's own PC compromised (M/H — device encryption, password manager, separate admin user); insider edits books (L/H — audit triggers, monthly review); assistant sees secrets in chat (M/H — never in chat, scoped creds, secret scanner); coding assistant gets prod keys in CI (M/H — preview-only access for agents).

## 3. Top 10 attack scenarios

| # | Scenario | Kill chain | ONE control that stops it | Minimum detection signal |
|---|---|---|---|---|
| 1 | Google account phishing | Phish → fake login → token → Workspace + Supabase admin | **Passkeys (FIDO2) enforced org-wide** | Workspace login audit: new device/geo, login without passkey |
| 2 | Service-role key leaked in chat/commit | Key pushed → indexed → used from attacker IP | **IP-allowlist the key + rotate quarterly** | Query from non-allowlisted IP; secret-scan hit |
| 3 | AI prompt injection exfiltrating PII | Attacker injects via prompt/content → model calls disallowed tool | **No model-authored SQL; allowlisted tools on row-capped SELECT-only hub_ai role** | ai_action_log: out-of-allowlist calls, row-count spikes |
| 4 | Publicly readable MQTT | Broker on 0.0.0.0/no TLS → anyone subscribes | **Broker on private endpoint + per-device TLS client certs** | Unknown client IDs, failed-TLS spikes |
| 5 | Stolen edge gateway | Gateway lifted → creds extracted → false readings | **FDE + short-lived boot-enrolled creds (TPM); revoke on report** | Heartbeat gap; same device ID from new IP |
| 6 | Exposed backup dump | Dump in loose bucket/shared drive → GSTIN/PII leaked | **Client-side encryption (age keys, 2 custodians) away from the bucket; PITR over raw dumps** | Bucket access logs: backup-object downloads |
| 7 | Family shares privileged account | Owner logs in on family device → cousin reads/edits invoices | **Unique per-person accounts + passkeys; RLS by user id** | Concurrent sessions / multi-device on one account |
| 8 | Tally machine ransomware | Office PC clicks link → ransomware → C2 | **Isolated VLAN + egress allowlist — no C2 channel, no reachable backups** | EDR crypto alert; egress to unknown IP; failed backup check |
| 9 | Malicious package in ETL deps | Typosquat rides nightly job → steals creds | **Hash-pinned lockfile + CI supply-chain scan + narrow hub_etl role** | CI scanner finding; writes outside sync pattern |
| 10 | Session theft via cookie | XSS/stolen cookie → reuse admin session | **httpOnly+Secure+SameSite, 24-h TTL, device-bound sessions, re-auth on sensitive actions** | Session replay; unexpected device/IP |

## 4. Defense matrix

- **Identity/least privilege:** unique Workspace account per person, passkeys not passwords; roles only as DB-side claims; one Postgres role per workload (hub_etl / hub_ai / web); quarterly access review.
- **Network segmentation — 3 zones, no cross-traffic:** Cloud (Vercel/Supabase/EMQX private endpoint) · Office VLAN (Tally PC, egress allowlist only, no browsing) · Factory VLAN (gateway, control PC, PLC — egress-only, no inbound). No VPN hole into the factory.
- **Secrets:** Vercel env + Supabase Vault + Bitwarden family org (2FA). Service-role key server-only, IP-allowlisted, quarterly rotation; MCP tokens 15-min TTL; device creds short-lived; secret scanner on every commit. Rule: a key that touched chat gets rotated, not debated.
- **Encryption:** rest — Supabase managed + BitLocker (Tally) + LUKS (gateway) + client-side-encrypted backups (2 custodians); transit — TLS everywhere, MQTT 8883 with client certs, HSTS; documents additionally encrypted at upload so a leaked signed URL yields nothing.
- **Monitoring — alert on:** new device/geo login; login without passkey; service-key use from non-allowlisted IP; RLS/grant changes; bucket ACL changes; new API key creation; unknown MQTT client IDs; backup-object downloads; ETL failure; out-of-allowlist AI tool calls; session replay. Review monthly (10 min).
- **Recovery:** Supabase PITR (7-day) + encrypted weekly dumps offsite; Tally export offsite daily; one-page runbook with owner as sole RACI; **quarterly restore drill**. Factory control recovers by design (watchdog fails safe).
- **Personnel:** no shared accounts ever (viewer role for lookers); 2SV/passkeys on every account; device hygiene (encryption, lock, auto-updates, password manager, no admin browsing on Tally PC); AI assistant never receives production secrets in chat/CI.

## 5. Quarterly pentest-lite checklist (owner + AI assistant, one afternoon)

- [ ] Workspace: passkey/2SV enforced; login audit reviewed; no shared accounts
- [ ] Supabase: advisors clean; RLS reviewed line-by-line; no TRUNCATE to anon/authenticated; PITR verified
- [ ] Secrets: service-role + MCP tokens rotated; secret scanner run on repo + recent chat; IP allowlist confirmed
- [ ] Repo/CI: branch protection + Dependabot + CodeQL active; lockfile pinned; no secrets in commits
- [ ] Storage: all buckets private; signed URLs ≤5 min; issuance audit clean; MIME/size limits set
- [ ] AI layer: review quarter's ai_action_log (zero out-of-allowlist calls); run one injection test
- [ ] MQTT: private endpoint verified; subscribe with bad cert → did it alert?
- [ ] Edge/control: gateway heartbeat + buffering checked; watchdog test (kill link → de-energize); no inbound rules
- [ ] Office/factory: egress allowlists intact; Tally PC encryption + backups verified; VLANs unchanged
- [ ] Access review: every user listed, unused removed, roles match the job
- [ ] Write findings to docs/incidents/THREAT_LOG.md with dates

**Hire a professional immediately if ANY one is true:**
1. Any credential was actually *used* by an unauthorized party
2. A real secret entered a chat, commit, or third-party tool
3. Any unexplained control-plane or safety event (actuation without approval, watchdog failure)
4. You cross ~1,000 parties with GSTIN/PAN, or an auditor/insurer/regulator asks for a test
5. A breach attempt gets past 2SV, or any incident you cannot explain within a day of triage

**Bottom line:** the three threats that will actually hurt are Google account phishing (passkeys), service-role key leakage (IP allowlist + rotation), and AI prompt injection (no model-authored SQL + SELECT-only hub_ai). Everything else is defense-in-depth behind those three. Land audit.md C1–C6, then run this checklist quarterly — that is the entire security program, and it is enough.