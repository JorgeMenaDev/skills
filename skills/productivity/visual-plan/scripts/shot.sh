#!/usr/bin/env bash
# Screenshot a plan at phone width (375) and desktop width (1200) with a headless Chromium browser.
# Usage: scripts/shot.sh <plan-dir|url> <out-prefix>
# Writes <out-prefix>-phone.png and <out-prefix>-desktop.png. Read both before handing the page over.
set -euo pipefail

target=${1:?usage: shot.sh <plan-dir|url> <out-prefix>}
out=${2:?usage: shot.sh <plan-dir|url> <out-prefix>}
source "$(dirname "$0")/lib.sh"
chrome=$(find_chrome) || exit 1
tmp=$(mktemp -d)
server=

cleanup() { [[ -z $server ]] || { kill "$server"; wait "$server" || true; } 2>/dev/null; rm -rf "$tmp"; }
trap cleanup EXIT

# One local server hosts the phone frame and, for a folder, the plan itself.
if [[ -d $target ]]; then
  ln -s "$(cd "$target" && pwd)" "$tmp/a"
fi
serve "$tmp"
url=$([[ -d $target ]] && echo "http://127.0.0.1:$port/a/" || echo "$target")

# Headless Chrome will not lay out narrower than about 500px, so the phone view renders inside a 375px iframe.
printf '<body style="margin:0;background:#1f1e1d"><iframe src="%s" style="width:375px;height:4000px;border:0"></iframe>' "$url" >"$tmp/phone.html"
for view in phone desktop; do
  page=$([[ $view == phone ]] && echo "http://127.0.0.1:$port/phone.html" || echo "$url")
  size=$([[ $view == phone ]] && echo 375,4000 || echo 1200,3000)
  rm -f "$out-$view.png"
  # Chrome writes the file but can linger on pages with video, so a timeout with a file is a success.
  with_timeout 25 "$chrome" --headless=new --disable-gpu --hide-scrollbars \
    --user-data-dir="$tmp/profile-$view" --window-size="$size" --blink-settings=preferredColorScheme=0 \
    --screenshot="$out-$view.png" "$page" >/dev/null 2>&1 || true
  [[ -s $out-$view.png ]] || { echo "shot.sh: no screenshot for $view" >&2; exit 1; }
  echo "$out-$view.png"
done
