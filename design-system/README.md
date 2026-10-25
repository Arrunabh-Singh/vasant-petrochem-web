Vasant Petrochem manufactures and trades base oils, bitumen, industrial fuels, process oils and solvents from Mangaliya, Indore, for plants, road projects and blenders across Central India. This system has one job: make every product easy to understand and easy to buy, on a phone in a plant yard and on a laptop in a purchase office. Its one signature is **the product drop**, the chrome-and-gold drop from the logo, refilled with each product's own liquid. Everything around it stays quiet.

## Principles

- **A datasheet that sells.** Lead with what the product is and its numbers, then where it is used, then how to buy it. Specs are content, not decoration.
- **One signature, spent in one place.** The drop is the brand's moment. Cards, buttons and type stay calm around it.
- **Each colour means one thing.** `gold` means *act*: every button and link is gold. The drop's own colours mean *the product*. `live` green means *live, active or done*. Never swap them.
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

**Sunlit gold** (24 October 2026). The owner asked for light mode, a premium oil feel ("smelling like money") and vastu. The page is warm white, the type warm black, and one metallic gold marks everything that acts. There are no black or dark-grey fields anywhere; the heaviest block on a page is the gold band near its foot (see Vastu).

Grounds are `ground` (every page), `ground-raised` (ivory: alternate bands, the footer, the product stage, the documents card) and `surface` (cards, tables, fields, secondary buttons). The gold band (`gold` with its `gold-sheen`) closes a page, at most once.

| Role | Tokens | Rule |
| --- | --- | --- |
| Text | `text` · `text-2` · `text-3` | Headings `text` (warm black, never pure black), copy `text-2`, labels and captions `text-3`. All pass on every ground (lowest: `text-3` on `surface-hover`, 5.1:1). |
| Act | `gold` · `gold-pressed` · `gold-deep` · `on-gold` | The one action colour, as a fill: primary buttons, selected chips, the closing band. A gold fill has a 1px `gold-deep` edge and `on-gold` text (7.8:1). One primary button per view. |
| Gold text | `gold-ink` | Links, eyebrows, grade codes and the focus ring: the gold that reads (6.2:1 on `ground`, 5.3:1 at worst). `gold` itself is never text on the page. |
| On the gold band | `on-gold` · `on-gold-2` | Headings and buttons in `on-gold`, copy in `on-gold-2` (5.5:1). Its buttons are `.vp-btn-dark` and `.vp-btn-outline-dark`. |
| Quiet gold | `gold-tint` | Grade chips, tags, selected rows, text selection. |
| Live, active, done | `live` | The brand's own green: status dots and success ticks (6.5:1). |
| Edges | `line` · `line-strong` | `line` is decorative; any edge that identifies a control (inputs, secondary buttons, chips) is `line-strong` (3.8:1 on `ground`, 3.2:1 at worst). |
| Problems | `danger` · `danger-tint` · `warning-tint` · `warning-ink` | Always with an icon and words, never colour alone. |

Keyboard focus is `focus-ring` everywhere: a 2px `ground` gap, then 2px of `gold-ink`. Every interactive element shows it on `:focus-visible`. The same palette prints, so there is no separate print set.

## Type

| Role | Style tokens (laptop / phone) | Family |
| --- | --- | --- |
| Film words, the home close | `film` 120/112 · `film-compact` 56/54 | `display` (Schibsted Grotesk 900) |
| Lighting statement | `statement` 44/52 · `statement-compact` 28/36 | `display` (700) |
| Home headline | `display-xl` 84/80 · `display-xl-compact` 44/44 | `display` (900) |
| Page title, product name | `display-l` 60/60 · `display-l-compact` 36/38 | `display` (900) |
| Section heading | `display-m` 36/40 · `display-m-compact` 26/30 | `display` (800) |
| Card title, form heading | `title` 22/28 | `display` (700) |
| Lead paragraph | `lead` 20/32 | `sans` |
| Body | `body` 17/28 | `sans` |
| Secondary, list rows | `small` 15/23 | `sans` |
| Button | `button` 15/20 | `sans` (700) |
| Footnote, disclaimer | `caption` 13/19 | `sans` |
| Eyebrow, spec label | `label` 12/16, +0.14em, capitals by CSS | `mono` (500) |
| Grade code | `grade` 13/18 | `mono` (600) |
| Spec value | `spec` 15/22 · `spec-large` 20/26 | `mono` (500) |

