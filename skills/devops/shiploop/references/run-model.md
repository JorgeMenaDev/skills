# Run Model

Use this reference when starting or resuming a Shiploop run.

## Vocabulary

- Run: one Shiploop execution of a plan, fix, or feature.
- Ledger: the parent GitHub issue.
- Phase: a child GitHub issue.
- Task: adapter/runtime task, such as a worker queue item.
- Train branch: parent integration branch, `shiploop/<run-slug>`.
- Phase branch: one branch per phase, `shiploop/<run-slug>/phase-<n>`.
- Phase PR: phase branch into the train branch.
- Final PR: train branch into `main`.

## Intake

Shiploop accepts a co-created plan, supplied markdown/text, or a GitHub issue. Normalize any input into one parent issue and at least one child phase issue.

Use the fewest sensible vertical phases. A one-phase plan still gets one child phase issue, one phase branch, and one phase PR.

## Kickoff Boundary

Before mutation, show the normalized run plan:

- run slug and title;
- parent issue title/body draft;
- phase list with acceptance criteria;
- train branch and phase branch names;
- adapter and worker/runtime;
- phase gate and final review gate;
- safety boundaries.

Ask for approval before creating issues, branches, PRs, or adapter tasks unless the user explicitly says to execute now or the adapter is running in a pre-approved automation context.

After approval, create the parent issue and all child phase issues before worker execution starts.

## Defaults

- Final target branch: `main`, unless the human overrides it.
- Phase scheduling: sequential by default.
- Retry limit: 2 per phase task.
- Runtime limit: 2 hours per phase task.
- Config: first real run creates `.shiploop/config.yaml` with discovered defaults.
