---
name: brand
description: Change Vasant Petrochem's brand assets or design tokens (logos, colours, type, spacing, motion) in design-system/ and carry the change through the site. Use when asked to swap or update a logo, change a colour or font size, or adjust the brand book.
---

# Brand changes

`design-system/` is the single source. The site derives everything from it on every build (`site/scripts/prepare.mjs`): `tokens.json` becomes `site/src/styles/tokens.css`, and logos, drops and fonts are copied into `site/public/`. Never edit the derived copies.

## Replacing a logo

1. Read the "Logo" section of `design-system/README.md` for which file is used where, and its minimum size and clear space.
2. Replace the file in `design-system/assets/Logos/` **under the same name**, as a PNG with a transparent background, at least as large as the one it replaces and **with the same aspect ratio**: the site sets the compact lockup at 634 × 182 (`site/src/components/GlobalNav.astro`) and draws share images at that shape (`site/src/pages/og/[...slug].png.ts`). A logo of a different shape needs those sizes changed in the same pull request.
3. If the owner supplied original artwork (a vector AI, EPS, SVG or PDF file, or a larger master image), keep it in `design-system/assets/Logos/source/`. A PNG-only delivery needs nothing there.
   - Each PNG has an SVG master beside it, which `tools/brand/vectorize.py` drew from the current artwork.
   - Vector artwork from the owner replaces those SVGs.
   - A new PNG without vectors makes its SVG stale, so delete that SVG in the same pull request. The script's corner points belong to today's artwork only.
4. Never recolour, stretch or add effects. The only colour variants are the `-reversed` files, for dark grounds: when a lockup changes, ask the owner for its matching `-reversed` file, never make one by recolouring. (The site uses no reversed file today.)
5. Check and look:
   - `npm --prefix site run check`;
   - restart `npm --prefix site run preview`, then `npm --prefix site run shots`;
   - the navigation and the share images use the compact lockup: open `site/dist/client/og/default.png` and one product's image;
   - the footer and the datasheet use the full lockup (`vasant-logo.png`);
   - the favicon, app icons and touch icon come only from `vasant-icon-512.png`.

Browsers may keep the old logo for up to a day after the merge (`/brand/*` is cached for a day).

## Changing a token

1. Edit `design-system/tokens.json`. Colours can reference other colours as `{name}`. Type sizes are in px there and compile to rem.
2. Check contrast for any colour used for text: 4.5:1 for body text, 3:1 for text at 24px or larger, or 19px bold.
3. Update the brand book (`design-system/README.md`) where the token is described.
4. `npm --prefix site run check` (the token compiler is unit-tested), then screenshots.

## Motion

The rules are in the brand book's "Motion" chapter. Scroll drives motion; the only loader is the home page's opening, once a tab; there are no custom cursors; scrolling is never scripted, and only the film snaps, one frame per flick; and the still page must be complete. The home film lives in `site/src/styles/film.css`, and the site-wide vocabulary in `site/src/styles/motion.css`. Before changing either, read the `motion` skill: its rules keep the film smooth on iPhones, and it says how to check a change on Apple's browsers.

Open a pull request with before and after screenshots. The owner approves brand changes.
