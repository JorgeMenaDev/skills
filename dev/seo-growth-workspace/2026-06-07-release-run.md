# SEO Growth Workspace Release Run

Started: 2026-06-07
Target skill: `skills/growth/seo-growth-workspace`
Goal: improve the skill enough to be a reliable release candidate for `skills.sh`, then ask for deploy confirmation before publishing.

## Scope

In scope:

- `skills/growth/seo-growth-workspace/**`
- Durable audit, release notes, and release-evaluation artifacts inside the skill folder
- Scenario evaluation against SuperaSEO, Arketix, Acredix, Andy, Laborix, and a local-business profile

Out of scope unless explicitly approved:

- Publishing to `skills.sh`
- Editing unrelated skills, especially current dirty `skills/devops/shiploop/**` work
- Installing new dependencies
- Unit, integration, or end-to-end test files
- Playwright-based UI inspection

## Checklist

- [x] Baseline current worktree and skill inventory.
- [x] Create durable release tracking file.
- [x] Create durable audit doc before skill edits.
- [x] Define release-evaluation rubric and numeric metric.
- [x] Implement release-evaluation script using bundled fixtures/profiles.
- [x] Run baseline release evaluation.
- [ ] Edit the skill in small slices:
  - [x] Phase architecture / first-run ladder
  - [x] Schema and FAQ rich-result update
  - [x] AI SEO guidance
  - [x] Marketing-skill bridge
  - [x] Bun command cleanup
  - [x] Release checklist
- [x] Run validation and release evaluation.
- [ ] Run scenario checks:
  - [x] SuperaSEO
  - [x] Arketix
  - [x] Acredix
  - [x] Andy
  - [x] Laborix
  - [x] Local-business profile
- [x] Run at least one real repo bootstrap/operate dry run.
- [x] Review final diff.
- [ ] Ask Jorge for confirmation before deploying to `skills.sh`.

## Baseline Evidence

- `git status --short` shows unrelated dirty `skills/devops/shiploop/**` files and untracked `MATT_STYLE_SKILL_AUTHORING.md`; this run will not touch them.
- Current skill inventory: 39 files under `skills/growth/seo-growth-workspace`.
- Current size: 2,826 total lines across `SKILL.md`, references, scripts, and templates.
- Structural validation command passed:

```bash
bun skills/growth/seo-growth-workspace/scripts/validate-skill.mjs
```

Output:

```text
seo-growth-workspace skill validation passed
```

## Autoresearch Setup

Goal:

- Improve `seo-growth-workspace` portability, release reliability, Matt-style architecture, and SEO/marketing usefulness across heterogeneous repos.

Metric:

- To be implemented as a local release-evaluation command that emits JSON with a numeric `score`.

Planned command:

```bash
bun skills/growth/seo-growth-workspace/scripts/evaluate-release.mjs --json
```

Direction:

- Higher is better.

Constraints:

- No new dependencies unless approved.
- Use Bun for TypeScript/JavaScript execution examples.
- Keep skill edits portable and harness-agnostic.
- Do not publish until Jorge confirms.
- Prefer small, reviewable slices over broad rewrites.

## Running Notes

### 2026-06-07 - Baseline

- Confirmed the skill already has a Matt-style router shape, progressive references, durable `.seo` workspace, scripts, fixtures, templates, and validation.
- Found an immediate portability cleanup candidate: user-facing docs and validator internals still use `node` commands even though this repo standard is Bun.
- Found an SEO freshness issue: `FAQPage` appears as a preferred schema for product/local/pSEO pages, but Google says FAQ rich results no longer appear in Search as of 2026-05-07.
- Found a release-confidence gap: current validator checks package structure and helper scripts, not whether the skill chooses useful SEO phases across real project profiles.

### 2026-06-07 - Release Evaluator Baseline

- Added `scripts/evaluate-release.mjs` and `fixtures/release-scenarios.json`.
- Corrected evaluator self-scoring so it does not count its own criteria text as skill guidance.
- Baseline command:

```bash
bun skills/growth/seo-growth-workspace/scripts/evaluate-release.mjs --json
```

