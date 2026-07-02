# SEO Growth Workspace Audit

Date: 2026-06-07
Skill: `seo-growth-workspace`

## Executive Summary

`seo-growth-workspace` is already a strong skill. It has a compact router, progressive reference files, durable `.seo` state, scripts, fixtures, templates, and a structural validator. The main release risk is not that the skill lacks SEO topics. The main risk is that it does not yet prove reliable phase selection and prioritization across different repo/business shapes.

The next version should become a clearer SEO operating system:

1. Diagnose the site type and business model.
2. Fix code-owned technical SEO foundations.
3. Improve metadata and snippets.
4. Add only visible-content-matched schema.
5. Verify Search Console, analytics, and conversion proof.
6. Improve landing-page copy and CTAs.
7. Build content and blog workflows only after the publishing path works.
8. Build internal links and site architecture.
9. Add pSEO only after quality gates are proven.
10. Add local SEO, entity, directory, and backlink work where relevant.
11. Report monthly and continue from durable state.

## Current Strengths

| Area | Evidence | Why it matters |
| --- | --- | --- |
| Router shape | `SKILL.md` chooses narrow modes and links references | Keeps top-level instructions concise and progressively disclosed |
| Durable state | `.seo/` workspace with backlog, log, audit, strategy, reports, backlinks, pSEO | Allows future agents to continue instead of restarting |
| Proof orientation | Live verification gates and handoff log requirements | Prevents advice-only SEO work |
| SEO breadth | Technical SEO, GSC, content ops, pSEO, local SEO, backlinks, CTA/conversion, reporting | Covers the main growth surfaces |
| Portability | No obvious project-name contamination in current package scan | Suitable base for cross-repo use |
| Tooling | Bundled scripts, fixtures, templates, and `validate-skill.mjs` | Enables deterministic scaffolding and release checks |

## Matt-Style Architecture Audit

| Principle | Current state | Improvement |
| --- | --- | --- |
| Concise | `SKILL.md` is short enough for a domain skill | Keep it as a router; avoid adding long SEO encyclopedia content |
| One responsibility | The skill owns ongoing SEO growth operation | Clarify that all modes serve one job: evidence-backed organic growth from repo/admin state |
| Composable | Works with `.seo` artifacts and product context | Add explicit bridge to marketing skills without depending on them |
| Progressive disclosure | Mode-specific references exist | Add a first-run phase ladder and site-type classifier as compact references |
| Harness-agnostic | Mostly uses repo/package-manager language | Clean user-facing `node` commands to `bun`; keep Browser/Chrome guidance generic |
| Well-documented | References and templates are practical | Add a release checklist and scenario-profile evaluator |
| Portable | No obvious SuperaSEO/Jorge/Hermes contamination | Keep optional project integrations outside the portable core |
| Secure | Secrets and admin evidence are handled cautiously | Preserve no-secret rules in OAuth/GSC/admin docs |

## SEO And Marketing Coverage Audit

### Code-Owned Technical SEO

Current coverage is good: indexability, robots, sitemap, canonicals, metadata, redirects, mobile rendering, schema, internal links, analytics, HTTPS, and performance are all present.

Needed improvement:

- Make the first-run order more explicit: crawlability/indexability before copy/content/pSEO.
- Add route-family thinking directly to the phase architecture.
- Remind the agent to inspect rendered output when JS or framework metadata can differ from source code.

### Metadata And Snippet Work

Current coverage exists in `technical-seo.md` and `search-console.md`.

Needed improvement:

- Make title/H1/meta/OG/canonical work a named early phase.
- Require intent, page fit, and conversion path before CTR rewrites.
- Separate brand-query changes from non-brand growth opportunities.

### JSON-LD And Rich Results

Current coverage is practical, but FAQ guidance is stale as a Google growth lever.

Needed improvement:

- Keep `FAQPage` only when FAQs are visible and useful to users.
- Add explicit note that Google FAQ rich results no longer appear as of 2026-05-07 and Search Console API FAQ appearance support is being deprecated in August 2026.
- Reinforce that structured data must match visible page content and must not invent proof.

Sources:

- Google structured data quality guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Search Analytics API FAQ deprecation note: https://developers.google.com/webmaster-tools/v1/searchanalytics/query

### AI Search

The skill currently does not have an explicit AI-search stance.

Needed improvement:

- Add a sober AI SEO note: Google says SEO remains relevant for AI features because those systems rely on core Search ranking and quality systems.
- Do not add `llms.txt`, content chunking, synthetic mentions, or "AEO/GEO hacks" as hard gates for Google Search.
- Optional AI visibility work should focus on helpful content, crawlability, clear entities, images/video where useful, and brand proof.

Source:

- Google generative AI Search guidance: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

### Landing Pages, CTA, And Copy

Current `conversion-cta.md` is useful but should connect more directly to SEO phases.

Needed improvement:

- Treat landing-page copy as SEO work when the page targets commercial intent.
- Require one clear primary CTA, one backup CTA when appropriate, proof/trust, objection handling, mobile CTA verification, and event tracking.
- Pull from product-marketing context when present instead of inventing positioning.

### Content, Blog, And Programmatic SEO

Current gates are cautious and good: do not schedule content until the renderer/CMS/publish path exists; do not mass-publish pSEO on a fresh domain.

Needed improvement:

- Add site-type-specific pSEO caution: SaaS comparison pages, local service-area pages, ecommerce/category pages, docs/tool pages, and blog clusters need different proof.
- Add a "normal content before pSEO" rule in the top-level phase ladder.
- Add content quality and conversion intent as gates, not just unique copy and internal links.

