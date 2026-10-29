---
name: design-review
description: Review a page of Vasant Petrochem's public site before it ships, at phone and laptop sizes, against the brand book and five review lenses (accessibility, conventions, visual craft, interaction, writing), including the home page's scroll film. Use before opening or approving a pull request that changes what the site looks like.
---

# Design review

## Capture

```
npm --prefix site run build && npm --prefix site run preview &
npm --prefix site run shots -- /the/page /another      # full pages, 390 and 1440 wide
npm --prefix site run shots -- --film                  # the home film as contact sheets
npm --prefix site run shots -- --film --reduce         # the still version (reduced motion, Firefox)
npm --prefix site run shots -- --intro                 # the home page's opening, until Ready and through Enter
```

The run fails on horizontal overflow, console errors or CSP violations. Look at every image at both widths before judging.

## Five lenses, in order

1. **Accessibility** (any failure blocks the change)
   - Text contrast at least 4.5:1, or 3:1 at 24px and above. Compute it from the token values; don't eyeball it.
   - Touch targets at least 44px on phones.
   - Nothing is conveyed by colour alone. Every icon-only button has a label.
   - The page works with the keyboard alone, with focus visible.
   - With reduced motion, everything is visible and nothing pins.
2. **Conventions**
   - The navigation, the action bar on phones and the WhatsApp pill on laptops behave like the rest of the site.
   - Scrolling is never smoothed or scripted. Only the film snaps: one frame per flick, swipe or key, down to its last grade, and freely past it.
   - Forms use the right input types and keep the buyer's input on errors.
3. **Visual craft**
   - Only tokens are used, with one accent per view, and alignment holds to the grid.
   - The drop is the signature: it appears where it means something, never as decoration.
   - The boldness is spent in one place on each page.
4. **Interaction**
   - Loading, empty and error states exist and say what to do next.
   - The film's motion follows the scroll. Only transform, opacity, blur and colour move.
   - Where you are is always visible in the film: the grade's place (`03 / 08`), the scale's marker, the hairline and, on laptops, the chapter dots. Each snap frame is a composed screen, with nothing half-faded.
   - The opening: "Skip intro" shows from its first frame, Enter has focus at Ready, and Enter's drop lands on the hero's with nothing shown twice.
   - Every button shows a press at once, with its own pressed colour, never the browser's tap highlight.
   - For anything on iPhones or Mac Safari, run the Apple rig and read its report (the `motion` skill).
5. **Writing**
   - Plain, specific English, and buttons that say what happens.
   - Every promise comes from `content/claims.json`.
   - No `TODO` or placeholder is visible, and nothing that says "coming soon" without a date.

## Report

For each finding, give the severity (Critical, High, Medium or Low), what is wrong (with the numbers), why it matters, and the fix in this codebase. Critical and High findings are fixed before the pull request merges.
