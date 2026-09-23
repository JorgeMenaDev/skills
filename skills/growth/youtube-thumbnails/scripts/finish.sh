#!/usr/bin/env bash
# Finish one model image: optional real logo + optional headline, export exact size.
# Usage: finish.sh IN OUT [--logo FILE] [--logo-pos tl|tr|bl] [--logo-size PCT]
#                         [--text "HEADLINE"] [--text-pos tl|bl|tr] [--font "Google Font"] [--font-file LOCAL.ttf] [--color HEX]
#                         [--size 1280x720]
# Banner (--size 2560x1440) delegates to finish-banner.py, which needs --logo, --text and --font-file
#   and asserts the single line fits the safe area. Thumbnail sizes render in headless Chrome.
# Bottom-right is never offered: YouTube draws the duration badge there.
set -euo pipefail
IN=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); OUT=$2; shift 2
LOGO=""; LPOS=tl; LSIZE=14; TEXT=""; TPOS=bl; FONT="Inter Tight"; FONTFILE=""; COLOR="#ffffff"; SIZE=1280x720
while [ $# -gt 0 ]; do case $1 in
  --logo) LOGO=$(cd "$(dirname "$2")" && pwd)/$(basename "$2"); shift 2;; --logo-pos) LPOS=$2; shift 2;;
  --logo-size) LSIZE=$2; shift 2;; --text) TEXT=$2; shift 2;; --text-pos) TPOS=$2; shift 2;;
  --font) FONT=$2; shift 2;; --font-file) FONTFILE=$(cd "$(dirname "$2")" && pwd)/$(basename "$2"); shift 2;;
  --color) COLOR=$2; shift 2;; --size) SIZE=$2; shift 2;;
  *) echo "unknown flag $1" >&2; exit 2;; esac; done
[ -f "$IN" ] || { echo "finish: input not found: $IN" >&2; exit 1; }
[ -z "$LOGO" ] || [ -f "$LOGO" ] || { echo "finish: logo not found: $LOGO" >&2; exit 1; }
[ -z "$FONTFILE" ] || [ -f "$FONTFILE" ] || { echo "finish: font file not found: $FONTFILE" >&2; exit 1; }
if [ "$SIZE" = 2560x1440 ]; then
  [ -n "$LOGO" ] || { echo "finish: banner needs --logo" >&2; exit 2; }
  [ -n "$TEXT" ] || { echo "finish: banner needs --text" >&2; exit 2; }
  [ -n "$FONTFILE" ] || { echo "finish: banner needs --font-file (local brand font, never a silent web fallback)" >&2; exit 2; }
  HERE=$(cd "$(dirname "$0")" && pwd)
  exec python3 "$HERE/finish-banner.py" "$IN" "$OUT" --logo "$LOGO" --text "$TEXT" --font-file "$FONTFILE" --color "$COLOR"
fi
W=${SIZE%x*}; H=${SIZE#*x}
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
command -v google-chrome >/dev/null 2>&1 && [ ! -x "$CHROME" ] && CHROME=$(command -v google-chrome)
pos() { case $1 in tl) echo "top:5%;left:4%";; tr) echo "top:5%;right:4%";; bl) echo "bottom:7%;left:4%";; *) echo "bad pos $1" >&2; exit 2;; esac; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
FAM=$FONT; FONTLINK="<link href='https://fonts.googleapis.com/css2?family=$(printf %s "$FONT" | sed 's/ /+/g')&wght@800;900&display=block' rel=stylesheet>"
if [ -n "$FONTFILE" ]; then
  FAM="BrandFont"
  FONTLINK="<style>@font-face{font-family:'BrandFont';font-weight:800 900;src:url('file://$FONTFILE')}</style>"
fi
{
  echo "<!doctype html><meta charset=utf-8>$FONTLINK"
  echo "<style>*{margin:0}body{width:${W}px;height:${H}px;overflow:hidden;position:relative;background:url('file://$IN') center/cover}"
  echo ".l{position:absolute;$(pos "$LPOS");height:${LSIZE}%;filter:drop-shadow(0 4px 18px rgba(0,0,0,.55))}"
  echo ".t{position:absolute;$(pos "$TPOS");max-width:58%;font:900 $((H/7))px/.95 '$FAM',sans-serif;letter-spacing:-.01em;color:$COLOR;text-shadow:0 4px 30px rgba(0,0,0,.6)}</style><body>"
  echo "<script>document.fonts.ready.then(function(){try{var ok=document.fonts.size>0&&document.fonts.check('900 100px \"$FAM\"');document.body.dataset.fonts=ok?'ok':'fallback';}catch(e){document.body.dataset.fonts='error';}});</script>"
  [ -n "$LOGO" ] && echo "<img class=l src='file://$LOGO'>"
  [ -n "$TEXT" ] && echo "<div class=t>$TEXT</div>"
  echo "</body>"
} > "$TMP/f.html"
if [ -n "$TEXT" ]; then
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=10000 \
  --allow-file-access-from-files --dump-dom "file://$TMP/f.html" 2>/dev/null | grep -q 'data-fonts="ok"' \
  || { echo "finish: font '$FAM' failed to load, refusing silent fallback (pass --font-file)" >&2; exit 1; }
fi
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=6000 \
  --allow-file-access-from-files --window-size="$W,$H" --screenshot="$TMP/f.png" "file://$TMP/f.html" >/dev/null 2>&1
case $OUT in
  *.jpg|*.jpeg) ffmpeg -loglevel error -y -i "$TMP/f.png" -q:v 2 "$OUT";;
  *) cp "$TMP/f.png" "$OUT";;
esac
BYTES=$(wc -c < "$OUT" | tr -d ' ')
echo "$OUT ${W}x${H} ${BYTES} bytes"
[ "$SIZE" = 1280x720 ] && [ "$BYTES" -gt 2000000 ] && echo "WARN: over 2 MB (mobile upload cap)" >&2 || true
