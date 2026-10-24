# LocalNav

The product page's own bar, sticky at the top in `glass`: the product's name and grade on the left, *Get a quote* on the right, and on laptop the page's sections between them.

- **Props**: `product` and `active` (`Overview`, `Specs`, `Uses` or `Documents`).
- **Height**: `localnav-height`. The bar sticks with CSS (`position: sticky; top: 0`); no scroll scripts.
- **Phone**: name, grade and *Get a quote*. A long name truncates with an ellipsis; the button never shrinks below 44px.
- **Glass** is the `glass` fill, blurred 24px and saturated 1.4. It turns opaque `ground` under reduced transparency or increased contrast.
