# Never-Dry Loop Contract

Use this contract for every `operate` invocation and for any checkpoint that would otherwise end with no immediate action. It owns the terminal contract, wake and certificate semantics, shared loop state, cadence occurrences, measurement obligations, and coverage certification. Fixed operating values live in `references/operating-policy.md`; this file does not own frontier rung recipes, report templates, or materialization mechanics.

## Three-terminal contract

Every run resolves to exactly one terminal:

1. **Executed work** — one eligible, target-owned action was attempted, verified with the existing Done criteria, and recorded.
2. **Scoped dated sleep** — the checked surface produced a deduplicated sleep certificate with its earliest next due date and/or observable wake predicate.
3. **Honest blocked** — a missing gate, unsafe mutation, or unobservable dependency prevents work or certification; the blocker, owner, evidence, and recheck value are recorded.

“No immediate action is useful”, “nothing to do”, and silent dry exits are not terminals. A partial sweep may claim only `no candidate from rungs checked`. The stronger claim `nothing valuable this cycle` requires a completed sweep within every applicable coverage window and names the top three rejected candidates with their failing gates.

The terminal result is scoped to the resolved target, mode, requested surface, remit, mutation ceiling, and authorization class. Contribute-back is a post-run side effect and never changes the terminal or satisfies the frontier.

## Wake taxonomy and continuity

Continuity is represented by one or both of:

- `nextWakeAt` — a dated, machine-readable next check; or
- `wakeOn` — a machine-checkable predicate with its predicate text, probe source, owner, and fingerprint.

The existing loops-state read and the Work Selection step for newly unblockable `Blocked` work re-evaluate every `wakeOn` on each invocation. A predicate that cannot be observed is `paused/needs_human`; do not invent a date for an event-gated blocker. A `wakeOn`-only state with no invocation that can observe it is likewise paused until a human or scheduler supplies that observer. The unattended summary reuses its `next` field for this structured wake state.

Classify every blocker and apply its event/date wake and escalation timing using the four canonical gates in `references/operating-policy.md`.

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

`authorizationClass` is versioned because a certificate from one approval or mutation regime must not silently authorize another. A certificate suppresses work only for an exact or conservatively equivalent invocation fingerprint. Missing or incomparable fields fail closed to finding work. Certificates are dated, deduplicated, and fingerprinted against the checked target and evidence; they are not permission to skip a newly observed signal. A certificate additionally requires no outstanding upgrade drift: a workspace cannot certify "nothing to do" under protocols it has never reconciled with (see § Upgrade recap and reconciled-version stamp).

Re-running inside the wake window without a new signal is a hot-loop heartbeat: update `heartbeatAt` in place at the configured bounded interval, with zero new report, log-line, or ticket spam. Append a log entry only when evidence, wake state, or terminal outcome changes.

A schedule’s `done` marker after a configured stop, cancellation, or explicit exhaust request is lifecycle metadata, not a fourth dry-run terminal; the current iteration still records executed work, scoped sleep, or honest blocked.

## Upgrade recap and reconciled-version stamp

Workspace state — backlog rows, loop ledgers, coverage certifications, obligations — is produced under the protocols of the skill version that ran at the time. After the installed skill is upgraded, that state has not been reconciled with the new protocols until someone deliberately reconciles it. The reconciled-version stamp makes that condition observable; the upgrade recap is the deliberate pass that clears it.

The stamp is optional additive schema-1 state at the **resolved site workspace root**: `<workspace>/reconciliation.json` — `.seo/reconciliation.json` in standalone mode, `.seo/sites/<slug>/reconciliation.json` for each hub-managed workspace. Every workspace carries its own stamp; reconciling one workspace never changes a sibling's drift state. It sits beside that workspace's `loops/` directory, deliberately outside it, because the cadence reader treats unknown `loops/*.json` files as loop state:

```json
{
  "schema": 1,
  "reconciledSkillVersion": "5.2.0",
  "reconciledAt": "YYYY-MM-DD",
  "report": "workspace-relative report path"
}
```

`report` is workspace-relative (`reports/YYYY-MM-DD-upgrade-recap-<version>.md`), never repo-root-relative — the stamp travels with its workspace and must stay readable if the workspace moves.

