# SEO Phase Architecture

Use this before a full first run, a messy repo import, or any request where the next SEO action is unclear.

The skill has one job: evidence-backed organic growth. The phase ladder decides which surface deserves attention first.

## Site-Type Classifier

Classify the target before planning work. Mark uncertainty plainly.

| Site type | Signals | Primary modes |
| --- | --- | --- |
| Software product / SaaS | App repo, pricing/signup/demo/contact flows, docs or product pages | `bootstrap`, `technical-seo-fix`, `content-ops` |
| Marketing site | Public landing pages, lead forms, analytics, brand positioning | `bootstrap`, `technical-seo-fix` |
| Local business | GBP, NAP, reviews, service areas, local competitors | `bootstrap`, `local-seo` |
| Local or regulated service | Trust proof, legal/compliance constraints, service pages, local intent | `bootstrap`, `local-seo`, `content-ops` |
| Publisher / blog | Article routes, editorial calendar, author/date/category pages | `content-ops`, `monthly-report` |
| Ecommerce / marketplace | Categories, product pages, variants, merchant data | `bootstrap`, `technical-seo-fix`, `content-ops`; load `references/ecommerce-seo.md` for commerce decisions |
| Programmatic site | Data-driven page types, templates, index/noindex states | `pseo-planning`, `technical-seo-fix` |
| Utility/tool library | Public calculators, converters, checkers, generators, templates, curated examples, tools hub | `content-ops`, `pseo-planning`, `technical-seo-fix` |
| Multilingual / multi-region | Locale routes, hreflang, regional canonicals | `bootstrap`, `technical-seo-fix`, `content-ops` |

If a target fits multiple types, choose the type that best explains the current growth bottleneck. Multilingual / multi-region targets also load `references/international-seo.md` during the `technical` phase.

## First-Run Phase Ladder

Do not jump to content, backlinks, or pSEO until earlier blocking phases are checked.

| Phase | Question | Main references | Exit criteria |
| --- | --- | --- | --- |
| `classification` | What business, market, language, site type, and conversion path are we improving? | `business-context.md`, `admin-preflight.md` | `.seo/context.md` has known facts and unknowns, or existing workspace context is used with drift recorded when writes are disallowed |
| `technical` | Can search engines crawl, render, index, and canonicalize the intended URLs? | `technical-seo.md`, `admin-preflight.md` | Robots, sitemap, redirects, canonical host, noindex, status codes, mobile rendering, and public routes are checked |
| `metadata` | Do important pages explain their intent in title, H1, meta, canonical, and social previews? | `technical-seo.md`, `search-console.md` | Priority pages have rendered metadata matched to search intent |
| `schema` | Does JSON-LD match visible page content without invented proof? | `schema-rich-results.md` | Route-family schema is parsed and visible-content matched |
| `measurement` | Can we see baseline traffic, indexing, conversions, and admin truth? | `admin-preflight.md`, `search-console.md`, `conversion-cta.md` | GSC/analytics/admin access is verified or blocked with next owner |
| `conversion` | Can a qualified visitor take the intended next step? | `conversion-cta.md` | Primary CTA, backup CTA, trust proof, mobile behavior, and event proof are checked |
| `content` | Is there a real publishing path and a useful topic strategy? | `content-ops.md`, `utility-tool-pages.md`, `internal-linking.md` | Renderer/CMS/content engine exists before calendar, briefs, or utility pages are treated as ready |
| `pseo` | Is a page type ready for small-batch programmatic expansion? | `pseo-gates.md`, `schema-rich-results.md`, `internal-linking.md` | Normal content path is proven; page type has data, unique value, links, and publish/no-publish status |
| `local` | Are GBP, NAP, service areas, reviews, photos, citations, and local competitors relevant? | `local-seo-gbp.md`, `backlinks-entity.md` | Applicability is checked; if relevant, local matrix/action exists; if not, mark `not applicable` with evidence |
| `authority` | Does the site have credible entity and link signals? | `backlinks-entity.md` | Prospects, submissions, and live links are tracked without invented business facts |
| `ai-visibility` | Can AI crawlers access the site, and do assistants cite it for money queries? | `ai-search-visibility.md`, `technical-seo.md` | AI-crawler allow/block decision is recorded in `.seo/strategy.md`; citation spot-check matrix and assistant-referral tracking exist |
| `reporting` | What changed, what did it prove, and what is the single next action? | `monthly-reporting.md`, `operating-loop.md` | Report/log/backlog reflect current evidence |

