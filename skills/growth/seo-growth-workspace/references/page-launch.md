# SEO Page Launch Gate

Use for every new or materially revised public SEO page, regardless of whether the owning ticket is `content`, `schema`, `indexability`, `pseo`, or another area. This reference orchestrates the launch; the linked specialist references remain authoritative for their detailed rules.

## 1. Lock The Revision

Apply [Page Evidence](page-evidence.md) before implementation and again before publication. Identify the exact revision, confirm information gain, substantiate material claims, preserve asset rights, and record human approval. A failed evidence or approval gate blocks publication.

## 2. Implement The Search Surface

Apply [Technical SEO](technical-seo.md) and [Schema and Rich Results](schema-rich-results.md). Confirm:

- unique title and meta description;
- final self-referencing canonical and intended `index,follow` behavior;
- Open Graph and Twitter metadata with an appropriate share image when the site supports them;
- a public, unauthenticated route included in the sitemap and reachable from at least one crawlable internal link;
- visible page content, headings, citations, CTA, analytics, language, and brand voice match the approved revision; and
- schema applicability is decided explicitly. Emit valid JSON-LD only for supported types whose required facts are visible and true; otherwise record `not applicable` with the reason rather than inventing markup.

## 3. Verify Before Publish

Run the target repo's established checks and build. Inspect the staged or preview page on desktop and at least one mobile viewport. Confirm the public/crawler path does not redirect to authentication and that the approved revision, citations, metadata, structured data, and CTA render correctly.

Deploy only through the target repo's established path and only when the run is authorized to mutate production. Record the commit and deployment identifier. If deployment is not authorized or fails, keep the ticket Blocked with the exact gate, evidence, owner, and next action.

## 4. Verify The Live Page

After deployment, verify the production URL rather than inferring success from code or a preview:

- final response is `200` at the intended URL;
- rendered title, description, canonical, robots, Open Graph, and Twitter metadata are correct;
- every JSON-LD block parses, uses an applicable type, and agrees with visible content;
- approved content and rendered citations survived delivery;
- sitemap inclusion and at least one crawlable internal link exist;
- desktop and mobile layouts are usable without accidental overflow; and
- the public route remains accessible without authentication or crawler-specific failure.

Record pass/fail evidence in the ticket's existing report, audit, or deployment evidence home. Do not create a second launch ledger.

## 5. Decide Discovery Submission

Apply [Search Console](search-console.md#bounded-indexing-requests) only after every mandatory live gate passes. Manual indexing requests are optional and bounded, not a substitute for sitemap and internal-link discovery.

Record `requested`, `skipped`, or `blocked` in the dated Search Console indexing report. Missing Search Console access or an ineligible submission method does not block launch when the page is live, indexable, sitemap-listed, and internally linked; it blocks only the optional request.

## Done Contract

A page ticket can move to Done only when sections 1-4 have `PASS` evidence. A blocker in those sections keeps the ticket Blocked. Section 5 must have a logged decision, but a manual request is never required for Done.