### Search Console And Measurement

Current Search Console helper scripts are useful, but they are not a full prioritization model.

Needed improvement:

- Make the skill say GSC rows are inputs, not automatic priority.
- Account for brand/non-brand segmentation, country/device differences, cannibalization, and page intent.
- Treat fresh properties as baseline-only until there is enough data.

### Local SEO, Entity, Backlinks

Current local SEO and backlinks references are strong for legitimate work.

Needed improvement:

- Put local-business classification earlier so GBP, reviews, citations, service areas, photos, and NAP consistency become first-class only when relevant.
- Keep "live backlink" definition strict: indexable public page with real link.

## Proposed Skill Architecture

Top-level `SKILL.md` should remain a router. It should gain a compact first-run ladder and link to a new release/checklist reference rather than becoming a long playbook.

Recommended reference shape:

| Reference | Purpose |
| --- | --- |
| `phase-architecture.md` | Site classification, first-run ladder, phase exit criteria |
| `release-checklist.md` | Pre-publish validation and scenario proof gates |
| Existing references | Keep tactical details where they already belong |

The phase architecture should route to existing references:

| Phase | Primary references |
| --- | --- |
| Context and classification | `business-context.md`, `admin-preflight.md` |
| Technical foundations | `technical-seo.md`, `schema-rich-results.md` |
| Metadata/snippet work | `technical-seo.md`, `search-console.md` |
| Measurement | `admin-preflight.md`, `search-console.md`, `conversion-cta.md` |
| Landing page/CRO | `conversion-cta.md`, optional marketing-skill bridge |
| Content/blog | `content-ops.md`, `internal-linking.md` |
| pSEO | `pseo-gates.md`, `internal-linking.md`, `schema-rich-results.md` |
| Local SEO | `local-seo-gbp.md`, `backlinks-entity.md` |
| Authority | `backlinks-entity.md` |
| Reporting | `monthly-reporting.md`, `operating-loop.md` |

## Marketing Skill Bridge

The portable skill should not depend on local `.agents/skills`, but when those skills are installed the agent should use them as expert lenses:

| Marketing skill | When to use it |
| --- | --- |
| `product-marketing` | Product context, ICP, positioning, differentiation, proof, voice |
| `customer-research` | ICP pains, jobs-to-be-done, objections, search intent |
| `content-strategy` | Topic clusters, editorial calendar, content portfolio |
| `copywriting` / `copy-editing` | Landing-page and snippet copy |
| `cro` | CTA flow, form friction, proof, conversion audit |
| `analytics` | Event/pageview/conversion measurement |
| `schema` | Structured-data implementation details |
| `seo-audit` | Broad technical audit cross-check |
| `ai-seo` | Optional AI visibility guidance without hacks |
| `site-architecture` | Navigation, URL structure, internal linking |
| `programmatic-seo` | pSEO page type/data/template planning |
| `competitor-profiling` / `competitors` | SERP and competitor page comparisons |
| `directory-submissions` / `free-tools` / `lead-magnets` | Authority and linkable asset tactics |

## Release Evaluation Rubric

The release candidate should be measured with a deterministic evaluator before deployment. The evaluator should output JSON with a numeric score and per-category findings.

Recommended categories:

| Category | Weight | Evidence |
| --- | ---: | --- |
| Structure | 15 | Required files, references, scripts, templates, frontmatter |
| Portability | 15 | No project contamination, no hardcoded personal paths, Bun command examples |
| Matt-style architecture | 20 | Concise router, progressive disclosure, one responsibility, composability, security |
| SEO freshness | 20 | Google essentials, FAQ deprecation, visible-content schema, AI SEO caution |
| Marketing usefulness | 15 | CTA, product context, copy, content, pSEO, local/backlink coverage |
| Scenario readiness | 15 | Project profiles are classified and routed to expected phases |

Pass bar:

- Minimum score: 85 / 100
- No critical findings
- `validate-skill.mjs` passes
- At least one real repo bootstrap/operate dry run completes without modifying unrelated files

## Scenario Corpus

| Profile | Local target | Why it matters |
| --- | --- | --- |
| SuperaSEO | Local repo profile | Product/software SEO operator boundary and content engine |
| Arketix | Local repo profile | Marketing site with technical SEO, schema, analytics, Spanish copy |
| Acredix | Local repo profile | Business/product site with likely compliance-heavy content |
| Andy | Local repo profile | SaaS/product workflows and authenticated/admin surfaces |
| Laborix | Local repo profile | Legal/local-service-like SEO and content guidance |
| Local business profile | Synthetic fixture | GBP, NAP, citations, reviews, service-area pages |

## Release Risks

| Risk | Mitigation |
| --- | --- |
| Skill becomes too large | Keep `SKILL.md` as router; add references only where needed |
| SEO advice goes stale | Link to official Google docs and encode volatile items as dated notes |
| pSEO encourages low-quality pages | Keep publish gates strict and require normal content proof first |
| GSC scripts over-prioritize noisy data | Mark outputs as draft inputs requiring human/agent review |
| Local marketing skills reduce portability | Bridge to them only when installed; keep core self-contained |
| Scenario testing mutates real repos | Use dry-run/bootstrap temp copies unless explicitly approved |

## Recommended Implementation Slices

1. Add release evaluator and scenario profiles.
2. Add `phase-architecture.md` and link it from `SKILL.md`.
3. Update schema/FAQ guidance.
4. Add AI SEO guidance.
5. Add marketing-skill bridge.
6. Normalize user-facing commands to Bun.
7. Add release checklist.
8. Validate and run scenario evaluation.
