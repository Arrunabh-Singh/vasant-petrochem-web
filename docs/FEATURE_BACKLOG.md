# Vasant Petrochem — "One-Stop Factory Hub" Product Backlog

Compiled: 2026-08-16. Source: feature-advisory subagent (research-backed).

## Architecture thesis (read first)

1. **Tally Prime stays the system of record for finance.** The hub is a *read-first data lake* mirrored from Tally; write-back to Tally comes later, gated, and only for machine-confirmed data.
2. **AI reads, humans approve.** Claude and OCR draft, propose, and alert — every financial action ends with a human click. "Mom handles bills" is the human-in-the-loop; the AI should make her faster, not replace her.
3. **The control plane is isolated from the data plane.** Machine sensing arrives alarm-first, actuation-last. Nothing on the internet ever directly switches a pump in a solvent factory.

Effort: S ≤ 2 wks, M ≤ 2 mo, L = 2–4 mo, XL = 6+ mo. P0 = first 90-day milestone.

## Feature backlog

### (a) Public website

| Feature | Who benefits | Value | Effort | Priority | Notes / dependencies |
|---|---|---|---|---|---|
| WhatsApp AI lead-intake bot (FAQ, product queries, captures name/GSTIN/requirement, hands off to human) | Sales | 4 | M | P1 | WhatsApp Business API (~$0.005/msg via provider). Bot qualifies, human closes. |
| COA / spec-sheet & MSDS download portal (gated by GSTIN) | Sales, QC | 4 | S | P1 | Customers pester for COAs/COCs daily. |
| Quote expiry auto-follow-up (WhatsApp/SMS reminder after 5 days) | Sales | 3 | S | P1 | Needs quote data in hub. |
| Stock-availability badges on catalog | Sales | 3 | M | P2 | Gated on inventory data quality — wrong stock is worse than none. |
| Site AI assistant (RAG over catalog + COA docs) | Leads | 3 | M | P2 | Reuse embeddings infra from hub chat. |
| Hindi toggle / regional pages | Leads | 2 | S | P2 | Nice, not differentiating. |

### (b) Admin / back-office portal

| Feature | Who benefits | Value | Effort | Priority | Notes / dependencies |
|---|---|---|---|---|---|
| Google Workspace SSO + role-based portals (Owner / Accounts-Mom / Admin / Factory-ops / Auditor) | Everyone | 5 | M | **P0** | Mandatory. Enforce MFA, no shared logins, RLS per role, all access logged. |
| Master normalization: parties (GSTIN/PAN/name aliases), items (HSN, UOM, conversions) | Mom, owner | 5 | M | **P0** | Tally is loose; without canonical IDs every AI answer is wrong. Hidden backbone feature. |
| Unified search (leads, parties, products, docs, bills) | Everyone | 4 | M | P1 | Cheap once lake exists. |
| Document vault: bills, contracts, COA, MSDS, GST notices, lab reports — OCR-indexed | Mom, CA | 5 | M | P1 | GST doc retention legally mandated. |
| Expense approval workflow (photo + amount + category → approval → Tally flag) | Owner, Mom | 4 | M | P1 | Kills "cash diary" black holes. |
| Purchase-order & payout approval workflow | Owner | 4 | M | P1 | PO → receipt → bill → payment OK. |
| Party ledger & credit-limit dashboard (aging, over-limit, terms) | Owner | 4 | M | P1 | Depends on Tally sync. |
| Cash-flow projection (30/60/90-day receivables/payables) | Owner | 5 | M | P1 | The owner's daily decision screen. |

### (c) AI analytics layer (Claude-accessible)

| Feature | Who benefits | Value | Effort | Priority | Notes / dependencies |
|---|---|---|---|---|---|
| Chat-over-your-data (NL Q&A with citations, read-only) | Everyone | 5 | M | **P0** | Claude on curated warehouse views. Flagship demo. |
| AI invoice parsing/OCR → structured draft for Mom's review → approve to Tally queue | Mom | 5 | M | P1 | Her #1 bottleneck. Human in the loop, gated write-back. |
| GSTR-2B auto-reconciliation vs purchase register | Mom, CA | 5 | M | P1 | ITC recovery typically 15–25%. |
| Expense anomaly alerts ("diesel bill up 60% vs avg") | Owner | 4 | S | P1 | Rule + AI mix. |
| Daily AI WhatsApp digest (sales, top receivables, alarms) | Owner | 4 | S | P1 | Morning-chai habit builder. |
| Predictive reorder suggestions | Owner, plant mgr | 4 | M | P1 | Gated on stock counts + bill data quality. |
| Supplier price watch | Owner | 3 | S | P2 | Trivial once bill lines are structured. |
| AI stock-count workflows (agent guides counts, photo, variance vs Tally) | Storekeeper, Mom | 4 | M | P2 | "Proof of physical truth." |
| Voice-first queries (WhatsApp voice → text) | Factory team | 3 | S | P2 | Wrapper, not platform bet. |
| GST filing prep pack (drafts + docs + checklist → CA sign-off) | CA | 3 | M | P2 | Don't build filing yourself. |

