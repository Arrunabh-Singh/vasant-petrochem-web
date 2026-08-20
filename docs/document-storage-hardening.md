# Vasant Petrochem — Document Storage Security Hardening Design

**Scope:** private + internal business documents (purchase/sales bills from Tally Prime, GST invoices/notices, contracts, COA/MSDS/QC reports, HR/employee records, bank statements) on the existing Next.js (Vercel) + Supabase (Postgres + Storage + Auth) stack.
**Design goal:** *"If an unintended person gets access we are fucked"* → make **no single breach catastrophic**. Every control below is layered so that any one failure (stolen session, leaked URL, insider, backup theft, misconfiguration, compromised office PC) degrades to a *document-level* or *class-level* incident, never a *full-archive* incident.
**Current state baseline (from `audit.md` + code):** one private `tds` bucket, signed URLs issued server-side with the service role (`app/actions/tds.ts:38`, 15-minute TTL), admin-only uploads, single Google account admin with no MFA enforcement (H1), no download audit logging (M2), authz relies purely on RLS role checks (C1), no branch protection/CI (C6), GitHub repo public (C2).

---

## 1. Threat Model

Legend — **Current design stops it:** ✅ yes · ⚠️ partial · ❌ no. Likelihood/impact are for the digitized-all-documents world (≈100k documents, GSTINs, PANs, bank statements).

| # | Attack path | How it happens | Likelihood | Impact | Current design stops it? |
|---|---|---|---|---|---|
| T1 | **Stolen admin Google session** | Phishing, session-cookie theft, shared home computer, borrowed laptop | Medium–High (family business, one admin, no 2FA enforcement today) | **Catastrophic** — full archive, all classes | ❌ No. Single admin identity, no MFA, no step-up auth for sensitive reads |
| T2 | **Leaked signed URL** | Browser history, corporate proxy logs, devtools copy, WhatsApp forwarding of a download link, referer leakage | High (URLs end up in logs by default; forwarding is normal in a family business) | Medium–High (every leaked URL = readable document until token expiry; CDN cache can outlive the token) | ⚠️ Partial. Private bucket + server-side signing, but 15-min TTL is long, no access log, Smart CDN can serve a cached response **after** token expiry |
| T3 | **Public-bucket misconfiguration** | Human error: toggling `public` in dashboard, copy-pasting a public bucket id, restore-from-backup flipping flags | Low–Medium | **Catastrophic** (whole class exposed to internet) | ⚠️ Partial. Buckets are private today, but nothing *enforces or detects* the flag (no guardrail job, no alert) |
| T4 | **Insider with valid session** | Family member, employee, CA firm, Tally consultant — all will have (or ask for) credentials; a reader becomes an exfiltration channel | Medium (the CA + Tally consultant are outside the family) | High (bills reveal margin, supplier links, PAN/GSTIN; bank statements are extortion-grade) | ❌ No. All-or-nothing: today "authenticated" ≈ "everything"; no per-document ACL, no class-level scoping, no download audit |
| T5 | **Backup theft** | Supabase PITR zone / daily dumps / offsite storage account compromised; developer laptop with a dump; `supabase db dump` copies | Low–Medium | **Catastrophic** — dumps contain Postgres + all metadata; storage copies contain the files | ⚠️ Partial. Provider at-rest encryption only; a stolen dump is instantly readable. Vault-encrypted values would survive a dump; plaintext documents would not |
| T6 | **Phishing of the Google account** | Admin clicks "share this folder" phish / fake GST login / tax notice PDF attachment | Medium | **Catastrophic** (same blast radius as T1; Google account also gates email, Tally exports, banking) | ❌ No. No enforced 2SV, no hardware-key requirement, no session limits |
| T7 | **Future AI (Claude/Q&A) prompt-injection exfiltration** | Documents land in an LLM context (Q&A over bills, email drafting); a prompt injection inside a scanned bill or contract instructs the model to leak/attach the corpus | Medium (AI features are planned; invoices/contracts are exactly where injections live) | High (asymmetric: one injected doc exfiltrates many) | ❌ No. No AI layer exists yet; the pattern must be fixed at design time |
| T8 | **Tally office machine compromise** | Keylogger/ransomware via email attachment or dodgy Tally plugin on the Windows box; the same box will run the ETL export | Medium–High (industrial Windows PC, internet-connected, shared login today) | High (Tally data + any **pre-upload** exports on disk; if the box holds an upload credential, it can push forged bills) | ❌ No. Machine is unmanaged; no FDE, no separate accounts, no backup discipline |
| T9 | **Signed-URL sharing beyond the intended recipient** | The reader downloads an invoice and forwards the *link* (not the file) to the buyer / CA / WhatsApp group | High (this will happen weekly) | Low–Medium (single document per link; class exposure only if links get scraped at scale) | ⚠️ Partial. TTL bounds it today; need short TTL + audit + no-store cache semantics to make it boring |

