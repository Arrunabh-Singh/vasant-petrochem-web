# Runbook: put the new public site live on Cloudflare

It moves `www.vasantpetrochem.com` from the current Next.js pages to the new site in `site/`, without touching the hub. Everything here is on Cloudflare's, Supabase's and Resend's free plans.

**How it works.** `vasantpetrochem.com` is already on Cloudflare, and `www` is proxied to Vercel. A Cloudflare Worker (the new site) answers every `www` request except the hub's own paths, which go on to Vercel as today. To roll back, remove one route: [Rollback](#rollback).

**Who does what.** The owner spends about ten minutes on four keys and one Vercel setting. Claude does the rest with `site/scripts/cutover.mjs`, whose steps are safe to run again.

## 1. The owner's ten minutes

Keys go in the Claude Code environment settings as environment variables (the cloud environment menu in the session's title bar, then Edit). Never paste them into a chat. A new session picks them up; tell Claude when they are in.

1. **Cloudflare token for the cutover**, saved as `CLOUDFLARE_API_TOKEN`.
   - Open this link while signed in to Cloudflare. It pre-fills most permissions: [create the cutover token](https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_routes%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22zone_settings%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22firewall_services%22%2C%22type%22%3A%22edit%22%7D%5D&accountId=%2A&zoneId=all&name=Vasant%20site%20cutover).
   - Add three permissions with **+ Add more**:
     - Account → Turnstile → Edit;
     - Zone → Single Redirect → Edit;
     - Zone → Zone WAF → Edit.
   - Under **Zone Resources**, choose `vasantpetrochem.com`.
   - Under **TTL**, set an end date about 30 days away. The hub move before Release 2 uses the same token.
   - **Continue to summary**, then **Create Token**, then copy it.
2. **Cloudflare token for automatic deploys**, saved as a GitHub secret.
   - [Create the deploy token](https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&accountId=%2A&zoneId=all&name=Vasant%20site%20deploy%20%28GitHub%29). It needs Workers Scripts edit and account read only. No end date.
   - Paste it as the repository secret `CLOUDFLARE_API_TOKEN`: [new Actions secret](https://github.com/Arrunabh-Singh/vasant-petrochem-web/settings/secrets/actions/new).
   - From then on, `.github/workflows/deploy-site.yml` deploys every merge to `main`, and comments a preview link on every pull request.
3. **Resend key**, saved as `RESEND_API_KEY`.
   - Sign up at [resend.com](https://resend.com).
   - Go to **API Keys**, then **Create**, with permission **Sending access**.
   - This key sends an email to the sales desk for every enquiry, and an acknowledgement to the buyer.
4. **Anthropic key**, saved as `ANTHROPIC_API_KEY`. This is for the on-site product assistant (Release 3).
   - In [console.anthropic.com](https://console.anthropic.com), go to **Settings → Limits** and set a **monthly spend limit of $10**.
   - Then go to **API Keys** and create one.
5. **Vercel, so every merge redeploys the hub.**
   - Open Vercel → project `vasant-petrochem-web` → **Settings → Git**.
   - Disconnect `centrax-citadel`, then connect `Arrunabh-Singh/vasant-petrochem-web`.
   - Claude has already set the Root Directory to the repository root, and deployed `main` by hand on 21 October.
6. **Optional: the hub's vault, MCP connector and telemetry.** In the same project, go to **Settings → Environment Variables** and add `SUPABASE_SERVICE_ROLE_KEY` for Production. Copy it from Supabase → **Settings → API Keys**.

Also renew the domain at GoDaddy, or turn on auto-renew: **it expires on 11 December 2026**.

## 2. What Claude does

The cutover runs in a new session, which sees the keys. Each step prints what it changed.

| Step | What happens |
| --- | --- |
| `check` | Reads the zone, settings, routes, Worker and Turnstile, and changes nothing. |
| `deploy` | Creates the Turnstile widget and writes its public site key to `site/.env.production` (committed). Builds, then deploys to workers.dev. Sets the Worker secrets:<br>• `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`;<br>• `SITE_TOKEN`, read from Vault;<br>• `TURNSTILE_SECRET_KEY`;<br>• `IP_HASH_SECRET`, generated.<br>Then smoke-tests the pages, headers and `/api/offers`. |
| `email` | Adds `vasantpetrochem.com` to Resend, then adds its SPF and DKIM records to Cloudflare DNS (DNS only), plus `_dmarc` `p=none` if missing. Verifies the domain, then sets `RESEND_API_KEY` and `MAIL_FROM`. |
| `live` | Adds the hub's paths as routes with no Worker **first**, then `www.vasantpetrochem.com/*` to the Worker. Turns on Always Use HTTPS, sets minimum TLS 1.2, adds a rate-limit rule (below) and a 301 from the apex to `www`. Checks that `/` is the new site and `/admin` is the hub. |

**The hub's paths,** which stay on Vercel until the hub moves to `hub.vasantpetrochem.com`:

```
/admin*  /auth/*  /_next/*  /vasant_logo*  /api/mcp*  /api/telemetry/*  /api/etl/*  /api/control/*  /api/documents/*  /api/cron/*
```

**The rate limit** covers only the site's own endpoints (`/api/rfq`, `/api/tds`, `/api/click` and `/api/csp-report`) and the account's sign-in steps (`/api/account/code`, `/api/account/verify` and `/api/account/mfa`), each of which sends an email or checks a code: 20 requests per 10 seconds per address. Telemetry, office-box uploads and the MCP connector post often from one address, so they are never throttled.

**After `live`,** Claude checks:
- the security headers on `/`;
- `robots.txt` and the sitemap;
- `/admin`, `/auth/callback` and `/api/mcp`, which should still reach the hub;
- the home film, a product page and share images;
- that a tap on the call link is recorded (`click_events`), which proves the Worker writes through the site token.

A real enquiry needs the Turnstile check in a browser. The owner can send one from a phone to see the reference and the email arrive.

**Never turned on:**
- **Bot Fight Mode.** It challenges every automated client on the zone, so it would break the MCP connector, office-box ETL and telemetry, and the free plan cannot exempt paths.
- **DNSSEC.** It is optional; turning it on needs a DS record added at GoDaddy.

## Rollback

```sh
node site/scripts/cutover.mjs rollback
```

This removes the `www.vasantpetrochem.com/*` route. Within a minute every request goes to Vercel again, exactly as before. Nothing else needs undoing: the database migration only added things, and the old site still uses its own paths.

## The week after

- **Strict CSP.** Claude reads **Workers → vasant-site → Logs** for `csp-violation` lines. After a clean week, it proposes the pull request that turns the strict policy from report-only to enforced, in `site/src/server/headers.ts`.
- **Search Console.** Submit the sitemap: `https://www.vasantpetrochem.com/sitemap.xml`.

## After a stable fortnight

The cleanup pull request:
- removes the old `app/(site)/` pages;
- drops the anonymous insert policies on `quote_requests` and `tds_requests`, since the new site writes only through the token-checked functions;
- gives the hub the new logo and fonts.
