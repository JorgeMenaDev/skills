# Shared helpers for shot.sh and excalidraw.sh (sourced, not run).
# They need bash, python3 and curl, and a Chromium browser: Chrome, Chromium, Edge or Brave.

# Print the path of a Chromium browser: $CHROME first, then the usual macOS apps, then PATH.
find_chrome() {
  local c
  for c in "${CHROME:-}" \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"; do
    [[ -n $c && -x $c ]] && { echo "$c"; return; }
  done
  for c in google-chrome google-chrome-stable chromium chromium-browser; do
    command -v "$c" && return
  done
  echo "$(basename "$0"): no Chromium browser found. Install Chrome or Chromium, or set CHROME to its executable" >&2
  return 1
}

# Run a command, killing it after <seconds>. perl's alarm works the same on macOS and Linux.
with_timeout() {
  local seconds=$1
  shift
  perl -e 'alarm shift; exec @ARGV or die "exec: $!"' "$seconds" "$@"
}

# Serve <dir> on a free 127.0.0.1 port in the background. Sets $port and $server (the PID).
serve() {
  port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
  python3 -m http.server "$port" --bind 127.0.0.1 --directory "$1" >/dev/null 2>&1 &
  server=$!
  for _ in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null "http://127.0.0.1:$port/" && return; sleep 0.3; done
}