- Baseline score after tightening false-positive checks: `64.5/100`, pass: no.
- Findings to address: missing `phase-architecture.md`, missing `release-checklist.md`, stale FAQ rich-result guidance, missing AI SEO guidance, missing explicit marketing-skill bridge, user-facing `node` examples, and secret-like OAuth token placeholder.

### 2026-06-07 - Skill Edit Slices

- Added `references/phase-architecture.md` with site-type classification, first-run phase ladder, scenario routing, marketing-skill bridge, and AI search caution.
- Added `references/release-checklist.md` with validation, release-evaluation, scenario, dry-run, and manual review gates.
- Updated `SKILL.md` to load phase architecture for broad/first-run work, expose release checklist, and keep optional marketing skills as lenses rather than dependencies.
- Updated schema guidance so `FAQPage` is not treated as a Google rich-result growth lever after the 2026-05-07 FAQ rich-result deprecation.
- Normalized user-facing JavaScript commands and script shebangs to Bun.
- Updated `validate-skill.mjs` to include the new release artifacts and run helper scripts through Bun.

### 2026-06-07 - Validation And Scenario Evidence

- `bun skills/growth/seo-growth-workspace/scripts/validate-skill.mjs`: passed.
- `bun skills/growth/seo-growth-workspace/scripts/evaluate-release.mjs --json`: passed with `score: 100/100`, no findings.
- Contamination/Bun scan: no portable runtime hits for user-facing `node` commands, Node shebangs, `ya29` token-like placeholders, local absolute paths, or project-specific markers.
- Real repo profile check passed for:
  - SuperaSEO: Bun, existing `.seo`, product-marketing context, recommended `operate`, phases classification/technical/measurement/metadata/content/conversion.
  - Arketix: Bun, Astro, Vercel Analytics, existing `.seo`, product-marketing context, recommended `operate`.
  - Acredix landing: Bun, Astro, Vercel Analytics, no `.seo`, recommended `bootstrap`.
  - Andy: Bun, Next.js, existing `.seo`, product-marketing context, recommended `operate`.
  - Laborix: Bun, existing `.seo`, product-marketing context, recommended `operate`.
  - Local-business fixture: Bun, bootstrapped `.seo`, recommended `operate` with local and authority phases.
- Dry run:
  - Copied Acredix landing into a temporary directory without `.git`, `node_modules`, `dist`, or `.astro`.
  - Ran `bun skills/growth/seo-growth-workspace/scripts/bootstrap-seo-workspace.mjs <tmp>/acredix-landing`.
  - Created/verifed `.seo/README.md`, `.seo/context.md`, `.seo/backlog.md`, `.seo/audit.md`, `.seo/strategy.md`, `.seo/taxonomy.md`, `.seo/log.md`, `.seo/reports/`, `.seo/scripts/`, `.seo/pseo/`, and `.seo/backlinks/work-log.md` in the temp copy only.
  - Ran the same bootstrap proof against a synthetic local-business temp repo.
- `git diff --check -- skills/growth/seo-growth-workspace`: passed.
- Size check: `SKILL.md` is 146 lines; `phase-architecture.md` is 83 lines; `release-checklist.md` is 59 lines.

### 2026-06-07 - Final Diff Review

- Final scoped diff is limited to `skills/growth/seo-growth-workspace/**`.
- Pre-existing dirty `skills/devops/shiploop/**`, untracked `skills/devops/shiploop/references/github-commands.md`, and untracked `MATT_STYLE_SKILL_AUTHORING.md` remain untouched.
- `git diff --stat -- skills/growth/seo-growth-workspace` shows the expected runtime edits; untracked release docs/evaluator artifacts are listed by `git status --short`.
- Ready for explicit deploy confirmation before any `skills.sh` publication.

### 2026-06-07 - SuperaSEO Dogfood Install Friction

- The first real SuperaSEO install used raw `rsync --delete` into `/Users/jorge/dev/code/superaseo/.agents/skills/seo-growth-workspace`.
- That validated the candidate, but it exposed a real release friction: raw replacement silently removed local-only files from the existing SuperaSEO copy, including `ROADMAP.md`, `references/superaseo-bridge.md`, and SuperaSEO-specific TypeScript helper scripts.
- Source fix:
  - Added `references/adapters.md` so repo-specific bridges live in `.seo/adapters/` or `.seo/strategy.md` instead of the portable skill package.
  - Added `scripts/export-clean-skill.mjs` so installs use a clean exporter instead of raw copy commands.
  - Updated `SKILL.md`, `release-checklist.md`, `validate-skill.mjs`, and `evaluate-release.mjs` to discover and validate adapter/export behavior.
