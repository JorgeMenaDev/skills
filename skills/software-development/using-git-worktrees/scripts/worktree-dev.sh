#!/usr/bin/env bash

# worktree-dev.sh — one-command worktree + local runtime for repos that expose
# the Andes repository contract (`setup:worktree` + `qa:local`).
#
#   worktree-dev.sh up <slug> [--surface <s>]... [--repo <path>] [--base <ref>]
#                             [--mode <m>] [--budget 2|3|4]
#   worktree-dev.sh down <slug> [--repo <path>] [--remove]
#   worktree-dev.sh list [--repo <path>]
#
# `up` creates (or reuses) the sibling worktree, copies ignored env files,
# installs, runs `setup:worktree`, starts `qa:local` detached, and prints the
# QA_LOCAL_READY lines. `down` stops the recorded server process after ownership checks and
# optionally retires it. Repos without `qa:local` fall back to
# `dev:<surface>` / `dev`. `--mode` is forwarded to `qa:local` only when
# given (see SKILL.md).

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=worktree-ports.sh
source "$script_dir/worktree-ports.sh"

usage() { sed -n '3,16p' "${BASH_SOURCE[0]}"; exit 2; }

command="${1:-}"; shift || usage
slug=""
repo="$PWD"
base_ref=""
mode=""
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
if [[ "$command" != "list" && ! "$slug" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]]; then
  echo "Invalid worktree slug: use letters, numbers, dots, underscores or hyphens." >&2
  exit 2
fi
worktree="$worktree_root/$slug"
if [[ -L "$worktree_root" || -L "$worktree" ]]; then
  echo "Refusing symlinked worktree path." >&2
  exit 2
fi
run_dir="$worktree/.worktree-dev"
log_file="$run_dir/server.log"
pid_file="$run_dir/server.pid"

has_script() { # has_script <dir> <name>
  [[ -f "$1/package.json" ]] || return 1
  node -e 'const s=require(process.argv[1]+"/package.json").scripts||{};process.exit(s[process.argv[2]]?0:1)' "$1" "$2"
}

