# Never-Dry Release Replay — 2026-07-12

## Scope and frozen input

This is a read-only rule replay of SuperaSEO's recorded 2026-05-29 workspace state. It does not rerun live checks, mutate that workspace, or claim what later evidence would have shown. The primary input is `reports/empty-backlog-checkpoint-2026-05-29.md`, supported by the 2026-05-29 posture in `strategy.md`, `context.md`, and `log.md` from the frozen input copy.

The replay asks whether the recorded final checkpoint could reach a valid terminal under the never-dry contract. It cannot reach its recorded broad certification. Depending on what a real sweep observed, the valid terminal would instead be executed work, scoped dated sleep, or honest blocked.

## 2026-05-29 SuperaSEO replay

| Step | Recorded decision or evidence | Exact firing rule | Re-ruled outcome |
| --- | --- | --- | --- |
| 1. Resolve the run | The checkpoint resolved SuperaSEO, `operate/final checkpoint`, and a goal of continuing until no unblocked target-owned action remained. | `references/never-dry-loop.md § Three-terminal contract` scopes every terminal to the resolved target, mode, requested surface, remit, mutation ceiling, and authorization class. | Keep the target and remit. The replay cannot broaden to sibling sites or infrastructure work. |
| 2. Read existing work | Backlog had no Ready or In-progress row after SEO-038; remaining notes were described as data, ownership, decision, or infrastructure gates. | `references/ticket-architecture.md § Work Selection` requires the canonical selection order, including newly unblockable Blocked work and evidence-backed work from expired rechecks, stale notes, missing reports, or checkpoints. | An empty queue is an input to discovery, not a terminal. Re-evaluate blocked and stale continuity before declaring the frontier empty. |
| 3. Classify the narrow sanity check | The checkpoint verified seven production URLs and recent schema, crawl-path, entity, related-reading, and `llms.txt` work. | `references/ticket-architecture.md § Empty Backlog Rule` routes an empty Ready queue through the checkpoint and then the three-terminal contract; `references/frontier-sweep.md § Progressive traversal and state` defines completion by fresh per-rung coverage. | These checks are useful evidence but do not constitute completed A–J frontier coverage. They cannot support a whole-frontier certification. |
| 4. Start the mandated frontier | No coverage ledger, completed-sweep artifact, or persisted sweep cursor is recorded for the May state. | `references/frontier-sweep.md § Rung map` owns the A–J ladder; `§ Progressive traversal and state` starts from the persisted cursor, visits the first due rung, stops at the first eligible candidate, and requires a dated ledger. | Start from the first due rung. Missing state cannot skip to preferred technical, schema, or AI work. The fixed ladder counters comfort-work bias by making due evidence, not familiarity, choose the next surface. |
| 5. Re-rule the six rejected surfaces | GSC, pSEO, conversion, backlinks/entity, AI search, and publisher monitoring were each dismissed with prose conditions such as “fresh data,” “approved contact email,” or “a decision.” | `references/ticket-architecture.md § Binary Eligibility Gate` retains every failed candidate with its failing gate, owner, and dated recheck or `closed:<reason>`; `references/never-dry-loop.md § Wake taxonomy and continuity` permits an observable `wakeOn` with source, owner, and fingerprint and routes unobservable event gates to `paused/needs_human`. | The undated phrases are not legal continuity. Give time-checkable items a dated recheck; give observable events a structured `wakeOn`; route dependencies without an observer to honest blocked/paused. Do not invent dates for event-gated blockers. |
| 6. Test coverage freshness | The record contains no dated artifact for every applicable rung and therefore no max-age comparison. | `references/never-dry-loop.md § Coverage certification` requires one dated artifact per applicable rung within its configured max-age; missing or stale coverage becomes work or an honest blocker. `references/frontier-sweep.md § Progressive traversal and state` labels the initial max-age as a configurable default. | Coverage certification fails closed. The next action is to observe a due rung or record why it is blocked, not to certify that no immediate action remains. |
| 7. Test completed-sweep strength | The checkpoint names six surfaces but does not show a completed A–J traversal or the top three rejected candidates with failing gates. | `references/never-dry-loop.md § Three-terminal contract` allows a partial sweep to claim only `no candidate from rungs checked`; `nothing valuable this cycle` requires completed fresh coverage and the top three rejected candidates with failing gates. | The recorded “active backlog is empty” fact may stand, but the stronger “no immediate repo-owned action remains” certification is unreachable. At most, the evidence supports a partial, explicitly scoped claim. |
| 8. Resolve the terminal | The report ended with an undated list of future changes. The next recorded operation was 2026-07-10, 42 elapsed days later, when fresh GSC evidence created work. | `references/never-dry-loop.md § Three-terminal contract`, `§ Wake taxonomy and continuity`, and `§ Sleep certificate` require one valid terminal plus dated or observable continuity; a certificate with missing or incomparable fields fails closed. | A 42-day silent gap is unreachable by contract. The run must execute an eligible action, issue a scoped certificate with `earliestNextDue` and/or observable `wakeOn`, or record an honest blocker with owner, evidence, and recheck state. A later invocation can deduplicate/heartbeat unchanged state without report spam. |

