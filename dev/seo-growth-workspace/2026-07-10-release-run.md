# SEO Growth Workspace Release Runs — 2026-07-10

## v3.0.0 — standalone / hub install modes

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

---

## v3.1.0 — schema-1 discovery safety and release truth

Started: 2026-07-10<br>
Base reconciled: `320a78a` (`origin/main`)<br>
Foundational corpus: `coreyhaines31/marketingskills@f04556d923e076a29564559101e5ca33698422f5` — patterns/hypotheses only; official platform documentation remained authority.

### Release boundary

PASS — repository candidate only. No live workspace, credential content, hub activation/repair, install, provider mutation, schema 2, deterministic migrator, writer lease, or new feature family entered this run. Migration remains a terminal/manual doctor decision in v3.1.

### Deterministic validator

Command:

```bash
node dev/seo-growth-workspace/validate-skill.mjs
```

PASS — `seo-growth-workspace skill validation passed`.

The existing validator now covers:

- doctor plan output outside scan roots and zero scanned-root writes;
- plan hash/expiry/root/domain/search/source binding, source change, mismatch, bypass, one-shot mutation, replay, and manual-migrate refusal; source fingerprints cover the selected target and discovered registry/install/lock/doc/credential inputs, while search-root realpaths are separately bound, so unrelated sibling fixture churn cannot invalidate a plan;
- exact tolerant backlog/log/audit/strategy signatures; nonsense filenames do not adopt;
- config-only adoption, zero-write verify, and exact missing-generated-file repair with sentinel history preservation;
- schema-ahead/malformed state and dangling/escaping generated symlinks;
- canonical registry routing vs legacy inventory, malformed/duplicate rows, realpath dedupe, stale rows, unmigrated legacy sites, and unbound state;
- stat-only credential permissions, credential non-disclosure marker, skills-lock drift, active-path drift, dangling installs;
- six existing scenario profiles and all pre-existing GSC/monthly/portfolio checks;
- disposable six-row hub/eight-row legacy rehearsal: six canonical rows retained, eight inventory rows retained, six stale retired roots, two visible legacy-only sites, zero false candidate findings.

Concurrency regression: two independent `validate-skill.mjs` processes ran simultaneously against isolated per-run fixture parents; both exited 0. This specifically proves shared system-temp churn cannot change another run's reviewed plan sources.

### Mechanical command inventory / foreign-CWD matrix

Command:

```bash
node dev/seo-growth-workspace/command-inventory.mjs --verify
```

PASS — 79 shell-looking snippets mechanically extracted from SKILL/references/templates: 3 executable, 76 illustrative, 0 malformed. Foreign-CWD matrix: 3/3 executable commands exited 0. Secret-bearing argv is blocking; no `superaseo login <key>` or `--access-token <token>` example remains.

### Release evaluation

Command:

```bash
node dev/seo-growth-workspace/evaluate-release.mjs --json
```

PASS — 100/100, 0 critical findings, 0 known findings, no zero-scored category. Portability: 15/15. The evaluator now fails closed on any zero category or known finding instead of allowing the aggregate score to mask one.

### Clean export

Commands:

```bash
node dev/seo-growth-workspace/export-clean-skill.mjs --target <disposable-root> --dry-run
node dev/seo-growth-workspace/export-clean-skill.mjs --target <disposable-root>
node dev/seo-growth-workspace/validate-skill.mjs --skill-dir <disposable-root>/.agents/skills/seo-growth-workspace
```

PASS — dry run made no install; clean export produced 46 portable files; the exported copy passed the full validator. Dev fixtures/release tooling remained outside the portable package.

### Current-fact corrections

PASS — crawler roles/consequences now distinguish training, direct discovery, and user-triggered fetch with enforcement caveats; schema is not claimed to ground AI answers; standard Performance data cannot prove AI causality. Google's rollout-limited Generative AI Performance UI/export and inherited Search generative-AI include/exclude control are documented as authenticated human surfaces, not assumed APIs or ranking levers.

The Google-Extended boundary now includes both training/model improvement and grounding in Gemini Apps / Grounding with Google Search on Vertex AI, while preserving Google's explicit statement that it does not affect Google Search inclusion or ranking.

Primary authority reviewed:

- Google Search Console Generative AI Performance report and Search generative AI control.
- Google AI features and website controls.
- OpenAI publisher/crawler guidance.
- Anthropic crawler-role guidance.
- Perplexity crawler/user-fetch guidance.
- Cloudflare AI traffic-control documentation.

### Result

PASS — v3.1.0 repository candidate meets the bounded schema-1 release gates. Live-hub activation remains a separate future approval and rehearsal.

### Safety re-review remediation

PASS — four reproduced boundary failures are closed with dedicated deterministic fixtures:

- plans bind `installMode`; an existing standalone root cannot become a hub, and an absent root needs reviewed `--hub` before first-site creation;
- missing canonical routes are blocking, while stale legacy inventory remains non-routing and nonblocking;
- doctor checks every generated-path ancestor, and bootstrap repeats realpath/symlink containment immediately before each directory creation and file write;
- permission checks parse and stat only approved credential-location forms, including `GSC_CREDENTIALS_DIR=/absolute/path`, while ignoring arbitrary assignments and credential contents.

Re-run evidence: two validators passed concurrently; command inventory remained 3 executable / 76 illustrative / 0 malformed with 3/3 foreign-CWD passes; evaluator passed 100/100 with zero findings; clean export remained 46 files and its exported copy passed the validator.
