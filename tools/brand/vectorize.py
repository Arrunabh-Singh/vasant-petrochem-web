"""Vector masters of the logo, drawn from the owner's 1024px artwork
(design-system/assets/Logos/source/vasant-logo-artwork-1024.png).

    python3 -m venv .venv && .venv/bin/pip install numpy==2.5.4 pillow==13.0.0 scipy==1.18.1 potracer==0.0.4 resvg-py==0.5.0
    .venv/bin/python -I tools/brand/vectorize.py

- The V and arrow are straight-edged: each edge is the least-squares line
  through the traced outline, and each corner is where two edges meet.
- The wordmark is traced with potrace at 8x.
- The drop is the design system's own drop (DROP_PATH in
  site/src/lib/drop.ts), placed where it best overlays the artwork, so the
  logo's drop and every product drop are one shape.

It writes the SVG beside each PNG in design-system/assets/Logos/, plus
vasant-favicon.svg (the icon, cream when the browser's chrome is dark).
Checks, each rendering the SVG and classifying both images the same way:
- against the artwork: the green layer's overlap (IoU) must be at least 0.99;
- against each PNG: at least 0.95, which catches a misplaced part (the PNGs
  were cut and edge-processed separately, so their strokes differ by a hair).
"""
import io
import sys
from pathlib import Path

import numpy as np
import potrace
import resvg_py
from PIL import Image
from scipy import ndimage as ndi

LOGOS = Path(__file__).resolve().parents[2] / "design-system" / "assets" / "Logos"
ART = LOGOS / "source" / "vasant-logo-artwork-1024.png"
GREEN, CREAM = "#246851", "#fbf8f1"  # tokens: brand (the logo green), cream

# The drop, as in site/src/lib/drop.ts (the gold tint: the logo's own).
DROP_PATH = "M50 0C47.62 4.39 0 117.26 0 126.26A50 50 0 0 0 100 126.26C100 117.26 52.38 4.39 50 0Z"
DROP_H, LEVEL = 176.26, 107.07
HIGHLIGHT = "M10.1 130.3C11.2 141.5 16.2 153.2 24.2 159.6C31.4 165.3 39.4 168 47.5 167.7"
CHROME = [(0, "#979797"), (0.1, "#999b9b"), (0.19, "#b1b3b2"), (0.28, "#d8dadc"), (0.33, "#f3f4f5"), (0.37, "#f5f7f9"),
          (0.42, "#d9dbdd"), (0.465, "#c0c2c3"), (0.51, "#a6a8aa"), (0.56, "#b3b5b6"), (0.61, "#c6c8c9")]
GOLD = {"mid": "#daad4a", "light": "#f8d166", "deep": "#a16e27"}
# Best overlay of that drop on the artwork (translate x, y; scale), found by a
# grid search with the same classifier the report uses.
DROP_AT = (294.60, 464.69, 1.0250)

# Corners of the V and arrow, read off a first trace; fit_mark() refines each
# edge between them. The notch's bottom corner lies under the drop.
CORNERS = [(173.9, 362.3), (249.9, 362.3), (320.2, 528.8), (371.8, 529.0), (429.1, 395.1), (397.7, 380.3),
           (495.6, 339.3), (526.4, 435.6), (494.9, 423.3), (385.6, 671.0), (305.6, 671.0)]
EDGES = [(0, 1), (1, 2), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (10, 0)]

# Each file: its PNG's size, and where the mark and the wordmark sit in it
# (translate x, y; scale) in the artwork's coordinates.
FILES = {
    "vasant-logo": ((734, 345), (-167, -333, 1), (-167, -333, 1)),
    "vasant-lockup-compact": ((634, 182), (-87.19, -174.67, 0.52567), (-267, -443, 1)),
    "vasant-mark": ((367, 345), (-167, -333, 1), None),
    "vasant-wordmark": ((418, 114), None, (-483, -477, 1)),
    "vasant-icon-512": ((512, 512), (-151.78, -332.12, 1.16196), None),
}
SVG_NAME = {"vasant-icon-512": "vasant-icon"}  # a vector has no pixel size
REVERSED = ["vasant-logo", "vasant-lockup-compact"]


