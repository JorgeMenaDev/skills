# Install Modes And Hub Operation

Use on any first run where no `.seo/` exists yet, and on every run inside a hub workspace — an orchestrator repo (for example an agent profile) that manages SEO for many sites/repos from one place. Standalone runs never need this file beyond the mode stamp rules below.

The skill has two install modes. The operating behavior — modes, phases, tickets, one target per run — is identical in both; only where state lives and how the target workspace is resolved differ.

## Mode Stamp

`.seo/config.json` records the install mode. Read it at the start of every run:

```json
{ "mode": "standalone | hub", "created": "YYYY-MM-DD", "skillVersion": "3.0.0" }
```

- **Back-compat rule**: a `.seo/` directory with no `config.json` is a standalone workspace. Operate as standalone, and stamp `{"mode": "standalone"}` on the next mutating run (never in no-write runs).
- Once stamped, never ask the mode question again. Converting a workspace between modes is a human decision, never done silently — the bootstrap script refuses mode conflicts.

## First-Run Mode Selection

When no `.seo/` exists at all, ask exactly one question before bootstrapping:

> Is this a standalone site repo (SEO state lives here, for this one site), or a hub — an orchestrator workspace that manages SEO for several repos/sites?

Then run `scripts/bootstrap-seo-workspace.mjs` (standalone) or `scripts/bootstrap-seo-workspace.mjs --hub` (hub); either stamps `config.json`. Unattended runs never ask: per `references/scheduled-operation.md`, a missing workspace exits `blocked` for an interactive first run.

## Workspace Root Aliasing

The load-bearing rule: **"workspace root" is `.seo/` in standalone mode and `.seo/sites/<slug>/` in hub mode.** Every `.seo/X` path in `SKILL.md` and the other references means `<workspace root>/X`. After target resolution, run every mode, reference, and script contract verbatim against the resolved workspace.

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

- Slugs match `^[a-z0-9-]+$`, derived from the registry Site column hostname (`andy-partner.com` → `andy-partner`).
- The hub root holds no standalone workspace files of its own — hub-level state is only the config, registry, rollup index, and optional hub-level sweep loop state (`.seo/loops/`).
- A registry row may still point at an external workspace root (a repo with its own `.seo/`, or a partner-owned path); `sites/<slug>` is the default for hub-managed sites, not a requirement.
- Create a new site workspace with `scripts/bootstrap-seo-workspace.mjs --site <slug>`, then add its registry row yourself — the script prints a suggested row but never edits `registry.md`.

## Target Resolution

The only behavioral addition in hub mode: resolve exactly one target site before reading any state.

1. **User names a site** — resolve it to its registry row (`references/portfolio-registry.md` Read-First Rule); the workspace is that row's Workspace root. Relative roots resolve against the registry file's directory.
2. **No site named** — run `scripts/portfolio-status.mjs --registry .seo/registry.md` and present the ranked table as evidence; confirm one target with the user. Staleness ranking is the tiebreak, not the decision — a cold revenue-critical site outranks a warm experiment.
3. **Unattended** — the invoking prompt must name the target; otherwise exit `blocked` (`references/scheduled-operation.md`).

After resolution, everything is standalone behavior against the resolved workspace. One target per run; never a blended workspace.

## Ticket IDs

`SEO-NNN` stays monotonically increasing **per site folder** — each `sites/<slug>/` is a "target workspace" in the sense of `references/ticket-architecture.md`. There is no hub-global ticket namespace.

## Cross-Site Re-Filing

Hub extension of the Target Boundary in `references/operating-loop.md`: when a parked ticket actually belongs to another *registered* site, it may be re-filed as a **new** ticket in that site's backlog, using that site's own next `SEO-NNN` and a cross-reference (`re-filed from <site> SEO-NNN`). The origin row moves to Done/parked with the pointer. Ticket IDs never move between sites.

## Scripts In Hub Mode

All analysis scripts take explicit paths — pass the resolved workspace: `.seo/sites/<slug>/backlog.md`, `.seo/sites/<slug>/reports/`, and so on. Credentials stay per-site via the registry Credentials column (for example `GSC_CREDENTIALS_DIR`); never a hub-root `.env` shared across sites.

## Exit Criteria

A hub run exits cleanly when `config.json` was read (or correctly inferred standalone), exactly one target site was resolved through the registry before any state was read, all reads/writes landed in that site's workspace, and sibling site folders were untouched.