- Exporter proof:
  - Running without `--force` against SuperaSEO stopped on local-only files and printed them instead of silently replacing.
  - Running with `--force` installed 45 clean portable files, excluded release audit/run artifacts, and validated the installed copy with `bun .agents/skills/seo-growth-workspace/scripts/validate-skill.mjs`.
  - Installed SuperaSEO copy then passed `bun .agents/skills/seo-growth-workspace/scripts/evaluate-release.mjs --json --profile-root superaseo=/Users/jorge/dev/code/superaseo`.

### 2026-06-07 - SuperaSEO Subagent Dogfood

- Spawned dogfood worker `019ea3c2-dc21-7280-82c4-98421394891d` against `/Users/jorge/dev/code/superaseo` using the installed repo-local `seo-growth-workspace` skill.
- Worker wrote `/Users/jorge/dev/code/superaseo/.seo/reports/skill-dogfood-2026-06-07.md` and appended `/Users/jorge/dev/code/superaseo/.seo/log.md`.
- Worker exercised all phases:
  - Complete: classification, technical, metadata, schema, conversion public UI, content validation, pSEO, local applicability, authority validation, dogfood reporting.
  - Partial by constraint: measurement/admin and monthly SEO reporting because no authenticated exports or mutations were allowed.
- Worker proof commands included installed `validate-skill`, installed `evaluate-release`, `bun run check`, pSEO validator to `/tmp`, temp bootstrap dry runs, public route fetch matrix, and Browser desktop/mobile homepage/menu checks.
- Source frictions found:
  - missing `release-dogfood` mode,
  - `.seo/context.md` too forceful for mature workspaces,
  - profile evaluator overconfidence,
  - unsafe exporter replacement of modified same-path files,
  - release checklist source-only paths,
  - missing required adapter mapping for content-engine repos,
  - no-mutation measurement/reporting gaps,
  - local SEO needed `not applicable` exit,
  - exporter install-note writing needed to be opt-in.

### 2026-06-07 - Dogfood Fixes Applied

- Added `references/skill-release-validation.md` and `templates/skill-dogfood-report.md`.
- Added `release-dogfood` mode to `SKILL.md`.
- Added no-write context drift handling to `SKILL.md`, `phase-architecture.md`, and `operating-loop.md`.
- Added no-mutation validation paths to `admin-preflight.md`, `search-console.md`, and `monthly-reporting.md`.
- Added explicit `not applicable` local SEO exit.
- Strengthened content-engine adapter requirements in `adapters.md` and `content-ops.md`.
- Replaced `export-clean-skill.mjs` with a safer exporter that supports `--dry-run`, detects local-only files, detects modified same-path files, requires `--force` for risky replacement, and writes install notes only with `--write-install-notes`.
- Strengthened `evaluate-release.mjs --profile-root` to inspect target `.seo` shape, context drift, adapter presence, and installed skill copy state.
- Updated `validate-skill.mjs` to smoke-test dry-run, no-force refusal, forced export, and no implicit install-note writes.

### 2026-06-07 - Patched SuperaSEO Proof

- Reinstalled the patched source skill into `/Users/jorge/dev/code/superaseo` with the safer exporter.
- Added SuperaSEO workspace artifacts found missing by the patched evaluator:
  - `/Users/jorge/dev/code/superaseo/.seo/context.md`
  - `/Users/jorge/dev/code/superaseo/.seo/adapters/superaseo.md`
- Installed SuperaSEO copy passed:
  - `bun .agents/skills/seo-growth-workspace/scripts/validate-skill.mjs`
  - `bun .agents/skills/seo-growth-workspace/scripts/evaluate-release.mjs --json --profile-root superaseo=/Users/jorge/dev/code/superaseo`
- The patched installed evaluator returned `score: 100/100`, `pass: true`, and no profile findings after context/adapter were added.
- Final source exporter dry-run against SuperaSEO returned no local-only files, no modified same-path files, and no missing target files.
