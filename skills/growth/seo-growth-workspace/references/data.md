# Data

Where evidence comes from, what each source can and cannot say, and what it costs. Scripts live in `$SKILL_DIR/scripts/`, need only Node 18+, and document themselves with `--help`.

| Need | Command | Source and limits | Cost |
| --- | --- | --- | --- |
| Weekly or monthly data pack | `review-data.mjs` | Search Console, final data. Withholds anonymized queries: the pack prints query-row coverage | Free |
| Any other Search Console cut | `gsc-fetch.mjs` (any dimensions, filters) | Same | Free |
| First-time Search Console auth | `gsc-oauth.mjs` | Google OAuth, `webmasters.readonly` | Free |
| Where a site ranks right now | `serp.mjs` (`SERPER_API_KEY`) | Serper Google results for one query, country and language at one moment. Free accounts allow quoted and `site:` queries only at 10 results | Pay per query |
| How many people search a phrase | `demand.mjs` (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`) | DataForSEO Google Ads volumes: 12-month averages, estimates, empty for much of the long tail | Pay per request; the response states the cost |
| Technical crawl | `DO_NOT_TRACK=1 npx -y seo@0.2.40 report --url <origin> --actions-only --json` | [iannuttall/seo](https://github.com/iannuttall/seo) crawler, about 100 pages by default: broken and orphan links, metadata, indexability, structured data. No login needed | Free |
| Search outcomes | Product analytics; PostHog through the Organic Outcome Bridge in [conversion.md](conversion.md) | Landing-page level, never per query | Free |
| What Microsoft AI answers cite | Bing Webmaster Tools, AI Performance: CSV export from the UI, no API | Total Citations, Average Cited Pages (unique pages per day), Page-level Citation Activity, and Grounding Queries (the phrases the AI searched to retrieve cited pages, not what users asked). Microsoft surfaces only: Copilot, Bing AI summaries, some partner integrations. A sample of citation activity, with no placement or rank. Public preview since 2026-02-10 | Free |
| AI answers | Browser observation panel in [ai-search-visibility.md](ai-search-visibility.md) | One sample per prompt, engine and moment | Free, slow |

The `seo` CLI can also run its Search Console reports (quick wins, page-two pages, before and after measurement) once it has its own Google login (`seo start`). Pin the version when you use it, and keep `DO_NOT_TRACK=1` so it sends no telemetry.

## Without paid keys

No `SERPER_API_KEY`: check rankings in a clean browser session for the target market and record query, country, language and time. No DataForSEO: demand for phrases the site does not rank for stays directional (Google autocomplete, People Also Ask, competitor pages). Label it so, and prefer bets whose demand Search Console already shows.

## Research log

Append every paid lookup to `research.md`: date, tool, inputs (market, language, phrases), cost, saved file, one-line verdict. Before a paid lookup, reuse any entry under 30 days old with the same inputs.

## Reading Search Console honestly

- Final data lags two to three days; `review-data.mjs` ends its window three days back by default.
- Query rows cover only part of the clicks. Brand and non-brand splits describe those rows, not the whole site.
- Average position is an impression-weighted mean across queries and days, not a rank.
- A URL missing from an export is not proof it is deindexed; check it live or with URL Inspection.
