# MobileActionBar

The three things a buyer wants within thumb reach, fixed to the bottom of every phone page: call, WhatsApp and *Get a quote*.

- **Props**: `callHref` (the `tel:` link from the company config), `whatsappHref` (the `wa.me` link with a prefilled message naming the page's product) and `quoteHref`.
- **Size**: 56px controls. The bar clears the iPhone home indicator with `env(safe-area-inset-bottom)`, and the page reserves the same space at its foot.
- **Glass**, like every floating bar, with the opaque fallback.
- **Phone only.** On laptop, the same jobs live in the navigation's *Get a quote* and the floating *Chat on WhatsApp* pill.