- The created-by `skillVersion` in `.seo/config.json` keeps its exact current semantics (`references/hub-mode.md`): first-stamp provenance, never rewritten, never tracking upgrades. Only `reconciledSkillVersion` tracks reconciliation, and only the recap re-stamps it.
- **Drift** exists when the invoking skill's current version differs from `reconciledSkillVersion`, or the stamp is absent or malformed. The installed version is read from the invoking skill's `SKILL.md` frontmatter `version:` — no bundled script reports it, so the installed-vs-reconciled comparison is deliberate prose work in the session that observes drift. Absence fails closed as never reconciled — it is drift, not an error, and existing workspaces created before this contract are simply drifted until their first recap. A workspace created under the currently installed version is reconciled by construction — none of its state has ever existed under any other protocol — so workspace creation writes that workspace's reconciliation stamp in the same pass (`scripts/bootstrap-seo-workspace.mjs` writes it on the create path with `report: null`); creation-time stamping is initial provenance, not an upgrade recap. For a stamp-less workspace, the only substitute is **workspace-scoped** created-by provenance equal to the currently installed version (the standalone `config.json` `skillVersion`); the hub-level `config.json` is hub-global first-stamp provenance and never exempts a site workspace, and an older created-by version never exempts anything.
- **Drift blocks sleep certificates only.** No certificate may be minted while drift is outstanding. Every other eligible action — executed work, honest blocked, due cadences, obligations — continues normally; drift never freezes a workspace.
- On observing drift, surface a due **upgrade recap** item through the normal ticket flow, routed operator-only. The recap itself is operator-invoked, always: no run — interactive, scheduled, or otherwise — executes it, migrates state, or rewrites anything because drift was observed. When the operator invokes the recap directly and no recap ticket was ever materialized, do not create one retroactively: the dated recap report, the log handoff entry, and the re-stamp are the canonical audit trail — the backlog stays a task queue, not a diary. A recap ticket that does exist closes against the report.

### The recap pass

Deliberate, dated, operator-invoked, one workspace per run; report shape in `templates/upgrade-recap.md`, written to the workspace's `reports/` directory as `reports/YYYY-MM-DD-upgrade-recap-<installed version>.md` (e.g. `reports/2026-07-15-upgrade-recap-5.2.1.md`; the version suffix keeps same-day recaps across consecutive upgrades collision-free). If that path already exists — a same-version rerun, e.g. after a malformed stamp — append the first free numeric suffix (`…-5.2.1-2.md`, `…-5.2.1-3.md`); existing reports are never overwritten. The stamp's `report` field records the path actually written, workspace-relative. Before the checks, record the upgrade context: previous reconciled version (or `never`), installed version, and the load-bearing semantic changes observed between them — this scopes everything below. Under a `never` or `malformed` baseline there is no version pair to compare, and that is the expected shape, not a gap: describe the current protocols' load-bearing demands against the observed workspace state, treating every current protocol as unreconciled (the conservative baseline). One workspace per run bounds each recap, not the fleet: recaps of distinct workspaces are concurrency-safe at the state level — they share no workspace state — but a git working tree is a single shared resource, so concurrent recaps each require their own clone or worktree. In a shared working tree, overlapping recap runs are prohibited outright: the serialization unit is the entire run, from its first workspace read through its push — never just the writes, and never just the git commands — because a sibling's repository-wide rebase or autostash can rewrite state underneath a run that is still reading or writing, leaving conclusions derived from a stale snapshot. Each run stages and commits only its own workspace's paths and pull-rebases before commit and before push, retrying on rejection. Four checks, all forward-looking:

