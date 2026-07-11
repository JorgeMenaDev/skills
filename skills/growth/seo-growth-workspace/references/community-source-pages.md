# Community-source pages

> **Dogfood status:** fixture-validated only — not yet exercised against a live operation. Keep this path out of any dogfooded-completion claim until its manual gates pass on a named live target.

Use this contract only for an owned page that synthesizes lawfully and manually accessed forums, Reddit-like communities, Q&A sites, or accessible Discord/Slack archives. Community language used only for demand research remains governed by [Content Operations](content-ops.md).

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

## Privacy, deletion, and maintenance

Use no personal information beyond a public handle needed for attribution. Redact the handle when the author is identifiable in a sensitive context, and omit incidental names, locations, contact details, health, financial, employment, or other identifying details that are unnecessary to the synthesis.

Honor source deletion and author removal requests. Publish a monitored contact route and use this source-removal workflow:

1. Record the request or detected deletion, received/detected date, requester or detection method, affected permalink, page/section, owner, and status in the existing dated report or backlog; store no unnecessary requester PII.
2. Acknowledge a direct request and assess dependency within **2 business days**.
3. Remove the quote, attribution, and identifying detail promptly; rework or remove every dependent page section within **5 business days**. If safe rework cannot finish in that window, unpublish or noindex the affected page until it can.
4. Re-run the page-evidence publish gate for the revised page and verify rendered links and citations.
5. Record the completed action, outcome, completion date, verifier, and any remaining follow-up in the same existing record.

Periodically verify source availability and material edits on the topic-appropriate refresh cadence. A deleted, materially changed, or unmaintainable source cannot remain as support. This is an operational publication policy, not jurisdictional legal advice; escalate disputes that need legal judgment.

## Bounded pilot and pre-registration

The pilot is capped at **1–3 pages maximum**. Before any pilot page is published, pre-register one immutable plan covering the exact page set. Pre-registration means the review dates, metrics, go/no-go criteria, and rollback rules cannot be redefined after results are seen. Corrections may be appended with author, date, and reason, but the original remains visible and governs the pilot decision.

Record before publication: exact query/intent; locale/device/date; dated Google/Bing and relevant community-result baselines; existing URLs/cannibalization risk; user-value hypothesis; business relevance; source-selection method; applicable conflict/disclosure review; and the fixed query set for any assistant observations. Pre-register reviews at **week 2**, **week 4**, **week 8**, and **week 12**, with an owner and calendar date for each.

At every gate, record per page: indexed/canonical state; impressions, clicks, CTR, average position, and query diversity; cannibalization; scroll/engagement, source-link clicks, and exits; CTA and direct/assisted conversions where observable; assistant citations only against the fixed dated query set; relevant referral traffic; complaints and source-removal requests; brand/community harm; and editorial maintenance cost. Keep missing data `Unknown`.

The pre-registered go/no-go criteria must require durable visibility across multiple reviews, useful engagement relative to comparable content, no material cannibalization, no material privacy/integrity complaint, plausible conversion contribution where relevant, and sustainable maintenance cost. Indexation or impressions alone never pass a gate. At each review choose and evidence `continue unchanged`, `rework`, `consolidate`, `noindex`, or `remove`.

The week-12 gate passes expansion only when all pre-registered criteria pass. No expansion past three pages is permitted before that pass **and explicit operator approval**. Otherwise stop expansion and apply the pre-registered rollback action. No useful signal by week 12, intent failure, cannibalization, stale/unmaintainable sources, misleading positioning, or material privacy/integrity complaints require rework, consolidation, noindex, or removal as registered.

## Prohibitions and assertable failure rules

- **No scraping:** gather sources only through manual, lawful access; do not bulk copy comments or use opaque indexers.
- **No covert participation:** no astroturfing, undisclosed publisher participation, posting to farm quotes, manufactured questions, or engagement designed to create source material.
- **No parasite publishing:** do not rent third-party authority or use artificial discovery/link networks; apply the [Commercial Integrity anti-authority-rental boundary](commercial-integrity.md#anti-authority-rental-boundary).
- Every page must pass the [Page Evidence publish and delivery gate](page-evidence.md#publish-and-delivery-gate), and every page with commercial elements must also pass [Commercial Integrity](commercial-integrity.md).
- No ranking-time, traffic, conversion, revenue, or AI-citation guarantee; no broad rollout based only on anecdote, indexation, or impressions.
- **Anti-token-swap assertion:** reject two or more pages that share a template or substantially identical section logic while swapping the keyword, community name, threads, or quotes. Each page must have a page-specific source set, page-specific analysis, and page-specific information gain. If any of those three is interchangeable between proposed pages, every affected page fails publication.

Use existing homes only: revision evidence or dated reports for sources, reviews, and removal outcomes; `.seo/backlog.md` for follow-up. For mechanics already owned elsewhere, use [Search Console](search-console.md), [AI Search Visibility](ai-search-visibility.md), [Internal Linking](internal-linking.md), [Content Refresh](content-refresh.md), [Technical SEO](technical-seo.md), [Backlinks and Entity Authority](backlinks-entity.md), and [pSEO Gates](pseo-gates.md) rather than duplicating their workflows.
