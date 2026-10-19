# ADR-0005: Splitting www between the site and the hub at cutover

- Status: accepted (owner, 2026-10-19)

## Context

`www.vasantpetrochem.com` serves the public pages and also the hub:

- `/admin`;
- the auth callback;
- the MCP endpoint;
- the office-box, telemetry, control, document and cron APIs.

Devices and connectors call the hub APIs by URL, and some of their HTTP clients do not follow redirects on POST. Moving them at the same moment as the site would turn one change into many.

## Decision

At cutover, `www` stays proxied by Cloudflare to Vercel. The site Worker attaches through Workers Routes:

- **To the site Worker:** `www.vasantpetrochem.com/*`.
- **Bypass routes, with no Worker** (traffic passes through to the Vercel hub as today):
  - `/admin*`, `/auth/*`, `/_next/*`, `/vasant_logo.png`;
  - `/api/mcp*`, `/api/telemetry/*`, `/api/etl/*`, `/api/control/*`, `/api/documents/*`, `/api/cron/*`.
- **Apex:** `vasantpetrochem.com` gets a 301 redirect to `www` (VP-SEO-003).

The site's own endpoints (`/api/rfq`, `/api/tds`, `/api/click`, `/api/csp-report`, `/api/offers`) don't collide with any hub path.

## Consequences

- **Zero client changes.** No hub, OAuth or client change is needed at cutover, and rollback means deleting one route.
- **Before Release 2.** The hub moves to `hub.vasantpetrochem.com` before buyer accounts ship (ADR-0003):
  - Clients are updated (the MCP connector, the office box).
  - Supabase Auth redirect URLs are updated.
  - The bypass routes are removed.
