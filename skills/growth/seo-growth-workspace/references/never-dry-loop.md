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

- Existing `.seo/loops/<loop-name>.json`: retain current fields and optionally add `schemaVersion: 1`, `nextWakeAt`, `wakeOn`, `sleepCertificate`, `occurrences`, `heartbeatAt`, and the context-only `stageStamp` (`stage` plus evaluation date).
- `.seo/loops/measurement-obligations.json`: optional schema-1 obligation ledger defined below.
- `.seo/loops/coverage-ledger.json`: optional schema-1 per-rung coverage artifacts defined below.
- `.seo/loops/site-lease.json`: short-lived per-site writer lease defined below; it is coordination state, not a certificate.

Before any workspace mutation, the invocation acquires the site lease for the resolved `SITE_WORKSPACE`. The lease records `owner`, `runId`, acquisition time, and expiry/renewal data. Acquisition is atomic; lease updates and releases use a temporary file followed by atomic replacement. A live lease causes `blocked` and no workspace write. Stale recovery is bounded by a labeled configurable default, records the recovery, and never takes a lease whose owner is still live. All state generators share this lease; none may create a second writer path.

Materialization must be crash-retryable: persist a candidate fingerprint, reconcile by that fingerprint, create or reuse the active ticket, then persist its ID. A crash between those steps is retried against the same fingerprint, never duplicated.

## Cadence occurrences

An occurrence is identified by `{cadenceId, dueWindow}`. Its transitions are:

`due → materialized → attempted → satisfied | blockedUntil`

There is at most one active ticket for an occurrence; retries reuse it. A completed prior window never trips duplicate suppression for a later window, while same-window re-materialization always deduplicates. Advancement occurs only after a successful observation: both `ok` and `alerted` count as observed. `alerted` also creates or links remediation or `needs_human` work. Execution failures and blocked observations record bounded-backoff fields (`attempt`, `nextAt`, `maxAt`, and escalation state) and never silently satisfy the cadence. Backoff bounds are configurable defaults, not standards.

### Schema-1 occurrence serialization

An occurrence-bearing loop file carries `schema: 1`; readers also accept the existing schema-1 envelope's `schemaVersion: 1` for additive compatibility. If both fields are present, both must equal 1. Its `occurrences` field is an object map keyed by the compact JSON serialization of the identity tuple: `JSON.stringify([cadenceId, dueWindow])`. Writers use that field order with no whitespace; readers decode the key and require it to equal the record identity. `cadenceId` is a stable non-empty string. `dueWindow` is a closed UTC calendar-date interval encoded `YYYY-MM-DD/YYYY-MM-DD`; repeat the date for a one-day window.

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

`state` is one of `due`, `materialized`, `attempted`, `satisfied`, or `blockedUntil`. `result` is `null`, `ok`, or `alerted`; `nextAt` and `maxAt` are `null` or `YYYY-MM-DD`. `dueAt` is the dated source input that makes the occurrence due and must fall inside `dueWindow`; cadence owners supply it rather than readers inferring it from `lastRun`. Before materialization, `ticket` is null. After materialization it links the single ticket: its status is `open` through materialized, attempted, or blocked states and `closed` when satisfied. Retain the closed ticket as lineage so the same window remains deduplicated. Persist `candidateFingerprint` before ticket creation and use it to reconcile crash retries. Set `result` only to `ok` or `alerted` after a successful observation; either permits `satisfied`. A failed or blocked observation sets `state` to `blockedUntil`, increments `attempt` above zero, and records `nextAt`, `maxAt`, and `escalation` without setting `result`. For `blockedUntil`, `nextAt` is the next-due input and `maxAt` is the absolute retry bound. Backoff values are configured inputs; any numeric backoff defaults remain labeled configurable defaults pending JorgeMenaDev/matias#118.

Apply the Emergency Selector in `references/ticket-architecture.md` for due-ness and P0 promotion.

## Measurement obligations

A measurement companion is keyed by the hypothesis plus page/cohort fingerprint. At ship time it records the baseline, metric, decision it can change, and due date. Its transitions are:

`pending → due → materialized → resolved | superseded`

An inconclusive due measurement records its attempt and reason, returns to the same pending lineage with a new wake date, and is never marked resolved merely because data is late, insufficient, or inaccessible. Deploy verification alone does not resolve a ranking, CTR, conversion, or indexation hypothesis. Materialization mechanics and per-area follow-up wiring land in a later slice.

## Coverage certification

The coverage ledger records one dated artifact per frontier rung and that rung’s max-age. The rung table and frontier sweep are owned by a later slice. Each max-age is a labeled configurable default, not a standard. A sleep certificate may claim no immediate action only when every applicable rung artifact is within its configured max-age; otherwise the stale or missing rung is a candidate for work or an honest blocker. A partial certificate says only what was checked, never that the entire frontier is clear.

## Ship-rate ceiling

Each site has a configurable default ship-rate ceiling for qualifying publications. It is independent of iteration rate: running more iterations does not authorize more ships. A cap hit records the counted ship events, blocks further qualifying publication, and routes the next action to `needs_human` or a dated wake; it does not certify sleep and does not manufacture a ticket. Numeric cap and window values remain labeled configurable defaults pending the knobs decision.

## Contribute-back boundary

When a run reveals concrete, non-duplicate friction in this skill, contribute-back may be recorded after the site run as upstream maintenance or a handoff-log note. An unattended run may write only its handoff-log note. Contribute-back never satisfies an eligibility gate, frontier rung, cadence occurrence, or three-terminal result, and never enters a site backlog.
