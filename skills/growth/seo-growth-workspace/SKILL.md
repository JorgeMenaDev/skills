---
name: seo-growth-workspace
description: "Use when starting, auditing, or operating SEO or organic growth for a product or local-business website — technical SEO, Search Console, keyword/content ops, schema, pSEO, local SEO/GBP, backlinks, AI-search visibility, conversion, and monthly reporting. Triggers: \"set up SEO\", \"audit my site\", \"my traffic dropped\", \"why am I not ranking\", \"Search Console opportunities\", \"monthly SEO report\", \"how do we show up in ChatGPT/AI search\". Creates a durable .seo workspace, captures business context, audits live/code/admin evidence, prioritizes a backlog, implements one high-leverage action, verifies reality, and logs handoff notes. Installs in a single site repo (standalone) or in an orchestrator/agent-profile repo managing many sites (hub). For standalone copywriting, paid channels, or email, use a dedicated skill."
version: 6.0.1
license: MIT
mutating: true
writes_to: [".seo/", "operator-declared bootstrap plan path"]
---

# SEO Growth Workspace

> **Contribute within authority.** The active workspace contract and current task scope decide whether a run may modify this skill or open an upstream PR. When authorized, fix the canonical source through its normal release flow; otherwise leave the skill untouched and record concrete, non-duplicate friction in the `.seo/log.md` handoff when that write is already in scope. Invoking this skill never implies product-development scope.

Run a durable SEO operating workspace for a product or local-business website. The goal is not generic advice; it is evidence, prioritization, implementation, verification, and continuity. Use this skill as a mode router: load only the reference the selected mode or ticket needs.

**Design rules (the constitution):** (1) Prose states intent, invariants, and completion criteria — `scripts/loop-state.mjs` owns state formats, legal transitions, and crash intermediates. (2) One file per loadable concern; no ownership disclaimers. (3) Fail-closed is reserved for the five outcome-protecting invariants: no silent dry exits; no certificate under drift or stale coverage; no ship over cap; no Done without evidence; no publish past integrity gates — everything else degrades gracefully. (4) Field-discovered ambiguity is resolved by judgment and logged (or becomes a fixture), not legislated; a new normative clause requires judgment failing twice on the same point with bad SEO consequences.

## Ground Rules

- Speak the user's language; keep code identifiers in English. Match the target site's language, market, and brand voice for public content.
- Use the target repo's package manager, deploy path, auth workflow, and UI validation tool. Bundled scripts are dependency-free (`node`, 18+).
- Delegate online research legwork through the runtime's research skill when one exists; each mode's evidence contract still governs what gets captured.
- Never print secrets from env files, dashboards, OAuth, or admin surfaces.
- One current focus ticket; no task lists outside `.seo/backlog.md`; evidence in `audit.md`, decisions in `strategy.md`, handoffs in `log.md`, dated reports in `reports/`.
- Prefer matrix-shaped audit outputs. Produce actual copy, schema, calendar rows, scripts, code, or admin changes where the mode calls for it.

## Workspace

```text
.seo/
  README.md  context.md  backlog.md  log.md  strategy.md  audit.md  taxonomy.md
  backlinks/ (summary.md, work-log.md, optional asset-rights.md)
  reports/  scripts/  pseo/  loops/  reconciliation.json
```

