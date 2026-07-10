# Monthly SEO Reporting

Use for `monthly-report` mode.

## Default Data Windows

- Last 30 days vs previous 30 days for performance deltas.
- Last 90 days for context when GSC data is sparse or volatile.
- Year-over-year (same month last year) when 13+ months of data exist; 30d-vs-30d alone is seasonality-naive.
- Record exact dates, property names, and data source limitations.

## Data Sources

| Need                         | Preferred                | Fallback                                    |
| ---------------------------- | ------------------------ | ------------------------------------------- |
| Organic queries/pages        | GSC API/export           | Browser-visible GSC snapshot                |
| Organic sessions/conversions | GA4                      | Available web analytics                     |
| Local actions                | GBP insights             | Public GBP review/photo/listing evidence    |
| Rankings/opportunities       | GSC + paid tools         | Manual SERP/competitor inspection           |
| Deploy/content state         | Hosting dashboard + repo | CLI/status commands                         |

## One-Page Report

Use `templates/monthly-report.md`. Include:

- 3 wins.
- 3 problems.
- Top query/page movers.
- Branded vs non-branded clicks/impressions split.
- Indexed-page-count trend.
- Core-update annotation: note any Google core update inside the window before attributing deltas.
- Content published or scheduled.
- Indexing/sitemap state.
- GBP/local state if applicable.
- The single most important action for next month.

When exports are available, draft it in one command:

```bash
node "$SKILL_DIR/scripts/monthly-report.mjs" --gsc-current <rows.json> --gsc-previous <rows.json> \
  --backlog "$SITE_WORKSPACE/backlog.md" --brand "acme,acme app" --keyword-tiers <file> --calendar <file> --output <report.md>
```

Always pass `--brand` with known branded terms: branded queries stay in the topline totals but are excluded from problem selection and the single next action, so a branded high-impression low-CTR query is never misdiagnosed as a title problem.

Missing inputs become recorded gaps, not fabricated numbers. When GSC exports are genuinely unavailable, pass `--allow-missing-gsc` to produce a partial report banner-marked `partial — GSC exports unavailable` instead of failing; fill the GSC-derived sections from repo/public evidence per No-Mutation Validation below. If the target has a content engine, export keyword-tier and calendar snapshots through its established CLI, API, or admin export path. Record the command or source in the report without exposing secrets.

## Portfolio Reporting

`$SKILL_DIR/scripts/monthly-report.mjs` reports one target per run. For a portfolio, do not blend sites into one report:

- Iterate the registry (`references/portfolio-registry.md`), one target per run, writing one dated report per site into that site's `.seo/reports/` (hub mode: `.seo/sites/<slug>/reports/`).
- Then build one cross-site rollup from `templates/portfolio-index.md`, using `node "$SKILL_DIR/scripts/portfolio-status.mjs" --registry <file>` for the ranked table. In hub mode the rollup lives at the hub's `.seo/portfolio-index.md`.
- Link the per-site reports from the index; never merge their metrics. Ticket IDs, deltas, and next actions stay per-site.

## No-Mutation Validation

In read-only or no-access runs, do not force a monthly report when current/previous GSC, analytics, or content-engine exports are unavailable. Instead:

- Record which data sources were not checked by constraint.
- Use repo/public evidence and existing `.seo/reports/*` as historical context.
- Mark monthly reporting as `partial` if no fresh comparable data exists.

## Rules

- Prioritize calls, leads, qualified traffic, indexed pages, and money-page movement over vanity metrics.
- Impressions can grow while clicks fall for several reasons. Separate query mix, ranking/snippet changes, and SERP-composition hypotheses; standard GSC Performance alone cannot prove AI Overviews absorbed the clicks. Use the rollout-limited Generative AI export when the property visibly has it, or label the hypothesis unconfirmed.
- If conversion tracking is missing, make it a P1 backlog item.
- Do not over-interpret tiny datasets; label them as baseline or directional.
- A generated monthly report is a decision draft. Review wins, problems, and the single next action before sharing externally.
