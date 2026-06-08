---
name: shiploop
description: Execute a plan, fix, or feature through durable GitHub issue phases, branch gates, review evidence, and an optional worker adapter.
version: 1.0.0
license: MIT
---

# Shiploop

Shiploop turns a plan into a durable shipping run. Use it when work should survive context resets, run through explicit phase gates, and hand a final PR to a human with evidence.

Keep this skill as the router. Load only the reference needed for the current step.

## Use When

- The user wants an agent to execute a plan, fix, feature, or GitHub issue.
- The work needs one parent issue, one or more child phase issues, and auditable progress.
- Each phase should ship through its own branch and PR before the final PR.
- A worker adapter may create tasks, dispatch agents, or recover runs.
- The worker must use the real target repo checkout on this computer.

Do not use Shiploop for one-off work that fits in the current session, pure planning with no execution, git worktrees, scratch checkouts, or merges/deploys/production mutations without explicit approval.

## Inputs

Shiploop accepts three intake shapes:

- Co-created plan: shape the plan with the user, then phase it.
- Supplied plan: refactor pasted text or markdown into phases.
- GitHub issue: use the issue as, or as the seed for, the parent ledger.

Normalize every run into the fewest sensible vertical phases. Every run has one parent GitHub issue and at least one child phase issue.

## Core Flow

1. Inspect the target repo, instructions, and existing issue/branch state.
2. Run the read-only preflight in `references/run-model.md`: branch is `main`, `main` matches the live remote, and `git status --short` is clean. If not, reject early with the exact blocker before mutating anything.
3. Draft the run plan: parent ledger, phases, gates, train branch, adapter, and safety boundaries.
4. Ask for kickoff approval before creating issues, branches, PRs, or adapter tasks unless execution was explicitly pre-approved.
5. Create the parent issue, all child phase issues, and train branch `shiploop/<run-slug>`.
6. Run phases sequentially. Each phase uses `shiploop/<run-slug>-phase-<n>`, opens a PR into the train branch, records evidence, and merges after green checks.
7. Open the final PR from the train branch to `main` as draft, run `autoreview`, fix findings, mark ready, label the parent issue `shiploop-human-review`, then check out clean `main` again.

## Adapter Selection

Default to the adapter for the runtime that is executing Shiploop. If Shiploop is invoked from Hermes, Hermes CLI, or a Hermes/Kanban worker, use `Adapter: hermes-kanban`, `Execution: Hermes Kanban`, and load `references/hermes-kanban-adapter.md`.

Use a direct/local adapter only when the user explicitly asks the current agent to execute without a worker adapter. Do not invent adapter names from local profile names.

## Public Metadata

Use the canonical parent and phase blocks in `references/github-ledger.md`. This is the common shape every issue must expose:

```md
## Shiploop
Run: <run-slug>
Phase: <number or parent>
Parent: #<issue or none>
Next: #<issue or none>
Adapter: <adapter-name>
Task: <task-id or blank>
Worker: <agent-or-worker>
Train branch: shiploop/<run-slug>
Phase branch: shiploop/<run-slug>-phase-<n>
Target branch: main
Review gate: autoreview
Execution: <worker-runtime>
Status: planned | parked | ready | running | blocked | human-review | done
```

Use default labels `shiploop`, `shiploop-ready`, `shiploop-blocked`, and `shiploop-human-review`. Labels route work; comments and linked artifacts prove gates.

## Gates

For phase gates, follow the target repo's `AGENTS.md` and local docs first. Default to TypeScript checks, lint, and Convex strict TypeScript checks when Convex exists. Record exact commands and results before merging a phase PR.

For the final gate, `autoreview` is mandatory. If the target repo lacks it, install it automatically with:

```sh
npx skills add https://github.com/steipete/clawdis --skill autoreview
```

Record the install command, resulting files, and whether they are committed to the train branch. Then fix findings and rerun until clean or blocked. Final PR merge into `main` is human-owned.

## References

- Run model and vocabulary: `references/run-model.md`
- GitHub ledger contract: `references/github-ledger.md`
- Branching and PR flow: `references/branching-and-prs.md`
- GitHub command patterns: `references/github-commands.md`
- Phase and final gates: `references/gates.md`
- Status board CLI: `references/status-board-cli.md`
- First worker adapter: `references/hermes-kanban-adapter.md`

## Safety

Hard-stop for protected/default-branch merges, production deploys, production/shared data mutation, external sends, paid provider spend, scraping at scale, secrets, env vars, DNS, domains, or email-provider changes unless explicitly approved.

Never use git worktrees or scratch copies for Shiploop execution. The target repo's real checkout is the execution surface; if it is not safe to use, block before kickoff.

Treat worker summaries, webhook payloads, and labels as hints. Re-read GitHub, git, checks, review output, and adapter state before changing run status.
