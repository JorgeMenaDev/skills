# Competitor Profiling

Use when a ticket needs competitor evidence: demand gaps, backlink gaps, local packs, or positioning.

Profiles are dated snapshots, not living documents. Every claim traces to a saved page or a named data pull; label inferences as inferences.

## Selecting The Competitor Set

When the ticket names the category but not the competitors, build the set before profiling:

- Seed from demand, not memory: run the site's own money queries (from GSC or the keyword plan) through live SERP checks and note which *product* domains recur. Record the queries and date in the report header.
- Separate product competitors from SERP occupants. Agencies, affiliate listicles, and news sites that rank for the money queries are SERP obstacles, not positioning competitors — exclude them from profiling and say so, or the matrix fills with rows that can't feed any destination.
- Name the geo caveat: most search tools proxy from one country (often US), so local-market SERPs (es-CL, pt-BR, ...) are approximations. Record the limitation; a deep profile can verify with a true local SERP tool via `references/data-tools.md`.
- Skip competitors the site already covers with live alternatives/vs content unless the ticket asks to re-audit them — the marginal evidence is small; spend the scan budget on unprofiled players.
- Cap the set at what the depth budget affords (3–5 for quick scans) and list who was deliberately left out.

## Depth Contract

| Depth | Scope | When |
| --- | --- | --- |
| Quick scan (default, ~30 min per competitor) | Homepage, pricing, blog hub, one money page, GSC-visible query overlap | Any ticket that needs competitor context |
| Deep profile | Quick scan + full page-type crawl, review mining, third-party SEO data via `references/data-tools.md` | Only when a specific ticket justifies the cost — record why |

Default to quick scan. Record the depth in the report header.

## Snapshots

Save raw evidence to `.seo/reports/competitors/<slug>/<YYYY-MM-DD>/` — one file per captured page (`homepage.md`, `pricing.md`, ...) plus data pulls as JSON. `<slug>` is lowercase, hyphenated. Create a fresh date folder each run; never overwrite earlier dates — the history is the diff. Every profile cites the snapshot folder it was built from.

Quick scans parallelize well: when the runtime supports subagents, run one capture agent per competitor concurrently, each writing its own snapshot folder and returning a summary for synthesis. Give every agent the full no-fabrication contract (record `fetch failed: <url>` instead of paraphrasing; mark `unverified claim`s) — a subagent under output pressure is more tempted to fill gaps from memory than the main loop is. Two capture tips that recur: bot-blocked sites (Cloudflare, AI-crawler blocks) usually still answer `curl` with a browser User-Agent — record the workaround in the snapshot so the block isn't mistaken for a dead site; and a bare-domain 404 may hide a live `www.` host.

## Page-Type Extraction Matrix

One row per page type per competitor:

| Competitor | Page type | URL pattern | Count estimate | Targeting | Evidence |
| --- | --- | --- | --- | --- | --- |

Common page types: comparison, alternative, use case, integration, template/tool, location/service, glossary, blog cluster. Count estimates come from sitemaps, `site:` queries, or crawl data — record which.

## Positioning Snapshot

Per competitor, one line each with the source file: headline/value proposition, target audience signals, pricing tiers, named customers, content cadence.

## Cross-Reference Rule

Marketing claims are not evidence. Before a competitor claim ("10,000 customers", "#1 in category") enters `.seo/strategy.md`, check it against third-party data — traffic, backlinks, review counts via `references/data-tools.md` — or label it `unverified claim`. Do not inflate competitor weaknesses or downplay strengths; inaccurate profiles produce bad tickets.

## Feeding The Matrices

Profiling is input, not output. Route findings into the existing matrices:

| Finding | Destination |
| --- | --- |
| Domains linking to competitors, not the target | Backlink gap — `templates/backlink-gap.md` via `references/backlinks-entity.md` |
| Demand the target does not capture | Competitor Demand Gaps matrix — `references/content-ops.md` |
| Map-pack categories, reviews, posts | Local competitor matrix — `references/local-seo-gbp.md` |
| Page types worth replicating | pSEO plan shape — `references/pseo-gates.md` |

## Guardrails

- Do not fabricate competitor metrics, pricing, or customers. If a page cannot be fetched, record `fetch failed` with the URL instead of paraphrasing from memory.
- Use only public pages; do not scrape login-gated surfaces.
- Date every claim; flag anything that looks stale (for example, a pricing page last updated years ago).

## Exit Criteria

- Dated snapshot folder exists per competitor; the profile cites it.
- Page-type matrix and positioning snapshot produced at the declared depth.
- Findings routed into destination matrices or filed as backlog tickets; leftovers explicitly deferred.
- Third-party claims cross-checked or labeled `unverified claim`.
