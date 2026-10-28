# Button

The one control for every action: `primary` for the thing the view is for, `secondary` for the rest, and the two dark variants on the gold band.

- **Props**:
  - `variant`: `primary`, `secondary`, `dark` or `outline-dark`.
  - `size`: default 48px; `small` is 44px on phone and 40px on laptop; `touch` is 56px.
  - `icon` and `iconAfter`: `arrow`, `phone`, `whatsapp`, `doc` or `check`.
  - `href` renders a link instead of a button.
  - Also `full`, `type`, `disabled`, `onClick`, and `aria-label` (required when there is no text).
  - Children are the label.
- **One primary per view.** The primary is a `gold` fill with a `gold-deep` edge and `on-gold` text (7.8:1). On the gold band it is `dark`: warm black with `gold-tint` text.
- **Labels are verbs in sentence case**: *Get a quote*, *Chat on WhatsApp*, *Download the TDS*, *Send enquiry*.
- **On phone**, hero and form actions use `touch` and stack full width; the call button is icon-only (`vp-icon-btn`) with an `aria-label`.
- **Focus** shows `focus-ring` everywhere: a `ground` gap, then 2px of `gold-ink`.
