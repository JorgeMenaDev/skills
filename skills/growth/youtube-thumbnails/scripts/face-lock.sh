#!/usr/bin/env bash
# Paste the real logo face over a generated mascot's head so the face never drifts.
# Usage: face-lock.sh IN.png LOGO.png OUT.png CX CY D
#   CX,CY = centre of the head circle in IN (pixels), D = its diameter. Measure them by looking at IN.
# Preserves IN's alpha. Run review-sheet.sh or open OUT to check the edge sits on the head outline.
set -euo pipefail
IN=$1 LOGO=$2 OUT=$3 CX=$4 CY=$5 D=$6
X=$((CX - D/2)); Y=$((CY - D/2))
ffmpeg -loglevel error -y -i "$IN" -i "$LOGO" -filter_complex \
  "[1]scale=$D:$D:flags=lanczos,format=rgba[f];[0]format=rgba[b];[b][f]overlay=$X:$Y:format=auto" \
  -frames:v 1 "$OUT"
echo "$OUT"
