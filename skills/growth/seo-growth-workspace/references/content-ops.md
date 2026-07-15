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

1. First-party GSC data: `node "$SKILL_DIR/scripts/gsc-opportunities.mjs" --input "$SITE_WORKSPACE/reports/gsc-latest.json" --format backlog` — queries already earning impressions.
2. Competitor demand gaps (matrix below).
3. Utility/tool opportunities: calculators, generators, checkers, formatters, templates, and public datasets where the SERP intent is task completion; load `utility-tool-pages.md` before planning these.
4. Community demand research: manually inspect relevant forums and Q&A sources for questions and frustrations. This is research input only; publishing an owned synthesis of community material is a separate specialist surface governed by [Community-source Pages](community-source-pages.md).
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

### Page-evidence publish gate

For every new or materially revised SEO page, apply [Page Evidence](page-evidence.md) before drafting/import and again before publish. Material factual claims must trace to fetched original sources; assistants may discover sources but are not final authority when an original exists. A reachable URL is not proof that it supports a claim. Start with statistics, dates, prices, legal/regulatory assertions, comparative claims, and named third-party assertions; record dated checks for time-sensitive evidence and use short paraphrased support notes or locators, not long copied passages.

The evidence belongs to the exact page revision. Engine-native revision evidence is authoritative when available; otherwise use the dated per-page fallback defined there. Publish only when the page has credible information gain, applicable claim/voice/asset support, an immutable rights snapshot, and human approval. Completion also requires rendered-citation survival through the delivery check. Do not publish, schedule, or auto-publish past a failed gate.

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

## Community-source pages

> **Dogfood status:** fixture-validated only — not yet exercised against a live operation. Keep this path out of any dogfooded-completion claim until its manual gates pass on a named live target.

Use this contract only for an owned page that synthesizes manually accessed, **publicly accessible** community sources: forums, Reddit-like communities, and Q&A sites readable without membership, login, or invitation. Access-controlled conversations (private Discord/Slack workspaces, members-only forums, closed groups) are NOT publishable sources by default — being a member does not grant republication rights. Access-controlled content may be used only with explicit, recorded authorization from both the author of each used message and the community's owner/administrator, and it still follows every attribution, redaction, and removal rule below. Community language used only for demand research remains governed by [Content Operations](content-ops.md).

Use the vocabulary in [Evidence Conventions](evidence-conventions.md). Use [Page Evidence](page-evidence.md) for substantiation, information gain, revision approval, and the publish gate. When a page has commercial elements, use [Commercial Integrity](commercial-integrity.md) for selection methodology, disclosure, and the anti-authority-rental boundary. Those shared contracts own their rules; this reference adds only community-specific requirements.

## Community-source publishing contract

Before drafting, record a dated demand signal beyond a community brand appended to a keyword: relevant Search Console queries, recurring customer language, multiple relevant discussions, a live-SERP observation, or customer research showing a synthesis need. Record the query and intent, locale, source/date, product relevance, overlapping owned URLs, and cannibalization risk.

Select a diverse, non-cherry-picked source set. A page must synthesize multiple relevant threads or discussions and, where available, multiple authors, dates, viewpoints, disagreements, negative evidence, and meaningful alternatives. Record communities and sources considered, date range, inclusion and exclusion criteria, and why the selected set is representative enough for the page's stated purpose. Never condition selection on praise for the publisher. A page depending on a single thread or discussion fails.

For every used source, record these attribution fields in the existing page revision evidence or a dated report:

- Platform or community
- Thread title and direct thread/permalink
- Public author handle, or `redacted — sensitive context`
- Source publication date when visible
- Date accessed
- Use type: `quote`, `paraphrase`, or `analysis input`
- Section or claim supported
- Verification/removal status and last checked date

Structure the page so **Quote**, **Paraphrase**, and **Publisher analysis** are explicitly labelled or otherwise unambiguous and editorially separate. Quotes must be minimal, necessary, directly attributed, and linked to their source. Paraphrases must not mimic source wording or imply endorsement. Publisher analysis must be the page's own page-specific synthesis, categorization, comparison, testing, decision criteria, or other information gain; it must not be presented as community consensus. Do not imply platform affiliation or endorsement.

Every community-source page also carries two explicit, visible disclosures regardless of whether it is classified as commercial: a statement that the source community/platform does not endorse the publisher or its product, and a statement of the publisher's relationship to the product, service, or topic discussed. These are affirmative page requirements — a page without both fails the publish gate. Commercial elements additionally trigger the full [Commercial Integrity](commercial-integrity.md) contract.

### Privacy, deletion, and maintenance

