# AGENTS.md: how to change Vasant Petrochem's site, safely

For any AI agent, or person, working in this repository. Read it before you change content, the brand, the site or the database. Business context and the hub's architecture are in `CLAUDE.md`. This file covers the public site and everything it is built from.

## What is where

| Path | What it is |
| --- | --- |
| `content/` | **Every public fact and string.** Products, company facts, page copy, claims, industries, navigation, policy pages. Edit here to change what the site says. |
| `design-system/` | **The brand.** `tokens.json` (colour, type, space, motion), `assets/Logos/`, `assets/Drops/`, fonts, and `README.md`, the brand book. |
| `site/` | The public site, `www.vasantpetrochem.com` (Astro on Cloudflare Workers). Pages, components, the enquiry endpoints. |
| `supabase/` | Database migrations and their SQL tests. |
| `app/`, `lib/` | The staff hub (Next.js on Vercel): leads, offers approval, documents, Tally, logistics. |
| `docs/adr/` | Why the site is built the way it is. |

Each JSON file in `content/` names its schema, and `site/src/content/schema.ts` defines all of them. The build refuses anything that doesn't match.

## The rules

1. **Truth before polish.** Never invent a fact: no specification, certificate, capacity, client, date or number that a person has not supplied with evidence. Unknown values stay `null` with a `TODO(VP-HUM-xxx)` comment, and a `null` simply doesn't render.
2. **Claims are registered.** Any sentence that promises something (speed, quality, coverage, testing) comes from `content/claims.json` by its `id`. A new claim is added there as `owner-asserted` with today's date; only the owner moves it to `verified`, and only with evidence.
3. **AI proposes, people approve.** Every change goes through a pull request the owner approves. Offers on the live board are proposed through the MCP tool `propose_offer` and published by a different person in the hub. Nothing an agent does goes live on its own.
4. **No secrets, ever.** Not in content, code, commits or pull request text. The site's Worker holds only the publishable key and its own secrets (set in Cloudflare). There is never a service-role key in `site/`.
5. **The database changes only with the owner's OK.** Write the migration and its test in `supabase/`. A person applies it.

## Common changes

**A product** (`content/products/<slug>.md`)
- The front matter follows `productSchema`: name, code, family, status, data, source, specs (property, value, unit, method), packaging, applications, industries, documents, hs, cas, density, faq. The body is the description.
- Specs are copied exactly as the evidence states them. A test method stays `null` unless the source names it.
- Real values from a supplier TDS or certificate of analysis: set `data: verified` and `source:` to the document. The build refuses `verified` without a source.
- `status: draft` keeps a product off the live site. Previews show it, behind a banner.
- The drop colour is `tint`. There are no product photos to supply.

**Company facts** (`content/company.json`)
- This is the only place the phone number, email, address, hours and legal identifiers live; a test fails if they appear anywhere else.
- Legal identifiers stay `null` until supplied. The footer shows only the ones that exist.

**Page copy** (`content/pages/<page>.json`)
- Each page has a title, description, headline, lead and named blocks.
- A block item either has a `body`, or a `claim` id whose registered text is shown instead.

**Policy pages** (`content/corporate/*.md`)
- They stay `status: draft` until a person approves the text. Publishing also needs an `updated` date and no `TODO(` left in the body.
- Company facts are written as `{{phone}}`, `{{address}}`, `{{hours}}` and `{{email}}`, and filled in at build time.

**Industries, families, navigation and UI strings:** `content/industries/`, `content/families.json`, `content/navigation.json` and `content/ui/en.json`.

**A logo**
- Replace the file in `design-system/assets/Logos/`, keeping its name and transparent background. The build copies it everywhere.
- The brand book's "Logo" section lists which file is used where.

**Colours, type, spacing, motion:** `design-system/tokens.json`. They compile to `site/src/styles/tokens.css` on every build, so never edit the compiled file.

**A live offer:** never in git. Use the hub (Sales › Offers) or the MCP tool `propose_offer`.

## Commands

All from the repository root.

| Command | What it does |
| --- | --- |
| `npm --prefix site ci` | Install the site's exact dependencies. |
| `npm --prefix site run dev` | Local site at `http://localhost:4321` (Astro dev server). |
| `npm --prefix site run check` | Everything CI checks: types, unit tests, a production build, then the built pages (no TODO markers, no inline scripts or styles, no foreign hosts, no broken links, JS budgets). |
| `npm --prefix site run preview` | The built site in the local Cloudflare runtime, at `http://localhost:4321`. |
| `npm --prefix site run shots` | Phone and laptop screenshots of the main pages, against `preview`. Add page paths to limit it, or `--film` for the home page's scroll film. |
| `DRAFT_PREVIEW=1 npm --prefix site run build` | A build that includes drafts, as previews show them. |

SQL tests run on a scratch Postgres: `createdb scratch && psql -v ON_ERROR_STOP=1 -d scratch -f supabase/tests/<file>.sql`.

## Making the change

1. Work on a branch. Keep one change per pull request.
2. Run `npm --prefix site run check`. For anything visible, also run `shots`, look at both widths, and attach the screenshots.
3. Open a pull request with the template: say what changed and why, and give the evidence for any data or claim.
4. CI repeats the checks, and the owner reviews and merges. A merge deploys in about a minute; reverting the pull request rolls it back.

## Don'ts

- Don't edit generated files: `site/src/styles/tokens.css`, `site/public/brand/`, `site/public/fonts/`, `site/public/_headers`.
- Don't add inline `style=` attributes or inline scripts. The content security policy blocks them, and the checks fail the build.
- Don't hard-code a company fact. Read it from `content/company.json`.
- Don't add a dependency without saying why in the pull request. Pin exact versions.
- Don't remove a `TODO(VP-HUM-xxx)` without supplying the real value.

## Skills

`.claude/skills/` holds step-by-step guides for agents that support skills:
- `catalog`: add or update a product;
- `brand`: replace a logo or a token;
- `offers`: propose a lot for the live board;
- `design-review`: review a page before it ships.
