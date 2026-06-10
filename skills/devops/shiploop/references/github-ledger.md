# GitHub Ledger

Use GitHub Issues as the canonical durable ledger. Labels are informational mirrors for humans watching the run; the adapter task graph is what actually sequences work. Comments carry evidence; the metadata block carries machine-readable state.

## Labels

Default labels:

- `shiploop`
- `shiploop-ready`
- `shiploop-blocked`
- `shiploop-human-review`

Adapters and repos may map aliases in `.shiploop/config.yaml`.

## Canonical Metadata Block

Every parent and phase issue must include a human-readable `## Shiploop` block. The status board parses this block. These blocks are the canonical shapes; do not invent variants.

Keep the block's fields current as the run progresses: whoever opens a phase PR sets `PR:`, and whoever changes run state sets `Status:`. Comments carry evidence, but the block is what machines read (the status board falls back to scanning timeline comments for PR refs, body fields remain the contract).

Parent issue:

```md
## Shiploop
Run: <run-slug>
Phase: parent
Parent: none
Next: #<first-phase-issue>
Adapter: <adapter-name>
Task: <closeout-task-id>
Worker: <agent-or-worker>
Train branch: shiploop/<run-slug>
Target branch: main
Review gate: autoreview
Execution: <worker-runtime>
Final PR: <pr-number or blank>
Status: planned | running | blocked | human-review | done
```

Phase issue:

```md
## Shiploop
Run: <run-slug>
Phase: <number>
Parent: #<parent-issue>
Next: #<next-phase-issue or none>
Adapter: <adapter-name>
Task: <task-id>
Worker: <agent-or-worker>
Train branch: shiploop/<run-slug>
Phase branch: shiploop/<run-slug>-phase-<n>
Target branch: main
Review gate: autoreview
Execution: <worker-runtime>
PR: <pr-number or blank>
Status: parked | ready | running | blocked | done
```

All `Task:` fields are filled at kickoff, when the full task graph is created.

## Stable Blocks

The `shiploop:phases` checklist on the parent issue is mandatory at kickoff - the closeout worker uses it to enumerate phases, and completing workers tick their own entry. The `shiploop:run` block is optional. Both are secondary to the canonical `## Shiploop` block.

```md
<!-- shiploop:run -->
Run: bcr-landing-signup-cta
Status: running
Train branch: shiploop/bcr-landing-signup-cta
Final PR:
<!-- /shiploop:run -->

<!-- shiploop:phases -->
- [ ] Phase 1: #123 - branch: shiploop/bcr-landing-signup-cta-phase-1 - PR:
- [ ] Phase 2: #124 - branch: shiploop/bcr-landing-signup-cta-phase-2 - PR:
<!-- /shiploop:phases -->
```

## Label And Status Owners

Every transition has exactly one owner. No transition is performed by an unnamed supervisor.

At kickoff (kickoff agent):

- parent issue: `shiploop`, `Status: planned`;
- all phase issues: `shiploop`, `Status: parked`;
- phase 1 only: `shiploop-ready`, `Status: ready`.

During execution (phase workers):

- a worker starting phase N sets its issue `Status: running`, and sets the parent ledger `Status: running` if it still says `planned`;
- a worker completing phase N: closes its issue (`Status: done`), removes its `shiploop-ready`, adds `shiploop-ready` to phase N+1's issue and sets it `Status: ready` (no-op for the last phase). The adapter's dependency link is what actually releases the next task; the label mirrors it for humans;
- a worker blocking: adds `shiploop-blocked` to its issue (parent issue for run-scope blocks), removes `shiploop-ready`, sets `Status: blocked`, posts a blocked comment.

Closeout (closeout worker):

- adds `shiploop-human-review` to the parent issue only, sets parent `Status: human-review` and `Final PR:`.

Exceptions (human only):

- resolving a block: remove `shiploop-blocked`, restore `shiploop-ready` on the affected issue, set `Status:` back, unblock the adapter task;
- after merging the final PR: set parent `Status: done` and close it.

If adapter-side failures block a task without a worker alive to mirror it (consecutive crashes, spawn failures, or runtime kills exhausting the failure limit - `gave_up`), GitHub is not updated automatically. The kickoff-installed watchdog or task notifications surface it; the human who responds adds `shiploop-blocked` and a blocked comment first.

## Timeline Comments

Record important events as comments: phase started, PR opened, gate passed, waiver applied, blocked, merged, closeout done.

Blocked comment:

```md
Shiploop blocked.

Scope: phase | run
Reason: <short reason>
Evidence: <commands/errors/links>
Needed from human: <decision or credential>
```

Phase-specific blocks go on the child issue. Run-level blocks go on the parent issue.
