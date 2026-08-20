# Security Audit — Vasant PetroChem Web + Supabase Backend

Audited: 2026-08-16. Scope: Next.js app (this repo), Supabase project `vasant-petrochem` (ref `jwycpgugyapkihuikrwl`, ap-south-1), Vercel deployment, GitHub repo.

Severity: CRITICAL / HIGH / MEDIUM. Each finding includes remediation that can be executed directly.

---

## CRITICAL

### C1 — RLS trusts the `authenticated` *role*, not the admin identity

**Problem.** The admin email allowlist (`lib/admin-auth.ts`, enforced in `proxy.ts` + `app/auth/callback/route.ts`) only protects the Next.js routes. The Supabase database itself grants blanket powers to the `authenticated` role:

| Table / bucket | Policy | Grant |
|---|---|---|
| `public.products` | `authenticated can manage products` | ALL, `qual true` |
| `public.quote_requests` | `authenticated can read quote_requests` | SELECT all rows (customer PII) |
| `public.quote_requests` | `authenticated can update quote_requests` | UPDATE all rows, any column |
| `public.tds_requests` | `authenticated can read tds_requests` | SELECT all rows (visitor emails) |
| `storage.objects` | `authenticated can manage tds files` | ALL on whole `tds` bucket |

Anyone who can create an `authenticated` session *directly against Supabase* (not through the site) gets full customer PII and full CRUD over products/TDS files. Email/password signup is plausibly enabled (leaked-password-protection advisory is disabled, suggesting the provider is configured), and `products` has *two* permissive SELECT policies for `authenticated` (`authenticated can manage products` + `public can read published products`).

**Remediation (SQL, apply via migration):**

1. Create an admin allowlist readable by RLS (do NOT put emails in policy SQL directly — keep them in a table so revocation is immediate):

```sql
create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);
insert into public.admin_users (email) values ('arrunabh.s@gmail.com')
on conflict (email) do nothing;
```

2. Replace every role-based policy with identity-based ones:

```sql
-- products: anon/authenticated read published only
drop policy if exists "authenticated can manage products" on public.products;
drop policy if exists "public can read published products" on public.products;
create policy "anyone can read published products"
  on public.products for select
  using (published = true);
create policy "admin can manage products"
  on public.products for all
  using (exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email'));

-- quote_requests: anon can insert; admin can read/update; nobody else
drop policy if exists "anon can submit quote requests" on public.quote_requests;
drop policy if exists "authenticated can read quote requests" on public.quote_requests;
drop policy if exists "authenticated can update quote requests" on public.quote_requests;
create policy "anon can submit quote requests"
  on public.quote_requests for insert to anon
  with check (true);
create policy "admin can read quote requests"
  on public.quote_requests for select
  using (exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email'));
create policy "admin can update quote requests"
  on public.quote_requests for update
  using (exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email'));

-- tds_requests: anon can insert; admin can read
drop policy if exists "anon can log tds requests" on public.tds_requests;
drop policy if exists "authenticated can read tds requests" on public.tds_requests;
create policy "anon can log tds requests"
  on public.tds_requests for insert to anon
  with check (true);
create policy "admin can read tds requests"
  on public.tds_requests for select
  using (exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email'));

-- storage: admin only for tds bucket objects
drop policy if exists "authenticated can manage tds files" on storage.objects;
create policy "admin can manage tds files"
  on storage.objects for all
  using (bucket_id = 'tds'
    and exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email'))
  with check (bucket_id = 'tds'
    and exists (select 1 from public.admin_users where email = auth.jwt() ->> 'email'));
```

3. Revoke blanket `authenticated` grants as defense-in-depth (verify app still works after):

```sql
revoke all on public.products from authenticated;
revoke all on public.quote_requests from authenticated;
revoke all on public.tds_requests from authenticated;
```

4. Keep the app-layer allowlist (`lib/admin-auth.ts`) as-is — it is still needed to gate UI routes. Optionally read `admin_users` instead of env vars by making `lib/admin-auth.ts` async and querying the table, so revocation is instantaneous without redeploy.

