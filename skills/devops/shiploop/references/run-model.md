# Run Model

Use this reference when starting or resuming a Shiploop run.

## Vocabulary

- Run: one Shiploop execution of a plan, fix, or feature.
- Ledger: the parent GitHub issue.
- Phase: a child GitHub issue.
- Task: adapter/runtime task, such as a worker queue item.
- Train branch: parent integration branch, `shiploop/<run-slug>`.
- Phase branch: one branch per phase, `shiploop/<run-slug>-phase-<n>`.
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

Adapter selection is part of the kickoff contract. If the run is being started by Hermes or a Hermes/Kanban worker, the default adapter is `hermes-kanban` and the runtime is `Hermes Kanban`. Only use a direct/local adapter when the human explicitly requests execution without a worker adapter.

Before asking for approval, preflight the real target repo checkout with read-only commands:

```sh
git -C <repo> rev-parse --show-toplevel
git -C <repo> branch --show-current
git -C <repo> status --short --branch
git -C <repo> rev-parse --abbrev-ref --symbolic-full-name @{u}
git -C <repo> rev-parse HEAD
git -C <repo> ls-remote origin refs/heads/<target-branch>
```

Pass only if:

- current branch equals `<target-branch>`, default `main`;
- `git status --short` is empty;
- upstream exists;
- local `HEAD` equals the live remote `<target-branch>` SHA;
- target repo docs do not report extra nested-repo or submodule dirty checks.

Do not run `git fetch`, create branches, stash, reset, checkout, clean, create issues, create tasks, create webhooks, or write config before kickoff approval.

If preflight fails, reject early with the exact blocker and do not mutate anything.

Ask for approval before creating issues, branches, PRs, or adapter tasks unless the user explicitly says to execute now or the adapter is running in a pre-approved automation context.

After approval, create the parent issue and all child phase issues before worker execution starts.

## Defaults

- Final target branch: `main`, unless the human overrides it.
- Phase scheduling: sequential by default.
- Workspace: the real repo checkout only. Never use worktrees or scratch checkouts.
- Retry limit: 2 per phase task.
- Runtime limit: 2 hours per phase task.
- Config: before kickoff, only draft `.shiploop/config.yaml`; after kickoff approval, create or update it on the train branch and record the change in the parent issue.
