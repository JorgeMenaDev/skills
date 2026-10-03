---
name: storage-audit
description: Reclaim disk on any Mac running Jorge's workspace (the Mac mini or the MacBook Pro) with scripts/storage-hygiene.sh, covering leaked processes and swap, worktrees, dependency and build caches, agent histories, Xcode and simulators. Use when free space is low, Jorge asks to free space, or the storage-hygiene cron alerts or fails.
version: 7.4.0
mutating: true
writes_to: ["orphaned dev processes (killed)", "registered git worktrees (clean, backed, idle)", "node_modules/.next/.turbo build state", "T3, OpenCode and Cursor agent history", "settled or legacy crew dirs and the crew sweep log", "superseded T3 runtimes", "Xcode DerivedData and simulator device data", "tool and package caches", "logs and temp bundles", "~/.local/state/matias/storage-hygiene/"]
---

# Reclaim disk on a workspace Mac

T3 Code threads run on both Macs; Jorge picks the host from his phone. `<clone>/.host` says which
one you are on (`mini` or `laptop`). The script is the same on both, and paths are derived, never
machine-specific. Three numbers for the internal `/System/Volumes/Data`, each overridable by env:
target 90 GiB (`STORAGE_HYGIENE_TARGET_GIB`, only labels the run), Telegram warning 75
(`STORAGE_HYGIENE_ALERT_GIB`, scheduled job only) and pressure 40 (`STORAGE_HYGIENE_PRESSURE_GIB`,
the only number that shortens gates).

| Mac | Internal | `~/dev/code` |
|---|---|---|
| Mac mini (`mini`) | 228 GiB, 16 GB RAM | its own 2 TB NVMe `Code` volume, mounted there by `/etc/fstab`, holding repos, worktrees, the Bun/npm/uv caches and runner `_work` |
| MacBook Pro (`laptop`) | everything | a plain folder on the internal disk |

Pressure is per volume. The script leaves caches and build output alone on a separate disk with at
least 100 GiB free (`PROTECT roomy-volume`), because deleting them there frees nothing on Data. Tool
caches are found by asking each tool (`bun pm cache`, `npm config get cache`, `uv cache dir`), so
the Mac mini's code-disk caches and the laptop's default ones both resolve. Count **physical bytes**: the `df` delta or APFS private size, never
`du`. Bun `node_modules` are clones of its cache, `uv` venvs hardlink theirs, and a mounted
simulator runtime is a view of its image, so `du` counts shared blocks once per copy.

## 1. Read the state

```bash
cd ~/matias; S=~/.local/state/matias/storage-hygiene
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

On the Mac mini, the t3-cron job `storage-hygiene-every-3-hours` runs the cleanup on the schedule in
`scripts/scheduled-jobs.json` (read it there; the name predates a daily interim schedule); Telegram hears failures and free space under 40 GiB on every run, a warning under 75 at most once a day, `GROWTH` and `code-disk-not-mounted` lines whenever a run logs them, and otherwise one green receipt a day. On the laptop, the LaunchAgent
`com.matias.storage-hygiene` runs it at :30 every 3 hours with no alerts
(`scripts/install-storage-hygiene-agent.sh`; its output is in `launchd.log` in the state dir). Exit 0 = at target, 3 = below target, 2 = failed,
4 = another run holds the lock (never delete `run.lock`). Below the pressure line it shortens its worktree and `node_modules` gates to 3h; below target alone it changes nothing.

The last log line is the verdict (`freed= free= swap= failures= status=`); `METER` above it is
the per-consumer snapshot, also appended to `meter.log`. `RETIRED`, `PRUNED`, `CAPPED` (a log cut to its last 20 MB) and `REAPED`
are done, `PROTECT <reason>` kept something, `JORGE-ACTION` needs a human, `FAILED` is a failure.
`BUDGET` ranks candidates of 50 MiB or more by logical size.

- **Vetoes** hold forever: `uncommitted-or-inspection-failed`, `unbacked`, `durable-or-unknown-convex-state`,
  `process-active`, `open`, `shared-clone-source`, and any crew dir whose current round is not settled
  and acked (unreadable round state counts as unsettled). `roomy-volume` holds while that disk keeps 100 GiB free
  (`STORAGE_HYGIENE_ROOMY_GIB`). Failed inspection is no proof of clean or idle.
- **Gates** expire: `age-gate(Nh)` carries `gate_until`. Check it before calling a guard broken.

The classes are the script's functions (`grep -n '() {' scripts/storage-hygiene.sh`); read one before explaining or changing it.

`GROWTH new|grew` names a home folder on Data (depth 1–2) that is new or 1 GiB over its high-water
mark in `growth.tsv` in the state dir; it reports once per extra GiB, and audits never update the
snapshot. `JORGE-ACTION code-disk-not-mounted`: `/etc/fstab` names `~/dev/code` but it sits on Data.

## 3. Below target: find the drain

Disk goes three ways. Check them in order; the first that explains the loss is the answer.

1. **Leaks.** Memory spills into swap files on the same APFS container, so leaked processes eat
   disk. The script reaps processes adopted by launchd whose owner is gone (`ORPHAN`, `REAPED`):
   Convex node executors whose backend exited (each pins a ~40 MiB bundle in `$TMPDIR`),
   `opencode serve` left by a T3 restart, `convex dev` for a deleted checkout. On 2026-09-22,
   115 held 9.8 GiB. Swap still high after a reap means a live workload or a reboot.
   It only reports (`RUNTIME-LEFTOVER`, meter `runtime_leftovers=`) a worktree runtime whose
   launcher is gone: `convex dev`, its local backend or a Next server for a linked worktree that
   still exists. Its owner may still be working there, so check the worktree's recent commits or
   open PR before acting; the stop is `worktree-dev.sh down <slug>` from the primary checkout.
2. **A metered consumer grew.** Diff `meter.log` across the drop. Known growers: `opencode.db`
   (every `message.updated` event stores the session's diffs again, ~2.6 GiB a day), new worktrees,
   `$TMPDIR`, simulators.
3. **Nothing covers it.** Measure: `du -xk -d 3 ~ | sort -rn | head -40` (`-x` stays on Data, so the
   mini's code disk is skipped), then
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

- **Reboot** returns all swap. Stop live dev loops first. On the mini, confirm `mount | grep dev/code`
  afterwards; the code disk must stay plugged in, or `~/dev/code` is an empty folder.
- **Protected worktrees.** List each with size, reason and `ahead=/uncommitted=`; `ahead=unknown` is not zero.
- **`JORGE-ACTION pending-macos-update`.** Install and reboot. Only OS updates grow Preboot.

## Report

```
FREE: <GiB> (target 90, pressure 40)  FREED: <GiB>  SWAP: <GiB> (uptime …)  ORPHANS: <n> / <GiB>
LEFTOVERS: <RUNTIME-LEFTOVER worktrees, each with its owner's state | none>
DRAIN: <the consumer that explains the loss, with meter numbers>
RETIRED: <counts by class>
PROTECTED: <worktree paths with the literal reason>
NEXT: <reboot | Jorge decision on … | none>
```

A dry audit reports and stops. After a cleanup, verify `df` and record failures or open steps on the
open matias storage issue (open one if none exists), naming the host. Authorization persists: an ordered reboot or app restart needs no second ask.
