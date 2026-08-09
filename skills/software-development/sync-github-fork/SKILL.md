---
name: sync-github-fork
description: "Keep a formal GitHub fork current with its parent without rewriting published history. Use when adding or checking an upstream remote, measuring fork divergence, syncing upstream changes into a fork's default branch, or refreshing a local checkout after the fork updates."
license: MIT
metadata:
  version: "1.0.0"
  mutating: true
  writes_to: ["git remotes and refs", "fork default branch", "origin GitHub repository"]
  triggers: ["sync fork", "update fork", "add upstream", "fork behind upstream"]
---

# Sync GitHub Fork

## Contract

- Treat the fork's published default branch as durable history: integrate the parent's default branch with a fast-forward or merge, then use a normal push. The push never uses force.
- Confirm GitHub's formal parent relationship before adding or trusting `upstream`.
- Start from the clean primary checkout with local default branch equal to `origin`; preserve every fork-only commit.
- Read the target repository instructions and prove its differentiated behavior before pushing.
- Announce: “I’m using the sync-github-fork skill to integrate verified upstream changes without rewriting the fork.”

## 1. Inspect

Set `SKILL_DIR` to this skill directory, then run:

```bash
"$SKILL_DIR/scripts/inspect-fork.sh" "${REPO:-$PWD}"
```

Branch only on its tokens:

- `GIT_REPO: no`, `GH_METADATA: unavailable`, or `FORMAL_FORK: unknown` → stop with `NEEDS_CONTEXT`.
- `FORMAL_FORK: no` → stop with `NOT_A_FORK`; this workflow has no verified parent.
- `IS_LINKED_WORKTREE: yes` → stop with `PRIMARY_CHECKOUT_REQUIRED` and move to the primary checkout.
- `WORKTREE_STATE: dirty` or `GIT_OPERATION` other than `none` → stop with `WORKSPACE_STATE_BLOCKED`.
- `UPSTREAM_MATCH: no|unknown` → stop with `UPSTREAM_IDENTITY_BLOCKED`. Replacing an unverified remote is the failure this gate prevents.
- If `CURRENT_BRANCH` differs from `ORIGIN_DEFAULT_BRANCH`, switch to the clean local default branch and rerun the inspector.

## 2. Establish and fetch remotes

If `UPSTREAM_REMOTE: missing`, add only the confirmed `PARENT`:

```bash
git remote add upstream "https://github.com/<PARENT>.git"
```

Fetch both authorities, then rerun the inspector:

```bash
git fetch --prune origin
git fetch --prune upstream
"$SKILL_DIR/scripts/inspect-fork.sh" "$REPO"
```

Require `ORIGIN_REF: present`, `UPSTREAM_REF: present`, and `UPSTREAM_MATCH: yes`. If local `main` is only behind `origin`, fast-forward it. Any `LOCAL_ONLY` commit or two-way local/origin divergence is `LOCAL_MAIN_DIVERGED`; stop before integrating upstream.

## 3. Integrate upstream

Capture the published fork tip before integration: `fork_tip_before=$(git rev-parse "origin/<ORIGIN_DEFAULT_BRANCH>")`.

Use the second inspection's divergence:

- `UPSTREAM_ONLY: 0` → `UP_TO_DATE`; keep fork-only commits unchanged.
- `UPSTREAM_ONLY: N`, `FORK_ONLY: 0` → `git merge --ff-only upstream/<UPSTREAM_DEFAULT_BRANCH>`.
- `UPSTREAM_ONLY: N`, `FORK_ONLY: M` → `git merge --no-edit upstream/<UPSTREAM_DEFAULT_BRANCH>`.

Examples: `12/0` fast-forwards; `12/3` creates a merge; `0/3` needs no integration.

If a merge reports conflicts, list every unmerged file. Resolve only when both sides' intent can be preserved without product judgment, then stage exact files and run `git commit --no-edit`. Otherwise run `git merge --abort` and report `CONFLICT_JUDGMENT_BLOCKED`. Guessing through a semantic conflict is the failure this gate prevents.

## 4. Verify and publish

Run the repository's targeted checks for the integrated paths and a live smoke of the fork-only capability. Require a clean tracked tree and prove the original fork tip remains an ancestor with `git merge-base --is-ancestor "$fork_tip_before" HEAD`. Then:

```bash
git push origin "<ORIGIN_DEFAULT_BRANCH>"
```

Use the `using-git-worktrees` skill to refresh an existing detached `local-main` runtime after the push. Keep a running old runtime untouched until its owner is ready to restart it.

## Report

```text
STATUS: SYNCED | UP_TO_DATE | BLOCKED | NEEDS_CONTEXT
FORK: <origin> <- <parent>
DIVERGENCE_BEFORE: upstream-only <n>; fork-only <n>
INTEGRATION: none | fast-forward | merge <sha>
PUSH: <origin branch and result or not-run>
VALIDATION: <commands and evidence>
RUNTIME: unchanged | refreshed | not-present
```
