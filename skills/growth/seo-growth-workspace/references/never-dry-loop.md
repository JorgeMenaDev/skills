# Never-Dry Loop Contract

Use this contract for every `operate` invocation and for any checkpoint that would otherwise end with no immediate action. It owns the terminal contract, wake and certificate semantics, shared loop state, cadence occurrences, measurement obligations, coverage certification, and the per-site writer lease. It does not own frontier rung recipes, cadence defaults, report templates, or materialization mechanics.

## Three-terminal contract

Every run resolves to exactly one terminal:

1. **Executed work** — one eligible, target-owned action was attempted, verified with the existing Done criteria, and recorded.
2. **Scoped dated sleep** — the checked surface produced a deduplicated sleep certificate with its earliest next due date and/or observable wake predicate.
3. **Honest blocked** — a missing gate, unsafe mutation, live contention, or unobservable dependency prevents work or certification; the blocker, owner, evidence, and recheck value are recorded.

“No immediate action is useful”, “nothing to do”, and silent dry exits are not terminals. A partial sweep may claim only `no candidate from rungs checked`. The stronger claim `nothing valuable this cycle` requires a completed sweep within every applicable coverage window and names the top three rejected candidates with their failing gates.

The terminal result is scoped to the resolved target, mode, requested surface, remit, mutation ceiling, and authorization class. Contribute-back is a post-run side effect and never changes the terminal or satisfies the frontier.

## Wake taxonomy and continuity

Continuity is represented by one or both of:

- `nextWakeAt` — a dated, machine-readable next check; or
- `wakeOn` — a machine-checkable predicate with its predicate text, probe source, owner, and fingerprint.

The existing loops-state read and the Work Selection step for newly unblockable `Blocked` work re-evaluate every `wakeOn` on each invocation. A predicate that cannot be observed is `paused/needs_human`; do not invent a date for an event-gated blocker. A `wakeOn`-only state with no invocation that can observe it is likewise paused until a human or scheduler supplies that observer. The unattended summary reuses its `next` field for this structured wake state.

## Sleep certificate

A certificate is an optional schema-1 field in the owning loop state, not a second human-readable source of truth. Its shape is:

```json
{
  "dated": "YYYY-MM-DD",
  "dedupeKey": "stable fingerprint of the checked evidence and outcome",
  "fingerprint": {
    "target": "site identity",
    "mode": "operate",
    "requestedSurface": "surface or focus",
    "remit": "invocation scope",
    "mutationCeiling": "allowed mutation class",
    "authorizationClass": "class@version"
  },
  "checkedEvidence": ["path, URL, command, or report"],
  "gateFailures": ["candidate and failed gate"],
  "earliestNextDue": "YYYY-MM-DD or null",
  "wakeOn": [{
    "predicate": "machine-checkable condition",
    "source": "probe or state path",
    "owner": "responsible actor",
    "fingerprint": "predicate fingerprint"
  }],
  "coverage": "complete | partial",
  "heartbeatAt": "YYYY-MM-DDTHH:mm:ssZ"
}
```

`authorizationClass` is versioned because a certificate from one approval or mutation regime must not silently authorize another. A certificate suppresses work only for an exact or conservatively equivalent invocation fingerprint. Missing or incomparable fields fail closed to finding work. Certificates are dated, deduplicated, and fingerprinted against the checked target and evidence; they are not permission to skip a newly observed signal.

Re-running inside the wake window without a new signal is a hot-loop heartbeat: update `heartbeatAt` in place at the configured bounded interval, with zero new report, log-line, or ticket spam. Append a log entry only when evidence, wake state, or terminal outcome changes.

A schedule’s `done` marker after a configured stop, cancellation, or explicit exhaust request is lifecycle metadata, not a fourth dry-run terminal; the current iteration still records executed work, scoped sleep, or honest blocked.

## Optional schema-1 state and one-writer lease

All new machine state is optional, additive schema 1 under the resolved workspace’s `.seo/loops/` directory. Safe defaults are read-only and cannot certify sleep. Absence is not drift and is not an error, but an uninitialized or malformed state cannot issue a sleep certificate; parsing fails closed to finding work or reporting a blocker. Human-readable Scheduled rows, cadence summaries, reports, and logs are derived or materialized views; loop JSON is the sole machine source of truth. No workspace schema version, `seo-doctor` signature, or bootstrap behavior changes.

The optional state surfaces are:

