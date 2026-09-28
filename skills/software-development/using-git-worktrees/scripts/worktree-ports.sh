# worktree-ports.sh — source only. worktree-dev.sh and copy-env-local.sh both
# call derive_worktree_ports, so a worktree gets one identity and port set,
# stable per worktree path and aligned with the fleet port contract.

derive_worktree_ports() { # derive_worktree_ports <worktree-path>; exports WORKTREE_*
  local worktree_path hash offset
  worktree_path="$(cd "$1" && pwd -P)"
  hash="$(printf '%s' "$worktree_path" | cksum | awk '{ print $1 }')"
  offset=$((hash % 1400))
  # Offset 940 would put the Convex site port on 8081, the Andy iOS Metro port.
  [[ "$offset" -eq 940 ]] && offset=941
  export WORKTREE_ID="${worktree_path##*/}"
  export WORKTREE_APP_PORT=$((4100 + offset))
  export WORKTREE_CONVEX_CLOUD_PORT=$((6200 + offset * 2))
  export WORKTREE_CONVEX_SITE_PORT=$((WORKTREE_CONVEX_CLOUD_PORT + 1))
}
