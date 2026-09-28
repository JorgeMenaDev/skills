# Content Operations

Use for content bets (`gap`, `underperformer`): keyword research, destination choice, drafting, editing and internal links. A site with a content engine also follows [content-engine-webhooks.md](content-engine-webhooks.md) for its adapter, calendar and publishing.

## Keyword Research

Seed from both current performance and outside demand, within the review budget:

1. First-party Search Console data: the "Non-brand queries with demand" table in the latest data pack (`scripts/review-data.mjs`), which lists queries already earning impressions.
2. Competitor demand gaps (matrix below).
3. Utility/tool opportunities: calculators, generators, checkers, formatters, templates, and public datasets where the SERP intent is task completion; load `utility-tool-pages.md` before planning these.
4. Community demand research: manually inspect relevant forums and Q&A sources for questions and frustrations. This is research input only; publishing an owned synthesis of community material is a separate specialist surface governed by [Community-source pages](community-source-pages.md).
5. Support tickets and sales-call questions/objections.

Validate each candidate against the live SERP: what ranks, in what format (guide, listicle, tool, comparison), which SERP features. Write only where the format matches intent and you can add information gain.

Buyer-stage modifiers:

| Stage          | Example modifiers                 |
| -------------- | --------------------------------- |
| Awareness      | what is, how to, guide to         |
| Consideration  | best, top, vs, alternatives       |
| Decision       | pricing, reviews, demo, trial     |
| Implementation | template, tutorial, setup, how to use |

Choose with the judgment method in [review.md](review.md). Engine keyword tiers are routing metadata only.

## From intent to finished page

1. **Complete the evidence brief** in [pages.md](pages.md), including its destination decision and the first-hand proof it asks you to collect.
2. **Plan before drafting.** Specify sections, the question each answers, sources/proof and real examples. Use the engine's native plan when available; otherwise the package template [templates/content-plan.md](../templates/content-plan.md).
3. **Produce and edit.** Build the tool or page, or write the complete draft, then review factual support, intent coverage, distinctive value, voice and readability, and revise the specific failures.
4. **Connect and deliver.** Prepare contextual incoming and outgoing link edits with [internal-linking.md](internal-linking.md), and the CTA and destination with [conversion.md](conversion.md). Continue through [ship.md](ship.md) to finished.

## Competitor Demand Gaps

Use this when competitors rank for useful demand that the target does not yet capture. Use GSC, a paid keyword/content-gap tool, manual SERP review, or competitor pages; record the source and limitation.

| Keyword | Competitor URL | Buyer stage | Volume/difficulty if known | Existing / queued destination | Missing value | Action |
| --- | --- | --- | --- | --- | --- | --- |

Actions: keep, refresh, create, merge, improve queued content, add internal links or defer. Keep only topics with product fit, buyer intent and a plausible route to ranking or conversion.

## Utility / Free Tool Pages

When competitor or keyword research shows task-completion demand, consider a real utility page before a blog post. Good candidates are calculators, generators, checkers, formatters, analyzers, templates, or curated examples that solve the query on-page and naturally lead to the product.

Load `utility-tool-pages.md` (its Plan artifact section owns the plan shape) when creating more than one utility page or a tools hub. Do not treat empty forms, thin AI wrappers, or keyword-swapped generators as publish-ready content.

## E-E-A-T

Check, and build where missing:

- Author pages with real credentials, linked from every article; `Person` schema with `sameAs`.
- First-hand-experience proof in articles: real screenshots, test data, named examples.
- Editorial standards page (review process, corrections policy); honest bylines and dates (see `references/content-refresh.md`).

## Publish Gate

A human reviews every published article for added value. Automated calendar publishing without a per-article value check is a policy risk: Google's scaled content abuse policy (March 2024) targets publishing many pages without added value, regardless of how they were produced. Its sibling, the site-reputation-abuse policy (algorithmic enforcement since November 2024), targets third-party or partner content published to exploit a host domain's ranking signals — relevant when running sponsored or partner content across sites.

Every new or materially revised page passes [pages.md](pages.md): its evidence brief before drafting and its launch gates before publish.

Naturalness self-check before publish:

- Em-dashes: more than ~1 per page reads machine-written; prefer commas/parentheses.
- Cut stock openers/transitions: "in today's fast-paced world", "it's worth noting", "at its core", "in conclusion".
- Cut filler intensifiers: very, truly, ultimately, significantly, seamlessly.
- Vary sentence length and paragraph rhythm; uniform blocks read generated.
- Avoid listicle-itis: prose where prose serves; lists only for list-shaped content.
- Avoid template constructions: "whether you're X, Y, or Z", "it's not just X, it's Y".
- Read a sample aloud; revise anything you would not say to a colleague.

## Community-source publication

When the deliverable publishes a synthesis of community material, load [community-source-pages.md](community-source-pages.md). Demand research alone does not need it.
