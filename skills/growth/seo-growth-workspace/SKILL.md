---
name: seo-growth-workspace
description: "Use when starting, auditing, or operating SEO or organic growth for a product or local-business website — technical SEO, Search Console, keyword/content ops, schema, pSEO, local SEO/GBP, backlinks, AI-search visibility, conversion, and monthly reporting. Triggers: \"set up SEO\", \"audit my site\", \"my traffic dropped\", \"why am I not ranking\", \"Search Console opportunities\", \"monthly SEO report\", \"how do we show up in ChatGPT/AI search\". Creates a durable .seo workspace, captures business context, audits live/code/admin evidence, prioritizes a backlog, implements one high-leverage action, verifies reality, and logs handoff notes. For standalone copywriting, paid channels, or email, use a dedicated skill."
version: 2.1.0
license: MIT
mutating: true
writes_to: [.seo/]
---

# SEO Growth Workspace

Run a durable SEO operating workspace for a product or local-business website. The goal is not generic advice; it is evidence, prioritization, implementation, verification, and continuity.

Use this skill as a mode router. Load only the reference needed for the selected mode or phase.

## Ground Rules

- Speak to the user in their preferred language; keep code identifiers in English.
- Match the target site's language, market, and brand voice for public content.
- Use the target repo's package manager, deployment path, auth workflow, and available UI/browser validation tool. The bundled scripts are dependency-free and run with `node` (Node 18+) in any repo.
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

Pick the narrowest mode that satisfies the request. If no narrower mode is requested, use `operate`: read existing `.seo/` state, choose the next evidence-backed action, do one useful step, verify it, and log the handoff. If the user asks for a full first run, load `references/phase-architecture.md`, start with `bootstrap`, then continue in `operate`.

| Mode | Use when | Exit criteria |
| --- | --- | --- |
| `operate` | Continuing SEO work without a narrower request | Current state is read, next work is chosen, one useful step is verified, and `.seo/log.md` is updated |
| `bootstrap` | Starting or auditing an SEO workspace | `.seo/` exists, business context exists, first audit/backlog are populated |
| `technical-seo-fix` | Fixing robots, sitemap, canonicals, metadata, schema, redirects, analytics, CWV, hreflang, AI-crawler access, or indexability | Change is deployed or documented as blocked, then live verified |
| `content-ops` | Planning or operating keywords, blog calendars, briefs, articles, internal links, or a content engine | Keyword/content state is visible, publish path is verified or blocked, and next rows are documented |
| `pseo-planning` | Creating pSEO page types, data, or publish gates | `.seo/pseo/plan.md` and data/specs exist; publish/no-publish decision is explicit |
| `local-seo` | GBP/local-map intent, service areas, citations, reviews, local competitors | Competitor/GBP matrix and prioritized local action plan are produced |
| `monthly-report` | Reporting performance or deciding next-month SEO actions | One-page report with wins, problems, metric deltas, and the single next action |

## Progressive References

Load only the file needed for the mode or ticket:

- First-run phase architecture and site-type classifier: `references/phase-architecture.md`
- Operating loop and handoff: `references/operating-loop.md`
- Business context intake: `references/business-context.md`
- Admin/auth evidence: `references/admin-preflight.md`
- Local adapters and repo-specific bridges: `references/adapters.md`
- Technical SEO checks/fixes (incl. CWV field data, AI-crawler access, JS rendering): `references/technical-seo.md`
- International/multilingual (hreflang): `references/international-seo.md`
- Search Console opportunity analysis (CLI pipeline, banded CTR, cannibalization): `references/search-console.md`
- Keywords/blog/content-engine operations (research method, scoring, E-E-A-T): `references/content-ops.md`
- Content-engine webhook publishing (receive, verify, deploy; headless CLI config for SuperaSEO): `references/content-engine-webhooks.md`
- pSEO publish gates and playbook chooser: `references/pseo-gates.md`
- Ticket taxonomy, work selection, statuses, and done criteria: `references/ticket-architecture.md`
- Internal linking audits: `references/internal-linking.md`
- Schema and rich-results work: `references/schema-rich-results.md`
- Content decay and refresh/consolidate/remove decisions: `references/content-refresh.md`
- Conversion and CTA audits: `references/conversion-cta.md`
- Local SEO/GBP/citations: `references/local-seo-gbp.md`
- Backlinks/entity authority, directories, digital PR: `references/backlinks-entity.md`
- Competitor profiling and dated snapshots: `references/competitor-profiling.md`
- Third-party keyword/SERP/backlink data tools: `references/data-tools.md`
- AI/LLM search visibility (ChatGPT, Perplexity, AI Overviews): `references/ai-search-visibility.md`
- Monthly reporting: `references/monthly-reporting.md`

Use templates from `templates/` for report shape. Use scripts when deterministic scaffolding or analysis is useful (all run with `node`, no dependencies):

- `scripts/bootstrap-seo-workspace.mjs` creates the base `.seo/` workspace without overwriting files.
- `scripts/gsc-oauth.mjs` creates a local refresh-token env file without printing token values.
- `scripts/gsc-fetch.mjs` fetches Search Console `query,page` rows with pagination using env credentials.
- `scripts/gsc-opportunities.mjs` turns exported GSC rows into position-banded CTR, page-2, and cannibalization opportunity tables; `--brand` excludes branded queries, `--format backlog` emits draft `.seo/backlog.md` rows for review.
- `scripts/monthly-report.mjs` builds a one-page monthly SEO report from exported GSC, backlog, keyword, and calendar files.

## Core Workflow

1. State assumptions, target root, live URL, market, language, and success criteria.
2. Classify the site type and next phase with `references/phase-architecture.md` when the request is broad, first-run, or ambiguous.
3. Choose the mode and load only its reference file. For `operate`, load `references/operating-loop.md`, then load the narrow reference required by the chosen ticket.
4. Create or update `.seo/context.md` using `references/business-context.md`. In no-write runs, use existing context from `.seo/strategy.md`, `.seo/audit.md`, and `.seo/README.md` if `.seo/context.md` is missing, then record workspace drift instead of forcing a write.
5. Capture admin/auth evidence with `references/admin-preflight.md` before changing production or authenticated surfaces.
6. Load `references/adapters.md` when the repo has a content engine, CMS, publisher bot, local skill customizations, or `.seo/adapters/` notes.
7. Load `references/ticket-architecture.md` before writing or changing `.seo/backlog.md`.
8. Execute the mode's reference workflow, verify live results (use at least one mobile viewport for UI/CTA work), and update `.seo/` files only where facts changed.

## Optional Expert Lenses

When adjacent marketing skills are installed, use them as lenses, not dependencies. The Marketing Skill Bridge table in `references/phase-architecture.md` maps which skill helps which phase. If none are installed, this skill's references are sufficient.
