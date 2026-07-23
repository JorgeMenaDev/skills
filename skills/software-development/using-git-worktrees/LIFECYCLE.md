# Worktree lifecycle close

Run this whenever a task no longer needs its live runtime, including before handoff.

## 1. Stop the owned stack

Use the repository's stop command or terminate only processes proven to have this worktree as their working directory. Verify its app and Convex ports have no listeners. If ownership is uncertain, stop with `RUNTIME_OWNERSHIP_UNKNOWN`; terminating a shared process is the failure this gate prevents.

## 2. Classify local state

Inspect every project-local `.convex/local/` when present:

- its adjacent `.convex/state-kind` exactly `synthetic`: blank or documented synthetic seed only; eligible for dehydrate.
- exactly `durable`: preserve.
- missing, invalid, imported, user-created, or uncertain: treat as durable and preserve.

Environment files and any database outside explicitly synthetic `.convex/local/` remain protected.

## 3. Dehydrate

Preview first:

```bash
<skill-dir>/scripts/dehydrate-worktree.sh <worktree>
```

Require `ACTIVE_PROCESSES: 0` and inspect every candidate. Then apply:

```bash
<skill-dir>/scripts/dehydrate-worktree.sh <worktree> --apply
```

This removes only `node_modules`, `.next`, `.turbo`, and explicitly synthetic `.convex/local/`. It preserves source, branches, `.env.local`, durable/unknown Convex state, credentials, and other ignored files.

## 4. Review retirement

Keep `local-main` registered and dehydrated for reuse. A feature worktree becomes retirement-eligible only after merge or explicit abandonment, zero owned processes, clean tracked/untracked status, and classification of every ignored file. Preserve its branch.

If environment or durable state is unique, retain the worktree. Otherwise remove the exact registered path with `git worktree remove`. Whole-worktree deletion remains a reviewed action; artifact dehydrate is the automatic close step.

Report physical free space after dehydrate and whether the worktree was retained, eligible, or removed.
