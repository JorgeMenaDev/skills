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
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
FAM=$FONT
[ -z "$FONTFILE" ] || FAM=BrandFont
python3 - "$IN" "$LOGO" "$FONTFILE" "$FONT" "$COLOR" "$W" "$H" "$LSIZE" "$LPOS" "$TPOS" "$TEXT" > "$TMP/f.html" <<'PYHTML'
import base64
import hashlib
import html
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote_plus

source, logo, fontfile, font, color, width, height, logo_size, logo_pos, text_pos, text = sys.argv[1:]
if not re.fullmatch(r"[A-Za-z0-9 -]+", font):
    raise SystemExit("finish: font must be a plain font family name")
if not re.fullmatch(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{5})?", color):
    raise SystemExit("finish: color must be a hex color")
if not all(re.fullmatch(r"[1-9][0-9]{0,3}", n) for n in (width, height)):
    raise SystemExit("finish: size must contain positive pixel dimensions up to 9999")
if not re.fullmatch(r"(?:[0-9]+(?:\.[0-9]+)?)", logo_size) or not 0 < float(logo_size) <= 100:
    raise SystemExit("finish: logo size must be a percentage above 0 and at most 100")
positions = {"tl": "top:5%;left:4%", "tr": "top:5%;right:4%", "bl": "bottom:7%;left:4%"}
if logo_pos not in positions or text_pos not in positions:
    raise SystemExit("finish: position must be tl, tr or bl")
uri = lambda path: Path(path).as_uri()
family = "BrandFont" if fontfile else font
font_check = json.dumps('900 100px "' + family + '"')
script = "document.fonts.ready.then(function(){try{var ok=document.fonts.size>0&&document.fonts.check(" + font_check + ");document.body.dataset.fonts=ok?'ok':'fallback';}catch(e){document.body.dataset.fonts='error';}});"
digest = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
csp = "default-src 'none'; img-src file: data:; font-src file: https://fonts.gstatic.com; style-src 'unsafe-inline' https://fonts.googleapis.com; script-src 'sha256-" + digest + "'"
print('<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + html.escape(csp, quote=True) + '">')
if fontfile:
    print("<style>@font-face{font-family:BrandFont;font-weight:800 900;src:url(" + json.dumps(uri(fontfile)) + ")}</style>")
else:
    print('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=' + quote_plus(font) + '&amp;wght@800;900&amp;display=block">')
print('<style>*{margin:0}body{width:' + width + 'px;height:' + height + 'px;overflow:hidden;position:relative;background:url(' + json.dumps(uri(source)) + ') center/cover}')
print('.l{position:absolute;' + positions[logo_pos] + ';height:' + logo_size + '%;filter:drop-shadow(0 4px 18px rgba(0,0,0,.55))}')
print('.t{position:absolute;' + positions[text_pos] + ';max-width:58%;font:900 ' + str(int(height)//7) + 'px/.95 ' + json.dumps(family) + ',sans-serif;letter-spacing:-.01em;color:' + color + ';text-shadow:0 4px 30px rgba(0,0,0,.6)}</style><body>')
print('<script>' + script + '</script>')
if logo:
    print('<img class="l" src="' + html.escape(uri(logo), quote=True) + '">')
if text:
    print('<div class="t">' + html.escape(text) + '</div>')
print('</body>')
PYHTML
if [ -n "$TEXT" ]; then
"$CHROME" --user-data-dir="$TMP/profile" --no-first-run --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=10000 \
  --allow-file-access-from-files --dump-dom "file://$TMP/f.html" 2>/dev/null | grep -q 'data-fonts="ok"' \
  || { echo "finish: font '$FAM' failed to load, refusing silent fallback (pass --font-file)" >&2; exit 1; }
fi
"$CHROME" --user-data-dir="$TMP/profile" --no-first-run --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=6000 \
  --allow-file-access-from-files --window-size="$W,$H" --screenshot="$TMP/f.png" "file://$TMP/f.html" >/dev/null 2>&1
case $OUT in
  *.jpg|*.jpeg) ffmpeg -loglevel error -y -i "$TMP/f.png" -q:v 2 "$OUT";;
  *) cp "$TMP/f.png" "$OUT";;
esac
BYTES=$(wc -c < "$OUT" | tr -d ' ')
echo "$OUT ${W}x${H} ${BYTES} bytes"
[ "$SIZE" = 1280x720 ] && [ "$BYTES" -gt 2000000 ] && echo "WARN: over 2 MB (mobile upload cap)" >&2 || true
