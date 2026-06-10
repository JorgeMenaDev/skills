# Hermes Kanban Adapter

Use this reference when Shiploop executes through Hermes Kanban. The public core stays generic; this adapter owns Hermes setup, the task graph, dispatch behavior, logs, retries, and exception handling.

If Shiploop is invoked from Hermes, Hermes CLI, or a Hermes/Kanban worker, this is the default adapter. Use `Adapter: hermes-kanban` and `Execution: Hermes Kanban` in parent and phase issues. Do not replace the adapter with a local profile name.

## How Execution Works

The Hermes dispatch daemon (embedded in `hermes gateway run`, ticking every ~60s) is the run's engine:

- Completing a task promotes its children immediately: `hermes kanban complete` recomputes readiness inline, so a child whose parents are all `done` (or `archived`) flips to `ready` at that moment. The daemon's next tick spawns it.
- A task created with `--parent <id>` pointing at an incomplete task is created as `todo` and is unclaimable until every parent is done or archived. This gating is enforced at claim time too, so it cannot be raced.
- A worker- or operator-blocked task is sticky: the daemon never auto-resumes it, and all downstream tasks stay parked. Only an explicit `hermes kanban unblock` releases it (and resets the failure counter). This is the exception surface - blocked runs wait indefinitely at no cost.
- Crashes, spawn failures, and runtime-limit kills share one consecutive-failure counter; when it reaches the task's `--max-retries` (default limit 2 - i.e. the task auto-blocks `gave_up` on the second consecutive failure, allowing one retry).
- `--max-runtime` is enforced by killing the worker (SIGTERM, a few seconds' grace, then SIGKILL) and re-queuing the task as `ready`. Workers must be idempotent.
- A worker that exits cleanly without calling `complete` or `block` commits a protocol violation: the task auto-blocks (`gave_up`) immediately, with NO retry, parking the run until a human unblocks it.

Consequences for Shiploop:

- Create the ENTIRE task graph at kickoff. Only the first task spawns; the rest wait on their parent links. There is no per-phase task creation and no mid-run promotion by anyone.
- Every task MUST have `--assignee <existing-hermes-profile>`. Without it, the task is skipped forever when `kanban.default_assignee` is unset - or silently auto-assigned to that default profile when it is set, which may lack the shiploop skill. Tasks assigned to a nonexistent profile are never spawnable.
- Never use `--goal` mode for Shiploop tasks: its judge loop is designed to end in a sticky block when in doubt, which parks the whole run.
- One active run per workspace. Workers share one real checkout (worktrees are forbidden), so two concurrent runs targeting the same `dir:<repo-path>` corrupt each other. Kickoff preflight must verify no non-done, non-archived shiploop task already targets the workspace; if one does, either block kickoff or chain the new run's first task `--parent` to the active run's closeout task.

## Requirements

- `hermes` CLI installed and authenticated; the gateway dispatch daemon running.
- `gh` CLI authenticated for the target GitHub repository in the environment workers run in (worker profiles share the machine's `gh` auth unless configured otherwise - verify, do not assume).
- A dedicated Hermes Kanban board for the repo. Dedicated is mandatory for autopilot: after kickoff nothing supervises what the daemon promotes, so unrelated ready tasks on a shared board are a real hazard.
- A worker profile that exists and can operate in the target repo.
- The shiploop skill installed in the WORKER PROFILE, not only the default profile. Skills are profile-scoped; a task created with `--skill shiploop` crashes the worker on spawn (`Unknown skill(s): shiploop`) when the profile lacks it.
- The real target repo checkout, declared as `dir:<repo-path>`.
- A phase gate and final review gate resolved at kickoff.

## Kickoff Preflight

Read-only verification before asking for approval:

```sh
command -v hermes
command -v gh
gh auth status                                  # the auth workers will inherit
hermes kanban boards
hermes kanban diagnostics
hermes kanban list                              # no active task may target this workspace
hermes -p <worker-profile> skills list          # must show every skill the tasks will name
gh api repos/OWNER/REPO/branches/<target-branch>/protection 2>&1 | head -5   # and rulesets
```

Verify:

- the daemon is dispatching (gateway processes running, recent claim activity in diagnostics) - a dead daemon means a created graph silently never starts;
- no branch protection or ruleset requires PR approvals on `shiploop/*` branches, and the worker identity has push/merge rights - GitHub forbids approving your own PR, so a blanket review requirement deterministically blocks the first self-merge;
- no active shiploop task targets this workspace.

If Kanban is not initialized, `hermes kanban init`. If no dedicated board exists, plan its creation for kickoff:

```sh
hermes kanban boards create <repo>-shiploop \
  --name "<Repo> Shiploop" \
  --description "Shiploop runs for <repo>" \
  --default-workdir <repo-path> \
  --switch
```

Recommended `.shiploop/config.yaml` adapter keys (gate schema in `references/gates.md`):

```yaml
adapter: hermes-kanban
board: <hermes-board>
workspace: dir:<repo-path>
hermes_profile: <profile>
hermes_skills:
  - shiploop
max_runtime: 2h
max_retries: 2
gates:
  phase:
    - bun run check
  final: autoreview
```

## Task Graph Creation

At kickoff, after approval, create a sentinel kickoff task plus one task per phase plus a closeout task, chained with `--parent`. Capture each task ID and write it into the matching issue's `Task:` field.

The sentinel exists to prevent a race: phase 1 would otherwise be claimable the instant it is created, while the kickoff agent is still editing issue bodies. Chain phase 1 to the sentinel and complete the sentinel as the literal last act of kickoff.

Idempotency keys:

```text
shiploop:github:OWNER/REPO#<parent-issue>:kickoff
shiploop:github:OWNER/REPO#<phase-issue>:phase:<n>
shiploop:github:OWNER/REPO#<parent-issue>:closeout
```

Example for a two-phase run:

```sh
T0=$(hermes kanban create "Kickoff gate: <run-slug>" \
  --body "Sentinel. Completed by the kickoff agent when the ledger is fully written. Do not work this task." \
  --assignee "<profile>" --workspace "dir:<repo-path>" \
  --initial-status blocked \
  --idempotency-key "shiploop:github:OWNER/REPO#10:kickoff" --json | jq -r .id)

T1=$(hermes kanban create "Phase 1: <title>" \
  --body "Shiploop phase 1 of run <run-slug>. Execute per the worker contract in the shiploop skill and the issue: <issue-1-url>" \
  --assignee "<profile>" --workspace "dir:<repo-path>" --skill shiploop \
  --parent "$T0" \
  --idempotency-key "shiploop:github:OWNER/REPO#11:phase:1" \
  --max-runtime 2h --max-retries 2 --json | jq -r .id)

T2=$(hermes kanban create "Phase 2: <title>" \
  --body "Shiploop phase 2 of run <run-slug>. Execute per the worker contract in the shiploop skill and the issue: <issue-2-url>" \
  --assignee "<profile>" --workspace "dir:<repo-path>" --skill shiploop \
  --parent "$T1" \
  --idempotency-key "shiploop:github:OWNER/REPO#12:phase:2" \
  --max-runtime 2h --max-retries 2 --json | jq -r .id)

TC=$(hermes kanban create "Closeout: <run-slug>" \
  --body "Shiploop closeout of run <run-slug>. Execute the closeout contract in the shiploop skill. Parent ledger: <parent-issue-url>" \
  --assignee "<profile>" --workspace "dir:<repo-path>" --skill shiploop \
  --parent "$T2" \
  --idempotency-key "shiploop:github:OWNER/REPO#10:closeout" \
  --max-runtime 2h --max-retries 2 --json | jq -r .id)

# ... write Task: fields into issues, finish all issue edits and labels, then release the run:
hermes kanban complete "$T0" --result "Kickoff complete; ledger written; run released."
```

Phase 1 promotes the moment the sentinel completes and spawns on the next daemon tick (within ~60s). Every other task waits on its parent. Do not pass `--branch` with `dir:` workspaces (worktree-only flag; Shiploop forbids worktrees) - the phase branch lives in the issue metadata. Do not pass `--goal`.

After completing the sentinel, the kickoff agent is done. Manual `hermes kanban dispatch` is not part of the run; it is a human recovery tool for a stalled daemon.

## Watchdog And Notifications

Two failure classes never reach GitHub on their own: adapter-side auto-blocks (`gave_up` after crashes/kills/spawn failures - no worker is alive to mirror them) and a dead dispatch daemon (ready tasks sit unclaimed; nothing is blocked at all). A human watching only GitHub labels would never learn about either. Kickoff must close this gap:

- Subscribe the human's chat channel to every task in the graph so state changes push to them:

```sh
hermes kanban notify-subscribe <task-id> --platform <platform> --chat-id <chat-id>
```

- And/or install a watchdog: a scheduled job (`hermes cron`, or any OS scheduler) that runs `hermes kanban diagnostics` plus the status board and notifies the human when a task is `gave_up`/blocked without a matching `shiploop-blocked` label on GitHub, a `ready` task has been unclaimed for more than ~5 minutes, or a running task's heartbeat is stale.

If neither is possible, the run plan must say so honestly: the human's duty is then to check `hermes kanban list` periodically, because GitHub alone will not show adapter-side failures.

## Worker Calls

The spawned worker follows `references/worker-contract.md`. Its adapter calls:

```sh
hermes kanban show <task-id>           # read own task
hermes kanban comment <task-id> "..."  # runtime-local notes (GitHub issues carry the real evidence)
hermes kanban complete <task-id> --result "<short result>" --summary "<handoff summary>"
hermes kanban block <task-id> "<exact blocker and unblock condition>"
```

`complete` is what releases the next task in the graph: it is mandatory, last, and never skipped.

## Observing A Run

All read-only:

```sh
hermes kanban list
hermes kanban show <task-id>
hermes kanban runs <task-id>
hermes kanban log <task-id>
hermes kanban diagnostics
```

Plus the status board CLI (`references/status-board-cli.md`) for the GitHub-side view. Use direct task-state SQLite reads only as an optional read-only optimization.

## Exception Handling (Human Only)

These commands are never run in the happy path. A human uses them after resolving the cause of a block, re-verifying GitHub, git, checks, and Hermes state first:

```sh
hermes kanban unblock <task-id> --reason "<verified unblock reason>"   # also resets the failure counter
hermes kanban promote <task-id> "<reason>"   # recovery only; refuses if parents incomplete unless --force
```

Then fix the GitHub mirror: remove `shiploop-blocked`, restore `shiploop-ready` on the affected phase issue. The daemon resumes the chain from there.

Failure-mode mapping:

- worker called `block`: the worker already labeled GitHub before blocking;
- adapter-side auto-block (`gave_up` - consecutive crashes, spawn failures, or runtime kills exhausting the failure limit): GitHub is NOT updated automatically; the watchdog/notification surfaces it, and the human who responds adds `shiploop-blocked` and a blocked comment to the issue when picking it up.

## Webhooks

Do not use webhooks to drive phase progression - parent links and inline promotion already do that. Webhooks and notify subscriptions exist to tell humans about exception states. Never print webhook secrets, GitHub tokens, env vars, or provider credentials in prompts, logs, or issue comments.
