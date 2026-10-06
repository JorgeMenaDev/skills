---
name: seo-growth-workspace
description: "Use when growing organic search traffic for a product or local-business website: weekly SEO review, deciding what to build or fix next for search, sizing search opportunities, shipping SEO bets, traffic drops, AI-search visibility, and the monthly SEO scoreboard. Triggers: \"SEO review\", \"what should we do for SEO\", \"why am I not ranking\", \"my traffic dropped\", \"set up SEO\", \"monthly SEO report\", \"how do we show up in ChatGPT\". Keeps a .seo workspace per site (one repo, or a hub of many sites), connects business goals and demand discovery to finished work, distribution, conversion and measured learning."
version: 9.2.0
license: MIT
mutating: true
writes_to: [".seo/"]
---

# SEO Growth Workspace

The job is to attract people the business can serve and help them take a useful next step. Work through one cycle: business constraint → customer evidence and demand → focused opportunity → finished work → distribution and conversion → learning. A review takes its chosen bets to **finished**, executing what existing authorization allows.

## Contract

1. **Keep a current focus.** `strategy.md` names the customer, business outcome, constraint, chosen opportunity and capacity, grounded in owner decisions. Unknown outcomes stay unknown.
2. **Discover beyond current rankings.** Active growth reviews combine site performance with bounded outside demand and buyer evidence. Maintenance and owner pauses still govern effort.
3. **Finish chosen bets.** Each chosen bet ends the run `live`, as a `package` at its execution owner, or as an `evidence request`. Definitions: [references/ship.md](references/ship.md).
4. **Keep few bets moving.** At most three unshipped bets per site. Live bets awaiting results leave those slots free. Defer independent work only for a stated capacity, owner or interference reason.
5. **Learn before expanding.** Check outcomes when due, distinguish delivery from business results, and judge URL groups by maturity, purpose and qualified outcomes as well as clicks. Record the next decision that changes.
6. **Use honest evidence.** Follow the rules below in every report, bet and log line.

## Workspace

```text
.seo/                        standalone: one site; hub: HUB_ROOT with registry.md and sites/<slug>/
  context.md    business, market, conversions, brand terms, approval boundary, data access
  strategy.md   current focus and dated owner decisions that constrain bets
  bets.md       open and closed bets
  research.md   log of paid lookups, reused for 30 days
  log.md        one short prose entry per run
  reports/      review-YYYY-MM-DD.md, scoreboard-YYYY-MM.md, data/ (raw exports)
```

SITE_WORKSPACE is the one site folder a run works in, and `.seo/<file>` in any reference means `SITE_WORKSPACE/<file>`. SKILL_DIR is this skill's folder. Setup, hub layout and migration from v7: [references/setup.md](references/setup.md).

## Modes

| Mode | Use when | Read first | Done when |
| --- | --- | --- | --- |
| `review` | Weekly, or "what should we do for SEO", or traffic dropped | [references/review.md](references/review.md) | Every chosen bet finished, or no-action recorded with its trigger; report, bets and log agree |
| `ship` | A chosen bet needs preparation or authorized execution | [references/ship.md](references/ship.md) | The bet is finished |
| `scoreboard` | First days of a month | [references/scoreboard.md](references/scoreboard.md) | Scoreboard report written with lane calls |
| `setup` | No `.seo/`, a new hub site, or a v7 workspace | [references/setup.md](references/setup.md) | Workspace files exist and Search Console access is proven |

Read the mode's reference in full before its first step. Data sources, commands and costs: [references/data.md](references/data.md).

## Evidence rules

- Label every number: **observed** (Search Console, analytics, a live fetch; with dates), **estimate** (third-party volume, difficulty or traffic; with provider, market and date) or **hypothesis**.
- Partial data is never a zero and never an all-clear. Search Console withholds anonymized queries and lags two to three days; state what share of clicks the query rows cover.
- Unavailable evidence and unknown costs are written as unknown, with what would supply them.
- A ranking claim needs a live result check with query, country, language and time. One check is a sample, not a baseline.
- Size opportunities as scenarios with a stated click share. Search volume is not visits. Never promise rankings, traffic or AI citations.
- Outcome chain: impression → click → visit → qualified outcome (signup, demo, booking) → customer → revenue. No arrow implies causation, and before/after movement alone is not causal proof.
- Keep secrets out of every file and message.

## Unattended runs

Scheduled and delegated runs follow the same method and existing authority as interactive runs. Read the site's approval boundary and the run's explicit restrictions before acting. Prepare work in SITE_WORKSPACE or the authorized repository; execute through the existing owner and ship process when authorized. A schedule alone grants no publication, deployment, indexing, engine-setting or outreach permission. Outreach needs explicit authorization. Work the run may not execute ends as a `package`. In a hub the prompt names the site; a missing workspace or unnamed site ends the run as blocked. The last line of the run is one JSON object:

```json
{"status":"ok|alerted|blocked","site":"…","mode":"review","next_move":"one line","bets_opened":[],"bets_resolved":[],"needs_owner":[]}
```

`alerted` means a live check failed, or a lane with at least 10 clicks in the previous window lost more than half of them.

## Domain references

Load one only when a bet needs it:

- New or revised public page (always): [pages.md](references/pages.md) launch gates. Comparisons, pricing, affiliate: [commercial-integrity.md](references/commercial-integrity.md).
- Page ideas and briefs: [content-ops.md](references/content-ops.md), [utility-tool-pages.md](references/utility-tool-pages.md), [pseo-gates.md](references/pseo-gates.md), [content-refresh.md](references/content-refresh.md).
- Search Console diagnosis, drops, cannibalisation: [search-console.md](references/search-console.md).
- Crawl, indexing, metadata, speed: [technical-seo.md](references/technical-seo.md), [schema-rich-results.md](references/schema-rich-results.md), [international-seo.md](references/international-seo.md), [internal-linking.md](references/internal-linking.md), [ecommerce-seo.md](references/ecommerce-seo.md).
- Visitors who do not convert, organic outcomes: [conversion.md](references/conversion.md).
- Links, listings, entity: [backlinks-entity.md](references/backlinks-entity.md). Local and Google Business Profile: [local-seo-gbp.md](references/local-seo-gbp.md).
- AI answers and citations: [ai-search-visibility.md](references/ai-search-visibility.md). Competitors: [competitor-profiling.md](references/competitor-profiling.md).
- Content engine (SuperaSEO or another) adapter, calendar and webhook publishing: [content-engine-webhooks.md](references/content-engine-webhooks.md).