- Existing `.seo/loops/<loop-name>.json`: retain current fields and optionally add `schema: 1` or `schemaVersion: 1`, `nextWakeAt`, `wakeOn`, `sleepCertificate`, `occurrences`, `heartbeatAt`, and the context-only `stageStamp` (`stage` plus evaluation date).
- `.seo/loops/measurement-obligations.json`: optional schema-1 obligation ledger defined below.
- `.seo/loops/ship-events.json`: optional schema-1 normalized ship-event ledger defined below.
- `.seo/loops/coverage-ledger.json`: optional schema-1 per-rung coverage artifacts defined below.
- `.seo/loops/site-lease.json`: short-lived per-site writer lease defined below; it is coordination state, not a certificate.

Before any workspace mutation, the invocation acquires the site lease for the resolved `SITE_WORKSPACE`. The lease records `owner`, `runId`, acquisition time, and expiry/renewal data. The protocol is concrete so independent writers interoperate:

- **Free state** is the absence of `.seo/loops/site-lease.json`. A present file is a claim, never ignorable metadata.
- **Acquire** by exclusive creation (`open` with create-exclusive/`wx` semantics — the POSIX conditional create). Creation failure means a claim exists: read it and treat it as live unless stale recovery below applies. A temporary-file rename is replacement, not compare-and-swap, and must never be used to acquire.
- **Renew/update** only while owning the lease, via a temporary file in the same directory followed by atomic rename over the lease path.
- **Release** by unlinking the lease file. Absence after release restores the free state.
- **Stale recovery**: only when the recorded owner fails a liveness probe AND the lease is past its bounded stale threshold (a labeled configurable default) may a recoverer unlink the stale file and then re-acquire by exclusive creation. Two racing recoverers both unlink harmlessly; exclusive creation lets exactly one win, and the loser backs off to `blocked`. Record every recovery.

A live lease causes `blocked` and no workspace write. Stale recovery never takes a lease whose owner is still live. All state generators share this lease; none may create a second writer path.

Materialization must be crash-retryable: persist a candidate fingerprint, reconcile by that fingerprint, create or reuse the active ticket, then persist its ID. Store the same fingerprint in ticket metadata. A crash between those steps is retried against the same fingerprint, never duplicated.

## Cadence occurrences

An occurrence is identified by `{cadenceId, dueWindow}`. Its transitions are:

`due → materialized → attempted → satisfied | blockedUntil`

There is at most one active ticket for an occurrence; retries reuse it. A completed prior window never trips duplicate suppression for a later window, while same-window re-materialization always deduplicates. Advancement occurs only after a successful observation: both `ok` and `alerted` count as observed. `alerted` also creates or links remediation or `needs_human` work. Execution failures and blocked observations record bounded-backoff fields (`attempt`, `nextAt`, `maxAt`, and escalation state) and never silently satisfy the cadence. Backoff bounds are configurable defaults, not standards.

### Schema-1 occurrence serialization

An occurrence-bearing loop file carries `schema: 1`; readers also accept the existing schema-1 envelope's `schemaVersion: 1` for additive compatibility. If both fields are present, both must equal 1. Its `occurrences` field is an object map keyed by the compact JSON serialization of the identity tuple: `JSON.stringify([cadenceId, dueWindow])`. Writers use that field order with no whitespace; readers require the key to equal `JSON.stringify([cadenceId, dueWindow])` for the record. `cadenceId` is a stable non-empty string. `dueWindow` is a closed UTC calendar-date interval encoded `YYYY-MM-DD/YYYY-MM-DD`; repeat the date for a one-day window.

```json
{
  "schema": 1,
  "occurrences": {
    "[\"weekly-gsc\",\"2026-07-06/2026-07-12\"]": {
      "cadenceId": "weekly-gsc",
      "dueWindow": "2026-07-06/2026-07-12",
      "dueAt": "2026-07-12",
      "state": "due",
      "candidateFingerprint": "stable materialization fingerprint",
      "ticket": null,
      "result": null,
      "attempt": 0,
      "nextAt": null,
      "maxAt": null,
      "escalation": "none"
    }
  }
}
```

