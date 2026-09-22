---
name: storage-audit
description: Reclaim disk on Jorge's Mac mini with scripts/storage-hygiene.sh, covering leaked processes and swap, worktrees, dependency and build caches, agent histories, Xcode and simulators. Use when free space is low, Jorge asks to free space, or the storage-hygiene cron alerts or fails.
version: 6.0.0
mutating: true
writes_to: ["orphaned dev processes (killed)", "registered git worktrees (clean, backed, idle)", "node_modules/.next/.turbo build state", "T3, OpenCode and Cursor agent history", "Xcode DerivedData and simulator device data", "tool and package caches", "logs and temp bundles", "~/.hermes/state/storage-hygiene/"]
---

# Reclaim disk on the Mac mini

228 GiB of SSD, 16 GB of RAM, T3 Code development all day. Target: 40 GiB free on
`/System/Volumes/Data`. Count **physical bytes**: the `df` delta or APFS private size, never
`du`. Bun `node_modules` are clones of its cache, `uv` venvs hardlink theirs, and a mounted
simulator runtime is a view of its image, so `du` counts shared blocks once per copy.

## 1. Read the state

```bash
cd ~/.hermes/profiles/matias; S=~/.hermes/state/storage-hygiene
df -h /System/Volumes/Data; sysctl vm.swapusage; uptime
tail -3 $S/history.log; tail -4 $S/meter.log
grep -E 'JORGE-ACTION|REAPED|FAILED ' $S/storage-hygiene.log | tail -8
```

Done when you can state free space and swap, and name the `meter.log` field that grew since free space last looked healthy.

## 2. Run the script

```bash
./scripts/storage-hygiene.sh --dry-run   # WOULD-* lines, nothing changes
./scripts/storage-hygiene.sh             # guarded cleanup
```

Hermes cron `storage-hygiene-every-3-hours` (`30 */3 * * *`, no-agent) runs the cleanup; Telegram
hears only failures and free space under 10 GiB. Exit 0 = at target, 3 = below target, 2 = failed,
4 = another run holds the lock (never delete `run.lock`). Below target it shortens its own gates.

The last log line is the verdict (`freed= free= swap= failures= status=`); `METER` above it is
the per-consumer snapshot, also appended to `meter.log`. `RETIRED`, `PRUNED`, `CAPPED` and `REAPED`
are done, `PROTECT <reason>` kept something, `JORGE-ACTION` needs a human, `FAILED` is a failure.
`BUDGET` ranks candidates of 50 MiB or more by logical size.

- **Vetoes** hold forever: `uncommitted-or-inspection-failed`, `unbacked`, `durable-or-unknown-convex-state`,
  `process-active`, `open`, `shared-clone-source`. Failed inspection is no proof of clean or idle.
- **Gates** expire: `age-gate(Nh)` carries `gate_until`. Check it before calling a guard broken.

The classes are the script's functions (`grep -n '() {' scripts/storage-hygiene.sh`); read one before explaining or changing it.

## 3. Below target: find the drain

Disk goes three ways. Check them in order; the first that explains the loss is the answer.

1. **Leaks.** Memory spills into swap files on the same APFS container, so leaked processes eat
   disk. The script reaps processes adopted by launchd whose owner is gone (`ORPHAN`, `REAPED`):
   Convex node executors whose backend exited (each pins a ~40 MiB bundle in `$TMPDIR`),
   `opencode serve` left by a T3 restart, `convex dev` for a deleted checkout. On 2026-09-22,
   115 held 9.8 GiB. Swap still high after a reap means a live workload or a reboot.
2. **A metered consumer grew.** Diff `meter.log` across the drop. Known growers: `opencode.db`
   (every `message.updated` event stores the session's diffs again, ~2.6 GiB a day), new worktrees,
   `$TMPDIR`, simulators.
3. **Nothing covers it.** Measure: `du -xk -d 3 ~ | sort -rn | head -40`, then
   `python3 scripts/storage-hygiene-support.py private <path>` for its physical KiB. A new
   regenerable class becomes a script function (name the friction in the commit); anything else goes to Jorge.

Done when the shortfall is assigned to named paths with physical sizes, each one reclaimable by a
class, waiting on a gate, or listed for Jorge.

## Contract

- Delete only through the script's classes. A deletion outside them is a Jorge call with evidence.
- Always out of scope: `credentials/`, the vault, `~/Documents`, Screen Studio projects, app auth and
  state under Application Support, Chrome profiles, Preboot and update snapshots, the selected
  Xcode and current iOS runtime, `Library/Caches/dotslash` (App Management blocks it).
- Keep clone sources. Deleting the Bun cache returns only its private bytes and makes the next
  install download a second copy.
- Kill only processes you started; the reaper is the one exception. Ports 3214, 3215 and 8081
  are the Andy iOS loop.
- For a permanent-loss call, quote the diffstat (`N insertions across M files`), not the guard flag.
  Backup proof is `git ls-remote` plus `merge-base --is-ancestor`; `git branch -r --contains` reads stale refs.
- pnpm keeps one store per major version. Prune each with the executable whose `store path` matches.

## Levers outside the cron

- **Reboot** returns all swap. Stop live dev loops first.
- **Protected worktrees.** List each with size, reason and `ahead=/uncommitted=`; `ahead=unknown` is not zero.
- **`JORGE-ACTION pending-macos-update`.** Install and reboot. Only OS updates grow Preboot.

## Report

```
FREE: <GiB> (target 40)  FREED: <GiB>  SWAP: <GiB> (uptime …)  ORPHANS: <n> / <GiB>
DRAIN: <the consumer that explains the loss, with meter numbers>
RETIRED: <counts by class>
PROTECTED: <worktree paths with the literal reason>
NEXT: <reboot | Jorge decision on … | none>
```

A dry audit reports and stops. After a cleanup, verify `df` and record failures or open steps on
matias#592. Authorization persists: an ordered reboot or app restart needs no second ask.