1. **Loops-state revalidation** — re-read every schema-1 loop file, ledger, and certificate under the current contracts; malformed or newly non-conforming state is repaired forward or filed, never silently rewritten. Workspace-invented additive fields no contract names (e.g. `capExceptions`, `schedulerMirror`, `lastTerminal`) are tolerated additively: keep them, do not validate them, never delete them; such a field becomes a finding only when it collides with a contract-owned key or meaning. Repairing a stale policy mirror forward (§ Coverage certification) is within this check's repaired-forward authority — a recap counts as "the next write".
2. **Open-row re-triage** — every open backlog row is re-judged against the current gates; each row gets a dated `keep`, `amend`, or `close` with reason. Scope this to the upgrade: when a gate-owning contract is unchanged across the version window, a light conformance scan suffices. Under a `never` baseline no stamp-derived version window exists; the window may be legitimately reconstructed from the consuming repo's installer or version-control history (e.g. the vendored copy's git history proving which skill version actually produced the state), and the light-scan carve-out then applies against that reconstructed window — record the reconstruction evidence in the upgrade context. When no window can be reconstructed, every open row gets full re-judgment. Label each non-keep outcome `version-driven` or `incidental hygiene`; under a `never` baseline classify by the creating-version test: a finding is `incidental hygiene` when the row violated gates that already existed under the version that produced it, and `version-driven` when it is driven by gates that changed since — or did not exist under — that creating version. When no creating version can be established at all — `never` or unrecoverably `malformed` with no reconstructable window — classify non-keep outcomes `version-driven` by convention and note `creating version unknown` in the reason: the conservative attribution under an unreconciled baseline, since it files the work as normal rows instead of licensing in-pass fixes. Fix incidental findings only when the amendment is cheap and obvious, otherwise file them as normal rows. The re-triage never becomes the re-audit this pass forbids.
3. **Coverage invalidation review** — coverage-ledger rows certified against rungs or policies that changed (or rungs newly added) are marked stale. Apply the **load-bearing test**: invalidate a rung's row only when the changed clause alters what that rung's method would observe, accept, or reject — its inputs, gates, or evidence semantics; a change outside the rung's remit never invalidates it. Under a `never` baseline "the changed clause" has no referent; the test degenerates to: does the artifact's method, as evidenced, satisfy the current rung contract — invalidate only when it does not. A pure policy-mirror change — e.g. a rung's `maxAgeDays` — is never load-bearing by itself: the cadence reader derives expiry from current policy, not the stored mirror, so a max-age delta alone does not stale a row; the mirror is simply corrected on the next write. Record the per-rung reasoning either way. Marking stale means annotating the ledger row with additive `staleAsOf` (date) and `staleReason` fields **and** filing the re-observation as a normal backlog row — the backlog row is the operative exit; the annotation is documentation. The cadence reader derives expiry only from `observedAt + maxAgeDays` and does not honor the annotation.
4. **Obligations conformance** — measurement obligations are checked against the current companion contracts.

Then write the dated recap report and re-stamp `reconciledSkillVersion`. History is never rewritten: Done rows, past reports, and ledger history stay exactly as recorded. Real work the recap discovers exits into normal new backlog rows — the recap is a bounded bookkeeping pass, never a site re-audit and never a second work queue.

## Optional schema-1 state

All new machine state is optional, additive schema 1 under the resolved workspace’s `.seo/loops/` directory — with one deliberate exception: the reconciliation stamp lives at the workspace root and is owned entirely by § Upgrade recap and reconciled-version stamp, including its own absence semantics. Safe defaults are read-only and cannot certify sleep. For loop state, absence is not drift and is not an error, but an uninitialized or malformed state cannot issue a sleep certificate; parsing fails closed to finding work or reporting a blocker. Human-readable Scheduled rows, cadence summaries, reports, and logs are derived or materialized views; loop JSON is the sole machine source of truth. No workspace schema version, `seo-doctor` signature, or bootstrap behavior changes.

The optional state surfaces are:

- Existing `.seo/loops/<loop-name>.json`: retain current fields and optionally add `schema: 1` or `schemaVersion: 1`, `nextWakeAt`, `wakeOn`, `sleepCertificate`, `occurrences`, `heartbeatAt`, and the context-only `stageStamp` (`stage`, evaluation date, evidence basis — canonical key `basis` — and an optional reason-plus-expiry override).
- `.seo/loops/measurement-obligations.json`: optional schema-1 obligation ledger defined below.
- `.seo/loops/ship-events.json`: optional schema-1 normalized ship-event ledger defined below.
- `.seo/loops/coverage-ledger.json`: optional schema-1 per-rung coverage artifacts defined below.

For a first initialization run: cold-read with `cadence-status.mjs`, create only evidence-backed schema-1 loop state, then cold-read again. Seed coverage only from real dated rung artifacts; missing applicable rungs remain missing work, even though the cadence reader can validate only the rows present. The concurrency assumption is defined in `references/operating-policy.md`; there is no lease or lock protocol.

Materialization must be crash-retryable: persist a candidate fingerprint, reconcile by that fingerprint, create or reuse the active ticket, then persist its ID. Store the same fingerprint in ticket metadata. A crash between those steps is retried against the same fingerprint, never duplicated.

## Cadence occurrences

An occurrence is identified by `{cadenceId, dueWindow}`. Its transitions are:

`due → materialized → attempted → satisfied | blockedUntil`

There is at most one active ticket for an occurrence; retries reuse it. A completed prior window never trips duplicate suppression for a later window, while same-window re-materialization always deduplicates. Advancement occurs only after a successful observation: both `ok` and `alerted` count as observed. `alerted` also creates or links remediation or `needs_human` work. Execution failures and blocked observations record bounded-backoff fields (`attempt`, `nextAt`, `maxAt`, and escalation state) and never silently satisfy the cadence. Use the next-day, then three-days-later, then `needs_human` sequence in `references/operating-policy.md`.

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

