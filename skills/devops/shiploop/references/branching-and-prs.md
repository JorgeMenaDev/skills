# Branching And PRs

Use this reference when creating or resuming branches and pull requests.

## Branch Names

- Train branch: `shiploop/<run-slug>`
- Phase branch: `shiploop/<run-slug>/phase-<n>`

Derive `<run-slug>` from the parent issue title or plan title. Let the human or adapter override it before kickoff.

## Flow

1. Create or update the train branch from `main`, unless the human chose another target branch.
2. Before each phase starts, update the train branch locally/remotely.
3. Create the phase branch from the current train branch head.
4. Worker opens the phase PR into the train branch.
5. Worker runs the phase gate, records evidence on the child issue, waits for green checks, then merges its own phase PR into the train branch.
6. After all phase PRs are merged, open the final PR from the train branch to `main` as draft.
7. Run the final gate, fix findings on the train branch, mark the final PR ready, and label only the parent issue `shiploop-human-review`.

Final PR merge into `main` is human-owned.

## Conflicts

If a phase PR conflicts with the train branch, the phase worker resolves the conflict, reruns the phase gate, updates evidence, and proceeds. Block only for product, architecture, safety, credential, or ambiguous conflict decisions.
