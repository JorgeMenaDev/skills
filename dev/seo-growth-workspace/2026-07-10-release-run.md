# SEO Growth Workspace v3.0.0 Release Run — standalone / hub install modes

Started: 2026-07-10
Target skill: `skills/growth/seo-growth-workspace`
Goal: major release adding a second install mode — **hub** (an orchestrator/agent-profile repo managing many sites, all per-site state hub-hosted under `.seo/sites/<slug>/`) — alongside the unchanged **standalone** per-repo mode.

## Scope

In scope:

- `skills/growth/seo-growth-workspace/**` (SKILL.md, new `references/hub-mode.md`, clauses in 6 existing references, `bootstrap-seo-workspace.mjs`, `portfolio-status.mjs`)
- `dev/seo-growth-workspace/` gates (`validate-skill.mjs`, `release-checklist.md`, this note)

Out of scope: pre-existing dirty `skills/agent-operations/counsel/**` and `skills/software-development/afk-pipeline/**` files (foreign work, untouched); publishing to `skills.sh`.

## Design (decided with Jorge)

- Mode names: `standalone` / `hub`; stamped in `.seo/config.json`, asked once on first run, never unattended.
- Workspace-root aliasing rule: every `.seo/X` path means `<workspace root>/X` — `.seo/` standalone, `.seo/sites/<slug>/` hub. Operating behavior (modes, phases, tickets, one-target-per-run) unchanged in both modes.
- Back-compat: a `.seo/` without `config.json` is implicitly standalone; stamped on the next mutating run. Zero migration for existing installs.
- Hub target resolution: named site → registry row; unnamed → `portfolio-status.mjs` ranking as evidence + one-target confirmation; unattended → named target or `blocked`.
- Registry: hub rows use relative `sites/<slug>` roots, resolving against the registry file's directory.
- **Intentional behavior delta (the only one)**: hub mode may re-file a parked cross-site ticket into the owning site's backlog as a new ticket with cross-reference; IDs never move between sites. v2.4.0 only parked.

## Gates

- `node dev/seo-growth-workspace/validate-skill.mjs`: **passed** — including new sections: version consistency (SKILL.md ↔ bootstrap `SKILL_VERSION`), hub bootstrap (config/registry/sites created, no standalone files at hub root, `--site` without hub refuses, plain rerun on hub refuses), portfolio-status hub layout (registry-relative `sites/<slug>` row + absolute legacy row both resolve, run from foreign cwd).
- `node dev/seo-growth-workspace/evaluate-release.mjs --json`: **pass: true, score 85/100 (bar 85), 0 critical findings**.
- Manual dry runs (temp roots):
  - Standalone bootstrap → v2.4.0 file set plus `config.json` (`mode: standalone`); rerun idempotent, nothing overwritten.
  - Hub bootstrap `--hub` → `config.json`/`README.md`/`registry.md`/`sites/` only; rerun idempotent.
  - `--hub --site acme-com`, then `--site andy-partner` on the existing hub → full workspace sets under `sites/`, suggested registry rows printed, `registry.md` never edited by the script.
  - Guards proven: plain bootstrap on a hub root, `--hub` on a standalone root, invalid slug — all hard errors, no silent conversion.
  - `portfolio-status.mjs` run from `/` against a hub registry mixing relative + absolute rows: all rows resolved; never-touched sites ranked first, dated site ranked by staleness.
- `gsc-fetch.mjs` / `gsc-oauth.mjs` / `gsc-opportunities.mjs` / `monthly-report.mjs`: verified path-explicit, no code changes needed; hub runs pass `.seo/sites/<slug>/...` paths.

## Not yet done

- Real hub dogfood in the Matias profile (first-run mode question → hub bootstrap → registry fill → operate one site) — recommended before installing broadly.
- `skills.sh` publication — needs Jorge's explicit confirmation per release checklist.
