# Local SEO / GBP report - YYYY-MM-DD

Use the shared vocabulary in the skill's `references/evidence-conventions.md`. Keep observation, action-completed, and outcome records separate. Local-AI observations do not belong in this report.

## Scope

Business:
GBP URL:
Primary service:
Service areas:
Competitors:

## GBP observation ledger

Visibility status must be `observed`, `not_visible`, `not_checked`, or `unavailable`. Use `not_visible` only for a field you inspected in a reliably loaded public observation where the value was not displayed; a field you did not inspect is `not_checked`, and a blocked, partially loaded, or otherwise unreliable source is `unavailable`. Whatever the state, never record false, absent, “does not have,” or “no” from non-visibility.

Keep evidence classes separate. Use one of `owned_authenticated`, `public_observation`, `official_guidance`, `empirical_correlation`, `anecdote`, `inference`, or `marketing_assertion` per row; create linked rows for different classes.

| Observation ID | Observed at | Source or exact query | Observer geo | Locale | Device / account / session context | Business or entity | Field | Observed value | Visibility status | Evidence URL or capture | Evidence class | Evidence limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GBP-O-001 |  |  |  |  |  |  |  |  | not_checked |  | public_observation |  |

## GBP mutation ledger

Block every proposed change until factual and eligibility confirmation, before evidence, one primary outcome, concurrent-change disclosure, approval, recheck, and rollback fields are complete. Use the normal explicit approval gate for authenticated changes and public content; there is no GBP-only exception. Sequential single-profile changes are observational before/after periods, never A/B tests.

| Mutation ID | Proposed change | Business-owner factual confirmation | Eligibility confirmation | Before evidence | Hypothesis | Primary outcome | Guard metrics | Concurrent changes | Changed at | Actor | Approval or review | Recheck window | After evidence | Result | Conclusion class | Rollback or follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GBP-M-001 |  | pending — blocked | pending — blocked |  |  |  |  |  | not changed |  | pending — blocked |  |  | pending |  |  |

## Geo-grid and manual location evidence

Evidence class must be `geo-grid scan` or `manual location sample`. Only a true `geo-grid scan` with documented per-point location control may contain coverage percentages. A `manual location sample` must leave top-3 and top-10 coverage blank and report only observations at its sampled locations.

| Measurement ID | Evidence class | Business / GBP | Query | Market / country | Observed at | Locale | Device / account / session context | Method | Grid centre | Dimensions | Spacing / radius | Coordinate set or scan evidence | Per-point location control | Relevant competitors | Non-ranking handling | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GEO-001 | manual location sample |  |  |  |  |  |  | manual | not applicable | not applicable | not applicable | sampled locations: | no |  | not applicable |  |

| Measurement ID | Top-3 coverage % | Top-10 coverage % | Average position | Median position | Non-ranking points | Weak geographic areas | Sampled-location observations |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| GEO-001 |  |  |  |  |  |  |  |

### Comparison decision

Baseline measurement ID:
Recheck measurement ID:
Comparable before/after: `yes` / `no`
Comparison check — same business, query, market, evidence class, grid centre, dimensions, spacing/radius, coordinate set, location controls, locale, and materially equivalent device/search context:
Rejection reason (required when `no`; changed grid geometry must be rejected):
Interpretation alongside proximity, GBP Performance, answered calls, qualified leads, customers, and revenue:

## Prioritized actions

| Priority | Proposed action | Evidence IDs | Impact hypothesis | Approval state | Recheck window | Owner |
| --- | --- | --- | --- | --- | --- | --- |

## Copy / drafts produced

All public drafts require factual, eligibility where relevant, privacy, incident/escalation, and human-approval review before publication.

### GBP description options

### Review response drafts

### GBP customer-communication calendar

### Service descriptions
