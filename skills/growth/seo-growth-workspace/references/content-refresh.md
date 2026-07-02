# Content Refresh And Decay

Use when existing pages/posts have declining traffic, stale facts, weak CTR, or old positioning.

## Inputs

- GSC query/page data for last 90 days and previous comparable period.
- Analytics landing-page data if available.
- Current page content and metadata.
- SERP/competitor sample for the target query.

## Refresh Matrix

| URL | Primary query | Decline/opportunity | Current position | Impressions | CTR | Problem | Refresh action | Impact |
| --- | ------------- | ------------------- | ---------------: | ----------: | --: | ------- | -------------- | ------ |

## Refresh, Consolidate, Or Remove

Decide per URL before acting:

| Signals | Action |
| --- | --- |
| Intent still matches; content stale or incomplete; page has impressions, links, or conversions | Refresh |
| Two or more pages compete for the same query; one is clearly stronger | Consolidate: 301 the weaker into the stronger, merge unique sections |
| No traffic, no links, no matching demand, off-strategy | Remove: 410 (or 301 to a relevant parent when links exist) |

Never bump `dateModified` or visible dates without substantive content change.

## Refresh Actions

- Rewrite title/meta for CTR.
- Add missing search intent sections.
- Update outdated dates, screenshots, product facts, pricing, or examples.
- Add internal links from newer/high-authority pages.
- Add schema where content supports it.
- Improve CTA alignment.

## Done Criteria

- Changes are deployed.
- Updated metadata/content verified live.
- GSC URL inspection or sitemap recrawl is requested only when useful.
- Follow-up review date is recorded.
