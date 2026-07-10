# Migrate And Uninstall

Use when moving a standalone workspace into a hub, removing the skill from a repo, or repairing a workspace after it moved. Migration is identity-preserving relocation, not directory placement: the workspace, its registry row, the source repo's skill copies, and its doc pointers move or die together. Never run these flows unattended.

Path terms (`HUB_ROOT`, `SITE_WORKSPACE`, `TARGET_REPO`, `SKILL_DIR`) are defined in `SKILL.md` Install Modes.

## Doctor First

Before mutating anything, run the read-only doctor on both ends:

```bash
node <SKILL_DIR>/scripts/seo-doctor.mjs <source-repo> --domain <host>
node <SKILL_DIR>/scripts/seo-doctor.mjs <hub-repo> --domain <host>
```

If either run reports candidate workspaces for the site beyond the one being moved, stop: pick the single canonical workspace with the user — an explicit **create / adopt / migrate** decision — before continuing. Two competing histories for one site is the failure this file exists to prevent.

## Standalone → Hub Migration

1. **Doctor both ends** (above). Record the source workspace path and the target slug (slug rules: `references/hub-mode.md` Hub Layout).
2. **Copy the workspace** into `HUB_ROOT/sites/<slug>/` — everything under the source `.seo/` **except `config.json`** (mode is hub-level state; site folders carry no config). Copy, do not move, until step 6 verifies.
3. **Register**: add the site's row to `HUB_ROOT/registry.md` (`references/portfolio-registry.md` Row Shape). Record the source repo in the Notes column — convention: `repo: <path-or-remote>` — so scripts and humans can still find TARGET_REPO after the move.
4. **Strip the source repo**, in one reviewed change:
   - the `.seo/` directory;
   - every skill install copy: `.agents/skills/seo-growth-workspace`, `.claude/skills/seo-growth-workspace`, `skills/seo-growth-workspace`, `.commandcode/skills/seo-growth-workspace` — follow symlinks and remove both the link and any repo-local target;
   - the skill's entry in the repo's skills lockfile (for example `skills-lock.json`), via the repo's skills installer when it has a remove command;
   - `.seo/` and `seo-growth-workspace` pointers in `AGENTS.md`, `CLAUDE.md`, and `README.md` — replace each with one line naming the hub workspace.
5. **Commit** the source-repo strip naming the migration, for example: `seo: migrate .seo workspace to <hub> sites/<slug>`.
6. **Doctor both ends again**: the source must show no workspace, no install copies, and no stale doc mentions; the hub must show the site registered (no REGISTRATION PENDING finding). Only then delete any temporary copy of the source workspace.
7. **Post-migration hygiene** (below) inside the migrated workspace, in the same pass.

## Plain Uninstall

Removing the skill from a repo without moving the site anywhere:

1. Doctor the repo.
2. Decide the workspace's fate explicitly with the user: keep `.seo/` (it is consumer state, not skill internals), archive it, or delete it. Silence means keep.
3. Strip skill copies, the lockfile entry, and doc pointers exactly as in Migration step 4.
4. Doctor again; commit naming the uninstall.

## Post-Migration Hygiene

Migrated files carry prose written when the workspace was repo-local. Inside SITE_WORKSPACE, fix:

- `README.md` prose declaring a repo-local `.seo/` — inside a workspace, `.seo/X` means `SITE_WORKSPACE/X`; rewrite anything claiming the workspace still lives in TARGET_REPO.
- Backlog `Verify` cells referencing repo-vendored script paths (for example `.agents/skills/seo-growth-workspace/scripts/gsc-fetch.mjs`, or a `.seo/scripts/...` file that did not move) — repoint at SKILL_DIR scripts with explicit SITE_WORKSPACE arguments, or at files that actually exist in the migrated workspace.
- Relative links that escaped the old repo (`../.agents/...`) — fix or delete.

Log the hygiene pass in `log.md` with the migration date and the source path.

## Exit Criteria

A migration or uninstall exits cleanly when the doctor is clean on every touched root, exactly one workspace exists for the site, its registry row (hub) or repo (standalone) is the single canonical home, and the source repo retains no `.seo/`, no skill copies, no lockfile entry, and no stale doc pointers.
