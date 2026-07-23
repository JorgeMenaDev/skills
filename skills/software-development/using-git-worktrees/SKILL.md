---
name: using-git-worktrees
description: Use when creating an isolated Git workspace, running the default branch locally, or closing development work that used a worktree.
version: 2.0.0
mutating: true
writes_to: ["<repo-name>-worktrees/", "**/.env.local", "**/.convex/state-kind", "regenerable worktree artifacts"]
---

# Using Git Worktrees

## Contract

Research and review share an existing checkout and install nothing. Tracked implementation gets one source-only branch at sibling `<repo-name>-worktrees/<branch-slug>`. A no-edit local run reuses detached `<repo-name>-worktrees/local-main`. Hydration requires a 2–4 GiB storage budget and the declared machine floor. Every runtime owns its ports and local state, then stops and dehydrates when the task finishes. Only explicitly synthetic Convex state is disposable.

Announce: “I’m using the using-git-worktrees skill to prepare the task workspace and lifecycle.”

## 1. Inspect

Run this preamble and branch only on its tokens:

```bash
repo_root=$(git rev-parse --show-toplevel)
git_dir=$(cd "$(git rev-parse --git-dir)" && pwd -P)
git_common=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
superproject=$(git rev-parse --show-superproject-working-tree 2>/dev/null || true)
printf 'REPO_ROOT: %s\nIS_LINKED: %s\nIS_SUBMODULE: %s\nBRANCH: %s\n' \
  "$repo_root" "$([ "$git_dir" != "$git_common" ] && echo yes || echo no)" \
  "$([ -n "$superproject" ] && echo yes || echo no)" "$(git branch --show-current)"
```

Read the root instructions and package scripts. Choose exactly one mode:

- `READ_ONLY`: research/review with no tracked edit or live runtime. Stay in the existing checkout, install nothing, report `SOURCE_ONLY`, and stop this skill.
- `FEATURE`: tracked implementation. Use the explicit base or current `origin/main`.
- `LAUNCH_MAIN`: no-edit local QA/preview. Reuse the one `local-main` worktree.

Treating review as implementation or creating a second local runtime is `WORKSPACE_SPRAWL`. For mutating modes, resolve and verify `base_ref` now: use the explicit base, otherwise `git symbolic-ref --quiet --short refs/remotes/origin/HEAD`.

Branch on the inspection tokens before creating anything:

- `IS_SUBMODULE: yes`: `READ_ONLY` may continue; mutating modes stop with `SUBMODULE_WORKTREE_BLOCKED` and restart from a standalone checkout or the superproject owner.
- `IS_LINKED: yes`, `FEATURE`: reuse only when the current branch is the requested branch (or this task explicitly owns it) and `base_ref` is an ancestor of `HEAD`; otherwise stop with `WORKSPACE_CONTEXT_BLOCKED`.
- `IS_LINKED: yes`, `LAUNCH_MAIN`: require basename `local-main`, clean status, and zero commits beyond `base_ref`; stop its owned runtime, detach at `base_ref`, then continue. Any failure is `WORKSPACE_CONTEXT_BLOCKED`.
- Only a non-linked, non-submodule primary checkout continues to source preparation.

## 2. Prepare source

For `FEATURE` or `LAUNCH_MAIN` from the primary checkout:

```bash
git fetch origin
git rev-parse --verify "$base_ref^{commit}"
worktree_root="$(dirname "$repo_root")/$(basename "$repo_root")-worktrees"
mkdir -p "$worktree_root"
```

Create `FEATURE` with `git worktree add "$worktree_root/$slug" -b "$branch" "$base_ref"`. Create absent `LAUNCH_MAIN` with `git worktree add --detach "$worktree_root/local-main" "$base_ref"`. Reuse `local-main` only when registered to this repository, clean, and carrying zero commits beyond `$base_ref`; stop its owned runtime, then detach it at current `$base_ref`.

The new tree remains source-only. Preserve a dirty primary checkout: never stash, clean, reset, rebase, or copy tracked files from it.

## 3. Decide hydration

Skip hydration when source inspection or editing is sufficient. When dependencies or a runtime are required, resolve helpers against this `SKILL.md`, then run:

```bash
WORKTREE_FREE_FLOOR_GIB=<declared-machine-floor> \
  <skill-dir>/scripts/storage-preflight.sh <worktree> 4
```

Use 4 GiB unless repository evidence supports 2 or 3. Continue only on `HYDRATE_ALLOWED: yes`. A missing floor or projected free space below it is `STORAGE_PREFLIGHT_BLOCKED`; reuse an already-hydrated safe workspace or report the blocker. Hydrating anyway is the failure this gate prevents.

For Bun or Convex, read [BUN_CONVEX.md](BUN_CONVEX.md) in full. Otherwise use repository-declared setup. Do not add test files unless requested; use existing checks and live smoke.

## 4. Prove readiness

Verify branch/path, ignored environment presence without values, unchanged lockfile, unique owned listeners, requested URLs, non-production targets, worktree-local state, and clean tracked status. On failure, report `BLOCKED` with the exact command and error.

## 5. Close the lifecycle

When runtime work ends, read [LIFECYCLE.md](LIFECYCLE.md) in full. Stop owned processes, classify Convex state, dehydrate regenerable artifacts, and review retirement eligibility. Leaving an abandoned runtime hydrated is `LIFECYCLE_LEAK`.

## Report

```text
SOURCE_ONLY | READY | BLOCKED | RETIRED
Mode: READ_ONLY | FEATURE | LAUNCH_MAIN
Worktree: <existing checkout or absolute worktree>
Storage: free <GiB>; budget <GiB>; floor <GiB>; hydration <yes/no/not-needed>
Runtime: <stopped or URLs plus owned ports>
State: Convex <none/synthetic/durable/unknown>; artifacts <preserved/removed>
Retirement: <not-applicable/retained/eligible/removed>
Validation: <commands and result>
```
