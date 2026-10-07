# Setup

Creates a workspace, adds a site to a hub, or migrates a v7 workspace. Ends by running the first `review`.

## Standalone or hub

- **Standalone:** one site, `.seo/` at the root of the site's repository. SITE_WORKSPACE is `.seo/`.
- **Hub:** an operations repository that manages many sites. HUB_ROOT is its `.seo/`, holding `registry.md`, `reports/` for hub scoreboards, and `sites/<slug>/`, one full workspace per site. SITE_WORKSPACE is `sites/<slug>/`.

`registry.md` has one row per site:

```md
| Site | Workspace | Search Console property | Credentials | Brand terms | Market / language | Code repository | Analytics | Approval boundary |
```

Credentials are locations (a directory or environment variable name), never values.

## New site

1. Fill `context.md` from the live site, the repository and existing docs before asking the owner anything. Mark unknowns `Unknown`:

   ```md
   # SEO context
   ## Business: name, site, category, market, language, what it sells, price level
   ## Conversions: the qualified outcome (signup, demo, booking, order) and where it is tracked
   ## Audience: best-fit customer, bad-fit customer, words they use
   ## Brand terms: the strings that mark a branded query; none may be a substring of an ordinary word ("acredita" also matches "acreditación")
   ## Competitors: names, sites, why they matter
   ## Data access: Search Console property and credentials location, analytics, SERP and demand keys
   ## Approval boundary: what the agent may ship without asking (default: nothing public)
   ## Review budget: live checks and demand requests per review (default 10 and 1)
   ```

2. Create `strategy.md` with the current focus below and dated owner decisions, newest first, `bets.md` (`## Open` and `## Closed`), `research.md`, `log.md` and `reports/data/`.
3. Prove Search Console access with a small pull (`gsc-fetch.mjs --dimensions none` over the last 28 days). First-time OAuth: `scripts/gsc-oauth.mjs --help`. No access means the first bet is getting it, and the review runs on live checks and demand data alone. A newly added property shows "Processing data" and returns 0 rows for about a day, even when the site has years of history. Schedule the baseline pull for the next day, and don't record those rows as zero. URL Inspection works at once.
4. Run a technical crawl once (command in [data.md](data.md)) and keep its findings in the first review's candidate list.
5. Run `review`.

## Current focus

Keep this short section at the top of `strategy.md`, with links to the owner decisions and evidence behind it:

```md
## Current focus, updated YYYY-MM-DD
- Customer and market: <who, country/language, relevant buyer job>
- Business outcome: <desired action; agreed target if one exists; baseline/date or Unknown>
- Constraint: <what limits progress, evidence and uncertainty>
- Chosen opportunity: <coherent customer opportunity and hypothesis; bet IDs>
- Capacity and authority: <growth/maintenance/paused, effort/cadence, approval boundary>
- Next decision: <what evidence or due date changes the choice>
```

Derive this from current owner decisions; do not invent a target, new market or commitment. Later explicit decisions supersede old summaries. Reconcile touched context/registry summaries with them rather than keeping competing truths. On an existing v8 workspace, add this section at the next review; retain existing bets, dates and evidence. No new ledger or cadence is needed.

## Migrating a v7 workspace

v7 kept a ticket backlog, cadence and obligation ledgers, and reconciliation stamps. v8 drops them without conversion. Per site:

1. Move `backlog.md`, `audit.md`, `taxonomy.md`, `loops/`, `reconciliation.json`, `README.md`, `pseo/`, `scripts/` and `evidence/` into `archive/v7/` with `git mv`, so history stays readable.
2. Keep `context.md`, `strategy.md`, `log.md`, `reports/`, `adapters/` and `backlinks/`. Add brand terms, approval boundary and data access to `context.md` if missing.
3. Create `bets.md` and `research.md`. Pending v7 measurement obligations are dropped; the first review reads `archive/v7/backlog.md` once as candidates.
4. In a hub, rewrite `registry.md` to the v8 columns and remove hub files that only served v7 (`config.json`, `portfolio-index.md`).
5. Replace scheduled jobs that ran v7 `operate`: one weekly `review` per active site and one monthly `scoreboard` for the hub. The prompt names the site, the mode and the unattended rules in SKILL.md.

Done when each site has `context.md`, `strategy.md`, `bets.md`, `research.md`, `log.md` and a first review report.
