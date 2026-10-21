# ADR-0002: Public content as code, approved by pull request

- Status: accepted (owner, 2026-10-19)
- Relates to: MNC P1, P4, P5; CLAUDE.md §5 (AI proposes, human approves)

## Context

The owner wants AI agents to keep the catalogue, logos and every other piece of public content up to date. Today the catalogue lives in Supabase `public.products`, edited through the hub; the rest of the copy is hard-coded in components. The catalogue data is a placeholder.

## Decision

Every public fact and string lives in `content/`. The files are:

- `company.json`
- products as Markdown with frontmatter
- industries, families, page copy, UI strings and navigation
- the claims register
- certifications and people
- documents and insights

**Validation.** The site validates every file against zod schemas at build time, and exports JSON Schema to `content/_schemas/` for any other tool or editor.

**Change path.** An agent edits the files and opens a pull request. CI runs these checks:

- schemas;
- claims register;
- that no `TODO(VP-HUM` text appears on a published page;
- certificate expiry and links;
- the build.

Cloudflare then posts a preview link. CODEOWNERS requires the owner's approval, and merging deploys.

**Two exceptions:**

- **Live offers.** They change too often for a pull request each, so they live in Supabase `market.offer`. Agents propose them through an allowlisted MCP tool, and a different person approves each one in the hub.
- **Enquiries.** They stay in Supabase.

## Consequences

- **Approval and rollback:** every content change has an author, a diff, a preview, an approver and a one-click revert.
- **The hub's catalogue:** `public.products` stops being the public catalogue. It stays for the hub's history and its TDS document links until the cleanup PR after cutover.
- **Placeholder data:** products carry `data: placeholder` until real values are entered with their evidence document (`data: verified`, `source`). Methods, HS/CAS codes and density stay empty until verified.
