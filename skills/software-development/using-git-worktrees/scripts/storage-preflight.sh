#!/usr/bin/env bash

set -euo pipefail

worktree="${1:?usage: storage-preflight.sh <worktree> [budget-gib]}"
budget_gib="${2:-4}"
floor_gib="${WORKTREE_FREE_FLOOR_GIB:-}"

case "$budget_gib" in
  2|3|4) ;;
  *)
    echo "Budget must be 2, 3, or 4 GiB." >&2
    exit 2
    ;;
esac

if [[ ! "$floor_gib" =~ ^[1-9][0-9]*$ ]]; then
  printf 'HYDRATE_ALLOWED: no\nREASON: machine-floor-unset\n' >&2
  exit 3
fi

worktree="$(cd "$worktree" && git rev-parse --show-toplevel)"
free_kb="$(df -Pk "$worktree" | awk 'NR == 2 { print $4 }')"
budget_kb=$((budget_gib * 1024 * 1024))
floor_kb=$((floor_gib * 1024 * 1024))
projected_kb=$((free_kb - budget_kb))

awk -v free="$free_kb" -v budget="$budget_gib" -v floor="$floor_gib" -v projected="$projected_kb" '
  BEGIN {
    printf "FREE_GIB: %.1f\n", free / 1024 / 1024
    printf "HYDRATION_BUDGET_GIB: %s\n", budget
    printf "FREE_FLOOR_GIB: %s\n", floor
    printf "PROJECTED_FREE_GIB: %.1f\n", projected / 1024 / 1024
  }
'

if (( projected_kb < floor_kb )); then
  printf 'HYDRATE_ALLOWED: no\nREASON: projected-free-below-floor\n'
  exit 4
fi

printf 'HYDRATE_ALLOWED: yes\nREASON: budget-preserves-floor\n'
