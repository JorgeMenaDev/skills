# Content Operations

Use for `content-ops` mode: keywords, clusters, blog calendars, briefs, article publishing, internal links, and content engines.

## Preflight Gates

1. Business context exists and includes audience, market, language, conversion path, and competitors.
2. Target project/domain exists in the content engine or is created intentionally.
3. Blog renderer or publishing destination exists before scheduling content.
4. Sitemap generation includes blog hub and generated posts.
5. Production backend/CLI and authenticated UI agree on project/calendar state.
6. Content-engine or publisher-bot repos have a local adapter in `.seo/adapters/` or equivalent strategy notes that map project, keyword, calendar, article, publish, and reconciliation proof commands.

If any gate fails, create a blocker or technical ticket before importing/scheduling content.

## Keyword Research

Seed sources, strongest evidence first:

1. First-party GSC data: `node scripts/gsc-opportunities.mjs --format backlog` — queries already earning impressions.
2. Competitor demand gaps (matrix below).
3. Utility/tool opportunities: calculators, generators, checkers, formatters, templates, and public datasets where the SERP intent is task completion; load `utility-tool-pages.md` before planning these.
4. Community mining: `site:reddit.com <topic>` and `site:quora.com <topic>` — questions, frustrations, upvoted answers.
5. Support tickets and sales-call questions/objections.

Validate each candidate against the live SERP: what ranks, in what format (guide, listicle, tool, comparison), which SERP features. Write only where the format matches intent and you can add information gain.

Buyer-stage modifiers:

| Stage          | Example modifiers                 |
| -------------- | --------------------------------- |
| Awareness      | what is, how to, guide to         |
| Consideration  | best, top, vs, alternatives       |
| Decision       | pricing, reviews, demo, trial     |
| Implementation | template, tutorial, setup, how to use |

Score each candidate 1-10 per factor:

| Factor             | Weight | Ask                                                              |
| ------------------ | -----: | ---------------------------------------------------------------- |
| Customer impact    |    40% | How often/intensely this pain appears in tickets, calls, research |
| Content-market fit |    30% | Maps to what the product solves; unique insight available         |
| Search potential   |    20% | Volume, competitiveness, long-tail room                           |
| Resources          |    10% | Expertise and assets already on hand                              |

`priorityScore = 0.4*impact + 0.3*fit + 0.2*search + 0.1*resources`

The old backlog-to-keywords script is removed; extracting keywords from `.seo/backlog.md` is agent judgment guided by this rubric.

## Keyword Batch Shape

Recommended columns/fields:

`id`, `keyword`, `cluster`, `difficulty`, `difficultyTier`, `volumeBucket`, `contentType`, `intent`, `buyerStage`, `relevance`, `priorityScore`, `priorityTier`, `status`.

Prioritize P1 keywords that combine commercial relevance, product fit, and realistic difficulty. Keep P2/P3 for expansion.

## Competitor Demand Gaps

Use this when competitors rank for useful demand that the target does not yet capture. Use GSC, a paid keyword/content-gap tool, manual SERP review, or competitor pages; record the source and limitation.

| Keyword | Competitor URL | Buyer stage | Volume/difficulty if known | Existing page | Action | Priority |
| --- | --- | --- | --- | --- | --- | --- |

Actions: optimize an existing page, create a page/article, import to the content engine, add internal links, defer. Do not import every gap; keep only topics with product fit, buyer intent, and a plausible route to ranking or conversion.

## Utility / Free Tool Pages

When competitor or keyword research shows task-completion demand, consider a real utility page before a blog post. Good candidates are calculators, generators, checkers, formatters, analyzers, templates, or curated examples that solve the query on-page and naturally lead to the product.

Load `utility-tool-pages.md` and use `templates/utility-tool-page-plan.md` when creating more than one utility page or a tools hub. Do not treat empty forms, thin AI wrappers, or keyword-swapped generators as publish-ready content.

## Calendar Verification

After seeding a lane, verify:

- Keyword tier counts.
- Scheduled rows with dates, locale/lane, status, content type, and keyword.
- UI visibility in the production workspace.
- Next planned item or processing queue status.
- Blog route and sitemap behavior.

## E-E-A-T

Check, and build where missing:

- Author pages with real credentials, linked from every article; `Person` schema with `sameAs`.
- First-hand-experience proof in articles: real screenshots, test data, named examples.
- Editorial standards page (review process, corrections policy); honest bylines and dates (see `references/content-refresh.md`).

## Publish Gate

A human reviews every published article for added value. Automated calendar publishing without a per-article value check is a policy risk: Google's scaled content abuse policy (March 2024) targets publishing many pages without added value, regardless of how they were produced. Its sibling, the site-reputation-abuse policy (algorithmic enforcement since November 2024), targets third-party or partner content published to exploit a host domain's ranking signals — relevant when running sponsored or partner content across sites.

Naturalness self-check before publish:

- Em-dashes: more than ~1 per page reads machine-written; prefer commas/parentheses.
- Cut stock openers/transitions: "in today's fast-paced world", "it's worth noting", "at its core", "in conclusion".
- Cut filler intensifiers: very, truly, ultimately, significantly, seamlessly.
- Vary sentence length and paragraph rhythm; uniform blocks read generated.
- Avoid listicle-itis: prose where prose serves; lists only for list-shaped content.
- Avoid template constructions: "whether you're X, Y, or Z", "it's not just X, it's Y".
- Read a sample aloud; revise anything you would not say to a colleague.

## Report Output

Use `templates/content-plan.md`. Include:

- Data source and script/command used.
- Keyword tier counts.
- Scheduled P1 topics.
- Publish destination and route pattern.
- UI/backend mismatches.
- Next article or review action.

## Content Engine Bridge

When the target uses a content engine:

- Load `references/adapters.md` and the repo's local adapter before creating/importing/scheduling content work.
- If the engine pushes finished articles to the target via webhook, build or audit the receiving endpoint with `references/content-engine-webhooks.md`.
- Store durable project config and keyword batches in the target repo's established content-engine paths.
- Prefer a small import script for repeatability.
- Use the repo's CLI/status commands to verify tiers/calendar/status.
- Do not print API keys, admin keys, or provider secrets.
