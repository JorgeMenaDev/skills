#!/usr/bin/env bash
# Review sheet: every image in DIR at 640x360 beside its 168x94 feed size, with a real duration badge.
# Usage: review-sheet.sh DIR [OUT.png] [DURATION]    e.g. review-sheet.sh final review.png 0:31
# Judge the small one: that is what most viewers see. Judge glyphs at full size separately: open the files.
# Badge text renders with python3 + PIL (this ffmpeg has no drawtext); the empty badge box alone needs no font.
set -euo pipefail
DIR=$1; OUT=${2:-$DIR/review.png}; DUR=${3:-}
[ -d "$DIR" ] || { echo "review-sheet: directory not found: $DIR" >&2; exit 1; }
FILES=(); for f in "$DIR"/*.jpg "$DIR"/*.jpeg "$DIR"/*.png; do [ -e "$f" ] && [ "$f" != "$OUT" ] && FILES+=("$f"); done
[ ${#FILES[@]} -gt 0 ] || { echo "no images in $DIR" >&2; exit 1; }
FONT="${REVIEW_FONT:-}"
if [ -z "$FONT" ]; then
  for c in "/System/Library/Fonts/Helvetica.ttc" "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" "/usr/share/fonts/dejavu/DejaVuSans.ttf"; do
    [ -f "$c" ] && { FONT=$c; break; }
  done
fi
if [ -n "$DUR" ] && [ -z "$FONT" ]; then
  command -v fc-match >/dev/null 2>&1 && FONT=$(fc-match -f "%{file}\n" "sans" 2>/dev/null || true)
fi
if [ -n "$DUR" ] && { [ -z "$FONT" ] || [ ! -f "$FONT" ]; }; then
  echo "review-sheet: no badge font found (set REVIEW_FONT=path/to/font.ttf)" >&2; exit 1
fi
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; i=0
for f in "${FILES[@]}"; do
  ffmpeg -loglevel error -y -i "$f" -filter_complex "\
[0]scale=640:360:force_original_aspect_ratio=increase,crop=640:360,pad=660:380:10:10:0x202020[big];\
[0]scale=168:94:force_original_aspect_ratio=increase,crop=168:94,drawbox=x=136:y=80:w=28:h=11:color=black@0.85:t=fill,pad=208:380:20:143:0x202020[small];\
[big][small]hstack" -frames:v 1 "$TMP/$(printf %03d $i).png"
  echo "$(printf %03d $i)  $(basename "$f")"; i=$((i+1))
done
ffmpeg -loglevel error -y -i "$TMP/%03d.png" -filter_complex "tile=1x$i" -frames:v 1 "$OUT"
if [ -n "$DUR" ]; then
  python3 - "$OUT" "$FONT" "$DUR" "$i" <<'PYEOF'
import sys
from PIL import Image, ImageDraw, ImageFont
out, fontpath, dur, rows = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
sheet = Image.open(out).convert("RGB")
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype(fontpath, 11)
for r in range(rows):
    d.text((819, 221 + r * 380), dur, font=font, fill="white")
sheet.save(out)
PYEOF
fi
echo "sheet: $OUT  (rows top to bottom, in the order listed)"
