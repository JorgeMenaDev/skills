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

`ownedPaths` and `collisionPaths` are repo-relative files or directory prefixes. `start` defaults both to empty arrays and binds every slice's missing `baseBranch`/`baseSha` to the live target or declared integration head. Planned read-only slices hold no write authority: their path declarations are ignored by `rebase-authority`, while source-bound preparations still invalidate.

When vendor, model, or effort is required, `dispatch --runtime-proof <ref>` records launcher or runtime metadata evidence in `executor.verified.evidence`. A model's own response is not attestation.

`repo.integrationBranch` optionally declares one local integration branch. It is shared authority and must be distinct from every `slice.branch`. A slice may set `baseBranch` to either `repo.targetBranch` or that integration branch. `start` requires the integration branch to include the target and records its actual head as every integration-based slice's default `baseSha`. During `rebase-authority`, an integration branch still exactly at the old target is fast-forwarded automatically; a branch with its own commits must contain the new target first. Paths changed across each slice's actual `baseSha..integrationHead` range cannot overlap mutating slice authority, and those bindings are recorded in the authority decision. Physical slice-branch movement is narrower: a PLANNED integration-based branch is accepted only at its recorded `baseSha` or the exact integration head.

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

An open gate is `{ "id": "post-merge-proof", "sliceId": null, "description": "Run tracker #N after this run merges", "status": "open", "evidence": [] }`. Evidence may be absent; when present it is always an array of non-empty identifiers. The gate may move once to `discharged` with non-empty evidence or `authorized` with evidence plus `approvedBy`; it is never removed.

## Authority decisions

`authorization.recordedDecisions` is append-only. `rebase-authority` appends a `rebase_authority` decision containing old/new target SHAs and changed paths plus, when declared, the integration branch, new integration head, and each slice's prior base with its actual fast-forward changed paths. `authorization.reviewWaivers`, `cessations`, and `effectRulings` are separate authorities and never substitute for each other.
