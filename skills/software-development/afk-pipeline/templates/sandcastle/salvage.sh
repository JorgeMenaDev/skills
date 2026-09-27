#!/usr/bin/env bash
# Run the workflow-pinned copy saved outside the agent workspace before dispatch.
# The workspace and its Git configuration are untrusted after an agent phase.
set -euo pipefail
umask 077
mode="${1:-salvage}"
case "$mode" in salvage|--push-only) ;; *) echo "usage: salvage.sh [--push-only]" >&2; exit 2 ;; esac

: "${BRANCH:?BRANCH is required}"
: "${GH_REPO:?GH_REPO is required}"
[[ "$GH_REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || { echo "Invalid GH_REPO" >&2; exit 1; }
worktree="$PWD"
git_bin=$(command -v git)
scratch=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/afk-salvage-git.XXXXXX")
trap 'rm -rf "$scratch"' EXIT
mkdir "$scratch/hooks"

# No credentials, host config, filters or hooks reach object inspection/commit.
clean_git() {
  env -i PATH="$PATH" HOME="$scratch" GIT_CONFIG_NOSYSTEM=1 \
    GIT_CONFIG_GLOBAL=/dev/null GIT_NO_REPLACE_OBJECTS=1 \
    "$git_bin" -c core.hooksPath="$scratch/hooks" -c core.fsmonitor=false "$@"
}
clean_git check-ref-format "refs/heads/$BRANCH"
head=$(clean_git -C "$worktree" rev-parse --verify HEAD) || { echo "no HEAD — nothing to salvage"; exit 0; }
base=$(clean_git -C "$worktree" rev-parse --verify "origin/{{BASE_BRANCH}}")
objects=$(clean_git -C "$worktree" rev-parse --path-format=absolute --git-path objects)
clean_git init --bare -q "$scratch/git"
printf '%s\n' "$objects" > "$scratch/git/objects/info/alternates"

git_work() {
  clean_git --git-dir="$scratch/git" --work-tree="$worktree" "$@"
}
git_work update-ref HEAD "$head"
git_work read-tree "$head"
if [ "$mode" = salvage ] && [ -n "$(git_work status --porcelain)" ]; then
  git_work add -A
  git_work -c user.name="afk-pipeline salvage" -c user.email="salvage@sandcastle.invalid" \
    -c commit.gpgSign=false commit --no-verify \
    -m "wip(salvage): uncommitted state at run failure (run ${GITHUB_RUN_ID:-unknown})"
fi
head=$(git_work rev-parse HEAD)
if [ "$mode" = salvage ] && [ "$head" = "$base" ]; then
  echo "no commits beyond {{BASE_BRANCH}} — nothing to salvage"
  exit 0
fi
: "${AGENT_PAT:?AGENT_PAT is required for salvage push}"
auth=$(printf 'x-access-token:%s' "$AGENT_PAT" | base64 | tr -d '\n')
# Explicit remote, isolated config and push-only auth. Never trust origin or hooks
# from the agent checkout, and never put the credential in process arguments.
env -i PATH="$PATH" HOME="$scratch" GIT_CONFIG_NOSYSTEM=1 \
  GIT_CONFIG_GLOBAL=/dev/null GIT_NO_REPLACE_OBJECTS=1 \
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.https://github.com/.extraheader \
  GIT_CONFIG_VALUE_0="AUTHORIZATION: basic $auth" \
  "$git_bin" --git-dir="$scratch/git" -c core.hooksPath="$scratch/hooks" \
  push --force "https://github.com/${GH_REPO}.git" "HEAD:refs/heads/${BRANCH}"
if [ "$mode" = salvage ] && [ -n "${GITHUB_OUTPUT:-}" ]; then
  printf 'salvaged=true\nsalvage_sha=%s\n' "$head" >> "$GITHUB_OUTPUT"
fi
echo "Pushed $(git_work rev-list --count "$base..$head") commit(s) to $BRANCH (sha $head)"
