#!/usr/bin/env bash

# worktree-ports.sh — sourced by worktree-dev.sh and copy-env-local.sh so both
# give a worktree the same identity and port set, stable per worktree path and
# aligned with the fleet port contract.

reserved_worktree_ports=" 3214 3215 8081 " # Andy iOS dev loop: never derive these

derive_worktree_ports() { # derive_worktree_ports <worktree-path>
  local hash offset
  hash="$(printf '%s' "$1" | cksum | awk '{ print $1 }')"
  offset=$((hash % 1400))
  while :; do
    WORKTREE_APP_PORT=$((4100 + offset))
    WORKTREE_CONVEX_CLOUD_PORT=$((6200 + offset * 2))
    WORKTREE_CONVEX_SITE_PORT=$((WORKTREE_CONVEX_CLOUD_PORT + 1))
    case "$reserved_worktree_ports" in
      *" $WORKTREE_APP_PORT "*|*" $WORKTREE_CONVEX_CLOUD_PORT "*|*" $WORKTREE_CONVEX_SITE_PORT "*)
        offset=$(((offset + 1) % 1400)) ;;
      *) break ;;
    esac
  done
  WORKTREE_ID="$(basename "$1")"
}
