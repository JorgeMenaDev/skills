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
