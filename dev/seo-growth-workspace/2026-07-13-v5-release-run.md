# v5.0.0 Release Run — never-dry operate loop (2026-07-13)

Release run for the never-dry contract (skills#106, tickets #107–#112). The canonical machine record is `gate-results-5.0.0.json` (this document renders and supplements it; it is not an alternate source of truth). The rule-replay proof lives in `2026-07-12-neverdry-replay-superaseo.md`; criterion rows are `criterion-matrix.md` C106-01..16.

## Harness state at release

| Command | Exit | Result |
| --- | --- | --- |
| `node dev/seo-growth-workspace/validate-skill.mjs` | 0 | PASS — all 52 sections green, including `never-dry structural contracts`, `frontier sweep rung routing`, the cadence-status fixture suite, the measurement-companion lifecycle, and the gate-results consumption rehearsal |
| `node dev/seo-growth-workspace/command-inventory.mjs --verify` | 0 | PASS — 0 malformed; all foreign-CWD executions exit 0 |
| `node dev/seo-growth-workspace/evaluate-release.mjs --json` | 0 | `pass: true`, score 100, gate-results rejections: none |

Note on the 5/6 validation slice: its replay document recorded PASS while the validator still carried the two release-owned baseline findings (version sync, gate-results artifact). Both were release-slice property and are refreshed by this release; the harness above is the final green state.

## Seven registered hub workspaces — pre-initialization fail-closed-clean (ticket #108 AC)

Read-only copies of the 7 registered hub workspaces (source: `JorgeMenaDev/matias@0e7593e`, `.seo/sites/*`), run with `scripts/cadence-status.mjs --format json --now 2026-07-13`:

| Workspace | Exit | status | cadenceState | obligationState | due | earliestNextDue |
| --- | --- | --- | --- | --- | --- | --- |
| acredix-landing | 0 | ok | absent | absent | 0 | null |
| andesphere | 0 | ok | absent | absent | 0 | null |
| andy-partner | 0 | ok | absent | absent | 0 | null |
| arketix | 0 | ok | absent | absent | 0 | null |
| laborix | 0 | ok | absent | absent | 0 | null |
| superaseo | 0 | ok | absent | absent | 0 | null |
| wainwrightsbaggers | 0 | ok | absent | absent | 0 | null |

Every pre-initialization workspace reads clean: absence is not drift, nothing is invented, and no workspace can certify sleep until initialized (matias#119 owns initialization).

## Frontier-sweep walkthroughs (ticket #109 AC)

Fixture workspace: empty `Ready`/`In progress`; `.seo/loops/frontier-sweep.json` schema 1 with cursor `A`, no prior occurrences; empty `coverage-ledger.json`; strategy declares the configurable defaults; dated evidence sources exist for rungs A–J.

**A. Empty Ready → progressive sweep → first eligible candidate stops it.** Run 1 acquires the site lease and observes rung A; the candidate ("invoice export by client" from sales notes) fails phase readiness — dated rejection, owner, recheck, A coverage, cursor `B` persisted. Run 2 starts at B (not A — the cursor is progressive), finds only a duplicate page-two candidate — non-duplicate-fingerprint failure recorded, cursor `C`. Run 3 observes C: a decaying money page with dated first-party evidence, baseline, metric, decision, effort, and acceptance evidence passes the Binary Eligibility Gate. Traversal stops immediately; the ticket is materialized by fingerprint reconciliation; cursor `D` persisted; the run resolves as executed work. D–J are not scanned for a "better" score.

**B. Frozen evidence → completed sweep → certificate.** With evidence frozen and no candidate passing, successive due invocations resume the cursor, skip rungs inside max-age/cooldown, and eventually hold fresh artifacts for all of A–J. The final ledger names the top three rejections and their failing gates (roadmap page — phase readiness; page-two rewrite — duplicate fingerprint; PR dataset — no dated first-party/[E]/[P] observation). With coverage complete, no contention, and autopublish disarmed, the owning loop mints the certificate; `earliestNextDue` is the earliest expiring rung artifact (A, 30-day max-age → next due date), never an invented recheck. A re-run inside the wake window with no new signal updates only the bounded heartbeat — zero report/log/ticket spam.

**C. Autopublish armed → continuing quality watch → no certificate.** The cadence header mirrors engine `scheduleConfig` (`autoPublish=true`, `enabled=true`, days/hour/timezone, checked-at, next window). A live quality-watch occurrence covers the next publish window; an observed watch (`ok` or `alerted`, per the occurrence rules) mints the following window's occurrence, `alerted` linking remediation without breaking the chain. Even with A–J coverage complete, the armed ungated path keeps the site certificate-ineligible: the run records an honest blocker until a review gate is restored or autopublish is disarmed. A sweep certificate can never suppress the watch.

## Bounded-remit scoped-monitor walkthrough (ticket #107 AC, story 11)

A scheduled weekly GSC monitor cold-resumes, reads loop state (`cadence-status --format json`), and observes its scoped surface. Its remit is monitor-and-report: when its scoped check yields an eligible target-owned action it ends as executed work; when the surface is quiet it emits scoped dated sleep naming only the checked surface (`no candidate from rungs checked` at most — never `nothing valuable this cycle`, which requires completed coverage it did not traverse); when access or contention prevents certification it ends honest blocked. It does not traverse discovery rungs merely because reads are non-mutating — only an unattended `operate` invocation that explicitly authorizes opportunity generation may do that (`references/scheduled-operation.md` §Remit). The configured schedule itself ends only via `stop`, cancellation, or an explicit exhaust request — lifecycle metadata, not a fourth terminal.

## Priority honesty at materialization

Due checks materialize at their area's normal, outcome-based priority: occurrence records may carry additive `priority`/`area` fields; `cadence-status.mjs` renders draft rows with them and falls back to the labeled configurable defaults `P4`/`reporting` when absent. Due-ness never raises priority — promotion to P0 belongs exclusively to the Emergency Selector on an observed red delta (`references/ticket-architecture.md`).

## Manual gate re-attestation rationale (gate-results-5.0.0.json)

The 17 manual (b)-gates are v4 scenario attestations (2026-07-11, operator matias/opus-4.8). For v5.0.0 they are re-attested rather than re-run: the never-dry diff (16 commits) touches none of their owning references except `references/evidence-conventions.md`, whose change is additive only (new §Loop evidence tiers; the attested §Non-causal outcome ladder and buyer-stage rules are intact — re-read at re-attestation). Owning references verified untouched via the branch file list: local-seo-gbp, competitor-profiling, content-engine-webhooks, page-evidence, content-ops, ai-search-visibility, business-context, community-source-pages, affiliate-promo-integrity, commercial-integrity, ecommerce-seo, backlinks-entity, image-rights, adapters, plus their templates. Each artifact row carries the v5 source digest it attests and this rationale by reference.

## Known follow-ups

- Materialized obligations with an open ticket are intentionally absent from the due list (the active ticket owns execution) and are not yet surfaced in a summary field — deliberate output-contract follow-up, not a silent gap.
- A `pending` obligation carrying an in-flight fingerprint with a future `wakeAt` surfaces only at wake; unreachable under the documented selection-time protocol.
- SKILL.md is over the writing-great-skills 100-line guideline (pre-existing); a future pruning pass owns it.
- Consumer propagation and per-workspace initialization are post-merge work: the consumer hub npx update (this release) and matias#119 (initialization runs).
