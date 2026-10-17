# MNC.md — Digital Infrastructure Requisition

**Vasant Petrochem · vasantpetrochem.com**

| Field | Value |
|---|---|
| Document ID | VP-REQ-2026-001 |
| Version | 1.0 |
| Status | Open for execution |
| Issued | 2026-10-17 |
| Owner | Arrunabh |
| Executing agent | Claude Code |
| Budget authorised | ₹0 — zero-spend mandate |
| Review cadence | Weekly until P1 closes |

## 0. Purpose

This document is the single authoritative work order for bringing vasantpetrochem.com up to the standard expected of a serious industrial supplier: documented, defensible, hardened, and auditable.

It is not a wishlist. Every task below has an ID, an owner class, a phase, and an acceptance criterion. A task is not done because code was written — it is done when its acceptance criterion is independently verifiable.

Operating constraint: no money is to be spent. Every item in this requisition is deliverable on free tiers, free government portals, or engineering time alone. Any task that cannot be completed within that constraint belongs in §10 (Deferred — Requires Budget) and must not be silently substituted with a paid service.

## 1. Current state (as assessed 2026-10-17)

Stack: Next.js (App Router), Cloudflare in front of origin, image optimisation via `_next/image`.

Shipped and working:

- Home, Products, Industries, About, Contact
- Eight product detail pages with specification tables
- Open Graph image generation
- WhatsApp and click-to-call CTAs
- Honest copy — invented ISO badges, capacity figures and purity claims were previously removed and have stayed removed

Live and generating inbound calls. This changes the priority order: anything that leaks, drops, or fails to attribute an inbound enquiry is now a revenue defect, not a polish item.

### 1.1 Defects identified during assessment

These are confirmed observations, not speculation. Each has a task ID below.

| # | Finding | Task |
|---|---|---|
| F1 | Canonical tags point to apex (`vasantpetrochem.com`) while the site serves from `www.`. Host/canonical mismatch across the whole site. | VP-SEO-003 |
| F2 | `/about` emits the homepage's `og:title`, `og:url` and `og:description`. Per-page OG is implemented on product pages but not on top-level pages. | VP-SEO-004 |
| F3 | Desktop and mobile variants of several sections (product cards, industries grid, footer, stat blocks) appear to render as two separate DOM trees rather than one responsive tree. Doubles DOM weight and duplicates content for crawlers. | VP-PERF-001 |
| F4 | Header logo requested at `w=3840`. A navbar logo is being served at near-4K width. | VP-PERF-002 |
| F5 | Identical `meta-keywords` block on every page. Ignored by search engines; reads as amateur to anyone who views source. | VP-SEO-005 |
| F6 | Footer reads `© 2025` in October 2026. | VP-LEG-006 |
| F7 | Primary contact address is a Gmail account. | VP-HUM-002 |
| F8 | TDS gate collects an email and promises "we will send it across" — manual fulfilment, no evidence the PDFs exist. A gate that does not auto-deliver is worse than no gate. | VP-DOC-001, VP-LEAD-003 |
| F9 | No `/privacy`, `/terms`, or disclosure policy, while the site actively collects personal data via forms. | VP-LEG-003/004, VP-SEC-017 |
| F10 | No legal entity identification anywhere on the site — no GSTIN, no Udyam number, no registered office. | VP-LEG-001 |

## 2. Governing principles

These are binding on every task. A pull request that violates one is rejected regardless of code quality.

**P1 — Truth before polish.** No certification, capacity figure, client name, headcount, throughput number, or compliance claim may appear on the site unless it maps to a verifiable source document held by the company. Buyers in this sector verify ISO certificate numbers with the registrar. A false claim on a petroleum product is a legal exposure, not a design choice. See VP-GOV-001 (Claims Register).

**P2 — Zero spend is a hard constraint, not a preference.** If a task appears to require a paid service, stop and raise it rather than quietly provisioning one.

**P3 — Security is a first-class deliverable.** A company that sends quotations and invoices by email and stores customer enquiries in a database has a real attack surface. Workstream 4 is not optional hardening theatre; it is the minimum.

**P4 — Single source of truth.** Company details, product specifications, and contact information are defined once in code and consumed everywhere. No value is hardcoded twice.