**Design consequence (the "single breach" rule):** for every one of T1–T9 there must exist at least **two independent controls** such that defeating one still leaves the attacker with at most one document class. Section 2–4 map controls to threats explicitly.

---

## 2. Defense-in-Depth Storage Architecture

### 2.1 Multi-bucket model — never one bucket for everything

One bucket per document class. A bucket is the widest failure unit of Supabase Storage (a leaked key, a flipped `public` flag, an S3-API sync) — so each class gets its own blast radius, its own limits, and its own policy set.

| Bucket | Content | file_size_limit | allowed_mime_types | Encrypted at rest (app-layer) | Retention |
|---|---|---|---|---|---|
| `tds` | TDS spec-sheets (existing) | 15 MB | PDF | ❌ (public-ish, shared with customers anyway) | 3 y |
| `purchase-bills` | Tally purchase bills, delivery challans | 25 MB | PDF, JPEG, PNG, TIFF | ✅ | FY + 8 y |
| `sales-bills` | Tally sales bills/invoices, e-invoices, e-way bills, credit/debit notes | 25 MB | PDF, JPEG, PNG, TIFF | ✅ | FY + 8 y |
| `gst` | GSTR returns, GST notices, CMP-08, reconciliation reports | 25 MB | PDF, JPEG, PNG | ✅ | FY + 8 y; notices → legal_hold |
| `contracts` | Customer/supplier contracts, MOUs, LOIs | 25 MB | PDF | ❌ (must be readable at face value; low sensitivity vs bank/hr) | termination + 8 y |
| `coa` | COA, MSDS, QC lab reports, test certificates | 25 MB | PDF, TIFF | ❌ (shared with customers routinely) | 6 y |
| `hr` | Employee records, appointment letters, Aadhaar/PAN copies, PF/ESI papers | 15 MB | PDF, JPEG, PNG | ✅ (Aadhaar masked → store masked copy only) | employment end + 7 y |
| `bank` | Bank statements, sanction letters, loan docs | 50 MB | PDF, TIFF | ✅ | statement period + 8 y |
| `quarantine` | Soft-deleted/expired docs awaiting purge approval | 50 MB | all above | inherited from source class | 30 d then purge |

Create with SQL (or dashboard, but SQL is reviewable/versionable):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tds', 'tds', false, 15000000,  array['application/pdf']),
  ('purchase-bills', 'purchase-bills', false, 25000000, array['application/pdf','image/jpeg','image/png','image/tiff']),
  ('sales-bills',    'sales-bills',    false, 25000000, array['application/pdf','image/jpeg','image/png','image/tiff']),
  ('gst',            'gst',            false, 25000000, array['application/pdf','image/jpeg','image/png']),
  ('contracts',      'contracts',      false, 25000000, array['application/pdf']),
  ('coa',            'coa',            false, 25000000, array['application/pdf','image/tiff']),
  ('hr',             'hr',             false, 15000000, array['application/pdf','image/jpeg','image/png']),
  ('bank',           'bank',           false, 50000000, array['application/pdf','image/tiff']),
  ('quarantine',     'quarantine',     false, 50000000, array['application/pdf','image/jpeg','image/png','image/tiff'])
on conflict (id) do nothing;
```

Note: MIME type is *also* magic-byte verified in the upload route handler (audit finding M8: today it trusts the client-declared type).

### 2.2 Path conventions encoding access class

```
{class}/{fy}/{doc-uuid}/v{n}/{logical-name}.{ext}
            └─ e.g. sales-bills/FY2025-26/9f6b2c11-…/v1/INV-0991.pdf
