# Advertising

Ads are built from `AdCreative` in two families. **Product** shows one product's drop, name and grade with one claim. **Range** shows all eight drops and the line *Industrial oils, fuels & lubricants.* Both sit on `deep` by default; `cream` is the alternative where the platform's feed is already dark.

## Formats

| Format | Size (px) | Where |
| --- | --- | --- |
| `square` | 1080 × 1080 | Facebook and Instagram feed, WhatsApp status image, LinkedIn single image |
| `portrait` | 1080 × 1350 | Facebook and Instagram feed (takes more of the screen) |
| `story` | 1080 × 1920 | Stories, Reels covers, WhatsApp Status. Keep the top 250px and bottom 340px clear of text and the button. |
| `landscape` | 1200 × 628 | Link ads, LinkedIn, Google responsive display (landscape image), and every product's OG image |
| `display-square` | 1200 × 1200 | Google responsive display (square image) |

Google responsive display also asks for a square logo (use `vasant-icon-512.png` on `cream`, or the mark at 1200 × 1200) and a landscape logo (`vasant-logo.png` at 1200 × 300 with clear space).

## Composition

- The compact lockup sits top left (reversed on `deep`), with the clear space of the drop around it.
- Eyebrow: the grade code and industries, in capitals (`gold` on `deep`, `bronze` on `cream`). The rendered ads set it in Montserrat, like everything else on them, so they look the same from any machine.
- Title in `display` 700: the product's name exactly as the catalog has it, or the range line.
- One claim in `sans` at about 40px, from the allowed list only.
- One call to action, the only pill on the canvas: *Get a quote* for Product, *See the range* for Range.
- The drop at about 260px, never cropped, never on its side.
- The domain `vasantpetrochem.com` bottom right (not in `landscape`, where space is short).
- Nothing else: no stickers, no starbursts, no prices, no phone numbers in the art. The platform's own text fields carry offers and contact details.

## Copy rules

- Title: the product name, or *Industrial oils, fuels & lubricants.*
- Claim, exactly one of:
  - Pricing within 24 hours.
  - Test reports available on request.
  - Drums or bulk tanker.
  - One point of contact, quote to dispatch.
  - From Mangaliya, Indore, across Central India.
- Primary text in the ad platform follows the same voice: plain, specific, no superlatives, no emoji, no certifications or capacities.

## Landing pages and tracking

- Product ads land on `/products/<slug>`; Range ads land on `/marketplace`.
- Tag every link: `?utm_source=<meta|google|linkedin|whatsapp>&utm_medium=<paid_social|display|social>&utm_campaign=<campaign>-<yyyymm>&utm_content=<format>`. `social` is WhatsApp Status and broadcasts, which are unpaid. `npm --prefix site run kit` writes every link to `links.csv`.
- Before spending: enquiries must store the `utm_*` values (VP-LEAD-006), and call and WhatsApp taps must be counted per page (VP-LEAD-007). A pixel or conversion tag also needs the cookie notice (VP-LEG-005), the privacy policy and a CSP change; it is a separate decision.

## Making the files

`npm --prefix site run kit -- --campaign <slug> [--claim <id>]` renders every product and the range in all five formats, on `deep` and on `cream`, plus `links.csv`, into `marketing/<slug>/`. The steps are in the `ads` skill. The ads are the site's own `/kit` pages (preview builds only), which follow `AdCreative`'s layout and are saved at native size with Playwright. The site's share images (`/og/`) are a separate, cream card, drawn at build time.

## Before an ad goes live

1. The name, grade and claim match the catalog and the allowed list word for word.
2. Text is clear of the story safe zones.
3. The link opens the right product page and carries the UTM tags.
4. Squint test: the drop reads first, then the name, then the button.
