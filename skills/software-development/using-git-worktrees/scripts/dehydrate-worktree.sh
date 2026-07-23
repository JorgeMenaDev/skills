#!/usr/bin/env bash

set -euo pipefail

worktree="${1:?usage: dehydrate-worktree.sh <worktree> [--apply]}"
mode="${2:-preview}"

if [[ "$mode" != "preview" && "$mode" != "--apply" ]]; then
  echo "Second argument must be --apply when mutation is intended." >&2
  exit 2
fi

worktree="$(cd "$worktree" && git rev-parse --show-toplevel)"
git_dir="$(cd "$worktree" && cd "$(git rev-parse --git-dir)" && pwd -P)"
git_common="$(cd "$worktree" && cd "$(git rev-parse --git-common-dir)" && pwd -P)"
free_before_kb="$(df -Pk "$worktree" | awk 'NR == 2 { print $4 }')"

if [[ "$git_dir" == "$git_common" ]]; then
  echo "Refusing to dehydrate a primary checkout." >&2
  exit 3
fi

if ! command -v lsof >/dev/null 2>&1; then
  echo "ACTIVE_PROCESSES: unknown" >&2
  echo "lsof is required for the process-ownership gate." >&2
  exit 4
fi
mount_table="$(mount)" || {
  echo "Mount-table inspection failed." >&2
  exit 6
}
[[ -n "$mount_table" ]] || {
  echo "Mount-table inspection returned no data." >&2
  exit 6
}

observed_pids="$(
  cd /
  lsof -a -d cwd -F pn 2>/dev/null | awk -v root="$worktree" '
    /^p/ { pid = substr($0, 2); next }
    /^n/ {
      path = substr($0, 2)
      if (path == root || index(path, root "/") == 1) print pid
    }
  ' | sort -u
)"

exempt_pids=" $$ "
ancestor_pid="$PPID"
while [[ "$ancestor_pid" =~ ^[0-9]+$ && "$ancestor_pid" -gt 1 ]]; do
  exempt_pids+="$ancestor_pid "
  ancestor_pid="$(ps -o ppid= -p "$ancestor_pid" 2>/dev/null | tr -d '[:space:]')"
done

active_pids=""
while IFS= read -r observed_pid; do
  [[ -n "$observed_pid" ]] || continue
  [[ " $exempt_pids" == *" $observed_pid "* ]] && continue
  active_pids+="${active_pids:+$'\n'}$observed_pid"
done <<< "$observed_pids"

if [[ -n "$active_pids" ]]; then
  printf 'ACTIVE_PROCESSES: %s\n' "$(printf '%s\n' "$active_pids" | paste -sd, -)" >&2
  exit 5
fi
printf 'ACTIVE_PROCESSES: 0\n'

candidates=()
protected=0
has_mount_boundary() {
  local candidate="$1" parent candidate_device parent_device mount_line mount_path
  parent="$(dirname "$candidate")"
  if candidate_device="$(stat -f '%d' "$candidate" 2>/dev/null)" &&
    parent_device="$(stat -f '%d' "$parent" 2>/dev/null)"; then
    [[ "$candidate_device" != "$parent_device" ]] && return 0
  elif candidate_device="$(stat -c '%d' "$candidate" 2>/dev/null)" &&
    parent_device="$(stat -c '%d' "$parent" 2>/dev/null)"; then
    [[ "$candidate_device" != "$parent_device" ]] && return 0
  fi
  while IFS= read -r mount_line; do
    mount_path="${mount_line#* on }"
    mount_path="${mount_path%% type *}"
    mount_path="${mount_path%% (*}"
    if [[ "$mount_path" == "$candidate" || "$mount_path" == "$candidate/"* ||
      ( "$candidate" == "$mount_path/"* &&
        ( "$mount_path" == "$worktree" || "$mount_path" == "$worktree/"* ) ) ]]; then
      return 0
    fi
  done <<< "$mount_table"
  return 1
}

artifact_is_safe() {
  local candidate="$1" relative
  relative="${candidate#"$worktree"/}"
  if [[ -n "$(git -C "$worktree" ls-files -- "$relative")" ]]; then
    printf 'PROTECTED_ARTIFACT: tracked-content %s\n' "$candidate"
    protected=$((protected + 1))
    return 1
  fi
  if ! git -C "$worktree" check-ignore -q -- "$relative"; then
    printf 'PROTECTED_ARTIFACT: not-ignored %s\n' "$candidate"
    protected=$((protected + 1))
    return 1
  fi
  if has_mount_boundary "$candidate"; then
    printf 'PROTECTED_ARTIFACT: mount-boundary %s\n' "$candidate"
    protected=$((protected + 1))
    return 1
  fi
  return 0
}

while IFS= read -r -d '' candidate; do
  artifact_is_safe "$candidate" || continue
  candidates+=("$candidate")
done < <(
  find "$worktree" -type d -name .convex -prune -o \
    -type d \( -name node_modules -o -name .next -o -name .turbo \) -prune -print0
)

convex_synthetic=0
convex_durable=0
while IFS= read -r -d '' convex_local; do
  convex_kind="durable"
  marker="$(dirname "$convex_local")/state-kind"
  if [[ -f "$marker" ]] && {
    cmp -s "$marker" <(printf 'synthetic\n') || cmp -s "$marker" <(printf 'synthetic')
  }; then
    convex_kind="synthetic"
  fi
  if [[ "$convex_kind" == "synthetic" ]] && artifact_is_safe "$convex_local"; then
    candidates+=("$convex_local")
    convex_synthetic=$((convex_synthetic + 1))
  else
    convex_durable=$((convex_durable + 1))
  fi
done < <(
  find "$worktree" -type d \
    \( -name node_modules -o -name .next -o -name .turbo \) -prune -o \
    -type d -path '*/.convex/local' -prune -print0
)

printf 'CONVEX_STATE: synthetic=%s durable=%s\n' "$convex_synthetic" "$convex_durable"
printf 'MODE: %s\n' "$([[ "$mode" == "--apply" ]] && echo apply || echo preview)"
printf 'CANDIDATES: %s\n' "${#candidates[@]}"
printf 'PROTECTED: %s\n' "$protected"

if (( ${#candidates[@]} > 0 )); then
  for candidate in "${candidates[@]}"; do
    size_kb="$(du -sk "$candidate" 2>/dev/null | awk '{ print $1 + 0 }')"
    printf 'ARTIFACT: %sKB %s\n' "$size_kb" "$candidate"
    if [[ "$mode" == "--apply" ]]; then
      find "$candidate" -xdev -depth -delete
    fi
  done
fi

free_after_kb="$(df -Pk "$worktree" | awk 'NR == 2 { print $4 }')"
awk -v before="$free_before_kb" -v after="$free_after_kb" '
  BEGIN {
    printf "FREE_BEFORE_GIB: %.1f\n", before / 1024 / 1024
    printf "FREE_AFTER_GIB: %.1f\n", after / 1024 / 1024
    printf "PHYSICAL_RECOVERY_GIB: %.1f\n", (after - before) / 1024 / 1024
  }
'
