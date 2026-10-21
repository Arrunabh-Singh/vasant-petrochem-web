# ADR-0004: Astro for the public site

- Status: accepted (owner, 2026-10-19)

## Context

The public site has to be very fast on Indian mobile networks and in the Gulf. It has to be safe to run unattended, editable by AI agents through typed content, and free to host on Cloudflare (ADR-0001).

The current public site is part of the hub's Next.js app. Every page ships the React runtime. It also shares the hub's server attack surface: React Server Components had a critical remote-code-execution flaw in December 2025.

## Decision

The public site is a separate Astro app in `site/`:

- Pages are prerendered to static HTML.
- There is no framework runtime in the browser; the few interactive parts are small TypeScript custom elements.
- Enquiry endpoints and the offers page run on demand in a Cloudflare Worker through `@astrojs/cloudflare`.
- Content collections with zod schemas read `content/`.

Cloudflare has owned Astro since January 2026, and Astro remains MIT-licensed.

**Rejected:**
- **Next.js on Cloudflare (OpenNext):** the hub's bundle needs the paid Workers plan, and it keeps the server-component surface.
- **Next.js on Vercel Pro:** breaks the budget ceiling and the terms question stays open for the hub.

## Consequences

- **Two apps, one repo.** The hub remains at the repo root. The site has its own `package.json`, lockfile, lint and CI workflow. Both read `content/company.json`.
- **Logic moves.** The site carries ports of the hub's form validation, bot defence, mail and IP hashing, with their tests. The hub copies go when the old public pages are deleted after cutover.