**P5 — Claude Code does not invent business facts.** Where a real-world value is required (GSTIN, Udyam number, registered office, director names, licence numbers), insert a clearly marked placeholder in the form `TODO(VP-HUM-xxx): <description>` and surface it in the PR description. Never guess, never fill with plausible-looking data.

**P6 — Attack surface is a cost.** Do not build an admin panel, a login system, or a user account layer. Reads of enquiry data happen through the database provider's own authenticated dashboard. Every custom auth surface is a liability we are not staffed to defend.

## 3. Execution protocol for Claude Code

- One branch per workstream: `ws/01-legal`, `ws/04-security`, etc.
- One PR per task where practical; never bundle a security change with a content change.
- Conventional commits: `feat(legal): add privacy policy route`, `fix(seo): correct canonical host`.
- Every PR body states: task ID, acceptance criterion, how it was verified, and any `TODO(VP-HUM-xxx)` placeholders introduced.
- `main` is protected. No direct pushes. CI must pass.
- Never commit a secret, a `.env`, a customer record, or a document containing a GSTIN or bank detail.
- If a task is blocked on a human input, open the PR with the placeholder and mark it `blocked:human` rather than inventing the value or silently skipping the feature.

## 4. Phasing

| Phase | Window | Theme |
|---|---|---|
| P0 | This week | Stop the bleeding — lead capture, legal exposure, identity |
| P1 | Weeks 2–3 | Security hardening and the document layer |
| P2 | Month 2 | Corporate surface area, SEO, performance |
| P3 | Quarter | Depth — content, case studies, export readiness |

## WS-1 — Corporate identity & legal · Phase P0

| ID | Task | Owner | Phase |
|---|---|---|---|
| VP-LEG-001 | Footer legal block | CC | P0 |
| VP-LEG-002 | Company config single source of truth | CC | P0 |
| VP-LEG-003 | Privacy policy page | CC | P0 |
| VP-LEG-004 | Terms of use page | CC | P0 |
| VP-LEG-005 | Cookie / analytics notice | CC | P0 |
| VP-LEG-006 | Auto-rendering copyright year | CC | P0 |
| VP-LEG-007 | Product disclaimer consolidation | CC | P1 |

**VP-LEG-002 — Company config.** Create `lib/company.ts` exporting a frozen object: legal entity name, trade name, registered office, works address, GSTIN, Udyam registration number, CIN (if incorporated), phone numbers, email addresses, business hours, WhatsApp number, social profiles. Replace every hardcoded occurrence across the codebase. Unknown real-world values take `TODO(VP-HUM-001)` placeholders. Acceptance: grep for the phone number, the address string, and the email across the repo returns hits only in `lib/company.ts`.

**VP-LEG-001 — Footer legal block.** Render legal entity name, GSTIN, Udyam number, CIN where applicable, and registered office shown distinctly from the works address. This is what Indian industrial buyers look for before they raise a vendor code. Acceptance: block renders on every route; all values sourced from `lib/company.ts`; no placeholder text visible in production build.

**VP-LEG-003 — Privacy policy.** Must cover, specifically and not generically: what the contact form collects, what the TDS gate collects, what analytics collects, retention period, who it is shared with, how to request deletion, and a named grievance contact. Written against India's DPDP regime. Human legal review required before merge to production — mark the PR `needs:legal-review`. Acceptance: every data collection point on the live site is named in the policy. No "we may collect certain information" filler.

**VP-LEG-007 — Disclaimer.** Consolidate the "typical values, not a guarantee of specification" language into a single reusable component applied to every product page and every generated TDS, so the wording can never drift between the site and the PDF.

## WS-2 — Document layer · Phase P1

The document layer is what separates a supplier from a website. Industrial procurement downloads before it calls.

| ID | Task | Owner | Phase |
|---|---|---|---|
| VP-DOC-001 | TDS generation pipeline | CC | P1 |
| VP-DOC-002 | SDS 16-section skeletons | CC | P1 |
| VP-DOC-003 | Ungate SDS, keep TDS gated | CC | P1 |
| VP-DOC-004 | `/downloads` document centre | CC | P1 |
| VP-DOC-005 | Vendor registration pack route | CC | P2 |
| VP-DOC-006 | Printable quotation template | CC | P1 |