### (d) Factory IoT & control plane

| Feature | Who benefits | Value | Effort | Priority | Notes / dependencies |
|---|---|---|---|---|---|
| Tank level monitoring (80 GHz radar, **Ex/flameproof rated** for solvents) | Owner | 5 | L | P1 | ₹1.5–3L/tank industrial grade; radar over ultrasonic (vapors/foam). Hazardous-area gating applies. |
| Flow metering (electromagnetic/PD on key lines) | Plant mgr | 4 | L | P1 | Shared Modbus gateway with levels. |
| Motor/pump status + run-hours | Plant mgr | 4 | M | P1 | Supports maintenance + energy anomalies. |
| Alarm escalation to WhatsApp/SMS (level, dry-run, power loss) | Owner | 5 | S | P1 | Highest value-per-rupee; under ₹50k once sensing exists. |
| Batch tracking (digital batch cards → COA auto-gen) | QC | 4 | M | P1 | Feeds COA portal + yield reconciliation. |
| Remote pump on/off from hub | — | 2 | XL | P3 | **Do not build over internet.** Local PLC interlocks + hardwired high-level cutoff instead. |

### (e) Finance / Tally & GST

| Feature | Who benefits | Value | Effort | Priority | Notes / dependencies |
|---|---|---|---|---|---|
| Tally Prime → hub sync (nightly one-way via Tally XML/ODBC/TDL export → Postgres) | Everyone | 5 | L | **P0** | ALL downstream features die without this. Keep raw copies in your own DB. |
| GST filing & compliance tracker (deadlines, IRN counts, e-way bills) | CA | 4 | S | P1 | Layer over Tally's native GST; no custom filing engine. |
| Bank statement auto-recon | Mom | 3 | M | P1 | Tally basics + Claude Q&A. |
| Payout calendar (due dates × credit terms, reminders) | Owner | 4 | S | P1 | Avoids late-payment interest. |
| Tally write-back (hub → Tally voucher import) | Mom | 3 | XL | P2/P3 | Only OCR-approved purchase bills; gate on 6+ months of stable sync. |

### (f) Ops & inventory

| Feature | Who benefits | Value | Effort | Priority | Notes |
|---|---|---|---|---|---|
| Physical stock-count app & variance vs Tally (barcode/QR + photo) | Storekeeper | 4 | M | P1 | Before any reorder AI. |
| Purchase-order register (PO → receipt → bill → payment) | Owner | 4 | M | P1 | |
| Yield/production reconciliation (kg in → kg out, loss % per grade) | Plant mgr | 4 | M | P2 | In solvents, losses are money. |
| Batch/lot traceability (batch → customer → COA) | QC | 4 | M | P2 | Recall-readiness. |
| Dispatch & vehicle log (e-way bill numbers, transporter) | Plant mgr | 3 | M | P2 | |

### (g) Growth / sales intelligence

| Feature | Who benefits | Value | Effort | Priority | Notes |
|---|---|---|---|---|---|
| Customer 360 + repeat-order intelligence | Owner | 4 | M | P1 | |
| Lead pipeline automation (stage tracking, reminders) | Sales | 4 | S | P1 | Orphaned leads are a known leak. |
| Margin analysis by product/customer | Owner | 4 | M | P1 | Expect imperfect costing data. |
| Sales targets / weekly dashboard | Owner | 3 | S | P2 | |
| WhatsApp broadcast campaigns (opt-in only) | Sales | 2 | S | P2 | |

## TOP 10 RECOMMENDATIONS (build order)

1. **Tally → hub nightly sync (one-way)** — everything else consumes this.
2. **Party & item master normalization** — no canonical masters, no trustworthy AI.
3. **Google OAuth SSO + roles + audit log** — security first; nothing ships before it.
4. **Claude chat-over-your-data** — first visible win; converts the family.
5. **AI OCR bill intake with Mom in the loop** — her bottleneck + data-quality engine.
6. **GSTR-2B reconciliation + expense anomaly alerts** — compliance money (ITC 15–25%).
7. **Document vault + unified search** — kills "where is the COA?".
8. **Tank level + pump status on top tanks + WhatsApp alarms** — first floor truth; start 2–3 tanks.
9. **Cash-flow projection + payout calendar** — the daily decision screen.
10. **Predictive reorder + supplier price watch** — optimize only when data is trustworthy.