- **Schibsted Grotesk** (`fonts/schibsted-grotesk-latin-wght-normal.woff2`, one variable file, 400 to 900, SIL Open Font License) sets everything that reads: heavy (800 to 900) and tight for display, 400 for text. The weight carries the brand: confident, heavy type, never thin.
- **IBM Plex Mono** (`fonts/ibm-plex-mono-latin-500-normal.woff2`, `-600-normal.woff2`, SIL Open Font License) is the datasheet's voice: grade codes, measured values and the capitals of labels, read like an engraved serial number, with digits that line up in columns.
- **Share images** use static cuts of Schibsted Grotesk (`fonts/schibsted-grotesk-latin-500-normal.woff`, `-900-normal.woff`), because the image renderer cannot read WOFF2.
- Never below 12px, never weight 300. Running text stops at `measure` (680px).

## Layout

- **Two layouts, one tree.** Phone below `breakpoint` (1024px), laptop from it. Content sits in `container` (1280px) with a `space-gutter` (22px) gutter on phone and `space-8` (32px) on laptop. Sections breathe `space-14` (56px) on phone and `space-24` (96px) on laptop.
- **Cards** stack in a single column on phone, or run as a swipe rail where a row of related items should read as one line (related products). On laptop they become a three-column grid, `space-6` apart.
- **Reach.** Every control is at least `target` (44px). Primary buttons on phone are `target-touch` (56px) and full width. A fixed action bar (call, WhatsApp, get a quote) sits at the bottom of every phone page; on laptop the same jobs live in the navigation and a floating WhatsApp pill.
- **Navigation.** The global navigation scrolls away with the page. Product pages add a sticky local navigation in `glass`: the product's name and grade, its sections on laptop, and *Get a quote*.
- **Order by importance.** On a product page: name and grade, what it is, the three key values, the full table, where it is used, documents, the enquiry form, related products.

## Shape, depth and material

- Radii are engineered, not soft: `radius-xs` (2px) for grade chips and swatches, `radius-sm` (4px) for buttons, inputs and chips, `radius-md` (6px) for cards and tables, `radius-lg` (10px) for stages, bands and sheets, and `radius-full` only for round things (the WhatsApp button, the basket count).
- Depth: `shadow-card` at rest, `shadow-raised` under a pointer (with a 2px lift), `shadow-float` for floating chrome. Shadows are warm, tinted with `text`, never grey or black.
- Glass: `glass` fill with `glass-blur` (24px) and `glass-saturate` (1.4), only on floating chrome, and opaque `ground` under reduced transparency or increased contrast.
- Gradients are light only: inside the drop, the light behind a drop, the morning light at the top of the home page, and the sheen of a gold band.

## Vastu

The owner asked for vastu to be taken into account (24 October 2026). Vastu has no rules for web pages, so the site applies its widely agreed principles by analogy, reading each screen like a floor plan with north at the top, as on a map. A vastu consultant's specific guidance, if the owner brings one, overrides these choices.

| Vastu principle (for buildings) | On the site |
| --- | --- |
| Light, bright colours; yellow and gold for prosperity, green for growth | Warm white and ivory grounds, gold for every action, the brand's green only for "live". No black or dark-grey fields. |
| The north-east is the most auspicious corner; keep it open and light | Light always comes from a screen's upper right (the home page's morning light, the stage's sun); nothing heavy sits there. |
| The main entrance is best in the north-east | "Get a quote" sits at the right end of the header on laptops. |
| Heavier mass to the south and west | Headlines sit left; the heaviest blocks, the gold band and the footer, sit at the foot of the page. |
| Rising, upward forms | The drop points up, the bubbles rise and the light grows as the visitor scrolls. |
| Moving from darkness to light | The colour scale runs from the darkest grade to the lightest, so the home film ends in light. |

