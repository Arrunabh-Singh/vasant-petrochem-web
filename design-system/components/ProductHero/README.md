# ProductHero

The first screen of a product page, and the landing view for that product's ads. It shows:

- the industries eyebrow in `gold-ink`;
- the name in `display-l` with its grade chip;
- the description as the lead;
- *Get a quote* and *Chat on WhatsApp*;
- the product's drop in its ivory light box (`ground-raised`, lit from the upper right), with the packaging line;
- `AtAGlance` underneath.

Details:

- **Props**: `product` (a catalog row) and `animate` (default `true`; the drop fills once).
- **Phone**: copy, then full-width touch buttons, then the stage, so the name, description and both actions sit above the fold at 390 × 844. **Laptop**: copy left (7 columns), stage right (5 columns), with the drop at 190px.
- **Rules**: it is the page's only `h1` and the page's one motion moment. Don't add a second drop, a background image or a slogan; the catalog's description is the copy.
