# Review

The weekly growth cycle. Diagnose the business constraint, discover demand, choose a focused opportunity, advance useful work and decide what to learn next. Use the site's capacity and explicit maintenance or pause instructions to bound the cycle.

## 1. Establish the focus

Read `context.md`, `strategy.md`, `bets.md`, the newest review and `research.md`. Reconcile the current focus in [setup.md](setup.md) with the latest owner decisions. Name the customer, desired business outcome, baseline or unknown, constraint, capacity and execution boundary. A candidate that contradicts an owner decision is rejected with that decision as the reason; do not silently expand the mandate.

Inspect pending work and queued content before adding anything. Resolve stale status from delivery evidence. At most three **unshipped** bets may be open; live bets awaiting results do not consume those slots. Advance an existing useful bet before creating its duplicate. If no v8 review has read `archive/v7/backlog.md`, read its open rows once as candidates.

## 2. Read performance and due results

```bash
node "$SKILL_DIR/scripts/review-data.mjs" --site <property> --brand "<brand terms>" \
  --urls "<home>,<top money page>,<origin>/robots.txt,<origin>/sitemap.xml" \
  --out "$SITE_WORKSPACE/reports/data/review-YYYY-MM-DD"
```

Credentials and property come from `context.md` or the hub registry. Give each live check a verdict. A failed check on a page that should be up, lost canonical or unexpected `noindex` becomes the first candidate and sets run status `alerted`. So does a lane with at least 10 previous-window clicks that loses more than half. For a traffic-drop request, diagnose it with [search-console.md](search-console.md) first.

For due bets, compare their metric over equal before/after windows using final data only. For query-to-page evidence:

```bash
node "$SKILL_DIR/scripts/gsc-fetch.mjs" --site <property> --start <d> --end <d> \
  --dimensions query,page --filter page:equals:<url>
```

Choose `won`, `lost`, `killed` or `extended` against the recorded success/kill rule. Extension is allowed once for incomplete data, with a new date. Move resolved bets to Closed with evidence, the prediction that held or failed, and the next changed choice. Distinguish delivery correctness from search or business outcomes; a working redirect does not establish acquired customers.

Before a check date, verify delivery or relevant leading signals only when useful. Waiting for search data is not a site-wide pause. Before deferring work for interference, name the overlapping page, query intent or outcome path; sequence it or measure the changes together. Continue independent discovery, preparation and execution within capacity. Explicit owner freezes still govern. Before/after movement alone is not causal proof.

## 3. Discover outside the current footprint

An active growth review needs both site performance and a bounded outside-demand check. Reuse relevant research under 30 days old, but identify the outside source and what it changes this cycle. Own GSC alone is insufficient. Inspect real buyer questions/objections, live results, competitor page types, market/language demand, useful tools or earned distribution opportunities. [competitor-profiling.md](competitor-profiling.md) supplies depth options; a full competitor profile is not required each week.

In the dated report, maintain a small demand-to-destination table. Reuse recent rows when the focus is unchanged:

| Customer job / intent | Market / language | Source and date | Observed or estimated demand | Result format | Existing or queued destination | Missing value / proof | Qualified next step |
| --- | --- | --- | --- | --- | --- | --- | --- |

Acquire the evidence that makes the chosen work useful. Inspect existing product behavior, demonstrations, customer questions, sales/support objections, documented tests or expert answers. Private customer material stays private. Voluntarily supplied AI-discovery prompts can inform topics or a new observation-panel version; self-report remains separate from referral analytics. Do not add a survey by default. For missing proof, specify the smallest collection action, exact question or test, evidence owner and how the answer changes the deliverable. Perform authorized collection now; omit unsupported claims from the draft.

Notice time-sensitive buyer changes such as a product release, changed price or obsolete instruction. Record an expiry only when it affects the choice. This is bounded discovery, not a daily news operation. Maintenance runs may reuse recent discovery or omit it with the owner/capacity reason.

## 4. Compare opportunities and judge lanes

Normally compare five to ten credible candidates across at least three applicable kinds. Use fewer when the mandate, evidence or capacity warrants it; do not manufacture rows.

