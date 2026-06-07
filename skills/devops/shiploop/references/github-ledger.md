# GitHub Ledger

Use GitHub Issues as the canonical durable ledger. Labels are routing state, not proof.

## Labels

Default labels:

- `shiploop`
- `shiploop-ready`
- `shiploop-blocked`
- `shiploop-human-review`

Adapters and repos may map aliases in `.shiploop/config.yaml`.

## Parent Issue Body

Keep stable machine-editable blocks in the issue body and use comments as the timeline.

```md
<!-- shiploop:run -->
Run: bcr-landing-signup-cta
Status: running
Train branch: shiploop/bcr-landing-signup-cta
Final PR:
<!-- /shiploop:run -->

<!-- shiploop:phases -->
- [ ] Phase 1: #123 - branch: shiploop/bcr-landing-signup-cta/phase-1 - PR:
- [ ] Phase 2: #124 - branch: shiploop/bcr-landing-signup-cta/phase-2 - PR:
<!-- /shiploop:phases -->
```

The parent issue receives `shiploop-human-review` when the final PR is ready for human review.

## Phase Issue Body

Each phase issue also gets a stable block plus timeline comments:

```md
<!-- shiploop:phase -->
Run: bcr-landing-signup-cta
Phase: 1
Status: running
Parent: #122
Next: #124
Train branch: shiploop/bcr-landing-signup-cta
Phase branch: shiploop/bcr-landing-signup-cta/phase-1
Phase PR:
Task:
Worker:
Review gate:
<!-- /shiploop:phase -->
```

Also include the public metadata block from `SKILL.md` when the issue body needs a human-readable summary.

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
