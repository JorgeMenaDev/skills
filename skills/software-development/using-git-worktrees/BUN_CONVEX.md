# Bun and local Convex hydration

Read repository instructions first. This contract begins only after `storage-preflight.sh` emits `HYDRATE_ALLOWED: yes`.

## 1. Copy local environment

Resolve helpers against this skill directory. Use `<skill-dir>/scripts/copy-env-local.sh <primary-checkout> <worktree>` on first creation or when files are missing. It copies files named exactly `.env.local` only when both checkouts ignore the path, excludes provider/database/build state, and strips every plain single-line assignment whose variable name contains `CONVEX`. Quoted, backtick, or continued Convex assignments block the copy. Never overwrite a warm `local-main` target merely to refresh it or print values.

Prefer a runtime-neutral repository `setup:worktree` command when present and verify the same result.

## 2. Install deterministically

Run `bun install --frozen-lockfile` at the monorepo root using the declared Bun version. A lockfile change is a bootstrap failure.

## 3. Allocate isolated runtime identity

Derive `WORKTREE_ID` from the slug (`local-main` for launch mode). Reserve an unused contiguous app-port block and an unused consecutive Convex cloud/site pair. Export:

```bash
export WORKTREE_ID="$slug"
export WORKTREE_APP_PORT=<free-port>
export WORKTREE_CONVEX_CLOUD_PORT=<free-even-port>
export WORKTREE_CONVEX_SITE_PORT=$((WORKTREE_CONVEX_CLOUD_PORT + 1))
```

Use unique Portless routes. One proxy may be shared; routes, app ports, Convex ports, and databases may not.

## 4. Create and classify local Convex state

Run the repository bootstrap with the explicit runtime identity and ports. Otherwise inspect the pinned CLI help and create a fresh local deployment. Require `local:*`, loopback URLs, state beneath this worktree, and no cloud deploy/admin key.

After creating a blank deployment or applying only documented synthetic seeds, require `.convex/state-kind` to be ignored and write `synthetic` there. Change it to `durable` immediately when user-created, imported, or otherwise valuable data enters the database. Missing, invalid, or uncertain classification is treated as durable.

Use documented local seeds only; never import production/shared-dev data. Disable long-running Convex codegen after deliberate bootstrap when supported. Run codegen deliberately for schema/API changes.

## 5. Start, smoke, and stop

Use the repository launcher, keep logs per worktree, and prove owned listeners, URLs, local selectors, and a clean tracked checkout. Authenticate in a fresh signed-out browser context when needed.

Leave servers running only when the user asked for a reachable live surface. Otherwise stop the worktree-owned stack after proof and continue to `LIFECYCLE.md`.