### Surface routing, not invented findings

The recorded surfaces indicate where a real ordered sweep would look, not what it would find: customer/contact language can inform rung A; GSC evidence rung B; existing-page freshness rung C; competitive and SERP evidence rungs D–E; the pSEO/product decision rung F; profiles/entity rung G; useful tools and linkable assets rungs H–I; and observed AI visibility rung J. The replay does not claim any of those rungs would have produced an eligible ticket.

## Replay caveats

- The frozen copy contains later July material. Only the May-dated checkpoint and May posture are replay inputs; the 2026-07-10 log entry is used solely to establish the observed 42-day interval and later wake, not as information available on May 29.
- The recorded state has no coverage ledger, sweep cursor, sleep certificate, or site lease. Their absence proves that the stronger certification lacks required evidence; it does not prove what a newly executed sweep would discover.
- The production sanity table is a historical assertion in the frozen report. This offline replay does not re-fetch those URLs.
- The mapping above approximates candidate surfaces to rungs because the recorded state does not preserve a canonical sweep ledger or per-rung sampling boundaries.
- Some blockers are genuinely event-gated. The contract requires observable `wakeOn` continuity or `paused/needs_human`, not a fabricated calendar date.

## Concurrency walkthrough

Canonical rule: `references/never-dry-loop.md § Optional schema-1 state and one-writer lease`.

### Live contention

1. Invocation A resolves the SuperaSEO `SITE_WORKSPACE` and, before any workspace mutation, atomically acquires `.seo/loops/site-lease.json`. The lease records owner, run ID, acquisition time, expiry, and renewal data.
2. Invocation B resolves the same site and attempts the same atomic acquisition. It observes A's live lease.
3. B does not update backlog, loop state, reports, logs, or the lease. It resolves as honest blocked with the contention evidence and recheck state.
4. A writes candidate state through temporary files and atomic replacement, reconciles any ticket using the persisted candidate fingerprint, then atomically releases the lease.
5. Because B made zero workspace writes and every generator shares the same lease, there is one writer and no corrupt or duplicated state.

### Verified stale recovery

1. Invocation A stops renewing and its lease passes the configured bounded stale threshold.
2. Invocation B verifies that A's owner is no longer live; expiry alone is insufficient to steal a live owner's lease.
3. B records the recovery, atomically replaces the stale lease with its own owner/run ID, and only then mutates workspace state.
4. If A crashed between candidate fingerprint persistence and ticket linkage, B reconciles by the same fingerprint and reuses the active ticket rather than duplicating it.
5. B completes atomic state replacement and lease release. The recorded recovery and fingerprint reconciliation preserve a single lineage without corruption.

## Harness and traceability

The repository validator is the framework-free structural and fixture harness. Its `frontier sweep rung routing` section proves exactly one A–J rung and method owner; its `cadence-status fixtures` section compares every listed JSON/Markdown output to its expected fixture; and its `measurement companion lifecycle fixture` checks the complete lifecycle. On this candidate it completed those checks and reported only the two release-owned baseline errors documented below.

| Parent property | Proving artifact |
| --- | --- |
| Three-terminal behavior, wake continuity, coverage certification, mandated traversal, and terminal skip treatment | This document, `§ 2026-05-29 SuperaSEO replay` |
| One-writer behavior under live contention and stale recovery | This document, `§ Concurrency walkthrough` |
| Structural contracts, A–J DRY routing, cadence expected outputs, and measurement-companion lifecycle | `validate-skill.mjs`; `fixtures/cadence-status/*.expected.{json,md}`; `fixtures/measurement-companion/walkthrough.json` |
| Executable command portability and classification | `command-inventory.mjs --verify` |

Harness run from the repository root:

| Command | Exit | Result |
| --- | --- | --- |
| `node dev/seo-growth-workspace/validate-skill.mjs` | 1 | Expected baseline only: SKILL.md 4.0.3 vs bootstrap 4.0.1; fresh digest-bound all-PASS gate-results artifact absent. No additional structural or fixture failure. |
| `node dev/seo-growth-workspace/command-inventory.mjs --verify` | 0 | PASS: 5 executable, 91 illustrative, 0 malformed; all 5 foreign-CWD executions exited 0. |

## Known follow-up

The measurement-companion audit advisory remains a release follow-up: a materialized obligation with an open ticket is intentionally absent from the due-obligations list because the active ticket owns execution, but `cadence-status.mjs` does not surface that lineage in another summary field. Changing the output contract would require new expected-output design and is not a safe one-line release-validation fix. No never-dry skill file was changed in this slice.

## Result

PASS for the release-validation slice. The May 29 broad dry certification and undated 42-day silence cannot be produced by the new rules; concurrent writers cannot both mutate the site; structural, cadence, measurement, DRY-rung, and command-inventory checks match the expected candidate state. The two validator findings remain the explicitly accepted release-artifact baselines for the next release slice.
