# Review

The weekly growth cycle: diagnose the business constraint, discover demand, choose a focused opportunity, take it to **finished** and decide what to learn next. The site's capacity and explicit maintenance or pause instructions bound the cycle.

## 1. Establish the focus

Read `context.md`, `strategy.md`, `bets.md`, the newest review and `research.md`. Reconcile the current focus in [setup.md](setup.md) with the latest owner decisions. Name the customer, desired business outcome, baseline or unknown, constraint, capacity and approval boundary. A candidate outside the mandate or contrary to an owner decision is rejected, citing that decision.

Inspect pending work, queued content and every open `package` or `evidence request` before adding anything. Resolve stale status from delivery evidence. At most three **unshipped** bets may be open; live bets awaiting results leave those slots free. Advance an existing bet that serves the same customer job instead of opening another. If no v8 review has read `archive/v7/backlog.md`, read its open rows once as candidates.

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

Choose `won`, `lost`, `killed` or `extended` against the recorded success/kill rule. Extension is allowed once for incomplete data, with a new date. Move resolved bets to Closed with evidence, the prediction that held or failed, and the next changed choice. Record delivery correctness and search or business outcomes as separate results; a working redirect proves delivery only.

Before a check date, verify delivery or leading signals when they could change a decision. While a bet's search data matures, continue independent discovery, preparation and execution within capacity. To defer work for interference, name the overlapping page, query intent or outcome path, then sequence the changes or measure them together. Explicit owner freezes still govern.

## 3. Discover outside the current footprint

An active growth review combines site performance with a bounded outside-demand check: evidence from beyond the site's own Search Console. Reuse relevant research under 30 days old, naming the outside source and what it changes this cycle. Sources: real buyer questions and objections, live results, competitor page types, market or language demand, tools people use and earned distribution opportunities. [competitor-profiling.md](competitor-profiling.md) sizes this check; a full profile is for when its extra evidence can change a bet.

In the dated report, maintain a small demand-to-destination table. Reuse recent rows when the focus is unchanged:

| Customer job / intent | Market / language | Source and date | Observed or estimated demand | Result format | Existing or queued destination | Missing value / proof | Qualified next step |
| --- | --- | --- | --- | --- | --- | --- | --- |

Acquire the evidence that gives the chosen work its value: existing product behavior, demonstrations, customer questions, sales and support objections, documented tests or expert answers. Private customer material stays private. Voluntarily supplied AI-discovery prompts can inform topics or a new observation-panel version; keep self-report separate from referral analytics. Collect missing proof now where authorized, through existing channels; what remains becomes an `evidence request` ([ship.md](ship.md)). Drafts carry only supported claims.

Notice time-sensitive buyer changes such as a product release, changed price or obsolete instruction, and record an expiry when it affects the choice. Maintenance runs may reuse recent discovery or skip it, citing the owner or capacity reason.

## 4. Compare opportunities and judge lanes

Normally compare five to ten credible candidates across at least three applicable kinds. The mandate, evidence or capacity can justify fewer; every row needs its own evidence.

| Kind | Opportunity |
| --- | --- |
| `gap` | Demand with no suitable destination, including pages, tools and local surfaces |
| `underperformer` | Demand reaches a weak page, low CTR result, page-two result or competing pages |
| `protect` | A useful winning page is slipping or at risk |
| `defect` | Access, indexing, redirect or rendering problem with a demonstrated consequence |
| `conversion` | Visitors cannot or do not take a useful next step |
| `authority` | Relevant listings, citations, partner/resource pages or AI-answer sources |
| `cut` | A mature lane does not justify its cost |

**Judgment method**, the same for every kind and every reference that chooses work: business fit, demand evidence, distinctive value, mechanism, plausible gain, confidence and effort/capacity. Label evidence and size scenarios with their assumptions. Navigational demand for another site's login rarely sends visitors to a third-party page; size it near zero unless the page serves that exact task.

Run only the lookup that can change the ranking: a live result check for a ranking claim; a volume estimate for an unmeasured keyword gap when it would change the choice. Reuse `research.md`; default budget is ten live checks and one demand request unless `context.md` sets another.

Judge URL groups using URLs, clicks, clicks per URL per month, age, completed observation windows, purpose and qualified outcomes where observed. Ten or more URLs earning under one click per URL per month for two reviews become a `cut` candidate, judged like any other. Decide keep, cut or re-point with reasons; young pages and conversion-support pages need context.

## 5. Choose and finish

Choose up to three unshipped bets within remaining capacity. Prefer a demonstrated problem for likely customers with a credible path to meaningful gain. Real access or indexing failures and measurable losses go first; ease alone earns a candidate no priority. Argue for the strongest rejected alternative and state why the leader wins. Give the remaining candidates a specific disposition.

Record the opportunity and hypothesis in the current focus. Take each chosen bet to **finished** with [ship.md](ship.md) in this run; its package table routes page, engine, authority, local, technical and conversion work.

**Propose an approval-boundary line when approvals repeat.** When a bet ends as a `package` waiting on the same kind of approval as an earlier package in `bets.md`, draft one line for the site's approval boundary that lets that class of change ship without per-item approval: the class, its limits and the gates that still apply. Present it as an owner decision in the report's next move. The boundary changes only when the owner accepts it; then record the dated decision in `strategy.md` and the line in `context.md`.

No-action is a valid outcome when the site's mandate, exhausted capacity or evidence about the alternatives supports it. Record the reason and the trigger that reopens the choice.

## 6. Record the decision

Keep bets short; detail belongs in the report or existing engine revision:

```md
### B-012 Help buyers compare the supported integrations
- Kind: gap · Status: proposed · Opened: YYYY-MM-DD · Evidence: <report or engine revision>
- Hypothesis: <customer demand, missing value and predicted search/business effect>
- Work: <destination decision and package location>
- Distribution / conversion: <relevant incoming link or placement, useful CTA and destination>
- Finished: <live | package | evidence request> · <live proof; or remaining gate, owner and next action>
- Success: <metric and threshold/baseline>. Kill: <rule>. Check: <date or live date + window>.
```

Status moves `proposed → approved → live → won | lost | killed`. Approval comes from the owner or the site's approval boundary. Record that basis and reuse granted authority.

Write `reports/review-YYYY-MM-DD.md` with these sections:

- **Your next SEO move:** at most three bullets: each chosen bet's finished state, and the next actor, action or owner decision, including any proposed boundary line.
- **Focus and numbers:** current business constraint, 28 days vs previous 28, qualified outcomes or unknown, non-brand query-row coverage, lane calls.
- **Discovery and choice:** demand-to-destination table, candidate comparison, strongest rejected alternative and capacity/interference decisions.
- **Finished bets:** state with live proof or package location, distribution, conversion, baseline, success/kill rule and check date; remaining gate, owner and next action.
- **Learning:** resolved bets, prediction tested and next changed choice.
- **What else we checked:** remaining candidates and reasons.
- **How this was made:** data windows, source dates, live query/country/language/time, actual lookups/costs, preparation effort, operator handoffs and limits.

Append two to four prose sentences to `log.md`. Done when every chosen bet is finished, or the no-action decision is recorded with its reopening trigger, and report, focus, bets and log agree.
