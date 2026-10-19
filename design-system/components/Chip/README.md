# Chip

A pill for choosing or following: industry filters on the catalog, and industry links on a product page.

- **Props**: `selected`; either `onClick` (renders a button with `aria-pressed`) or `href` (renders a link). Children are a short label.
- **Selected** is the `brand` fill with `on-brand` text. Unselected chips have a `paper` fill and a `line-strong` edge (3.5:1).
- **Size**: 44px tall on phone, 38px on laptop. Rows wrap; never hide chips in a sideways scroller.
- **Don't** use a chip for status (that is `accent`) or for the grade code (that is `GradeChip`).
