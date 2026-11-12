#!/usr/bin/env bash
# Create a plan folder with the page template and its fonts, and print its path.
# Usage: scripts/new.sh <slug>
# The folder is $VISUAL_PLAN_DIR/<yyyy-mm-dd>-<slug>/ (default ~/visual-plans).
set -euo pipefail

slug=${1:?usage: new.sh <slug>}
[[ $slug =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "new.sh: slug must be lowercase words joined by dashes" >&2; exit 2; }
templates=$(cd "$(dirname "$0")/../templates" && pwd)
root=${VISUAL_PLAN_DIR:-$HOME/visual-plans}

dir="$root/$(date +%F)-$slug"
[[ ! -e $dir ]] || { echo "new.sh: $dir already exists; edit it or pick another slug" >&2; exit 2; }
mkdir -p "$dir"
cp "$templates/page.html" "$dir/index.html"
# The page loads Inter and Excalifont from its own folder, so every plan carries its fonts and their licences.
cp -R "$templates/fonts" "$dir/fonts"
echo "$dir"
