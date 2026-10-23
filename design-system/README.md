Vasant Petrochem manufactures and trades base oils, bitumen, industrial fuels, process oils and solvents from Mangaliya, Indore, for plants, road projects and blenders across Central India. This system has one job: make every product easy to understand and easy to buy, on a phone in a plant yard and on a laptop in a purchase office. Its one signature is **the product drop**, the chrome-and-gold drop from the logo, refilled with each product's own liquid. Everything around it stays quiet.

## Principles

- **A datasheet that sells.** Lead with what the product is and its numbers, then where it is used, then how to buy it. Specs are content, not decoration.
- **One signature, spent in one place.** The drop is the brand's moment. Cards, buttons and type stay calm around it.
- **Each colour means one thing.** `brand` green means *act*. `gold` means *the product*. `accent` emerald means *live, active or done*. Never swap them.
- **Glass only floats.** The translucent `glass` fill is for chrome that floats over content (the product local nav, the phone action bar, the WhatsApp pill), never for cards or sections.
- **Phone and laptop are equals.** Every component has a phone layout (below 1024px) and a laptop layout (1024px and up) in one responsive tree. Never ship two copies of the same markup.
- **Nothing invented.** Show only the catalog's own data and the claims listed under Voice. No certifications, capacities, client names or superlatives until there is a document behind them.

## Voice and copy

Plain, specific and unhurried, the way a good sales desk talks on the phone. "We" is Vasant Petrochem; "you" is the buyer.

