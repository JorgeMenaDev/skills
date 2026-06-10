# Status Board CLI

Use `scripts/autopilot-status-board.py` for read-only inspection of a Shiploop run. It is a human observability tool for peeking at an unattended run - it never mutates anything and nothing in the run depends on it. It reads GitHub phase issues and can optionally join them with a task-state SQLite database for worker status, runs, heartbeat age, and drift warnings.

## Requirements

- Python 3.10+.
- `gh` CLI authenticated for the target GitHub repository.
- Optional task-state SQLite database passed explicitly or through `AUTOPILOT_STATE_DB`.

No repository names, labels, milestones, task-state paths, or worker names are hardcoded.

## Basic Usage

```sh
python3 scripts/autopilot-status-board.py \
  --repo OWNER/REPO \
  --label shiploop
```

JSON output:

```sh
python3 scripts/autopilot-status-board.py \
  --repo OWNER/REPO \
  --label shiploop \
  --format json
```

`--milestone "<title>"` is an optional extra filter for repos that assign run issues to a milestone (kickoff does not create one by default).

Custom labels:

```sh
python3 scripts/autopilot-status-board.py \
  --repo OWNER/REPO \
  --label shiploop \
  --ready-label shiploop-ready \
  --blocked-label shiploop-blocked
```

Optional task-state database:

```sh
python3 scripts/autopilot-status-board.py \
  --repo OWNER/REPO \
  --milestone "Example Release Train" \
  --state-db /path/to/task-state.db
```

Smoke test without GitHub or a state database:

```sh
python3 scripts/autopilot-status-board.py --self-test
```

## Phase Issue Contract

The CLI reads `## Shiploop` blocks. It also accepts legacy `## Autopilot` blocks and `Kanban:` keys as compatibility aliases.

```md
## Shiploop
Run: example-train
Phase: 1
Parent: #100
Next: #102
Adapter: <adapter-name>
Task: task-example
Worker: worker-a
Train branch: shiploop/example-train
Phase branch: shiploop/example-train-phase-1
Target branch: main
Review gate: autoreview
Execution: <worker-runtime>
PR: #123
Status: ready
```

## What It Reports

- issue number, title, URL, labels, and GitHub state;
- phase number/name from the metadata block;
- linked task status, assignee, run ID, worker PID, heartbeat age, and latest run outcome when a state database is available;
- PR and branch when declared;
- derived status: `done`, `blocked`, `running`, `ready`, `parked`, or `unknown`;
- next action, risk level, and drift warnings.

## Drift Rules

The board flags common mismatches:

- closed issue still has the ready label;
- task is done but phase issue is open;
- issue is closed but task is not done;
- task is blocked but issue lacks the blocked label;
- issue is blocked but task is not blocked;
- multiple open phases are ready in the same run;
- running task heartbeat is stale.

The board never mutates anything, and drift never gates the run - exceptions surface only as blocked adapter tasks plus `shiploop-blocked` labels, which wait for a human. Note that with the full task graph created at kickoff, later phases existing as pending/parent-gated tasks from day one is normal, not drift.
