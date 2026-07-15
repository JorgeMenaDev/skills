# First Run

Use before a full first run, a messy repo import, or any request where the next SEO action is unclear. The skill has one job — evidence-backed organic growth; the classifier and phase ladder decide which surface deserves attention first, and the context intake makes the business legible before strategy.

## Site-type classifier

Classify the target before planning; mark uncertainty plainly. If a target fits several types, pick the one that best explains the current growth bottleneck.

| Site type | Signals | Primary modes |
| --- | --- | --- |
| Software product / SaaS | App repo, pricing/signup/demo flows, docs | `bootstrap`, `technical-seo-fix`, `content-ops` |
| Marketing site | Public landing pages, lead forms, brand positioning | `bootstrap`, `technical-seo-fix` |
| Local business | GBP, NAP, reviews, service areas | `bootstrap`, `local-seo` |
| Local or regulated service | Trust proof, compliance constraints, local intent | `bootstrap`, `local-seo`, `content-ops` |
| Publisher / blog | Article routes, editorial calendar, author/category pages | `content-ops`, `monthly-report` |
| Ecommerce / marketplace | Categories, product pages, variants, merchant data | `bootstrap`, `technical-seo-fix`, `content-ops` + `references/ecommerce-seo.md` |
| Programmatic site | Data-driven page types, templates, index/noindex states | `pseo-planning`, `technical-seo-fix` |
| Utility/tool library | Public calculators, converters, generators, tools hub | `content-ops`, `pseo-planning`, `technical-seo-fix` |
| Multilingual / multi-region | Locale routes, hreflang, regional canonicals | `bootstrap`, `technical-seo-fix`, `content-ops` + `references/international-seo.md` |

## First-run phase ladder

Do not jump to content, backlinks, or pSEO until earlier blocking phases are checked.

| Phase | Question | Main references | Exit criteria |
| --- | --- | --- | --- |
| `classification` | What business, market, language, site type, conversion path? | this file, `workspace.md` | `context.md` has known facts and unknowns |
| `technical` | Can engines crawl, render, index, canonicalize the intended URLs? | `technical-seo.md` | Robots, sitemap, redirects, canonical host, noindex, status codes, mobile rendering checked |
| `metadata` | Do important pages explain their intent in title, H1, meta, canonical, previews? | `technical-seo.md`, `search-console.md` | Priority pages have rendered metadata matched to intent |
| `schema` | Does JSON-LD match visible content without invented proof? | `schema-rich-results.md` | Route-family schema parsed and visible-content matched |
| `measurement` | Can we see baseline traffic, indexing, conversions, admin truth? | `workspace.md`, `search-console.md`, `conversion.md` | GSC/analytics/admin verified or blocked with next owner |
| `conversion` | Can a qualified visitor take the intended next step? | `conversion.md` | Primary/backup CTA, trust proof, mobile behavior, event proof checked |
| `content` | Is there a real publishing path and useful topic strategy? | `content-ops.md`, `utility-tool-pages.md`, `internal-linking.md` | Renderer/CMS/engine exists before calendars or briefs are "ready" |
| `pseo` | Is a page type ready for small-batch programmatic expansion? | `pseo-gates.md` | Normal content path proven; data, unique value, links, publish decision explicit |
| `local` | Are GBP, NAP, service areas, reviews, citations relevant? | `local-seo-gbp.md` | Applicability checked; matrix/action or `not applicable` with evidence |
| `authority` | Does the site have credible entity and link signals? | `backlinks-entity.md` | Prospects, submissions, live links tracked without invented facts |
| `ai-visibility` | Can AI crawlers access the site; do assistants cite it for money queries? | `ai-search-visibility.md`, `technical-seo.md` | Allow/block decision recorded; citation spot-check matrix and referral tracking exist |
| `reporting` | What changed, what did it prove, what is the single next action? | `monthly-reporting.md`, `operating.md` | Report/log/backlog reflect current evidence |

Load `references/data-tools.md` or `references/competitor-profiling.md` when a phase needs third-party or competitor evidence.

**Lifecycle stage** is context state, not the classifier: recompute monthly from `references/policy.md` thresholds; missing evidence stamps `stage: unknown` (with evaluation date) and uses `early` defaults. Stage changes operating intensity only — never authority, gates, or certification. A stamp older than the newest monthly report is schema debt.

