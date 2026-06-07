---
name: seo-growth-workspace
description: "Use when starting, auditing, or operating SEO, Search Console, schema, content, local SEO, backlinks, analytics, conversion, pSEO, or ongoing organic-growth work for a product or local-business website. Creates a durable .seo workspace, captures business context, audits live/code/admin evidence, prioritizes a backlog, implements one high-leverage action, verifies reality, and logs handoff notes."
---

# SEO Growth Workspace

Run a durable SEO operating workspace for a product or local-business website. The goal is not generic advice; it is evidence, prioritization, implementation, verification, and continuity.

Use this skill as a mode router. Load only the reference needed for the selected mode.

## Ground Rules

- Speak to the user in their preferred language; keep code identifiers in English.
- Match the target site's language, market, and brand voice for public content.
- Use the target repo's package manager, deployment path, auth workflow, and available UI/browser validation tool.
- Do not print secrets from environment files, hosting dashboards, analytics, Search Console, OAuth, email, billing, or admin surfaces.
- Keep one current focus ticket at a time.
- Do not create task lists outside `.seo/backlog.md`.
- Use `.seo/audit.md` for evidence, `.seo/strategy.md` for decisions/tooling, `.seo/log.md` for handoffs, and `.seo/reports/` for dated reports.
- Prefer matrix-shaped audit outputs: compared entities, evidence, gap, impact, time-to-result, owner, next action.
- Produce actual copy, schema, calendar rows, scripts, code, or admin changes where the mode calls for it.

## Required Workspace

Create or verify this structure at the target root:

```text
.seo/
  README.md
  context.md
  backlog.md
  log.md
  strategy.md
  audit.md
  taxonomy.md
  backlinks/
    summary.md
    work-log.md
  reports/
  scripts/
  pseo/
```

Use repo-local `.seo/` by default. Use another durable workspace root only when the user explicitly asks for SEO memory outside the repo.

## Choose A Mode

Pick the narrowest mode that satisfies the request. If no narrower mode is requested, use `operate`: read existing `.seo/` state, choose the next evidence-backed action, do one useful step, verify it, and log the handoff. If the user asks for a full first run, start with `bootstrap`, then continue in `operate`.

| Mode | Use when | Exit criteria |
| --- | --- | --- |
| `operate` | Continuing SEO work without a narrower request | Current state is read, next work is chosen, one useful step is verified, and `.seo/log.md` is updated |
| `bootstrap` | Starting or auditing an SEO workspace | `.seo/` exists, business context exists, first audit/backlog are populated |
| `technical-seo-fix` | Fixing robots, sitemap, canonicals, metadata, schema, redirects, analytics, CWV, or indexability | Change is deployed or documented as blocked, then live verified |
| `content-ops` | Planning or operating keywords, blog calendars, briefs, articles, internal links, or a content engine | Keyword/content state is visible, publish path is verified or blocked, and next rows are documented |
| `pseo-planning` | Creating pSEO page types, data, or publish gates | `.seo/pseo/plan.md` and data/specs exist; publish/no-publish decision is explicit |
| `local-seo` | GBP/local-map intent, service areas, citations, reviews, local competitors | Competitor/GBP matrix and prioritized local action plan are produced |
| `monthly-report` | Reporting performance or deciding next-month SEO actions | One-page report with wins, problems, metric deltas, and the single next action |

## Progressive References

Load only the file needed for the mode or ticket:

- Operating loop and handoff: `references/operating-loop.md`
- Business context intake: `references/business-context.md`
- Admin/auth evidence: `references/admin-preflight.md`
- Technical SEO checks/fixes: `references/technical-seo.md`
- Search Console opportunity analysis: `references/search-console.md`
- Keywords/blog/content-engine operations: `references/content-ops.md`
- pSEO publish gates: `references/pseo-gates.md`
- Ticket taxonomy, statuses, and done criteria: `references/ticket-architecture.md`
- Internal linking audits: `references/internal-linking.md`
- Schema and rich-results work: `references/schema-rich-results.md`
- Content decay and refresh workflows: `references/content-refresh.md`
- Conversion and CTA audits: `references/conversion-cta.md`
- Local SEO/GBP/citations: `references/local-seo-gbp.md`
- Backlinks/entity authority: `references/backlinks-entity.md`
- Monthly reporting: `references/monthly-reporting.md`

Use templates from `templates/` for report shape. Use scripts when deterministic scaffolding or analysis is useful:

