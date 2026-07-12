# Search Console Opportunity Workflow

Use for `technical-seo-fix`, `monthly-report`, or focused GSC analysis. GSC is the primary keyword-leverage source: run the CLI pipeline before hand-rolling analysis.

## Data Window

Default to the last 90 days for opportunity analysis and last 30 days vs previous 30 days for reporting. Record the exact date range and property. GSC retains 16 months of data and lags ~2 days behind real time.

## Credential Discovery (before any OAuth)

Do not initiate an OAuth flow until you have checked, in order, whether access already exists:

1. `--credentials-dir` / `GSC_CREDENTIALS_DIR` — a credential-home directory with file-shaped `client_secret.json` + `token.json`. Preferred: credentials live in the profile's/agent's credential home outside the target repo.
2. `GSC_*` env vars — `GSC_ACCESS_TOKEN` (one-off) or `GSC_CLIENT_ID`/`GSC_CLIENT_SECRET`/`GSC_REFRESH_TOKEN` (repeatable).
3. Prior exports — reuse existing `.seo/reports/gsc-*.json` for read-only analysis without any fetch.
4. Site registry — if the target has a site→property→credential registry, read it for the property string and credential location.

Only when all four miss do you initiate OAuth (Safe Helper Flow below). Store the result in the credential home, not the repo's `.env.local` (`.env.local` remains a fallback for standalone use).

## Property String Forms

`--site` accepts both GSC property forms; use the one that matches the verified property, or the request 403s:

- `sc-domain:example.com` — domain property (all subdomains + protocols).
- `https://example.com/` — URL-prefix property (exact origin, trailing slash).

## CLI Pipeline

Primary operating loop (Node >= 18; auth setup below):

1. `node "$SKILL_DIR/scripts/gsc-oauth.mjs" --help` — review the one-time auth options before writing into a credential home or ignored env file. Never print token values.
2. `node "$SKILL_DIR/scripts/gsc-fetch.mjs" --site https://example.com/ --start 2026-01-01 --end 2026-03-31 --output "$SITE_WORKSPACE/reports/gsc-2026-03-31.json"` — exports `query,page` rows, paginating past the 25k-row API cap.
3. `node "$SKILL_DIR/scripts/gsc-opportunities.mjs" --input "$SITE_WORKSPACE/reports/gsc-2026-03-31.json" --brand "acme, acme app" --format report` — drafts the page-2 goldmine, CTR-vs-expected-band, and cannibalization tables. Always pass `--brand` with known branded terms. Use `--format backlog` to emit draft `.seo/backlog.md` rows instead. On early-stage sites, lower `--min-impressions` (default 100) to fit the data; when nothing ranks inside positions 1-20, both formats fall back to impression-clusters-by-page (where demand already sees the site) instead of returning empty tables.

Review every generated row before merging; opportunity output is not a full prioritization model. Save opportunity results using `templates/gsc-opportunity.md`.

## Analysis Rules

- Split branded vs non-branded before diagnosing CTR. Branded queries dominate high-impression lists and skew averages.
- Judge CTR against position-banded baselines (roughly 25%+ at position 1 falling to under 2% by positions 8-10), never a flat threshold.
- Impressions up + clicks down is a symptom, not a cause. Possible explanations include query mix, rank/CTR change, and SERP composition (including AI features). Standard Performance data includes AI-surface activity but cannot attribute the divergence; require query/page/SERP evidence before rewriting titles or claiming AI causality.
- Annotate known Google core-update dates when interpreting deltas.
- For programmatic single-URL checks, the URL Inspection API exists; keep its use bounded (see Bounded Indexing Requests).

## Diagnosis: Traffic Or Ranking Drops

Route here for the `diagnose` mode ("my traffic dropped", "why did we lose rankings"). Characterize the drop before touching anything:

1. Split branded vs non-branded (see Analysis Rules). A branded-only drop is a brand/PR/demand problem, not organic decay — do not rewrite titles for it.
2. Impressions up + clicks down → test competing hypotheses: query mix, average-position change, snippet/title fit, and SERP composition. A live SERP sample or dedicated Generative AI export may support an AI-feature hypothesis; standard Performance alone does not.
3. Impressions and positions down across many queries at once → suspect a Google core update; annotate known core-update dates inside the window before attributing to on-site changes.
4. Specific URLs 404/redirect/noindex, dropped from the sitemap, or newly blocked by robots/CDN → technical regression; verify indexability and the deploy/CDN history.
5. Content-engine articles stopped deploying or the sitemap broke → follow `references/content-engine-webhooks.md`.

