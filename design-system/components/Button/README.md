# Button

The one control for every action: `primary` for the thing the view is for, `secondary` for the rest, and the two on-deep variants inside dark bands.

- **Props**:
  - `variant`: `primary`, `secondary`, `on-deep` or `outline-on-deep`.
  - `size`: default 48px; `small` is 44px on phone and 40px on laptop; `touch` is 56px.
  - `icon` and `iconAfter`: `arrow`, `phone`, `whatsapp`, `doc` or `check`.
  - `href` renders a link instead of a button.
  - Also `full`, `type`, `disabled`, `onClick`, and `aria-label` (required when there is no text).
  - Children are the label.
- **One primary per view.** On a dark band the primary is `on-deep` (deep text on cream, 13.8:1), never brand green, which is only 2.2:1 against `deep`.
- **Labels are verbs in sentence case**: *Get a quote*, *Chat on WhatsApp*, *Download the TDS*, *Send enquiry*.
- **On phone**, hero and form actions use `touch` and stack full width; the call button is icon-only (`vp-icon-btn`) with an `aria-label`.
- **Focus** shows `focus-ring` on light grounds and `focus-ring-deep` on dark ones.
