---
name: seo-growth-workspace
description: "Use when growing organic search traffic for a product or local-business website: weekly SEO review, deciding what to build or fix next for search, sizing search opportunities, shipping SEO bets, traffic drops, AI-search visibility, and the monthly SEO scoreboard. Triggers: \"SEO review\", \"what should we do for SEO\", \"why am I not ranking\", \"my traffic dropped\", \"set up SEO\", \"monthly SEO report\", \"how do we show up in ChatGPT\". Keeps a .seo workspace per site (one repo, or a hub of many sites), picks one to three evidence-backed bets a week, ships them, and stops lanes that do not earn clicks."
version: 8.0.1
license: MIT
mutating: true
writes_to: [".seo/"]
---

# SEO Growth Workspace

The job is more qualified visitors from search. Every run does one of three things: finds the next bets, ships one, or keeps score. Work that does none of those is out of scope, however tidy it looks.

## Contract

1. **Bets, not tickets.** Work lives in `bets.md` as a few open bets, each with a hypothesis, a size, a check date and a kill rule. At most three unshipped bets per site.
2. **Demand before effort.** A bet that creates or rewrites a page names the demand it serves: Search Console rows for demand the site already touches, a volume estimate or live result check for demand it does not.
3. **Score lanes, not URLs.** A bet is checked once, at its check date. Pages without a bet are judged as a lane (a URL group such as `/blog`) in the review and the scoreboard, never one by one.
4. **Stop what does not earn.** Every review names the lanes to keep, cut or re-point, using the lane table in the data pack.
5. **Honest evidence.** Follow the evidence rules below in every report, bet and log line.

## Workspace

```text
.seo/                        standalone: one site; hub: HUB_ROOT with registry.md and sites/<slug>/
  context.md    business, market, conversions, brand terms, approval boundary, data access
  strategy.md   dated owner decisions that constrain bets
  bets.md       open and closed bets
  research.md   log of paid lookups, reused for 30 days
  log.md        one short prose entry per run
  reports/      review-YYYY-MM-DD.md, scoreboard-YYYY-MM.md, data/ (raw exports)
```

SITE_WORKSPACE is the one site folder a run works in, and `.seo/<file>` in any reference means `SITE_WORKSPACE/<file>`. SKILL_DIR is this skill's folder. Setup, hub layout and migration from v7: [references/setup.md](references/setup.md).

## Modes

| Mode | Use when | Read first | Done when |
| --- | --- | --- | --- |
| `review` | Weekly, or "what should we do for SEO", or traffic dropped | [references/review.md](references/review.md) | Review report written, `bets.md` updated, log entry added |
| `ship` | A bet is approved | [references/ship.md](references/ship.md) | Bet live and verified, baseline and check date recorded |
| `scoreboard` | First days of a month | [references/scoreboard.md](references/scoreboard.md) | Scoreboard report written with lane calls |
| `setup` | No `.seo/`, a new hub site, or a v7 workspace | [references/setup.md](references/setup.md) | Workspace files exist and Search Console access is proven |

Read the mode's reference in full before its first step. Data sources, commands and costs: [references/data.md](references/data.md).

## Evidence rules

- Label every number: **observed** (Search Console, analytics, a live fetch; with dates), **estimate** (third-party volume, difficulty or traffic; with provider, market and date) or **hypothesis**.
- Partial data is never a zero and never an all-clear. Search Console withholds anonymized queries and lags two to three days; state what share of clicks the query rows cover.
- A ranking claim needs a live result check with query, country, language and time. One check is a sample, not a baseline.
- Size opportunities as scenarios with a stated click share. Search volume is not visits. Never promise rankings, traffic or AI citations.
- Outcome chain: impression → click → visit → qualified outcome (signup, demo, booking) → customer → revenue. No arrow implies causation.
- Keep secrets out of every file and message.

## Unattended runs

A scheduled or delegated run reads anything, writes only SITE_WORKSPACE, and ends with its report. It proposes bets and never publishes, deploys, requests indexing, changes content-engine schedules or sends outreach; that work becomes a bet with status `proposed`. In a hub the prompt names the site; a missing workspace or unnamed site ends the run as blocked. The last line of the run is one JSON object:

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
- Content engine (SuperaSEO or another webhook publisher): [content-engine-webhooks.md](references/content-engine-webhooks.md).