Optional additive fields `priority` (`P0`-`P4`) and `area` carry the cadence row’s outcome-based priority and area; a due check materializes at its area’s normal priority, and readers fall back to `P4`/`reporting` when the fields are absent — due-ness alone never raises priority (the Emergency Selector owns promotion). `state` is one of `due`, `materialized`, `attempted`, `satisfied`, or `blockedUntil`. `result` is `null` unless `state` is `satisfied`, when it is `ok` or `alerted`. `escalation` is `none` or `needs_human`. `nextAt` and `maxAt` are `null` outside `blockedUntil`; in `blockedUntil` both are `YYYY-MM-DD` and `nextAt` is not after `maxAt`. `dueAt` is the dated source input that makes the occurrence due and must fall inside `dueWindow`; cadence owners supply it rather than readers inferring it from `lastRun`. Before materialization, `ticket` is null. After materialization it links the single ticket: its status is `open` through materialized, attempted, or blocked states and `closed` when satisfied. Retain the closed ticket as lineage so the same window remains deduplicated. Persist `candidateFingerprint` before ticket creation and use it to reconcile crash retries. A failed or blocked observation sets `state` to `blockedUntil`, increments `attempt` above zero, and records its backoff fields without setting `result`. For `blockedUntil`, `nextAt` is the next-due input and `maxAt` is the absolute retry bound; after `maxAt`, the reader surfaces `needs_human` instead of another retry. Apply the retry policy in `references/operating-policy.md`.

A `materialized` or `attempted` occurrence whose embedded ticket still reads `open` is **in-flight**: the reader surfaces it in every output format as a reconciliation row, because the canonical ticket may have been closed externally with a crash before the loop record's atomic replacement. No sleep certificate may be issued while an unreconciled in-flight occurrence exists — re-read the canonical backlog, complete the interrupted transition, then re-evaluate sleep.

Apply the Emergency Selector in `references/ticket-architecture.md` for due-ness and P0 promotion.

## Measurement obligations

A measurement companion is keyed by the hypothesis plus page/cohort fingerprint. At ship time it records the baseline, metric, decision it can change, and due date. Its transitions are:

`pending → due → materialized → resolved | superseded`

An inconclusive due measurement records its attempt, reason, and evidence, returns to the same pending lineage with a new `wakeAt`, and is never marked resolved merely because data is late, insufficient, or inaccessible. GSC lag and missing access are inconclusive reasons, not successful outcomes. Deploy verification alone does not resolve a ranking, CTR, conversion, or indexation hypothesis. Apply the measurement timing in `references/operating-policy.md`.

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

Optional additive fields `priority` (`P0`-`P4`) and `area` carry the obligation’s outcome-based priority and area; readers fall back to `P3`/`measurement` when absent — a measurement becoming due never raises its priority by itself. `state` is `pending`, `due`, `materialized`, `resolved`, or `superseded`. `hypothesis`, `pageCohortFingerprint`, `baseline.measuredAt`, `baseline.value`, `baseline.evidence`, `metric`, `decision`, and `dueAt` are required non-empty ship-time values. `dueAt`, `wakeAt`, `attempts[].attemptedAt`, and `resolvedAt` use `YYYY-MM-DD`; `wakeAt` is the next-due input for pending lineage. In `pending` or `due`, `ticket` is null and `candidateFingerprint` is either null or the stable non-empty fingerprint already persisted for an in-progress materialization. Materialization first persists that fingerprint while retaining the current `pending` or `due` state, uses it to create or reconcile the Ready row, stores the fingerprint in the ticket metadata, then sets `state` to `materialized` and links `ticket` as `{ "id": "SEO-NNN", "status": "open" }`. A `materialized` record with a non-empty fingerprint and null ticket is the legal crash intermediate between those writes; reconciliation surfaces it and repairs the missing link rather than failing closed. Resolution closes the open ticket, sets `resolvedAt`, and records a concise `calibrationNote` consumable as frontier-sweep calibration input; this contract does not implement sweep logic.

`successor` is null except in `superseded`. Supersession retains the original obligation lineage and requires `successor` as `{ "hypothesis": "non-empty successor hypothesis", "pageCohortFingerprint": "non-empty successor cohort fingerprint", "evidence": "path, URL, ticket, or other non-empty successor evidence" }`. A superseded obligation has a null or closed ticket and a string-or-null `candidateFingerprint`; it cannot retain an open ticket.

