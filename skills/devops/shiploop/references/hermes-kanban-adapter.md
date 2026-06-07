# Hermes Kanban Adapter

Use this reference when Shiploop should execute phases through Hermes Kanban. The public core stays generic; this adapter owns Hermes setup, task fields, dispatch, logs, retries, and status recovery.

## Requirements

- `hermes` CLI installed and authenticated.
- `gh` CLI authenticated for the target GitHub repository.
- A Hermes Kanban board for the project or run.
- A worker profile that can operate in the target repo.
- A chosen workspace strategy: `dir:<repo-path>`, `worktree`, or `scratch`.
- A phase gate and final review gate.

## First-Run Setup

Start with read-only discovery and dry-run output:

```sh
command -v hermes
command -v gh
hermes kanban boards
hermes kanban diagnostics
hermes kanban dispatch --dry-run
```

If Kanban is not initialized, run:

```sh
hermes kanban init
```

Then discover or create the board, choose the worker profile, workspace strategy, branch strategy, gates, retry limit, runtime limit, and tenant. Do not create tasks, branches, webhooks, or external state until Shiploop kickoff is approved.

Recommended `.shiploop/config.yaml` adapter keys:

```yaml
adapter: hermes-kanban
board: <hermes-board>
workspace: dir:<repo-path>
hermes_profile: <profile>
hermes_skills:
  - shiploop
max_runtime: 2h
max_retries: 2
tenant: <namespace>
```

## Metadata

Generic fields remain the public contract:

```md
## Shiploop
Run: bcr-landing-signup-cta
Phase: 1
Parent: #100
Next: #102
Adapter: hermes-kanban
Task: <task-id or blank>
Worker: <agent-or-worker>
Train branch: shiploop/bcr-landing-signup-cta
Target branch: main
Review gate: autoreview
Execution: Hermes Kanban
```

Hermes fields may extend the block or appear in adapter comments:

```md
Board: <hermes-board>
Workspace: dir:<repo-path> | worktree | scratch
Hermes profile: <profile>
Hermes skills: shiploop, <other-skill>
Max runtime: 2h
Max retries: 2
Tenant: <namespace>
```

## Task Creation

Create one Hermes task per executable phase. Use a deterministic idempotency key:

```text
shiploop:github:OWNER/REPO#<issue-number>:phase:<phase>
```

Example:

```sh
hermes kanban create "<phase title>" \
  --body "<phase body and issue URL>" \
  --assignee "<profile>" \
  --workspace "dir:<repo-path>" \
  --branch "shiploop/<run-slug>/phase-<n>" \
  --tenant "<namespace>" \
  --skill shiploop \
  --idempotency-key "shiploop:github:OWNER/REPO#123:phase:1" \
  --max-runtime 2h \
  --max-retries 2
```

Link dependencies when the board needs parent/child context:

```sh
hermes kanban link <parent-task-id> <child-task-id>
```

## Dispatch And Status

Dry-run before spawning work:

```sh
hermes kanban dispatch --dry-run
```

Dispatch only the intended phase:

```sh
hermes kanban dispatch --max 1
```

Inspect state:

```sh
hermes kanban show <task-id>
hermes kanban runs <task-id>
hermes kanban log <task-id>
hermes kanban diagnostics
```

Use direct task-state SQLite reads only as an optional read-only status optimization. Discover through Hermes CLI first.

## Comments, Completion, And Blocking

Mirror important adapter events back to GitHub issues. Hermes comments can also be used for runtime-local context:

```sh
hermes kanban comment <task-id> "<short evidence or blocker>"
```

Complete only after the phase gate has real evidence:

```sh
hermes kanban complete <task-id> \
  --result "<short result>" \
  --summary "<handoff summary>"
```

Block when a gate cannot pass:

```sh
hermes kanban block <task-id> "<exact blocker and unblock condition>"
```

Recover only after re-reading GitHub, git, checks, and Hermes state:

```sh
hermes kanban unblock <task-id> --reason "<verified unblock reason>"
hermes kanban promote <task-id> "<reason>" --dry-run
hermes kanban promote <task-id> "<reason>"
```

## Optional Webhook

Use a webhook only as a wake-up bridge. The handler must re-fetch GitHub and Hermes state before acting.

```sh
hermes webhook subscribe shiploop-ready \
  --events issue_ready \
  --skills shiploop \
  --description "Wake Shiploop when a phase issue becomes ready"
```

Never print webhook secrets, GitHub tokens, env vars, or provider credentials in prompts, logs, or issue comments.