Two install modes, stamped in `.seo/config.json`: **standalone** (repo-local `.seo/`, one site) and **hub** (an orchestrator repo managing many sites, one full workspace per site under `.seo/sites/<slug>/`). Path terms used everywhere: **HUB_ROOT** (hub's `.seo/`, routing state only), **SITE_WORKSPACE** (the one workspace a run operates), **TARGET_REPO** (the repo whose site is changed), **SKILL_DIR** (this installed folder). Workspace prose like `.seo/backlog.md` means `SITE_WORKSPACE/backlog.md`. **Doctor first** before bootstrap or migration — lifecycle, target resolution, registry, migration, adapters, and admin preflight all live in `references/workspace.md`.

## Modes

Pick the narrowest mode; default to `operate`. A full first run loads `references/first-run.md`, starts with `bootstrap`, then continues in `operate`. In hub mode, resolve the target site first.

| Mode | Use when | Exit criteria |
| --- | --- | --- |
| `operate` | Continuing SEO work without a narrower request | State read, next work chosen, one terminal recorded with evidence and handoff (`references/operating.md`) |
| `bootstrap` | Starting or auditing an SEO workspace | `.seo/` exists, business context exists, first audit/backlog populated |
| `technical-seo-fix` | Robots, sitemap, canonicals, metadata, schema, redirects, analytics, CWV, hreflang, AI-crawler access, indexability | Change deployed or documented blocked, then live verified |
| `content-ops` | Keywords, calendars, briefs, articles, utility pages, internal links, content engines | Content state visible, publish path verified or blocked, next rows documented |
| `pseo-planning` | pSEO page types, data, publish gates | `.seo/pseo/plan.md` and data/specs exist; publish decision explicit |
| `local-seo` | GBP/local-map intent, service areas, citations, reviews | Competitor/GBP matrix and prioritized local plan produced |
| `monthly-report` | Reporting performance, deciding next month | One-page report with wins, problems, deltas, single next action |
| `diagnose` | Traffic or rankings dropped | Drop characterized with evidence (branded split, SERP-feature/AI-Overviews, core update, technical regression) and next action filed |

## References

Protocol: `operating.md` (the loop: selection, tickets, terminals, wake/sleep, cadences, obligations, ships, frontier, unattended runs, upgrade pass) · `policy.md` (fixed stages, cadences, caps, gate families, measurement timing) · `workspace.md` (install lifecycle, hub, registry, migration, adapters, admin preflight) · `first-run.md` (site classifier, phase ladder, business context).

Domain, loaded per ticket: `technical-seo.md` · `international-seo.md` · `search-console.md` · `content-ops.md` (incl. community-source pages) · `content-refresh.md` · `utility-tool-pages.md` · `internal-linking.md` · `schema-rich-results.md` · `pseo-gates.md` · `local-seo-gbp.md` · `backlinks-entity.md` (incl. image rights) · `commercial-integrity.md` (incl. affiliate/promo) · `ecommerce-seo.md` · `competitor-profiling.md` · `data-tools.md` · `ai-search-visibility.md` · `conversion.md` (CTA audits + PostHog outcome bridge) · `monthly-reporting.md` · `content-engine-webhooks.md` · `pages.md` (page evidence + launch gates).

Templates (`templates/`): monthly-report, local-seo-gbp, pseo-plan, content-plan, taxonomy. Other report shapes are inlined in their owning references.

## Scripts

All dependency-free; run from SKILL_DIR with explicit SITE_WORKSPACE paths; `--help` on each documents its contract.

- `loop-state.mjs` — **the loop-state protocol, compiled**: single writer/validator for `loops/` state and the reconciliation stamp. `verify` (read-only; `--repair` fixes policy mirrors), `occurrence`/`obligation` lifecycles with idempotent crash retries, `ship record` + `cap`, `sleep certify|heartbeat` (fail-closed exit codes for drift, in-flight state, stale coverage, armed autopublish), `stamp check|write|report-path`.
- `cadence-status.mjs` — cold reader: due occurrences/obligations, in-flight rows, earliest next-due, advisory stamp block.
- `seo-doctor.mjs` — read-only workspace diagnosis; emits the reviewed plan bootstrap consumes.
- `bootstrap-seo-workspace.mjs` — consumes a reviewed plan: create/adopt/verify/repair; stamps new workspaces reconciled at birth.
- `gsc-oauth.mjs` / `gsc-fetch.mjs` / `gsc-opportunities.mjs` — Search Console auth, exports, and opportunity tables.
- `monthly-report.mjs` — one-page monthly report from exported data.
- `portfolio-status.mjs` — ranked cross-site "which site deserves the next SEO hour" table.
- `link-graph-analyzer.mjs` / `rendered-link-export.mjs` — internal-link graph analysis.

## Core Workflow

1. State assumptions, install mode, resolved target workspace, live URL, market, language, success criteria.
2. Classify site type and phase with `references/first-run.md` when the request is broad, first-run, or ambiguous.
3. Choose the mode and load only its reference. For `operate`, load `references/operating.md`, then the narrow reference the chosen ticket needs.
4. Create or update `context.md` (`references/first-run.md`); in no-write runs use existing context and record drift.
5. Capture admin/auth evidence (`references/workspace.md`) before changing production or authenticated surfaces; load its adapter section when the repo has a content engine or CMS.
6. When a ticket creates or materially revises a public SEO page, apply `references/pages.md` — Done requires PASS evidence on every mandatory launch gate and a logged discovery-submission decision.
7. Execute the mode's workflow, verify live results (at least one mobile viewport for UI/CTA work), and update `.seo/` files only where facts changed.

When adjacent marketing skills are installed, use them as lenses, never dependencies (bridge table: `references/first-run.md`). If none are installed, these references are sufficient.
