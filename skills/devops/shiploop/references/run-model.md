# Run Model

Use this reference when starting a Shiploop run. After kickoff, the run is owned by the daemon and the workers - if you are a spawned worker, your reference is `references/worker-contract.md`.

## Vocabulary

- Run: one Shiploop execution of a plan, fix, or feature.
- Ledger: the parent GitHub issue.
- Phase: a child GitHub issue.
- Task: adapter/runtime task, such as a worker queue item. One per phase, plus one closeout task.
- Task graph: the dependency-linked chain of tasks. Completing a task promotes its children immediately (readiness is recomputed inline at `complete`); the daemon's next tick spawns the promoted task. This is what sequences phases - not labels, not a supervisor.
- Train branch: parent integration branch, `shiploop/<run-slug>`.
- Phase branch: one branch per phase, `shiploop/<run-slug>-phase-<n>`.
- Phase PR: phase branch into the train branch. Merged by the phase worker itself.
- Final PR: train branch into `main`. Opened by the closeout worker, merged by the human.

## Intake

Shiploop accepts a co-created plan, supplied markdown/text, or a GitHub issue. Normalize any input into one parent issue and at least one child phase issue.

Use the fewest sensible vertical phases. A one-phase plan still gets one child phase issue, one phase branch, one phase PR, and a closeout task.

## Kickoff Boundary

Kickoff is the only interactive moment of the run. Before mutation, show the normalized run plan:

- run slug and title;
- parent issue title/body draft;
- phase list with acceptance criteria;
- train branch and phase branch names;
- adapter, board, and worker profile;
- the full task graph: one task per phase in chain order plus the closeout task, with idempotency keys;
- phase gate commands and final review gate, including a standing pre-approval to install `autoreview` if the repo lacks it;
- safety boundaries.

Adapter selection is part of the kickoff contract. If the run is being started by Hermes or a Hermes/Kanban worker, the default adapter is `hermes-kanban` and the runtime is `Hermes Kanban`. Only use a direct/local adapter when the human explicitly requests execution without a worker adapter.

Before asking for approval, preflight with read-only commands:

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

Adapter preflight, also before approval (adapter reference has the exact commands):

- the dispatch daemon is running and actually claiming tasks;
- the worker profile exists and has every skill the tasks will name;
- a dedicated board for the repo exists or will be created at kickoff, and no active run already targets this workspace;
- `gh` auth works in the environment workers run in;
- no branch protection or ruleset requires PR approvals on `shiploop/*` branches (GitHub forbids approving your own PR, so a blanket review requirement deterministically blocks the first self-merge), and the worker identity has push/merge rights;
- an exception channel exists: task notifications and/or a watchdog per the adapter reference - or the run plan states the human's polling duty honestly.

Do not run `git fetch`, create branches, stash, reset, checkout, clean, create issues, create tasks, create webhooks, or write config before kickoff approval.

If preflight fails, reject early with the exact blocker and do not mutate anything.

One approval covers the whole run. By approving kickoff, the human authorizes everything the workers will do unattended: creating branches and phase PRs, self-merging phase PRs into the train branch under the gate rules, updating issues and labels, opening the final draft PR, running the review gate, and pre-approved installs. Workers never ask for permission mid-run; when a decision is not theirs, they block and wait.

After approval, create in this order, then end the session:

1. parent issue and all child phase issues - issue numbers are circularly referenced (`Parent:`/`Next:`), so create with placeholders, then one edit pass fills the cross-references and the mandatory `shiploop:phases` checklist on the parent;
2. train branch, with `.shiploop/config.yaml` committed on it;
3. the entire task graph behind a sentinel kickoff task - every phase task chained to its predecessor, closeout task chained to the last phase - recording each task ID in the matching issue's `Task:` field;
4. `shiploop-ready` label on phase 1 only; exception notifications/watchdog per the adapter reference;
5. complete the sentinel task - the literal last act, which releases phase 1.

Phase 1 spawns on the daemon's next tick. Nothing else is required from anyone until the parent issue gets `shiploop-human-review`, a `shiploop-blocked` label appears, or the watchdog/notification channel reports an adapter-side failure (those never reach GitHub by themselves).

## Defaults

- Final target branch: `main`, unless the human overrides it.
- Phase scheduling: enforced structurally by task dependency links; strictly sequential.
- Workspace: the real repo checkout only. Never use worktrees or scratch checkouts. Sequential workers share the checkout; the handoff contract in `references/worker-contract.md` defines what each worker must find and leave.
- Failure limit: 2 consecutive failures per task (`--max-retries 2`) - the task auto-blocks on the second failure, i.e. one retry. Worker steps must be idempotent because the retry re-runs them from the start.
- Runtime limit: 2 hours per task. Adapters kill a worker at the limit (SIGTERM with a few seconds' grace, then SIGKILL - not a clean stop) and re-queue the task as ready until the failure limit trips.
- Config: before kickoff, only draft `.shiploop/config.yaml`; after kickoff approval, commit it on the train branch and record the change in the parent issue.
