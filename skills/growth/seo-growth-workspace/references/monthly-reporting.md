# Monthly SEO Reporting

Use for `monthly-report` mode.

## Default Data Windows

- Last 30 days vs previous 30 days for performance deltas.
- Last 90 days for context when GSC data is sparse or volatile.
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
- Content published or scheduled.
- Indexing/sitemap state.
- GBP/local state if applicable.
- The single most important action for next month.

When exported state is available, use `scripts/monthly-report.mjs` to build the first draft from:

- GSC current and previous rows.
- `.seo/backlog.md` counts.
- Keyword tier counts from the content engine.
- Content calendar scheduled/published/overdue counts.

If the monthly report state has not been assembled yet, use `scripts/monthly-state.mjs` first. It accepts current/previous GSC exports, `.seo/backlog.md`, keyword tier counts, and calendar snapshots, then writes the JSON input consumed by `monthly-report.mjs`.

If the target has a content engine, export keyword-tier and calendar snapshots through its established CLI, API, or admin export path. Record the command or source in the report without exposing secrets.

## Rules

- Prioritize calls, leads, qualified traffic, indexed pages, and money-page movement over vanity metrics.
- If conversion tracking is missing, make it a P1 backlog item.
- Do not over-interpret tiny datasets; label them as baseline or directional.
- A generated monthly report is a decision draft. Review wins, problems, and the single next action before sharing externally.
