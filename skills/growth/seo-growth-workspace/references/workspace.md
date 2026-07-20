# Workspace Lifecycle

Use on any first run where no `.seo/` exists, on every run inside a hub, and for migration, uninstall, adapters, admin evidence, and multi-site requests. The operating behavior is identical in both install modes; only where state lives and how the target resolves differ.

## Modes and the config stamp

`.seo/config.json` records the install mode — read it at the start of every run:

```json
{ "mode": "standalone | hub", "created": "YYYY-MM-DD", "skillVersion": "3.1.0", "workspaceSchemaVersion": 1 }
```

- `skillVersion` is **created-by** provenance: the version that first stamped the workspace — never rewritten, never tracking upgrades (reconciliation is the stamp's job: `references/operating.md` Upgrade pass).
- `workspaceSchemaVersion` (currently `1`) changes only through an explicit documented migration. Missing = schema 1. Bootstrap never rewrites an existing `config.json`.
- Once stamped, never ask the mode question again; mode conversion is a human decision and the bootstrap script refuses conflicts.

**First run, no `.seo/` anywhere** — doctor first, always: `node "$SKILL_DIR/scripts/seo-doctor.mjs" <root> --domain <host>` (read-only), review, then rerun with `--decision create|adopt|repair --plan-output "$PLAN_DIR/bootstrap.json"` (`PLAN_DIR` outside every scan root; `--hub` when reviewing a new hub root). Ask exactly one question: *standalone site repo, or hub managing several sites?* Then consume the reviewed plan with `node "$SKILL_DIR/scripts/bootstrap-seo-workspace.mjs" --plan … --action create --domain <host> <root>` (`--hub` for hubs). The script recomputes every bound hash before writing and consumes mutating plans once. Unattended runs never ask — a missing workspace exits `blocked` for an interactive first run.

**Legacy adoption**: a `.seo/` with no `config.json` is adoptable only when at least three files match the exact tolerant schema-1 signatures — `backlog.md` (H1 with `SEO backlog`, `Current focus`, a status heading/table), `log.md` (H1 with `SEO operating log`, or dated H2 + action/evidence), `audit.md` (H1 with `SEO audit` + findings), `strategy.md` (H1 with `SEO strategy` + context/tooling/decisions) — and identity is explicit or canonical-registry-proven. Filenames alone prove nothing. Adopt writes `config.json` only and preserves every existing byte; unrecognized state fails closed. Missing generated defaults are drift repaired through a separate reviewed repair plan; history is never rewritten.

## Hub layout and target resolution

```text
<hub>/.seo/
  config.json           # {"mode": "hub", ...}
  registry.md           # the site map (row shape below)
  portfolio-index.md    # cross-site rollup
  sites/<slug>/         # EXACT standalone workspace layout per managed site
```

Path terms (used verbatim everywhere): **HUB_ROOT** — the hub's `.seo/`, holding only routing state, never site work. **SITE_WORKSPACE** — repo-local `.seo/` in standalone mode; `HUB_ROOT/sites/<slug>/` or an external registry root in hub mode. **TARGET_REPO** — the repo whose site is being changed. **SKILL_DIR** — the installed skill folder. After resolution, every reference and script contract runs verbatim against SITE_WORKSPACE; workspace prose `.seo/X` means `SITE_WORKSPACE/X`.

New site IDs match `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$` (existing nonconforming IDs are grandfathered for their exact registered row). New site workspaces come only from a reviewed create plan (`--site <id>`); the bootstrap prints a `REGISTRATION PENDING` row — add it to `registry.md` yourself in the same pass, and creation writes that site's reconciliation stamp at birth.

**Target resolution — the only behavioral addition in hub mode**: read hub routing state only (`config.json`, `registry.md`), resolve exactly one target site, then read no site state except the resolved target's.

1. User names a site → resolve to its registry row; the workspace is that row's root (relative roots resolve against the registry file's directory).
2. No site named → `node "$SKILL_DIR/scripts/portfolio-status.mjs" --registry "$HUB_ROOT/registry.md"`, present the ranked table as evidence, confirm one target. Staleness ranks; it does not decide — a cold revenue-critical site outranks a warm experiment.
3. Unattended → the prompt must name the target or the run exits `blocked`.

After resolution everything is standalone behavior. One target per run; never a blended workspace; a site run reads no sibling state and never calls `portfolio-status.mjs` mid-run. A pre-resolution sleep or blocked result writes hub-level loop state at `HUB_ROOT/loops/`. Ticket IDs stay per-site; a parked ticket belonging to another registered site may be re-filed as a **new** ticket there with a `re-filed from <site> SEO-NNN` cross-reference — IDs never move between sites. Scripts take explicit SITE_WORKSPACE paths; credentials stay per-site via the registry Credentials column, never a shared hub `.env`.

## Registry

Consumer-owned; this file defines only shape and reading rules. On any multi-site or by-name request, read the registry **before** asking where things live: (1) the path the invoking prompt or agent profile names, (2) `.seo/registry.md` in the current repo, (3) offer to create one — never iterate a portfolio from memory. Columns are mandatory even when `unknown`:

