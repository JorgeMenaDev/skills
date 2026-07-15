---
name: seo-growth-workspace
description: "Use when starting, auditing, or operating SEO or organic growth for a product or local-business website — technical SEO, Search Console, keyword/content ops, schema, pSEO, local SEO/GBP, backlinks, AI-search visibility, conversion, and monthly reporting. Triggers: \"set up SEO\", \"audit my site\", \"my traffic dropped\", \"why am I not ranking\", \"Search Console opportunities\", \"monthly SEO report\", \"how do we show up in ChatGPT/AI search\". Creates a durable .seo workspace, captures business context, audits live/code/admin evidence, prioritizes a backlog, implements one high-leverage action, verifies reality, and logs handoff notes. Installs in a single site repo (standalone) or in an orchestrator/agent-profile repo managing many sites (hub). For standalone copywriting, paid channels, or email, use a dedicated skill."
version: 5.2.2
license: MIT
mutating: true
writes_to: [".seo/", "operator-declared bootstrap plan path"]
---

# SEO Growth Workspace

> **Contribute within authority.** The active workspace contract and current task scope decide whether a run may modify this skill, open an upstream pull request, or record portable SEO-operations friction. When authorized, fix the canonical source and use its normal release flow. When upstream maintenance is not authorized, leave the skill untouched; if the normal `.seo/log.md` handoff is already in scope, record concrete, non-duplicate friction there. Invoking this skill never implies product-development scope. During a site run, the post-run contribution boundary in `references/never-dry-loop.md` applies.

Run a durable SEO operating workspace for a product or local-business website. The goal is not generic advice; it is evidence, prioritization, implementation, verification, and continuity.

Use this skill as a mode router. Load only the reference needed for the selected mode or phase.

## Ground Rules

- Speak to the user in their preferred language; keep code identifiers in English.
- Match the target site's language, market, and brand voice for public content.
- Use the target repo's package manager, deployment path, auth workflow, and available UI/browser validation tool. The bundled scripts are dependency-free and run with `node` (Node 18+) in any repo.
- When the runtime provides a research skill (for example `/research`), delegate online research legwork — documentation, third-party facts, claim-source reading — through it instead of ad-hoc web searching. Each mode's own evidence and recording contract still governs what gets captured.
- Do not print secrets from environment files, hosting dashboards, analytics, Search Console, OAuth, email, billing, or admin surfaces.
- Keep one current focus ticket at a time.
- Do not create task lists outside `.seo/backlog.md`.
- Use `.seo/audit.md` for evidence, `.seo/strategy.md` for decisions/tooling, `.seo/log.md` for handoffs, and `.seo/reports/` for dated reports.
- Prefer matrix-shaped audit outputs: compared entities, evidence, gap, impact, time-to-result, owner, next action.
- Produce actual copy, schema, calendar rows, scripts, code, or admin changes where the mode calls for it.

## Required Workspace

Create or verify this structure at SITE_WORKSPACE (see Install Modes for where that is):

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
    asset-rights.md   # optional: scaffolded on create; existing workspaces add it via create-optional, absence is not drift
    summary.md
    work-log.md
  reports/
  scripts/
  pseo/