## Motion

The home page is a film; every other page is a page with a light touch of the same language. (Owner direction, October 2026, after vaiiya.org: cinematic, so a visitor who scrolls wants to explore the whole site. Rebuilt on 24 October around one idea: the colour scale.)

**The idea.** The oil trade grades its products by colour, from water-white to black (ASTM D1500), and a laboratory checks a sample by holding it to the light. The film does the same: the drop is held to a light box, and as the visitor scrolls it passes along the colour scale, darkest grade to lightest, so the page moves toward light and ends in it (see Vastu).

**The scenes**, phone and laptop alike:
1. **Hero.** Headline, lead and buttons in the morning light, which comes from the upper right; the drop beside them on laptops (above the headline on phones, with one button, since Get a quote is in the bar below) fills gold as the page starts to move.
2. **The light box.** The copy steps back; the drop grows into the light (it stays on the right on laptops and moves to the upper middle on phones) and a white light rises behind it, centred on the drop. On phones the stage is three bands that never overlap, whatever the screen's height: the colour scale at the top, the drop in its light, and a block reserved for the grade's words just above the action bar. The hero's type and the drop size follow the screen's height, so a 1366×768 laptop and a 568px-tall phone both show the whole first screen.
3. **The colour scale.** "Every oil has its colour." resolves and lifts away. Then one grade per slot, darkest first (`byColour` in `site/src/lib/drop.ts`): the liquid turns to the grade's colour, sloshing as it changes, the light around it takes that colour, and the grade's name, code, key value and link resolve beside it (on the left on laptops, below it on phones). A scale of swatches (low on the left on laptops, across the top on phones) marks the place. The last grade, water-white, all but disappears into the light.
4. **Statement.** The company in its registered claims, lit word by word on ivory, with gold bubbles rising behind at three depths, as in a bubble-tube viscosity test.
5. **The road.** A road tanker leaves the Mangaliya pin (a gold dot that sends out three ripples as the tanker pulls away, and is quiet otherwise) along a gold road, and each step of an order arrives as it passes: all four under the road on laptops, one at a time as a caption on phones.
6. **Explore**, letter by letter, then the doors into the site; **Close** on the gold band, the page's heaviest block, at its foot.

- **Scroll is the clock.** Each scene's stage pins while scrolling plays it, then lets go. The film's timing lives in one place, custom properties on `.vp-film` (`--fill-end`, `--scale-from`, `--scale-span`) that `styles/film.css` and `islands/liquid.ts` both read. Elsewhere, a page title resolves as the page opens, sections rise as they enter, cards open with a gold wipe, and pages cut to each other with a short fade and rise (cross-document view transitions; the drop morphs from a card into its product hero).
- **One signature: the drop held to the light.** On the home page and product pages the drop fills with real-time liquid (WebGL), inside the drop's own chrome and highlight; in the film the liquid also takes each grade's colour. The SVG drop is the first paint and the fallback, and without WebGL each grade's own SVG drop settles over the last.
- **The reader stays in control.** Native scrolling is never smoothed, snapped or hijacked. No loading screens, no custom cursors, nothing that flashes or advances on its own. The only motion not driven by scroll is a title resolving (`duration-title`) and the hero drop's slow float (`duration-float`). Only the grade on screen takes a click; one that has keyboard focus shows, alone.
- **What moves:** transform, opacity, blur and colour, never layout.
- **Type in motion:** grade names and scene words in Schibsted Grotesk 900, resolving from a blur. A statement moves from `line-strong` (3.4:1 on ivory, large text) to `text`.
- **Light, measured.** The light behind a drop is white at its core and its grade's `-light` tint at 38% at its rim, and text never sits on its core: measured from the rendered film, every text keeps 4.9:1 or better (grade names 9.3:1).
- **Easing:** `ease-out` for entrances, `ease-in-out` for the float. Scrubbed motion is linear, because the reader's scroll sets the pace.
- **The same film everywhere.** Browsers with scroll-driven animations (Chrome, Edge, Samsung Internet, Safari 26 and later) play it natively. Firefox and older iPhones play the same animations through `site/src/islands/scrub.ts`, which reads each animation's timeline and range from the `--tl` and `--ar` written beside it in the CSS. Write each range literally as well: Safari drops an `animation-range` that is a single `var()` (a unit test keeps the two copies equal).
- **Still is complete.** With reduced motion, without JavaScript, or in a browser without container queries (iOS 15 and earlier), nothing pins and nothing hides: the hero, then every grade as a lit card on ivory, the statement, the road with all four steps, and the close.
- Cards lift 2px under a pointer. Touch gets no hover state.