**Test after applying:** unauthenticated session can read only published products and insert quote/tds rows; a throwaway authenticated session gets 0 rows / 403 on everything; admin Google session works end to end.

### C2 — GitHub repository is PUBLIC

**Problem.** `github.com/Arrunabh-Singh/vasant-petrochem-web` is public (visibility PUBLIC). The app's auth architecture, env var layout, and all code are exposed. GitHub Advanced Security (secret scanning) is NOT enabled.

**Remediation:**
1. `gh repo edit Arrunabh-Singh/vasant-petrochem-web --visibility private`
2. Post-change, scan the repo history for leaked values (`.env*` was gitignored but verify no key got committed in early commits; `git log --all -p -- .env` showed none in the checked history — still verify).
3. Enable secret scanning / push protection:
   - Repo Settings > Code security and analysis > Enable "Secret scanning", "Secret scanning push protection" (da will show as Advanced Security).
4. Rotate any key that ever touched the repo. Candidates to rotate regardless: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set on Vercel/Supabase (publishable keys are low-risk but the project ref is public knowledge now).

---

## HIGH

### H1 — Single Google account = full admin, no MFA

`ADMIN_ALLOWED_EMAILS=arrunabh.s@gmail.com` is the only admin. Compromise of that account = full customer PII + site takeover.

**Remediation:**
- Enable Google 2-Step Verification on the account (hardware key preferred) — Google account security settings.
- Prefer enforcing via Google Workspace (2SV enforced org-wide) when the business moves to staff accounts.
- Consider adding Supabase MFA for the admin session (TOTP via `auth.mfa`) as a second layer independent of Google.

### H2 — Email enumeration on the admin login page

`app/admin/login/page.tsx` shows "That Google account isn't authorized for admin access" (`not_authorized`) — confirms the admin email to anyone who tries it.

**Remediation:** show one generic message for both cases, e.g. "Sign-in failed. If you are the administrator, contact support." Remove the `not_authorized` branch or map it to the generic message. Keep server-side behavior unchanged.

### H3 — No rate limiting on public form submissions

`app/actions/quote.ts` and `app/actions/tds.ts` insert into `quote_requests` / `tds_requests` with only a honeypot guard; no rate limiting at app or DB layer. Spam bots can flood the tables (and the inbox of anyone reading leads).

**Remediation:**
- Add a rate-limit check in the actions: Supabase `quote_requests` — count recent rows from this IP (requires ip column) or simpler: enforce a per-email/per-hour cap in SQL via a check on `count(*)` window — practical approach: add `ip` + `created_at` columns and a `BEFORE INSERT` trigger on both tables rejecting > N rows per IP per hour (e.g., 10). Do this in a migration:

```sql
create or replace function public.prevent_spam() returns trigger as $$
begin
  if new.ip is not null
     and (select count(*) from public.quote_requests
          where ip = new.ip and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate limit exceeded';
  end if;
  return new;
end $$ language plpgsql security definer;
create trigger quote_rate_limit before insert on public.quote_requests
  for each row execute function public.prevent_spam();
```

  (same for `tds_requests`; requires adding `ip text` column and passing `x-forwarded-for` from the actions). Note: `security definer` function referenced must not be copy-pasted blindly — adapt for tds_requests.
- Alternative lighter approach: server-side Redis/Upstash rate limit in the action; DB trigger is preferred here as it survives app bugs.

### H4 — Missing security headers

`next.config.ts` is empty; production responses have no CSP, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy`. The root HTML also returns `access-control-allow-origin: *` (Vercel default for some paths).

**Remediation:** add to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        // Strict CSP — refine allowed sources after testing (Google OAuth redirects, images, fonts)
        { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      ],
    }];
  },
};
```

Add `Cross-Origin-Opener-Policy: same-origin` (verify no popup flows depend on it).

---

## MEDIUM

### M1 — OAuth redirect origin trusts `x-forwarded-host`

