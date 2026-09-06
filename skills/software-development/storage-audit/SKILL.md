---
name: storage-audit
description: Reclaim disk on Jorge's Mac mini with scripts/storage-hygiene.sh — worktrees, build and dependency caches, T3 Code thread history, Xcode data, tool caches. Use when free space is low, Jorge asks to clean up space, or the storage-hygiene cron needs diagnosis.
version: 5.0.0
mutating: true
writes_to: ["registered git worktrees (clean, backed, idle)", "node_modules/.next/.turbo build state", "~/.t3/userdata/state.sqlite (old thread rows)", "Xcode DerivedData and simulator device data", "tool and package caches", "session and log churn", "~/.hermes/state/storage-hygiene/"]
---

# Reclaim disk on the Mac mini

One rule: retire a path when it is a **known-regenerable class and idle**. The classes are the
script's functions; nothing else is in scope. Success is the `df` delta, never the bytes selected.

## Run it

```bash
cd ~/.hermes/profiles/matias
./scripts/storage-hygiene.sh --dry-run       # preview; audit records only
./scripts/storage-hygiene.sh                 # guarded cleanup
./scripts/storage-hygiene.sh --compact-only  # only shrink T3/OpenCode free pages
```

Target is 40 GiB free on `/System/Volumes/Data`. A run that starts below target switches to the
short age gates itself (`--aggressive`: 3h instead of 24h on linked worktrees and their
`node_modules`). Hermes cron `storage-hygiene-every-3-hours` (`30 */3 * * *`, no-agent) runs
`storage-hygiene-scheduled.sh`, which reports failures at any free-space level and warns below 10 GiB.

Exit codes: 0 means completed above target, 3 means completed below target, 2 means failed,
and 4 means another run owns the lock. A leftover `run.lock` file is normal. Its kernel lock
releases on exit or crash; never delete the file to bypass a running owner.

Cleanup records live under `~/.hermes/state/storage-hygiene/`: `history.log`,
`storage-hygiene.log`, and `last-run.json`. Dry runs use separate `audit.log`, `audit-history.log`,
and `last-audit.json`. Each verdict names a run directory containing `candidates.json` and
failure evidence. Dry mode writes these audit records and lock metadata but does not retire
files, change Git refs/worktree metadata, or prune/compact databases.

## Read the result

The last log line is the verdict:

```
=== storage-hygiene done mode=cleanup freed=… free=… target=40GiB shortfall=… swap=… uptime='…' failures=N status=ok|below-target|failed evidence=… ===
```

Audit verdicts use `background_delta` instead of `freed`. Disk changes during a preview are
other workloads, not cleanup success.

`BUDGET` lines rank candidates by allocated size with a reason and, for age gates, a
`gate_until` timestamp. `online` is eligible now; `offline` requires owner closure, temporary
space or admin maintenance; `protected` is retained. Nested paths are deduplicated within each
category. Categories can overlap, so never add protected totals to selected totals. APFS shared
blocks mean neither allocated bytes nor SQLite free pages promise an equal `df` gain. Swap is
a separate reboot-dependent estimate, not an online candidate.

`RETIRED` and `PRUNED` describe completed actions; only the final `df` delta measures recovery; `PROTECT <reason>`
kept something; `JORGE-ACTION` needs a human; `FAILED` counts toward `failures`. Read the reason
literally before repeating it:

- Hard vetoes, never overridden: `uncommitted-or-inspection-failed`, `unbacked`,
  `durable-or-unknown-convex-state`, `process-active` and `open`.
  Failed inspection is not proof that a path is clean, idle or unused.
- Soft gates that time out: `age-gate(24h)` or `age-gate(3h)` on worktrees, `active` on caches.
  Each class has its own window (3h build caches, 24h worktrees and Xcode, 72h package caches,
  14d Hugging Face). Measure against that window before calling a guard broken.

## Classes

