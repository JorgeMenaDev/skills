# Ledger schema

`run.json` remains schema version 1. Fields added after v1 launch are optional for legacy ledgers and validated when present. Use `validate --run <run.json>` before mutation and `examples/mid-lifecycle-run.json` as the copyable lifecycle example.

## Slice

```json
{
  "id": "core-loop",
  "lane": "dev-subagent",
  "state": "ACTIVE",
  "attempt": 1,
  "ownedPaths": ["src/core"],
  "collisionPaths": ["package.json"],
  "criteria": [{ "id": "loop", "text": "Loop works", "status": "pending", "evidence": [] }],
  "handoff": null,
  "reviews": { "conductor": null, "independent": null, "reviewWaiver": null }
}
```

`ownedPaths` and `collisionPaths` are repo-relative files or directory prefixes. They are required by `rebase-authority` for every nonterminal slice.

## Handoff and criterion evidence

`handoff` is `{ "report": "/absolute/REPORT.md", "commits": "base..head", "criteriaEvidence": "/absolute/evidence.json" }`. The evidence file is an object whose keys cover every slice criterion and whose values are non-empty evidence-reference arrays:

```json
{ "loop": ["REPORT.md#criterion-loop", "logs/smoke.txt"] }
```

## Reviews and waivers

A passing review is `{ "verdict": "pass", "evidence": ["review-ref"] }`. Dev acceptance always requires `reviews.conductor`. It also requires `reviews.independent`, unless `reviews.reviewWaiver` names this authorization entry:

```json
{
  "id": "waive-core-independent",
  "sliceId": "core-loop",
  "scope": "independent_review",
  "approvedBy": "operator",
  "evidence": ["directive-ref"],
  "compensatingControl": "End-of-branch consolidated independent review"
}
```

Waivers cannot replace conductor review and cannot apply across slices implicitly.

## Effects

```json
{
  "id": "dispatch:run:core-loop:1",
  "type": "dispatch",
  "sliceId": "core-loop",
  "status": "observed",
  "ownerEpoch": 1,
  "attemptKey": "run:core-loop:1",
  "reconcile": { "kind": "runtime", "locator": "session-id", "expected": "run:core-loop:1" },
  "observation": { "identity": "session-id" }
}
```

`attemptKey` is always `<runId>:<sliceId>:<attempt>`. New effects begin `prepared`, then move through `executing` to `observed`, `unknown`, or `cancelled` under the transition rules in `run-ledger.md`.

## Runtime observations

```json
{
  "attemptKey": "run:core-loop:1",
  "executor": "grok-cli",
  "vendor": "xai",
  "sessionId": "session-id",
  "status": "between-calls",
  "observedAt": "2026-07-12T12:00:00.000Z",
  "pid": 12345
}
```

Statuses are `active`, `between-calls`, and `complete`. Only `active` asserts a currently running process and therefore requires a fresh bound observation envelope.

## Deferred gates

An open gate is `{ "id": "post-merge-proof", "sliceId": null, "description": "Run tracker #N after this run merges", "status": "open", "evidence": [] }`. It may move once to `discharged` with non-empty evidence or `authorized` with evidence plus `approvedBy`; it is never removed.

## Authority decisions

`authorization.recordedDecisions` is append-only. `rebase-authority` appends a `rebase_authority` decision containing old/new target SHAs and changed paths. `authorization.reviewWaivers`, `cessations`, and `effectRulings` are separate authorities and never substitute for each other.