- **Sentence case everywhere**: headings, buttons, navigation, labels. Eyebrows and spec labels are set in capitals by CSS only (the `label` style), never typed in capitals.
- **Buttons are verbs**: *Get a quote*, *Chat on WhatsApp*, *Download the TDS*, *Send enquiry*, *View*. An action keeps its name: *Send enquiry* ends in *Request received* with the reference `VP-ENQ-YYYYMM-####`.
- **Grade codes and values exactly as the catalog has them**: `SN-500`, `90-110 cSt`, `> 66 °C`. Never round, reformat or restyle a value.
- **Allowed claims**, each already published on the site (`Vasant.claims` in the bundle):
  - Pricing within 24 hours.
  - Test reports available on request.
  - Drums or bulk tanker (use the product's own `packaging` line where there is room).
  - One point of contact, quote to dispatch.
  - From Mangaliya, Indore, across Central India.
- **The disclaimer is one sentence, used verbatim** under every spec table and on every TDS: *Typical values, not a guarantee of specification. Test reports are available on request.* (`Disclaimer` component.)
- **Errors say what to do**, next to the field, with an icon: *Enter your name so we know who to reply to.* No apologies, no alerts.
- No emoji, no exclamation marks, no "best", "leading" or "No. 1".

### Writing for international buyers

Many readers buy in a second language, in the Middle East and beyond, often through a translation tool. The site is in English only, with no translated pages (owner's decision, 22 October 2026). Write so a translation cannot go wrong:
- One idea per sentence, in plain international English. No idioms, metaphors or Indian-English office phrases ("kindly revert", "do the needful", "prepone", "lakh", "crore").
- Units:
  - SI, with the unit always written (`210 L drum`, `20 kL tanker`, `MT` for tonnes);
  - temperatures in °C;
  - viscosity in cSt with its temperature.
- Dates written out: *21 October 2026*, never `21/10/26`. Times carry their zone: *9:00 AM–6:00 PM IST*.
- Phone numbers in international form, `+91 94250 58496`, and a WhatsApp link wherever the number appears.
- Prices and terms only from the sales desk, never on the site. Incoterms 2020 names appear only once `exports` is on (an IEC exists, VP-HUM-008), and the site makes no export claim before then.

## Colour

Grounds are `cream` (every page), `parchment` (alternate bands and the drop's stage) and `paper` (cards, tables, fields). `deep` is the dark band: at most two per page (the documents card and the closing call to action), plus the footer strip and ad grounds.

| Role | Tokens | Rule |
| --- | --- | --- |
| Text on light | `ink` · `body` · `secondary` | Headings `ink`, copy `body`, labels and captions `secondary`. All pass on `cream`, `parchment` and `paper` (lowest: `secondary` on `parchment`, 4.8:1). |
| Text on dark | `on-deep` · `on-deep-secondary` | On `deep`, `deep-raised` and `deep-field` (lowest: 6.6:1). |
| Act | `brand` · `brand-pressed` · `on-brand` · `brand-tint` | The only action colour on light grounds: primary buttons, links, selected chips, focus. One primary button per view. |
| Live, active, done | `accent` · `on-accent` | Status dots, success ticks, the focus ring on dark grounds. Text only on `deep` (7.6:1); on light grounds a fill with `on-accent` text. |
| The product | `gold` · `gold-light` · `gold-deep` · `bronze` · `on-gold` | The drop, the grade chip (`on-gold` text on `gold`, 7.0:1), the product hairline. Gold-family text on light grounds is `bronze` (5.4:1 on `cream`); `gold` itself is text only on dark. |
| Edges | `line` · `line-strong` · `line-on-deep` | `line` is decorative; any edge that identifies a control (inputs, outline buttons, chips) is `line-strong` (3.5:1 on `paper`) or `line-on-deep` on dark. |
| Problems | `danger` · `danger-tint` · `danger-on-deep` · `warning-tint` · `warning-ink` | Always with an icon and words, never colour alone. |

The site's existing tokens keep their exact values: `brand` #246851, `deep-raised` (was `brand-dark`) #1a4a3a, `deep` (was `brand-deep`) #0f2e24, `brand-tint` (was `brand-light`) #e6f0ed, `accent` (was `brand-accent`) #34d399 and `brand-muted` #7e948b. `brand-muted` is 3.0:1 on `cream`, so it is decorative only.

Keyboard focus is `focus-ring` on light grounds (a 2px `cream` gap, then 2px solid `brand`) and `focus-ring-deep` on dark ones (`accent`, 7.6:1 on `deep`). Every interactive element shows it on `:focus-visible`.

## Type

| Role | Style tokens (laptop / phone) | Family |
| --- | --- | --- |
| Film words, the home close | `film` 128/128 · `film-compact` 64/68 | `display` (Montserrat 300) |
| Lighting statement | `statement` 40/52 · `statement-compact` 26/36 | `display` (500) |
| Home headline | `display-xl` 56/60 · `display-xl-compact` 36/40 | `display` (Montserrat 700) |
| Page title, product name | `display-l` 44/50 · `display-l-compact` 32/38 | `display` |
| Section heading | `display-m` 30/36 · `display-m-compact` 24/30 | `display` |
| Card title, form heading | `title` 21/27 | `display` (600) |
| Lead paragraph | `lead` 19/30 (17/27 on phone) | `sans` |
| Body | `body` 17/27 | `sans` |
| Secondary, list rows | `small` 15/23 | `sans` |
| Eyebrow, spec label | `label` 13/18, +0.08em, capitals by CSS | `sans` |
| Button | `button` 15/20 (16/20 at touch size) | `sans` |
| Footnote, disclaimer | `caption` 13/19 | `sans` |
| Grade code | `grade` 13/18 | `mono` |
| Spec value | `spec` 15/22 · `spec-large` 20/26 | `mono` |

- **Montserrat** (`fonts/montserrat-latin-wght-normal.woff2`, SIL Open Font License) is the wide geometric sans of the logo's wordmark, so headlines speak in the logo's voice. Use it for display styles only.
- **Share images** use static cuts of the same font (`fonts/montserrat-latin-500.ttf`, `-700.ttf`), made by `tools/brand/static-fonts.py` because the image renderer cannot read a variable WOFF2. Re-run it whenever the WOFF2 changes.
- **Body, labels and controls use the device's own face** (`sans`): SF Pro on Apple devices, Segoe UI on Windows, Roboto on Android. Nothing to download, and the most legible face at small sizes on each device.
- **`mono` is the datasheet voice**: grade codes and measured values, so digits line up in columns.
- Never below 12px (13px in practice), never weight 300. Running text stops at `measure` (680px).

## Layout

- **Two layouts, one tree.** Phone below `breakpoint` (1024px), laptop from it. Content sits in `container` (1280px) with a `space-gutter` (22px) gutter on phone and `space-8` (32px) on laptop. Sections breathe `space-14` (56px) on phone and `space-24` (96px) on laptop.
- **Cards** stack in a single column on phone, or run as a swipe rail where a row of related items should read as one line (related products). On laptop they become a three-column grid, `space-6` apart.
- **Reach.** Every control is at least `target` (44px). Primary buttons on phone are `target-touch` (56px) and full width. A fixed action bar (call, WhatsApp, get a quote) sits at the bottom of every phone page; on laptop the same jobs live in the navigation and a floating WhatsApp pill.
- **Navigation.** The global navigation scrolls away with the page. Product pages add a sticky local navigation in `glass`: the product's name and grade, its sections on laptop, and *Get a quote*.
- **Order by importance.** On a product page: name and grade, what it is, the three key values, the full table, where it is used, documents, the enquiry form, related products.

## Shape, depth and material

- Radii: `radius-full` for anything you press (buttons, chips, pills), `radius-sm` for inputs, `radius-md` for cards and tables, `radius-lg` for stages, dark bands and sheets, `radius-xs` for grade chips.
- Depth: `shadow-card` at rest, `shadow-raised` under a pointer (with a 2px lift), `shadow-float` for floating chrome. Shadows are tinted with `deep`, never black.
- Glass: `glass` fill with `glass-blur` (24px) and `glass-saturate` (1.4), only on floating chrome, and opaque `cream` under reduced transparency or increased contrast.
- No gradients anywhere except inside the drop (its liquid, and the glint that sweeps it in the home film).

## Motion

The home page is a film; every other page is a page with a light touch of the same language. (Owner direction, October 2026, after vaiiya.org: cinematic, so a visitor who scrolls wants to explore the whole site.)

- **Scroll is the clock.** On the home page, each scene's stage pins while scrolling plays it, then lets go: the opening, where the families resolve one at a time as the hero drop fills; a statement that lights as it is read; the range of drops crossing the screen as they fill; a gold line joining the four steps of supply; "Explore", letter by letter. Elsewhere, a page title resolves as the page opens, sections rise as they enter, and cards open with a gold wipe.
- **One signature: the drop fills.** On the home page and product pages the drop fills with real-time liquid (WebGL), inside the drop's own chrome and highlight. The SVG drop is the first paint and the fallback.
- **The reader stays in control.** Native scrolling is never smoothed, snapped or hijacked. No loading screens, no custom cursors, nothing that flashes or advances on its own. The only motion not driven by scroll is a title resolving (`duration-title`) and the hero drop's slow float (`duration-float`).
- **What moves:** transform, opacity, blur and colour, never layout.
- **Type in motion:** scene words in `film` (Montserrat 300, `gold-deep`, 4:1 on cream), resolving from a 16px blur. A statement in `statement` moves from `line-strong` to `ink`, so even unlit words keep 3:1.
- **Easing:** `ease-out` for entrances, `ease-in-out` for the float. Scrubbed motion is linear, because the reader's scroll sets the pace.
- **Still is complete.** With reduced motion, or in a browser without scroll-driven animations, nothing pins and nothing hides: the drops are full, every word is lit, and the page reads top to bottom.
- Cards lift 2px under a pointer. Touch gets no hover state.

## Logo

Assets in the **Logos** group, cut from the owner's 1024px artwork: the white ground removed, the letter counters (A, P, R, O) cleared, the drop's highlights kept.

| File | Use |
| --- | --- |
| `vasant-logo.png` | The full lockup. Footer, the printable datasheet and ads, at 200px wide or more. |
| `vasant-logo-reversed.png` | The full lockup on `deep` or photographs: green becomes `cream`, the drop stays. |
| `vasant-lockup-compact.png` | Navigation, every share (link-preview) image, and anywhere under 72px tall. The same artwork, with the wordmark at 0.6× the mark's height (0.29× in the full lockup) so the letters stay legible at 40px. |
| `vasant-lockup-compact-reversed.png` | The compact lockup on `deep`. |
| `vasant-mark.png` | The V, arrow and drop alone: print and the social avatar. |
| `vasant-icon-512.png` | The mark centred on a transparent 512px square. The site makes the favicon, app icons and touch icon from this file alone. |
| `vasant-wordmark.png` | The wordmark alone, where the mark already appears nearby. |
| `*.svg` | A vector master beside each PNG, for print, signage and large sizes; `vasant-favicon.svg` is the site's favicon. |

- Clear space on every side equals the width of the drop in the lockup.
- A replacement keeps the file's name and aspect ratio; when a lockup changes, its `-reversed` file is replaced with it.
- Minimum sizes: full lockup 200px wide, compact lockup 32px tall, mark 24px tall.
- Show the logo once per view. Never retype the wordmark, recolour it (other than the reversed files), add effects, or place the green version on `deep`.

## The product drop

`Droplet` draws the logo's own drop, traced from the artwork: a cone meeting a circle, the chrome cap, the liquid surface at 61% of the height, a meniscus and the highlight. Each product gets the colour of its own liquid. The tints are illustrative, not colour specifications.

| Product | Tint | Tokens |
| --- | --- | --- |
| Base Oil SN150 | straw | `drop-straw`, `-light`, `-deep` |
| Base Oil SN500 | gold (the logo's own) | `drop-gold` (aliases of `gold`, `gold-light`, `gold-deep`) |
| Rubber Process Oil | amber | `drop-amber`… |
| Light Diesel Oil | brown | `drop-brown`… |
| Industrial Fuel Oil | fuel | `drop-fuel`… |
| Paving Bitumen VG-30 | bitumen | `drop-bitumen`… |
| Mineral Turpentine Oil | clear, with the chrome rim | `drop-clear`… |
| Petroleum Jelly | white, with the chrome rim | `drop-white`… |

- **Sizes**: 150px in a product hero on phone and 190px on laptop, 30px on a card, 48 to 64px in a range lineup, about 260px in an ad.
- **Data**: a product with no tint yet uses gold. Add its tint to `SLUG_TINT` in the bundle and three `drop-*` tokens.
- **Don'ts**: never fill drops to different levels (it would read as a quantity), never use a drop as a bullet or a status mark, never put text on one. Static SVGs of all eight are in the **Drops** group (`Vasant.dropMarkup(tint, {plain: true})` makes more).

## Iconography

Lucide line icons (the site's `lucide-react`), 2px stroke, 20px beside 15 to 17px text and 18px in small buttons. The WhatsApp glyph is the site's own, filled. Every icon-only control has an `aria-label`. No emoji, no decorative icon rows.

## Imagery

No stock photography. Real facility photographs (tanks, drums, the lab, a tanker at the gate; task VP-HUM-006) go in content cards at `radius-lg`, ungraded. Until they exist, the drop and the type carry the page; an illustration never pretends to be the facility.

### Photography brief (VP-HUM-006)

Buyers who cannot visit want proof that the place and the stock are real. One morning at Mangaliya covers it.

**Shot list**, each landscape (3:2) and, where it works, portrait (4:5):
1. The gate and signboard, with a tanker in the bay.
2. The tank farm from ground level: the tanks with their numbers, pipework and bund.
3. A row of filled 210 L drums with their labels facing out.
4. A tanker loading at the gantry, with the hose and earthing visible.
5. Sampling: a gloved hand drawing a sample into a clear bottle.
6. The laboratory bench: a viscometer or flash-point tester in use, and its readout.
7. The blending area or a mixing vessel.
8. Close-ups of each liquid in a clear sample bottle against white, one per product, in daylight. These pair with each product's drop.
9. The office or sales desk, if it can be shown.

**How to shoot:**
- Daylight. Phone cameras are fine (the main lens, not zoom), held level.
- Everyone in safety gear: helmet, gloves, safety shoes. Nothing unsafe in frame: no open flame, no smoking, no spills.
- No other company's brand or logo legible, no vehicle number plates, no papers with names or figures.
- People only with their written consent (`content/people.json` records it).
- Keep the originals at full size, unedited. The site crops and compresses them itself.

**Hand-off:** share the originals in a Drive folder with the owner. An agent adds the chosen ones in a pull request, with alt text describing what each shows.

## Accessibility floor

WCAG 2.2 AA everywhere:

- text at 4.5:1 (every pairing above is measured);
- edges and focus rings at 3:1;
- controls at least 44px;
- a label on every field;
- errors with an icon and words;
- visible keyboard focus;
- reduced motion, reduced transparency and increased contrast all honoured.

The logo's alt text is "Vasant Petrochem". Drops are decorative except in a product hero, where they carry the product's name.

## Building with this system

The bundle assigns `window.Vasant` and expects React 18. Components size themselves to their container, not the viewport, so the same component renders its phone layout in a 390px column and its laptop layout in a 1280px one; the site maps the same rules to its `lg` breakpoint. `Vasant.catalog` holds the eight live products, `Vasant.claims` the allowed claims, and `Vasant.tints` with `Vasant.dropMarkup()` the drop. The Product pages and Advertising sections set out how pages and ads are put together from these parts.

This folder of the `vasant-petrochem-web` repo is the canonical source. The published design system (https://claude.ai/artifact/5jtuYB6F18E9c1CWnWCtFK) is republished from it, and the site compiles `tokens.json` into its CSS at build time, so a token is changed here and nowhere else. Logo masters live in `assets/Logos/` (the owner's original artwork in `assets/Logos/source/`) and the product drops in `assets/Drops/`.
