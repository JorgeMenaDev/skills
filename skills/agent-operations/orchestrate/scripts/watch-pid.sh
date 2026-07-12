#!/usr/bin/env bash
set -euo pipefail

pid="${1:-}"
interval="${2:-1}"

if [[ ! "$pid" =~ ^[1-9][0-9]*$ ]]; then
  echo "usage: watch-pid.sh <pid> [interval-seconds]" >&2
  exit 2
fi

if ! kill -0 "$pid" 2>/dev/null; then
  echo "PID_EXITED: $pid"
  exit 0
fi

echo "PID_LIVE: $pid"
while kill -0 "$pid" 2>/dev/null; do sleep "$interval"; done
echo "PID_EXITED: $pid"