**VP-DOC-001 — TDS pipeline.** Generate all eight Technical Data Sheets as PDFs from the same product data object that renders the spec tables on site. Build-time generation using a Node PDF library; no paid design tool, no manual layout. Branded header, grade, typical values with test methods, packaging, handling and storage, disclaimer, revision number and date. Rationale: hand-made PDFs drift from the website within one revision. Generated PDFs cannot. Acceptance: `npm run build:tds` emits 8 PDFs; changing a viscosity value in the product data changes both the web table and the PDF; every PDF carries a revision number.

**VP-DOC-002 — SDS skeletons.** Generate the 16-section GHS structure with headings, document control, and company identification auto-filled. Hazard identification, composition, toxicological and ecological data must be left as explicit `TODO(VP-HUM-004)` blocks. Claude Code does not author hazard data. For traded products, content comes from the original supplier's SDS; for manufactured lines, from the company's own test data. Acceptance: skeletons generated; no section contains invented hazard, exposure, or toxicological values; build fails or warns if an SDS is published with unfilled hazard sections.

**VP-DOC-003 — Gating policy.** SDS downloads are free and ungated. TDS downloads remain gated behind an email. Safety information is not a lead magnet. Acceptance: SDS reachable in one click from the product page with no form.

**VP-DOC-006 — Quotation template.** A print-stylesheet HTML route that produces a clean A4 quotation via browser print-to-PDF: letterhead, enquiry reference, grade, packaging, basis (ex-works / delivered), validity, payment terms, GSTIN. Zero-cost substitute for invoicing software.

## WS-3 — Lead capture & attribution · Phase P0

Calls are already arriving. Everything here protects revenue that is already in motion.

| ID | Task | Owner | Phase |
|---|---|---|---|
| VP-LEAD-001 | Replace mailto with server-side form handler | CC | P0 |
| VP-LEAD-002 | Auto-acknowledgement email | CC | P0 |
| VP-LEAD-003 | TDS auto-delivery | CC | P1 |
| VP-LEAD-004 | Enquiry reference numbers | CC | P0 |
| VP-LEAD-005 | Internal notification to sales desk | CC | P0 |
| VP-LEAD-006 | Source and UTM capture | CC | P1 |
| VP-LEAD-007 | Call and WhatsApp click attribution | CC | P1 |

**VP-LEAD-001 — Form handler.** Server-side route handler persisting to a free-tier Postgres (Supabase free tier). Schema: id, reference, created_at, name, company, email, phone, product, quantity, message, source, utm fields, ip_hash, user_agent. No admin UI (see P6) — reads happen through the provider dashboard. Acceptance: submission persists; no customer data passes through a `mailto:` link; service-role credentials never reach the client bundle.

**VP-LEAD-004 — Reference numbers.** Format `VP-ENQ-YYYYMM-####`, shown on the confirmation screen and in both emails. Costs nothing and immediately changes how the company reads to a buyer.

**VP-LEAD-007 — Call attribution.** Fire analytics events on `tel:` and `wa.me` clicks, tagged with the originating page. Without this there is no way to know which product page produces the phone calls currently coming in.

## WS-4 — Security hardening · Phase P0–P1

Treat this workstream as the priority after WS-3. The company will shortly be sending quotations and holding customer data.

| ID | Task | Owner | Phase |
|---|---|---|---|
| VP-SEC-001 | Security response headers | CC | P0 |
| VP-SEC-002 | Content Security Policy (report-only → enforce) | CC | P1 |
| VP-SEC-003 | Rate limiting on write endpoints | CC | P0 |
| VP-SEC-004 | Bot and spam defence on forms | CC | P0 |
| VP-SEC-005 | Server-side input validation | CC | P0 |
| VP-SEC-006 | Secrets hygiene audit | CC | P0 |
| VP-SEC-007 | Dependabot + dependency audit in CI | CC | P0 |
| VP-SEC-008 | Static analysis in CI | CC | P1 |
| VP-SEC-009 | Branch protection on `main` | CC/H | P0 |
| VP-SEC-010 | SPF, DKIM, DMARC, CAA records | H | P0 |
| VP-SEC-011 | Cloudflare free-tier hardening | H | P0 |
| VP-SEC-012 | Information disclosure removal | CC | P1 |
| VP-SEC-013 | Database row-level security | CC | P0 |
| VP-SEC-014 | Account and domain hardening | H | P0 |
| VP-SEC-015 | Enquiry data backup job | CC | P1 |
| VP-SEC-016 | Incident response runbook | CC | P2 |
| VP-SEC-017 | `SECURITY.md` disclosure policy | CC | P1 |

