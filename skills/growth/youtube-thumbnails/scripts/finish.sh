#!/usr/bin/env bash
# Finish one model image: optional real logo + optional headline, export exact size.
# Usage: finish.sh IN OUT [--logo FILE] [--logo-pos tl|tr|bl] [--logo-size PCT]
#                         [--text "HEADLINE"] [--text-pos tl|bl|tr] [--font "Google Font"] [--color HEX]
#                         [--size 1280x720]
# Banner: --size 2560x1440 ignores the positions and centres logo + text inside the 1546x423 safe area.
# Bottom-right is never offered: YouTube draws the duration badge there.
set -euo pipefail
IN=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); OUT=$2; shift 2
LOGO=""; LPOS=tl; LSIZE=14; TEXT=""; TPOS=bl; FONT="Inter Tight"; COLOR="#ffffff"; SIZE=1280x720
while [ $# -gt 0 ]; do case $1 in
  --logo) LOGO=$(cd "$(dirname "$2")" && pwd)/$(basename "$2"); shift 2;; --logo-pos) LPOS=$2; shift 2;;
  --logo-size) LSIZE=$2; shift 2;; --text) TEXT=$2; shift 2;; --text-pos) TPOS=$2; shift 2;;
  --font) FONT=$2; shift 2;; --color) COLOR=$2; shift 2;; --size) SIZE=$2; shift 2;;
  *) echo "unknown flag $1" >&2; exit 2;; esac; done
W=${SIZE%x*}; H=${SIZE#*x}
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
command -v google-chrome >/dev/null 2>&1 && [ ! -x "$CHROME" ] && CHROME=$(command -v google-chrome)
pos() { case $1 in tl) echo "top:5%;left:4%";; tr) echo "top:5%;right:4%";; bl) echo "bottom:7%;left:4%";; *) echo "bad pos $1" >&2; exit 2;; esac; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
FONTQ=$(printf %s "$FONT" | sed 's/ /+/g')
{
  echo "<!doctype html><meta charset=utf-8><link href='https://fonts.googleapis.com/css2?family=$FONTQ:wght@800;900&display=block' rel=stylesheet>"
  echo "<style>*{margin:0}body{width:${W}px;height:${H}px;overflow:hidden;position:relative;background:url('file://$IN') center/cover}"
  echo ".l{position:absolute;$(pos "$LPOS");height:${LSIZE}%;filter:drop-shadow(0 4px 18px rgba(0,0,0,.55))}"
  echo ".t{position:absolute;$(pos "$TPOS");max-width:58%;font:900 $((H/7))px/.95 '$FONT',sans-serif;letter-spacing:-.01em;color:$COLOR;text-shadow:0 4px 30px rgba(0,0,0,.6)}"
  echo ".safe{position:absolute;left:507px;top:508px;width:1546px;height:423px;display:flex;align-items:center;justify-content:center;gap:56px;padding:0 60px}"
  echo ".safe .l,.safe .t{position:static;height:auto}.safe .l{height:240px}.safe .t{max-width:1100px;font-size:84px;line-height:1.02}</style><body>"
  [ "$SIZE" = 2560x1440 ] && echo "<div class=safe>"
  [ -n "$LOGO" ] && echo "<img class=l src='file://$LOGO'>"
  [ -n "$TEXT" ] && echo "<div class=t>$TEXT</div>"
  [ "$SIZE" = 2560x1440 ] && echo "</div>"
  echo "</body>"
} > "$TMP/f.html"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=6000 \
  --allow-file-access-from-files --window-size="$W,$H" --screenshot="$TMP/f.png" "file://$TMP/f.html" >/dev/null 2>&1
case $OUT in
  *.jpg|*.jpeg) ffmpeg -loglevel error -y -i "$TMP/f.png" -q:v 2 "$OUT";;
  *) cp "$TMP/f.png" "$OUT";;
esac
BYTES=$(wc -c < "$OUT" | tr -d ' ')
echo "$OUT ${W}x${H} ${BYTES} bytes"
[ "$SIZE" = 1280x720 ] && [ "$BYTES" -gt 2000000 ] && echo "WARN: over 2 MB (mobile upload cap)" >&2 || true