When a phase needs third-party keyword/backlink data or competitor evidence, load `references/data-tools.md` or `references/competitor-profiling.md`.

## Lifecycle stage context

`stage` is context state, not the site-type classifier above. Recompute it monthly using the thresholds, qualified-outcome rule, and expiring override contract in `references/operating-policy.md`. When the current monthly report or trustworthy outcome tracking is missing, stamp `stage: unknown` with its evaluation date and use `early` defaults. Stage changes operating intensity only; it never changes authority, gates, or certification eligibility. A stamp older than the newest monthly report is schema debt and must be refreshed.

## Scenario Routing

Use the classifier to route the first useful mode:

| Scenario | Likely first mode | Why |
| --- | --- | --- |
| New repo with no `.seo/` | `bootstrap` | Workspace, context, audit, and backlog do not exist yet; ask the install-mode question first (`references/hub-mode.md`) |
| Existing `.seo/` with no narrow ask | `operate` | Continue from current focus, in-progress work, or evidence-backed checkpoint |
| Public pages broken or invisible | `technical-seo-fix` | Indexability blocks make content and backlink work premature |
| GSC has query/page data | `technical-seo-fix` or `content-ops` | Data may support metadata, internal-link, content, or cannibalization work |
| Blog or content engine exists | `content-ops` | Plan only after publish path and sitemap route are real |
| Programmatic page idea | `pseo-planning` | pSEO must pass quality, data, links, and noindex/sitemap gates before publishing |
| GBP or local-map intent | `local-seo` | Local surfaces have separate evidence and ownership |
| Traffic or rankings dropped | `diagnose` | Characterize the drop (branded split, AI-Overviews/SERP feature, core update, technical regression) with evidence before acting — see `references/search-console.md` Diagnosis section |
| Month-end review | `monthly-report` | Summarize deltas and choose one next action |

## Marketing Skill Bridge

The portable core must work alone. When these skills or equivalent local docs are available, use them as expert lenses instead of duplicating their full workflows:

| Skill | Use for |
| --- | --- |
| `product-marketing` | ICP, positioning, differentiation, voice, proof, conversion paths |
| `customer-research` | Pains, objections, jobs-to-be-done, intent language |
| `content-strategy` | Clusters, editorial sequence, content portfolio gaps |
| `copywriting` / `copy-editing` | Landing-page, CTA, title, meta, and snippet copy |
| `cro` | CTA flow, form friction, mobile conversion path, trust blocks |
| `analytics` | Event, pageview, funnel, and conversion proof |
| `schema` | Structured data implementation details |
| `seo-audit` | Cross-checking broad technical SEO findings |
| `ai-seo` | AI search visibility without speculative hacks |
| `site-architecture` | Navigation, URL hierarchy, internal-link structure |
| `programmatic-seo` | Page types, data quality, templates, publish gates |
| `competitor-profiling` / `competitors` | SERP competitors, comparison pages, alternative pages |
| `directory-submissions`, `free-tools`, `lead-magnets` | Legitimate authority and linkable-asset work |

If a bridge skill is not installed, use the phase ladder and existing references directly.

## AI Search Note

Treat AI/LLM visibility as a default part of organic growth, not an opt-in experiment. Check AI-crawler access during the `technical` phase and run the `ai-visibility` phase (citation spot-checks, assistant-referral tracking) with `references/ai-search-visibility.md`.

For Google Search, this is still SEO, not a separate hack track: crawlable helpful content, clear entities, useful media, visible proof, and normal technical eligibility. Do not make `llms.txt`, chunking, synthetic mentions, or "AEO/GEO" tricks a required Google Search gate; label unproven tactics honestly.