def green_coverage(rgb):
    """How much of each pixel is logo green, 0..1; 0 for the drop's chrome and gold."""
    r, g = rgb[..., 0], rgb[..., 1]
    dark = 255 - r
    greenish = (dark > 6) & ((g - r) / np.maximum(dark, 1) > 0.18)
    return np.clip(dark / 218, 0, 1) * greenish


def layers(rgba, reversed_=False):
    """Green (or cream) and drop masks, classified the same way for artwork, PNGs and renders."""
    a = rgba[..., 3] / 255
    rgb = rgba[..., :3] * a[..., None] + 255 * (1 - a[..., None])  # onto white
    if reversed_:
        ink = (a >= 0.5) & (np.abs(rgba[..., :3] - [251, 248, 241]).sum(-1) < 40)
        other = (a >= 0.5) & ~ink
    else:
        ink = green_coverage(rgb) >= 0.5
        other = (~(green_coverage(rgb) > 0)) & (rgb.sum(-1) < 752)
    lab, n = ndi.label(ndi.binary_closing(other, iterations=2))
    if not n:
        return ink, other
    sizes = ndi.sum(other, lab, range(1, n + 1))
    return ink, ndi.binary_fill_holes(lab == 1 + int(np.argmax(sizes)))


def trace(coverage, k=8):
    """potrace at k times the artwork's resolution; path data in artwork pixels."""
    big = Image.fromarray((coverage * 255).astype(np.uint8)).resize((coverage.shape[1] * k, coverage.shape[0] * k), Image.LANCZOS)
    curves = potrace.Bitmap(~(np.asarray(big) >= 128)).trace(turdsize=4 * k, alphamax=1.0, opticurve=True, opttolerance=0.2)
    f = lambda p: f"{p.x / k:.2f} {p.y / k:.2f}"
    d = []
    for c in curves:
        d.append("M" + f(c.start_point))
        for s in c.segments:
            d.append(f"L{f(s.c)}L{f(s.end_point)}" if s.is_corner else f"C{f(s.c1)} {f(s.c2)} {f(s.end_point)}")
        d.append("Z")
    return "".join(d)


def fit_mark(coverage, k=8):
    """The V and arrow as a polygon: a straight line fitted to each edge of the traced outline."""
    big = Image.fromarray((coverage * 255).astype(np.uint8)).resize((coverage.shape[1] * k, coverage.shape[0] * k), Image.LANCZOS)
    outline = max(potrace.Bitmap(~(np.asarray(big) >= 128)).trace(turdsize=4 * k, alphamax=0, opticurve=False), key=len)
    p0 = np.array([[s.end_point.x, s.end_point.y] for s in outline]) / k
    pts = np.vstack([np.linspace(p0[i - 1], p0[i], max(2, int(np.hypot(*(p0[i] - p0[i - 1])) / 0.25)), endpoint=False) for i in range(len(p0))])
    lines = []
    for i, j in EDGES:
        a, b = np.array(CORNERS[i]), np.array(CORNERS[j])
        length = np.hypot(*(b - a))
        u = (b - a) / length
        t, off = (pts - a) @ u, (pts - a) @ np.array([-u[1], u[0]])
        near = pts[(t > 4) & (t < length - 4) & (np.abs(off) < 1.6)]
        centre = near.mean(0)
        lines.append((centre, np.linalg.svd(near - centre)[2][0]))
    corners = []
    for (c1, d1), (c2, d2) in zip([lines[-1]] + lines[:-1], lines):
        t = np.linalg.solve(np.array([d1, -d2]).T, c2 - c1)
        corners.append(c1 + t[0] * d1)
    return "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in corners) + "Z"


