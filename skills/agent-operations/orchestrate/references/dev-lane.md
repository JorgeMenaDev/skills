# Dev subagent lane

Read this for every mutating agent/worktree/PR slice.

## Prepare and dispatch

1. Refresh the canonical base and capture SHA. Check dirty state, ref/worktree collisions, and capacity.
2. Centrally create one branch/worktree per slice using Git's atomic ref creation. Workers receive an exact path and base.
   If a shared-worktree environment cannot write `.git/index.lock` and reports `EPERM`, use a full clone for that slice and record the clone path/base in the brief; retrying the same shared Git directory does not restore isolation.
3. Allocate unique ports, deployments, QA actors, and browser sessions. Warm shared caches sequentially when installs contend.
4. Write the brief to disk before spawn from `references/brief-template.md`: scope/non-scope, decisions, base SHA, criteria/evidence matrix, owned paths, generated/formatter allowlist, execution-context matrix, stop rules, and handoff schema. Append the run's `standing-lessons.md` verbatim instead of re-typing tooling facts per brief.
5. Dispatch through the selected executor. Native runtimes use native subagent tools; non-native sessions use the installed adapter's launch/resume contract.

For process-per-call executors, record the spawn PID and resumable session ID at dispatch. When the call exits between phases, record runtime status `between-calls`; do not fabricate an active process. After conductor restart, check `scripts/watch-pid.sh <pid>` or `kill -0 <pid>` before declaring the executor dead. If it is live, keep observing it; if it exited, resume through the adapter's session contract (for Grok, `grok -r <sid>`) and bind the new PID to the same attempt.

## Supervise and accept

- Ask for one grounding checkpoint before material edits: intended boundary and validation plan.
- Schedule one progress checkpoint. Additional messages require an observed `scope`, `safety`, `defect`, or `decision` reason in the ledger. On a third defect or second scope intervention, force an early handoff; safety interrupts remain uncapped.
- Handoff requires commit SHA, changed paths, exact commands/results, evidence manifest, risks, clean status, and unrelated-change statement.
- Inspect the real diff and criteria, tiering review depth by risk: full conductor reads for kernel, load-bearing, and tooling slices; delegated review plus gate spot-checks for late-chain specialist slices whose failure modes existing assertions already cover. Then assign a fresh independent reviewer; an L-sized slice gets one cross-vendor review round before merge.
- A failed formal handoff gets one batched correction in the same executor session when resumable; the same reviewer rechecks. Escalate — a fresh attempt at higher capability, then AFK as fallback — only on the same defect recurring after correction or on executor degradation (dead session, incoherent thread). Novel findings on later rounds are the review working, not the executor failing; round count alone never escalates.
- Conductor owns push, PR, and merge by default. A sensitivity-checked draft PR may exist with every unresolved gate named; `draft_pushed` is not merge-ready.
- After integration, refresh the target, rerun affected gates, check issue state, and UI-smoke user-visible behavior. Only then mark terminal.

## Diff and integration traps

- A generate-then-diff gate is valid only when the generator reached its write phase and its unpiped exit code passed. A clean stale `_generated` tree is a false clean.
- Format and generate only owned paths; unexpected generated/formatter churn blocks acceptance.
- When parallel slices touch a shared helper/schema/API, inspect old call patterns in every unmerged branch after the first merge. Compilation may hide semantic regression through optional parameters.
- Same-wave peers may integrate serially. Rebase after required predecessors and invalidate acceptance evidence affected by the new base.
- Record each PR's merge strategy and expected published SHA. Never base a dependent branch on commits a squash merge will replace; wait for the post-squash integration SHA.
- `Closes #N` fires only on merge to the default branch: a PR into an integration branch does not auto-close its issue (close it explicitly after its real merge bar); the eventual atomic PR to the default branch does.
- Before accepting an environment-only failure, fingerprint the worktree's dependency layout (package manager, lockfile, resolved versions) against the primary checkout; worktree isolation is incomplete without dependency fidelity.
- After an integration merge, rerun generators, verify the expected generated modules exist, and prove the tree clean after reverting mechanical formatting drift.
- `gh pr merge --delete-branch` cannot remove a local branch attached to a worktree; clean worktrees before local branch deletion.

## Review-fix triage and compounding

Classify every accepted finding: **contract-violating** findings are always fixed; **advisory** findings are fixed when trivial, otherwise recorded with a disposition — `fix_now`, `downstream_slice`, or `follow_up`, each with owner, edge, and evidence. Finding-dense shapes — deterministic evidence tools, state machines, accounting/lifecycle contracts — get two review rounds before the first hand-back instead of discovering depth serially. After three consecutive novel-finding rounds, remaining advisory findings are recorded on the PR with dispositions and re-checked by the release slice's audit rather than looped further.

A literal one-line wording/config fix may use the conductor exception. Behavioral or multi-file findings return to the same session as one consolidated note. Every generalizable accepted finding is appended once, deduplicated, to the run's `standing-lessons.md` (rendered into later briefs) and, when portable, compounds into `knownLessons`; slice-specific findings stay local.

The report locates proof; it is never proof by itself. Treat modified pre-existing assertions as suspect until proven equal or stronger. Network/credential/display constraints are blockers or evidence limitations, never permission to weaken an oracle.
