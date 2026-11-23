# Fast CI (under one minute)

Use this prompt to make a repo's CI as fast as possible without letting it lie: a PR gets its result in under 1 minute at the median and under 2 at p95, and nothing broken reaches main. Started from Pontus Abrahamsson's ([@pontusab](https://x.com/pontusab)) Midday CI playbook, then updated for Bun's native toolchain (`bun lint`, `bun fmt`, `bun check`, `bun test`), `hk` hooks, and lessons from running it across two TypeScript/Next.js/Convex monorepos (cutting Andy from 90 s p50 / 307 s p95 and 16 jobs to 43–86 s and 12 jobs, and Acredix from 18 jobs / 22.3 billed min to 12 jobs / ~12 min with `Lint` at 2 s including all 15 React Compiler rules, both at $0/mo).

Replace the placeholders before sending:

- `<REPO>`: path to the repo.
- `<RUNNERS>`: where CI jobs may run, how big, and any routing rule (for example "2-core lanes via the repo's `CI_RUNS_ON` variable; never hardcode paid runner labels" or "Blacksmith, 8 cores allowed").

## Prompt

Make the CI of `<REPO>` as fast as possible without letting it lie. Target: a PR gets its result in under 1 minute at the median and under 2 at p95. Runners: `<RUNNERS>`.

Three rules outrank speed:

- **The full suite runs before anything reaches main.** Use a merge queue. If the plan has none, make the full suite the required gate on ready PRs and require the branch to be up to date with main. Diff selection only narrows early (draft) PR feedback; it never decides what merges.
- **Never hide failures.** No retries, wider timeouts or skipped tests. A check that needs a retry has a bug: find and fix the root cause (watch for monkeypatched zero-delay timers breaking `waitFor` polling loops on faster runners).
- **Never check less.** Lint rules and required checks only stay or grow. Respect repo invariants before editing manifests or workflows (native-fingerprint files like `apps/mobile/package.json`, downstream check names, router-owned `runs-on` variables).

**1. Audit first.** Pull the last 150 runs of the PR workflow and split every job into waiting (created to started), setup (checkout, install, cache restore) and running, at p50 and p95. Put the table in the PR. Fix the biggest bucket first, and profile slow custom scripts too (eager module-load work or serial subprocesses often dominate over the linter or test runner).

**2. Then hit these budgets:**

- **Waiting, under 5 seconds.** Move jobs onto fast warm runners within `<RUNNERS>`. Cancel a branch's in-progress run on a new push (`cancel-in-progress: true` on PRs, `false` on `main`), and give draft PRs their own concurrency group so a late draft event never cancels a ready PR run.
- **Setup, under 15 seconds.** Bake or cache the toolchain, seed caches from `main` so PR hit rate is above 95%, and cache `node_modules` only where measured faster than plain `bun install`. Use blobless clones (`filter: blob:none`), keeping `fetch-depth: 0` on jobs that diff commits or inspect release history.
- **Slowest job, under 35 seconds.** No required job waits on another.
- **Lint, under 1 second: `bun lint`.** It reads `.oxlintrc.json` and runs React Compiler rules natively (`react/*`). Turn on every rule you can; disable a rule only with a one-line reason. Run `bun lint --all` when auditing (it groups repeated errors by default). Before deleting ESLint, `oxlint`, `oxlint-tsgolint` or `eslint-plugin-react-hooks`, run old and new side by side and prove enforcement with a seeded violation (and verify scoped exemptions like vendored folders). If native `react/*` rules uncover many UI violations, fix them cleanly in separate app-scoped PRs with zero blanket disable comments before switching CI and deleting any separate React lint job.
- **Format, under 1 second: `bun fmt --no-script`.** Delete Prettier and `oxfmt`. Run old and new across the whole tree first (`bun fmt --debug-check` to confirm zero semantic change), and put any line-wrap reformat in its own first commit.
- **Typecheck, under 5 seconds: `bun check` on TypeScript 7.** Fall back to `tsc --noEmit` only with a measured reason; compare errors on the same tree before swapping.
- **Tests, under 30 seconds per shard: `bun test`.** Keep `vitest` imports in test files (`bun test` runs them natively) and delete `vitest` and `jest`. Isolate modules/files, reset state after every file, and run with `--randomize` (printing `--seed`) to flush out leaks.
- **Install and scripts: `bun`.** Delete `npm`, `yarn`, `pnpm`, Prettier, ESLint, `oxlint`, `oxlint-tsgolint`, `oxfmt`, Vitest and Jest. If a tool (`bun lint`) only exists in a canary:
  - Pin an exact dated npm canary tarball (`@oven/bun-<platform>@<version>`) and verify `bun --revision` — never a moving `canary` tag.
  - Route `package.json` `"lint"` through a tiny wrapper (`scripts/lint.ts`) that runs `process.execPath lint --no-script` when the revision matches (or an explicit `LINT_BUN` binary is set) and falls back to `bun x bun@<pinned>` on older local Bun, so older Bun never recurses on `"lint": "bun lint --no-script"`.
  - Never infer runner type from `$HOME/.bun/bin/bun` and never extract `actions/cache` into shared `$RUNNER_TOOL_CACHE`. Check `$RUNNER_TOOL_CACHE/bun-pinned/<ver>/bun` first (0 ms on warm persistent self-hosted runners); otherwise restore/save `actions/cache` in job-local `${{ runner.temp }}` (fast cache hit on both GitHub-hosted and ephemeral self-hosted runners like Blacksmith), verify `--revision`, and on `runner.environment == 'self-hosted'` atomically copy-and-rename (`mv -f`) into `$RUNNER_TOOL_CACHE` while leaving the `runner.temp` copy intact for cache save.
  - Test the full CI shard matrix on the canary before pinning it globally. If a canary regresses runtime or test libraries, scope the canary to lint jobs only and keep tests and builds on stable Bun until the next stable release.
- **Shards.** Buy cores before shards, match workers to cores, and give each shard its own throwaway database. Split any test file over 20 seconds. Slice shards deterministically from a committed timings seed (never from a mutable cross-lane cache that can miss on half the shards and skip or duplicate files), and prove with a parsed-YAML check (not regex) that the matrix runs every runnable test file exactly once with no `exclude` or commented-out `--shard` flags.
- **Fewer tests, on evidence.** For two weeks, log every test failure you fix as a caught regression or a change detector. Delete change detectors and ban their patterns in `AGENTS.md` (see [cut-low-signal-tests.md](./cut-low-signal-tests.md)). Never delete tests for authorization, privacy, migrations or concurrency.
- **Shape.** Run lint, typecheck, build and tests in parallel with no `needs:` chain. Fold small checks — and app builds that would otherwise spawn mostly empty runners — into one job that runs every check and lists all failures. When folding N sequential steps into one job, keep each step's own budget unchanged and set the outer job `timeout-minutes` to cover the sum of step budgets plus setup.
- **Selection.** On draft PRs, run only the tests the diff can reach, and list the inputs that rerun everything. Hide a real change from selection on purpose and confirm CI goes red; link that run.
- **Keep it fast.** Fail any job that exceeds its budget with a message naming the budget.

**3. Stop failures before CI (local, under 9 seconds): `hk` hooks.** Pre-commit formats and lints staged files; pre-push runs the same check as CI. A hook, not a line in `AGENTS.md`, because agents skip steps.

Keep `core.hooksPath = .githooks` in `postinstall`/`prepare` (never unset shared `core.hooksPath`, which breaks sibling git worktrees on branches without `hk.pkl`), and have `.githooks/pre-commit` and `.githooks/pre-push` delegate via `exec hk run <hook> "$@"` when `hk` and `hk.pkl` exist, falling back cleanly when either is absent:

```pkl
// hk.pkl
amends "package://github.com/jdx/hk/releases/download/v2.11.1/hk@2.11.1#/Config.pkl"

hooks {
  ["pre-commit"] {
    fix = false
    stash = "git"
    steps {
      ["format"] {
        // Explicit glob so a deletion-only commit skips instead of formatting the whole repo.
        glob = "**/*"
        check = "bun fmt --no-script --check --no-error-on-unmatched-pattern {{files}}"
      }
      ["lint"] {
        glob = List("**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}")
        check = "bun scripts/lint.ts --quiet {{files}}"
      }
    }
  }
  ["pre-push"] {
    steps {
      ["pre-push"] {
        stdin = "{{ hook_stdin }}"
        check = "bun scripts/pre-push.ts"
      }
    }
  }
}
```

**Tool rule.** The tools above are defaults; keeping an old one needs a measured reason. Before each switch, run old and new side by side and list anything the new one misses.

**Report.** One small PR per change, with before and after numbers from real runs. Do everything you can without me first; bring anything that needs an account, a secret, a bigger runner or a bill as one list with expected monthly cost (don't buy it). End with total PR CI time (p50 and p95) and cost, before and after.
