# GitHub Ledger

Use GitHub Issues as the canonical durable ledger. Labels are routing state, not proof.

## Labels

Default labels:

- `shiploop`
- `shiploop-ready`
- `shiploop-blocked`
- `shiploop-human-review`

Adapters and repos may map aliases in `.shiploop/config.yaml`.

## Canonical Metadata Block

Every parent and phase issue must include a human-readable `## Shiploop` block. The status board parses this block.

Parent issue:

```md
## Shiploop
Run: <run-slug>
Phase: parent
Parent: none
Next: #<first-phase-issue>
Adapter: <adapter-name>
Task:
Worker: <agent-or-worker>
Train branch: shiploop/<run-slug>
Target branch: main
Review gate: autoreview
Execution: <worker-runtime>
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
Task: <task-id or blank>
Worker: <agent-or-worker>
Train branch: shiploop/<run-slug>
Phase branch: shiploop/<run-slug>-phase-<n>
Target branch: main
Review gate: autoreview
Execution: <worker-runtime>
PR: <pr-number or blank>
Status: parked | ready | running | blocked | done
```

## Optional Stable Blocks

Use optional HTML comment blocks for safe machine updates when useful. They are secondary to the canonical `## Shiploop` block.

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

The parent issue receives `shiploop-human-review` when the final PR is ready for human review.

## Label Lifecycle

At issue creation:

- parent issue: `shiploop`;
- all phase issues: `shiploop`;
- phase 1 only: `shiploop-ready`;
- later phases: no ready label until the previous phase PR is merged and evidence is recorded.

During execution:

- blocked phase: add `shiploop-blocked`, remove `shiploop-ready`;
- unblocked phase: remove `shiploop-blocked`, add `shiploop-ready` only when it is the next executable phase;
- completed phase: close issue, remove `shiploop-ready` and `shiploop-blocked`;
- promoted phase: add `shiploop-ready` to exactly one next child issue;
- final PR ready: add `shiploop-human-review` only to the parent issue.

## Timeline Comments

Record important events as comments: phase created, branch created, task created, PR opened, gate passed, blocked, retried, merged, final review ready.

Blocked comment:

```md
Shiploop blocked.

Scope: phase | run
Reason: <short reason>
Evidence: <commands/errors/links>
Needed from human: <decision or credential>
```

Phase-specific blocks go on the child issue. Run-level blocks go on the parent issue.
