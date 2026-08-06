#!/usr/bin/env bash

# worktree-dev.sh — one-command worktree + local runtime for repos that expose
# the Andes repository contract (`setup:worktree` + `qa:local`).
#
#   worktree-dev.sh up <slug> [--surface <s>]... [--repo <path>] [--base <ref>]
#                             [--mode human|smoke] [--budget 2|3|4]
#   worktree-dev.sh down <slug> [--repo <path>] [--remove]
#   worktree-dev.sh list [--repo <path>]
#
# `up` creates (or reuses) the sibling worktree, copies ignored env files,
# installs, runs `setup:worktree`, starts `qa:local` detached, and prints the
# QA_LOCAL_READY lines. `down` stops every process living in the worktree and
# optionally retires it. Repos without `qa:local` fall back to
# `dev:<surface>` / `dev`.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

usage() { sed -n '3,15p' "${BASH_SOURCE[0]}"; exit 2; }

command="${1:-}"; shift || usage
slug=""
repo="$PWD"
base_ref=""
mode="human"
budget="4"
remove="no"
surfaces=()

if [[ "$command" != "list" ]]; then
  slug="${1:?usage: worktree-dev.sh $command <slug> [options]}"; shift
fi
while [[ $# -gt 0 ]]; do
  case "$1" in
    --surface) surfaces+=("${2:?--surface needs a value}"); shift 2 ;;
    --repo) repo="${2:?--repo needs a value}"; shift 2 ;;
    --base) base_ref="${2:?--base needs a value}"; shift 2 ;;
    --mode) mode="${2:?--mode needs a value}"; shift 2 ;;
    --budget) budget="${2:?--budget needs a value}"; shift 2 ;;
    --remove) remove="yes"; shift ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

repo_root="$(cd "$repo" && git rev-parse --show-toplevel)"
git_dir="$(cd "$repo_root" && cd "$(git rev-parse --git-dir)" && pwd -P)"
git_common="$(cd "$repo_root" && cd "$(git rev-parse --git-common-dir)" && pwd -P)"
if [[ "$git_dir" != "$git_common" ]]; then
  echo "Run from the primary checkout, not a linked worktree: $repo_root" >&2
  exit 1
fi
worktree_root="$(dirname "$repo_root")/$(basename "$repo_root")-worktrees"
worktree="$worktree_root/$slug"
run_dir="$worktree/.worktree-dev"
log_file="$run_dir/server.log"
pid_file="$run_dir/server.pid"

has_script() { # has_script <dir> <name>
  [[ -f "$1/package.json" ]] || return 1
  node -e 'const s=require(process.argv[1]+"/package.json").scripts||{};process.exit(s[process.argv[2]]?0:1)' "$1" "$2"
}

derive_ports() { # stable per worktree path, aligned with the fleet port contract
  local hash offset
  hash="$(printf '%s' "$worktree" | cksum | awk '{ print $1 }')"
  offset=$((hash % 1400))
  export WORKTREE_ID="$slug"
  export WORKTREE_APP_PORT=$((4100 + offset))
  export WORKTREE_CONVEX_CLOUD_PORT=$((6200 + offset * 2))
  export WORKTREE_CONVEX_SITE_PORT=$((WORKTREE_CONVEX_CLOUD_PORT + 1))
}

reap_worktree_processes() {
  local pids="" pid
  pids="$(lsof +D "$worktree" -t 2>/dev/null | sort -u || true)"
  if [[ -f "$pid_file" ]]; then
    pids="$(printf '%s\n%s' "$pids" "$(cat "$pid_file")" | sort -u)"
  fi
  [[ -z "${pids// /}" ]] && return 0
  for pid in $pids; do kill -TERM "$pid" 2>/dev/null || true; done
  sleep 3
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then kill -KILL "$pid" 2>/dev/null || true; fi
  done
}

