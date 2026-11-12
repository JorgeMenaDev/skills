#!/usr/bin/env bash
# Render an .excalidraw scene to a static, self-contained SVG for a visual plan.
# Usage: scripts/excalidraw.sh <scene.excalidraw> [out.svg]
# The SVG is drawn for a dark page (Excalidraw's own dark mode) with its fonts embedded, so the
# page shows it with <img src="name.svg">. Keep the .excalidraw next to it: the reader can open
# it at excalidraw.com to edit it. Rendering runs offline in a headless Chromium browser; the
# first run installs the pinned renderer with bun, or with npm when bun is missing.
set -euo pipefail

scene=${1:?usage: excalidraw.sh <scene.excalidraw> [out.svg]}
out=${2:-${scene%.excalidraw}.svg}
[[ -f $scene ]] || { echo "excalidraw.sh: no file $scene" >&2; exit 2; }
source "$(dirname "$0")/lib.sh"
here=$(cd "$(dirname "$0")/excalidraw" && pwd)
chrome=$(find_chrome) || exit 1

# First run on a machine: install the pinned renderer and bundle it for the browser.
if [[ ! -d $here/node_modules/@excalidraw/excalidraw ]]; then
  if command -v bun >/dev/null; then (cd "$here" && bun install --silent)
  elif command -v npm >/dev/null; then (cd "$here" && npm install --silent --no-audit --no-fund)
  else echo "excalidraw.sh: install bun or Node.js (npm) to render drawings" >&2; exit 1
  fi
fi
bundle=$here/node_modules/.cache/visual-plan-excalidraw/render.js
if [[ ! -s $bundle || $here/render-entry.js -nt $bundle || $here/package.json -nt $bundle ]]; then
  if command -v bun >/dev/null; then
    (cd "$here" && bun build ./render-entry.js --target=browser --minify \
      --define 'process.env.NODE_ENV="production"' --outfile "$bundle" >/dev/null)
  else
    (cd "$here" && node_modules/.bin/esbuild ./render-entry.js --bundle --format=esm --minify \
      --log-level=error --define:process.env.NODE_ENV='"production"' --outfile="$bundle")
  fi
fi

tmp=$(mktemp -d)
server=
cleanup() { [[ -z $server ]] || { kill "$server"; wait "$server" || true; } 2>/dev/null; rm -rf "$tmp"; }
trap cleanup EXIT

# The page serves the bundle and Excalidraw's own font files, so nothing loads from the internet.
ln -s "$bundle" "$tmp/render.js"
ln -s "$here/node_modules/@excalidraw/excalidraw/dist/prod/fonts" "$tmp/fonts"
python3 -I - "$scene" "$tmp/index.html" <<'PY'
import json, sys
scene = json.load(open(sys.argv[1], encoding="utf-8"))
data = json.dumps(scene).replace("</", "<\\/")
open(sys.argv[2], "w", encoding="utf-8").write(
    "<!doctype html><meta charset=utf-8><title>WAIT</title><body>"
    "<script>window.EXCALIDRAW_ASSET_PATH = location.origin + '/';"
    f"window.__SCENE__ = {data};</script>"
    "<script type=module src=render.js></script>")
PY
serve "$tmp"

with_timeout 60 "$chrome" --headless=new --disable-gpu --user-data-dir="$tmp/profile" \
  --virtual-time-budget=20000 --dump-dom "http://127.0.0.1:$port/" >"$tmp/dom.html" 2>/dev/null || true
python3 -I - "$tmp/dom.html" "$out" <<'PY'
import re, sys
dom = open(sys.argv[1], encoding="utf-8").read()
if "<title>DONE</title>" not in dom:
    error = re.search(r"ERROR[^<]*", dom)
    sys.exit("excalidraw.sh: render failed: " + (error.group(0) if error else "no result in time"))
svg = re.search(r"<svg.*</svg>", dom, re.S).group(0)
if "@font-face" not in svg:
    sys.exit("excalidraw.sh: the SVG has no embedded font; text would fall back to a system font")
open(sys.argv[2], "w", encoding="utf-8").write(svg)
print(sys.argv[2])
PY
