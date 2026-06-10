# Worker Contract

Use this reference when you are a spawned Shiploop worker: your task body names a phase issue (or the closeout) of a Shiploop run. You own your task end to end. You never ask a human anything; when a decision is not yours to make, block your task and wait.

Authority rule: the issue's `## Shiploop` block is authoritative for branches, gates, and targets. Your task body carries the run slug, phase number, and issue URL. On any mismatch between task body and issue block, block quoting both values - never pick one. `<target branch>` below always means the issue block's `Target branch:` value (usually `main`).

Your task ID comes from your spawn context and is mirrored in your issue's `Task:` field - read it from there if your runtime does not surface it.

Every step below is idempotent on purpose: you may be a retry of a killed worker. Before creating anything, check whether it already exists (branch pushed? PR open? evidence posted?) and continue from there instead of duplicating.

## Phase Worker

Self-preflight, as your first act:

1. Read your phase issue. Verify its run slug and phase number match your task body, and that the checkout path matches your task's workspace.
2. Verify the checkout is clean (`git status --short`) and on an acceptable ref: `<target branch>`, the train branch, or this run's phase branches. Retry exception: if the checkout is dirty but on YOUR phase branch, that is your killed attempt's work - inspect the diff; if it is within your phase's scope, commit it as WIP on the phase branch (this is inside your standing authority) and continue; if it touches anything outside your phase's scope, or the dirt is on any other ref, block.
3. Verify `gh auth status` works against the target repo.
4. Set your phase issue's block `Status: running`, and the parent ledger `Status: running` if it still says `planned`.

Then execute:

5. Sync the train branch: `git fetch origin`, then fast-forward your local train branch. If local and remote train have diverged, block - do not repair the train. Verify every prior phase issue is closed with a merged PR (walk the parent issue's phase list); if one is not, block.
6. Create your phase branch from the train head - or reuse it if a prior attempt already pushed it. If the train moved since, merge the train branch into your phase branch and push normally; never rebase or force-push a pushed phase branch (the squash merge at step 12 keeps train history clean).
7. Do the phase work. Stay inside the phase's acceptance criteria. Read gate commands from `.shiploop/config.yaml` (committed on the train branch, so present on your phase branch; readable early via `git show origin/shiploop/<run-slug>:.shiploop/config.yaml`).
8. Push and open the phase PR into the train branch (never `<target branch>`) - or reuse the open PR from a prior attempt.
9. Run the phase gate per `references/gates.md`. If gate commands are ambiguous, block.
10. Post gate evidence on your phase issue using the template in `references/gates.md`, and set the `PR:` field in the issue's `## Shiploop` block.
11. Judge PR checks per the dispositions in `references/gates.md`: none reported = proceed on gate evidence; green = proceed; pending past the deadline = block; red but provably pre-existing = self-applied waiver, recorded before merging; red because of your diff = fix, or block if you cannot.
12. Merge your own phase PR into the train branch (squash, delete remote branch). Kickoff approval is your standing authority for this merge; no one confirms it.
13. Hand off: close your phase issue and set its block `Status: done`; remove its `shiploop-ready` label; add `shiploop-ready` to the next phase issue and set that issue's block `Status: ready` (no-op if you are the last phase); tick your phase in the parent issue's `shiploop:phases` checklist. Note `gh pr merge --delete-branch` switches your checkout to the repo default branch - delete the local phase branch and leave the checkout clean on the train branch or `<target branch>`.
14. Complete your adapter task with a short result and handoff summary. Completing the task is what releases the next phase - it is mandatory, last, and never skipped. Exiting without completing or blocking immediately sticky-blocks the task with no retry.

## Closeout Worker

Self-preflight: steps 1-3 above, verifying run slug, train branch, and `<target branch>` against the parent ledger block (it has no phase number). Enumerate the phases from the parent issue's `shiploop:phases` block (mandatory at kickoff), or by walking `Next:` from the parent's first phase. Every phase issue must be closed with a merged PR; if one is not, block - do not repair the run yourself.

Then execute:

4. Open the final PR from the train branch to `<target branch>` as draft - or reuse it if it exists. Note in the PR body that `.shiploop/config.yaml` ships with the run intentionally.
5. Run the final review gate (`autoreview`) per the invocation in `references/gates.md`. Fix accepted findings on the train branch, rerun until clean or blocked. If `autoreview` is missing and its install was not pre-approved at kickoff, block.
6. Post final gate evidence on the parent issue and the final PR.
7. Mark the final PR ready for review.
8. Label the parent issue `shiploop-human-review` and set its ledger block `Status: human-review` and `Final PR:` fields.
9. Check out `<target branch>` and leave the checkout clean. If that would lose work, block with the exact cleanup condition instead of forcing it.
10. Complete your adapter task. The run is now waiting on exactly one queue: the human's review of the final PR.

## Blocking

Block your adapter task (sticky - the daemon will not retry you, and downstream tasks stay parked) and mirror it to GitHub:

- add `shiploop-blocked` to your issue (parent issue for closeout/run-scope blocks), remove `shiploop-ready`, set the block `Status: blocked`;
- post a blocked comment: scope, reason, evidence, and exactly what a human must decide or provide.

Block for: task/issue metadata mismatches, gate ambiguity or gate failures you cannot fix, required checks pending past the deadline, check failures caused by your diff that you cannot fix, merge conflicts involving product/architecture/safety decisions, a diverged train branch, missing credentials or tools, an unsafe or unexpected checkout, any hard-stop item from the skill's Safety section. Then stop. Waiting costs nothing.