def drop_svg(uid):
    stop = lambda o, c, op=None: f'<stop offset="{o}" stop-color="{c}"' + ("" if op is None else f' stop-opacity="{op}"') + "/>"
    liquid = stop(0, GOLD["light"], 0.95) + stop(0.08, GOLD["mid"]) + stop(0.33, GOLD["light"]) + stop(0.58, GOLD["mid"]) + stop(0.84, GOLD["deep"]) + stop(1, GOLD["deep"])
    x, y, s = DROP_AT
    return (
        f'<g transform="translate({x} {y}) scale({s})"><defs>'
        f'<linearGradient id="{uid}c" x1="0" y1="0" x2="0" y2="{DROP_H}" gradientUnits="userSpaceOnUse">{"".join(stop(o, c) for o, c in CHROME)}</linearGradient>'
        f'<linearGradient id="{uid}l" x1="0" y1="{LEVEL}" x2="0" y2="{DROP_H}" gradientUnits="userSpaceOnUse">{liquid}</linearGradient>'
        f'<clipPath id="{uid}k"><path d="{DROP_PATH}"/></clipPath></defs>'
        f'<path d="{DROP_PATH}" fill="url(#{uid}c)"/><g clip-path="url(#{uid}k)">'
        f'<rect x="-2" y="{LEVEL}" width="104" height="{DROP_H - LEVEL + 2:.2f}" fill="url(#{uid}l)"/>'
        f'<rect x="-2" y="{LEVEL}" width="104" height="2.2" fill="#fff" opacity="0.32"/>'
        f'<path d="{HIGHLIGHT}" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" opacity="0.9"/></g></g>'
    )


def svg_file(size, mark_at, word_at, mark_d, word_d, ink, style=""):
    w, h = size
    tf = lambda t: f'translate({t[0]} {t[1]}) scale({t[2]})'
    parts = [style]
    if mark_at:
        parts.append(f'<g transform="{tf(mark_at)}"><path class="ink" d="{mark_d}" fill="{ink}"/>{drop_svg("d")}</g>')
    if word_at:
        parts.append(f'<path class="ink" transform="{tf(word_at)}" d="{word_d}" fill="{ink}" fill-rule="evenodd"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{"".join(parts)}</svg>\n'


def rgba(png_bytes_or_path):
    src = io.BytesIO(png_bytes_or_path) if isinstance(png_bytes_or_path, bytes) else png_bytes_or_path
    return np.asarray(Image.open(src).convert("RGBA")).astype(float)


def main():
    art = rgba(ART)
    coverage = green_coverage(art[..., :3])
    ink = coverage >= 0.5
    lab, n = ndi.label(ink)
    mark = lab == 1 + int(np.argmax(ndi.sum(ink, lab, range(1, n + 1))))
    grow = lambda m: ndi.binary_dilation(m, iterations=3)
    mark_d = fit_mark(coverage * grow(mark))
    word_d = trace(coverage * grow(ink & ~mark) * ~grow(mark))

    iou = lambda a, b: (a & b).sum() / max((a | b).sum(), 1)
    failed = []
    print(f"{'compared with':40} {'ink IoU':>8} {'drop IoU':>9}")
    for name, (size, mark_at, word_at) in [("artwork", ((1024, 1024), (0, 0, 1), (0, 0, 1)))] + list(FILES.items()):
        jobs = [(name, GREEN, False)] + ([(f"{name}-reversed", CREAM, True)] if name in REVERSED else [])
        for png, colour, rev in jobs:
            svg = svg_file(size, mark_at, word_at, mark_d, word_d, colour)
            if name != "artwork":
                (LOGOS / f"{SVG_NAME.get(png, png)}.svg").write_text(svg)
            ref = art if name == "artwork" else rgba(LOGOS / f"{png}.png")
            got = rgba(bytes(resvg_py.svg_to_bytes(svg_string=svg)))
            (i1, d1), (i2, d2) = layers(ref, rev), layers(got, rev)
            ink_iou, drop_iou = iou(i1, i2), (iou(d1, d2) if mark_at else float("nan"))
            if ink_iou < (0.99 if name == "artwork" else 0.95):
                failed.append(png)
            print(f"{('the 1024px artwork' if name == 'artwork' else png + '.png'):40} {ink_iou:8.4f} {drop_iou:9.4f}")
    # The favicon: the icon, cream when the browser's chrome is dark (the brand's reversed colour).
    size, mark_at, _ = FILES["vasant-icon-512"]
    dark = f'<style>@media (prefers-color-scheme: dark) {{ .ink {{ fill: {CREAM}; }} }}</style>'
    (LOGOS / "vasant-favicon.svg").write_text(svg_file(size, mark_at, None, mark_d, word_d, GREEN, dark))
    if failed:
        sys.exit(f"vectorize: overlap too low for {', '.join(failed)}")


if __name__ == "__main__":
    main()