**Scenario routing**: new repo, no `.seo/` → `bootstrap` (mode question first, `references/workspace.md`). Existing `.seo/`, no narrow ask → `operate`. Broken/invisible public pages → `technical-seo-fix`. GSC has data → `technical-seo-fix` or `content-ops`. Blog/engine exists → `content-ops`. Programmatic idea → `pseo-planning`. GBP/local intent → `local-seo`. Traffic dropped → `diagnose` (`references/search-console.md`). Month-end → `monthly-report`.

**AI search** is a default part of organic growth, not an opt-in: check AI-crawler access in the `technical` phase and run `ai-visibility` with `references/ai-search-visibility.md`. For Google this is still SEO — crawlable helpful content, clear entities, visible proof; never make `llms.txt`, chunking, or "AEO/GEO" tricks a required gate; label unproven tactics honestly.

**Marketing skill bridge** — when adjacent skills are installed, use them as lenses, never dependencies: `product-marketing` (ICP/positioning/voice), `customer-research` (pains/objections/intent language), `content-strategy` (clusters/sequencing), `copywriting`/`copy-editing` (page/CTA/meta copy), `cro` (CTA flow/friction), `analytics` (event/funnel proof), `schema`, `seo-audit`, `ai-seo`, `site-architecture`, `programmatic-seo`, `competitor-profiling`/`competitors`, `directory-submissions`/`free-tools`/`lead-magnets` (authority and linkable assets). If none are installed, this skill's references are sufficient.

## Business context intake

Output belongs in `context.md`, summarized in `strategy.md` when useful. Fill unknowns from repo, live site, docs, admin panels, and public evidence before asking the user; mark unresolved values `Unknown`, never guesses; a user-provided context block is durable input — do not re-ask.

| Area | Fields |
| --- | --- |
| Business basics | Name, website, category, market, language, locations/service areas, years active |
| Offer | Primary/secondary services, pricing notes, highest-value conversion paths |
| Customer | Best-fit and bad-fit customer, buyer stages, average contract/job value |
| Goals | Desired/ranking/missing keywords, target geographies, conversion goals |
| Current standing | GSC/traffic data, analytics provider, reviews, GBP status, indexing status, biggest SEO problem |
| Competitors | Names, URLs, GBP URLs, why they matter, known advantages |
| Prior work | Agencies/tools, migrations, published content, schema/backlink work, what worked/failed |
| Operating preferences | Quick wins vs long-term, approval boundaries, reporting cadence, output format |

```md
# SEO business context
## Business basics
## Offer and conversion paths
## Audience and buyer stages
## SEO goals
## Current standing
## Competitors
## Prior SEO work
## Constraints and operating preferences
```

**Customer-evidenced discovery journey** (optional matrix in `context.md`). Build it only when identified customer evidence is `Reported` or `Observed` under the evidence states in `references/operating.md` — interviews, surveys, sales notes, defined CRM fields, referral records, customer-level observations, each with provenance and limitations recorded. Inference, third-party estimates, and generic audience assumptions cannot create or activate it; customer recall stays `Reported`. One row per discovery surface (search, AI assistants, maps, social, video, marketplaces, communities, comparison publishers, newsletters, direct — examples, not a checklist): evidence basis and state, provenance/limitations, buyer stage(s), evidenced job/query, dated current-presence observation, activation decision (`active` / `rejected — <reason>` / `Unknown`), asset/outcome/next action on the non-causal ladder, execution route. Decision rules: a surface activates only on its own evidence — never adjacently; presence is not proof of customer use, and a gap does not itself authorize a channel; outcomes never claim causation. Route search/content → `content-ops.md`, AI → `ai-search-visibility.md`, maps/local → `local-seo-gbp.md`, community-source publishing → `content-ops.md`, comparisons → `pseo-gates.md` + `commercial-integrity.md`, affiliate relationships → `commercial-integrity.md`, conversion measurement → `conversion.md`; social/video/newsletter/marketplace execution goes to capabilities outside this skill — record the handoff, create no campaign ledger. For sparse evidence, preserve the sparsity; when no qualifying evidence exists, no matrix is the correct result and blocks nothing.
