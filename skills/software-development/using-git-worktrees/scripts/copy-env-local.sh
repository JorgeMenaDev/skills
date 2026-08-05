#!/usr/bin/env bash

set -euo pipefail

source_root="${1:?usage: copy-env-local.sh <primary-checkout> <worktree>}"
target_root="${2:?usage: copy-env-local.sh <primary-checkout> <worktree>}"

source_root="$(cd "$source_root" && cd "$(git rev-parse --show-toplevel)" && pwd -P)"
target_root="$(cd "$target_root" && cd "$(git rev-parse --show-toplevel)" && pwd -P)"

if [[ "$source_root" == "$target_root" ]]; then
  echo "Source and target must be different checkouts." >&2
  exit 1
fi

source_common="$(cd "$source_root" && cd "$(git rev-parse --git-common-dir)" && pwd -P)"
target_common="$(cd "$target_root" && cd "$(git rev-parse --git-common-dir)" && pwd -P)"

if [[ "$source_common" != "$target_common" ]]; then
  echo "Source and target are not worktrees of the same repository." >&2
  exit 1
fi

copied=0
protected=0
completed=0
created_targets=()
active_temp=""
pending_target=""
rollback_partial_copy() {
  local rc=$?
  trap - EXIT
  set +e
  [[ -n "$active_temp" && -e "$active_temp" ]] && find "$active_temp" -delete
  [[ -n "$pending_target" && -e "$pending_target" ]] && find "$pending_target" -delete
  if [[ "$completed" -eq 0 && "${#created_targets[@]}" -gt 0 ]]; then
    for created_target in "${created_targets[@]}"; do
      [[ -e "$created_target" || -L "$created_target" ]] && find "$created_target" -delete
    done
  fi
  exit "$rc"
}
trap rollback_partial_copy EXIT

ensure_target_parent() {
  local relative_parent="$1" current="$target_root" part resolved
  if [[ "$relative_parent" == "." ]]; then
    printf '%s\n' "$target_root"
    return 0
  fi
  IFS='/' read -r -a parts <<< "$relative_parent"
  for part in "${parts[@]}"; do
    if [[ -z "$part" || "$part" == "." || "$part" == ".." ]]; then
      echo "Unsafe target path component." >&2
      return 1
    fi
    current="$current/$part"
    if [[ -L "$current" ]]; then
      echo "Refusing symlinked target directory: $current" >&2
      return 1
    fi
    if [[ -e "$current" ]]; then
      [[ -d "$current" ]] || {
        echo "Target ancestor is not a directory: $current" >&2
        return 1
      }
    else
      mkdir "$current"
    fi
  done
  resolved="$(cd "$current" && pwd -P)"
  case "$resolved" in
    "$target_root"|"$target_root"/*) printf '%s\n' "$resolved" ;;
    *)
      echo "Target parent escapes the worktree: $resolved" >&2
      return 1
      ;;
  esac
}

while IFS= read -r source_file; do
  relative_path="${source_file#"$source_root"/}"
  git -C "$source_root" check-ignore -q "$relative_path" || continue
  if ! git -C "$target_root" check-ignore -q "$relative_path"; then
    echo "Refusing target path that is not ignored: $relative_path" >&2
    exit 2
  fi

  target_file="$target_root/$relative_path"
  if [[ -e "$target_file" || -L "$target_file" ]]; then
    printf 'Protected existing %s\n' "$relative_path"
    protected=$((protected + 1))
    continue
  fi
  target_parent="$(ensure_target_parent "$(dirname "$relative_path")")"
  temp_file="$(mktemp "$target_parent/.env.local.XXXXXX")"
  active_temp="$temp_file"
  pending_target="$target_file"
  if ! awk '
    /^[[:space:]]*(export[[:space:]]+)?(CONVEX_[A-Za-z0-9_]*|NEXT_PUBLIC_CONVEX_URL|NEXT_PUBLIC_CONVEX_SITE_URL|QA_CONVEX_ADMIN_KEY)[[:space:]]*=/ {
      value = $0
      sub(/^[^=]*=/, "", value)
      if (index(value, "\"") || index(value, sprintf("%c", 39)) || index(value, "`") || index(value, "\\") || index(value, "$(") || index(value, "<(") || index(value, "<<")) exit 7
      next
    }
    { print }
  ' "$source_file" > "$temp_file"; then
    find "$temp_file" -delete
    echo "Refusing quoted or multiline Convex assignment in $relative_path" >&2
    exit 3
  fi
  chmod 600 "$temp_file"
  mv "$temp_file" "$target_file"
  created_targets+=("$target_file")
  active_temp=""
  pending_target=""
  copied=$((copied + 1))
  printf 'Copied %s (Convex targets and keys stripped)\n' "$relative_path"
done < <(
  find "$source_root" \
    \( -type d \( -name .git -o -name .worktrees -o -name .env.profiles -o -name .vercel -o -name .convex -o -name node_modules -o -name .next -o -name dist -o -name build -o -name coverage \) -prune \) \
    -o -type f -name .env.local -print
)

printf 'Copied %s active .env.local file(s); protected %s existing file(s); values were not displayed.\n' "$copied" "$protected"
completed=1
trap - EXIT
