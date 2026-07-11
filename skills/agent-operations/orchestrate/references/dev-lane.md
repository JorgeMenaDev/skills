# Dev subagent lane

Read this for every mutating agent/worktree/PR slice.

## Prepare and dispatch

1. Refresh the canonical base and capture SHA. Check dirty state, ref/worktree collisions, and capacity.
2. Centrally create one branch/worktree per slice using Git's atomic ref creation. Workers receive an exact path and base.
3. Allocate unique ports, deployments, QA actors, and browser sessions. Warm shared caches sequentially when installs contend.
4. Write the brief to disk before spawn: scope/non-scope, decisions, base SHA, criteria/evidence matrix, owned paths, generated/formatter allowlist, execution-context matrix, stop rules, and handoff schema.
5. Dispatch through the selected executor. Native runtimes use native subagent tools; non-native sessions use the installed adapter's launch/resume contract.

## Supervise and accept

- Ask for one grounding checkpoint before material edits: intended boundary and validation plan.
- Schedule one progress checkpoint. Additional messages require an observed `scope`, `safety`, `defect`, or `decision` reason in the ledger. On a third defect or second scope intervention, force an early handoff; safety interrupts remain uncapped.
- Handoff requires commit SHA, changed paths, exact commands/results, evidence manifest, risks, clean status, and unrelated-change statement.
- Inspect the real diff and criteria, then assign a fresh independent reviewer. A failed formal handoff gets one batched correction in the same executor session when resumable; the same reviewer rechecks. A second failure escalates to a new attempt.
- Conductor owns push, PR, and merge by default. A sensitivity-checked draft PR may exist with every unresolved gate named; `draft_pushed` is not merge-ready.
- After integration, refresh the target, rerun affected gates, check issue state, and UI-smoke user-visible behavior. Only then mark terminal.

## Diff and integration traps

- A generate-then-diff gate is valid only when the generator reached its write phase and its unpiped exit code passed. A clean stale `_generated` tree is a false clean.
- Format and generate only owned paths; unexpected generated/formatter churn blocks acceptance.
- When parallel slices touch a shared helper/schema/API, inspect old call patterns in every unmerged branch after the first merge. Compilation may hide semantic regression through optional parameters.
- Same-wave peers may integrate serially. Rebase after required predecessors and invalidate acceptance evidence affected by the new base.
- A PR into an integration branch may not auto-close its issue; record and close it explicitly after its real merge bar.
- `gh pr merge --delete-branch` cannot remove a local branch attached to a worktree; clean worktrees before local branch deletion.

## Review-fix triage and compounding

A literal one-line wording/config fix may use the conductor exception. Behavioral or multi-file findings return to the same session as one consolidated note. Every generalizable accepted finding becomes one deduplicated `knownLessons` entry rendered into later briefs; slice-specific findings stay local.

The report locates proof; it is never proof by itself. Treat modified pre-existing assertions as suspect until proven equal or stronger. Network/credential/display constraints are blockers or evidence limitations, never permission to weaken an oracle.