Optional additive fields `priority` (`P0`-`P4`) and `area` carry the cadence row’s outcome-based priority and area; a due check materializes at its area’s normal priority, and readers fall back to the labeled configurable defaults `P4`/`reporting` when the fields are absent — due-ness alone never raises priority (the Emergency Selector owns promotion). `state` is one of `due`, `materialized`, `attempted`, `satisfied`, or `blockedUntil`. `result` is `null` unless `state` is `satisfied`, when it is `ok` or `alerted`. `escalation` is `none` or `needs_human`. `nextAt` and `maxAt` are `null` outside `blockedUntil`; in `blockedUntil` both are `YYYY-MM-DD` and `nextAt` is not after `maxAt`. `dueAt` is the dated source input that makes the occurrence due and must fall inside `dueWindow`; cadence owners supply it rather than readers inferring it from `lastRun`. Before materialization, `ticket` is null. After materialization it links the single ticket: its status is `open` through materialized, attempted, or blocked states and `closed` when satisfied. Retain the closed ticket as lineage so the same window remains deduplicated. Persist `candidateFingerprint` before ticket creation and use it to reconcile crash retries. A failed or blocked observation sets `state` to `blockedUntil`, increments `attempt` above zero, and records its backoff fields without setting `result`. For `blockedUntil`, `nextAt` is the next-due input and `maxAt` is the absolute retry bound; after `maxAt`, the reader surfaces `needs_human` instead of another retry. Backoff values are configured inputs; any numeric backoff defaults remain labeled configurable defaults pending JorgeMenaDev/matias#118.

Apply the Emergency Selector in `references/ticket-architecture.md` for due-ness and P0 promotion.

## Measurement obligations

A measurement companion is keyed by the hypothesis plus page/cohort fingerprint. At ship time it records the baseline, metric, decision it can change, and due date. Its transitions are:

`pending → due → materialized → resolved | superseded`

An inconclusive due measurement records its attempt, reason, and evidence, returns to the same pending lineage with a new `wakeAt`, and is never marked resolved merely because data is late, insufficient, or inaccessible. GSC lag and missing access are inconclusive reasons, not successful outcomes. Deploy verification alone does not resolve a ranking, CTR, conversion, or indexation hypothesis. Any numeric GSC-lag wait is a configurable default pending JorgeMenaDev/matias#118.

### Schema-1 obligation serialization

The ledger carries `schema: 1`; readers also accept `schemaVersion: 1` under the compatibility rules above. Its `obligations` field is an object map keyed by `JSON.stringify([hypothesis,pageCohortFingerprint])`. Writers use that field order with no whitespace, and readers require the key to equal the serialization of the record values.

```json
{
  "schema": 1,
  "obligations": {
    "[\"Improve non-brand CTR\",\"sha256:page-or-cohort-fingerprint\"]": {
      "hypothesis": "Improve non-brand CTR",
      "pageCohortFingerprint": "sha256:page-or-cohort-fingerprint",
      "baseline": {
        "measuredAt": "2026-07-13",
        "value": "2.1% CTR over the stated cohort and window",
        "evidence": ".seo/reports/gsc-2026-07-13.json"
      },
      "metric": "non-brand CTR for the stated cohort and window",
      "decision": "keep the title treatment or revert it",
      "dueAt": "2026-08-10",
      "state": "pending",
      "candidateFingerprint": null,
      "ticket": null,
      "attempts": [],
      "wakeAt": "2026-08-10",
      "resolvedAt": null,
      "calibrationNote": null,
      "successor": null
    }
  }
}
```

Optional additive fields `priority` (`P0`-`P4`) and `area` carry the obligation’s outcome-based priority and area; readers fall back to the labeled configurable defaults `P3`/`measurement` when absent — a measurement becoming due never raises its priority by itself. `state` is `pending`, `due`, `materialized`, `resolved`, or `superseded`. `hypothesis`, `pageCohortFingerprint`, `baseline.measuredAt`, `baseline.value`, `baseline.evidence`, `metric`, `decision`, and `dueAt` are required non-empty ship-time values. `dueAt`, `wakeAt`, `attempts[].attemptedAt`, and `resolvedAt` use `YYYY-MM-DD`; `wakeAt` is the next-due input for pending lineage. In `pending` or `due`, `ticket` is null and `candidateFingerprint` is either null or the stable non-empty fingerprint already persisted for an in-progress materialization. Materialization first persists that fingerprint while retaining the current `pending` or `due` state, uses it to create or reconcile the Ready row, stores the fingerprint in the ticket metadata, then sets `state` to `materialized` and links `ticket` as `{ "id": "SEO-NNN", "status": "open" }`. A `materialized` record with a non-empty fingerprint and null ticket is the legal crash intermediate between those writes; reconciliation surfaces it and repairs the missing link rather than failing closed. Resolution closes the open ticket, sets `resolvedAt`, and records a concise `calibrationNote` consumable as frontier-sweep calibration input; this contract does not implement sweep logic.

`successor` is null except in `superseded`. Supersession retains the original obligation lineage and requires `successor` as `{ "hypothesis": "non-empty successor hypothesis", "pageCohortFingerprint": "non-empty successor cohort fingerprint", "evidence": "path, URL, ticket, or other non-empty successor evidence" }`. A superseded obligation has a null or closed ticket and a string-or-null `candidateFingerprint`; it cannot retain an open ticket.

