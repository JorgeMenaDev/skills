# Frontier Sweep

Use this reference when `operate` reaches an empty Ready queue. The sweep is the evidence-backed opportunity-discovery ladder; it does not replace the Work Selection order or the Binary Eligibility Gate in `references/ticket-architecture.md`.

## Rung map

| Rung | One-line question | Data source | Method owner |
| --- | --- | --- | --- |
| A | What exact sales, customer-success, or review language exposes an unmet job, objection, comparison, or use case? | Dated CRM notes, call summaries, support/CS records, win-loss notes, and public reviews available to the operator | `references/frontier-sweep.md` |
| B | Which query/page impressions expose a CTR, page-two, cannibalization, or thin-data opportunity? | Dated Search Console export processed by the existing opportunities script | `references/search-console.md` |
| C | Which existing page has decayed, become stale, or now needs consolidation or removal? | Dated GSC/analytics deltas, content inventory, and current live page/SERP evidence | `references/content-refresh.md` |
| D | Which demand or page type is evidenced on competitors but absent from the target? | Dated competitor snapshots, query overlap, page-type matrices, and recorded tool limitations | `references/competitor-profiling.md` |
| E | What does the live SERP anatomy require that the target does not yet satisfy? | Dated market/locale SERP sample covering ranking formats and visible SERP features | `references/content-ops.md` |
| F | Which committed roadmap capability creates a search candidate that can be useful before or at launch? | Dated, owner-confirmed product roadmap and release evidence plus current owned-site coverage | `references/frontier-sweep.md` |
| G | Where is brand/entity identity inconsistent, ambiguous, incomplete, or unsupported? | Dated brand SERP, schema, owned profiles, directories, citations, and entity-page evidence | `references/backlinks-entity.md` |
| H | Which task-completion query can the product satisfy with a genuinely useful free utility? | Dated GSC/keyword demand, competitor tool libraries, live SERP intent, and product capability evidence | `references/utility-tool-pages.md` |
| I | Which evidence-backed story, dataset, expert contribution, or linkable asset merits digital-PR work? | Dated competitor-link gaps, publications, industry sources, owned evidence, and qualified contact routes | `references/backlinks-entity.md` |
| J | Where do dated assistant observations show a material source or portrayal void with one bounded action route? | Maintained prompt-set observations, portrayal records, cited-source gaps, crawler access, and referral evidence | `references/ai-search-visibility.md` |

## Rung A recipe — sales, CS, and review language

1. Declare the checked sources, access boundary, market, date range, and sampling limitation. Use only records the operator is authorized to read; keep customer secrets and personal data out of reports.
2. Extract short, faithful phrases into a dated matrix: source pointer, audience/job, verbatim or clearly labelled paraphrase, repeated objection/question/comparison, current owned URL, and evidence state from `references/evidence-conventions.md`.
3. Cluster language by the customer job rather than by source system. Record frequency only inside the declared sample; do not infer market prevalence.
4. Form the smallest target-owned candidate that answers a repeated job or objection. Check overlap and cannibalization against existing pages before applying the canonical Binary Eligibility Gate.
5. Record a gate-passing candidate or retain the dated rejection with its failing gate, owner, and recheck/closure value. Store only evidence pointers when the source is private.

## Rung F recipe — roadmap to SEO candidates

1. Read only a dated roadmap or release source whose product owner and commitment state are identifiable. Separate `committed`, `exploring`, and `unknown`; only `committed` can support implementation work without further owner confirmation.
2. Map each capability to a customer job/query, intended audience, target market/locale, earliest truthful public date, current owned coverage, and the product evidence that a page could show.
3. Reject announcement-only or speculative pages. Prefer a useful pre-launch explanation, integration/use-case page, documentation surface, or launch-ready destination only when it can be accurate at publication time.
4. Check existing routes, plans, backlog, and reports for duplication, then validate live SERP intent using the owning method in `references/content-ops.md`.
5. Apply the canonical Binary Eligibility Gate. Record any dependency on product truth, launch timing, approval, or usable evidence as the failing gate with its owner and observable recheck.

## Progressive traversal and state

Run the sweep as a cadence row. Persist its cursor and rung timing in the owning schema-1 loop state and its dated artifacts in `.seo/loops/coverage-ledger.json`, following `references/never-dry-loop.md`. Start at the persisted cursor, not at A on every invocation. Skip a rung while its last completed artifact is within its configured coverage max-age or while its last attempt is inside its configured cooldown; advance to the next due rung and persist the cursor after every observation.

For the initial policy, use these **configurable defaults pending `JorgeMenaDev/matias#118`**, never standards: a `7-day` per-rung cooldown, a `30-day` per-rung coverage max-age, a `10-candidate` sweep-ledger cap, and a `2 qualifying publications per 7 days` ship-rate ceiling. A site may override them in its durable strategy/state with owner provenance.

For each observed rung, append its evidence and candidates to the dated sweep ledger, then apply the Binary Eligibility Gate owned by `references/ticket-architecture.md`. Stop at the first eligible candidate, materialize or reuse its ticket through the core contract's fingerprint reconciliation, persist the next-rung cursor, and resolve the run through the three-terminal contract. Retain rejected candidates with their failing gates; do not continue merely to compare scores.

A sweep is complete only when every applicable rung has a coverage artifact within its configured max-age. Only then may a run claim `nothing valuable this cycle`, and the claim must name the top three rejected candidates and their failing gates. A partial traversal may claim only what the core contract permits. Always write the dated ledger report from `templates/frontier-sweep-ledger.md`; sweep output is never silence or an unticketed prose conclusion.

Contribute-back happens only after the site run under `references/never-dry-loop.md`. It is never a rung, candidate, or sweep output.

## Cadence and autopublish quality watch

The human-readable cadence state header mirrors the content engine's observed autopublish state and `scheduleConfig`; the engine/admin surface remains the authority. Record the observed `autoPublish`, `enabled`, `daysOfWeek`, `hourLocal`, timezone, checked-at time, evidence pointer, gate state, and next publish window in each ledger.

| Cadence row | Due source | Check and decision | Continuation |
| --- | --- | --- | --- |
| Frontier sweep | Empty Ready queue plus the persisted cursor and coverage due state | Traverse from the first due rung and stop on the first candidate that passes the canonical gate | Persist cursor, coverage artifact, and next due rung/window |
| Autopublish quality watch | Armed engine autopublish plus its next publish window | Inspect the pending or newly published item using `references/content-engine-webhooks.md`; link remediation when alerted | A successfully executed watch mints the next watch occurrence for the following publish window |

While autopublish is armed, a live quality-watch row covering the next publish window must exist. An armed ungated auto-publish path makes the site ineligible for a sleep certificate, even when frontier coverage is complete. Record that condition as an honest blocker until a gate is restored or autopublish is disarmed; never let a sweep certificate suppress the quality-watch continuity.
