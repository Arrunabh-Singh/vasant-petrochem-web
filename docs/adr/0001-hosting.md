# ADR-0001: Hosting the public site on Cloudflare

- Status: accepted (owner, 2026-10-19)
- Resolves: MNC.md §10.1 (hosting plan terms), VP-GOV-006

## Context

The site has been served by a Vercel project on the Hobby plan. Vercel's fair-use guidelines restrict Hobby to personal, non-commercial use, and a business website counts as commercial use. Moving to Pro costs about $20 per member per month.

The company's budget ceiling for software is ₹2,000 a month.

## Decision

The public site (`site/`) runs on Cloudflare Workers on the free plan. Cloudflare's terms allow commercial use there, and requests for static assets are free and unlimited.

- **Pages:** prerendered and served as static assets.
- **Dynamic routes:** only the enquiry endpoints and the offers page run Worker code, and they stay far below the free plan's 100,000 requests a day.
- **Network:** Cloudflare already sits in front of the domain, so no new vendor is added.

## Consequences

- **Builds:** the owner connects Workers Builds to the GitHub repo, with root directory `site/` and production branch `main`. Every other branch gets a preview URL.
- **Back office:** the hub (Next.js) stays on Vercel for now. It is internal, but it still supports a business, so Vercel Hobby remains an open risk for it. The budget-fit fix is moving it to Cloudflare Workers Paid (about ₹450 a month), recorded as a follow-up. Vercel Pro would take most of the ceiling.
- **Routing:** during the transition, Workers Routes split `www` between the two apps (ADR-0005).