## Logo

Assets in the **Logos** group, cut from the owner's 1024px artwork: the white ground removed, the letter counters (A, P, R, O) cleared, the drop's highlights kept.

| File | Use |
| --- | --- |
| `vasant-logo.png` | The full lockup. Footer, the printable datasheet and ads, at 200px wide or more. |
| `vasant-logo-reversed.png` | The full lockup on photographs or any dark ground: green becomes cream, the drop stays. (The site itself has no dark grounds.) |
| `vasant-lockup-compact.png` | Navigation, every share (link-preview) image, and anywhere under 72px tall. The same artwork, with the wordmark at 0.6× the mark's height (0.29× in the full lockup) so the letters stay legible at 40px. |
| `vasant-lockup-compact-reversed.png` | The compact lockup on photographs or any dark ground. |
| `vasant-mark.png` | The V, arrow and drop alone: print and the social avatar. |
| `vasant-icon-512.png` | The mark centred on a transparent 512px square. The site makes the favicon, app icons and touch icon from this file alone. |
| `vasant-wordmark.png` | The wordmark alone, where the mark already appears nearby. |
| `*.svg` | A vector master beside each PNG, for print, signage and large sizes; `vasant-favicon.svg` is the site's favicon. |

- Clear space on every side equals the width of the drop in the lockup.
- A replacement keeps the file's name and aspect ratio; when a lockup changes, its `-reversed` file is replaced with it.
- Minimum sizes: full lockup 200px wide, compact lockup 32px tall, mark 24px tall.
- Show the logo once per view. Never retype the wordmark, recolour it (other than the reversed files), add effects, or place the green version on a dark ground.

## The product drop

`Droplet` draws the logo's own drop, traced from the artwork: a cone meeting a circle, the chrome cap, the liquid surface at 61% of the height, a meniscus and the highlight. Each product gets the colour of its own liquid. The tints are illustrative, not colour specifications.

| Product | Tint | Tokens |
| --- | --- | --- |
| Base Oil SN150 | straw | `drop-straw`, `-light`, `-deep` |
| Base Oil SN500 | gold (the logo's own) | `drop-gold`, `-light`, `-deep` (the logo's gold, apart from the action `gold`) |
| Rubber Process Oil | amber | `drop-amber`… |
| Light Diesel Oil | brown | `drop-brown`… |
| Industrial Fuel Oil | fuel | `drop-fuel`… |
| Paving Bitumen VG-30 | bitumen | `drop-bitumen`… |
| Mineral Turpentine Oil | clear, with the chrome rim | `drop-clear`… |
| Petroleum Jelly | white, with the chrome rim | `drop-white`… |

- **Held to the light**: wherever a drop is the subject (the film, a product hero, an industry hero) it stands in an ivory light box, lit by the sun from the upper right with a soft aura of its own `-light` tint around it, and the colour scale beneath marks the grade, captioned "Colours are illustrated, not a specification."
- **The colour scale**: every grade's swatch, darkest to lightest (`byColour`), between "Darker" and "Lighter", so it ends in light. It is decoration beside text that names the grades, never the only way to tell them apart.
- **Sizes**: 150px in a product hero on phone and 190px on laptop, 30px on a card, 48 to 64px in a range lineup, about 260px in an ad; in the film, up to 290px.
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