case "$command" in
  list)
    git -C "$repo_root" worktree list
    ;;

  up)
    git -C "$repo_root" fetch origin --quiet
    if [[ -z "$base_ref" ]]; then
      base_ref="$(git -C "$repo_root" symbolic-ref --quiet --short refs/remotes/origin/HEAD || echo origin/main)"
    fi
    git -C "$repo_root" rev-parse --verify --quiet "$base_ref^{commit}" >/dev/null

    if [[ ! -d "$worktree" ]]; then
      mkdir -p "$worktree_root"
      if [[ "$slug" == "local-main" ]]; then
        git -C "$repo_root" worktree add --detach "$worktree" "$base_ref"
      else
        git -C "$repo_root" worktree add "$worktree" -b "$slug" "$base_ref"
      fi
      echo "WORKTREE_CREATED: $worktree @ $(git -C "$worktree" rev-parse --short HEAD)"
    else
      echo "WORKTREE_REUSED: $worktree @ $(git -C "$worktree" rev-parse --short HEAD)"
    fi

    WORKTREE_FREE_FLOOR_GIB="${WORKTREE_FREE_FLOOR_GIB:-10}" \
      WORKTREE_HYDRATION_FREEZE="${WORKTREE_HYDRATION_FREEZE:-no}" \
      "$script_dir/storage-preflight.sh" "$worktree" "$budget"

    "$script_dir/copy-env-local.sh" "$repo_root" "$worktree"
    derive_ports
    mkdir -p "$run_dir"

    (cd "$worktree" && bun install --frozen-lockfile)
    if has_script "$worktree" "setup:worktree"; then
      (cd "$worktree" && bun run setup:worktree) 2>&1 | tail -5
    fi

    start_cmd=(bun run qa:local --)
    for s in "${surfaces[@]+"${surfaces[@]}"}"; do start_cmd+=(--surface "$s"); done
    start_cmd+=(--mode "$mode")
    ready_pattern='QA_LOCAL_READY'
    if ! has_script "$worktree" "qa:local"; then
      if [[ ${#surfaces[@]} -gt 0 ]] && has_script "$worktree" "dev:${surfaces[0]}"; then
        start_cmd=(bun run "dev:${surfaces[0]}")
      else
        start_cmd=(bun run dev)
      fi
      ready_pattern='(Ready in|Local:|localhost:|\.localhost)'
    fi

    ( cd "$worktree" && exec nohup "${start_cmd[@]}" >"$log_file" 2>&1 </dev/null ) &
    echo $! >"$pid_file"
    disown
    echo "SERVER_STARTED: pid $(cat "$pid_file"); log $log_file"

    deadline=$((SECONDS + 300))
    while (( SECONDS < deadline )); do
      if ! kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "SERVER_DIED: last log lines:" >&2; tail -20 "$log_file" >&2; exit 1
      fi
      if grep -Eq "$ready_pattern" "$log_file"; then
        sleep 2
        echo "READY:"
        grep -E "$ready_pattern" "$log_file" | head -10
        exit 0
      fi
      sleep 3
    done
    echo "TIMEOUT: server not ready in 300s; last log lines:" >&2
    tail -20 "$log_file" >&2
    exit 1
    ;;

  down)
    if [[ ! -d "$worktree" ]]; then
      echo "No worktree at $worktree" >&2; exit 1
    fi
    reap_worktree_processes
    echo "RUNTIME_STOPPED: $worktree"
    if [[ "$remove" == "yes" ]]; then
      if [[ -n "$(git -C "$worktree" status --porcelain)" ]]; then
        echo "REMOVE_REFUSED: worktree has uncommitted changes" >&2; exit 1
      fi
      if [[ "$slug" != "local-main" ]]; then
        unpushed="$(git -C "$worktree" log --oneline "@{upstream}..HEAD" 2>/dev/null || git -C "$worktree" log --oneline "$(git -C "$repo_root" symbolic-ref --quiet --short refs/remotes/origin/HEAD || echo origin/main)..HEAD")"
        if [[ -n "$unpushed" ]]; then
          echo "REMOVE_REFUSED: unpushed commits on $slug:" >&2
          echo "$unpushed" >&2; exit 1
        fi
      fi
      "$script_dir/dehydrate-worktree.sh" "$worktree" --apply 2>/dev/null || true
      git -C "$repo_root" worktree remove --force "$worktree"
      git -C "$repo_root" branch -D "$slug" 2>/dev/null || true
      echo "WORKTREE_REMOVED: $worktree"
    fi
    ;;

  *)
    usage
    ;;
esac