```md
| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |
|---|---|---|---|---|---|---|
| example.com | sites/example | sc-domain:example.com | GSC_CREDENTIALS_DIR=<credential-home>/example-gsc | UK / en-GB | human approves all publishes | content engine: webhook |
```

Credentials is the *location only* — an env var name or path, never a value. Publish gate is part of the unattended mutation ceiling. GSC property records the exact form (`sc-domain:` vs URL-prefix — the wrong form 403s). Portfolio iteration is one target per run; a portfolio report pass writes one dated report per site plus one `portfolio-index.md` rollup. Rows with unknown credentials or blocked gates still get read-only checks; gaps land in `needs_human`. Registry drift discovered in a run (moved repo, changed property, dead credentials) is corrected in the registry in the same pass.

## Migration and uninstall

Never unattended. Migration is identity-preserving relocation: the workspace, registry row, source-repo skill copies, and doc pointers move or die together. Doctor both ends first; if either end shows competing candidate workspaces for one site, stop and pick the canonical one with the user.

**Standalone → hub**: (1) doctor both ends; (2) copy everything under source `.seo/` except `config.json` into `HUB_ROOT/sites/<slug>/` — copy, don't move, until verified; (3) add the registry row, recording the source repo in Notes (`repo: <path>`); (4) strip the source repo in one reviewed change — `.seo/`, every skill install copy (`.agents/skills/…`, `.claude/skills/…`, `skills/…`; remove a symlink itself, and remove its resolved target only after proving the target remains inside the source repo), the lockfile entry, and `.seo/`/skill pointers in AGENTS.md/CLAUDE.md/README.md, each replaced with one line naming the hub; (5) commit naming the migration; (6) doctor both ends again — only then delete any temporary copy; (7) post-migration hygiene inside the moved workspace: rewrite prose claiming the workspace is repo-local, repoint Verify cells at SKILL_DIR scripts with explicit SITE_WORKSPACE args, fix or delete relative links that escaped the old repo; log the pass.

**Plain uninstall**: doctor; decide the workspace's fate explicitly with the user (keep is the default — it is consumer state, not skill internals); strip copies/lockfile/pointers as above; doctor again; commit.

## Local adapters

When the target has project-specific SEO automation, a content engine, CMS, or publisher workflow: the skill is the strategist/operator layer; the app is the execution layer. Keep project-specific notes in `.seo/adapters/<name>.md` (durable decisions in `strategy.md`) — never inside the installed skill folder, which reinstalls replace; inventory and preserve non-portable files before replacing a repo-local skill copy. Before content work is actionable, the adapter must answer: read-only status commands/routes; dry-run proof; exact mutation commands requiring approval; UI routes that must agree with CLI/API state; which system owns each state; environment boundary; CLI access state (CLI + version, auth mechanism *location* — names/paths, never values — workspace→project mapping, and the probe command proving authentication); which env var names may be referenced. For new or materially revised pages the adapter also maps the provenance contract in `references/pages.md`: the engine-native revision store (authoritative when it exists — never build a duplicate Markdown record), the verification/publish gate, citation transport, reverification owner, and legacy-page behavior. The first run that proves engine-CLI access records it in the adapter and mirrors it in the registry Credentials column; later runs read, never re-explore. Webhook-publishing engines: `references/content-engine-webhooks.md`. Missing adapter detail is recorded as friction in the run report (surface, missing detail, impact, suggested home).

## Admin and auth preflight

Before changing authenticated production surfaces, capture evidence into `reports/admin-setup-YYYY-MM-DD.md`:

| Surface | Evidence | Common blockers |
| --- | --- | --- |
| Hosting/platform | Team/project, production domain, root dir, framework, latest deploy, deploy source | Wrong team/project, monorepo root mismatch, old production alias |
| Search Console | Property type, verified access, sitemap status, URL inspection, rich result/CWV reports | Unverified property, fresh `Couldn't fetch`, wrong property form |
| Ahrefs | Project/access and declared crawl scope per `references/ahrefs.md` | Missing project/session/capability/credits, temporary browser-lane loss, insufficient useful coverage |
| Analytics | Provider, property, install path, live traffic proof, events configured | Installed but undeployed, wrong property, missing events |
| DNS/domain | Registrar/zone, required records, verification records, canonical host | Wrong zone, stale DNS, www/apex mismatch |
| Scheduler/CMS | Project exists, locale, calendar rows, publish destination, UI/CLI agreement | Backend project invisible in UI, wrong locale, blocked publish auth |
| Email/CRM/forms | Provider, destination, lead path, test submission status | Form sends nowhere, automation paused |

Never print secret values — names and status only. Date fresh states exactly. `Couldn't fetch` right after sitemap submission is a retry state when a live fetch succeeds — log a follow-up, don't over-fix. If admin UI and CLI/API disagree, stop that lane and log the mismatch. In no-mutation runs, mark auth-gated surfaces `not checked by constraint`, use public/repo/existing-report evidence only, and record what proof a real operation run would need.

## Exit criteria

Mode was read or stamped through the doctor→plan→bootstrap path; in hub mode exactly one target resolved through the registry before any site state was read and sibling folders were untouched; migrations/uninstalls left one canonical workspace with clean doctors on every touched root; adapters and admin evidence were recorded where the run needed them.
