# Branching And PRs

Use this reference for branch and PR mechanics. Actors matter: the kickoff agent creates only the train branch; every phase branch and phase PR belongs to the phase worker that owns it; the final PR belongs to the closeout worker.

## Branch Names

- Train branch: `shiploop/<run-slug>`
- Phase branch: `shiploop/<run-slug>-phase-<n>`

Do not use `shiploop/<run-slug>/phase-<n>` when the train branch is `shiploop/<run-slug>`. Git refs cannot have both a branch at `shiploop/<run-slug>` and child refs beneath that same path.

Derive `<run-slug>` from the parent issue title or plan title. Let the human or adapter override it before kickoff.

## Flow

Kickoff agent:

1. Use the real repo checkout only. Reject if the checkout is not on clean, up-to-date `main` before kickoff.
2. Create the train branch from `main` (unless the human chose another target branch), commit `.shiploop/config.yaml` on it, push it.

Each phase worker, when the daemon spawns it:

3. Self-preflight per `references/worker-contract.md`, then sync the train branch from origin.
4. Create (or idempotently reuse) its phase branch from the current train head.
5. Open (or reuse) the phase PR into the train branch.
6. Run the phase gate, record evidence on its issue, verify checks are green or self-waive per `references/gates.md`, then merge its own phase PR into the train branch (squash).

Closeout worker, when the last phase task completes:

7. Open the final PR from the train branch to `main` as draft.
8. Run the final gate, fix findings on the train branch, mark the final PR ready, label only the parent issue `shiploop-human-review`.
9. Check out `main` and leave the repo clean for the next run. If that would lose local work, block with the exact cleanup condition instead of hiding it.

## Merge Authority

Kickoff approval grants every phase worker standing authority to merge its own phase PR into the train branch - no further human or supervisor confirmation exists - whenever all of these hold: the phase gate passed with recorded evidence, GitHub checks are green or self-waived under the rules in `references/gates.md`, the merge target is the train branch (never a protected or default branch), and the evidence is posted on the child issue before merging.

Final PR merge into `main` is always human-owned.

## Conflicts

If a phase PR conflicts with the train branch, the phase worker resolves the conflict, reruns the phase gate, updates evidence, and proceeds. It blocks only for product, architecture, safety, credential, or ambiguous conflict decisions.
