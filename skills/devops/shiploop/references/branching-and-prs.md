# Branching And PRs

Use this reference when creating or resuming branches and pull requests.

## Branch Names

- Train branch: `shiploop/<run-slug>`
- Phase branch: `shiploop/<run-slug>-phase-<n>`

Do not use `shiploop/<run-slug>/phase-<n>` when the train branch is `shiploop/<run-slug>`. Git refs cannot have both a branch at `shiploop/<run-slug>` and child refs beneath that same path.

Derive `<run-slug>` from the parent issue title or plan title. Let the human or adapter override it before kickoff.

## Flow

0. Use the real repo checkout only. Reject if the checkout is not on clean, up-to-date `main` before kickoff.
1. Create or update the train branch from `main`, unless the human chose another target branch.
2. Before each phase starts, update the train branch locally/remotely.
3. Create the phase branch from the current train branch head.
4. Worker opens the phase PR into the train branch.
5. Worker runs the phase gate, records evidence on the child issue, waits for green checks, then merges its own phase PR into the train branch.
6. After all phase PRs are merged, open the final PR from the train branch to `main` as draft.
7. Run the final gate, fix findings on the train branch, mark the final PR ready, and label only the parent issue `shiploop-human-review`.
8. Check out `main` again and leave the repo clean for the next run.

Kickoff approval authorizes Shiploop to merge phase PRs into the train branch only after the phase gate passes, GitHub checks are green or explicitly waived by the human, no protected/default branch is being merged into, and evidence is posted to the child issue.

Final PR merge into `main` is human-owned.

If checking out `main` after handoff would lose local work or leave the repo dirty, block and record the exact cleanup condition instead of hiding it.

## Conflicts

If a phase PR conflicts with the train branch, the phase worker resolves the conflict, reruns the phase gate, updates evidence, and proceeds. Block only for product, architecture, safety, credential, or ambiguous conflict decisions.
