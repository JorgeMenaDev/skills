#!/usr/bin/env bash
# Review sheet: every image in DIR at 640x360 beside its 168x94 feed size (with a duration badge).
# Usage: review-sheet.sh DIR [OUT.png]    Judge the small one: that is what most viewers see.
set -euo pipefail
DIR=$1; OUT=${2:-$DIR/review.png}
FILES=(); for f in "$DIR"/*.jpg "$DIR"/*.jpeg "$DIR"/*.png; do [ -e "$f" ] && [ "$f" != "$OUT" ] && FILES+=("$f"); done
[ ${#FILES[@]} -gt 0 ] || { echo "no images in $DIR" >&2; exit 1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; i=0
for f in "${FILES[@]}"; do
  ffmpeg -loglevel error -y -i "$f" -filter_complex "\
[0]scale=640:360:force_original_aspect_ratio=increase,crop=640:360,pad=660:380:10:10:0x202020[big];\
[0]scale=168:94:force_original_aspect_ratio=increase,crop=168:94,drawbox=x=136:y=80:w=28:h=11:color=black@0.85:t=fill,pad=208:380:20:143:0x202020[small];\
[big][small]hstack" -frames:v 1 "$TMP/$(printf %03d $i).png"
  echo "$(printf %03d $i)  $(basename "$f")"; i=$((i+1))
done
ffmpeg -loglevel error -y -i "$TMP/%03d.png" -filter_complex "tile=1x$i" -frames:v 1 "$OUT"
echo "sheet: $OUT  (rows top to bottom, in the order listed)"