# Every process this worktree's runtime started: the recorded server's
# descendants (collected before stopping it, because its children outlive it),
# plus orphans of earlier runs: processes executing this worktree's
# node_modules binaries or its local Convex backend, and node/bun processes
# working inside it (Convex's local action runners start from a temp dir).
# Paths travel through the environment so awk's own arguments never match.
runtime_pids() { # runtime_pids [root-pid]
  local cwd_pids
  cwd_pids="$(lsof -a -d cwd -u "$(id -un)" -Fpn 2>/dev/null | WT="$worktree/" awk '
    /^p/ { p = substr($0, 2) }
    /^n/ { if (index(substr($0, 2) "/", ENVIRON["WT"]) == 1) printf " %s ", p }')"
  ps -Ao pid=,ppid=,args= | WT="$worktree/" ROOT="${1:-}" SELF="$$" \
    CWD_PIDS="$cwd_pids" awk '
    {
      pid = $1; parent[pid] = $2
      $1 = ""; $2 = ""; args[pid] = $0
    }
    END {
      for (p in args) {
        keep = (index(args[p], ENVIRON["WT"]) &&
            args[p] ~ /node_modules\/|\.convex\/local\//) ||
          (index(ENVIRON["CWD_PIDS"], " " p " ") &&
            args[p] ~ /^ *[^ ]*(node|bun) /)
        q = p
        for (hops = 0; !keep && ENVIRON["ROOT"] != "" && q > 1 && hops < 64; hops++) {
          if (q == ENVIRON["ROOT"]) keep = 1
          q = parent[q]
        }
        if (keep && p != ENVIRON["SELF"]) print p
      }
    }'
}

alive_pids() { # alive_pids <pid>...
  local p
  for p in "$@"; do kill -0 "$p" 2>/dev/null && echo "$p"; done
  return 0
}

# Stop the whole runtime and fail loudly if any of it survives.
reap_worktree_processes() {
  local pid="" cwd pids survivors
  if [[ -f "$pid_file" && ! -L "$pid_file" ]]; then
    pid="$(cat "$pid_file")"
    [[ "$pid" =~ ^[1-9][0-9]*$ && "$pid" -gt 1 ]] || {
      echo "Refusing invalid recorded server PID." >&2; return 1
    }
    if kill -0 "$pid" 2>/dev/null; then
      cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
      case "$cwd" in
        "$worktree"|"$worktree"/*) ;;
        *) echo "Recorded PID no longer belongs to this worktree; refusing to stop it." >&2; return 1 ;;
      esac
    else
      pid=""
    fi
  fi

  pids=($(runtime_pids "$pid"))
  (( ${#pids[@]} )) || return 0
  kill -TERM "${pids[@]}" 2>/dev/null || true
  for _ in 1 2 3 4 5; do
    sleep 1
    survivors=($(alive_pids "${pids[@]}"))
    (( ${#survivors[@]} )) || break
  done
  survivors=($(alive_pids "${pids[@]}"))
  (( ${#survivors[@]} )) && kill -KILL "${survivors[@]}" 2>/dev/null || true
  sleep 1
  survivors=($(alive_pids "${pids[@]}") $(runtime_pids))
  if (( ${#survivors[@]} )); then
    echo "RUNTIME_LEFTOVER: still running: ${survivors[*]}" >&2
    return 1
  fi
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
        # `worktree add -b <new> <path> <remote-tracking-start>` can leave the
        # new branch tracking that start point. When <base_ref> is origin/main
        # that points a later `git push` at the default branch: on 2026-09-17 a
        # shipyard worktree in Arketix/acredix came up with upstream=origin/main,
        # where a plain push would have aimed at production. Leave the branch
        # untracked until its first `git push -u`.
        git -C "$worktree" branch --unset-upstream >/dev/null 2>&1 || true
      fi
      echo "WORKTREE_CREATED: $worktree @ $(git -C "$worktree" rev-parse --short HEAD)"
    else
      echo "WORKTREE_REUSED: $worktree @ $(git -C "$worktree" rev-parse --short HEAD)"
    fi

    WORKTREE_FREE_FLOOR_GIB="${WORKTREE_FREE_FLOOR_GIB:-10}" \
      WORKTREE_HYDRATION_FREEZE="${WORKTREE_HYDRATION_FREEZE:-no}" \
      "$script_dir/storage-preflight.sh" "$worktree" "$budget"

    "$script_dir/copy-env-local.sh" "$repo_root" "$worktree"
    derive_worktree_ports "$worktree"
    mkdir -p "$run_dir"

    (cd "$worktree" && bun install --frozen-lockfile)
    if has_script "$worktree" "setup:worktree"; then
      (cd "$worktree" && bun run setup:worktree) 2>&1 | tail -5
    fi

    start_cmd=(bun run qa:local --)
    for s in "${surfaces[@]+"${surfaces[@]}"}"; do start_cmd+=(--surface "$s"); done
    if [[ -n "$mode" ]]; then start_cmd+=(--mode "$mode"); fi
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
    target_common="$(cd "$worktree" && cd "$(git rev-parse --git-common-dir)" && pwd -P)"
    target_git="$(cd "$worktree" && cd "$(git rev-parse --git-dir)" && pwd -P)"
    [[ "$target_common" == "$git_common" && "$target_git" != "$target_common" ]] || {
      echo "Refusing a path that is not a linked worktree of this repository." >&2; exit 2
    }
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
      "$script_dir/dehydrate-worktree.sh" "$worktree" --apply
      git -C "$repo_root" worktree remove --force "$worktree"
      git -C "$repo_root" branch -D "$slug" 2>/dev/null || true
      echo "WORKTREE_REMOVED: $worktree"
    fi
    ;;

  *)
    usage
    ;;
esac