Exit: the drop is characterized as branded/non-branded + SERP-feature/AI-Overviews vs core-update vs technical regression, with evidence, and the next action is filed to `.seo/backlog.md`.

## Google Generative AI Surfaces (rollout-limited, June 2026)

- **Generative AI Performance report**: Google is rolling this Search Console UI out to a subset of properties. When visible, it reports generative-AI impressions for AI Overviews/AI Mode by page, country, date, and device and offers chart/table export. Treat the downloaded export as dated UI evidence. Do not assume the property has access or that the data is exposed by the Search Console API. [Official report documentation](https://support.google.com/webmasters/answer/16984139)
- **Search generative AI control**: also rollout-limited and owner-operated under Search Console Settings. Include/exclude can inherit from a parent property. It governs eligibility for specified Search generative features; it is not a ranking lever, does not control ordinary Search, and does not control model training (Google-Extended is separate). Any change is an authenticated human/admin mutation requiring explicit approval and before/after evidence. [Official control documentation](https://support.google.com/webmasters/answer/16908024)
- Keep three evidence states distinct: standard Performance (combined totals), dedicated rollout-limited export (AI impressions when available), and unsupported inference (no causal claim).

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

For ordinary pages, the Search Console URL Inspection API is inspection-only: it can inspect the indexed version but cannot run a live test or request indexing. Request indexing through the authenticated Search Console URL Inspection UI using the available browser/computer-use lane. The Google Indexing API is restricted to eligible `JobPosting` pages and livestream pages using `BroadcastEvent` inside `VideoObject`; never use it to submit ordinary SEO pages.

A request does not guarantee indexing, and repeated requests do not improve priority. Missing UI access or an ineligible submission method blocks only the optional request when the URL is otherwise live, indexable, sitemap-listed, and internally linked. Log the decision and continue with scalable discovery from sitemap, internal links, and content quality.

Official boundaries: [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect), [Indexing API eligibility](https://developers.google.com/search/apis/indexing-api/v3/using-api).

## No-Mutation Validation

For read-only runs:

- Use existing `.seo` GSC reports, public sitemap/robots/status checks, and repo evidence.
- Do not configure OAuth, request exports, inspect private GSC pages, click URL Inspection, or request indexing.
- Mark query/page opportunity work as `partial` when no current GSC rows are already available.
- Apply the single public-surface Done-transition rule in `references/ticket-architecture.md` for measurement follow-up; record other missing evidence with its safe owner without creating a second follow-up canon.

## Repeatable API Auth Setup

Use this only when the user already has Google Cloud/Search Console access and agrees to configure API auth. Never print credential values.

1. Create or select a Google Cloud OAuth client that is allowed to request `https://www.googleapis.com/auth/webmasters.readonly`.
2. Generate a refresh token through the OAuth consent flow for the account that can access the property.
3. Store the values in the profile's/agent's credential home outside the target repo — a directory with file-shaped `client_secret.json` + `token.json`, read via `--credentials-dir` / `GSC_CREDENTIALS_DIR`. For standalone use, a local ignored env file (`.env.local`) with `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REFRESH_TOKEN` remains a fallback.
4. Run step 2 of the CLI pipeline.

If the OAuth refresh fails, report only the HTTP status and the likely setup issue. Do not paste token endpoint response bodies into chat, reports, commits, or issues.

### Safe Helper Flow

When a Google OAuth client already exists, use the helper instead of manually pasting token responses:

```bash
GSC_CLIENT_ID=<client-id> node "$SKILL_DIR/scripts/gsc-oauth.mjs" --print-auth-url
```

Open the URL, grant Search Console read-only access, then copy only the `code` query parameter from the redirect URL. Exchange it into a credential home (preferred) — `client_secret.json` supplies the client, and the helper writes `token.json`:

```bash
node "$SKILL_DIR/scripts/gsc-oauth.mjs" --credentials-dir <creds-dir> --code <returned-code>
```

Or, for standalone use, into a repo-ignored env file:

```bash
GSC_CLIENT_ID=<client-id> GSC_CLIENT_SECRET=<client-secret> node "$SKILL_DIR/scripts/gsc-oauth.mjs" --code <returned-code> --output .env.local
```

The credential-home path writes `<creds-dir>/token.json`; the env-file path writes `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, and `GSC_REFRESH_TOKEN`. Both print only the file path (0600). Use `--force` only when intentionally replacing a previous token file.
