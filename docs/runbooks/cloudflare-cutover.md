# Runbook: put the new public site live on Cloudflare

For the owner. It moves `www.vasantpetrochem.com` from the current Next.js pages to the new site in `site/`, without touching the hub. Everything here is on Cloudflare's and Supabase's free plans. Allow about an hour, in a quiet part of the day.

**How it works.** `www` keeps pointing at Vercel, but Cloudflare sits in front of it. A Cloudflare Worker (the new site) answers every `www` request except the hub's own paths, which go on to Vercel as today. To roll back, delete one route: [Rollback](#rollback).

## 1. Before you start

- [ ] Pull request #29 is merged, and its checks were green.
- [ ] The domain's DNS is on Cloudflare (the dashboard lists `vasantpetrochem.com` with status Active). If not:
  1. Add the site on the free plan.
  2. Check that the imported DNS records match the registrar's.
  3. Switch the nameservers at the registrar, then wait for Active.
- [ ] SSL/TLS mode is **Full (strict)**.

## 2. Apply the database migration

This adds the enquiry fields, the tap counts, the offers board, and the site token.

1. Supabase dashboard → SQL Editor → paste `supabase/migrations/20261021120000_site_r1.sql` → Run. Or ask Claude to apply it with the Supabase connector.
2. Run the security advisor (Advisors → Security). It should show nothing new.
3. Copy the site token. Keep this tab open, and paste the value straight into Cloudflare in step 4:
   ```sql
   select decrypted_secret from vault.decrypted_secrets where name = 'site-token:public-site';
   ```

The current site keeps working throughout: the migration only adds.

## 3. Create the Worker from GitHub

Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → `Arrunabh-Singh/vasant-petrochem-web`:

| Setting | Value |
| --- | --- |
| Project name | `vasant-site` (must match `site/wrangler.jsonc`) |
| Root directory | `site` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |
| Builds for other branches | On; each gets its own preview URL |

Branch previews show drafts, and they never store an enquiry or send an email. Only `www.vasantpetrochem.com` does.

## 4. Settings and secrets

### Turnstile widget (bot check)

1. Cloudflare → **Turnstile** → **Add widget**. Hostnames: `www.vasantpetrochem.com` and the Worker's `workers.dev` host. Mode: Managed.
2. Keep the site key and the secret key for the tables below.

### Build variables

Workers & Pages → `vasant-site` → **Settings → Build → Variables**. This one is needed while the site builds:

| Name | Value |
| --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | the Turnstile site key |

### Runtime secrets

**Settings → Variables and Secrets**, each added as type *Secret*:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://jwycpgugyapkihuikrwl.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API keys → the publishable key. Never the secret or service-role key. |
| `SITE_TOKEN` | the token from step 2 |
| `TURNSTILE_SECRET_KEY` | the Turnstile secret key |
| `IP_HASH_SECRET` | 64 random characters (`openssl rand -hex 32`) |
| `RESEND_API_KEY` | Resend → API keys (sending access only) |
| `MAIL_FROM` | for example `Vasant Petrochem <enquiries@vasantpetrochem.com>`, once the domain is verified in Resend |
| `SALES_EMAIL_TO` | optional; where enquiries go (defaults to the sales mailbox in `content/company.json`) |

Redeploy after adding them (Deployments → the latest → Retry). Then open the `workers.dev` URL and click through. A test enquiry there answers with reference `VP-ENQ-TEST-0000` and stores nothing.

## 5. Cut over

### Workers Routes

Websites → `vasantpetrochem.com` → **Workers Routes**:

1. Add the route `www.vasantpetrochem.com/*` with Worker `vasant-site`.
2. Add these routes with Worker **None**, so the hub keeps them:
   ```
   www.vasantpetrochem.com/admin*
   www.vasantpetrochem.com/auth/*
   www.vasantpetrochem.com/_next/*
   www.vasantpetrochem.com/vasant_logo*
   www.vasantpetrochem.com/api/mcp*
   www.vasantpetrochem.com/api/telemetry/*
   www.vasantpetrochem.com/api/etl/*
   www.vasantpetrochem.com/api/control/*
   www.vasantpetrochem.com/api/documents/*
   www.vasantpetrochem.com/api/cron/*
   ```

### The `www` DNS record

DNS → the `www` record (a CNAME to Vercel) must be **Proxied** (orange cloud). Without that, the routes do nothing.

### Apex redirect

Rules → **Redirect Rules** → create:
- When the hostname equals `vasantpetrochem.com`,
- dynamic redirect to `concat("https://www.vasantpetrochem.com", http.request.uri.path)`,
- 301, preserving the query string.

## 6. Protection (free plan)

- [ ] **SSL/TLS:** Always Use HTTPS on, minimum TLS 1.2, DNSSEC on (then add the DS record at the registrar).
- [ ] **Security → WAF:** the Cloudflare Free Managed Ruleset on, and Bot Fight Mode on.
- [ ] **Security → WAF → Rate limiting rules:** one rule that blocks for 10 seconds when the URI path starts with `/api/` and one IP sends more than 20 requests in 10 seconds.
- [ ] **Web Analytics:** enable automatic setup for the site. It is cookieless and needs no banner.
- [ ] **Leave these off:** Rocket Loader and Email Address Obfuscation. They inject scripts that the site's security policy blocks.

## 7. Check it is live

From a terminal:
```sh
curl -sI https://www.vasantpetrochem.com/ | grep -iE "content-security-policy|strict-transport|x-frame"
curl -s https://www.vasantpetrochem.com/robots.txt
curl -sI https://www.vasantpetrochem.com/admin | head -3          # still the hub
```

Then in a browser:
- [ ] The home page plays, and a product page fills its drop.
- [ ] **One real test enquiry** from the quote page (your own email). It should show a `VP-ENQ-…` reference, appear in the hub (Sales › Leads) with its type and products, and reach the sales mailbox.
- [ ] Sign in to the hub at `/admin` and open Sales › Offers.
- [ ] Share a product link in WhatsApp: the preview shows the product card.

## 8. The week after

- Watch **Workers → vasant-site → Logs** for `csp-violation` lines. After a clean week, the strict policy is switched from report-only to enforced, in `site/src/server/headers.ts` (Claude will propose the pull request).
- Submit the sitemap in Google Search Console: `https://www.vasantpetrochem.com/sitemap.xml`.

## Rollback

Delete the `www.vasantpetrochem.com/*` route (step 5). Within a minute every request goes to Vercel again, exactly as before. Nothing else needs undoing: the migration only added things, and the old site still uses its own paths.

## After a stable fortnight

The cleanup pull request:
- removes the old `app/(site)/` pages;
- drops the anonymous insert policies on `quote_requests` and `tds_requests` (the new site writes only through the token-checked functions);
- gives the hub the new logo and fonts.
