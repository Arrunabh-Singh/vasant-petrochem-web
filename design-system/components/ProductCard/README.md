# ProductCard

One product in a list: its drop, grade chip, name, description, three key values and packaging, all one link to its page.

- **Props**: `product` (a catalog row: `slug`, `name`, `code`, `description`, `specs`, `packaging`) and `href` (defaults to the product page).
- **Layout**: a single column on phone, or a swipe rail (`vp-rail`) where the row reads as one line. On laptop, a three-column grid (`vp-grid`), or four (`vp-grid-4`) for the full catalog on the home page.
- **The whole card is the link**: nothing else inside it may be interactive. It lifts 2px with `shadow-raised` under a pointer and shows `focus-ring` on keyboard focus.
- **The description clamps at three lines**; the specs show the catalog's first three, exactly as written.
- **Don't** add prices, stock badges or ratings: the catalog has none of these, and the brand never invents them.