Use no personal information beyond a public handle needed for attribution. Redact the handle when the author is identifiable in a sensitive context, and omit incidental names, locations, contact details, health, financial, employment, or other identifying details that are unnecessary to the synthesis.

Honor source deletion and author removal requests. Publish a monitored contact route and use this source-removal workflow:

1. Record the request or detected deletion, received/detected date, requester or detection method, affected permalink, page/section, owner, and status in the existing dated report or backlog; store no unnecessary requester PII.
2. Acknowledge a direct request and assess dependency within **2 business days**.
3. Remove the quote, attribution, and identifying detail promptly; rework or remove every dependent page section within **5 business days**. If safe rework cannot finish in that window, unpublish or noindex the affected page until it can.
4. Re-run the page-evidence publish gate for the revised page and verify rendered links and citations.
5. Record the completed action, outcome, completion date, verifier, and any remaining follow-up in the same existing record.

Periodically verify source availability and material edits on the topic-appropriate refresh cadence. A deleted, materially changed, or unmaintainable source cannot remain as support. This is an operational publication policy, not jurisdictional legal advice; escalate disputes that need legal judgment.

### Bounded pilot and pre-registration

The pilot is capped at **1–3 pages maximum**. Before any pilot page is published, pre-register one immutable plan covering the exact page set. Pre-registration means the review dates, metrics, go/no-go criteria, and rollback rules cannot be redefined after results are seen. Corrections may be appended with author, date, and reason, but the original remains visible and governs the pilot decision.

Record before publication: exact query/intent; locale/device/date; dated Google/Bing and relevant community-result baselines; existing URLs/cannibalization risk; user-value hypothesis; business relevance; source-selection method; applicable conflict/disclosure review; and the fixed query set for any assistant observations. Pre-register reviews at **week 2**, **week 4**, **week 8**, and **week 12**, with an owner and calendar date for each.

At every gate, record per page: indexed/canonical state; impressions, clicks, CTR, average position, and query diversity; cannibalization; scroll/engagement, source-link clicks, and exits; CTA and direct/assisted conversions where observable; assistant citations only against the fixed dated query set; relevant referral traffic; complaints and source-removal requests; brand/community harm; and editorial maintenance cost. Keep missing data `Unknown`.

The pre-registered go/no-go criteria must require durable visibility across multiple reviews, useful engagement relative to comparable content, no material cannibalization, no material privacy/integrity complaint, plausible conversion contribution where relevant, and sustainable maintenance cost. Indexation or impressions alone never pass a gate. At each review choose and evidence `continue unchanged`, `rework`, `consolidate`, `noindex`, or `remove`.

The week-12 gate passes expansion only when all pre-registered criteria pass. No expansion past three pages is permitted before that pass **and explicit operator approval**. Otherwise stop expansion and apply the pre-registered rollback action. No useful signal by week 12, intent failure, cannibalization, stale/unmaintainable sources, misleading positioning, or material privacy/integrity complaints require rework, consolidation, noindex, or removal as registered.

### Prohibitions and assertable failure rules

- **No scraping:** gather sources only through manual, lawful access; do not bulk copy comments or use opaque indexers.
- **No covert participation:** no astroturfing, undisclosed publisher participation, posting to farm quotes, manufactured questions, or engagement designed to create source material.
- **No parasite publishing:** do not rent third-party authority or use artificial discovery/link networks; apply the [Commercial Integrity anti-authority-rental boundary](commercial-integrity.md#anti-authority-rental-boundary).
- Every page must pass the [Page Evidence publish and delivery gate](page-evidence.md#publish-and-delivery-gate), and every page with commercial elements must also pass [Commercial Integrity](commercial-integrity.md).
- No ranking-time, traffic, conversion, revenue, or AI-citation guarantee; no broad rollout based only on anecdote, indexation, or impressions.
- **Anti-token-swap assertion:** reject two or more pages that share a template or substantially identical section logic while swapping the keyword, community name, threads, or quotes. Each page must have a page-specific source set, page-specific analysis, and page-specific information gain. If any of those three is interchangeable between proposed pages, every affected page fails publication.

Use existing homes only: revision evidence or dated reports for sources, reviews, and removal outcomes; `.seo/backlog.md` for follow-up. For mechanics already owned elsewhere, use [Search Console](search-console.md), [AI Search Visibility](ai-search-visibility.md), [Internal Linking](internal-linking.md), [Content Refresh](content-refresh.md), [Technical SEO](technical-seo.md), [Backlinks and Entity Authority](backlinks-entity.md), and [pSEO Gates](pseo-gates.md) rather than duplicating their workflows.
