# The site as a lead engine: a film people finish, agents can read, and doors that bring buyers back

## Resume here (28 October, 19:05 UTC; the owner: "proceed to plan execution")

### 0. State now, and the execution order

**Saved.** 8e9442d (section 1), then 62fd623 (Part 12's docs) and 61db940 (the film fixes: section 2), all pushed on `claude/sharp-cannon-807c29` (draft PR #46).

**61db940 fixed what CI and the rig found on 8e9442d:**
- the rig's client gave up after five minutes while Appium built WebDriverAgent (`HeadersTimeoutError`): `node:http` instead of `fetch`;
- the faded hero copy still caught taps over the grades (`vp-gone` on the copy itself);
- on 320×568 the grade count pushed the link under the action bar (the count hides on stages under 620 px tall);
- frames too far apart for one flick (below).

**Execute in this order:**
1. **Part 12, docs** (section 5): done in 62fd623. Give the owner the dashboard steps. The Cloudflare plugin's server needs a sign-in this session can't start: the owner authorizes it, or adds the custom connectors, in claude.ai settings.
2. **Finish PR #46** (section 2 and the B list in section 4): read the rig artifacts on 61db940; the docs and the `motion` skill; `design-review`. Iterate until e2e and the rig are green, then merge.
3. **Then the design plan, in section 4's order:** the canvas draft of Parts 4–9 and 11 for the owner, then PR E, PR B, PR C, PR D1, PR D2, task #35.

### 1. What 8e9442d holds (was "Save first")

**Saved in 8e9442d** (was uncommitted; 14 files).
- **Part 2, iPhones play the film natively:**
  - `site/src/lib/film.ts` (`iosWebKit`, `filmPlays`) and `site/src/islands/motion.ts`;
  - `site/src/styles/motion.css`: the Safari blocks exclude iOS;
  - `site/src/styles/film.css`: container queries instead of height media queries, threadable keyframes, `vp-gone`, explicit `translate: 0 0` endpoints;
  - `site/src/islands/liquid.ts`: cached geometry.
- **Part 3, one frame per flick:**
  - The `film.css` pacing block:
    - `html.vp-snap` with mandatory snapping;
    - snap points: `.vp-snap-top`, `.vp-snap-title`, `.vp-film-snaps-grades > span` and `.vp-statement`;
    - swatch links, `.vp-oil-count`, the skip link;
    - the chapter anchor: a hairline, plus dots on laptops;
    - a scroll cue on laptops;
    - 60svh slots.
  - New `site/src/islands/film-snap.ts`.
  - `site/src/pages/index.astro`.
  - `site/src/components/ColourScale.astro` (`links`).
  - `content/ui/en.json`: new strings (`film.grade` is unused; remove it).
- **Restraint:** `motion.css` loses the site-wide `vp-rise` and `vp-wipe` reveals, and `index.astro` loses the `vp-wipe` and `vp-reveal` classes.
- **Rig fixes:**
  - `.github/workflows/ios.yml`: reduced motion off on both runners.
  - `site/tests/ios/film.mjs`: logs `reduced` and `film=Nx`, and adds the Space and Page Down steps.
  - `site/tests/film-checks.ts`:
    - `scrollFilm` turns snapping off;
    - new `filmTop`;
    - `snap` in `filmState`;
    - more words checked.
- **Tests:**
  - `site/tests/unit/motion-css.test.ts`: all 41 pass;
  - `site/tests/e2e/film.spec.ts`: a new "one frame per input" block.
- `npm --prefix site run check` passes: typecheck, 41 unit tests, the build, and checks on 39 pages.

**Steps:**
1. Copy this plan into the repository as `docs/plans/2026-10-28-lead-engine.md`, since the plan file lives outside the repository and is lost with the container. Add a short "Work in progress" pointer to it in `docs/HANDOFF.md`.
2. **Fix CI, which is red on #46.** The cause is outside this PR's code: the `quality` job in `.github/workflows/site.yml` runs `npx playwright install --with-deps`, which fails ("Playwright does not support chromium on ubuntu26.04-x64"). `ubuntu-latest` is now 26.04, which Playwright 1.56.1 doesn't support. Pin `runs-on: ubuntu-24.04` for `check` and `quality` (site.yml lines 23 and 55).
3. Fix the two failing new e2e tests (causes in section 2), or leave them out of the commit and say so. Never skip a test.
4. Commit twice:
   - Part 2 with the rig fixes and the CI pin;
   - Part 3 with the restraint.

   Each commit ends with:
   - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
   - `Claude-Session: https://claude.ai/code/session_01WWZGmuzqbbzMaXmL7weDvU`

   Push with `git push -u origin claude/sharp-cannon-807c29`. This session is subscribed to #46.

### 2. What the Chromium probes showed (local preview), and what to do

| Input | Result | Action |
| --- | --- | --- |
| Space, Page Down | One frame per press | Tests pass |
| Tap a swatch; tap "Skip the film" | Swatch goes to its grade; skip goes to the statement | Tests pass |
| `page.mouse.wheel` | CDP sends each event as its own precise gesture, so each snaps back and the page never leaves the top. This is not a real wheel. | Drop that test |
| `synthesizeScrollGesture` with `gestureSourceType: "mouse"` | Trackpad-like scroll | Use it for the trackpad test, with a distance under one screen |
| `synthesizeScrollGesture` with touch | Doesn't scroll in headless Chromium | Don't use it |
| `Input.dispatchTouchEvent` (touchStart, 8 touchMoves, touchEnd) | Scrolls, and flings | Use it for the flick tests |
| Normal flick, 260 px in 120 ms | One frame | None |
| Fast flick, 500 px in 80 ms | Two frames | Frames 40–55% of a screen apart (below) |
| Trackpad gesture, 600 px | Two frames | Same fix |

- **How Chromium snaps after a gesture** (measured): it takes the snap point nearest where the scroll would naturally have stopped, capped at the first point with `scroll-snap-stop: always`. The finger's own travel can still pass points; the stop only caps the momentum.
  - A normal flick travels 245–540 px, a fast one about 1100–1300 px.
- **What failed:** 140svh per grade (one screen apart, tried first) made flicks spring back, because the nearest point was the one just left. The rule: **every gap 40–55% of a screen** (under about 490 px on an 844 px phone), so a gentle flick still lands on the next frame.
- **What shipped (61db940):**
  - the film is back to 60svh per grade;
  - a "drop filled" frame at 9% splits the long run from the hero to the title, and the title's frame moves to 19.5%, inside its hold;
  - snapping turns off a pixel past the last grade's frame (an IntersectionObserver on it), so a flick from there carries on out of the film instead of springing back. Space and Page Down still end on the statement.

  | Screen | top → drop | drop → title | title → first grade | between grades |
  | --- | --- | --- | --- | --- |
  | Phone 390×844 | 425 px | 425 px | 284 px | 365 px |
  | Laptop 1440×900 | 461 px | 454 px | 302 px | 389 px |

  - Trade-off: a finger dragged further than a gap (284–425 px on a phone) can pass one frame.
- **A chapter link inside the film** lands on its frame only if snapping is on before the jump (Chromium doesn't re-snap when it turns on afterwards), so the click handler sets it first.
- **Chapter-dot test** expected the road at 0 px and got 68. With snapping off, `scroll-padding-top` (localnav + space-4) applies again. Compare against `getComputedStyle(html).scrollPaddingTop`.

### 3. The Apple rig's first run (run 40720514207, commit df47a9d)

| Job | Result | Artifact |
| --- | --- | --- |
| iPhone 18 Pro (iOS 27.0) | Failed with problems: today's glitch | `ios-film-27.0`, id 12831686695 |
| iPhone Duo (iOS 27.1) | Failed early; read its `appium.log` first | `ios-film-27.1`, id 12831227602, 8 KB |
| Safari 27 on macOS | Failed because the runner reduces motion (fixed locally) | `mac-film`, id 12831255201 |

- **Reading the artifacts:**
  - They expire on 11 November.
  - Download them with `mcp__github__actions_get`, method `download_workflow_run_artifact`.
  - Read `report.json` (one line per step) and the screenshots.
  - For contact sheets of the videos, use `scripts/extract_key_frames.py` from the `video-interaction-mapper` plugin.
- **After the push:** iterate until both iPhones and the Mac are clean, then merge #46 (squash, `fix(site): … (#46)`). Then the owner checks on their own iPhone.

### 4. Then, in order (details in the parts below)
1. **Finish #46 (PR A):**
   - Part 3's docs: the README "Motion" section, and the `brand` and `design-review` skills (the scroll-snap rule change);
   - `HANDOFF.md`, and a new `.claude/skills/motion/SKILL.md`;
   - a `design-review` pass with `shots --film` at 390 and 1440.
2. Canvas draft of Parts 4–9 and 11 for the owner (task #39).
3. PR E, the quote flow and the `/sent` peak (#44).
4. PR B, the loader, 3D drop, finale ring, gradients and sound (#40).
5. PR C, the marketplace (#41).
6. PR D1, agents and the WhatsApp doors (#42).
7. PR D2, the agent quote API and measurement (#43); the owner applies the migration.
8. Task #35, the design-system artifact: `index.d.ts` as `text/plain`, the index last.
9. Raise the home page's JS budget guard in `site/scripts/checks.mjs` to 150 kB.

### 5. Part 12: Cloudflare's own data, read by Claude (owner, 28 October: "we are on Cloudflare now; use its metrics")

**What the live site shows today** (read-only checks, 28 October):
- **The Worker:** `vasant-site` serves `www`, and Workers logs are on (`site/wrangler.jsonc`, `observability.enabled`).
- **AI training crawlers are blocked at Cloudflare's edge.** GPTBot, ClaudeBot and CCBot get a 403 on every page, `llms.txt` included. This is Cloudflare's AI bot blocking; our own `robots.txt` allows them.
- **Everyone else gets in (200):**
  - search: Googlebot and bingbot;
  - AI search and AI agents acting for a person: OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User;
  - also Applebot-Extended and meta-externalagent.
- **Cloudflare Web Analytics isn't running.** The CSP already allows its beacon (`site/src/server/headers.ts`, `site/public/_headers`), but the page carries none.
- **The connected Cloudflare connector** ("Developer Platform") reaches only Workers, KV, R2 and D1, so no analytics. The connector directory has no Cloudflare analytics connector.

**To read the data myself (₹0):**
1. **The owner adds Cloudflare's own MCP servers** as custom connectors in claude.ai (Settings → Connectors → Add custom connector), signing in with Cloudflare. All three URLs are from Cloudflare's docs ("Agent setup", read 28 October). Until then, the connected "Developer Platform" connector can list the Worker (`vasant-site`) and its code, but has no analytics.
   - **GraphQL Analytics** (`https://graphql.mcp.cloudflare.com/mcp`): traffic by page, country, device, browser, bot and status, plus Web Analytics once it is on.
   - **Workers Observability** (`https://observability.mcp.cloudflare.com/mcp`): the Worker's logs and errors, including the forms and `/api/click`.
   - **Optionally, the full Cloudflare API** (`https://mcp.cloudflare.com/mcp`): settings such as AI Crawl Control. Changes only with the owner's OK.
2. **Web Analytics on.** It is free and cookieless. The owner's choice of route:
   - the dashboard: Analytics & Logs → Web Analytics → automatic setup for the zone;
   - or a small PR: Cloudflare's beacon script with the site's public token in `site/src/layouts/Base.astro`, which the CSP already allows.

   It gives page views, referrers, countries, devices and browsers (the share of iPhone visitors sizes the iOS work), and Core Web Vitals by page.
3. **The owner decides on the AI training crawlers** (Cloudflare → AI Crawl Control).
   - **Recommended: allow GPTBot, ClaudeBot and CCBot.** The pages are public marketing. AI models that learn the catalogue can answer buyers' questions with it, which serves the "browsable by AI agents" goal.
   - The alternative is to keep blocking them.

**The first report, once connected** (an Artifact for the owner):
- **Traffic since the cutover (24 October):** visits, top pages, countries and cities, referrers, devices and browsers.
- **The funnel:** home, then marketplace or product, then quote, then `/sent`. Plus taps from `/api/click` (Supabase `log_click`) by page.
- **Bots and AI:** which crawlers fetch which pages, `robots.txt` and `llms.txt` hits, and 403s.
- **Health:**
  - Worker errors and CPU time;
  - 4xx and 5xx responses by path;
  - Core Web Vitals (LCP, INP, CLS) by page and device.
- **Use:** the numbers feed Part 11's "cut what doesn't pay", and the report repeats weekly.

**The owner's decisions (28 October):**
- **Let the AI training crawlers in.** The owner does it in the Cloudflare dashboard (AI Crawl Control, or Security → Bots → "Block AI bots" off), or I do it through the full API connector once it is connected, with their OK.
  - **Check afterwards:** the same requests with the crawlers' user agents (GPTBot, ClaudeBot, CCBot) on `/`, `/llms.txt` and `/catalog.json` must all return 200.
  - **Record the decision** in `docs/HANDOFF.md`, under the Cloudflare settings.
- **Web Analytics:** the owner switches it on in the dashboard (Analytics & Logs → Web Analytics → automatic setup for `vasantpetrochem.com`), so no code change.
  - **Check afterwards:** the home page's HTML carries `static.cloudflareinsights.com/beacon.min.js`, and the browser console shows no CSP errors on a phone or a laptop.

**Order:**
1. Once the owner has flipped both settings: run the two checks above.
2. Once the GraphQL and Observability connectors are added: the first report, an Artifact, then weekly.
3. Then the funnel numbers feed PR E and PR C, which put the polish where the leads are.

**Standing rules:**
- **Money:** ₹0.
- **Security:**
  - no secrets in chat or in the repository;
  - claims only from `content/claims.json`;
  - no inline `style=` attributes or inline scripts.
- **Database:** migrations are written by the agent and applied by the owner, then the security advisor is re-run.
- **Pull requests:**
  - drafts, subscribed;
  - merged when green: squash, titled `type(scope): summary (#n)`;
  - a small draft first for big visual changes;
  - the branch restarts from main after each merge;
  - PR bodies end with the Claude Code line and the session URL;
  - GitHub comments end with the Claude Code footer;
  - no model IDs.
- **Content and design:**
  - patterns from Apple's and Riot's stores, never their layouts or Valorant's music;
  - no dark patterns.

## Context

**The job (owner, 28 October):**
- AI agents can browse the site;
- it brings in maximum leads;
- it captures attention with enough curiosity to win long-term customers.

Every part below is judged against those three. The motion is how we earn the attention, never a wall in front of the content.

The owner's asks, 28 October:
1. **iPhones (and probably all Apple touch devices) glitch.**
   - What they see: jerky scrolling; stuck or overlapping words, grades or drop; flashing or blank areas.
   - The Mac is fine. They want the full film on iPhones, fixed autonomously.
2. **One flick, one oil.** Their teacher saw one flick send three oils past. Readers don't know how far to scroll and need an anchor.
3. **Not only iPhones.** Laptops and other devices suffer too. Treat it as **motion design with interactive elements**.
4. **3D and more captivating motion.** "The site is a demonstration of my capability."
5. **A finale:** a cinematic "Want more?" scene, led by a sentence, flowing into a 3D, interactive menu of where to go, with short descriptions.
6. **Dynamic gradients and spatial depth.**
7. **Skills first:** read every relevant skill, and name in the plan which skills each part uses.
8. **A loading screen with a button into the site;** Lusion, Igloo and Lando Norris as the main references.
9. **The marketplace, after Apple's buying pages and a Valorant-style store, with premium bassy sound.** Visitors don't see the grades today: 99% skim, and the 1% who read open the spec sheet.
10. **Agents, leads, long-term customers** (the job above).

**Brand-book rules that change by the owner's decision.** I record them in `design-system/README.md` "Motion", in the `brand` skill and in the `design-review` skill:
- "Native scrolling is never smoothed, snapped or hijacked" becomes: the film's grades snap one per flick with native CSS scroll snap, never scripted scrolling; scrolling is free everywhere else.
- Gradients move only with the scroll or the reader's hand, so "nothing advances on its own" stays.

### Platform facts (primary sources, read 28 October)

- **Safari 26.4** (24 March 2026): scroll-driven animations run on the compositor thread ("threaded"), so iOS 27 has this. No property list is published.
- **Safari 27.0** (17 September):
  - New: **scroll anchoring** (`overflow-anchor`, default `auto`), with many fixes for jumps and flashes it caused.
  - Fixed: `animation-fill-mode` with viewport units after a resize; fixed bars flickering during rubber-banding; on iOS, mandatory snap and smooth scrolling after the toolbar hides.
- **Safari 27.1** (23 October, iPhone Duo): viewports run from 382 to 951 px wide and 368 to 902 px tall. The outer display in landscape is 594×368. The tab bar shrinks on scroll.
- **WebKit bugs:**
  - **327193** (iOS 27 and macOS Safari 27): a scroll-driven `translate` keyframe of `none` is drawn as the base value. Fixed in WebKit on 23 October, in no named release yet. Workaround: end keyframes on `0 0`.
  - **283582:** view timelines on **sticky** elements compute wrong progress. Still open. Never put a timeline on a sticky element.
  - **304189:** iOS updated scroll-driven animations at 60 Hz. Fixed December 2025.
- **Safari 27.2** (26 October, iOS 27.2: the latest release): the only animation item is that `animation-range` now resolves correctly under `zoom`. Nothing on bug 327193, so its workaround stays.
  - The runner's image has the iOS 27.2 SDK but only iOS 27.0 and 27.1 simulator runtimes.
  - The rig tries `xcodebuild -downloadPlatform iOS` for 27.2 (cached), and otherwise uses 27.1.

### Why it glitches

- **iPhone:**
  1. Every Apple WebKit browser plays the film through `scrub.ts`, a main-thread engine, while iOS scrolls on its compositor, so the film trails the finger.
  2. Toolbar changes trigger full rescans, and iPhone heights straddle the film's `@media (max-height: 760px)`.
  3. Some keyframes can't run threaded: `z-index`, `pointer-events`.
  4. `liquid.ts` reads layout every frame.
  5. Bug 327193.
- **Every platform:**
  - nothing stops a flick between grades (a slot is 83svh, so a trackpad or flick burst runs past several);
  - there is no sense of position or length;
  - every section also fades and rises as it enters. The `frontend-design` skill calls that "the generic default", scattered effects instead of one orchestrated moment.

## Skills to read and apply, by part

Read before working on that part. I have read every one of these already.

| Part | Skills | What they contribute |
| --- | --- | --- |
| All parts | `ponytail` | The smallest diff that works, no new dependencies. Each piece of logic leaves one runnable check. |
| All parts | repository `brand` | `design-system/` is the single source. The owner approves brand changes. Pull requests carry before and after screenshots. |
| All parts | repository `design-review` | Five lenses at 390 and 1440, with `shots --film` and `--reduce`, before every pull request. |
| 1. iOS rig | `video-interaction-mapper` (Figma plugin; its `scripts/extract_key_frames.py` runs without Figma) | Scout pass at 1 fps, contact sheet and scene-change scores on the Simulator videos. The same script would read a screen recording from the owner's phone. |
| 1. iOS rig | `video-making` | Shoot the key moments as stills first. JPEG at quality 92 for page filming. |
| 2. Engine fix | `apple-design` (`motion.md`, `designing-for-iphone-duo.md`) | Motion is purposeful and optional. The Duo must work at every pose, from 368 px tall to 951 px wide, without extreme layout changes on folding. |
| 3. Flick, anchor, pacing | `apple-design` (`scroll-views.md`, `page-controls.md`, `gestures.md`) | "Consider supporting page-by-page scrolling"; "show a page control"; "make it apparent when content is scrollable"; "avoid animating page transitions during scrubbing; animate only for tapping"; more than about 10 dots is too many. |
| 3. Flick, anchor, pacing | `frontend-design` | Numbered markers only for a real sequence: the colour scale is one, so `03 / 08` earns its place. |
| 4. 3D drop and depth | `frontend-design` | Spend boldness in one place: the drop. Remove one accessory. |
| 4. 3D drop and depth | `apple-design` (`materials.md`) | Depth from layering, and no glass in the content layer. |
| 4. 3D drop and depth | `algorithmic-art` | Write the shader's philosophy first (one paragraph: what the light and liquid do), then the code, with craft in every parameter. |
| 5. "Want more?" and the ring | `frontend-design` | One orchestrated moment; motion answers the reader's action; calls to action say what happens ("Open the marketplace", not "Go"). Plain, sentence-case copy. |
| 5. "Want more?" and the ring | `apple-design` (`gestures.md`) | More than one way to interact. Respond at once. Make the swipe learnable. **Never conflict with the iOS edge-swipe back gesture.** |
| 5. "Want more?" and the ring | repository `catalog` | Descriptions only from content that already exists. |
| 6. Gradients and spatial | `algorithmic-art` (flow fields, seeded noise) for the field's design; `canvas-design` (visual philosophy) for the draft stills; `apple-design` (`color.md`) | Colour carries meaning: each destination's tint. |
| Drafts | `artifact-design`, `artifact-emulator` | Artboards on the "Sunlit Gold Draft" canvas, viewed in the real viewer before sending. |
| Review | `code-review`, `simplify`, `ponytail-review`, repository `design-review`, `apple-design` | Before each merge. |
| Packing for the next agent | `skill-creator` | A new repository skill, `.claude/skills/motion/SKILL.md`: the motion system, its rules, and how to run the iOS rig. |

**Directory plugins** (cards shown, none enabled yet):
- Design: `frontend-design` plugin, Design, `design-skills`, Fairmind.
- Motion: `agentic-council` (`motion-design`, `interaction-design`, `navigation-design`), the React engineers' set (`ui-motion`, `ui-interactions`, `css-animations`), `parallax-threejs` (shader review), `perception-first-design` (pacing).

If the owner enables any, I read their skills too and add them to the table.

## Inspiration board (the owner browses and picks; their picks decide what Parts 4–6 implement)

| What we're after | Look at | Where people praise or explain it |
| --- | --- | --- |
| Interactive motion, cursor-reactive | landonorris.com (OFF+BRAND) | Awwwards Site of the Year 2025; DesignRush on its reactive blobs |
| A 3D world you scroll through | igloo.inc, messenger.abeto.co (abeto) | Awwwards case study (fluid simulation); 2025 Developer Award |
| 3D you play with | bruno-simon.com | Awwwards Site of the Month, January 2026 |
| Shader-level craft | lusion.co | Lusion v3 Site of the Year 2023; an Awwwards juror calls Lusion "perhaps the most influential WebGL/shader studio" |
| Pinned scenes, depth scrolling | apple.com product pages (AirPods Pro) | CSS-Tricks rebuild; uxdesign.cc "Get ready for depth scrolling" |
| Dynamic gradients | stripe.com | dev.to recreation; GSAP forum (also: it drains battery) |
| The 3D ring menu and reactive gradient | Codrops: 3D infinite carousel with reactive background gradients (2025); scroll-reactive 3D gallery with mood backgrounds (2026); the 3D Carousel demo (2026) | Codrops tutorials |
| Native CSS scroll-driven motion (what we build with) | scroll-driven-animations.style (Bramus); Codrops CSS-only carousels | Demos with explanations |
| A raymarched liquid-glass drop | LiquidBlob (feega PR #228), Glassworks | Caution: Grafit agency on liquid glass breaking in Safari and being heavy |

Most of these use Three.js, GSAP or Lenis. I'd take their look and feel and build it natively, so it stays smooth on iPhones and within budget.

**The owner's picks (28 October):**
- Lando Norris, Igloo / Messenger and Apple product pages; Lusion "killed it".
- "Copy their recipes and the things we miss, except actual photos for now."
- Add a loading screen, with a button to proceed into the site.

### The recipes we copy (no photography for now)

Sources: case studies and the sites' own markup.

**Igloo Inc** (abeto; Awwwards Site of the Year 2024; their case study):
- **A real-time intro that "flows seamlessly into the rest of the experience".** For us, the loader hands straight into the hero, rendered live and never a video.
- **Scroll is the navigation:** few sections, each a distinct object. For us, every grade is its own moment: the liquid moves with its grade's weight, heavy and slow for bitumen, thin and quick for turpentine. The order is darkest to lightest, already true to the product.
- **Scene transitions** mix chromatic aberration, displacement and frost. For us, a short refraction ripple and colour fringe passes through the drop as the next grade pours in, inside the shader.
- **Particles that change colour with speed and glow as they morph** (their footer links). For us, the finale's light field reacts to scroll speed.
- **Glitch and scramble text drawn without restyling the page** ("HTML/CSS scrambles force the browser to recalculate styles"). For us, rolling digit counters, moved by transforms only, for the loader and the rail's `03 / 08`.
- **Music and sound matched to the motion.** For us, optional synthesized sound (below).
- **Performance measured continuously on low-end devices.** For us, the iOS rig and the budgets.

**Lusion** (Site of the Year 2023; their markup, and their 2019 case study):
- **A preloader with rolling percentage digits** (`preloader-percent-digit-num`). That is the model for our loader's counter.
- **One `<canvas>` behind the DOM interface** (`<canvas id="canvas">`, then `<div id="ui">`). Lusion is also built with Astro, like our site.
- **A header with a menu button, a sound toggle (PLAY / MUTE) and "Let's talk".**
- **Explicit scroll cues:** "scroll to explore", "continue to scroll", "keep scrolling to learn more".
- **Bake the heavy work, blend it live.** In 2019:
  - cloth was pre-simulated, then blended with the reader's input;
  - 11 keyframes were interpolated for 66 frames;
  - lower-resolution assets went to mobile;
  - lighting was pre-rendered into matcap images.

  For us, the glass drop shades from a tiny pre-rendered matcap of the gold-lit light box, which looks real at almost no cost.
- **A point light follows the cursor, and the camera turns about 1.7°.** For us, the drop's highlight follows the pointer on laptops, and the finger on phones.

**Apple product pages:**
- one idea per pinned screen;
- big type that resolves;
- depth through scale and blur as you scroll;
- cards that stack.

**Lando Norris** (OFF+BRAND, Site of the Year 2025; the studio's case study and the site's markup):
- **An explicit entry control:** "Load Norris". For us, the loader's "Enter".
- **On touch, "tap to lock" and "Back to scroll":** an object takes the finger until you let it go. For us, tap the drop or the ring to hold it and turn it in 3D, and "Back to scroll" returns. This is the phone's way into the interactive parts, without fighting the page's scroll.
- **Hover swaps through fade masks** (helmet cards with base and hover images and mask PNGs). For us, a grade tile's drop pours in its colour through a mask wipe on hover or tap. No photography needed.
- **Stacked display headings** ("ON / TRACK"). For us, two-line Schibsted 900 titles for the chapters.
- **One loud accent on a quiet ground** (#D2FF00 on #111112). Ours is already one gold on ivory.
- **Rive vector animations, a 360° helmet view, Lenis smooth scrolling.** We take the ideas (animated marks, a drop you can turn), not the runtimes:
  - Rive adds a heavy runtime;
  - Lenis takes over the scroll, which is what breaks iPhones.
- **Landscape phones get "Please rotate your device".** We prefer the still page on screens under 480 px tall.

**What the budget allows.** Lusion ships about 305 kB of JavaScript, Lando Norris about 370 kB, and our whole home page about 6 kB today. Everything here is hand-written: the drop shader, the loader, the ring, the light field and sound. It fits if the **home page's budget rises from 20 kB to 40 kB gzipped**, the marketplace's figure already. That is the owner's call, flagged in the plan.

**Optional sound** (both Igloo and Lusion have it):
- Synthesized in the browser with Web Audio, so there are no files and it costs nothing.
- Sounds: a soft pour as each grade arrives, a low tone on Enter, light ticks on the ring.
- Off by default. The loader offers "Enter" and "Enter with sound", and a mute toggle sits in the header.

**Brand-book rules this changes (owner's decision, recorded in the brand book):**
- **"No loading screens"** becomes: one opening loader on the first visit of a session, on the home page only.
- **"No custom cursors"** becomes: the system cursor always stays, and a light or blob may follow it and react (Lando Norris), on pointer devices only.
- **Scrolling stays native.** No smooth-scroll library; that is what keeps iPhones smooth.

## Part 7: the opening (loader) and the button into the site

- **First visit of a session, home page only:**
  - The drop fills from empty to the brand level as the experience loads: fonts, the shader compile, the first frames. A `0–100` counter in Plex sits beside it.
  - When ready, an **"Enter"** button appears.
  - Enter plays the handoff: the drop rises into the hero and the morning light floods in from the north-east.
- **Never a trap:**
  - The page's content is server-rendered underneath the whole time, for search engines and for anyone without JavaScript.
  - **Agents and automated browsers skip it** (`navigator.webdriver`, as with computer-use agents and crawlers that run scripts), as do readers without JavaScript. The loader's own tests force it on with `?loader=on`.
  - A visible "Skip intro" link sits on it from the first frame.
  - Readers who reduce motion get no loader.
  - Returning visits in a session skip it.
  - Escape or Enter also proceeds.
  - A CSS failsafe fades the loader after about 8 seconds if the script never runs.
- **Built with `<dialog>`:** opened with `showModal()`, so focus is trapped on Enter; progress is announced through `role="status"`.
- **Tests:** progress, Enter by tap, click and keyboard, reduced motion skips it, and the failsafe.
  - Existing tests skip it with a session flag.
  - Lighthouse budgets still hold, since the loader's own drop and counter paint first.
- **"Skip the film"** and the chapter anchor stay, as the way out of the film itself.

## The motion system (brand book, drafted on the canvas first)

- **Storyboard per scene,** with its beats: enter, hold, leave. Holds take most of each beat. Every scroll position is a composed frame.
- **Tokens:**
  - interaction durations: hover and press about 150 ms; the ring settles in about 400 ms;
  - easings: `ease-out` for entrances and releases, linear only when scrubbed by scroll;
  - distances: words 28 px, cards lift 2 px, depth up to `translateZ(120px)`.
- **States for everything you can touch** (rail swatches, chapter dots, ring cards, buttons): rest, hover (pointer only), press, focus-visible, dragging, selected. Each shows within a frame.
- **Inputs, all landing on whole frames:**

  | Input | What it does |
  | --- | --- |
  | Touch flick | One grade |
  | Trackpad swipe, with its inertia | One grade |
  | Mouse wheel notch | One grade |
  | Space or Page Down | Next frame |
  | Arrow keys on the ring | Turn it |
  | A swatch or chapter dot | Jump there (animated only on tap) |

- **Restraint:** the site-wide fade-and-rise on every section and card goes. Pages open with their one title moment, and the home page keeps its one film.

## Part 1: an iOS 27 rig I run myself (₹0)

- **The workflow:** `.github/workflows/ios.yml` on `runs-on: xcode-27`.
  - macOS 27, Xcode 27.1, Safari 27.
  - Simulators: iOS 27.0 (iPhone 18 Pro and others) and iOS 27.1 (iPhone Duo).
  - Free, since the repository is public.
  - It runs on `workflow_dispatch` and on pull requests touching `site/`.
- **Steps:**
  1. Build with the Turnstile test key and serve at `localhost:4321`.
  2. With Appium's XCUITest driver, make real finger swipes in Mobile Safari, so the toolbar hides and shows: slow, normal and fast flicks, down and up, through the film, the finale, a product page and the marketplace.
- **Captures:**
  - Simulator video, a screenshot after each swipe, contact sheets from `extract_key_frames.py`;
  - after each swipe, in-page checks (shared `site/tests/film-checks.ts`): one whole grade, nothing overlapping, the snap landed on the next grade, the counter is right, the engine is off on iOS, animations run on native timelines, `requestAnimationFrame` gaps.
- **Desktop Safari 27 on the same runner** (safaridriver): mouse-wheel and keyboard checks.
- **How I use it:** I download the artifact through the GitHub MCP, review the frames and iterate. The first run records today's glitch as the baseline.
- **Fallback:** a minimal XCUITest target if WebDriverAgent won't build.

## Part 2: iPhones play the film on the compositor (iOS-only cause)

- **Detector:** `-webkit-touch-callout`, which exists only in iOS and iPadOS WebKit.
  - `motion.ts` loads `scrub.ts` only without native scroll-driven animations, or on non-iOS Apple WebKit (the Mac stays as it is).
  - The Safari blocks in `motion.css` exclude iOS.
  - iOS 18 and older get the still page.
- **Short screens:**
  - `@media (max-height)` becomes `@container` queries on the `100svh` stage, and there is no `dvh` in the film.
  - Screens under 480 px tall (phones in landscape, the Duo's outer display in landscape at 368 px) get the still page: no room to pin a stage.
- **Keyframes that can run threaded:**
  - no `z-index` or `pointer-events` alongside motion (`pointer-events` gets its own animations);
  - explicit `translate: 0 0` endpoints (bug 327193);
  - no timeline on a sticky element (bug 283582).
- **Scroll-linked words get the page scroll:** `.vp-statement` becomes `overflow: clip`.
- **Scroll anchoring:** `overflow-anchor: none` on the pinned scenes if the rig shows anchoring jumps (Safari 27.0 turned it on).
- **`liquid.ts`:** progress from geometry cached on resize, plus `scrollY`.

## Part 3: one oil per flick, an anchor, pacing (every platform)

- **Snapping:**
  - Each grade's held frame snaps with `scroll-snap-stop: always`.
  - It is `mandatory` only while the film is pinned: sentinels and an IntersectionObserver switch it on enter and leave, never per frame.
  - The film's first and last frames snap too.
- **Pacing:**
  - slots drop from 83svh to about 60svh, with longer holds and quicker cross-fades;
  - the rig and Playwright confirm one input moves one grade: flick, trackpad, wheel and Space.
- **The colour scale becomes the film's page control:** `03 / 08` with the grade's name, a filling hairline, and each swatch a link.
- **The home page's chapter anchor:** Hero, Grades, Our word, The road, Want more. Dots on laptops, a hairline under the header on phones. Filled by a native `scroll()` timeline; every chapter is a link.
- **Cues:** a "Scroll" cue under the hero, gone at the first scroll; "Skip the film" beside the rail and on keyboard focus.

## Part 4: 3D, built on one idea: the drop held to the light

- **The drop becomes a raymarched glass drop,** one hand-written WebGL shader in `liquid.ts`:
  - Fresnel edges, refracting the light box;
  - a meniscus that sloshes with scroll speed;
  - light from the north-east;
  - a quarter-turn as each grade pours in.
- **Who moves what:** CSS moves and sizes it (compositor); the shader paints only the inside.
- **Limits:** capped march steps, at most 1.5× resolution and 30 fps on phones, the watchdog falling back to today's liquid and then to the SVG, and under 4 kB gzipped.
- **Depth around it, in CSS 3D transforms (threaded):**
  - grade names come forward out of the light;
  - swatches turn like tiles;
  - the road recedes in perspective.

## Part 5: the finale, "Want more?" leading into the menu (replaces the explore tiles)

- **The sentence:**
  - "Want more?" resolves out of the light.
  - Then a sentence writes itself, naming the doors in the pages' own words from `content/`.
  - Each named door glows as it is read, and turns its card to face you in the ring below (same timeline, `rotateY`, threaded).
- **The ring:**
  - **Cards:** Marketplace, Live offers, Industries, Supply and the road, Documents, Source a grade, About, Get a quote. Each has a one-line description and a call to action that says where it goes.
  - **Light:** lit from the upper right, the far cards softly blurred.
  - **Then it is yours:**
    - drag or swipe sideways, with inertia;
    - the drag zone is inset from the screen's edges, so the iOS back-swipe still works;
    - arrow keys, and tap or Enter to go.
  - **The swipe can be learned:** the side cards peek in, and a one-time "Swipe to explore" hint shows.
  - **Built on plain links:** an ordered list underneath for keyboard and screen readers. Reduced motion gets a flat grid.
  - **Small:** about 2–3 kB of JavaScript, running only during a drag.
- **Every card is a door that leads somewhere useful for a lead:**
  - "Get a quote" is always one of the cards, with "Pricing within 24 hours" (only claims from `content/claims.json`).
  - "Ask on WhatsApp" sends a prefilled message.
  - "Today's lots" goes to the offers board.
- **The scene's last frame** holds the quote button and the sticky quote list, so nobody leaves the finale without a next step.
- **Dynamic gradients and depth (Part 6):**
  - Soft fields in Sunlit gold, ivory and each destination's tint drift with the scroll and the ring. They are cross-fades of pre-coloured layers moved by transform, so threaded.
  - Three depth layers (sentence, ring, light) move at different rates, and shadows follow the ring.
  - The gold close stays the heaviest block, at the foot (vastu).

## Part 8: the marketplace, glanceable (Apple's buying pages and a Valorant-style store, as patterns)

- **What's wrong today:** every card is a dense spec block (summary, several specs, packaging, two controls).
  - The owner's read: 99% of visitors skim, and the 1% who read go to the full spec sheet anyway.
  - So the marketplace sells at a glance, and the product page stays the spec sheet.
- **A featured hero,** as in a game store's featured bundle:
  - one grade or live lot, large, its drop in its own light, the name, one line, "Add to quote" and "See the specs";
  - a countdown only when a real live offer carries an end date (offers board data).
- **The lineup:** every grade as a big tile in colour order, darkest to lightest.
  - Each tile shows the drop, the name, the code, one "for" line (its first application) and "Add to quote".
  - On phones it is a horizontal shelf that snaps one tile per flick; on laptops, a grid.
  - Interaction states: lift and light on hover; on add, the drop pours in its colour through a mask (Lando's recipe) and the quote counter rolls.
- **Filters become one row of chips:** All, then each family. Industry and the rest stay in the existing sheet.
- **"Which grade is right for you?"** (Apple's help-me-choose): pick your industry, then an application, and the matching grades light up.
  - Built from `content/products` industries and applications only, so no new claims (the `catalog` skill).
- **Compare** (Apple's compare models): choose two or three grades and see their key specs side by side on the existing `/marketplace/compare` page. This is for the 1%.
- **A sticky quote bar** (Apple's summary bar): "3 grades in your quote list, Review quote". It replaces the compare tray's separate bar.
- **Live offers as a "night market" reveal:** today's lots face down; one tap turns each card to show the lot.
  - Reduced motion gets them face up.
  - Only real offers from the board.
- **Kept:** search, the full filter sheet, the empty state, "Source any grade", the structured data and every existing e2e behaviour (the add, compare and filter tests move to the new markup).
- **Not copied:** Apple's or Riot's actual layouts, artwork or music. We take the patterns. Valorant's store music is Riot Games' copyrighted work and can't be used; Part 9 composes original sound instead.

## Part 9: sound, original, bassy, opt-in, site-wide

- **Composed in code** with the Web Audio API (oscillators, filtered noise, a sub-bass pad), so there are no files, no licence, no cost, and about 2 kB.
- **A low, premium bed** under the home film and the marketplace. It swells with the scroll's speed and settles when you stop.
- **UI sounds:** a pour as each grade arrives, a soft thud on "Add to quote", ticks as the ring turns, a low tone on Enter.
- **Off until chosen:** "Enter with sound" on the loader, and a sound toggle in the header on every page, remembered between visits.
  - Sound pauses when the tab is hidden.
  - It never autoplays; browsers forbid it anyway.
- **Limit:** the site's pages are separate documents, so music restarts softly on each page. Continuous music across pages would need client-side navigation; that's a later step, if the owner wants it.

## Part 10: agents, leads, and customers who come back

**What already exists** (reused):
- `llms.txt`, `llms-full.txt` and `catalog.json`;
- the sitemap and the search index;
- product JSON-LD with every spec (`additionalProperty`), Organization, LocalBusiness, FAQ and breadcrumbs;
- `/quote?add=<slug>` prefill;
- prefilled WhatsApp links (`whatsappHref` in `lib/company.ts`);
- call, WhatsApp and email taps counted per page and campaign (`/api/click`, VP-LEAD-007);
- Turnstile-protected forms (`/api/rfq`, `/api/tds`).

**Agent-browsable, for ₹0 and with no database change:**
- **`llms.txt` gains "Buying as an agent":** the fields a quote needs (grade, quantity and unit, packaging, delivery city or PIN, timing, buyer's name, company, phone and email), the prefilled quote link, and the WhatsApp and email routes.
- **A public `/offers.json`** with today's lots from the offers board, linked from `llms.txt`. `robots.txt` blocks `/api/`, so agents can't read today's endpoint.
- **Agents in a browser are never blocked:**
  - no loader for them;
  - the 3D ring is plain links underneath;
  - every control has visible text;
  - nothing is hover-only.
- **An "agent pass" e2e test:** with JavaScript off and with `navigator.webdriver`, every grade, spec and door is reachable and every form is labelled.

**Leads, at every peak of attention:**
- each grade's frame in the film ("Add to quote", "Ask on WhatsApp");
- the finale's doors;
- the sticky quote list (home page after the film, and the marketplace);
- the marketplace hero and tiles;
- the product page.

We avoid dark patterns: no exit pop-ups and no fake scarcity (countdowns only from real offer end dates).

**Long-term customers:**
- **"Get today's lots on WhatsApp":** a prefilled opt-in message to the sales desk, which keeps a broadcast list. ₹0, if the owner wants to run it.
- **Curiosity that renews:** the night-market reveal of real daily lots, and the finale's ring. Later:
  - "Notify me when this grade is available" (needs storage and consent);
  - the buyer portal (Release 2, on hold).

**The owner approved all of the following on 28 October:**
- the agent quote requests;
- the lead measurement;
- the WhatsApp lots list;
- an unlimited JavaScript budget.

**How the database changes go in:** I write the migration and its SQL tests; the owner applies them; then the security advisor is re-run.
- **Agent quote requests:**
  - an API at `POST /api/agent/rfq`, described at `/openapi.json`, later also as MCP tools (Release 3);
  - an agent sends a structured request, and the buyer gets a confirmation email (Resend, already set up);
  - only confirmed requests reach the sales desk;
  - rate-limited, with no Turnstile, since agents can't solve it.
- **Lead measurement:** new `/api/click` kinds (film finished, finale reached, a ring card opened, added to quote, WhatsApp opt-in). They need the `log_click` function to accept them, so we can see which moments bring leads.

## Part 11: conversion design: think like the CFO and the CMO

**The CFO: spend attention where it pays, cut where it leaks.**
- **A funnel per visit,** from Part 10's measurement:
  1. lands;
  2. film at 25, 50 and 100%;
  3. finale;
  4. door opened;
  5. product page;
  6. added to quote;
  7. quote sent, WhatsApp or call.

  A weekly summary goes into the hub's existing daily digest (`/api/cron/daily-digest`): which scenes and pages make leads, and which leak.
- **Cut what doesn't pay:** a scene or page with high exits and no assists gets shorter or goes. Every page has one primary action, and nothing is slow.
- **Spend where it pays:** the product pages, the quote flow and the daily offers get the most polish.
- **Acquisition stays ₹0:** search and AI answers (`llms.txt`, structured data) and the WhatsApp list, no paid ads.

**The CMO: a high that ends in a quote request.**

Honest persuasion, no dark patterns:
- **Curiosity gaps:** the hero teases ("Every oil has its colour"), each grade is a reveal, "Want more?" opens the doors, and the daily lots are face-down cards.
- **Progress you can see:** the chapter rail fills, and the quote list is a small tank that fills with each added grade's colour (collection and endowed progress).
- **A micro-reward on every add:** the pour, a bass thud if sound is on, and the counter rolling.
- **A small yes first:** "Add to quote" asks for nothing. The short form comes after (commitment and consistency).
- **A quote form that is mostly done when it opens:**
  - the grades are already in;
  - quantity chips (one tanker, 10 MT, custom), the unit toggle, and the grade's own packaging;
  - city or PIN;
  - name, and phone with WhatsApp;
  - a visible "2 of 3", and it saves as you type.
  - A returning visitor sees "Finish your quote, 2 grades waiting".
- **The peak at the end (peak–end rule):** `/sent` becomes the celebration.
  - The drop fills to the brim in gold, with a deep bass hit if sound is on.
  - "Request received", with a reference number, and "Pricing within 24 hours" (from `claims.json`).
  - Two next steps: "Chat now on WhatsApp" and "Get today's lots on WhatsApp".
- **The fastest lead for the impatient:** "Ask on WhatsApp" on every grade, prefilled with that grade.
- **The lines we don't cross:**
  - no fake scarcity, counts or testimonials (claims only from `content/claims.json`);
  - no shaming wording, and no pre-ticked consent;
  - reduced motion and sound off get the same rewards, silently.

**Files:**
- `site/src/pages/quote.astro`, `site/src/islands/quote.ts`, `site/src/pages/sent.astro`;
- the quote bar component;
- the sound module (Part 9).

**Tests (preview dry runs):**
- the form opens prefilled;
- progress counts up;
- the confirmation shows its reference and both next steps;
- no sound unless chosen.

## Drafts first (the owner's rule)

1. **Canvas artboards** on the "Sunlit Gold Draft", phone and laptop, checked with `artifact-emulator` before sending:
   - the motion storyboard;
   - the rail and counter;
   - "Want more?" and the ring;
   - the 3D drop.
2. **Then a live draft** on the pull request's preview link, on the owner's phone and Mac.

## Tests

- **`site/tests/unit/motion-css.test.ts`:**
  - threadable keyframes;
  - explicit `translate` endpoints;
  - no height media queries in the film;
  - no timeline on a sticky element;
  - one iOS detector.
- **`film.spec.ts`** (Chromium, Linux WebKit, Firefox, phone and laptop):
  - one grade per snap;
  - one grade per flick, wheel notch, trackpad burst and Space;
  - the counter and the anchor match what's on screen;
  - swatch and chapter links work, and "Skip the film" works;
  - the ring turns by drag and by arrow keys, and its links work by tap and by keyboard;
  - reduced motion gives a flat grid;
  - every iPhone Duo pose from the Safari 27.1 table: 382×580, 594×368, 669×867, 951×585, 385×571.
- **Budgets:**
  - The owner lifted the limit ("unlimited budget"). The home page's JS budget in `scripts/checks.mjs` rises to 150 kB gzipped, kept as a guard against accidental bloat rather than a cap on the design.
  - Lighthouse stays at performance 0.9 or better and CLS 0.02 or less. Speed still feeds search ranking and leads, and the loader makes any wait feel intended.
- **The iOS rig** is the gate for iPhone 18 Pro (iOS 27.0) and iPhone Duo (iOS 27.1).

## Ship order

1. **Merge #39,** the handoff (green). Restart `claude/sharp-cannon-807c29` from main.
2. **PR A, urgent:**
   - the rig and its baseline run;
   - Part 2;
   - Part 3;
   - the motion system's restraint (the site-wide reveals go).

   Iterate until the rig is clean, merge when green, then the owner checks on their iPhone.
3. **Canvas draft** of Parts 4–9 and 11 (including the quote flow and the `/sent` celebration), then the owner's comments:
   - the loader and Enter;
   - the 3D drop;
   - "Want more?" and the ring;
   - the marketplace, with its hero, lineup, chips, helper and quote bar.
4. **PR E, first after the draft** (the CFO's call: the highest return):
   - Part 11, the quote flow and the `/sent` peak;
   - "Ask on WhatsApp" on every grade;
   - the sound module's confirmation hit.

   Live preview, then the owner's OK, then merge.
5. **PR B:** Parts 4–7 and 9 (home page, loader, sound). Live preview, then the owner's OK, then the rig clean, then merge.
6. **PR C:** Part 8 (the marketplace), with its lead moments. Live preview, then the owner's OK, then merge.
7. **PR D1,** alongside PR A: `llms.txt` "Buying as an agent", `/offers.json`, the agent-pass test, and "Get today's lots on WhatsApp" doors. No database change; merge when green.
8. **PR D2:** the agent quote API (`/api/agent/rfq`, `/openapi.json`, email confirmation) and the new click kinds, with their migration and SQL tests.
   - The owner applies the migration, then I re-run the security advisor and merge.
   - The code stays off (`404`) until the migration exists.
9. **Each PR updates:**
   - `docs/HANDOFF.md`;
   - `design-system/README.md` "Motion";
   - the `brand` and `design-review` skills' motion lines;
   - the new `.claude/skills/motion/SKILL.md`.

**Limit:** the Simulator proves iOS WebKit's behaviour, not a phone's GPU, so the owner's phone is the last check.

**Afterwards:** task #35, the design-system page on claude.ai.
