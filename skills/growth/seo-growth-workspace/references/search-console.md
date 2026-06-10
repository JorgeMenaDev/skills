# Search Console Opportunity Workflow

Use for `technical-seo-fix`, `monthly-report`, or focused GSC analysis.

## Data Window

Default to the last 90 days for opportunity analysis and last 30 days vs previous 30 days for reporting. Record the exact date range and property.

## Matrices To Produce

### Page 2 Goldmine

Find queries with average position 11-20 and meaningful impressions. Columns:

`query`, `page`, `clicks`, `impressions`, `CTR`, `avg position`, `intent`, `current page fit`, `action`, `impact`, `time-to-result`.

Actions should include exact title/H1/meta/internal-link/content changes where possible.

### CTR Fixes

Find high-impression, low-CTR pages. Columns:

`page`, `main query`, `impressions`, `CTR`, `avg position`, `current title`, `current meta`, `new title`, `new meta`, `expected impact`.

### Money Page Mapping

Map important queries to the page that should rank. Columns:

`query`, `buyer stage`, `current ranking page`, `ideal page`, `existing/new`, `cannibalization risk`, `next action`.

### Cannibalization

Find queries where multiple URLs compete. Columns:

`query`, `competing URLs`, `strongest URL`, `weak URL action`, `internal-link fix`, `canonical/noindex decision if any`.

## Rules

- Use GSC API/export when available; otherwise use browser-visible data and document the limitation.
- When an OAuth token with `webmasters.readonly` scope is available, use `scripts/gsc-fetch.mjs` to export `query,page` rows. Do not store or print the token.
- Prefer refresh-token auth for repeatable runs when credentials are already configured: `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, and `GSC_REFRESH_TOKEN`. Use `GSC_ACCESS_TOKEN` for one-off runs.
- If no API auth is available, export from the Search Console UI and run the opportunity parser against that file.
- Run `scripts/gsc-opportunities.mjs` on the API/export JSON to create initial page-2 and CTR tables.
- Run `scripts/gsc-to-backlog.mjs` only when you want draft backlog rows from GSC data. Review every row before merging because GSC opportunity data is not a full prioritization model.
- Do not request indexing until a real improvement has shipped or a new important URL exists.
- For fresh properties with little/no data, log the baseline and schedule the first useful review.

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

For `release-dogfood` or read-only runs:

- Use existing `.seo` GSC reports, public sitemap/robots/status checks, and repo evidence.
- Do not configure OAuth, request exports, inspect private GSC pages, click URL Inspection, or request indexing.
- Mark query/page opportunity work as `partial` when no current GSC rows are already available.
- Record the exact missing evidence and the safe follow-up owner.

## Repeatable API Auth Setup

Use this only when the user already has Google Cloud/Search Console access and agrees to configure API auth. Never print credential values.

1. Create or select a Google Cloud OAuth client that is allowed to request `https://www.googleapis.com/auth/webmasters.readonly`.
2. Generate a refresh token through the OAuth consent flow for the same Google account that can access the Search Console property.
3. Store the values outside tracked files, normally in the shell session or a local ignored env file:
   - `GSC_CLIENT_ID`
   - `GSC_CLIENT_SECRET`
   - `GSC_REFRESH_TOKEN`
4. Run:

```bash
bun scripts/gsc-fetch.mjs --site https://example.com/ --start 2026-01-01 --end 2026-03-31 --output .seo/reports/gsc-2026-03-31.json
```

If the OAuth refresh fails, report only the HTTP status and the likely setup issue. Do not paste token endpoint response bodies into chat, reports, commits, or issues.

### Safe Helper Flow

When a Google OAuth client already exists, use the helper instead of manually pasting token responses:

```bash
GSC_CLIENT_ID=<client-id> bun scripts/gsc-oauth.mjs --print-auth-url
```

Open the URL, grant Search Console read-only access, then copy only the `code` query parameter from the redirect URL. Exchange it into an ignored env file:

```bash
GSC_CLIENT_ID=<client-id> GSC_CLIENT_SECRET=<client-secret> bun scripts/gsc-oauth.mjs --code <returned-code> --output .env.local
```

The helper writes `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, and `GSC_REFRESH_TOKEN` to the output file and prints only the file path. Use `--force` only when intentionally replacing a previous local token file.
