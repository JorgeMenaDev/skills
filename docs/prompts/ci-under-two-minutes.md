# CI under two minutes

Use this prompt to make a repo's CI fast without letting it lie: a PR gets its result in under 2 minutes at the median, and nothing broken reaches main. It combines three posts by Pontus Abrahamsson ([@pontusab](https://x.com/pontusab), Midday): the five changes that got Midday's frontend CI under 2 minutes, his full CI prompt, and his Lefthook pre-commit setup.

Replace the placeholders before sending:

- `<REPO>`: path to the repo.
- `<RUNNERS>`: where CI jobs may run and how big, for example "GitHub-hosted 2-core only" or "Blacksmith, 8 cores allowed".
- `<REACT_SRC>`: glob of the React source for React Doctor, for example `apps/web/src/**/*.{ts,tsx}`. Drop the React Doctor job if the repo has no React.

## Prompt

Make the CI of `<REPO>` as fast as possible without letting it lie. Target: a PR gets its result in under 2 minutes at the median and under 3 at p95. Runners: `<RUNNERS>`.

Two rules outrank speed:

- **The full suite runs before anything reaches main.** Use a merge queue. If the plan has none, make the full suite a required check on the PR's final gate and require the branch to be up to date with main. Diff selection only narrows early PR feedback; it never decides what merges.
- **Never get faster by hiding failures.** No retries, wider timeouts or skipped tests. A check that needs a retry has a bug: find it.

**1. Audit first.** Pull the last 150 runs of the PR workflow and split every job into waiting (created to started), setup (checkout, install, cache restore) and running, at p50 and p95. Put the table in the PR. Fix the biggest bucket first. It is rarely the tests, so don't spend time deleting them.

**2. Then hit these budgets:**

- **Waiting, under 10 seconds.** A 5-second job that queues 10 minutes is a 10-minute job. Measure queueing on the runners you have; if runner concurrency is the wait, say how many runners or which provider it needs. Cancel a branch's in-progress run when a new commit lands (`concurrency` keyed by PR, `cancel-in-progress: true`; keep `false` on main).
- **Setup, under 30 seconds.** Cache `node_modules` itself, not only the package cache (key: lockfile hash, OS, runtime version). Seed the caches from main so PR hit rate is above 95%, and report the hit rate. Use a blobless clone (`filter: blob:none`) where the job needs history, not a shallow one, and no history where it doesn't.
- **Lint, under 5 seconds: oxlint.** Turn on every category (correctness, suspicious, pedantic, perf, style, restriction; nursery only where stable) and the plugins that match the code. Turn a rule off only with a one-line reason in the config. Fix what it finds, autofix first. Delete ESLint; custom rules you own move to oxlint JS plugins.
- **Typecheck, under 5 seconds: `bun check`** in place of `tsc --noEmit`. Fall back to TypeScript 7 if it can't check this repo. Before swapping, run both on the same tree and compare the errors.
- **Format: the fastest formatter that matches, `bun fmt` or oxfmt.** Delete Prettier. Run old and new on every file first and list what changes.
- **Install and scripts: bun.** Delete npm, yarn and pnpm.
- **Tests, under 60 seconds per shard.** Stop reloading the app per test file where the runner allows it (Vitest `isolate: false` or the bun equivalent), reset state after every file, and write the cleanup rules into AGENTS.md. Run in random order to flush out leaks, with the seed in the log. Fill shards by each file's recorded duration from main (greedy, longest first; a file with no record gets the median), not by file count or size. Each shard gets its own database where tests use one. Buy cores before shards, and match test concurrency to the runner's cores.
- **Shape.** Lint, typecheck, build and tests run in parallel as separate jobs, with no `needs:` chain. Then move migration and schema checks and other apps' tests out of the slowest job into their own jobs.
- **Selection.** On PRs, run only the tests the diff can reach (`turbo --affected`, `nx affected`, or `bun test --changed` if it is finer-grained on this repo). Run everything when a root config, lockfile, workflow, test helper or anything the graph can't follow changes, and always on main. Then hide a real change from selection on purpose (a change a test catches, in a file selection would skip) and confirm CI goes red, not green. Link that run.
- **Keep it fast.** Fail any job that exceeds its budget, with a message that names the budget. On a shared machine where timing is noisy, warn instead of failing, and say so in one place.

**3. Stop failures before CI.** The fastest CI run is the one that never fails. Commit a [Lefthook](https://github.com/evilmartians/lefthook) config, installed by `bun install`, that runs on staged files only and finishes in under 9 seconds. A hook, not a line in AGENTS.md, because agents skip steps.

```yaml
# lefthook.yml
pre-commit:
  piped: true
  jobs:
    - name: bun fmt
      glob: "*.{ts,tsx,js,jsx,mjs,cjs,json,css,md,yml,yaml}"
      run: bun fmt --no-script {staged_files}
      stage_fixed: true
    - name: oxlint
      glob: "*.{ts,tsx,js,jsx,mjs,cjs}"
      run: bunx oxlint --deny-warnings {staged_files}
    - name: react doctor
      glob: "<REACT_SRC>"
      run: bunx react-doctor@latest <app dir> --staged --scope changed --blocking error --no-score --yes
pre-push:
  jobs:
    - name: typecheck
      run: bun check
```

Swap `bun fmt` for oxfmt if that is the formatter you picked, and pin the React Doctor version.

**Tool rule.** The tools above are defaults; keeping an old one needs a measured reason. Take anything newer that is faster on this repo. Before each switch, run old and new side by side and list anything the new one misses.

**Report.** One small PR per change, with before and after numbers from real runs. Do everything you can without me first. Bring anything that needs an account, a secret, a bigger runner or a bill as one list with the expected monthly cost; don't buy it. End with total PR CI time (p50 and p95) and cost, before and after.
