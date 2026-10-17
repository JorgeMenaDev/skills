#!/usr/bin/env bash
# canvas.sh PHOTO OUT_PREFIX [Y_SHIFT]
# Makes the two inputs for outpainting a portrait (or 4:3) photo to 16:9:
#   OUT_PREFIX-band.png    the photo cropped to 1280x1080 (the real pixels paste.py puts back)
#   OUT_PREFIX-canvas.jpg  that band centred on a 1920x1080 canvas with flat grey (127) side bars
# Y_SHIFT (-1..1, default 0) moves the crop up or down from the centre to keep the subject.
set -euo pipefail
photo="$1"; out="$2"; shift_y="${3:-0}"
ffmpeg -v error -y -i "$photo" -vf "crop=w='min(iw,ih*1280/1080)':h='min(iw,ih*1280/1080)*1080/1280':x='(iw-ow)/2':y='(ih-oh)/2*(1+$shift_y)',scale=1280:1080:flags=lanczos" -frames:v 1 "$out-band.png"
ffmpeg -v error -y -i "$out-band.png" -vf "pad=1920:1080:320:0:color=0x7f7f7f" -q:v 2 -frames:v 1 "$out-canvas.jpg"
echo "$out-band.png $out-canvas.jpg"