| Kind | Opportunity |
| --- | --- |
| `gap` | Demand with no suitable destination, including pages, tools and local surfaces |
| `underperformer` | Demand reaches a weak page, low CTR result, page-two result or competing pages |
| `protect` | A useful winning page is slipping or at risk |
| `defect` | Access, indexing, redirect or rendering problem with a demonstrated consequence |
| `conversion` | Visitors cannot or do not take a useful next step |
| `authority` | Relevant listings, citations, partner/resource pages or AI-answer sources |
| `cut` | A mature lane does not justify its cost |

Use one judgment method for every kind: business fit, demand evidence, distinctive value, mechanism, plausible gain, confidence and effort/capacity. Label evidence and size scenarios. A scenario states its assumptions; demand volume is not visits. Navigational demand for another site's login rarely sends visitors to a third-party page, so size it near zero unless it serves that exact task.

Run only the lookup that can change the ranking: a live result check for a ranking claim; a volume estimate for an unmeasured keyword gap when it would change the choice. Record unavailable evidence honestly. Reuse `research.md`; default budget is ten live checks and one demand request unless `context.md` sets another.

Judge URL groups using URLs, clicks, clicks per URL per month, age, completed observation windows, purpose and qualified outcomes where observed. Ten or more URLs earning under one click per URL per month for two reviews creates a `cut` candidate, not an automatic publishing ban, deletion or quota. Decide keep, cut or re-point with reasons; young pages and conversion-support pages need context.

## 5. Choose and advance

Choose up to three unshipped bets within remaining capacity. Prefer a demonstrated problem for likely customers with a credible path to meaningful gain. Real access/indexing failures and measurable losses go first; an easy preventive fix alone does not displace discovery. Argue for the strongest rejected alternative and state why the leader wins. Give the remaining candidates a specific disposition.

Keep the coherent opportunity and hypothesis in the existing current focus, not a separate campaign ledger. For each chosen bet, follow [ship.md](ship.md) now: prepare the complete deliverable, its distribution and conversion path, then execute what current authorization permits. Page work uses [content-ops.md](content-ops.md); authority/local work uses [backlinks-entity.md](backlinks-entity.md) or [local-seo-gbp.md](local-seo-gbp.md). Use existing engine plans, revisions and adapters.

When another owner must act, finish the reviewable work first and record the exact handoff. If missing evidence prevents a finished deliverable, complete the collection work available now and leave a bounded evidence request, not invented copy. No-action is valid when supported by the site's mandate, exhausted useful capacity or evidence that the alternatives are not worthwhile. Explain that decision and its next trigger.

## 6. Record the decision and handoff

Keep bets short; detail belongs in the report or existing engine revision:

```md
### B-012 Help buyers compare the supported integrations
- Kind: gap · Status: proposed · Opened: YYYY-MM-DD · Evidence: <report or engine revision>
- Hypothesis: <customer demand, missing value and predicted search/business effect>
- Work: <destination/inventory decision, finished package or live proof>
- Distribution / conversion: <relevant incoming link or placement, useful CTA and destination>
- Handoff: <next actor, execution route, authorization/dependency; or verified live>
- Success: <metric and threshold/baseline>. Kill: <rule>. Check: <date or live date + window>.
```

Status moves `proposed → approved → live → won | lost | killed`. Approval comes from the owner or an existing standing boundary. Record that basis; do not ask again for granted authority. A ready draft or merged PR is not `live` without delivery proof.

Write `reports/review-YYYY-MM-DD.md` with these sections:

- **Your next SEO move:** at most three bullets naming what moved, what is ready, and the next actor/action or decision.
- **Focus and numbers:** current business constraint, 28 days vs previous 28, qualified outcomes or unknown, non-brand query-row coverage, lane calls.
- **Discovery and choice:** demand-to-destination table, candidate comparison, strongest rejected alternative and capacity/interference decisions.
- **Work advanced:** exact package/revision/PR/live proof, distribution, conversion, baseline, success/kill rule and check date; remaining dependency and handoff.
- **Learning:** resolved bets, prediction tested and next changed choice.
- **What else we checked:** remaining candidates and reasons.
- **How this was made:** data windows, source dates, live query/country/language/time, actual lookups/costs, preparation effort, operator handoffs and limits. Unknown cost stays unknown.

Append two to four prose sentences to `log.md`. Done when useful work has advanced or a complete handoff is ready, or a bounded evidence/no-action decision is justified; report, focus, bets and log agree. A list of recommendations alone is unfinished.