Deliberately deferred: write-back to Tally, camera analytics, remote actuation, custom GST filing.

## WHAT NOT TO BUILD (traps)

| Trap | Why |
|---|---|
| Bidirectional Tally sync / hub-generated vouchers (early) | Silent-corruption risk; CA reconciles against Tally. Fragmentation catches family businesses in audits. |
| Custom e-invoicing / GST filing engine | GSTN changes schema without notice. Tally + GSP owns this; build only the tracking layer. |
| Remote pump/motor control over internet | Solvent unit = insurance claim waiting to happen. Alarm-first, actuation-last. Local PLC + interlocks only. |
| "Replacing Tally" with custom ERP | 10 years of history, GST filing, and the CA live in Tally. Build X-ray glasses, not an ERP. |
| In-house OCR/ML stack | Managed OCR (Google Document AI) + Claude beats any in-house model for Indian bills. |
| CCTV computer-vision analytics | Research project with terrible ROI at this scale. |
| Predictive-maintenance ML | No failure data/volume; run-hours + scheduled PM captures 80% of the value. |
| B2B e-commerce storefront | Buyers transact on phone/WhatsApp + credit + relations. |
| Native mobile apps | One responsive PWA serves the family. |
| Aggressive digital marketing | Petrochem buyers are not acquired by reels. |

## RISKS & GATING

