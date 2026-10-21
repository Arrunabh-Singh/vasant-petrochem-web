# SpecTable

A product's typical properties as a real table: label left in `secondary`, value right in `mono` `ink`, the packaging row last, and the `Disclaimer` underneath.

- **Props**: `product` (uses `name`, `code`, `specs`, `packaging`).
- **Semantics**: a `<table>` with a visually hidden caption ("Typical properties of Base Oil SN500 (SN-500)") and `<th scope="row">` labels, so screen readers announce each pair.
- **Values are copied exactly** from the catalog: never round, convert or restyle them.
- **No specs yet**: render *Specifications on request* in place of the table (see the Product pages section).
- **Same at both widths**: it fills its column; the paddings step from `space-5` to `space-6` on laptop.
