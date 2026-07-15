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
- **Back-compat rule**: a `.seo/` with no `config.json` is a legacy standalone workspace only when at least three files match the exact tolerant schema-1 signatures in `references/migrate-uninstall.md`; filenames alone prove nothing. Adoption requires explicit/canonical-registry identity and a reviewed doctor plan. `--action adopt` writes only `config.json` and preserves every existing byte. Unrecognized state fails closed.
- Once stamped, never ask the mode question again. Converting a workspace between modes is a human decision, never done silently — the bootstrap script refuses mode conflicts; the workflow is `references/migrate-uninstall.md`.

## First-Run Mode Selection

When no `.seo/` exists at all:

1. **Doctor first (required)**: run `node "$SKILL_DIR/scripts/seo-doctor.mjs" <root> --domain <host>` for read-only diagnosis. Review its findings, then rerun with `--decision create|adopt|repair --plan-output "$PLAN_DIR/bootstrap.json"`; add `--hub` while reviewing creation of a new hub root or its first site. `PLAN_DIR` must be outside every scan root. `decision: migrate` is terminal/manual in v3.1. Never bootstrap from an unresolved, stale, mode-mismatched, or source-mismatched plan.
2. Ask exactly one question:

> Is this a standalone site repo (SEO state lives here, for this one site), or a hub — an orchestrator workspace that manages SEO for several repos/sites?

3. Consume the reviewed plan with `node "$SKILL_DIR/scripts/bootstrap-seo-workspace.mjs" --plan "$PLAN_DIR/bootstrap.json" --action create --domain <host> <root>` (standalone), adding `--hub` for a hub. The script recomputes every bound hash before its first write and atomically consumes mutating plans. Unattended runs never ask: per `references/scheduled-operation.md`, a missing workspace exits `blocked` for an interactive first run.

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

- New site IDs are 1–64 characters matching `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`. Existing registered IDs outside that grammar are grandfathered only for the exact row/path already registered; they cannot name a new site.
- The hub root holds no standalone workspace files of its own — hub-level state is only the config, registry, rollup index, and optional hub-level sweep loop state (`HUB_ROOT/loops/`).
- A registry row may still point at an external workspace root (a repo with its own `.seo/`, or a partner-owned path); `sites/<slug>` is the default for hub-managed sites, not a requirement.
- Create a new site workspace only from a reviewed create plan: doctor with `--site <id> --domain <host> --decision create --plan-output <outside-root-file>`, then bootstrap with the same `--site`, domain, root, plan, and `--action create`. The script prints a `REGISTRATION PENDING` row and never edits `registry.md`; add the row yourself in the same pass. Until registered, the doctor flags the folder.

## Target Resolution

The only behavioral addition in hub mode: **read hub routing state only (`config.json` and `registry.md`), resolve exactly one target site, then read no site state except the resolved target's.**

1. **User names a site** — resolve it to its registry row (`references/portfolio-registry.md` Read-First Rule); the workspace is that row's Workspace root. Relative roots resolve against the registry file's directory.
2. **No site named** — run `node "$SKILL_DIR/scripts/portfolio-status.mjs" --registry "$HUB_ROOT/registry.md"` and present the ranked table as evidence; confirm one target with the user. Staleness ranking is the tiebreak, not the decision — a cold revenue-critical site outranks a warm experiment.
3. **Unattended** — the invoking prompt must name the target; otherwise exit `blocked` (`references/scheduled-operation.md`).

After resolution, everything is standalone behavior against the resolved workspace. One target per run; never a blended workspace.

## Hub boundary during a site run

After target resolution, a site run reads no sibling-site state and never calls `portfolio-status.mjs`. Portfolio ranking belongs before resolution or to an explicit outer sweep that invokes each target as a separate site run; it is never an inner selection step. Unattended runs never self-select a target. A pre-resolution sleep or blocked result, such as a missing named target, writes hub-level loop state at `HUB_ROOT/loops/` and does not read site state. Once resolved, the per-site three-terminal rules in `references/never-dry-loop.md` and the concurrency assumption in `references/operating-policy.md` apply.

## Ticket IDs

`SEO-NNN` stays monotonically increasing **per site folder** — each `sites/<slug>/` is a "target workspace" in the sense of `references/ticket-architecture.md`. There is no hub-global ticket namespace.

## Cross-Site Re-Filing

Hub extension of the Target Boundary in `references/operating-loop.md`: when a parked ticket actually belongs to another *registered* site, it may be re-filed as a **new** ticket in that site's backlog, using that site's own next `SEO-NNN` and a cross-reference (`re-filed from <site> SEO-NNN`). The origin row moves to Done/parked with the pointer. Ticket IDs never move between sites.

## Scripts In Hub Mode

Bundled scripts run from SKILL_DIR and take explicit paths — pass the resolved SITE_WORKSPACE: `<hub>/.seo/sites/<slug>/backlog.md`, `<hub>/.seo/sites/<slug>/reports/`, and so on. Credentials stay per-site via the registry Credentials column (for example `GSC_CREDENTIALS_DIR`); never a hub-root `.env` shared across sites.

## Post-Upgrade Recap Across Registered Workspaces

After the installed skill is refreshed (for example through the consumer's `npx skills` update flow), every registered workspace is drifted until deliberately reconciled: its state was produced under the previous version's protocols (`references/never-dry-loop.md` § Upgrade recap and reconciled-version stamp). Each workspace carries its own stamp at `.seo/sites/<slug>/reconciliation.json` — recapping one site never changes a sibling's drift state, and a run that creates a new site workspace writes that site's stamp at creation (the hub-level `config.json` version is hub-global provenance and never stands in for a site's stamp). The recap then runs as one deliberate, operator-invoked single-site run per registered workspace — never as one bulk pass — preserving one-target-per-run and the hub boundary above. Sequencing across workspaces is the operator's choice; until a workspace's recap re-stamps it, that workspace simply cannot certify sleep, while all its other eligible work continues.

## Exit Criteria

A hub run exits cleanly when `config.json` was read (or correctly inferred standalone), exactly one target site was resolved through the registry before any site state was read, all reads/writes landed in that site's workspace, and sibling site folders were untouched.