| Class | Retired when |
|---|---|
| Git worktrees | linked worktree, clean, current HEAD contained by a current origin branch tip or exactly matching a merged PR head, synthetic markers for any local Convex state, no owning process/open file, idle past the gate including creation time |
| `node_modules`, `.next`, `.turbo` | `node_modules` only inside linked worktrees (main checkouts keep theirs), lockfile-backed, no process on the checkout, idle 24h or 3h aggressive; `.next` and `.turbo` anywhere idle 3h; `.next/cache` and `.next/dev` go even when `.next` is protected |
| T3 Code thread history | rows of threads settled more than 2 days ago that are not unsettled, snoozed, pinned or archived: events, activities, messages, sessions. T3 never prunes these itself |
| OpenCode sessions | sessions not updated for 2 days, with their events, messages and parts (`~/.local/share/opencode/opencode.db`). Same file-shrink rule as T3; inspect all OpenCode owners, including instances outside the visible T3 app |
| Local DBs and churn | `.convex/local` explicitly marked `synthetic`, in a known checkout, idle 24h, with no owning process or open file; Codex and Grok sessions, OpenCode and Hermes logs older than 3d; Codex log DB when not open |
| Scratch clones | `~/.btca/agent/sandbox`, `~/dev/.temp`, `~/dev/code2` idle 3h, only with inspectable Git state and no dirty, unpushed or stashed changes |
| Xcode | stale `DerivedData/AndyPartnerDev-*` siblings idle 3h with no owning process/open file and Xcode closed; all of DerivedData idle 24h; unavailable simulators deleted, shutdown ones erased when idle 24h and over 200 MiB; superseded iOS runtimes |
| Tool caches | Google, t3code-updater, bun, ReactNative, Cursor ShipIt at 3h; CocoaPods, Homebrew, npm cacache, Convex at 72h; superseded Claude, Cursor and agent-browser versions idle 3h with no owning process/open file; runner `_work` when no `Runner.Worker` |
| Local TM snapshots | always, all of them: the destination is retired and every snapshot pins deleted bytes |

Out of scope, and never folded into a run: Application Support (Codex, T3, Cursor auth and state),
Chrome profiles, `~/Documents`, Screen Studio projects, `credentials/`, the vault, the selected
Xcode and its current iOS runtime, Hermes `state.db` (reported by size only), `Library/Caches/dotslash` (App Management blocks unattended deletion).

## Still below target after a run

Work the levers in this order; each is a fact the log already printed.

1. **Swap and uptime.** Multi-day uptime holds several GiB of swap; the release is a reboot after
   stopping live dev loops. Say so in the report.
2. **T3 and OpenCode state files.** Free database pages are an offline candidate until the
   one-time conversion to incremental auto-vacuum. Save ongoing work, close the owning apps,
   and verify no process holds either database or its WAL/SHM sidecars. Closing a window is not
   proof that all OpenCode instances exited. Use `--dry-run --compact-only`, then the authorized
   `--compact-only` run. It checks integrity before and after, converts to incremental mode and
   verifies the checkpoint. It does not prune history or sweep other paths.
   Full VACUUM requires temporary space: the script reserves twice the original file size plus
   1 GiB, following [SQLite's documented upper bound](https://www.sqlite.org/lang_vacuum.html).
   If swap is large, reboot first and keep database owners closed to provide that headroom.
   Once converted, later runs can reclaim free pages incrementally while the app is open,
   subject to SQLite locking and successful checkpoint verification.
3. **Pending macOS update or Preboot growth.** Install and reboot. Never delete Preboot or update
   snapshots by hand.
4. **Protected worktrees.** List each protected worktree with its size, reason and
   `ahead=/uncommitted=` numbers. `ahead=unknown` is not zero. Preserve the work unless its
   recovery or discard is authorized; do not force past the guard to reach the target.
5. **Do not re-open** (measured and refuted, see vault `context/mac-mini-storage.md`): pnpm store
   prune, cold files, duplicate apps, source-code volume, the mounted simulator volume (a view of
   the 7.9 GiB asset, not extra bytes).

## Report

```
FREE: <gib> (target 40)  FREED: <gib>  SWAP: <gib> (uptime …)
RETIRED: <counts by class>
PROTECTED: <worktree paths with the literal reason>
NEXT: <reboot | quit T3 once | Jorge decision on … | none>
```

For a dry audit, report measured free space, ranked estimates, the concrete path toward the
target and what remains protected. Do not run cleanup when only a preview was requested.
For an authorized cleanup, verify the final physical free space and record any failure or
remaining maintenance step on the owning issue. Existing authorization persists; do not ask
again merely because an offline step closes an app or needs a reboot.
