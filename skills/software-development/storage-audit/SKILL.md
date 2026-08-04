---
name: storage-audit
description: Reclaim disk on Jorge's Mac mini by retiring regenerable data — snapshots, worktrees, local databases, agent churn, caches. Use for low space, recurring cleanup, or storage-automation diagnosis.
version: 3.7.0
mutating: true
writes_to: ["local Time Machine snapshots", "clean backed registered git worktrees", "idle .next and .turbo build caches", "stale per-user temp/cache artifacts", "regenerable caches and local databases", "idle Xcode and simulator artifacts", "package-manager and tool caches", "Chrome OptGuideOnDeviceModel component cache", "superseded self-updater tool versions", "GitHub runner _work, orphaned version trees and stale _diag", "idle BTCA sandbox clones", "~/.hermes/state/storage-hygiene/"]
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

Target is **40 GiB free** — the number this machine can hold. Exit 0 = at or above it (`ok`, or
`ok-peak` at 60+), exit 3 = ran clean but still under. **60 GiB is the pre-flight gate** before a
large install, reached deliberately with `--aggressive`, not the daily bar. Override with
`STORAGE_HYGIENE_TARGET_GIB` / `STORAGE_HYGIENE_PEAK_GIB`.
`--aggressive` additionally retires worktrees touched in the last 24h; clean, remote-backup, and
no-process gates still apply.
Hermes cron `storage-hygiene-every-3-hours` runs at `30 */3 * * *` via
`storage-hygiene-scheduled.sh`; healthy runs stay silent, while below-target runs reach Telegram.

## What gets retired

| Class | Rule |
|---|---|
| Local TM snapshots | keep newest 2, thin the rest, every run |
| Git worktrees | registered linked worktrees only when clean, backed by their origin branch or live `origin/main`, process-free, and idle; `--aggressive` drops only the age gate |
| Next build output | `.next` inside registered worktrees when the checkout is clean/backed, no process references it, and output is idle for 3h; retire only `.next`, never the worktree |
| Turbo build cache | repository `.turbo` entries idle for 3h when no Turbo process is running |
| Per-user temp/cache | named Codex/sandbox artifacts in `$TMPDIR`, Chrome's code-sign clone, and clang cache after 3h with open-file and owning-process guards |
| Next build cache | `.next/cache` and `.next/dev` inside any registered checkout, idle 3h and process-free — retired **even when the whole `.next` is protected** as uncommitted or unbacked. Build cache is orthogonal to git cleanliness. Measured 2026-08-04: a 4.3 GiB `.next` was 2.0 cache + 1.7 dev and only 193 MiB of real output |
| Local databases | `.convex/local`, `.codex/*.sqlite` when idle **and not held open by `lsof`** |
| Agent churn | `.codex/sessions`, t3/hermes logs, `session-scratchpad` older than 3 days |
| Caches | `Library/Caches/{Google,Codex,t3code-updater,node-gyp,bun,CocoaPods,ms-playwright,dotslash}`, bun install cache, `~/.cache/{uv,codex-runtimes,convex,huggingface}`, `~/.npm/{_npx,_cacache}`, `Library/Caches/Homebrew` |
| Chrome component cache | `Application Support/Google/Chrome/OptGuideOnDeviceModel` (~4 GiB on-device AI model, redownloaded on demand) — only with Chrome closed, and never any sibling profile directory |
| Scratch clones | agent-made throwaway checkouts of other people's repos — `~/.btca/agent/sandbox` (the `btca-local` skill), `~/dev/.temp`, `~/dev/code2`. **Pure scratch, no age gate** (Jorge ruling 2026-08-04): retired once idle 3h, non-git dirs included, because the cost of being wrong is one re-clone. Two vetoes only, for what a re-clone cannot rebuild: a live process holding the path, and locally-authored git state (dirty, unpushed on any branch, or stashed) which logs `JORGE-ACTION`. **That veto is load-bearing** — two investigation lanes reported `~/dev/code2/acredix-app` as a safe duplicate clone when it held 29 dirty files, an unpushed commit and a stash |
| Agent session churn | `~/.grok/sessions` and `~/.local/share/opencode/log` older than 3 days, alongside the Codex sessions |
| Convex backups | `~/.convex/convex-backend-state-backups` when idle. The live `convex-backend-state` beside it is **not** a class |
| Stale tool versions | superseded version directories under `~/.agent-browser/browsers`, `~/.local/share/cursor-agent/versions` and `~/.local/share/claude/versions` — keep newest only. Never `ClaudeCode.app` or the auth/state files beside `versions/` |
| Runner state | `actions-runner-*/_work` idle 3h when no **`Runner.Worker`** is live; plus `bin.*`/`externals.*` trees the current symlink no longer points at, and `_diag` files older than 7d |
| Xcode build data | `DerivedData` and `iOS DeviceSupport` once idle and Xcode is not running |
| Simulator devices | devices `xcrun simctl` reports unavailable, once idle and no simulator is live |
| Simulator runtimes | iOS runtime images superseded by the newest runtime exposed by the selected Xcode, once idle and no simulator is live |

A worktree with modified or untracked files is protected. Its HEAD must exactly match its live
origin branch or be an ancestor of live `origin/main`; otherwise it is protected as unbacked. Any
process referencing the path also protects it. These hard vetoes apply under `--aggressive`, and
worktree decisions keep logging `ahead=N uncommitted=N`.

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

**Consequence, stated plainly:** hourly snapshots exist, but there is no Time Machine destination,
so they are not dependable recovery and actively pin retired bytes. Git remotes and cloud sync are
the durable backup. That is why `AGENTS.md` requires work to be committed and pushed immediately.

## Out of scope