```

- Bucket + first path segment both encode the access class → storage policies and audit can reason about a class from the path alone.
- `doc-uuid` = `documents.id` → every object can be correlated back to its `documents` row, `document_acl` grants, and `doc_events` trail without a lookup table.
- `v{n}` = copy-on-write version (see §4.2). New version = new object, never overwrite: **Supabase Storage has no S3 versioning** (documented; deleted objects are permanently gone), so immutability is enforced by writing `v{n+1}` and flipping a pointer in Postgres. No upserts, no deletes on live paths — the only writer of old versions is the retention job.

### 2.3 Storage access: no public GET, and no direct authenticated GET either

All document access flows through the server runtime. `storage.objects` gets deny-everything policies for non-service roles:

```sql
-- Belt-and-braces at the database layer. Real access happens via the
-- route handler (service role), which performs its own per-document
-- authorization. Nothing here is the control — the handler is — but this
-- removes the "directly guess a path" attack surface entirely.
create policy "no direct reads"   on storage.objects for select using (false);
create policy "no direct inserts" on storage.objects for insert with check (false);
create policy "no direct updates" on storage.objects for update using (false);
create policy "no direct deletes" on storage.objects for delete using (false);
```

Guardrail against T3 (misconfiguration): a daily job asserts `public = false` and RLS-enabled on every bucket and on the access tables, and alerts (email + `doc_events` entry) if not:

```sql
-- pg_cron sweep, runs 03:00 IST daily
select cron.schedule('security-sweep-buckets', '0 3 * * *', $$
  insert into security_alerts(kind, detail)
  select 'PUBLIC_BUCKET', 'bucket is public: ' || id
  from storage.buckets where public
  on conflict do nothing;
$$);
```

### 2.4 Encryption strategy

**Decision: field/app-layer encryption for the five "crown jewel" classes (purchase-bills, sales-bills, gst, hr, bank); plaintext for tds, coa, contracts.** Keys live in **Supabase Vault** — never in the browser, never in Vercel env vars, never in the Tally ETL.

Why not transparent column encryption / pgsodium for the blobs:
- pgsodium (and its TCE) is **pending deprecation** on Supabase; the supported successor, **Vault**, stores *secrets*, not bulk files. Pushing MB-sized TIFFs through Postgres functions is the wrong tool.
- Vault's guarantee we *do* use: secrets are AEAD-encrypted on disk, the per-project root key is managed by Supabase outside the database, **and dumps/replication streams preserve ciphertext only** — which directly answers threat T5 (backup theft). A stolen dump yields encrypted keys; without the files it is useless.
- Therefore: **envelope encryption**. A 256-bit AES-GCM data key per class is generated and stored as a *secret* in Vault (`doc-key:purchase-bills`, etc.). Files are encrypted in the server runtime (Node `crypto`), where the key is fetched on demand per request via a narrowly-granted SECURITY DEFINER function — it is never held statically by Vercel, so a Vercel env leak or a compromised CI pipeline doesn't hand over the keyring.

```sql
-- One-time setup (dashboard or SQL):
select vault.create_secret(
  encode(gen_random_bytes(32), 'base64'),      -- the data key
  'doc-key:sales-bills', 'AES-256-GCM data key for sales-bills class'
);

-- Server runtime retrieves the key only when authorized:
create or replace function vault_key_for(p_class text)
returns text language sql security definer set search_path = public, vault as $$
  select decrypted_secret::text from vault.decrypted_secrets
  where name = 'doc-key:' || p_class
