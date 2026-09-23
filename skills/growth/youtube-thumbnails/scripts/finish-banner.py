#!/usr/bin/env python3
"""Banner composer: background plate + real logo + one line of copy.

Usage: finish-banner.py IN OUT.png --logo LOGO.png --text "COPY" --font-file FONT.ttf
                       [--logo-px 230] [--gap 48] [--start-size 84] [--min-size 40] [--color #ffffff]

The copy stays on one line: the font shrinks until logo + gap + line fit the
safe area (x 507-2053, y 508-931) with 60 px margins, otherwise exit 1.
Provenance: composed from the v2 banner Jorge approved (PIL, width-fit asserted).
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SAFE = (507, 508, 2053, 931)
MARGIN = 60
W, H = 2560, 1440


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("out")
    ap.add_argument("--logo", required=True)
    ap.add_argument("--text", required=True)
    ap.add_argument("--font-file", required=True)
    ap.add_argument("--logo-px", type=int, default=230)
    ap.add_argument("--gap", type=int, default=48)
    ap.add_argument("--start-size", type=int, default=84)
    ap.add_argument("--min-size", type=int, default=40)
    ap.add_argument("--color", default="#ffffff")
    a = ap.parse_args()

    for label, p in (("input", a.inp), ("logo", a.logo), ("font", a.font_file)):
        if not Path(p).is_file():
            print(f"finish-banner: {label} not found: {p}", file=sys.stderr)
            sys.exit(1)

    im = Image.open(a.inp).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    logo = Image.open(a.logo).convert("RGBA")
    logo.thumbnail((a.logo_px, a.logo_px), Image.Resampling.LANCZOS)

    size = a.start_size
    while True:
        font = ImageFont.truetype(a.font_file, size)
        tw = int(font.getlength(a.text))
        total = logo.width + a.gap + tw
        if total <= (SAFE[2] - SAFE[0]) - 2 * MARGIN or size <= a.min_size:
            break
        size -= 2
    x0 = round(W / 2 - total / 2)
    if x0 < SAFE[0] + MARGIN or x0 + total > SAFE[2] - MARGIN:
        print(f"finish-banner: line still overflows at {size}px, refusing to ship", file=sys.stderr)
        sys.exit(1)

    y_logo = SAFE[1] + (SAFE[3] - SAFE[1] - logo.height) // 2
    im.paste(logo, (x0, y_logo), logo)
    d = ImageDraw.Draw(im)
    d.text((x0 + logo.width + a.gap, (SAFE[1] + SAFE[3]) / 2), a.text,
           font=font, fill=a.color, anchor="lm")
    ascent, descent = font.getmetrics()
    copy_box = (x0 + logo.width + a.gap, (SAFE[1] + SAFE[3]) / 2 - ascent,
                x0 + total, (SAFE[1] + SAFE[3]) / 2 + descent)

    out = Path(a.out)
    if out.suffix.lower() in (".jpg", ".jpeg"):
        im.save(out, quality=94)
    else:
        im.save(out)
    print(f"{out} {W}x{H} size={size}px "
          f"logo=({x0},{y_logo},{x0 + logo.width},{y_logo + logo.height}) "
          f"copy={tuple(round(v) for v in copy_box)} safe={SAFE}")


if __name__ == "__main__":
    main()
