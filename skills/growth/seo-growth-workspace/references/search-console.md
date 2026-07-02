# Search Console Opportunity Workflow

Use for `technical-seo-fix`, `monthly-report`, or focused GSC analysis. GSC is the primary keyword-leverage source: run the CLI pipeline before hand-rolling analysis.

## Data Window

Default to the last 90 days for opportunity analysis and last 30 days vs previous 30 days for reporting. Record the exact date range and property. GSC retains 16 months of data and lags ~2 days behind real time.

## CLI Pipeline

Primary operating loop (Node >= 18; auth setup below):

1. `node scripts/gsc-oauth.mjs` — one-time auth into an ignored env file (see Safe Helper Flow). Never print token values.
2. `node scripts/gsc-fetch.mjs --site https://example.com/ --start 2026-01-01 --end 2026-03-31 --output .seo/reports/gsc-2026-03-31.json` — exports `query,page` rows, paginating past the 25k-row API cap.
3. `node scripts/gsc-opportunities.mjs --input .seo/reports/gsc-2026-03-31.json --brand "acme, acme app" --format report` — drafts the page-2 goldmine, CTR-vs-expected-band, and cannibalization tables. Always pass `--brand` with known branded terms. Use `--format backlog` to emit draft `.seo/backlog.md` rows instead.

Review every generated row before merging; opportunity output is not a full prioritization model. Save opportunity results using `templates/gsc-opportunity.md`.

## Analysis Rules

- Split branded vs non-branded before diagnosing CTR. Branded queries dominate high-impression lists and skew averages.
- Judge CTR against position-banded baselines (roughly 25%+ at position 1 falling to under 2% by positions 8-10), never a flat threshold.
- Impressions up + clicks down is often AI Overviews / SERP-feature driven, not a title problem. GSC folds AI-surface impressions into totals with no breakdown — check SERP appearance for affected queries before rewriting titles.
- Annotate known Google core-update dates when interpreting deltas.
- For programmatic single-URL checks, the URL Inspection API exists; keep its use bounded (see Bounded Indexing Requests).

## Matrices To Produce

The analyzer drafts the first three; Money Page Mapping is judgment work — build it manually.

### Page 2 Goldmine

Queries with average position 11-20 and meaningful impressions. Columns:

`query`, `page`, `clicks`, `impressions`, `CTR`, `avg position`, `intent`, `current page fit`, `action`, `impact`, `time-to-result`.

Actions should include exact title/H1/meta/internal-link/content changes where possible.

### CTR Fixes

Non-branded pages underperforming their position band's expected CTR. Columns:

`page`, `main query`, `impressions`, `CTR`, `expected CTR (band)`, `avg position`, `current title`, `current meta`, `new title`, `new meta`, `expected impact`.

### Cannibalization

Queries where multiple URLs split impressions. Columns:

`query`, `competing URLs`, `impression split`, `strongest URL`, `weak URL action`, `internal-link fix`, `canonical/noindex decision if any`.

### Money Page Mapping

Map important queries to the page that should rank. Columns:

`query`, `buyer stage`, `current ranking page`, `ideal page`, `existing/new`, `cannibalization risk`, `next action`.

## Rules

- Use the GSC API when available; otherwise export from the Search Console UI, run the analyzer on that export, and document the limitation.
- Prefer refresh-token auth for repeatable runs (`GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REFRESH_TOKEN`); use `GSC_ACCESS_TOKEN` for one-off runs.
- Do not request indexing until a real improvement has shipped or a new important URL exists.
- For fresh properties with little/no data, log the baseline and schedule the first useful review.

## Beyond Google

Verify the site in Bing Webmaster Tools and enable IndexNow. Bing's index feeds several AI assistants, so this is cheap answer-engine coverage.

## GSC Notification Triage

When Search Console sends an indexing or coverage email, start from the example URLs instead of the email subject. Record the GSC report date separately from the investigation date because indexing reports can lag.

| GSC reason | Example URL | First detected | Last crawled | Live chain | Canonical | Sitemap | Decision | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Treat `Page with redirect` as benign when the example is intentional protocol or host canonicalization, such as `http://` to `https://`, and the final URL returns `200` with the expected canonical. Do not click `Validate fix` for intentional redirects unless the redirect chain changed unexpectedly.

## Bounded Indexing Requests

Manual URL Inspection requests are an exception, not a discovery strategy. Use them only when all are true:

- GSC shows a bounded list of public important URLs, not a large batch.
- The URLs are live, indexable, and sitemap-listed or have a crawl path.
- A real improvement just shipped that affects their crawlability, internal links, content quality, canonical state, or indexability.
- Each submitted, skipped, or blocked URL is logged in a dated `.seo/reports/gsc-indexing-YYYY-MM-DD.md` report.

Do not turn this into a recurring manual submission habit. Scalable discovery should come from sitemap, internal links, and content quality.

## No-Mutation Validation

For read-only runs:

- Use existing `.seo` GSC reports, public sitemap/robots/status checks, and repo evidence.
- Do not configure OAuth, request exports, inspect private GSC pages, click URL Inspection, or request indexing.
- Mark query/page opportunity work as `partial` when no current GSC rows are already available.
- Record the exact missing evidence and the safe follow-up owner.

## Repeatable API Auth Setup

Use this only when the user already has Google Cloud/Search Console access and agrees to configure API auth. Never print credential values.

1. Create or select a Google Cloud OAuth client that is allowed to request `https://www.googleapis.com/auth/webmasters.readonly`.
2. Generate a refresh token through the OAuth consent flow for the account that can access the property.
3. Store the values outside tracked files, normally in the shell session or a local ignored env file: `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REFRESH_TOKEN`.
4. Run step 2 of the CLI pipeline.

If the OAuth refresh fails, report only the HTTP status and the likely setup issue. Do not paste token endpoint response bodies into chat, reports, commits, or issues.

### Safe Helper Flow

When a Google OAuth client already exists, use the helper instead of manually pasting token responses:

```bash
GSC_CLIENT_ID=<client-id> node scripts/gsc-oauth.mjs --print-auth-url
```

Open the URL, grant Search Console read-only access, then copy only the `code` query parameter from the redirect URL. Exchange it into an ignored env file:

```bash
GSC_CLIENT_ID=<client-id> GSC_CLIENT_SECRET=<client-secret> node scripts/gsc-oauth.mjs --code <returned-code> --output .env.local
```

The helper writes `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, and `GSC_REFRESH_TOKEN` to the output file and prints only the file path. Use `--force` only when intentionally replacing a previous local token file.