A `materialized` obligation whose embedded ticket still reads `open` is **in-flight**: the active ticket owns execution, and the reader surfaces it as in-flight rather than due. Because the canonical ticket may have been closed externally with a crash before the ledger's atomic replacement, an in-flight row is also a reconciliation demand: no sleep certificate may be issued while an unreconciled in-flight obligation exists - the operator re-reads the canonical backlog, completes the interrupted resolution or inconclusive return, and only then re-evaluates sleep. In-flight rows are never hidden from any output surface.

Each inconclusive measurement closes the materialized attempt ticket with an inconclusive disposition, then performs one atomic replacement of the obligation ledger that appends `{ "attemptedAt": "YYYY-MM-DD", "reason": "non-empty reason", "evidence": "path, URL, command, or access limitation" }`, returns `state` to `pending`, clears `candidateFingerprint` and `ticket`, and sets a later `wakeAt`. The ticket closure and ledger replacement cannot be one cross-system transaction, so a `materialized` record with a non-empty fingerprint and a closed ticket is the legal closed-ticket reconciliation intermediate; the reader surfaces it neutrally for reconciliation rather than failing closed, and the canonical ticket disposition and evidence decide whether reconciliation completes the interrupted resolution or the inconclusive return. Writers must not separately mirror only the closed ticket status into the ledger as an ordinary transition. Reconciliation completes the single ledger replacement. The next materialization uses the same obligation identity and a new attempt-specific candidate fingerprint, so lineage persists without falsely resolving the hypothesis.

## Coverage certification

The coverage ledger records one dated artifact per frontier rung and mirrors that rung’s current max-age. Its schema-1 serialization: `.seo/loops/coverage-ledger.json` carries `schema: 1` and a `rungs` object keyed by rung letter, each row `{ "observedAt": "YYYY-MM-DD", "maxAgeDays": <policy mirror>, "artifact": "report path" }`. The reader derives expiry from the rung mapping in `references/operating-policy.md`; a stale stored `maxAgeDays` cannot override current policy and should be corrected on the next write — an upgrade recap's loops-state revalidation counts as such a write (§ The recap pass, check 1). The earliest expiry is a wake source that `scripts/cadence-status.mjs` folds into the earliest next-due it reports, alongside every loop file’s `nextWakeAt`. A malformed ledger fails closed exactly like malformed cadence state. The rung table and frontier sweep are owned by `references/frontier-sweep.md`. A sleep certificate may claim no immediate action only when every applicable rung artifact is within its max-age; otherwise the stale or missing rung is a candidate for work or an honest blocker. A rung row carrying an unresolved recap `staleAsOf` annotation (§ The recap pass) counts as stale regardless of `observedAt` — the reader does not honor the annotation, so the session certifying sleep must; a fresh observation that rewrites the row clears it. A partial certificate says only what was checked, never that the entire frontier is clear.

## Ship-rate ceiling

Each site uses the SEO Ship unit and rolling seven-day cap in `references/operating-policy.md`. It is independent of iteration rate: running more iterations does not authorize more ships. A cap hit records the counted ship events, blocks further qualifying publication, and routes the next action to `needs_human` or a dated wake; it does not certify sleep and does not manufacture a ticket.

For each qualifying or ambiguous SEO Ship, append one normalized event to `.seo/loops/ship-events.json`. Reconcile `dedupeKey` before append so a retry cannot create another event. A multi-URL content batch records one event per counted canonical URL. A qualifying shared release records one event whose `urls` contains its affected URL set.

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

`eventId`, `dedupeKey`, `publishedAt`, `initiatedBy`, `source`, `urls`, `qualification`, and `evidence` are required; `ticketId` is a ticket ID or null. `publishedAt` is an RFC 3339 UTC instant, `urls` is a non-empty sorted set of canonical public URLs, and `evidence` is non-empty. Capacity calculations count both qualification values and use the per-URL and shared-release rules in `references/operating-policy.md`.

## Contribute-back boundary

When a run reveals concrete, non-duplicate friction in this skill, the active workspace contract and current task scope decide whether it may be recorded after the site run as upstream maintenance or an existing in-scope handoff-log note. An unattended run may write only its normal handoff-log note when that write is already in scope. Contribute-back never satisfies an eligibility gate, frontier rung, cadence occurrence, or three-terminal result, and never enters a site backlog.