- `scripts/bootstrap-seo-workspace.mjs` creates the base `.seo/` workspace without overwriting files.
- `scripts/gsc-fetch.mjs` fetches Search Console `query,page` rows when an OAuth access token is available.
- `scripts/gsc-oauth.mjs` helps create a local refresh-token env file without printing token values.
- `scripts/gsc-opportunities.mjs` converts a Search Console API response into page-2 and CTR opportunity tables.
- `scripts/gsc-to-backlog.mjs` converts Search Console rows into draft `.seo/backlog.md` rows for review.
- `scripts/backlog-to-content-keywords.mjs` extracts content tickets from `.seo/backlog.md` into a keyword import draft.
- `scripts/monthly-state.mjs` builds monthly reporting state from exported GSC rows, backlog, keyword tiers, and calendar snapshots.
- `scripts/monthly-report.mjs` builds a one-page monthly SEO report from exported GSC, backlog, keyword, and calendar state.
- `scripts/validate-skill.mjs` checks references/templates/scripts and smoke-tests helpers.

Use `fixtures/` only when validating or editing bundled scripts.

## Core Workflow

1. State assumptions, target root, live URL, market, language, and success criteria.
2. Choose the mode and load only its reference file. For `operate`, load `references/operating-loop.md`, then load the narrow reference required by the chosen ticket.
3. Create or update `.seo/context.md` using `references/business-context.md`. Mark unknowns plainly.
4. Capture admin/auth evidence with `references/admin-preflight.md` before changing production or authenticated surfaces.
5. Load `references/ticket-architecture.md` before writing or changing `.seo/backlog.md`.
6. Audit production and code: robots, sitemap, canonicals, metadata, status codes, redirects, mobile rendering, schema, internal links, noindex, HTTPS, performance, conversion paths, analytics, Search Console, backlink state.
7. Write `.seo/audit.md` with evidence and link each finding to a backlog ID.
8. Seed `.seo/backlog.md` in priority order: P0 indexability/Search Console/sitemap, P1 CTR/conversion/analytics, P2 CWV/schema, P3 content/internal links/pSEO, P4 backlinks/regional/monitoring.
9. Implement the top accessible Ready ticket.
10. Run checks/build with the target repo's package manager.
11. Deploy through the target repo's established production path when access exists.
12. Verify live production metadata, robots/sitemap/schema/analytics/UI. Use at least one mobile viewport for UI/CTA work.
13. Update `.seo/backlog.md`, `.seo/log.md`, `.seo/audit.md`, `.seo/strategy.md`, and `.seo/backlinks/work-log.md` only where facts changed.

## Content And pSEO Gates

- Do not schedule content work until the target has a working renderer, CMS, or publishing destination.
- If using a content engine, verify project/config state, keyword imports, scheduled rows, and authenticated UI/admin visibility. If backend/admin and UI disagree, log it as a blocker.
- Map `.seo/backlog.md` content tickets to the target's content-engine artifacts instead of duplicating planning.
- Add public blog hubs and post routes to `sitemap.xml` before treating content publishing as complete.
- Do not mass-publish pSEO on a fresh domain. First prove at least one normal article can be deployed, linked, submitted or discovered, and quality-reviewed.
- pSEO pages must have unique copy, concrete intent, internal links, and explicit no-publish/publish status in `.seo/pseo/plan.md`.

## Search Console

When authenticated access is available:

- Confirm property type and verified access.
- Submit/resubmit sitemap when the sitemap is new or changed.
- Record performance top queries/pages for the last 3 months when data exists.
- Record indexing reasons, sitemap discovered URLs, links, CWV, HTTPS, and rich result reports.
- Inspect important changed URLs and request indexing only after real improvements.
- If API access exists, use the bundled GSC scripts or document the target's established API path. Otherwise document browser-only access and blocked API setup.
- For opportunity work, load `references/search-console.md` and produce a matrix for page-2 keywords, high-impression/low-CTR pages, money-page mapping, and cannibalization.

## Backlinks

Prioritize legitimate, relevant links: local/regional directories, industry associations, public SaaS/startup profiles, trade publications, partner/resource pages, and first-party linkable assets.

Do not invent legal company details, addresses, phone numbers, certifications, customers, or proof. Label pending submissions honestly; a backlink is live only when the public page is indexable and contains the link.

For local-business work, treat Google Business Profile, reviews, photos, services, posts, citations, and NAP consistency as first-class SEO surfaces. Load `references/local-seo-gbp.md`.
