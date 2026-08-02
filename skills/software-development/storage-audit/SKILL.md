---
name: storage-audit
description: Reclaim disk on Jorge's Mac mini by retiring regenerable data — snapshots, worktrees, local databases, agent churn, caches. Use for low space, recurring cleanup, or storage-automation diagnosis.
version: 3.0.1
mutating: true
writes_to: ["local Time Machine snapshots", "registered git worktrees", "regenerable caches and local databases", "~/.hermes/state/storage-hygiene/"]
---

# Reclaim disk

One rule: **retire a path if it is a known-regenerable class AND idle.** Anything outside the
classes below is out of scope — do not invent a queue for it. Success is the `df` delta and
nothing else; logical bytes selected are vanity.

## Run it

```bash
cd /Users/jorge/.hermes/profiles/matias
./scripts/storage-hygiene.sh --dry-run    # preview
./scripts/storage-hygiene.sh              # retire
```

Target is **60 GiB free**. Exit 0 = at or above target, exit 3 = ran clean but still under.
`--aggressive` additionally retires worktrees touched in the last 24h (still only if pushed).
Hermes cron `daily-storage-hygiene` owns the 04:30 run via `storage-hygiene-daily.sh`.

## What gets retired

| Class | Rule |
|---|---|
| Local TM snapshots | keep newest 2, thin the rest, every run |
| Git worktrees | every registered worktree, once idle (Jorge ruling: not on GitHub = not needed) |
| Local databases | `.convex/local`, `.t3/userdata/state.sqlite`, `.codex/*.sqlite` when idle |
| Agent churn | `.codex/sessions`, t3/hermes logs, `session-scratchpad` older than 3 days |
| Caches | `Library/Caches/{Google,Codex,t3code-updater,node-gyp,bun}`, bun install cache |
| Runner state | `actions-runner-*/_work` when no listener is running |

Nothing vetoes a worktree except being in-flight or an unreachable remote. This is safe on commits:
`git worktree remove` deletes the checkout, never the branch, so committed work survives in the main
repo's object store whether or not it was pushed. Only uncommitted working-tree state is discarded,
and the run logs `ahead=N uncommitted=N` for each one so the loss is on the record.

The protection that matters is upstream of this skill: `AGENTS.md` requires work to be committed and
pushed the moment a slice is done. This skill assumes that rule is being followed.

## Why snapshots come first

Time Machine's destination (`T7-Backup`) is retired. macOS kept `AutoBackup` on, so it made an
hourly local snapshot that could never flush to a destination and never thinned — 23 of them
holding ~70 GiB on 2026-08-01. Snapshots pin every byte you delete, which is why the previous
version of this skill deleted 2.7 GiB in a run and measured a **negative** `df` delta.

Thinning needs no privileges — `tmutil deletelocalsnapshots` runs fine as `jorge`, so cron handles it
unattended and no sudoers rule is required. Only `tmutil disable` needs root; the script attempts it
with `sudo -n` and logs `AUTOBACKUP_BLOCKED` if that fails, leaving a one-time `sudo tmutil disable`
for a human. Once AutoBackup is off nothing regenerates, and thinning becomes a formality.
Marker: `~/.hermes/state/storage-hygiene/autobackup-disabled`.

**Consequence, stated plainly:** this machine has no local point-in-time recovery. Git remotes and
cloud sync are the only backup. That is why `AGENTS.md` requires work to be committed and pushed
the moment a slice is done, and why anything that cannot live in git needs an explicit durable home.

## Out of scope

Not retired by automation, and not silently: `Library/Application Support/{Codex,t3code,Cursor}`
(auth and app state — losing these breaks the crew lane), Chrome profiles, `Screen Studio Projects`,
`~/Documents`, `credentials/`, the vault. If these are the only way to reach target, say so and let
Jorge decide; never fold them into a run.

`/Applications/Xcode.app`, `/Library/Developer/CoreSimulator`, and `~/Library/Developer/CoreSimulator`
are protected iOS development foundations: routine cleanup never retires them. Removal requires
Jorge explicitly retiring or replacing local iOS development and proof that the replacement works.
Runtime and device size is measured and reported, not declared reclaimable because it is large.
Historical baseline (2026-08-02): Xcode ~3.5 GiB, system CoreSimulator ~19 GiB, first-boot iPhone 17 Pro
data ~2.0 GiB, and other default device records ~17 MiB each; free space moved 50.2 → 19.9 GiB after
installation/first boot, then to 27.9 GiB after guarded cleanup. Always remeasure current state with
`df` and `du`; these dated figures are not size guarantees.

## Anti-patterns

- BAD: delete `*-wt-*` by name. GOOD: enumerate `git worktree list`, prove pushed, remove via git.
- BAD: report 3 GiB selected as 3 GiB recovered. GOOD: report the `df` before/after delta.
- BAD: `rm` a live sqlite file. GOOD: guard on the owning process, then retire when idle.
- BAD: rebuild a classification state machine here. GOOD: if a class is wrong, edit the table above.

## Output

```text
FREE: <gib> (target 60)   FREED: <gib> this run
RETIRED: <counts by class>
PROTECTED: <paths and the reason git or a live process gave>
BLOCKED: <snapshot/sudo gaps, or none>
```

Complete when the `df` delta is measured and reported, every protection has a named reason, and
anything still blocking the target is either fixed or handed to Jorge as a decision.