```

## Install Modes

The skill installs in one of two modes, stamped in `.seo/config.json` (`{"mode": "standalone" | "hub", ...}` — field semantics in `references/hub-mode.md`):

- **standalone** — a normal site repo; the workspace is repo-local `.seo/`. Use another durable workspace root only when the user explicitly asks for SEO memory outside the repo.
- **hub** — an orchestrator repo (for example an agent profile) that manages SEO for many sites. The hub's `.seo/` holds `config.json`, `registry.md`, `portfolio-index.md`, and one full workspace per managed site under `.seo/sites/<slug>/`.

**Path semantics** — four terms, used here and in every reference:

- **HUB_ROOT** — the hub's physical `.seo/` directory. Holds only hub routing state (`config.json`, `registry.md`, `portfolio-index.md`, `sites/`, optional `loops/`), never site work.
- **SITE_WORKSPACE** — the one workspace a run operates: repo-local `.seo/` in standalone mode; `HUB_ROOT/sites/<slug>/` (or an external registry root) in hub mode.
- **TARGET_REPO** — the repo whose site is being changed (code, deploys, robots, metadata). Contains SITE_WORKSPACE in standalone mode; in hub mode it is usually a different repo.
- **SKILL_DIR** — the installed skill folder (`references/`, `templates/`, `scripts/`). Invoke bundled scripts from SKILL_DIR with explicit SITE_WORKSPACE paths.

Workspace-file prose like `.seo/backlog.md` in this file and the references means `SITE_WORKSPACE/backlog.md`; the same holds inside a workspace's own generated files (README, backlog, templates). Hub state is always written as an explicit HUB_ROOT path.

**Doctor first**: before bootstrap or migration, run `$SKILL_DIR/scripts/seo-doctor.mjs`. It is read-only across scan roots; with `--plan-output` it may write that one caller-declared path only, outside every scan root. Review the diagnosis, then rerun with an explicit `create | adopt | migrate | repair` decision; new hub roots require an explicit reviewed `--hub`. Bootstrap accepts a current hashed plan and `create | adopt | verify | repair`; it recomputes the bound install mode, root/domain/search roots, discoverable-registry catalog, and source hashes before writing, consumes mutating plans once, and refuses migrate. A legacy workspace is adoptable only when at least three files match the exact tolerant schema-1 signatures and identity is explicit or canonical-registry-proven; filenames alone are insufficient. In hub mode, canonical `.seo/registry.md` routes while `.agents/seo/REGISTRY.md` is inventory only. Full lifecycle and target rules: `references/hub-mode.md` and `references/migrate-uninstall.md`.

## Choose A Mode

Pick the narrowest mode that satisfies the request. If no narrower mode is requested, use `operate`: read existing `.seo/` state, choose the next evidence-backed action, and resolve the run through the three-terminal contract in `references/never-dry-loop.md`. If the user asks for a full first run, load `references/phase-architecture.md`, start with `bootstrap`, then continue in `operate`. In hub mode, resolve the target site first (`references/hub-mode.md`); the modes themselves are unchanged.

| Mode | Use when | Exit criteria |
| --- | --- | --- |
| `operate` | Continuing SEO work without a narrower request | Current state is read, next work is chosen, and one three-terminal result is recorded with its evidence and handoff |
| `bootstrap` | Starting or auditing an SEO workspace | `.seo/` exists, business context exists, first audit/backlog are populated |
| `technical-seo-fix` | Fixing robots, sitemap, canonicals, metadata, schema, redirects, analytics, CWV, hreflang, AI-crawler access, or indexability | Change is deployed or documented as blocked, then live verified |
| `content-ops` | Planning or operating keywords, blog calendars, briefs, articles, utility/tool pages, internal links, or a content engine | Keyword/content state is visible, publish path is verified or blocked, and next rows are documented |
| `pseo-planning` | Creating pSEO page types, data, or publish gates | `.seo/pseo/plan.md` and data/specs exist; publish/no-publish decision is explicit |
| `local-seo` | GBP/local-map intent, service areas, citations, reviews, local competitors | Competitor/GBP matrix and prioritized local action plan are produced |
| `monthly-report` | Reporting performance or deciding next-month SEO actions | One-page report with wins, problems, metric deltas, and the single next action |
| `diagnose` | Traffic or rankings dropped | Drop is characterized as branded/non-branded + SERP-feature/AI-Overviews vs core-update vs technical regression, with evidence, and the next action is filed (see `references/search-console.md` Diagnosis section) |

## Progressive References

Load only the file needed for the mode or ticket:

- Install modes, hub layout, and hub target resolution: `references/hub-mode.md`
- Migration (standalone → hub), uninstall, and post-migration hygiene: `references/migrate-uninstall.md`
- First-run phase architecture and site-type classifier: `references/phase-architecture.md`
- Operating loop and handoff: `references/operating-loop.md`
- Fixed stage, cadence, frontier, gate, ship-cap, measurement, and concurrency policy: `references/operating-policy.md`
- Three-terminal loop contract, wake state, certificates, cadence occurrences, measurement obligations, coverage, and the post-upgrade recap (reconciled-version stamp): `references/never-dry-loop.md`
- Business context intake: `references/business-context.md`
- Admin/auth evidence: `references/admin-preflight.md`
- Local adapters and repo-specific bridges: `references/adapters.md`
- Technical SEO checks/fixes (incl. CWV field data, AI-crawler access, JS rendering): `references/technical-seo.md`
- International/multilingual (hreflang): `references/international-seo.md`
- Search Console opportunity analysis (CLI pipeline, banded CTR, cannibalization): `references/search-console.md`
- Keywords/blog/content-engine operations (research method, scoring, E-E-A-T): `references/content-ops.md`
- Owned pages synthesizing forums, Q&A, or other community sources: `references/community-source-pages.md`
- Page/revision claim, voice, asset, approval, and rendered-citation evidence for new or materially revised SEO pages: `references/page-evidence.md`
- New-page implementation, deploy, live verification, and optional discovery submission: `references/page-launch.md`
- Utility/free tool pages (calculators, generators, checkers, formatters, templates): `references/utility-tool-pages.md`
- Content-engine webhook publishing (receive, verify, deploy; includes one worked example): `references/content-engine-webhooks.md`
- pSEO publish gates and playbook chooser: `references/pseo-gates.md`
- Ticket taxonomy, work selection, statuses, and done criteria: `references/ticket-architecture.md`
- Empty-Ready opportunity discovery and progressive coverage: `references/frontier-sweep.md`
- Internal linking audits: `references/internal-linking.md`
- Schema and rich-results work: `references/schema-rich-results.md`
- Content decay and refresh/consolidate/remove decisions: `references/content-refresh.md`
- Conversion and CTA audits: `references/conversion-cta.md`
- Aggregate PostHog landing-page outcomes for SEO/marketing/sales decisions: `references/posthog-outcome-bridge.md`
- Local SEO/GBP/citations: `references/local-seo-gbp.md`
- Backlinks/entity authority, directories, digital PR: `references/backlinks-entity.md`
- Image distribution, reuse discovery, and rights-gated attribution outreach: `references/image-rights.md`
- Comparisons, listicles, affiliate/referral relationships, and commercial disclosures: `references/commercial-integrity.md`
- E-commerce and marketplace prioritization, page-type, collection, facet/variant/inventory, and commerce-truth decisions: `references/ecommerce-seo.md`
- Affiliate/referral offers, coupons, promo codes, and commission lifecycle: `references/affiliate-promo-integrity.md`
- Competitor profiling and dated snapshots: `references/competitor-profiling.md`
- Third-party keyword/SERP/backlink data tools: `references/data-tools.md`
- AI/LLM search visibility (ChatGPT, Perplexity, AI Overviews): `references/ai-search-visibility.md`
- Monthly reporting: `references/monthly-reporting.md`
- Unattended/cron/delegated runs: `references/scheduled-operation.md`
- Multi-site/portfolio requests and the site registry: `references/portfolio-registry.md`

Use templates from `templates/` for report shape. Use scripts when deterministic scaffolding or analysis is useful (all run with `node`, no dependencies):

- `scripts/seo-doctor.mjs` classifies exact schema-1 state, canonical/legacy registries, installs/lock/active paths, generated drift, and stat-only credential permissions. Its short-lived plan binds every reviewed source.
- `scripts/bootstrap-seo-workspace.mjs` consumes that plan: create scaffolds once, adopt writes config only, verify writes nothing, repair creates only the reviewed missing generated allowlist, and create-optional creates only a reviewed absent optional artifact.
- `scripts/gsc-oauth.mjs` creates a local refresh-token env file without printing token values.
- `scripts/gsc-fetch.mjs` fetches Search Console `query,page` rows (default) or page-dimensional metrics with pagination using env credentials; Search Console still exposes top rows, not guaranteed-complete data.
- `scripts/gsc-opportunities.mjs` turns exported GSC rows into position-banded CTR, page-2, and cannibalization opportunity tables; on early-stage data with nothing inside positions 1-20 it falls back to impression-clusters-by-page so sparse exports still yield a next action. `--brand` excludes branded queries, `--format backlog` emits draft `.seo/backlog.md` rows for review.
- `scripts/cadence-status.mjs` cold-reads schema-1 loop cadence state and emits draft backlog rows or structured JSON with the earliest next-due date.
- `scripts/monthly-report.mjs` builds a one-page monthly SEO report from exported GSC, backlog, keyword, and calendar files.
- `scripts/portfolio-status.mjs` reads the site registry and each workspace's `.seo/` state into a ranked cross-site "which site deserves the next SEO hour" table.

Check the lifecycle command contracts from any CWD:

```bash
node "$SKILL_DIR/scripts/seo-doctor.mjs" --help
node "$SKILL_DIR/scripts/bootstrap-seo-workspace.mjs" --help
```

## Core Workflow

1. State assumptions, install mode, resolved target workspace, live URL, market, language, and success criteria.
2. Classify the site type and next phase with `references/phase-architecture.md` when the request is broad, first-run, or ambiguous.
3. Choose the mode and load only its reference file. For `operate`, load `references/operating-loop.md`, then load the narrow reference required by the chosen ticket.
4. Create or update `.seo/context.md` using `references/business-context.md`. In no-write runs, use existing context from `.seo/strategy.md`, `.seo/audit.md`, and `.seo/README.md` if `.seo/context.md` is missing, then record workspace drift instead of forcing a write.
5. Capture admin/auth evidence with `references/admin-preflight.md` before changing production or authenticated surfaces.
6. Load `references/adapters.md` when the repo has a content engine, CMS, publisher bot, local skill customizations, or `.seo/adapters/` notes.
7. Load `references/ticket-architecture.md` before writing or changing `.seo/backlog.md`.
8. When a ticket creates or materially revises a public SEO page, load `references/page-launch.md`, `references/page-evidence.md`, `references/technical-seo.md`, `references/schema-rich-results.md`, and `references/search-console.md`. Do not move the ticket to Done until every applicable mandatory launch gate has `PASS` evidence; record any failed gate as a named blocker and keep the ticket Blocked. The optional discovery-submission decision must still be logged.
9. Execute the mode's reference workflow, verify live results (use at least one mobile viewport for UI/CTA work), and update `.seo/` files only where facts changed.

## Optional Expert Lenses

When adjacent marketing skills are installed, use them as lenses, not dependencies. The Marketing Skill Bridge table in `references/phase-architecture.md` maps which skill helps which phase. If none are installed, this skill's references are sufficient.
