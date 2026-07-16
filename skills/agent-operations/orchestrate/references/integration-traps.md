# Integration traps

Read before any multi-branch integration or worktree dispatch. Every entry is a scar from a real run; none is hypothetical.

## Merging and branches

- Squash merges replace commits: never base a dependent branch on pre-squash SHAs — wait for the post-squash integration SHA and rebase onto it. Record each PR's merge strategy up front.
- `Closes #N` fires only on merge to the **default** branch. A PR into an integration branch does not close its issue — close it explicitly after its real merge bar, or let the final PR to default do it.
- Rebase each same-wave peer after its required predecessors merge, and invalidate any acceptance evidence the new base affects.
- `gh pr merge --delete-branch` cannot delete a local branch attached to a worktree; remove worktrees before local branch deletion.

## Generated code and formatting

- A generate-then-diff gate is valid only when the generator actually reached its write phase and its **unpiped** exit code passed; a stale `_generated` tree diffs clean and lies.
- Format and generate only paths the slice owns; unexpected formatter or generated churn blocks acceptance.
- After an integration merge, rerun generators, verify the expected generated modules exist, and prove the tree clean after reverting mechanical formatting drift.

## Shared surfaces

- When parallel slices touch a shared helper/schema/API, after the first merge inspect the old call patterns in every unmerged branch — optional parameters let semantic regressions compile.
- Build the collision map (schema, generated APIs, auth/context helpers, route registries, migrations) before dispatch, not during integration.

## Worktrees and environments

- Before accepting an "environment-only" failure, fingerprint the worktree's dependency layout (package manager, lockfile, resolved versions) against the primary checkout — worktree isolation without dependency fidelity is incomplete.
- If a shared-worktree environment reports `EPERM` on `.git/index.lock`, use a full clone for that slice and record the clone path in the brief; retrying the shared Git directory does not restore isolation.

## Evidence

- Modified pre-existing test assertions are suspect until proven equal or stronger.
- Network, credential, or display constraints are blockers or evidence limitations — never permission to weaken an oracle.
- Check image evidence is readable, non-empty, and shows the required UI state **before** the browser session is torn down; a black or cropped capture is a renderer failure to recapture, not proof.
- Store no credential value in plans, briefs, reports, commits, or knowledge bases; raw browser captures are internal by default — inspect for secrets and PII before persisting.
