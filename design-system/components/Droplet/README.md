# Droplet

The signature: the logo's own drop, traced from the artwork, filled with the colour of one product's liquid.

- **Props**:
  - `slug` (picks the tint from the product) or `tint` (`gold`, `straw`, `amber`, `brown`, `fuel`, `bitumen`, `clear` or `white`).
  - `size`: width in px; height follows at 1.76×.
  - `animate`: the liquid rises once on mount.
  - `title`: makes it an image with that accessible name. Without it the drop is decorative.
- **Sizes**: 30px on a card, 44 to 64px in a lineup, 150px (phone) or 190px (laptop) in a product hero, about 260px in an ad.
- **Animate** only the one drop that is the page's moment: the product hero. Reduced motion shows it full.
- **Colours** read the `drop-*` tokens and fall back to the same hex. `Vasant.dropMarkup(tint, { plain: true })` returns a standalone SVG for files and design tools.
- **Don't** fill drops to different levels (it reads as a quantity), use one as a bullet or a status mark, put text on it, rotate it, or recolour it outside its tint.
