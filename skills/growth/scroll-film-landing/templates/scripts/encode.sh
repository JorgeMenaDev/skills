#!/usr/bin/env bash
# encode.sh turns media/clips/raw/clip-N.mp4 into scrub-ready web clips and matching posters in public/film/.
# A keyframe every 6 frames keeps backward seeks fast. BT.709 with the sRGB curve makes the browser paint the
# video with the poster's colours. ffmpeg 8 takes colour tags from the frames, so setparams sets them there too.
set -euo pipefail
cd "$(dirname "$0")/.."
out=public/film; tmp=media/clips/frames
mkdir -p "$out" "$tmp"
tagf="setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
tags=(-color_primaries bt709 -color_trc iec61966-2-1 -colorspace bt709 -color_range tv -movflags +faststart+write_colr)
gop=(-g 6 -keyint_min 6 -sc_threshold 0 -pix_fmt yuv420p)
# Only clip-1.mp4 … clip-N.mp4 count; keep rejected takes in media/clips/rejected/.
n=$(find media/clips/raw -maxdepth 1 -regex '.*/clip-[0-9][0-9]*\.mp4' | wc -l | tr -d ' ')
(( n > 0 )) || { echo "no media/clips/raw/clip-N.mp4 found" >&2; exit 1; }
for i in $(seq 1 "$n"); do [[ -f media/clips/raw/clip-$i.mp4 ]] || { echo "missing media/clips/raw/clip-$i.mp4 (numbering must run 1..$n)" >&2; exit 1; }; done
for i in $(seq 1 "$n"); do
  src=media/clips/raw/clip-$i.mp4
  ffmpeg -v error -y -i "$src" -an -vf "scale=1920:-2,$tagf" -c:v libx264 -preset slow -crf 28 "${gop[@]}" "${tags[@]}" "$out/clip-$i.mp4"
  ffmpeg -v error -y -i "$src" -an -vf "scale=1280:-2,$tagf" -c:v libx264 -preset slow -crf 28 "${gop[@]}" "${tags[@]}" "$out/clip-$i-720.mp4"
done
# Poster i is the frame the film shows at stop i: the first frame of clip i+1, and the last frame of the last clip.
rgb=(-vf "scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24")
for i in $(seq 0 $((n - 1))); do
  ffmpeg -v error -y -i "$out/clip-$((i + 1)).mp4" -frames:v 1 "${rgb[@]}" "$tmp/poster-$i.png"
done
ffmpeg -v error -y -sseof -0.2 -i "$out/clip-$n.mp4" -update 1 -frames:v 1 "${rgb[@]}" "$tmp/poster-$n.png"
for f in "$tmp"/poster-*.png; do
  b=$(basename "$f" .png)
  cwebp -quiet -q 82 "$f" -o "$out/$b.webp"
  cwebp -quiet -q 80 -resize 960 0 "$f" -o "$out/$b-960.webp"
done
# Clip-to-clip seams: last frame of clip k against first frame of clip k+1. Generated clips each settle on the
# still separately, so they never match exactly; under about 30 dB the switch at that stop is visible.
for i in $(seq 1 $((n - 1))); do
  ffmpeg -v error -y -sseof -0.1 -i "$out/clip-$i.mp4" -update 1 -frames:v 1 "$tmp/seam-$i-end.png"
  db=$(ffmpeg -hide_banner -i "$tmp/seam-$i-end.png" -i "$tmp/poster-$i.png" -lavfi "[0]format=rgb24[a];[1]format=rgb24[b];[a][b]psnr" -f null - 2>&1 | grep -o 'average:[0-9.inf]*' | cut -d: -f2)
  echo "seam at stop $i (clip $i end vs clip $((i + 1)) start): $db dB"
done
for f in "$out"/clip-*.mp4; do
  printf '%s %s\n' "$(basename "$f")" "$(ffprobe -v error -select_streams v -show_entries stream=color_primaries,color_transfer -of csv=p=0 "$f")"
done
