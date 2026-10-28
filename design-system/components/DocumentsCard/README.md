# DocumentsCard

The dark band on a product page that hands over the Technical Data Sheet for a work email.

- **Props**: `product` (uses `name`, `code`). In the site, the form posts to the existing TDS action and opens the signed PDF link.
- **Colour**: an ivory card (`ground-raised`) with a gold hairline; title in `text`, copy in `text-2`, eyebrow in `gold-ink`. The field is the standard `vp-input`. The action is the primary button, *Download the TDS*.
- **Phone**: copy above the field, with a full-width touch button. **Laptop**: copy and form side by side.
- **Gating**: the TDS stays behind the email; the SDS, once it exists, is a plain download with no form (VP-DOC-003). Never promise to "send" a document the system can't deliver instantly.
