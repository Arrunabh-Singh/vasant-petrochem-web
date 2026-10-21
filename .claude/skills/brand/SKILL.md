---
name: brand
description: Change Vasant Petrochem's brand assets or design tokens (logos, colours, type, spacing, motion) in design-system/ and carry the change through the site. Use when asked to swap or update a logo, change a colour or font size, or adjust the brand book.
---

# Brand changes

`design-system/` is the single source. The site derives everything from it on every build (`site/scripts/prepare.mjs`): `tokens.json` becomes `site/src/styles/tokens.css`, and logos, drops and fonts are copied into `site/public/`. Never edit the derived copies.

## Replacing a logo

1. Read the "Logo" section of `design-system/README.md` for which file is used where, and its minimum size and clear space.
2. Replace the file in `design-system/assets/Logos/` **under the same name**, as a PNG with a transparent background, at least as large as the one it replaces. If a source file was supplied, keep it in `design-system/assets/Logos/source/`.
3. Never recolour, stretch or add effects. The only colour variants are the `-reversed` files, for dark grounds.
4. Rebuild and look: `npm --prefix site run build`, then `npm --prefix site run preview` and `npm --prefix site run shots`. Check the navigation, the footer, the datasheet and a product page, at both widths.

## Changing a token

1. Edit `design-system/tokens.json`. Colours can reference other colours as `{name}`. Type sizes are in px there and compile to rem.
2. Check contrast for any colour used for text: 4.5:1 for body text, 3:1 for text at 24px or larger, or 19px bold.
3. Update the brand book (`design-system/README.md`) where the token is described.
4. `npm --prefix site run check` (the token compiler is unit-tested), then screenshots.

## Motion

The rules are in the brand book's "Motion" chapter. Scroll drives motion; there are no loaders, no custom cursors and no scroll hijacking; and the still page must be complete. The home film lives in `site/src/styles/film.css`, and the site-wide vocabulary in `site/src/styles/motion.css`.

Open a pull request with before and after screenshots. The owner approves brand changes.
