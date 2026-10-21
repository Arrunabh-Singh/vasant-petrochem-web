# Security

Thank you for helping keep Vasant Petrochem and the buyers who use our site safe.

## Reporting a vulnerability

Please report privately, never in a public issue:

- **GitHub:** this repository's **Security** tab → **Report a vulnerability** (private to the maintainers).
- **Email:** the address in [www.vasantpetrochem.com/.well-known/security.txt](https://www.vasantpetrochem.com/.well-known/security.txt).

Include what you found, where (URL or file), how to reproduce it, and what an attacker could do with it. We will acknowledge your report, keep you updated, and tell you when it is fixed. We are glad to credit you once it is.

## In scope

- The public site, `www.vasantpetrochem.com` (the `site/` app on Cloudflare Workers), including its enquiry and document endpoints under `/api/`.
- The staff hub (`/admin`) and its APIs (the root Next.js app), including the MCP server.
- The database functions and policies in `supabase/migrations/`.

## Out of scope

- Attacks that need physical access, a compromised device, or a staff member's account credentials.
- Denial of service, volumetric or rate-limit testing, and automated scanning that sends large amounts of traffic.
- Social engineering of our staff, buyers or suppliers.
- Reports of missing best-practice headers or settings without a way to exploit them.

## Safe harbour

We will not pursue legal action for research that follows this policy in good faith: test only against your own data, stop as soon as you reach someone else's information and tell us, do not degrade the service, and give us reasonable time to fix an issue before you disclose it.

## How the system is protected

For maintainers and auditors: `docs/THREAT_MODEL.md`, `audit.md`, and the security sections of `CLAUDE.md` and the site's ADRs (`docs/adr/`).
