"""Static Montserrat weights for the share-image renderer (satori reads TTF,
not variable WOFF2). Derived from design-system/fonts/montserrat-latin-wght-normal.woff2
under the same SIL Open Font License; re-run after replacing that file:

    python3 -m venv .venv && .venv/bin/pip install fonttools==4.60.1 brotli==1.1.0
    .venv/bin/python tools/brand/static-fonts.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FONTS = Path(__file__).resolve().parents[2] / "design-system" / "fonts"
SOURCE = FONTS / "montserrat-latin-wght-normal.woff2"

for weight in (500, 700):
    font = TTFont(SOURCE)
    static = instancer.instantiateVariableFont(font, {"wght": weight})
    static.flavor = None
    out = FONTS / f"montserrat-latin-{weight}.ttf"
    static.save(out)
    print(f"{out.relative_to(FONTS.parents[1])}: {out.stat().st_size // 1024} KB")