$$;
revoke all on function vault_key_for(text) from public;
grant execute on function vault_key_for(text) to service_role;
```

Encryption format (implemented once in `lib/crypto.ts`, used by upload + download):

```
blob = nonce(12) || authTag(16) || ciphertext        # AES-256-GCM
AAD  = `${docId}:${version}:${className}`            # binds ciphertext to its row
```

- sha256 is taken over the **plaintext** at upload and stored on the version row; verified after decrypt at download (tamper evidence, §4.3). AES-GCM already authenticates; sha256 additionally covers the plaintext classes and enables cross-version diffing.
- Tally ETL uploads also encrypt server-side: the Tally box uploads plaintext over TLS to the upload endpoint, the endpoint encrypts. **The Tally machine and the office LAN never see a key.**
- Escrow: the root of the decision tree is the Vault root key (Supabase-managed). Additionally keep one encrypted copy of each `doc-key:*` secret (a `supabase db dump` + gpg) on the office NAS and one HDD in the company bank locker, so data is recoverable even if Supabase account access is lost. Document the locker holder in the IR roster (§6).

Trade-off accepted: crown-jewel docs can't be previewed by Supabase's image/CDN transforms and each download costs one decrypt in the runtime. With 25 MB caps and low volume this is trivial; if scanning grows, revisit chunked streaming.

### 2.5 Download gate: server-side redirect/stream endpoint

**No public GET on any bucket, no signed URL ever handed directly to the UI for protected classes.** Two serving modes:

1. **Encrypted classes (crown jewels): server-side stream.** The route handler fetches the object with the service role, decrypts, verifies sha256, and streams the bytes back. A signed URL never exists, so T2 (leak) has nothing to leak, the Smart CDN cache is irrelevant, and every byte served is provably requested by an authenticated ACL holder.
2. **Plaintext classes (tds, coa, contracts): short-lived redirect.** `createSignedUrl(..., 45, { download: true })` — TTL ≤ 60 s, always with a fresh `cacheNonce` because Smart CDN independently caches each signed URL's response and **can serve it past token expiry** until the object's `cacheControl` TTL passes. Therefore upload plaintext classes with `cacheControl: '0'` (or the lowest the CLI accepts) and add `no-store` on the redirect response. `tds` keeps its existing public-ish flow, TTL reduced from 15 min to 60 s.

Rule: **audit before issue** — the `doc_events` row for `download_ok` is written *before* the URL/bytes are produced (a crash-safe ordering that guarantees no silent access).

```ts
// app/api/documents/[docId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';   // user session (cookies), never service role
import { createAdminSupabase } from '@/lib/supabase/admin';      // service role, server-only module
import { decryptDoc, sha256Hex } from '@/lib/crypto';            // AES-256-GCM + plaintext hash
import { bucketFor, isClassReader } from '@/lib/document-policy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ docId: string }> }) {
  const sb = createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { docId } = await ctx.params;

  // 1) Deny-by-default: row must exist AND be visible to this caller
  const { data: doc } = await sb.from('documents')
    .select('id, doc_class, encrypted, logical_name')
    .eq('id', docId).in('status', ['active', 'superseded', 'legal_hold']).single();
  const { data: acl } = await sb.from('document_acl')
    .select('level').eq('doc_id', docId).eq('subject_email', user.email).maybeSingle();
  if (!doc || (!acl && !(await isClassReader(sb, doc.doc_class, user.email)))) {
    await sb.rpc('log_doc_event', { p_doc: docId, p_action: 'download_denied',
      p_meta: { reason: 'no_acl', email: user.email, ip: req.headers.get('x-forwarded-for') } });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 2) Latest version pointer (immutable objects; version = copy-on-write)
  const { data: ver } = await sb.from('document_versions')
    .select('path, checksum_sha256, version')
    .eq('doc_id', docId).order('version', { ascending: false }).limit(1).single();
  if (!ver) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // 3) AUDIT BEFORE ISSUING — the access log is written before bytes leave the server
  await sb.rpc('log_doc_event', { p_doc: docId, p_action: 'download_ok', p_meta: {
    version: ver.version, ua: req.headers.get('user-agent'), ip: req.headers.get('x-forwarded-for') } });

  const admin = createAdminSupabase();

  // 4a) Crown jewels: stream server-side (no URL exists to leak; cache-neutral)
  if (doc.encrypted) {
    const { data: blob, error } = await admin.storage.from(bucketFor(doc.doc_class)).download(ver.path);
    if (error || !blob) return NextResponse.json({ error: 'storage' }, { status: 502 });
    const plain = await decryptDoc(blob, docId, doc.doc_class, ver.version);
    if (!plain || sha256Hex(plain) !== ver.checksum_sha256) {
      await sb.rpc('log_doc_event', { p_doc: docId, p_action: 'integrity_failure', p_meta: { version: ver.version } });
      return NextResponse.json({ error: 'integrity_mismatch' }, { status: 500 });
    }
    return new Response(plain, { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${doc.logical_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    }});
  }

  // 4b) Plaintext classes: short-TTL redirect with cache busting
  const { data: su } = await admin.storage.from(bucketFor(doc.doc_class))
    .createSignedUrl(ver.path, 45, { download: true, cacheNonce: String(Date.now()) });
  if (!su?.signedUrl) return NextResponse.json({ error: 'storage' }, { status: 502 });
  return NextResponse.redirect(su.signedUrl, {
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' },
  });
}
```

Upload is the mirror image: a Route Handler that (a) re-verifies the session + `uploader`/`admin` role, (b) magic-byte checks the MIME type, (c) encrypts if the class is protected, (d) inserts `documents` + `document_versions` + `document_acl` in one transaction before the storage write, (e) logs `upload`. The Tally ETL calls this same endpoint with an upload ticket (below, §5).

AI notes — if/when Claude-backed Q&A reads the corpus, it must go through this exact gate per document (see §3.5 of `VASANT_HUB_BLUEPRINT.md`): per-doc ACL applied, **no auto-contextualization of an entire class**, outbound traffic from the AI worker allowlisted to company endpoints only, and GSTIN/PAN masking before any payload leaves the tenant. That is the answer to T7.

---

## 3. Access Model

### 3.1 Roles

| Role | Can | Cannot |
|---|---|---|
| `admin` | everything incl. ACL grant, legal-hold, retention purge approval | (none — documented as head of family) |
| `approver` | read all classes, approve/reject pending docs, grant `view` on docs in own class set | upload directly; grant to `hr`/`bank` without admin |
| `uploader` | upload to assigned class set (Tally ETL token = uploader for `purchase-bills`/`sales-bills`) | read other people's docs beyond own ACL |
| `reader` | view/download docs where a per-doc ACL row exists | anything else |
| `family-viewer` | view class-wide rows in assigned groups (default: `sales-bills`, `gst`, `contracts`, `coa`; **never** `hr`/`bank`) | download without audit (they do get audit — same gate) |
| `ca` (external) | class-wide `gst`, `contracts`, plus docs the CA's own email is ACL'd on; expires at assignment end | touch `bank` unless individually ACL'd |

Identity = the Google OAuth email (`@vasantpetrochem.com` for family/employees, CA firm addresses for consultants). Every role change is a `doc_events` row.

### 3.2 Schema (deny-by-default)

```sql
create table app_users (
  email      text primary key,
  role       text not null check (role in ('admin','approver','uploader','reader','family-viewer','ca')),
  groups     text[] not null default '{}',          -- e.g. {'sales-bills','gst'}
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create type doc_class as enum ('tds','purchase-bills','sales-bills','gst','contracts','coa','hr','bank');

create table documents (
  id              uuid primary key default gen_random_uuid(),
  doc_class       doc_class not null,
  path            text not null unique,             -- '{class}/{fy}/{doc-uuid}/v{n}/file.pdf'
  logical_name    text not null,
  status          text not null default 'pending'
                  check (status in ('pending','active','superseded','soft_deleted','legal_hold','quarantined')),
  legal_hold      boolean not null default false,
  encrypted       boolean not null default false,
  checksum_sha256 text not null,
  size_bytes      bigint not null check (size_bytes > 0),
  version         int not null default 1,
  retention_until date not null,
  metadata        jsonb not null default '{}'::jsonb,  -- vendor GSTIN, PAN, FY, doc number
  created_by      text not null references app_users(email),
  created_at      timestamptz not null default now()
);

create table document_versions (
  doc_id          uuid not null references documents(id) on delete cascade,
  version         int  not null,
  path            text not null unique,             -- immutable object; copy-on-write only
  checksum_sha256 text not null,
  size_bytes      bigint not null,
  uploaded_by     text not null,
  created_at      timestamptz not null default now(),
  primary key (doc_id, version)
);

-- Per-document grants (explicit, expiry-capable)
create type acl_level as enum ('view','approve','upload');
create table document_acl (
  id            uuid primary key default gen_random_uuid(),
  doc_id        uuid not null references documents(id) on delete cascade,
  subject_email text not null,
  level         acl_level not null default 'view',
  granted_by    text not null,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (doc_id, subject_email)
);

-- Class-wide grants (family-viewer / CA groups) — never hr/bank by default
create table class_acl (
  doc_class     doc_class not null,
  subject_email text not null,
  level         acl_level not null default 'view',
  granted_by    text not null,
  created_at    timestamptz not null default now(),
  primary key (doc_class, subject_email)
);

-- RLS — visibility = per-doc ACL OR class ACL OR admin/approver
alter table documents enable row level security;
create policy "visibility = acl match or class acl match"
  on documents for select
  using (
    status <> 'quarantined'
    and (
      exists (select 1 from document_acl a
              where a.doc_id = id and a.subject_email = auth.jwt() ->> 'email')
      or exists (select 1 from class_acl c
              where c.doc_class = doc_class and c.subject_email = auth.jwt() ->> 'email')
      or exists (select 1 from app_users u
              where u.email = auth.jwt() ->> 'email' and u.role in ('admin','approver'))
    )
  );

alter table document_acl enable row level security;
create policy "acl visible to subjects and admins"
  on document_acl for select
  using (
    subject_email = auth.jwt() ->> 'email'
    or exists (select 1 from app_users u where u.email = auth.jwt() ->> 'email' and u.role = 'admin')
  );

-- Nobody mutates or deletes ACL/grant rows through the API:
create policy "no direct acl writes" on document_acl for insert with check (false);
create policy "no direct acl deletes" on document_acl for delete using (false);
-- Grant/revoke only via the security-definer RPC `acl_grant()` (validates the granter's role).
```

This directly fixes audit finding **C1** (authorization tied to the `authenticated` role instead of identity): every decision keys off the *email claim* in the JWT plus these tables; the `authenticated` role itself carries nothing.

### 3.3 Append-only audit (fixes M2)

```sql
create table doc_events (
  id          bigint generated always as identity primary key,
  doc_id      uuid references documents(id) on delete set null,
  actor_email text not null,
  action      text not null check (action in
              ('upload','download_ok','download_denied','approve','reject','supersede',
               'soft_delete','legal_hold_set','legal_hold_clear','integrity_failure',
               'acl_grant','acl_revoke','retention_quarantine','retention_purge','security_alert')),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Append-only at the GRANT level (RLS cannot stop TRUNCATE — see audit C3):
alter table doc_events enable row level security;
create policy "append only" on doc_events for insert with check (true);
create policy "read by admin/approver/auditor" on doc_events for select
  using ((select role from app_users where email = auth.jwt() ->> 'email') in ('admin','approver'));
revoke update, delete, truncate on doc_events from anon, authenticated;
-- (kept: postgres/service_role are the only writers besides the function below)

-- The only write path, so actor is always the caller's verified email:
create or replace function log_doc_event(p_doc uuid, p_action text, p_meta jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_action !~ '^[a-z_]+$' then raise exception 'invalid action'; end if;
  insert into doc_events(doc_id, actor_email, action, meta)
  values (p_doc, coalesce(auth.jwt() ->> 'email', 'service'), p_action, coalesce(p_meta, '{}'));
end $$;
revoke all on function log_doc_event(uuid, text, jsonb) from public;
grant execute on function log_doc_event(uuid, text, jsonb) to authenticated, service_role;
```

Every meaningful event is also a UI surface: the admin dashboard gets a "recent document activity" view = `select * from doc_events order by id desc limit 200`. A weekly digest email (pg_cron) summarizes downloads per actor per class — the family's early-warning radar for T4/T9.

---

## 4. Retention & Tamper Evidence

### 4.1 Legal retention schedule (India)

| Class | Statutory floor | System default `retention_until` | Notes |
|---|---|---|---|
| purchase-bills, sales-bills | CGST Act §36(2): **72 months from the GSTR-9 due date**(≈7 calendar years); IT Rule 6F(5): 6 years from end of AY | FY + **8 years** covers both | Rule 56(16) requires invoices/challans preserved per §36 |
| gst (returns, notices, e-way bills) | same §36(2) | FY + 8 years | **Notices/assessments → `legal_hold` until final disposal + 1 year** (proviso to §36) |
| contracts | Limitation Act: 3 years (written contract); registered/indemnities longer | termination + 8 years | hold until indemnity period lapses |
| coa / msds | product-liability evidence; no fixed statute | 6 years | shared with customers, low sensitivity |
| tds | none (public spec sheets) | 3 years | |
| hr | DPDP purpose-limitation; Aadhaar minimization rule — **store masked copies only** | employment end + 7 years | Aadhaar: keep masked; PAN copies tied to IT assessment window |
| bank | audit evidence for IT assessments | period + 8 years | |

Because both GST (anchored to GSTR-9 due date: 31 Dec of the following FY) and IT (anchored to AY end) run differently, the safe family rule is **"financial year + 8 calendar years"** for every tax/accounting class, computed once at upload (`retention_until`), extended automatically when a document is attached to an assessment/litigation via `legal_hold`. Purge requires an approver click — never automatic destruction.

### 4.2 Versioning: copy-on-write

- A document's head version = `documents.version` → `document_versions.path` for that version. New scan/bill re-upload writes `{doc-uuid}/v{n+1}/...` as a **new object**; previous objects are never touched (they may be `superseded` in metadata).
- Rationale: Supabase Storage ships **no object versioning** (S3 API reports `Status: Suspended`; deleted objects are gone). Copy-on-write is the only version safety net, and it interoperates with retention: old versions are kept until the *document's* `retention_until`, so "replaced bill" incidents can always be reconstructed.

### 4.3 Tamper evidence

- `checksum_sha256` per version: sha256 of the plaintext at upload time; re-verified at every download (encrypted classes post-decrypt, plaintext classes pre-redirect — a cheap `SHA256` of the stream in the handler).
- AES-GCM additionally authenticates ciphertext; AAD binds it to `docId:version:class` so ciphertext can't be replayed across rows (this is the T5-relevant property: even a forensic attacker *with* DB access cannot forge).
- Mismatch ⇒ `integrity_failure` in `doc_events` ⇒ alert email + the row is moved to `quarantined`; a quarantine is *visible* to admin (so it can't be used as a silent-censorship channel).

### 4.4 Soft-delete, legal hold, quarantine, backups

```sql
-- nightly sweep: expired + not on hold → quarantine (never immediate purge)
select cron.schedule('retention-quarantine', '0 2 * * *', $$
  update documents
     set status = 'quarantined'
   where status in ('active','superseded','pending')
     and legal_hold = false
     and retention_until < now()
$$);
```

- `legal_hold` is sticky: only `admin` can set/clear via a SECURITY DEFINER RPC that logs `legal_hold_set/clear`; cleared holds get a 30-day grace (quarantine, then a second approver prompts purge).
- Backups (3-2-1, answering T5):
  - **Supabase**: enable **PITR** (paid add-on; hourly snapshots, 7-day history) *before* going live — it only helps future incidents; on free plan you get daily backups only. Same-project restores keep the Vault root key (decryptable); note migrate-to-new-project needs the root key copied via the Management API.
  - **Offsite copy of Storage**: nightly S3-API sync of all buckets (storage exposes an S3 endpoint; `aws s3 sync …`) to the office NAS, gpg-encrypted; quarterly copy of the NAS archive to a bank-locker HDD.
  - **Postgres**: nightly `supabase db dump | gpg --encrypt` to NAS + quarterly offsite. Dumps contain Vault ciphertext only — a stolen dump alone still can't read the keys (Vault property), and the files aren't in the dump at all. Both halves are required to decrypt anything, and both halves live in *separate* failure domains.

---

## 5. Office & Tally Machine Hardening (T8)

The Windows box running Tally Prime will also run the ETL export. Treat it as a crown-jewel device, not a normal office PC:

1. **Full-disk encryption**: BitLocker + TPM 2.0 on, recovery key printed and kept in the locker (not on the same LAN). Verify with `manage-bde -status`.
2. **Accounts**: one locked-down daily-driver account, one separate **local admin** account whose password only the owner knows; no shared logins (today: shared — fix first). UAC at maximum; standard user for Tally itself.
3. **RDP**: never exposed. No port 3389 on the router; remote access only via an overlay VPN (Tailscale/WireGuard) on the admin account. LAN firewall: only machine-to-machine rules needed (NAS backup shares, printer).
4. **Network egress allowlist**: Tally needs tally.net updates + GST portal + email; the ETL needs exactly one endpoint: the company's upload endpoint (`/api/documents/upload`). Everything else blocked at the router/Windows Firewall. This also kills data-exfiltration paths for anything the machine holds.
5. **Antivirus / hardening**: Windows Defender on + scheduled full scans; **AppLocker/SRP allowlist** for executables; disable USB autorun, restrict removable storage to admin account; no admin-era web browsing on this box (keylogger surface); monthly patch cadence; BIOS password.
6. **3-2-1 of Tally data**: Tally's own backup job → NAS nightly; NAS → offsite cloud (or second drive rotated weekly); quarterly archive to locker HDD. Test a restore quarterly — a backup that has never been restored is a hypothesis, not a backup.
7. **Offline-first ETL**: the exporter runs when offline (Tally computers often are); it queues signed documents in a local folder and uploads when connectivity returns. Upload credential = a **short-lived upload ticket** issued by the app to the machine's identity: ticket grants exactly "uploader on purchase-bills/sales-bills", expires after N minutes / one batch; no long-lived service key ever sits on the office PC.
8. **Who has access**: two named people (owner + one family member); CA/Tally consultant gets a *VPN seat to the app*, never a login on the machine; the consultant's uploads flow through their own Google identity so the audit trail separates them (T4/T8 friendly).

---

## 6. Incident Response Playbook — "We got breached" 30-minute runbook

Assumes the worst: a download you can't explain, a phished Google account, a leaked URL, a public bucket flag, a ransom note, an "AI said something it shouldn't" report. **Whichever it is, run the same five phases.**

### 6.1 Freeze (minutes 0–10) — assume compromise until proven otherwise

| Action | Where | Command / click |
|---|---|---|
| Revoke Supabase sessions | SQL | `delete from auth.sessions;` (or Management API per user) |
| Block new logins | SQL | `update auth.users set banned_until = now() + interval '1 hour'` (then unbind users individually) |
| Kill the Google session | Google account security | "Sign out all other devices" + force password change; if Google Workspace: admin console → force sign-out all sessions |
| Rotate the service-role key | Supabase dashboard | Project → Settings → API → rotate service_role (**old key stops working immediately**) |
| Ship to the browser keys | Vercel | Rotate any env var that touches Supabase (anon is publishable; rotate anyway) |
| Kill bucket `public` flags (belt & braces) | SQL | `update storage.buckets set public = false;` |
| Disable AI features / external model access | app | Flip the AI-layer feature flag off (see blueprint §3.5); cut outbound allowlist to nothing |
| Isolate the Tally machine | physical LAN | Unplug from router / disable its VPN tunnel; change local admin passwords |
| Record the moment | docs | Note `T0`; the audit trail (doc_events, auth events, storage `last_accessed_at`) is timestamped against it. **Do not delete anything.** |

### 6.2 Assess (minutes 10–25)

1. `select * from doc_events where created_at >= $T0 - interval '14 days' order by id desc limit 500;` — look for `download_ok` rows with unfamiliar actors/agents/IPs, or any `download_denied` surge (probing).
2. `select * from storage.objects where last_accessed_at >= $T0 …` per bucket — which objects left, which classes.
3. Auth events: `select * from auth.audit_log_entries order by created_at desc limit 200;` — sign-in IPs, providers.
4. **Is PITR on?** If yes, note the flutter-safe restore point (`$T0 - 1h`). If not, you're on daily backups — note the last one.
5. Tally machine: check for the malware vector (AV logs, PowerShell history) **before** reconnecting.
6. Classify severity: (a) single doc URL leaked → low-medium; (b) class-wide (public bucket, stolen admin) → high; (c) storage backup / DB dump stolen → critical. The playbook branches follow: critical cases jump to §6.3 immediately and involve counsel.

### 6.3 Notify (minutes 25–40; legal, then ethical)

- **Customers** — if invoices/bills/COAs were exposed: the invoice contains customer GSTIN, names, values; notify the affected counterparties in writing. This is both ethical and commercially necessary; do it through the CA to keep it measured.
- **GST/IT authorities** — no statutory duty to report *document theft* per se, but: (a) if GSTR/E-invoice *filing data* was accessed or could be tampered, have the CA verify filings and (if tampering is credible) involve the jurisdictional officer proactively; (b) PAN-copy exposure → keep the CA's advice on record.
- **DPDP Act 2023** — since employee data, possibly Aadhaar-masked data, and customer data is in scope: where the breach is *likely to cause harm*, the Data Fiduciary must notify the Data Protection Board and affected persons (per the DPDP Rules). Confirm the current form/72-hour expectation with counsel before touching the portal. **This is why §3.3's append-only log matters: you can prove what was and wasn't accessed.**
- **Insurers** — cyber policy (if any), loss-of-data; family principals and the locker-key holder.
- **Not a press release.** Keep it to affected parties + regulators; a written incident note for `audit.md` and the family WhatsApp.

### 6.4 Recover

1. Quarantine → restore: restore affected objects from the NAS/offsite copies or PITR point (`$T0 - 1h`); use the `document_versions` copy-on-write paths so nothing overwrites evidence.
2. Re-key: create fresh `doc-key:*` secrets in Vault, re-encrypt the affected classes (background job), then retire old keys — backup theft after rotation reads gibberish even if decrypted.
3. Re-provision: new service-role key, new Google passwords with hardware-key 2FA enforced, re-onboard the Tally machine (reissue ticket, re-key its file staging).
4. Re-enable in order: storage → app → Tally ETL → AI layer (each after a smoke test of the download gate).

### 6.5 Post-mortem checklist (within 7 days)

- Which of T1–T9 was it, and which two controls failed? (Design rule: if only one control was protecting it, that's the finding.)
- Was `doc_events` complete for the window? Was `download_ok` written before bytes left? Any gaps = log-before-issue not honored.
- `storage.buckets` audit: did the guardrail job fire before the incident?
- Were backups restorable? (Test restore actually performed.)
- New runbook accuracy: did the named people know T0 procedures? (Drill the 30-minute runbook twice a year; it takes 35 minutes.)
- Fines avoided/owed, notifications sent, evidence preserved for ITAT/GST appeals if applicable.
- Update `audit.md` with the incident; open issues for the gaps; schedule re-test in 90 days.

---

## 7. Rollout Order (small increments, each leaves a safe system)

1. **Fix today's criticals** (from `audit.md`): MFA/2SV enforcement on Google + hardware key for admins; C3 truncate grants; append-only `doc_events` + `log_doc_event`; magic-byte MIME check; branch protection + make repo private.
2. **Ship the schema** (§3.2/§3.3) with the download gate (§2.5) for the existing `tds` flow only.
3. **Migration** of `tds` documents to `tds/…` paths; onboard `contracts` and `coa` as plaintext classes (low risk, big volume).
4. **Enable Vault + envelope encryption**; onboard `sales-bills`/`purchase-bills` from Tally ETL (upload ticket, offline queue).
5. Onboard `gst`, then `hr` (masked Aadhaar), then `bank` (step-up: require re-auth on the Google side for these classes).
6. Standing operations: PITR add-on enabled before step 4; nightly S3 sync + `db dump` to NAS; weekly audit digest; quarterly restore drill; 2×/year IR drill.

**Control-to-threat map (the "no single breach" proof):** T1 (stolen session) ← MFA + short sessions + per-doc ACL + audit; T2 (leaked URL) ← 45–60s TTL + `no-store` + server-side streaming for crown jewels; T3 (public bucket) ← deny-all storage policies + nightly guardrail sweep; T4 (insider) ← identity-keyed ACL + class ACLs + append-only audit; T5 (backup theft) ← Vault ciphertext-only dumps + encrypted offsite copies + envelope keys split across failure domains; T6 (phishing) ← hardware-key 2SV + session revocation runbook; T7 (AI injection) ← per-doc gate + no auto-context + egress allowlist; T8 (Tally box) ← FDE + allowlisted egress + upload tickets, no keys on the box; T9 (link sharing) ← short TTL + audit trail that makes it visible, low impact per link. The only residual "all documents" scenario requires *simultaneous* compromise of Google + Vercel + Supabase — a different order of attack, and the backup copies in the locker still answer it.