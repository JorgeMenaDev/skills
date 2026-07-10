# Install Modes And Hub Operation

Use on any first run where no `.seo/` exists yet, and on every run inside a hub workspace — an orchestrator repo (for example an agent profile) that manages SEO for many sites/repos from one place. Standalone runs never need this file beyond the mode stamp rules below.

The skill has two install modes. The operating behavior — modes, phases, tickets, one target per run — is identical in both; only where state lives and how the target workspace is resolved differ.

## Mode Stamp

`.seo/config.json` records the install mode. Read it at the start of every run:

```json
{ "mode": "standalone | hub", "created": "YYYY-MM-DD", "skillVersion": "3.1.0", "workspaceSchemaVersion": 1 }
```

- `skillVersion` is **created-by** provenance: the skill version that first stamped the workspace. Later runs never rewrite it, and it does not track upgrades.
- `workspaceSchemaVersion` is the workspace layout contract (currently `1`). It changes only through an explicit, documented migration — never as a side effect of running a newer skill. Older workspaces missing the field are schema 1.
- Bootstrap never rewrites an existing `config.json`.
- **Back-compat rule**: a `.seo/` with no `config.json` is a legacy standalone workspace **only when it carries the legacy signature — at least 3 of `backlog.md`/`log.md`/`audit.md`/`strategy.md`**. Operate it as standalone, and stamp `{"mode": "standalone"}` on the next mutating run (never in no-write runs). A `.seo/` without that signature is unrecognized — the bootstrap aborts on it; run `scripts/seo-doctor.mjs` and make an explicit create/adopt/migrate decision.
- Once stamped, never ask the mode question again. Converting a workspace between modes is a human decision, never done silently — the bootstrap script refuses mode conflicts; the workflow is `references/migrate-uninstall.md`.

## First-Run Mode Selection

When no `.seo/` exists at all:

1. **Doctor first (required)**: run `node <SKILL_DIR>/scripts/seo-doctor.mjs <root> --domain <host>` — read-only. If it reports candidate workspaces for the site, existing skill install copies, or an unrecognized `.seo/`, stop and make an explicit **create / adopt / migrate** decision with the user (`references/migrate-uninstall.md`). Never bootstrap over ambiguity.
2. Ask exactly one question:

> Is this a standalone site repo (SEO state lives here, for this one site), or a hub — an orchestrator workspace that manages SEO for several repos/sites?

3. Then run `scripts/bootstrap-seo-workspace.mjs` (standalone) or `scripts/bootstrap-seo-workspace.mjs --hub` (hub); either stamps `config.json`. Unattended runs never ask: per `references/scheduled-operation.md`, a missing workspace exits `blocked` for an interactive first run.

## Path Semantics In Hub Mode

`SKILL.md` Install Modes defines the four path terms (`HUB_ROOT`, `SITE_WORKSPACE`, `TARGET_REPO`, `SKILL_DIR`). In hub mode:

- `HUB_ROOT` is the hub's physical `.seo/` — only routing state lives there (`config.json`, `registry.md`, `portfolio-index.md`, `sites/`, optional `loops/`), never site work.
- `SITE_WORKSPACE` is `HUB_ROOT/sites/<slug>/` for hub-managed sites, or the external root a registry row points at.
- After target resolution, run every mode, reference, and script contract verbatim against SITE_WORKSPACE; workspace-internal `.seo/X` prose means `SITE_WORKSPACE/X`.

## Hub Layout

```text
<hub>/.seo/
  config.json           # {"mode": "hub", ...}
  registry.md           # site map — references/portfolio-registry.md Row Shape
  portfolio-index.md    # cross-site rollup from templates/portfolio-index.md
  sites/<site-slug>/    # EXACT standalone workspace layout per managed site:
                        # backlog.md, log.md, context.md, strategy.md, audit.md,
                        # taxonomy.md, backlinks/, reports/, scripts/, pseo/,
                        # adapters/, loops/
```

- Slugs match `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$` (lowercase letters/digits, inner hyphens only), derived from the registry Site column hostname (`andy-partner.com` → `andy-partner`).
- The hub root holds no standalone workspace files of its own — hub-level state is only the config, registry, rollup index, and optional hub-level sweep loop state (`HUB_ROOT/loops/`).
- A registry row may still point at an external workspace root (a repo with its own `.seo/`, or a partner-owned path); `sites/<slug>` is the default for hub-managed sites, not a requirement.
- Create a new site workspace with `scripts/bootstrap-seo-workspace.mjs --site <slug>` — run `scripts/seo-doctor.mjs --domain <host>` first to prove the site has no workspace elsewhere. The script prints a `REGISTRATION PENDING` row and never edits `registry.md`; add the row yourself in the same pass. Until registered, `seo-doctor.mjs` flags the site folder as a finding.

## Target Resolution

The only behavioral addition in hub mode: **read hub routing state only (`config.json` and `registry.md`), resolve exactly one target site, then read no site state except the resolved target's.**

1. **User names a site** — resolve it to its registry row (`references/portfolio-registry.md` Read-First Rule); the workspace is that row's Workspace root. Relative roots resolve against the registry file's directory.
2. **No site named** — run `scripts/portfolio-status.mjs --registry .seo/registry.md` and present the ranked table as evidence; confirm one target with the user. Staleness ranking is the tiebreak, not the decision — a cold revenue-critical site outranks a warm experiment.
3. **Unattended** — the invoking prompt must name the target; otherwise exit `blocked` (`references/scheduled-operation.md`).

After resolution, everything is standalone behavior against the resolved workspace. One target per run; never a blended workspace.

## Ticket IDs

`SEO-NNN` stays monotonically increasing **per site folder** — each `sites/<slug>/` is a "target workspace" in the sense of `references/ticket-architecture.md`. There is no hub-global ticket namespace.

## Cross-Site Re-Filing

Hub extension of the Target Boundary in `references/operating-loop.md`: when a parked ticket actually belongs to another *registered* site, it may be re-filed as a **new** ticket in that site's backlog, using that site's own next `SEO-NNN` and a cross-reference (`re-filed from <site> SEO-NNN`). The origin row moves to Done/parked with the pointer. Ticket IDs never move between sites.

## Scripts In Hub Mode

Bundled scripts run from SKILL_DIR and take explicit paths — pass the resolved SITE_WORKSPACE: `<hub>/.seo/sites/<slug>/backlog.md`, `<hub>/.seo/sites/<slug>/reports/`, and so on. Credentials stay per-site via the registry Credentials column (for example `GSC_CREDENTIALS_DIR`); never a hub-root `.env` shared across sites.

## Exit Criteria

A hub run exits cleanly when `config.json` was read (or correctly inferred standalone), exactly one target site was resolved through the registry before any site state was read, all reads/writes landed in that site's workspace, and sibling site folders were untouched.
