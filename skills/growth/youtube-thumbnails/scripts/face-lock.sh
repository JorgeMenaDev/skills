#!/usr/bin/env bash
# Lock the real logo face onto a generated mascot head, then restore the
# generated foreground (wings, glasses) that occludes it.
# Usage: face-lock.sh IN.png LOGO.png OUT.png CX CY D [--keep FOREGROUND.png] [--ellipse DW DH]
#   CX,CY = head centre in IN (pixels); D = head diameter. Elliptical heads: pass DW DH instead of D.
#   FOREGROUND.png = white-on-black mask of the generated foreground to restore (wings over the beak, sunglasses).
# How to measure: open IN at full size, find the head outline; CX,CY is its centre and D spans the outline.
#   Then trace outline, eyes, beak and gradient against LOGO side by side; the paste edge must sit on the head outline.
# Occluding accessories over the locked face are foreground, not drift: mask them and they survive.
# Preserves IN's alpha. Run review-sheet.sh or open OUT to check the edge sits on the head outline.
set -euo pipefail
IN=$1 LOGO=$2 OUT=$3 CX=$4 CY=$5 D=$6; shift 6 || true
KEEP=""; DW=$D; DH=$D
while [ $# -gt 0 ]; do case $1 in
  --keep) KEEP=$2; shift 2;; --ellipse) DW=$2; DH=$3; shift 3;;
  *) echo "unknown flag $1" >&2; exit 2;; esac; done
[ -f "$IN" ] || { echo "face-lock: input not found: $IN" >&2; exit 1; }
[ -f "$LOGO" ] || { echo "face-lock: logo not found: $LOGO" >&2; exit 1; }
[ -n "$KEEP" ] && [ -f "$KEEP" ] || { [ -z "$KEEP" ] || { echo "face-lock: mask not found: $KEEP" >&2; exit 1; }; }
X=$((CX - DW/2)); Y=$((CY - DH/2))
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
ffmpeg -loglevel error -y -i "$IN" -i "$LOGO" -filter_complex \
  "[1]scale=${DW}:${DH}:flags=lanczos,format=rgba[f];[0]format=rgba[b];[b][f]overlay=$X:$Y:format=auto" \
  -frames:v 1 "$TMP/locked.png"
if [ -n "$KEEP" ]; then
  W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$IN")
  H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$IN")
  ffmpeg -loglevel error -y -i "$TMP/locked.png" -i "$IN" -i "$KEEP" -filter_complex \
    "[2]scale=${W}:${H}:flags=lanczos,format=gray[m];[1]format=rgba[fg];[fg][m]alphamerge[cut];[0]format=rgba[b];[b][cut]overlay=0:0:format=auto,format=rgba" \
    -frames:v 1 "$OUT"
else
  cp "$TMP/locked.png" "$OUT"
fi
echo "$OUT"
