# EnquiryForm

The quote request. It sits on `/contact` and, pre-filled, near the foot of every product page. It ends in *Request received* with the enquiry's reference.

- **Props**:
  - `defaultProduct`: the product name with its code in brackets, pre-selected.
  - `title`.
  - `state`: `idle`, `error` (shows an inline field error) or `success`.
  - `reference`: shown on success.
- **Fields**, as the site's quote action expects them:
  - name and business email (both required);
  - company and phone or WhatsApp;
  - product of interest and quantity;
  - additional details.
- **Wiring**: posts to the existing `submitQuoteRequest` action with `sourcePage` set to the page (`/products/<slug>` is already accepted). The honeypot and the bot check stay as they are.
- **Fields**: 52px inputs on `surface` with a `line-strong` edge (3.8:1), 16px text so iOS never zooms, and a visible label on every field (*(required)* in `text-3`). Focus is the `gold-deep` edge plus `focus-ring`.
- **Errors**: `danger` with an icon and an instruction, next to the field.
- **Success**: an `accent` disc with an `on-accent` tick, *Request received*, the reference in mono, and the reply promise (*within 24 hours on business days*).
- **Phone**: one column and a full-width 56px *Send enquiry*. **Laptop**: paired fields in two columns.
