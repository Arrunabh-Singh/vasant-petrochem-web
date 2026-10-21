---
name: ads
description: Make Vasant Petrochem's ad creatives, social images, letterhead, business cards and email signatures, with tagged links for each platform. Use when asked for ads, a campaign, social media images, a LinkedIn banner, a WhatsApp image, a letterhead, visiting cards or an email signature.
---

# Ads and the brand kit

One command makes every file, from the catalogue and the brand:

```sh
npm --prefix site run kit -- --campaign <slug> [--claim <id>]
```

It writes `marketing/<slug>/` at the repository root. The folder is git-ignored, so send the files to the owner rather than committing them.

| Folder | What |
| --- | --- |
| `ads/` | Every published product and the range, in five formats (square, portrait, story, landscape, display-square), each on `deep` and on `cream`. |
| `links.csv` | One row per ad and platform: the file, the platform, the format, and the link with its UTM tags. |
| `social/` | LinkedIn banner (1584 × 396), square avatar (400 × 400) and WhatsApp profile image (640 × 640). |
| `print/` | `letterhead.pdf` (A4); `letterhead-header.png` (its top band at 300 dpi, for a Word or Google Docs header); `business-cards.pdf` (85 × 55 mm with 3 mm bleed, front then back). |
| `signature/` | An HTML email signature per person in `content/people.json`, or one for the company. |

## Steps

1. **Campaign slug.** Lowercase, with the month: `diwali-202611`, `range-202612`. It becomes `utm_campaign`.
2. **Claim.** Ads carry exactly one, from the allowed five in `design-system/advertising.md`, by id:
   - `pricing-24h` (the default);
   - `test-reports-on-request`;
   - `drums-or-bulk`;
   - `one-contact`;
   - `from-mangaliya`.
   The build refuses any other.
3. **Run the command.** It builds a preview of the site (the `/kit` pages exist only there), then saves each page at its exact size.
4. **Check before sending.** Apply the "Before an ad goes live" list in `design-system/advertising.md`:
   - names, grades and the claim match the catalogue word for word;
   - story text is clear of the top 250px and bottom 340px;
   - each link opens the right page.
5. **Send the folder to the owner** (zip it).
   - Say which ground (`deep` or `cream`) suits each platform's feed.
   - Ads go live from the owner's own ad accounts. Agents never buy media.

## Rules

- **Copy.** Ads say nothing beyond the catalogue and the claim. For a new line of copy, add it to `content/claims.json` and `design-system/advertising.md` first, in a pull request the owner approves.
- **Layout.** To change it, edit `site/src/pages/kit/[...item].astro`. It mirrors `.vp-ad` in `design-system/components/bundle.css`.
- **Formats and platforms** are in `site/src/lib/kit.ts`.
- **Company facts** (phone, email, address, legal line) come from `content/company.json`, and names from `content/people.json`. Change them there, then run again.
- **Signatures** load the logo from `www.vasantpetrochem.com/brand/`, which serves it once the new site is live (`docs/runbooks/cloudflare-cutover.md`).
- **Tracking.** Paid ads with a pixel need the cookie notice and a privacy decision first (VP-LEG-005). Until then, the UTM tags on enquiries and the click events measure everything.