Each inconclusive measurement closes the materialized attempt ticket with an inconclusive disposition, then performs one atomic replacement of the obligation ledger that appends `{ "attemptedAt": "YYYY-MM-DD", "reason": "non-empty reason", "evidence": "path, URL, command, or access limitation" }`, returns `state` to `pending`, clears `candidateFingerprint` and `ticket`, and sets a later `wakeAt`. The ticket closure and ledger replacement cannot be one cross-system transaction, so a `materialized` record with a non-empty fingerprint and a closed ticket is the legal in-flight inconclusive-return intermediate; the reader surfaces it for reconciliation rather than failing closed. Writers must not separately mirror only the closed ticket status into the ledger as an ordinary transition. Reconciliation completes the single ledger replacement. The next materialization uses the same obligation identity and a new attempt-specific candidate fingerprint, so lineage persists without falsely resolving the hypothesis.

## Coverage certification

The coverage ledger records one dated artifact per frontier rung and that rung’s max-age. Its schema-1 serialization: `.seo/loops/coverage-ledger.json` carries `schema: 1` and a `rungs` object keyed by rung letter, each row `{ "observedAt": "YYYY-MM-DD", "maxAgeDays": <labeled configurable default>, "artifact": "report path" }`. A rung’s coverage expires at `observedAt + maxAgeDays`; the earliest expiry is a wake source that `scripts/cadence-status.mjs` folds into the earliest next-due it reports, alongside every loop file’s `nextWakeAt`. A malformed ledger fails closed exactly like malformed cadence state. The rung table and frontier sweep are owned by a later slice. Each max-age is a labeled configurable default, not a standard. A sleep certificate may claim no immediate action only when every applicable rung artifact is within its configured max-age; otherwise the stale or missing rung is a candidate for work or an honest blocker. A partial certificate says only what was checked, never that the entire frontier is clear.

## Ship-rate ceiling

Each site has a configurable default ship-rate ceiling for qualifying publications. It is independent of iteration rate: running more iterations does not authorize more ships. A cap hit records the counted ship events, blocks further qualifying publication, and routes the next action to `needs_human` or a dated wake; it does not certify sleep and does not manufacture a ticket. Numeric cap and window values remain labeled configurable defaults pending the knobs decision.

Every numeric knob in this contract and its consuming references (max-ages, cooldowns, caps, backoff bounds, due-date offsets, lag waits, default priorities) is a **labeled configurable default pending the knobs grilling (JorgeMenaDev/matias#118)** — never a standard. This paragraph owns that rule; other files say “configurable default” and defer here.

An agent-initiated publication qualifies when an agent action directly causes a new or materially revised SEO surface to become publicly reachable and indexable, whether through a deploy, webhook publish, or pSEO batch publish. Preview, draft, `noindex`, and verification-only actions do not qualify. When the available evidence cannot determine whether the action qualifies, fail closed: record it as `ambiguous` and count it against the ceiling.

For each qualifying or ambiguous publication, append exactly one normalized event to `.seo/loops/ship-events.json` under the per-site lease. Reconcile `dedupeKey` before append so a retry cannot create another event. A batch intentionally published by one action is one event whose `urls` contains the batch members; it consumes one publication slot unless the site's recorded ceiling policy explicitly defines a different unit.

```json
{
  "schema": 1,
  "events": [{
    "eventId": "stable event identifier",
    "dedupeKey": "stable fingerprint of publication action and public revision",
    "publishedAt": "2026-07-13T12:00:00Z",
    "initiatedBy": "agent run or actor identifier",
    "source": "deploy | webhook | pseo-batch | other",
    "ticketId": "SEO-000",
    "urls": ["https://example.com/public-page"],
    "qualification": "qualified | ambiguous",
    "evidence": ["deployment, webhook, manifest, or live-URL evidence"]
  }]
}
```

`eventId`, `dedupeKey`, `publishedAt`, `initiatedBy`, `source`, `urls`, `qualification`, and `evidence` are required; `ticketId` is a ticket ID or null. `publishedAt` is an RFC 3339 UTC instant, `urls` is a non-empty sorted set of canonical public URLs, and `evidence` is non-empty. The ship-rate checker consumes these events and counts both qualification values.

## Contribute-back boundary

When a run reveals concrete, non-duplicate friction in this skill, contribute-back may be recorded after the site run as upstream maintenance or a handoff-log note. An unattended run may write only its handoff-log note. Contribute-back never satisfies an eligibility gate, frontier rung, cadence occurrence, or three-terminal result, and never enters a site backlog.
