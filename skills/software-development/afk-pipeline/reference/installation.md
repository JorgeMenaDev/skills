# Installing the pipeline in a new repo

Since v2.0.0 the pipeline is **generated, never copy-pasted**. The skill ships the
repo-agnostic core as `templates/` and a generator (`scripts/generate.mjs`); each
consumer owns only `.sandcastle/config/` (a `pipeline.json` of scalars + four
repo-owned markdown fragments) and its README. The rule-of-three debt that forced
this (three drifting copies: andesphere, superaseo, andyChat) is `JorgeMenaDev/skills#3`.

## Generated vs owned

- **Generated** (headers say so; never hand-edit): `.github/workflows/agent-implement.yml`
  and everything in `.sandcastle/` except `config/` and `README.md`. Fix-at-source rule:
  a bug in a generated file is fixed in the skill's `templates/`, version-bumped, and
  re-generated into every consumer — never patched in one copy.
- **Owned by the repo**: `.sandcastle/config/pipeline.json` (image name, bun pin, base
  branch, PASSTHROUGH_KEYS + verify secrets, implement gate, evidence dir, entry URL,
  locale note, deploy note), the fragments `orientation.md` / `verify-boot.md` /
  `verify-notes.md` / `write-pr-output.md`, and `.sandcastle/README.md`.
  Fragments are literal — no generator tokens (runtime tokens like `{{ISSUE_NUMBER}}` are fine).

## Fresh install

1. Seed the config: copy `templates/seed/config/` to `<repo>/.sandcastle/config/` and
   `templates/seed/README.md` to `<repo>/.sandcastle/README.md`; replace every REPLACE.
   The verify-boot fragment is the hard one: exact build/serve commands, readiness poll,
   QA-actor auth flow (never a personal account), scope limits.
2. Generate: `node <skills-checkout>/skills/software-development/afk-pipeline/scripts/generate.mjs --repo <repo>`.
   It refuses on missing config fields or unresolved tokens. `--check` mode diffs
   without writing (drift audit).
3. **Runtime dependency**: add `@ai-hero/sandcastle` to the consumer's ROOT
   `package.json` devDependencies (`bun add -d '@ai-hero/sandcastle@^0.12.0'`) and
   commit the lockfile. Every generated phase script imports it, and the workflow's
   `bun install --frozen-lockfile` only installs what the repo declares — a missing
   dep fails the first run instantly with `Cannot find module '@ai-hero/sandcastle'`
   (cost andyChat run 28712325830, 2026-07-04). If the dep is ALREADY declared,
   check its version: a stale pin from a previous orchestrator passes install but
   fails the implement phase at runtime (`handle.copyIn is not a function` — cost
   acredix run 28720470196, 2026-07-04, pinned 0.5.8). `generate.mjs` now refuses
   pins below 0.12.
4. **Convex repos** — set three config fields so the always-on Convex integrity
   gate arms (empty `convexDir` = gate self-skips; only correct for repos with
   no Convex package):
   - `convexDir`: the Convex package dir relative to the repo root
     (`packages/backend`, or `.` when `convex/` sits at the root).
   - `convexGateEnv`: env vars the repo's `convex/auth.config.ts` reads, with
     dummy values — the gate's anonymous local deployment starts empty and the
     first push fails without them (e.g. `{"CLERK_JWT_ISSUER_DOMAIN":
     "https://ci.<product>.test"}`; andyChat/andy-cotiza read
     `CLERK_FRONTEND_API_URL` instead — check the file, don't assume).
   - `convexGatePrep`: optional repo-specific setup command run in `convexDir`
     first (e.g. acredix's `bun run prepare:workspace-links`).
   The gate (`.sandcastle/implement/convex-gate.ts`) runs real codegen +
   schema/type validation against a keyless anonymous local backend
   (`CONVEX_AGENT_MODE=anonymous` — no login/deploy key; needs network to fetch
   the local backend binary once per runner) and fails the run when committed
   `_generated` files diverge — hand-applied codegen (acredix PR #72,
   2026-07-05) cannot reach the merge. Companion policy (enforced outside this
   pipeline): the repo must release its Convex backend automatically on merge —
   either the Vercel-coupled build (`npx convex deploy --cmd '<build>'`) or a
   main-push deploy workflow paths-filtered to the backend package. Verify one
   exists; if not, add it as part of the install.
5. **Labels** — `agent:implement` (cloud), `agent:implement-local` (self-hosted) plus
   state labels `agent:in-progress`, `agent:blocked`.
6. **Secrets** — `CLAUDE_CODE_OAUTH_TOKEN`; `AGENT_PAT` (orgs commonly disallow
   Actions-created PRs, and pushes touching `.github/workflows/` need it) — mint the
   PAT with **no expiration** (or the max GitHub offers); a short-lived PAT silently
   kills the pipeline when it expires;
   `PLAN_RECAP_TOKEN` + `PLAN_RECAP_APP_URL` if recap is wired; every key in the
   config's `verifySecrets`. A verify secret must appear in BOTH the config's
   `passthroughKeys` and repo secrets — the generator keeps workflow env and
   runtime.ts in sync from the same field.
7. **Local lane (optional)** — register a self-hosted runner; the Docker image
   (`docker build -t <imageName> .sandcastle/`) bakes in the harness CLI, `gh`, and
   browser tooling. A persistent runner on real hardware must not run agents unsandboxed.
8. **Second-model review (optional but recommended)** — vendor the `autoreview`
   skill in the consumer: `npx skills add openclaw/agent-skills` (pick
   `autoreview`). The review step self-skips with an issue note when the skill
   or a review engine (`codex`, else `claude`) is missing on the runner host —
   advisory by construction, it can never fail a run. For the local lane,
   install/auth the codex CLI on the runner host once for the best engine.
9. Commit everything (config + generated files). Pipeline changes can't self-prove —
   the workflow executes from the default branch, so the first validating run is the
   first run after merge.

## Upgrading consumers after a template change

Bump `version:` in SKILL.md, then for every registered repo:
`node .../generate.mjs --repo <clone>` → review the diff (should be only the intended
core change + header version) → commit. `generate.mjs --check` in any consumer tells
you whether it's current; `templateVersion` in its pipeline.json records what stamped it.

## Phase contracts (unchanged by generation)

Implement builds (the config's gate is its whole check), verify audits in a real
browser and owns all evidence, write-pr narrates, recap illustrates — blurring them
re-creates duplicate work. Recap runs as a separate best-effort `ubuntu-latest` job
dispatched when the draft PR opens; a single-slot self-hosted runner must free the
moment the draft PR exists. Performance defaults are baked into the templates: pinned
CLIs, cached browsers, short-circuit gates before installs, per-subphase timing lines.

## Last step — always

Add or update the repo's row in the consumer's `.agents/afk-pipeline/REGISTRY.md`. A row
is a **routing cache, not truth**: repo, trigger labels, default lane, local clone path,
and a pointer to the repo's `.sandcastle/README.md` for mechanics. Keep rows thin;
mechanics stay in the repo. When in doubt whether a registry row is still true, verify
the workflow file exists (`gh api repos/<owner>/<repo>/contents/.github/workflows/agent-implement.yml`)
rather than trusting the row. This step also closes every lane/secret/label change — a
registry edit is part of the change, not follow-up.
