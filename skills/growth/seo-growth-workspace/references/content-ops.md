# Content Operations

Use for content bets (`gap`, `underperformer`): keywords, clusters, blog calendars, briefs, article publishing, internal links, and content engines.

## Preflight Gates

1. Business context exists and includes audience, market, language, conversion path, and competitors.
2. Target project/domain exists in the content engine or is created intentionally.
3. Blog renderer or publishing destination exists before scheduling content.
4. Sitemap generation includes blog hub and generated posts.
5. Production backend/CLI and authenticated UI agree on project/calendar state.
6. Content-engine or publisher-bot repos have a local adapter in `.seo/adapters/` or equivalent strategy notes that map project, keyword, calendar, article, publish, and reconciliation proof commands.

If any gate fails, record a `defect` candidate before importing or scheduling content.

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

Choose with the common decision method in [review.md](review.md): business fit, demand, distinctive value, plausible gain, confidence and effort/capacity, compared with the strongest alternative. Engine keyword tiers may be routing metadata; they are not a second priority score.

## From intent to finished page

1. **Resolve the destination.** Inspect the live URL inventory, planned work, queued drafts and relevant query-to-page evidence. Choose keep, refresh, create or merge, with the buyer job and reason. Keyword/title similarity is a prompt to inspect, not proof of cannibalization. A queue item already serving the job is work to improve, not a reason to create its duplicate.
2. **Gather proof.** Fetch the sources supporting material claims and inspect available first-hand product/customer evidence. State the distinctive contribution. Collect missing proof with a bounded demonstration, documented test or exact expert question. Draft only what the evidence supports; [pages.md](pages.md) owns the evidence gates.
3. **Plan before drafting.** Specify sections, the question each answers, sources/proof, real examples, intended links and the next useful customer action. Use an engine's native research and plan when available. Otherwise use [templates/content-plan.md](../templates/content-plan.md), linking the existing page evidence instead of copying it.
4. **Produce and edit.** Build the tool/page or write the complete draft, then review factual support, intent coverage, useful differences, voice and readability. Revise the specific failures. A section outline or instruction to write an article is not a finished draft. Record an unresolved evidence/implementation dependency rather than fabricating a result.
5. **Connect and deliver.** Prepare contextual incoming and outgoing link edits with [internal-linking.md](internal-linking.md), and the CTA/destination with [conversion.md](conversion.md). Continue through [ship.md](ship.md) for the existing publish process, rendered proof and measurement. If another actor must approve or execute, provide the exact revision and completed package.

The work package can be an engine revision, product PR or dated report. Reuse those records. A separate document is unnecessary when they already contain the plan, evidence, copy/code, link edits and handoff.

## Competitor Demand Gaps

Use this when competitors rank for useful demand that the target does not yet capture. Use GSC, a paid keyword/content-gap tool, manual SERP review, or competitor pages; record the source and limitation.

| Keyword | Competitor URL | Buyer stage | Volume/difficulty if known | Existing / queued destination | Missing value | Action |
| --- | --- | --- | --- | --- | --- | --- |

Actions: keep, refresh, create, merge, improve queued content, add internal links or defer. Do not import every gap; keep only topics with product fit, buyer intent, and a plausible route to ranking or conversion.

## Utility / Free Tool Pages

When competitor or keyword research shows task-completion demand, consider a real utility page before a blog post. Good candidates are calculators, generators, checkers, formatters, analyzers, templates, or curated examples that solve the query on-page and naturally lead to the product.

Load `utility-tool-pages.md` (its Plan artifact section owns the plan shape) when creating more than one utility page or a tools hub. Do not treat empty forms, thin AI wrappers, or keyword-swapped generators as publish-ready content.

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

### Page-evidence publish gate

For every new or materially revised SEO page, apply [Page Evidence](pages.md) before drafting/import and again before publish. Material factual claims must trace to fetched original sources; assistants may discover sources but are not final authority when an original exists. A reachable URL is not proof that it supports a claim. Start with statistics, dates, prices, legal/regulatory assertions, comparative claims, and named third-party assertions; record dated checks for time-sensitive evidence and use short paraphrased support notes or locators, not long copied passages.

The evidence belongs to the exact page revision. Engine-native revision evidence is authoritative when available; otherwise use the dated per-page fallback defined there. Publish only when the page has credible information gain, applicable claim/voice/asset support, an immutable rights snapshot, and human approval. Completion also requires rendered-citation survival through the delivery check. Do not publish, schedule, or auto-publish past a failed gate.

Naturalness self-check before publish:

- Em-dashes: more than ~1 per page reads machine-written; prefer commas/parentheses.
- Cut stock openers/transitions: "in today's fast-paced world", "it's worth noting", "at its core", "in conclusion".
- Cut filler intensifiers: very, truly, ultimately, significantly, seamlessly.
- Vary sentence length and paragraph rhythm; uniform blocks read generated.
- Avoid listicle-itis: prose where prose serves; lists only for list-shaped content.
- Avoid template constructions: "whether you're X, Y, or Z", "it's not just X, it's Y".
- Read a sample aloud; revise anything you would not say to a colleague.

## Report output

Link the completed engine revision or [templates/content-plan.md](../templates/content-plan.md), with destination decision, proof, section plan, draft/build, exact link edits, CTA and execution handoff. Include source/command and limits. For calendar work, also record actual scheduled rows, next item, destination and UI/backend mismatches. Counts or a calendar alone do not complete a page bet.

## Content Engine Bridge

When the target uses a content engine:

- Read the site's adapter note (`adapters/` in the workspace) before creating, importing or scheduling content work.
- If the engine pushes finished articles to the target via webhook, build or audit the receiving endpoint with `references/content-engine-webhooks.md`.
- Store durable project config and keyword batches in the target repo's established content-engine paths.
- Prefer a small import script for repeatability.
- Use the repo's CLI/status commands to verify tiers/calendar/status.
- Do not print API keys, admin keys, or provider secrets.

## Community-source publication

When the deliverable publishes a synthesis of community material, load [community-source-pages.md](community-source-pages.md). Ordinary demand research does not load that publication procedure.
