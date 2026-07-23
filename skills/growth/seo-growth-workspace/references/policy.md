# SEO Operating Policy

Use this reference for the fixed operating values shared by lifecycle classification, cadence, frontier discovery, gates, and measurement (loop semantics: references/operating.md; machine enforcement: scripts/loop-state.mjs). These values never grant publishing authority or bypass an existing review, evidence, safety, or human-approval gate.

## SEO Stage

Recompute the stage monthly from the weakest demand or outcome signal. Missing required evidence yields `unknown`; otherwise select the highest stage whose full rule is satisfied:

| Stage | Evidence rule |
| --- | --- |
| `unknown` | The current monthly report or trustworthy qualified-outcome tracking is missing. |
| `early` | Fewer than 100 non-brand impressions, or zero qualified outcomes, in the latest 30-day period. |
| `growth` | At least 100 non-brand impressions and at least one qualified outcome in the latest 30-day period. |
| `mature` | At least 1,000 non-brand impressions and at least three qualified outcomes in each of two consecutive 30-day periods. |

A qualified outcome is site-specific and named in `.seo/context.md`, such as a lead, signup, booking, or portfolio referral. `unknown` uses `early` operating defaults. A manual override requires a reason and expiry; after expiry the computed stage resumes. Stage never changes authority or gates.

## Cadence and retry

| Check | `unknown` / `early` | `growth` / `mature` |
| --- | --- | --- |
| Search Console | Monthly | Weekly |
| Crawl and indexability | Monthly | Monthly |
| Ahrefs External Crawl | Monthly | Monthly |
| Core Web Vitals | Monthly | Monthly |
| Conversion path / CRO | Monthly | Monthly |
| Content refresh review | Quarterly | Quarterly |
| Strategy review | Quarterly | Quarterly |

Deploy-specific checks are one-off obligations, not recurring cadence rows. A failed cadence execution retries the next day, then three days after that retry; another failure becomes `needs_human`. Missing or lagging measurement data is inconclusive, not an execution failure.

Ahrefs External Crawl is a distinct occurrence from deterministic Crawl and indexability even when their due windows align. A material change to the canonical origin, declared public scope, sitemap, robots behavior, crawl configuration, project ownership, plan, provider capability, or configured credit allocation/page ceiling that affects achievable coverage invalidates the current checkpoint and makes a new preflight and run due. Credits consumed by the qualifying run and routine provider resets are not invalidations. `references/ahrefs.md` defines the append-only occurrence representation.

Cadence rows default to `P4` / `reporting`; measurement obligations default to `P3` / `measurement`. Becoming due never raises priority. Only an observed impact routed through the Emergency Selector can promote work.

## Frontier bounds and coverage

- Cooldown: seven days per rung unless new evidence invalidates the last observation.
- Candidate bound: evaluate at most ten distinct candidates in one Frontier Sweep.
- Materialization bound: create or reuse at most one Ready ticket. A P0 signal may change the winning candidate but never this one-ticket bound.
- Rejection record: retain the top three rejected candidates and their failing gates.

Coverage max-age is fixed by rung:

| Max age | Rungs |
| --- | --- |
| 14 days | B |
| 30 days | A, C, E, F, J |
| 60 days | D |
| 90 days | G, H, I |

Expiry makes a rung due; it does not automatically create a ticket.

## Canonical gates and wakes

Every failed gate uses exactly one of these families:

| Gate | Meaning | Wake and escalation |
| --- | --- | --- |
| `dependency:<id>` | Named external work must complete. | Event wake plus daily fallback; after seven unchanged days, force a re-plan. |
| `access:<system>` | Required permission, credential, or authenticated session is missing. | Event wake plus one retry after 72 hours; after seven days, `needs_human`. |
| `browser-slot:<surface>` | The required UI lane is temporarily occupied or unsafe to use. | Retry after 30 minutes, two hours, and eight hours; after 24 hours, `needs_human`. |
| `human-approval:<decision>` | Judgment or consent is reserved to the named human. | `needs_human` immediately; never auto-retry; wake on the decision event and send one reminder after seven days. |

Evidence may explain a gate but cannot introduce a fifth family.

## SEO Ships

One **SEO Ship** is one canonical public URL newly published or materially revised in search intent or substantive content. A batch counts once per URL. A shared template, schema, or sitewide release counts once only when no page-specific intent or substantive content changes. Redirect-only work, previews, drafts, `noindex` surfaces, and verification do not count.

Record one normalized ship event per counted canonical URL. A shared release that qualifies as one ship records one event containing its affected URL set. Ambiguous qualification is recorded honestly. SEO Ships have no numerical publishing limit; the evidence, integrity, approval, and verification gates decide whether a release may publish.

## Measurement timing

Create the first measurement check 28 days after an SEO Ship. An inconclusive result wakes 14 days later. Use a different date only when a known data-availability or experiment window is recorded explicitly.

## Concurrency assumption

Runs assume that two agents will not mutate the same site at the same time. The skill provides no lease, lock, or replacement coordination system.
