# Business Context Intake

Use this before strategy, audits, keyword work, local SEO, or reporting. The output belongs in `.seo/context.md` and may be summarized in `.seo/strategy.md`.

## Required Fields

| Area                  | Fields                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Business basics       | Business/product name, website, category, market, language, locations/service areas if local, years active if known  |
| Offer                 | Primary service/product, secondary services/features, pricing or package notes, highest-value conversion paths       |
| Customer              | Best-fit customer, bad-fit customer if known, buyer stages, average contract/job value if known                      |
| Goals                 | Top desired keywords, known ranking keywords, missing keywords, target geographies, top conversion goals             |
| Current standing      | GSC/traffic data, analytics provider, review count/rating, GBP status if local, indexing status, biggest SEO problem |
| Competitors           | Competitor names, URLs, GBP URLs if local, why they matter, known advantages                                         |
| Prior work            | Agencies/tools used, migrations, content already published, schema/backlink/citation work, what worked/failed        |
| Operating preferences | Quick wins vs long-term, approval boundaries, reporting cadence, preferred output format                             |

## Rules

- Fill unknowns from repo, live site, docs, app/admin panels, and public evidence before asking the user.
- Mark unresolved values as `Unknown`, not guesses.
- If the user gives a business-context block, treat it as durable input for the run and do not ask for the same facts again.
- For comparisons, output matrix columns that can be pasted into a spreadsheet.

## Customer-evidenced discovery journey

Use the [shared evidence states, provenance fields, buyer stages, and non-causal outcome ladder](evidence-conventions.md). Build the discovery-journey matrix only when identified customer evidence is `Reported` or `Observed`. Customer interviews, surveys, sales notes, defined CRM fields, referral records, and customer-level behavioural observations can qualify when their provenance and limitations are recorded. Inference, third-party estimates, trend claims, and generic audience assumptions cannot create or activate the matrix. Customer recall remains `Reported`; never upgrade it to observed attribution.

When qualifying evidence exists, keep the matrix in `.seo/context.md` because it is durable business context; summarize selected decisions in `.seo/strategy.md` when useful. A time-bounded investigation may instead preserve a snapshot in a dated `.seo/reports/` report. Do not create another required workspace file. When no qualifying evidence exists, create no matrix: its absence is the correct result and does not block strategy, audits, technical fixes, content work, or any other simple task.

Before the matrix, record each evidence basis with the canonical provenance fields and, where applicable, the source type (interview, survey, sales note, CRM field, referral data, analytics, search data, or other), exact question or field definition, customer segment, and sample size. Use `Unknown` for an unsupported stage, task, presence, asset, outcome, or decision; do not complete a journey from inference.

Use one row per discovery surface. Search, AI assistants, maps/local results, social, video, marketplaces, communities/forums, comparison publishers, newsletters, and direct/referral are examples, not a checklist.

| Surface | Customer-evidence basis | Evidence state | Provenance / limitations | Buyer stage(s) | Customer job / query or task | Current-presence observation | Activation decision | Asset / outcome / next action | Execution route |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| named surface | evidence record ID and bounded finding | `Reported` or `Observed` | source/provider, date/period, segment/sample, owner, artifact, recheck, limitations | shared stage(s) or `Unknown` | evidenced job and verbatim query/task, or `Unknown` | dated observation, `not checked`, or `Unknown` | `active`; `rejected — <reason>`; or `Unknown` | existing asset and non-causal outcome/next decision, or `Unknown` | existing specialist reference, outside skill, or no action |

Apply these decision rules:

- Mark a surface `active` only when its own customer-evidence basis supports it. Evidence for one surface does not activate adjacent surfaces.
- Record a considered but unsuitable surface as `rejected — <reason>` when evidence supports the rejection. Leave the decision `Unknown` when neither activation nor rejection is supported.
- Keep current presence separate from activation. Existing presence does not prove customer use, and an observed gap does not itself authorize a new channel.
- Keep outcomes on the shared non-causal ladder. Do not infer channel causality or revenue/ARR contribution from recall, exposure, rankings, citations, subscriber counts, or uncontrolled before/after observations.
- Route search/content to `references/content-ops.md`, AI observation to `references/ai-search-visibility.md`, maps/local work to `references/local-seo-gbp.md`, community-source publishing to `references/community-source-pages.md`, comparisons to `references/pseo-gates.md` plus `references/commercial-integrity.md`, affiliate/referral relationships to `references/affiliate-promo-integrity.md`, and conversion measurement to `references/conversion-cta.md`.
- Route social, video, newsletter, and marketplace execution to dedicated capabilities outside this skill. Record the decision and handoff here; do not create a campaign, cadence, channel ledger, or operating playbook.

For sparse evidence, preserve the sparsity: activate only directly supported surfaces, retain evidenced rejections with their reasons, and leave every unresolved field or decision `Unknown`. Do not turn the matrix into an omni-channel mode, require one for unrelated work, create per-channel ledgers, or calculate a surface score.

## Recommended Artifact Shape

```md
# SEO business context

## Business basics

## Offer and conversion paths

## Audience and buyer stages

## SEO goals

## Current standing

## Competitors

## Prior SEO work

## Constraints and operating preferences
```