- **Tally data quality (gate #1):** run a 2-week data audit; fix masters before AI output ships. Chat must cite sources.
- **Tally coupling:** nightly sync needs Tally in server mode; keep manual export fallback; never let sync outage block billing.
- **Factory internet:** gateways must buffer locally (Modbus → edge cache → cloud); SMS backup channel; prove 30-day uptime on 2 tanks before scaling.
- **Hazardous area (gate #2):** Ex/IS-rated certified instrumentation, licensed electrical contractor, insurance disclosure. Pumps-over-cloud is uninsurable.
- **GSTN/GSP instability:** hub tracks + reconciles, never files; CA signs off; manual fallback always.
- **Security:** Workspace SSO + enforced MFA, least-privilege roles, secrets in vault, RLS per role, AI queries logged too.
- **"Mom bus factor":** her implicit knowledge is the riskiest asset — pilot OCR with her 60 days; export her judgment rules into validation config.
- **Vendor lock-in:** own the lake (raw Tally exports + sensor time-series in your Postgres); SaaS layers swappable.
- **Family adoption:** P0 ships with a champion per department + weekly 15-min owner review until habit forms. A dashboard nobody opens is the costliest failure.
---

# WAVE 2 — Controls, Trust & Compliance Layer (2026-08-16)

The second wave is the *safe around the vault* — features that reduce "if someone gets access, we're fucked" and keep licences/bills/insurance from silently expiring. Wave-1 duplicates excluded.

## A. Security & compliance controls
- **A1 Login anomaly trips** — new device/location/login-time on vault+finance → "was this you?" alert + auto-deny until confirmed. P1
- **A2 Account lockdown rules** — failed-attempt lockout, per-feature read-only, trusted-phone recovery. P1
- **A3 Shared-account elimination tooling** — report multi-session/same-device logins, "last acted by" attribution, forces individual accounts. P2
- **A4 Maker-checker separation of duties** — one enters, another authorizes; no self-approval over threshold; immutable trail. P1
- **A5 Expense policy limits engine** — per-person/per-category caps, auto-route over-limit. P2
- **A6 GST/ITC risk scorecard per vendor** — 2B mismatch %, KYC state, new-vendor flag → 0-100 score. P2
- **A7 E-way bill expiry alerts** — in-transit radar with expiry countdown + WhatsApp alert. P1
- **A8 Licence compliance cockpit** — expiry radar for factory licence, trade licence, pollution CTO, PESO, fire NOC, GST registrations + renew workflows. **A lapse = plant shutdown.** P1
- **A9 Insurance & contract renewal radar** — factory/hazard/CGL policies + contracts; renew-before-lapse alerts. P1

## B. Document-management superpowers
- **B1 Full-text OCR search over vault** — "the ₹48,372 MMTC bill" by content, not metadata. P2
- **B2 WhatsApp doc intake** — forward a bill photo to a hub number → OCR → classified into vault. Highest adoption-per-effort. P2
- **B3 Duplicate-bill detection** — fingerprint GSTIN+no+amount+date; flags double-payment candidates. P2
- **B4 Vendor 360 dossier** — every doc per party in one page. P2
- **B5 Document request forms** — "ask mom for the Jan LR" tracked with reminders. P3
- **B6 Retention radar** — GST 8-year legal-hold timeline per class. P3
- **B7 Legal notice tracker** — in/out notices, response deadlines, linked lawyer. P2
- **B8 Download watermarking** — viewer email + timestamp burned into exported PDFs. P2
- **B9 Per-doc emergency revoke** — instantly kill visibility of any document, reason logged. P2

## C. AI-layer governance (ship before/with Claude)
- **C1 AI answer citations** — every answer links the exact source docs/figures. The trust contract. P1
- **C2 "Ask the auditor" export** — one-click export of an answer's sources + reasoning for CA. P2
- **C3 Hallucination guardrails** — confidence thresholds, explicit "I don't know", refuse out-of-range numbers. P2
- **C4 Per-user AI budgets & scopes** — who may ask which module/month, cost lights. P3
- **C5 Prompt-audit log + AI trust dashboard** — weekly "what the AI did/refused, who asked, which answers were wrong". P2
- **C6 AI action review queue** — human approval queue for machine-proposed actions. P3 (design pattern now, don't build empty queue)

## D. Factory & ops wave 2
- **D1 Shift handover digital log** — offline-capable end-of-shift notes with staff attribution. P2
- **D2 PPE/compliance checklist audits** — periodic checklists with photo proof. P3
- **D3 Near-miss/incident register** — 24-hr capture with photos (insurance posture). P2
- **D4 Tank dip-stick verification** — scheduled manual dip vs sensor readout; discrepancy alarm. The strongest theft/leak signal at the plant. P2
- **D5 Temp/pressure trend analytics** — P3, gated on sensor fleet size
- **D6 Production planning whiteboard** — skip; spreadsheet is fine until batch tracking matures
- **D7 Vehicle gate log** — skip; paper + WhatsApp photo is enough

## E. Finance wave 2
- **E1 Cheque/instrument register** — PDC in/out with due-date alerts. P2
- **E2 Payment confirmation matching** — expected vs bank statement: paid/cleared/bounced. P2
- **E3 TDS vendor tracker** — deducted/accepted/deposited + 26AS cross-check. P3
- **E4 Credit/debit-note handling** — CN/DN register with auto-offset. P3
- **E5 HSN-wise ITC ledger** — P3, needs a full clean GST cycle first
- **E6 Quarterly GST pack checklist** — one readiness score per quarter. P2
- **E7 Competitor price watch** — skip; nobody keeps manual quotes current
- **E8 What-if pricing calculator** — slide price → margin/cash impact on live data. The owner's favorite. P2

## F. Hardening ("if someone gets access, we're fucked")
- **F1 Who-has-access review reports** — scheduled access inventory + owner attestation. The cheapest insurance in the system. P1
- **F2 Orphan-account sweeps** — detect stale/unowned accounts automatically. P2
- **F3 Breach-mode dashboard freeze** — ONE switch: hide figures, freeze approvals, force re-auth, alert family. P2
- **F4 Read-only holiday mode** — scheduled freeze windows (shutdown weeks). P3
- **F5 Print-lock + export controls** — skip; watermarking (B8) covers the leak concern, print-blocking just frustrates family
- **F6 Clone-audit** — skip; can't act on the finding at this scale

## TOP 15 WAVE-2 (build order)
1. **A4 Maker-checker** — growth ends "we trust each other"; #1 auditor question; cheapest P1
2. **A8 Licence cockpit** — PESO/CTO/fire-NOC lapse = plant shutdown, larger than everything else combined
3. **A1/A2 Anomaly trips + lockdown** — set while SSO is rolling out, before habits harden
4. **C1 AI citations** — the family won't trust a single AI number without a visible source
5. **B2 WhatsApp doc intake** — mom lives in WhatsApp; every future document digitized from day one
6. **A7 E-way bill expiry alerts** — lapsed e-way bill = vehicle hold + ₹10k–1L penalties, found weeks later in Tally
7. **B3 Duplicate-bill detection** — one caught double-payment pays for the feature forever
8. **A9 Insurance/contract radar** — one uninsured fire event dwarfs every cost this system handles
9. **E2 Payment confirmation matching** — "paid" becomes fact instead of belief
10. **B1 Full-text OCR search** — turns the vault from dump into usable memory; build while small
11. **A6 Vendor ITC scorecard + B4 dossier** — fake-invoice exposure is the family's biggest statutory risk
12. **F1 Who-has-access reports** — SSO migration is the inventory moment; do it once with attestation
13. **E8 What-if pricing calculator** — earns trust from the person who pays for the platform
14. **D4 Tank dip-stick verification** — the strongest integrity signal at the plant
15. **F3 Breach-mode freeze + F4 holiday mode** — one switch that makes the family feel in control

**Sequencing:** Sprints 1–2 (60–90 days): P1 spine = A4, A8, A1/A2, F1, A7, + B2 and C1 alongside first AI features. Sprint 3+: B3, B1, A9, E2, E8, D4. Everything else earns its way.