**VP-SEC-001 — Headers.** `Strict-Transport-Security` (long max-age, includeSubDomains, preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/microphone/geolocation/payment, frame protection via CSP `frame-ancestors`. Acceptance: an external header scanner returns an A grade or better.

**VP-SEC-002 — CSP.** Nonce-based, `strict-dynamic`, no `unsafe-inline` in the final state. Ship `Content-Security-Policy-Report-Only` first, collect violations for one week, then enforce. Do not enforce a CSP on a live lead-generating site without a report-only period.

**VP-SEC-003 — Rate limiting.** Per-IP and per-endpoint limits on every write route. Prefer edge rate-limiting rules at the CDN layer over adding a dependency. If a Redis-backed limiter is used, it must be a free tier. Acceptance: eleven rapid submissions from one IP are rejected; the rejection is logged.

**VP-SEC-004 — Bot defence.** Three layers, all free: a honeypot field, a minimum time-to-submit threshold, and Cloudflare Turnstile (free, unlimited). No paid CAPTCHA. Acceptance: a scripted POST without a valid Turnstile token is rejected server-side, not merely hidden client-side.

**VP-SEC-005 — Validation.** Schema validation (zod or equivalent) on the server for every field: type, max length, format, allowed characters. Reject HTML in free-text fields. Client-side validation is UX, never a control.

**VP-SEC-006 — Secrets hygiene.** Audit every `NEXT_PUBLIC_` variable — anything prefixed with it is public, permanently. Confirm no service-role key, SMTP credential, or API token is reachable from the client bundle. Add `.env.example`. Add gitleaks to CI. Enable GitHub push protection where the plan permits it. Any credential ever committed to history is to be treated as compromised and rotated.

**VP-SEC-010 — Email authentication.** (Human task, DNS only, free) Publish SPF, DKIM and DMARC for vasantpetrochem.com. Start DMARC at `p=none` with an aggregate report address, review for two weeks, then move to `quarantine`, then `reject`. Add a CAA record restricting which certificate authorities may issue for the domain. Rationale: a petrochemical trading company that emails quotations and bank details is an obvious target for invoice fraud and domain spoofing. Without DMARC, anyone can send mail as you. This is the highest-value free security control available and it is pure DNS.

**VP-SEC-011 — Cloudflare free tier.** (Human task, free) Always Use HTTPS; minimum TLS 1.2; DNSSEC enabled; Bot Fight Mode; free managed WAF ruleset; rate-limiting rules on `/contact` and form endpoints; keep email obfuscation on.

**VP-SEC-013 — Row-level security.** RLS enabled and deny-by-default on the enquiries table. The anon key must not be able to read, update, or delete a single row. Inserts happen server-side with the service role. Acceptance: a query using the public anon key against the enquiries table returns zero rows and an authorisation error.

**VP-SEC-014 — Account hardening.** (Human task, free) Hardware-key or TOTP 2FA on: domain registrar, Cloudflare, GitHub, hosting provider, database provider, email provider. Registrar transfer lock on. Recovery codes stored offline. This is the cheapest and most commonly skipped control on this list.

**VP-SEC-015 — Backups.** Scheduled GitHub Action exporting enquiry records to an encrypted artefact. Free-tier databases have been known to pause, expire, or be lost. Data we cannot restore is data we do not have.

**VP-SEC-017 — `SECURITY.md`.** Disclosure policy, security contact address, response-time commitment, and scope. Costs nothing and is a recognised marker of an organisation that takes itself seriously.

## WS-5 — SEO & discoverability · Phase P1

| ID | Task | Owner | Phase |
|---|---|---|---|
| VP-SEO-001 | `sitemap.xml` and `robots.txt` via Next metadata routes | CC | P1 |
| VP-SEO-002 | JSON-LD: Organization, LocalBusiness, Product, Breadcrumb, FAQ | CC | P1 |
| VP-SEO-003 | Fix canonical/host mismatch (F1) | CC | P0 |
| VP-SEO-004 | Per-page OG metadata on all top-level routes (F2) | CC | P1 |
| VP-SEO-005 | Remove `meta-keywords` (F5) | CC | P1 |
| VP-SEO-006 | Search Console + Bing verification | H | P1 |
| VP-SEO-007 | HS codes and CAS numbers on product pages | CC/H | P2 |
| VP-SEO-008 | Image alt-text audit | CC | P1 |

**VP-SEO-003 is a P0 defect, not an optimisation.** Pick one canonical host (recommendation: `www`, since that is what is currently served), 301 the other to it at the edge, and make every canonical tag, OG URL, and sitemap entry agree. Right now the site tells search engines to index a host it does not serve from.

## WS-6 — Performance & accessibility · Phase P2

| ID | Task | Owner | Phase |
|---|---|---|---|
| VP-PERF-001 | Eliminate duplicate desktop/mobile DOM trees (F3) | CC | P2 |
| VP-PERF-002 | Correct image sizing; stop serving a 3840px navbar logo (F4) | CC | P1 |
| VP-PERF-003 | Font loading strategy | CC | P2 |
| VP-PERF-004 | Lighthouse CI with enforced budgets | CC | P2 |
| VP-PERF-005 | WCAG 2.2 AA pass | CC | P2 |

**VP-PERF-001.** Render one responsive tree; use CSS for the desktop/mobile difference. Shipping both variants in the DOM roughly doubles markup weight, hurts Core Web Vitals on the mobile connections most Indian industrial buyers are on, and presents duplicated content to crawlers.

**VP-PERF-005.** Keyboard navigation, visible focus states, contrast ratios, ARIA on the industries accordions, a skip link, and alt text everywhere. Large buyers occasionally run accessibility audits as part of vendor onboarding.

## WS-7 — Corporate surface area · Phase P2–P3

Routes a serious company has and this site does not. All content is subject to P1 — nothing invented.

| ID | Route | Notes | Phase |
|---|---|---|---|
| VP-CORP-001 | `/leadership` | Real names, real photographs, one-line bios. Anonymous companies do not win large contracts. | P2 |
| VP-CORP-002 | `/careers` | Even a single page and a `careers@` address. | P2 |
| VP-CORP-003 | `/quality-hse` | Quality policy, HSE policy, code of conduct, anti-bribery statement. Vendor onboarding forms ask for these by name. | P2 |
| VP-CORP-004 | `/certifications` | Only certifications actually held. Certificate number, issuing body, validity. Page ships empty-state rather than with aspirational badges. | P2 |
| VP-CORP-005 | `/logistics` | Coverage, lead times, packaging options, dispatch process. Supply reliability is the real buying criterion in this trade. | P2 |
| VP-CORP-006 | `/insights` | Technical articles. Best long-term organic channel available at zero cost. | P3 |
| VP-CORP-007 | `/case-studies` | Named with written permission, otherwise anonymised by sector and location. | P3 |
| VP-CORP-008 | `/export` | Gated on VP-HUM-008. Do not ship an export page until an IEC exists. A "Global Enquiries" page that leads nowhere is worse than none. | P3 |
| VP-CORP-009 | Branded 404 and 500 pages | | P2 |

## WS-8 — Repository & engineering governance · Phase P0–P1

This is the workstream that makes the repo read like an engineering organisation rather than a folder.

| ID | Task | Phase |
|---|---|---|
| VP-GOV-001 | Claims Register — `docs/claims-register.md` mapping every numeric, credential, and capability claim on the site to its evidence document. CI check fails if a product page asserts a certification not listed in the register. | P1 |
| VP-GOV-002 | `README.md` — architecture, local setup, deploy, environment variables | P0 |
| VP-GOV-003 | `CONTRIBUTING.md`, PR template, issue templates, `CODEOWNERS` | P1 |
| VP-GOV-004 | CI workflow: typecheck, lint, build, `npm audit`, gitleaks, Lighthouse | P0 |
| VP-GOV-005 | TypeScript `strict`, ESLint with security plugins, Prettier, `.nvmrc`, EditorConfig | P1 |
| VP-GOV-006 | `docs/adr/` — architecture decision records, starting with ADR-0001 (hosting) | P1 |
| VP-GOV-007 | `CHANGELOG.md`, conventional commits enforced in CI | P2 |
| VP-GOV-008 | Branch protection: PR required, status checks required, force-push disabled | P0 |

**VP-GOV-001 is the most important task in this workstream.** The claims register is the mechanism that keeps principle P1 enforceable after the people who wrote the copy have moved on. Every number on the site traces to a document, or it does not ship.

## 9. Human-only tasks — all free, none executable by Claude Code

| ID | Task | Cost |
|---|---|---|
| VP-HUM-001 | Supply legal entity name, GSTIN, Udyam number, CIN, registered office vs works address | ₹0 |
| VP-HUM-002 | Provision custom-domain email (Zoho Mail free tier: 5 users, one domain, 5 GB each; webmail and mobile only, no IMAP/POP on free — verify current terms). Create `sales@`, `tds@`, `accounts@`, `careers@`, `security@`. Retire the Gmail address from all public surfaces. | ₹0 |
| VP-HUM-003 | Google Business Profile — address, category, hours, phone, photographs. Highest-yield free lead channel available. | ₹0 |
| VP-HUM-004 | Supply hazard, composition and toxicological data for SDS completion — supplier SDS for traded lines, own test data for manufactured lines | ₹0 |
| VP-HUM-005 | WhatsApp Business app on the business number: profile, catalogue, away message, quick replies, labels | ₹0 |
| VP-HUM-006 | Facility photography on a current phone — tanks, drums, lab, blending, tanker at gate, people in PPE. Golden hour or overcast. Replaces all stock imagery. | ₹0 |
| VP-HUM-007 | Compile vendor registration pack: GST certificate, PAN, Udyam certificate, cancelled cheque, bank mandate, factory licence | ₹0 |
| VP-HUM-008 | Decide whether export is in scope this year; obtain IEC if so | small fee |
| VP-HUM-009 | Publish DNS records for SPF, DKIM, DMARC, CAA (pairs with VP-SEC-010) | ₹0 |
| VP-HUM-010 | Enable 2FA across registrar, CDN, host, database, email, GitHub; store recovery codes offline | ₹0 |
| VP-HUM-011 | Call log — every inbound call recorded: date, company, product, quantity, quoted, outcome | ₹0 |
| VP-HUM-012 | LinkedIn company page; free-tier listings on IndiaMART, TradeIndia, Justdial (expect daily upsell calls from their sales teams) | ₹0 |

## 10. Deferred — requires budget

Listed so they are tracked rather than forgotten, and so nobody substitutes a paid service into a zero-spend task.

| Item | Why deferred |
|---|---|
| ISO 9001:2015 certification | Registrar fees. The single highest-value credential available once budget exists. |
| Professional facility photography | VP-HUM-006 covers the interim at zero cost |
| Second phone line / DID | Not blocking |
| Paid directory placements | Free tiers first; measure before paying |
| Paid email tier (IMAP, more users) | Free tier covers five users |
| Paid uptime / log retention | Free tiers adequate at current traffic |

### 10.1 Open risk — hosting plan terms

ADR-0001 must resolve this before P2. Several hosting free tiers are licensed for non-commercial use only. A revenue-generating company website is commercial use. Confirm the current plan's terms. If the present tier does not permit commercial use, the zero-cost resolution is migrating to a provider whose free tier explicitly allows it, not quietly ignoring the clause. Raise this before building anything further on the current platform.

## 11. Definition of done

A task is closed when all of the following hold:

1. Acceptance criterion met and demonstrated in the PR body
2. CI green — typecheck, lint, build, audit, secret scan
3. No `TODO(VP-HUM-xxx)` placeholder visible in a production render
4. No new third-party dependency added without justification in the PR
5. No claim introduced that is absent from the claims register
6. Reviewed and merged via PR; `main` never pushed to directly

## 12. Immediate execution order

Claude Code is to begin in exactly this sequence:

1. VP-GOV-004, VP-GOV-008 — CI and branch protection, so everything after this is gated
2. VP-SEC-006 — secrets audit, before any new integration is built
3. VP-LEG-002 — company config, since everything downstream consumes it
4. VP-SEO-003 — canonical/host defect
5. VP-LEG-006 — copyright year
6. VP-SEC-001, VP-SEC-005, VP-SEC-004, VP-SEC-003 — headers, validation, bot defence, rate limiting
7. VP-LEAD-001, VP-LEAD-004, VP-LEAD-005, VP-LEAD-002 — form handler, references, notifications, acknowledgements
8. VP-LEG-003, VP-LEG-004 — privacy and terms, flagged `needs:legal-review`

Everything else follows the phase table.

*Issued under the zero-spend mandate. Any task requiring expenditure is to be escalated, not substituted.*
