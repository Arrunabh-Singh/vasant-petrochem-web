# Handoff: where Vasant Petrochem's software stands

Last updated 28 October 2026, during the lead-engine work (#46). Written for the next AI agent or person to pick up the work. Keep it current: when you finish something that changes the picture below, update this file in the same pull request.

**Read in this order:**
1. This file: what is live, what is waiting, how to ship.
2. `AGENTS.md`: how to change the public site, content and brand safely.
3. `CLAUDE.md`: the business, the hub (Next.js), the database and the security model.
4. `design-system/README.md`: the brand book, including the **Vastu** section.
5. `docs/OWNER_CHECKLIST.md`: what only the owner can do (console clicks, keys, hardware).

## 1. The picture in one minute

| Part | What it is | Where it runs |
| --- | --- | --- |
| Public site | `site/` (Astro). Content in `content/`, brand in `design-system/`. | Cloudflare Worker `vasant-site` on `www.vasantpetrochem.com`, since the cutover on 24 October 2026. |
| Staff hub | `app/` and `lib/` (Next.js): leads, offers approval, documents, Tally, logistics, the MCP server. | Vercel, built from `main`. Its paths (`/admin`, `/auth/*`, `/api/mcp*` and the other device APIs) bypass the Worker and reach Vercel (ADR-0005). |
| Database | Supabase project `jwycpgugyapkihuikrwl` (ap-south-1). Migrations and their SQL tests are in `supabase/`. | A person applies migrations; agents write them. |
| Mac Hub | The owner's Obsidian vault and automations, including the Tally sync. | A separate repository, `Arrunabh-Singh/centrax-citadel`. Its `19_Website_VPC/` folder is a frozen copy: never edit it or point Vercel at it. |

`app/(site)/` is the old public site. It no longer serves `www`, and stays only until the hub moves (section 3).

## 2. The owner, and how they work

- **Who.** The owner of a family business. They usually read on a phone. They want short, plain answers, screenshots, and a choice of options when there is a decision to make.
- **Standing instructions.** Keep to these unless the owner changes them:
  - **₹0 extra spend.** Use free tiers, and ask before anything paid.
  - **No invented facts.** Claims come only from `content/claims.json`, and an unknown stays `null` with a `TODO(VP-HUM-xxx)` (`AGENTS.md`, "The rules").
  - **Merge when green.** An agent may merge its own pull request once every check passes, and the merge deploys. Merges are squashes titled `type(scope): summary (#n)`.
  - **A small draft first** for any big visual change: a canvas or a few screenshots before building (24 October).
  - **Light mode, with vastu in mind** (24 October). The rules are in `design-system/README.md`, "Vastu": keep them when you change a layout.
  - **Owner's OK first** for database migrations and anything touching sign-in or money.
  - **Never ask for a secret in chat,** and never commit one.
- **On hold by the owner.** Don't start these without asking:
  - **The hub's move to `hub.vasantpetrochem.com`** (on hold since 23 October). See ADR-0005, "Consequences".
  - **The sales desk** (Release 2c). Its functions wait in `supabase/held/sales_desk.sql` and are not applied. The Supabase MCP drops any request containing `sales_quotation_save`, so it has to be applied from the SQL editor or the CLI.

## 3. Releases

| Release | What | State |
| --- | --- | --- |
| R1 | The public site: catalogue, marketplace with filters and compare, quote basket and enquiry, TDS gate, live offers board, company and policy pages, search, share images, brand kit | Live (#29, #30). Cutover finished 24 October (#35, #37). |
| R1.1 | The home page as a scroll film, and the Sunlit gold redesign | Live (#38). |
| R2 | Buyer portal | Partly built, not launched:<br>- database and file service done (#33);<br>- `portal` Edge Function deployed;<br>- `/account` pages built (#34) but kept as a draft page until the sales desk exists. |
| R2c, R2d | Sales desk (hub); portal launch runbook (Supabase email via Resend, email templates, redirect URLs, function secrets) | R2c on hold; R2d not written. |
| R3 | Quote API and MCP tools, a product assistant, "in stock / on request" badges from Tally | Not started. |

**Products and stock:**
- The catalogue is `content/products/*.md`; the `catalog` skill has the steps. The film, marketplace, colour scale and industry pages follow automatically.
- Day-to-day stock goes on the **Live offers board** (hub › Sales › Offers, or the MCP tool `propose_offer`). It appears at once, without a deploy. It never goes in git.

## 4. How a change ships

1. **Branch.** Make one change per pull request, with the template filled in.
2. **CI** runs on every pull request:
   - site check: types, unit tests, build, page checks, JS budgets;
   - e2e: Playwright at 390 and 1440, with axe on every page;
   - Lighthouse budgets and a ZAP scan;
   - CodeQL, gitleaks, the database tests and the hub build.
3. **Preview.** `deploy-site.yml` comments a preview at `https://pr-<n>-vasant-site.vasantpetrochem.workers.dev`. It shows drafts, and its forms are always dry runs. Send it to the owner when the change is visible.
4. **Merge.** Merge when green. `deploy-site.yml` deploys the Worker to production in under a minute. Check it with `curl -s https://www.vasantpetrochem.com/` and a screenshot. Browsers may keep an old share image for up to a day.
5. **Rollback.** Revert the pull request. For the whole site, follow `docs/runbooks/cloudflare-cutover.md`.

The hub deploys from `main` on Vercel. Database changes are applied by a person, then the security advisor is re-run (`CLAUDE.md` §8).

## 5. Verifying locally: what works

- **Turnstile in local tests.** Build with Cloudflare's always-pass test key: `PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm --prefix site run check`. The real key is refused on localhost (error 110200), which fails every form page in e2e.
- **The local preview.** `npm --prefix site run preview` serves the built Worker at `:4321` and keeps serving the build it started with. Restart it after every build; stop it with `pkill -f "[w]rangler dev"`.
- **Screenshots.** Use `npm --prefix site run shots`, or `-- --film` for the home film. Headless Chromium has no WebGL, so its frames show the SVG fallback drops; real phones run the liquid.
- **Reduced motion.** Test a reduced-motion context as well. Firefox and readers who reduce motion get the complete still page.
- **Lighthouse.** Run `npx --yes @lhci/cli@0.15.1 autorun` from `site/`, with `CHROME_PATH` set to a Chromium if none is found.
- **Contrast.**
  - For flat colours, compute it from the token values.
  - For text over the film's light, sample the rendered pixels with the text hidden. The method and the latest figures are in `design-system/README.md`, "Light, measured".
- **Content security policy.** No inline `style=` attributes and no inline scripts. Turnstile is the only foreign script. The checks fail the build otherwise.
- **Generated files** are rebuilt on every build, so never edit them:
  - `site/src/styles/tokens.css`;
  - `site/public/fonts/`, `site/public/brand/` and `site/public/people/`;
  - `site/public/_headers` and `site/public/site.webmanifest`.
- **Share images.** satori cannot read WOFF2. `og/[...slug].png.ts` uses the static `.woff` cuts in `design-system/fonts/`.

## 6. The look, in one screen

- **Sunlit gold** (owner, 24 October):
  - warm white and ivory grounds, warm-black type;
  - `gold` fills for every action, with a `gold-deep` edge; `gold-ink` for gold text and the focus ring;
  - the brand green only for "live";
  - no black or dark-grey fields.
- **Tokens.** Colours are named by role (`ground`, `surface`, `text`, `text-2`, `text-3`, `gold`, `gold-ink`, …) in `design-system/tokens.json`. `compileTokens` in `site/scripts/prepare.mjs` compiles them.
- **Type.** Schibsted Grotesk (variable 400–900) for everything that reads; IBM Plex Mono for codes, values and labels.
- **The film:**
  - the files: `site/src/pages/index.astro`, `site/src/styles/film.css`, `site/src/islands/liquid.ts` (WebGL), `site/src/islands/film-focus.ts` (keyboard) and `site/src/islands/film-snap.ts` (snapping and the chapter anchor);
  - its timing lives in `--fill-end`, `--scale-from` and `--scale-span` on `.vp-film`;
  - it snaps one frame per flick, with frames 40–55% of a screen apart; the rules, the gap model and the Apple rig are in the `motion` skill (`.claude/skills/motion/SKILL.md`);
  - the grades run darkest to lightest (`byColour` in `site/src/lib/drop.ts`), so the scroll ends in light;
  - only the grade on screen takes a click.
- **Design artifacts** (claude.ai):
  - the design system: https://claude.ai/artifact/5jtuYB6F18E9c1CWnWCtFK
  - the approved Sunlit gold draft: https://claude.ai/artifact/63XqLSZXhGJnpUAWWJDU8r
- **What the owner turned down:**
  - the first cream-and-green look ("a let down"; type "mid", palette "at fault");
  - a black-and-gold draft, replaced by light mode.

## 7. Open items

**Work in progress (28 October): the site as a lead engine.**
- The plan and where to resume: `docs/plans/2026-10-28-lead-engine.md`. Start at its "Resume here" section.
- Draft PR #46 (branch `claude/sharp-cannon-807c29`) contains:
  - the Apple rig (`.github/workflows/ios.yml`): iPhone 18 Pro, iPhone Duo and Safari 27 on macOS;
  - iPhones playing the film natively;
  - one frame per flick, with native CSS scroll snap, and frames 40–55% of a screen apart;
  - the chapter anchor, the grade count, the scroll cue and the skip link;
  - the site-wide reveals removed;
  - the `motion` skill.
- Still to do on #46: every check green on its latest commit (iPhone 18 Pro and Safari 27 on macOS already pass), then merge, then the owner checks on their iPhone.
- Next, in the plan's order: PR E (the quote flow and its "Request received" peak), then PR B, PR C, PR D1 and PR D2.

**Waiting on the owner.** Each has a `TODO(...)` marker in `content/`; search for it.
- `VP-HUM-001`: legal entity name, GSTIN, Udyam, CIN and registered office.
- `VP-HUM-002`: email on the company domain (`sales@` and the others), then retire the Gmail address.
- `VP-HUM-006`: photographs, for a full-bleed "works" scene on the home page. The brief is in the brand book, "Photography brief".
- `VP-HUM-008`: the Importer-Exporter Code, which unlocks export pages.
- `VP-HUM-012`: LinkedIn, IndiaMART, Justdial and Google Business links.
- `VP-HUM-013`: legal review of the policy pages, and supplier TDS or COA documents to move products from `placeholder` to `verified`.
- `VP-HUM-014`: written policies (quality, health and safety, environment, ethics, sanctions screening).
- `VP-CORP-001` and `-002`: people and careers.
- `VP-SEO-007`: HS and CAS codes, checked by a customs broker.
- **Cloudflare settings** (decided 28 October; the steps are in `docs/OWNER_CHECKLIST.md`, "Cloudflare"):
  - **AI training crawlers are let in.** GPTBot, ClaudeBot and CCBot got a 403 from Cloudflare's AI bot blocking, although `robots.txt` allows them. The owner turns the block off. Then those user agents must get a 200 on `/`, `/llms.txt` and `/catalog.json`.
  - **Web Analytics goes on** from the dashboard, with no code change. The CSP already allows its beacon. Then the home page must carry `static.cloudflareinsights.com/beacon.min.js` with no CSP errors.
  - **Cloudflare's own MCP servers become claude.ai connectors** (GraphQL Analytics and Workers Observability), so an agent can read traffic, bots, errors and Core Web Vitals. The first report and the weekly ones follow Part 12 of the plan.
- **Console tasks:** `docs/OWNER_CHECKLIST.md`.

**Agent work, ready to pick up:**
- R2d, the portal launch runbook. Writing it needs no approval; launching the portal does.
- R3, once the owner chooses which part comes first.
- Keep this file, `AGENTS.md` and the brand book in step with whatever you change.

## 8. Gotchas

- **Signed in is not staff.** `authenticated` also covers invited buyers. Every staff table and function checks `app.is_staff()` or a role, never `using (true)` (`CLAUDE.md` §3).
- **Hub schemas.** The hub reads the `tally`, `logistics`, `market` and `trade_finance` schemas with `.schema("tally").from(...)`. Each must be listed under Supabase → Data API → Exposed schemas.
- **Company facts.** They live only in `content/company.json`, and a test fails if they appear anywhere else.
- **Hub and devices.** The hub's paths keep working on `www` only through the Worker's bypass routes (ADR-0005). Moving the hub means updating clients first.
- **Previews.** Use a phone-sized screenshot as well as a laptop one; the owner checks on a phone first.
- **A page's own path.** Built pages see `Astro.url.pathname` ending in `.html` (`build.format: "file"`), so canonical links once pointed at `/about.html`. Use `pagePath(Astro.url)` from `site/src/lib/nav.ts`; `npm run check` fails a canonical link to a `.html` address.