Not retired by automation, and not silently: `Library/Application Support/{Codex,t3code,Cursor}`
(auth and app state — losing these breaks the crew lane), Chrome profiles, `Screen Studio Projects`,
`~/Documents`, `credentials/`, the vault. If these are the only way to reach target, say so and let
Jorge decide; never fold them into a run.

Two classes are **reported, never retired**, because the right outcome is a human decision:
`~/.t3/userdata/state.sqlite` (the firstmate's live state DB — crew threads route through it;
deleting it amputates crew history) and `/Library/Developer/CoreSimulator/Caches/dyld` (root-owned,
so an unattended run cannot remove it — and a sudoers rule for `rm -rf` under `/Library` is a far
worse trade than the 3 GiB). Both log a `JORGE-ACTION` line instead of failing every run.

The dyld suggestion is gated on **14 days idle**: the cache rebuilds on the next simulator boot, so
proposing it during active iOS work is churn that returns within one launch. A recurring action line
for bytes you are about to regenerate is noise, and noise is how a real alert gets ignored.

The currently selected Xcode (`xcode-select -p`), its newest available iOS runtime, and that runtime's
`/Library/Developer/CoreSimulator/Volumes` mount are the protected iOS development floor. Routine
cleanup never retires them; the guard follows the selected toolchain rather than a version string.
Measured 2026-08-04 (three independent lanes): Xcode 3.5 GiB, runtime backing asset 7.9 GiB,
simulator devices 4.0 GiB — a floor of **~12 GiB on Data**, not the ~22 GiB implied by counting the
mounted volume as well (see the anti-pattern above; the earlier "63 GiB ceiling" estimate reached
roughly the right answer by way of that double-count).

**Touch 60, hold 40 — ratified by Jorge 2026-08-04.** A full APFS reconciliation closed to 0 KiB and
confirmed 60 GiB is reachable; it was reached the same day (17.6 → 59.7 GiB). But measured churn is
**~27 GiB/day gross** (worktree builds, CI checkouts, agent state, Xcode) against a cron reclaiming
1–7 GiB per run, so 60 is a post-run peak, never a resting state. `TARGET_GIB` is therefore **40** —
what a healthy run reports OK against — and a run reaching 60+ records `ok-peak`. A target that fails
every healthy day trains everyone to ignore the alarm, which is the one state worse than a full disk. Purgeable space is not the obstacle:
the Foundation important-usage uplift measured 6.4 GiB, so releasing all of it still lands ~14 short.

## What is not the answer

Measured and refuted on 2026-08-04 — do not re-investigate these without new evidence:

- **Cold files**: ~3–4 GiB total above 100 MiB older than 90 days, half of it personal recordings.
  (`atime` is unreliable on this volume — it moves on any read, including `du`; use `mtime`.)
- **Duplicates**: ~1.2 GiB. Toolchains are clean — one Xcode, one runtime, one rustup, no nvm/volta.
- **Unused applications**: ~2 GiB; only OBS is genuinely dead.
- **Source code volume**: ~500k LOC across the monorepos produces megabytes. Build-cache retention
  and per-worktree dependency duplication produce the gigabytes. Deleting code is not the lever;
  not letting a worktree outlive its PR (~7 GiB each) is.
- **Snapshots**: cured since 2026-08-01 and verified zero each run. Verify, don't fear.

The real recurring levers, in order: fix any guard that cannot fail open; cap `.next` cache; keep one
installed worktree per monorepo, not several; and accept that a 228 GiB volume hosting five monorepos,
an iOS toolchain, a resident CI runner and six agent stacks is undersized — external storage for
`_work`, worktrees and caches retires this whole problem class.

## Anti-patterns

- BAD: delete `*-wt-*` by name. GOOD: enumerate `git worktree list`, prove pushed, remove via git.
- BAD: report 3 GiB selected as 3 GiB recovered. GOOD: report the `df` before/after delta.
- BAD: `rm` a live sqlite file. GOOD: `lsof` the specific file, then retire when idle.
- BAD: rebuild a classification state machine here. GOOD: if a class is wrong, edit the table above.
- BAD: gate a class on a process **name**. GOOD: gate on a live *unit of work* or on `lsof` of the
  path. This is the defect that cost the most: `_work` was gated on `Runner.Listener`, which runs
  permanently as a launchd service (`--startuptype service`), so the class never fired once while
  regenerating ~3 GiB/day. `codex`, `convex` and `t3code` are the same trap — they run as permanent
  app-servers and watchdogs, so `pgrep -f codex` is always true. A guard that can never fail open is
  indistinguishable from a class that does not exist. **When adding a class, prove its guard can be
  false on this machine before trusting it.**
- BAD: escalate to `rm -rf` when `git worktree remove --force` fails. GOOD: log and skip. That
  command fails precisely when git knows something is wrong; escalating defeats the safety that
  just fired.
- BAD: decide ok/below-target from one `df` sample. GOOD: median of three. Available swings several
  GiB within minutes here (observed 40.9→33.8 in 3 minutes with no run, and 19.9→22.1 with no action).
- BAD: sum the mounted simulator runtime **and** its backing asset. GOOD: count the asset only —
  `diskutil info disk5` reports `Virtual: Yes`; the 16.4 GiB mount is a view of a 7.9 GiB
  `AssetsV2` disk image. Double-counting it inflates the apparent iOS floor by ~8 GiB.

## Output

```text
FREE: <gib> (target 60)   FREED: <gib> this run
RETIRED: <counts by class>
PROTECTED: <paths and the reason git or a live process gave>
BLOCKED: <snapshot/sudo gaps, or none>
```

Complete when the `df` delta is measured and reported, every protection has a named reason, and
anything still blocking the target is either fixed or handed to Jorge as a decision.
