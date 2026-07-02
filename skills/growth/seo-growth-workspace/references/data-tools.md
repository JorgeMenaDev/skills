# External Data Tools

Use when an audit matrix needs keyword volume, SERP, or backlink data beyond Search Console.

## Source Order

1. First-party GSC — free, authoritative for the site's own queries. Always first; use the bundled scripts via `references/search-console.md`.
2. Whichever paid API the user already has credentials for. Do not sign the user up for a tool; ask, or fall back.
3. Free directional fallbacks when no tool exists.

## Need → Source

| Need | First choice | Fallback |
| --- | --- | --- |
| Own-site queries, clicks, positions | GSC (`scripts/gsc-fetch.mjs`) | GSC UI export |
| Keyword volume/difficulty | DataForSEO `search_volume` | Ahrefs/Semrush keyword overview; else directional only |
| Live SERP snapshot | DataForSEO SERP live | Manual SERP review, documented |
| Competitor keywords | DataForSEO `keywords_for_site` | Ahrefs `organic-keywords`, Semrush `domain_organic` |
| Backlink gap / referring domains | Ahrefs `refdomains` | DataForSEO `backlinks/*`, Semrush `backlinks_*` |
| On-page crawl audit | DataForSEO `on_page/instant_pages` | Manual fetch plus this skill's checklists |
| Demand signal with zero tools | Google Autocomplete + People Also Ask observation | — (directional only, never volume) |

## Tool Rows

| Tool | Env vars | Good for | Cost | Call sketch (endpoint names only) |
| --- | --- | --- | --- | --- |
| GSC (bundled) | `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REFRESH_TOKEN` | Own queries, pages, CTR, position | Free | `scripts/gsc-fetch.mjs` |
| DataForSEO | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` (Basic auth) | SERP live, search volume, keywords-for-site, backlinks summary/referring domains, on-page audit | Pay-per-call; cheap per lookup | `serp/google/organic/live/regular`, `keywords_data/google_ads/search_volume/live`, `keywords_data/google_ads/keywords_for_site/live`, `backlinks/summary/live`, `backlinks/referring_domains/live`, `on_page/instant_pages` |
| Ahrefs | `AHREFS_API_KEY` (Bearer) | Backlinks/DR, organic keywords, top pages | API gated to higher plans | `site-explorer/domain-rating`, `site-explorer/refdomains`, `site-explorer/organic-keywords`, `keywords-explorer/overview` |
| Semrush | `SEMRUSH_API_KEY` (query param) | Domain overview, organic keywords, backlinks, difficulty | Unit-metered per call | `type=domain_ranks`, `type=domain_organic`, `type=phrase_all`, `type=backlinks_overview` |
| Autocomplete / PAA | none | Topic and phrasing discovery | Free | Observe suggestions and People-Also-Ask for seed terms |

## Rules

- Never print, log, or commit API keys. Read them from env only; if a key is missing, name the unset env var, not its value.
- Record tool, endpoint, and pull date in the matrix's evidence column, for example `DataForSEO search_volume 2026-07-02`.
- Third-party volume/DR/traffic numbers are estimates. Label them; never mix them unlabeled with GSC actuals.
- Autocomplete/PAA observations are directional demand evidence, not volume data. Label them as directional.
- When no tool is available, document the limitation in the matrix instead of inventing numbers — the same rule as `references/backlinks-entity.md`.
