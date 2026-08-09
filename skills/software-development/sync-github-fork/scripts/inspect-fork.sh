#!/usr/bin/env bash
set -euo pipefail

repo="${1:-.}"
origin="${2:-origin}"
upstream="${3:-upstream}"

if ! root=$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null); then
  echo "GIT_REPO: no"
  exit 2
fi

github_slug() {
  local url="${1:-}"
  case "$url" in
    https://github.com/*|http://github.com/*)
      url="${url#*github.com/}"
      ;;
    git@github.com:*)
      url="${url#git@github.com:}"
      ;;
    ssh://git@github.com/*)
      url="${url#ssh://git@github.com/}"
      ;;
    *)
      echo unknown
      return
      ;;
  esac
  echo "${url%.git}"
}

git_dir=$(git -C "$root" rev-parse --absolute-git-dir)
git_common=$(git -C "$root" rev-parse --path-format=absolute --git-common-dir)
branch=$(git -C "$root" branch --show-current)
[ -n "$branch" ] || branch=detached
[ -z "$(git -C "$root" status --porcelain=v1)" ] && worktree_state=clean || worktree_state=dirty
[ "$git_dir" = "$git_common" ] && linked=no || linked=yes

operation=none
if git -C "$root" rev-parse -q --verify MERGE_HEAD >/dev/null; then operation=merge
elif [ -d "$git_dir/rebase-merge" ] || [ -d "$git_dir/rebase-apply" ]; then operation=rebase
elif git -C "$root" rev-parse -q --verify CHERRY_PICK_HEAD >/dev/null; then operation=cherry-pick
elif git -C "$root" rev-parse -q --verify REVERT_HEAD >/dev/null; then operation=revert
fi

origin_url=$(git -C "$root" remote get-url "$origin" 2>/dev/null || true)
origin_slug=$(github_slug "$origin_url")
upstream_url=$(git -C "$root" remote get-url "$upstream" 2>/dev/null || true)
upstream_slug=$(github_slug "$upstream_url")
[ -n "$origin_url" ] && origin_remote=present || origin_remote=missing
[ -n "$upstream_url" ] && upstream_remote=present || upstream_remote=missing

gh_metadata=unavailable
formal_fork=unknown
parent=unknown
origin_default=unknown
upstream_default=unknown
if command -v gh >/dev/null 2>&1 && [ "$origin_slug" != unknown ]; then
  metadata=$(gh repo view "$origin_slug" --json isFork,parent,defaultBranchRef \
    --jq '[.isFork, (.parent.owner.login // ""), (.parent.name // ""), (.defaultBranchRef.name // "")] | join("|")' 2>/dev/null || true)
  if [ -n "$metadata" ]; then
    IFS='|' read -r formal_fork parent_owner parent_name origin_default <<<"$metadata"
    gh_metadata=confirmed
    if [ "$formal_fork" = true ]; then
      parent="$parent_owner/$parent_name"
      upstream_default=$(gh repo view "$parent" --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo unknown)
    fi
  fi
fi

if [ "$upstream_remote" = missing ]; then upstream_match=missing
elif [ "$parent" = unknown ] || [ "$upstream_slug" = unknown ]; then upstream_match=unknown
elif [ "$parent" = "$upstream_slug" ]; then upstream_match=yes
else upstream_match=no
fi

origin_ref=missing
upstream_ref=missing
upstream_only=unknown
fork_only=unknown
local_only=unknown
origin_only=unknown
if [ "$origin_default" != unknown ] && git -C "$root" show-ref --verify --quiet "refs/remotes/$origin/$origin_default"; then
  origin_ref=present
  read -r local_only origin_only < <(git -C "$root" rev-list --left-right --count "HEAD...$origin/$origin_default")
fi
if [ "$upstream_default" != unknown ] && git -C "$root" show-ref --verify --quiet "refs/remotes/$upstream/$upstream_default"; then
  upstream_ref=present
fi
if [ "$origin_ref" = present ] && [ "$upstream_ref" = present ]; then
  read -r upstream_only fork_only < <(git -C "$root" rev-list --left-right --count "$upstream/$upstream_default...$origin/$origin_default")
fi

printf 'GIT_REPO: yes\nREPO_ROOT: %s\nIS_LINKED_WORKTREE: %s\nCURRENT_BRANCH: %s\nWORKTREE_STATE: %s\nGIT_OPERATION: %s\n' \
  "$root" "$linked" "$branch" "$worktree_state" "$operation"
printf 'ORIGIN_REMOTE: %s\nORIGIN: %s\nGH_METADATA: %s\nFORMAL_FORK: %s\nPARENT: %s\n' \
  "$origin_remote" "$origin_slug" "$gh_metadata" "$formal_fork" "$parent"
printf 'UPSTREAM_REMOTE: %s\nUPSTREAM: %s\nUPSTREAM_MATCH: %s\n' \
  "$upstream_remote" "$upstream_slug" "$upstream_match"
printf 'ORIGIN_DEFAULT_BRANCH: %s\nUPSTREAM_DEFAULT_BRANCH: %s\nORIGIN_REF: %s\nUPSTREAM_REF: %s\n' \
  "$origin_default" "$upstream_default" "$origin_ref" "$upstream_ref"
printf 'LOCAL_ONLY: %s\nORIGIN_ONLY: %s\nUPSTREAM_ONLY: %s\nFORK_ONLY: %s\n' \
  "$local_only" "$origin_only" "$upstream_only" "$fork_only"
