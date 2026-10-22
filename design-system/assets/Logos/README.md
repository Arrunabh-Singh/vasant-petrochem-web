# Logos

Cut from the owner's 1024 × 1024 logo artwork:

- the white ground removed;
- the counters of A, P, R and O cleared;
- the drop's chrome band and gold highlight kept;
- a 2px edge un-blended from white, so there is no halo on dark grounds.

Each PNG has an SVG master beside it, drawn from the same artwork by `tools/brand/vectorize.py`:
- the V and arrow as straight edges fitted to the trace;
- the wordmark traced at 8×;
- the drop as the design system's own drop.

The SVGs are for print, signage and anything larger than its PNG. The script checks every one against the artwork and its PNG. `vasant-icon.svg` is the icon (the PNG's `-512` dropped, since a vector has no size). `vasant-favicon.svg` is the same icon turning cream when the browser's chrome is dark.

The wordmark is a trace of a 1024px image, so at poster sizes its edges show the artwork's slight wobble. When a designer supplies the original vector source (VP-HUM-017), it replaces these SVGs, and the PNGs are re-cut from it.

A replacement keeps the file's name and aspect ratio (see the `brand` skill).

- `vasant-logo.png` (734 × 345): full lockup, green and drop. Footer, the printable datasheet and ads, at 200px wide or more.
- `vasant-logo-reversed.png`: the full lockup with green turned `cream`, for `deep` and photographs.
- `vasant-lockup-compact.png` (634 × 182): navigation lockup, wordmark at 0.6× the mark's height. Use under 72px tall. Every share image is drawn from it.
- `vasant-lockup-compact-reversed.png`: compact lockup for `deep`.
- `vasant-mark.png` (367 × 345): the V, arrow and drop, for print and the social avatar.
- `vasant-icon-512.png`: the mark centred on a transparent 512px square. The site makes the favicon, app icons and touch icon from this file alone.
- `vasant-wordmark.png`: the wordmark alone, where the mark already appears nearby.
