---
name: storage-audit
description: Reclaim disk on Jorge's Mac mini with scripts/storage-hygiene.sh — worktrees, build and dependency caches, T3 Code thread history, Xcode data, tool caches. Use when free space is low, Jorge asks to clean up space, or the storage-hygiene cron needs diagnosis.
version: 4.0.1
mutating: true
writes_to: ["registered git worktrees (clean, backed, idle)", "node_modules/.next/.turbo build state", "~/.t3/userdata/state.sqlite (old thread rows)", "Xcode DerivedData and simulator device data", "tool and package caches", "session and log churn", "~/.hermes/state/storage-hygiene/"]
---

# Reclaim disk on the Mac mini

One rule: retire a path when it is a **known-regenerable class and idle**. The classes are the
script's functions; nothing else is in scope. Success is the `df` delta, never the bytes selected.

## Run it

```bash
cd ~/.hermes/profiles/matias
./scripts/storage-hygiene.sh --dry-run   # WOULD-* lines, no changes
./scripts/storage-hygiene.sh             # retire; exit 0 at 40 GiB free or more, exit 3 below
```

Target is 40 GiB free on `/System/Volumes/Data`. A run that starts below target switches to the
short age gates itself (`--aggressive`: 3h instead of 24h on linked worktrees and their
`node_modules`). Hermes cron `storage-hygiene-every-3-hours` (`30 */3 * * *`, no-agent) runs
`storage-hygiene-scheduled.sh`, which stays silent on Telegram unless free space is under 10 GiB.
Ledger: `~/.hermes/state/storage-hygiene/history.log` (one line per run) and `storage-hygiene.log`.

## Read the result

The last log line is the verdict:

```
=== storage-hygiene done freed=… free=… target=40GiB shortfall=… swap=… uptime='…' failures=N status=ok|below-target ===
```

Every other line is one decision. `RETIRED`, `PRUNED` and `SWEPT` freed something; `PROTECT <reason>`
kept something; `JORGE-ACTION` needs a human; `FAILED` counts toward `failures`. Read the reason
literally before repeating it:

- Hard vetoes, never overridden: `uncommitted`, `unbacked` (HEAD not on GitHub and no merged PR),
  `durable-convex-state`, `process-active` (argv or cwd inside the path), `open` (lsof).
- Soft gates that time out: `age-gate(24h)` or `age-gate(3h)` on worktrees, `active` on caches.
  Each class has its own window (3h build caches, 24h worktrees and Xcode, 72h package caches,
  14d Hugging Face). Measure against that window before calling a guard broken.

## Classes

| Class | Retired when |
|---|---|
| Git worktrees | linked worktree, clean, HEAD on any `origin/*` ref or its branch's PR merged, no `.convex/state-kind` other than `synthetic`, no owning process, idle past the gate (creation time counts) |
| `node_modules`, `.next`, `.turbo` | lockfile-backed, no process on the checkout, idle (24h deps in main checkouts, 3h otherwise); `.next/cache` and `.next/dev` go even when `.next` is protected |
| T3 Code thread history | rows of threads settled more than 2 days ago that are not unsettled, snoozed, pinned or archived: events, activities, messages, sessions. T3 never prunes these itself |
| Local DBs and churn | `.convex/local` idle 24h; Codex and Grok sessions, OpenCode and Hermes logs older than 3d; Codex log DB when not open |
| Scratch clones | `~/.btca/agent/sandbox`, `~/dev/.temp`, `~/dev/code2` idle 3h, unless they hold dirty, unpushed or stashed git state (`JORGE-ACTION`) |
| Xcode | stale `DerivedData/AndyPartnerDev-*` siblings whenever Xcode is closed; all of DerivedData idle 24h; unavailable simulators deleted, shutdown ones erased when idle 24h and over 200 MiB; superseded iOS runtimes |
| Tool caches | Google, t3code-updater, bun, ReactNative, Cursor ShipIt at 3h; CocoaPods, Homebrew, npm cacache, Convex at 72h; superseded Claude, Cursor and agent-browser versions; runner `_work` when no `Runner.Worker` |
| Local TM snapshots | always, all of them: the destination is retired and every snapshot pins deleted bytes |

Out of scope, and never folded into a run: Application Support (Codex, T3, Cursor auth and state),
Chrome profiles, `~/Documents`, Screen Studio projects, `credentials/`, the vault, the selected
Xcode and its current iOS runtime, `opencode.db` and Hermes `state.db` (reported by size only), `Library/Caches/dotslash` (App Management blocks unattended deletion).

## Still below target after a run

Work the levers in this order; each is a fact the log already printed.

1. **Swap and uptime.** Multi-day uptime holds several GiB of swap; the release is a reboot after
   stopping live dev loops. Say so in the report.
2. **T3 state file.** `JORGE-ACTION t3-state holds N GiB of free pages` means rows were pruned but
   the file cannot shrink while T3 Code holds it. Jorge quits T3 Code, runs the script once,
   relaunches. After that one-time VACUUM the file shrinks on every run without closing T3.
3. **Pending macOS update or Preboot growth.** Install and reboot. Never delete Preboot or update
   snapshots by hand.
4. **Protected worktrees.** List each `uncommitted` or `unbacked` worktree with its
   `ahead=/uncommitted=` numbers and ask Jorge which to push or drop.
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

Done when the `df` delta is measured, every protection names its reason, and anything still
blocking the target is either fixed or a numbered question to Jorge.