`app/actions/auth.ts:12-14` builds the redirect URL from `x-forwarded-host`/`host` headers. On Vercel the proxy sets this safely, but on any other host it is attacker-influenceable (host header injection → OAuth code exfiltration via malicious redirect URL).

**Remediation:** validate against a hardcoded allowlist before using:

```ts
const ALLOWED_ORIGINS = ["https://vasantpetrochem.com", "https://vasant-petrochem-web.vercel.app", "http://localhost:3000"];
// if (new URL(origin).href not in ALLOWED_ORIGINS) -> use production origin instead
```

Do NOT put the protocol/host in a signed redirect spot without this check. Also confirm the Supabase Google provider "Additional redirect URIs" only contains the real domains.

### M2 — No audit logging of admin actions

Product updates (`app/actions/products.ts`), lead status changes (`app/actions/leads.ts`), TDS sign-ins, signed-URL issuance — nothing is logged. A security-first hub must have a trail.

**Remediation:** create `public.audit_log` (id, actor_email, action, entity, entity_id, meta jsonb, created_at) with RLS admin-only read/write, and `INSERT` from each admin server action (use the server client's `auth.getUser()` for actor). Also add `updated_at`/`version` columns to `products`/`quote_requests` for change tracking.

### M3 — No CHECK constraints on public tables

`quote_requests.status` accepts arbitrary strings via `updateLeadStatus`; no length caps on name/email/message; `tds_requests` accepts any email/product id.

**Remediation (migration):**

```sql
alter table public.quote_requests
  add constraint quote_status_check check (status in ('new','contacted','quoted','won','lost'));
alter table public.quote_requests
  add constraint quote_len_check check (
    char_length(name) between 1 and 200
    and char_length(email) between 3 and 320
    and char_length(message) <= 5000
  );
alter table public.tds_requests
  add constraint tds_email_check check (char_length(email) between 3 and 320);
alter table public.tds_requests
  add constraint tds_product_fk foreign key (product_id) references public.products(id);
create index if not exists quote_requests_product_id_idx on public.quote_requests(product_id);
create index if not exists tds_requests_product_id_idx on public.tds_requests(product_id);
```

### M4 — `tds` bucket has no size/MIME limits

`storage.buckets` shows `file_size_limit: null`, `allowed_mime_types: null`. With C1's storage policy that meant anyone `authenticated` could host arbitrary files.

**Remediation (after C1):**

```sql
update storage.buckets
set file_size_limit = 10485760,            -- 10 MB
    allowed_mime_types = array['application/pdf']
where id = 'tds';
```

### M5 — Server actions rely solely on RLS for authorization

`updateLeadStatus` validates status only via TypeScript type. If the caller has any `authenticated` session (pre-C1: anyone), arbitrary values flow in. Post-C1 this is blocked by identity policy; keep M3's CHECK as the backstop.

**Remediation:** after C1 + M3, no code change strictly needed. Optional hardening: validate `status` in the action against the `LeadStatus` union before calling Supabase.

### M6 — Supabase advisor findings (performance, project-level)

- Leaked password protection disabled (auth config) → enable in Dashboard > Auth > Security, and **disable email/password signup** (Auth > Providers > Email: uncheck "Allow new users to sign up") since admins authenticate via Google only.
- Unindexed FKs `quote_requests_product_id_fkey`, `tds_requests_product_id_fkey` → covered by M3 indexes.
- Unused index `quote_requests_status_idx` → drop after confirming queries (admin dashboard filters by status rarely) or keep if planned.
- Multiple permissive SELECT policies on `products` for `authenticated` → resolved by C1 policy rewrite.

---

## Post-fix verification checklist

1. Incognito: site loads, quote form submits, TDS gate issues signed URL (requires `SUPABASE_SERVICE_ROLE_KEY` set in Vercel env — verify it exists: currently `lib/supabase/admin.ts` throws if unset, and TDS downloads silently fail otherwise).
2. Login with admin Google account → /admin works; logout → /admin redirects.
3. Attempt a direct Supabase anon/signup session → all tables return empty/403 except published products + own inserts.
4. `curl -sI https://<site>/` shows the new security headers.
5. `gh secret` / `git log --all -p` sweep for any leaked credentials; rotate publishable + service-role keys if anything was ever committed or shared.

## Out of scope (roadmap — advisory only)

Phase 0 hardening (above) is prerequisite for: Tally Prime → Postgres ETL and bills warehouse, Claude-accessible AI layer (read-only SQL + scoped action tokens, identity-based RLS, full audit trail), live factory IoT dashboard (MQTT → edge pipeline → realtime UI, isolated control plane), GST reconciliation, inventory/party-health intelligence. Build sequencing to be planned separately.
---

## ROUND 2 — Deep audit (2026-08-16, 3 parallel subagents + direct DB probes)

Round 1 confirmed. Round 2 adds app-layer (F-xx), infra (I-xx), and database grants findings. `npm audit` is clean (0 vulns, 444 packages); no secrets anywhere in git history (verified via `git log --all -p`, `git fsck`); Vercel preview deployments are SSO-protected; TLS valid; no subdomain-takeover candidates. Remaining new findings:

## CRITICAL

### C3 — Table-level grants give `anon` and `authenticated` full privileges, including TRUNCATE (which RLS does not cover)

Verified via `information_schema.role_table_grants`: on `products`, `quote_requests`, and `tds_requests`, both `anon` and `authenticated` hold INSERT, UPDATE, **DELETE, TRUNCATE**, REFERENCES, TRIGGER. RLS row-policies happen to filter most of this today, but **TRUNCATE bypasses RLS entirely**, and any accidentally permissive policy (or RLS regression) immediately escalates to full table control from an anonymous/unauthenticated connection.

What if un-fixed: a future policy mistake, SQL-injection bug, or publishing mistake turns anon into table-destroyer with zero RLS protection on TRUNCATE.

Remediation (migration, run after C1 so admin flows still work):

```sql
revoke all on public.products from anon, authenticated;
revoke all on public.quote_requests from anon, authenticated;
revoke all on public.tds_requests from anon, authenticated;

-- Re-grant the absolute minimum; RLS still filters rows:
grant select on public.products to anon, authenticated;
grant insert on public.quote_requests to anon;
grant insert on public.tds_requests to anon;
grant select, update on public.quote_requests to authenticated;
grant select on public.tds_requests to authenticated;
-- products write for admins is enforced entirely by the identity policy (C1);
-- grant update, insert, delete on public.products to authenticated
--   only if the C1 admin policy pattern is confirmed working, else rely on service role via a secure function.
```

Also revoke harmful grants defensively:
```sql
-- keep sequences limited
revoke all on all sequences in schema public from anon, authenticated;
```

## HIGH

### C4 — Supabase session cookies: readable by JS, not Secure, 400-day lifetime

`@supabase/ssr` defaults (`node_modules/@supabase/ssr/dist/module/utils/constants.js`): `httpOnly: false`, no `Secure`, `maxAge: 400*24*60*60`. Neither `lib/supabase/server.ts` nor `lib/supabase/middleware.ts` passes `cookieOptions`, so the admin session cookie can be read by any client-side script (XSS amplifier), travels over the wire unguarded behind Vercel's redirect, and survives ~400 days — a revoked admin's cookie keeps authenticating at the Supabase API layer (proxy.ts only blocks the UI) for over a year.

Remediation — add to BOTH `createServerClient` calls (server.ts and middleware.ts):

```ts
cookieOptions: {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24, // 24h; short enough to make revocation real
}
```

Retest OAuth login + sign-out after applying.

### C5 — No SPF record on vasantpetrochem.com → anyone can spoof company email

`dig TXT vasantpetrochem.com` returns nothing. No MX either (domain can't receive mail). Coupled with `p=quarantine`/relaxed DMARC, an attacker can send customers/suppliers invoices "from" the company domain — the classic CEO-fraud / payment-redirect vector for a trading business whose customers wire money.

Remediation (DNS, via Cloudflare dashboard — NS is Cloudflare):
1. If the domain sends no mail today: `v=spf1 -all` (hard fail, no senders).
2. When Google Workspace is adopted: `v=spf1 include:_spf.google.com ~all`.
3. After SPF is aligned, tighten DMARC to `p=reject` and point `rua=`/`ruf=` to a company-owned mailbox (currently `dmarc_rua@onsecureserver.net` — third party!).
4. Publish MX + DKIM selectors once the domain should receive mail.

### C6 — No branch protection, no CI/CD, no Dependabot, no code scanning on GitHub

Verified via API: `main` unprotected (direct pushes), 0 workflow files, dependabot security updates disabled, no CodeQL. All commits from AI bots (Claude/Jules) appear `unverified`.

Remediation: Settings → Branches → add rule on `main`: require PR + 1 review + status checks. Enable Dependabot alerts + auto-updates (Settings → Code security → Dependabot). Enable CodeQL default setup. Enforce commit signing for future pushes (Settings → Rules → ruleset requiring signed commits).

## MEDIUM

### M7 — Admin server actions have no authorization check of their own (defense-in-depth gap)

`app/actions/products.ts`, `app/actions/leads.ts`, `app/actions/auth.ts` never re-verify `isAllowedAdminEmail(await supabase.auth.getUser())`. Access rests on proxy.ts matcher + RLS. Next.js server actions are callable by HTTP POST from any origin the browser can POST to (encrypted action IDs ship in JS bundles); with pre-C1 RLS, any authenticated session could invoke them.

Remediation: in each admin action, before touching DB:
```ts
const { data: { user } } = await (await createClient()).auth.getUser();
if (!isAllowedAdminEmail(user?.email)) throw new Error("Unauthorized");
```

### M8 — PDF upload trusts client-declared MIME type; no magic-byte check

`app/actions/products.ts:37` checks only `file.type === "application/pdf"` (spoofable). HTML/JS bytes can be stored as PDF and served via signed URLs.

Remediation: check `%PDF-` magic bytes server-side; enforce bucket `file_size_limit` (10 MB) and `allowed_mime_types = ['application/pdf']` (SQL in Round 1 M4).

### M9 — CSV formula injection in lead export

`app/components/admin/LeadsTable.tsx` `exportCsv` writes anon-submitted fields unescaped — a value starting with `=`, `+`, `-`, `@` executes as a formula when the admin opens it in Excel.

Remediation: prefix formula-leading cells with `'` (or tab) in `toCsvValue`; prepend `\ufeff` BOM.

### M10 — Cache invalidation gaps on publish/unpublish

- `opengraph-image` route for `/products/[slug]` is never revalidated (Next.js issue #62742: `revalidatePath(page)` does not refresh the OG image) → unpublished products keep serving social-previews until next deploy.
- Footer "Key Products" uses `getProducts()` but `/about`, `/contact`, `/industries` are never revalidated → stale/unpublished links persist on those pages.

Remediation: add `revalidatePath` calls for `/products/${slug}/opengraph-image`, `/about`, `/contact`, `/industries` in `updateProduct`, or adopt `revalidateTag("products")` with product queries tagged (cleaner), or `force-dynamic` on the product page.

### M11 — No runtime validation of `status` in `updateLeadStatus` + raw DB errors to users

`app/actions/leads.ts:7-10` writes any string; `throw new Error(error.message)` leaks raw DB text. Same class in `app/actions/products.ts:45,61`.

Remediation: whitelist `["new","contacted","quoted","won","lost"]` runtime check + DB CHECK constraint (Round 1 M3); return generic messages, `console.error` the detail.

### M12 — OAuth redirect origin trusts `x-forwarded-host`

`app/actions/auth.ts:12-14` (confirmed Round 1 M1). On Vercel the header is reliable, but harden anyway: validate against a fixed allowlist (`site.url` in `app/content.ts`, production URL, localhost) before building `redirectTo`.

### M13 — sign-out on revocation drops the cookie-clearing response

`lib/supabase/middleware.ts:40-47`: `supabase.auth.signOut()` clears cookies into the discarded `supabaseResponse`, then a fresh `NextResponse.redirect` is returned without the cleared cookies — browser keeps a stale session cookie client-side.

Remediation: set the cleared cookies (same names, `maxAge: 0`) on the redirect response itself; check `signOut()`'s error.

### M14 — JSON-LD `dangerouslySetInnerHTML` escape gap (stored-XSS precondition)

`app/(site)/products/[slug]/page.tsx:39-51`: `JSON.stringify` doesn't escape `<`/`>`/`&`; product name/description controlling `</script><script>` breaks out of the script context. Today data is admin-only, but after C1/C3 any single admin-write compromise becomes public-script-execution.

Remediation: escape before interpolation: `JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")`.

### M15 — `robots.txt` doesn't disallow /admin; no `security.txt`

Remediation: `robots.ts` add `disallow: ['/admin']`; add `/.well-known/security.txt` with a contact address.

### M16 — "We've logged your request and will email it" — no email is ever sent

`app/actions/tds.ts:33,43` promise an email that no code sends. Visitors hand over email PII to a dead sink on every TDS miss.

Remediation: either implement actual emailing (Supabase Edge Function + Resend/Postmark on missed TDS + new quotes) or change the copy to "we've logged your request — revisit this page later or call us."

## LOW / INFO

- **I-16** `access-control-allow-origin: *` present on production responses (harmless for static HTML today; forbid on any future JSON/API route).
- **I-17** Missing core security headers on production confirmed live: no CSP, no X-Frame-Options (admin/login is clickjackable), no X-Content-Type-Options, no Referrer-Policy. Remediation: `next.config.ts` headers block (Round 1 H4 SQL/code).
- **I-18** Login page email-enumeration message (Round 1 H2) — still open.
- **I-19** No audit logging of admin actions (Round 1 M2) — still open.
- **I-20** AI-authored commits all `unverified` (supply-chain hygiene) — require human review + signed commits.
- **I-21 (positive)** Vercel preview deployments protected by Vercel Authentication (SSO) — verified 302 to vercel.com/login. Custom-domain + production alias are the only public surfaces.
- **I-22 (positive)** Clean git history, no dangling objects, `audit.md` at repo root is untracked — do NOT commit it as-is (contains the admin email); redact or move to a private secret-management location if it must be committed.

## ROUND 2 SUMMARY — prioritized execution order
1. C3 revoke anon/authenticated table grants + TRUNCATE (30 min)
2. C4 secure session cookies (15 min)
3. C5 SPF DNS record — 5 min, do today
4. C6 GitHub branch protection + Dependabot + CodeQL (15 min)
5. M7 in-action auth checks (30 min)
6. M8–M16 (one day, grouped): magic bytes, CSV, cache invalidation, status validation, generic errors, cookie-clear fix, JSON-LD escape, robots/security.txt, TDS email fix
7. C2 repo privacy (1 min) — listed in Round 1, still open

---

## ROUND 3 — Second-pass code sweep + live API probes (2026-08-16)

## NEW FINDINGS

### M17 — OAuth callback route reflects request-derived origin in all three redirects
`app/auth/callback/route.ts:6,16,18,22` — same host-reflection class as M12, independent second instance, never flagged before. On Vercel edge-validated → admin can be bounced between canonical domain and `*.vercel.app` mirror (phishing-lite). Off Vercel → full open redirect on the auth endpoint.
Remediation: build redirect base from fixed allowlist (`site.url` + `http://localhost:3000`), fall back to `site.url`; apply to all three branches.

### M18 — PKCE verifier has no flow binding → deterministic multi-tab login self-DoS
`app/auth/callback/route.ts:11` `exchangeCodeForSession(code)` without `flowId`; `@supabase/auth-js` stores ONE legacy verifier key, overwritten per flow. Two parallel sign-ins (common) → both fail, verifier deleted → admin locked out until fresh attempt. **Verified: PKCE itself is sound** — login CSRF, code replay, state-doubling, duplicate-code params all non-exploitable. Reliability issue, not a bypass.
Remediation: forward `searchParams.get("sb_flow_id")` into `exchangeCodeForSession(code, { flowId })` or enable `appendPkceFlowIdToRedirects`.

### M19 — `tds_path` object keys shipped to anonymous visitors in public RSC payloads
`lib/products.ts:19-20` selects `tds_path` into every public page (home, /products, /products/[slug], contact, footer) → any visitor can enumerate exact private-bucket object names with curl+grep. Amplifies C1: an attacker with any authenticated session gets a complete filename list to hit without guessing.
Remediation: drop `tds_path` (and `display_order`) from the public `COLUMNS` projection; fetch `tds_path` only inside `app/actions/tds.ts` when minting the signed URL.

### M20 — Unvalidated JSONB `as`-casts crash the public catalog; fetch errors fail open to `[]`
`lib/products.ts:34,47` cast rows without shape checks. A NULL/non-array `specs`/`applications`/`industries` (admin pastes raw JSON; `app/actions/products.ts:27` only checks `Array.isArray`) throws on `[slug]/page.tsx:65,79,93,96`, `ProductCard.tsx:31,45`, and `ProductGrid.tsx:11` flatMap breaks the ENTIRE grid on one bad row → public 500s. `specs:[{}]` renders literal "undefined" text. `return []` on Supabase error silently blanks homepage+catalog on any outage.
Remediation: shape-validate after fetch (reject/coerce non-array), validate `{label,value}` shape in `updateProduct`, log-and-surface errors instead of `[]`.

### M21 — `quote.ts` stores unvalidated client-spoofable `sourcePage` + free-text `product`
`app/components/Contact.tsx:104,143` → `app/actions/quote.ts:26,29,43,46`. Any caller can post arbitrary `source_page` (e.g., `https://evil.example`) and `product_label`; persisted verbatim, served to admins, exported to CSV. No injection today (React-escaped, M9), but it is a persistent unvalidated echo that any future mail-template/email-send feature turns into a sink. Email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` accepts control chars/newlines.
Remediation: allowlist `sourcePage` (`/contact`, `/products/*`), cap lengths (M3 CHECKs), store `product_id` instead of free-text label, tighten email regex.

### I-23 (positive, verified live) — PostgREST OpenAPI/schema surface is locked
Probe: `GET /rest/v1/` with the publishable key → `401 {"message":"Secret API key required"}`. Schema/OpenAPI enumeration is NOT exposed to anonymous clients. The `storage.objects` table is also empty (`[]`) — no TDS files have ever been uploaded, so the TDS download feature has never been exercised end-to-end.

### I-24 (operational, live) — `SUPABASE_SERVICE_ROLE_KEY` is blank in `.env.local` and unverified on Vercel
`lib/supabase/admin.ts:10-14` throws without it → TDS signed URLs fail. The bucket is empty and the key is unset locally → verify the Vercel env var exists and test the TDS gate in production; if unset, the feature 404s silently for visitors.

## ROUND 3 SUMMARY — new prioritized fixes
1. M17 auth-callback origin allowlist (3 lines)
2. M19 drop tds_path from public projection (5 lines)
3. M18 flowId binding (few lines)
4. M20 JSONB shape validation + no fail-open (30 min)
5. M21 quote field validation (20 min)
6. I-24: set/verify service-role key on Vercel + test TDS download in production
7. I-23: no action needed — keep publishable-key-only schema lockdown as a regression test

## VERIFIED-CLEAN (Round 3)
- Second-pass hunt: no unvalidated searchParams reflection, no RSC/streaming PII leaks beyond M19, OG-image route correctly filters `published=true` (no unpublished-product leak), sitemap is static (no DB enumeration), TdsGate bound action args re-validated server-side, no staleTime/fetch-cache freshness issues (Next 16 default no-store), admin PII pages emit `Cache-Control: private, no-cache, no-store` (not CDN-cacheable), tsconfig strict:true, eslint standard, proxy matcher correct, PKCE/CSRF verified non-exploitable, Contact/Navbar/Footer all static consts.
