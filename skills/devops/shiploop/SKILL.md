---
name: shiploop
description: Turn a plan, fix, or feature into a fully autonomous shipping run - GitHub issue ledger, dependency-gated worker tasks, gated phase PRs, and a reviewed final PR waiting for the human.
version: 2.0.0
license: MIT
---

# Shiploop

Shiploop turns a plan into a durable, unattended shipping run. The human approves once, at kickoff. After that the run executes itself: a dependency-gated task graph drives one worker per phase, each phase ships through its own gated PR into a train branch, and a closeout worker delivers a reviewed final PR labeled for human review. Exceptions never page anyone mid-run - they block and wait.

Keep this skill as the router. Load only the reference needed for the current step.

If you were spawned by a daemon with a task naming a phase or closeout of an existing run, skip everything below: read `references/worker-contract.md` plus your adapter reference and execute. The rest of this file is for the interactive kickoff agent.

## Roles

- Kickoff agent: the interactive agent reading this now. Normalizes the plan, gets one human approval, creates the ledger, branches, and the entire task graph. Then its job is over.
- Dispatch daemon: the adapter runtime (e.g. Hermes gateway) that spawns each task once its parent's completion has promoted it. It is the only thing that schedules work after kickoff.
- Phase worker: a spawned agent that owns one phase end to end, including merging its own phase PR. Contract: `references/worker-contract.md`.
- Closeout worker: the last task in the graph. Opens the final PR, runs the review gate, marks it ready, labels the parent issue for human review.
- Human: approves kickoff, resolves blocked tasks, reviews and merges the final PR. Nothing else.

## Use When

- The user wants a plan, fix, feature, or GitHub issue executed without supervision.
- The work should survive context resets, crashes, and killed workers.
- Each phase should ship through its own branch and PR before the final PR.
- The end state wanted is a reviewed PR for a human, not a live session.

Do not use Shiploop for one-off work that fits the current session, pure planning with no execution, git worktrees, scratch checkouts, or merges/deploys/production mutations without explicit approval.

## Inputs

Shiploop accepts three intake shapes:

- Co-created plan: shape the plan with the user, then phase it.
- Supplied plan: refactor pasted text or markdown into phases.
- GitHub issue: use the issue as, or as the seed for, the parent ledger.

Normalize every run into the fewest sensible vertical phases. Every run has one parent GitHub issue and at least one child phase issue.

## Core Flow

1. Inspect the target repo, instructions, and existing issue/branch state.
2. Run the read-only preflight in `references/run-model.md`: clean checkout on up-to-date `main`, daemon dispatching, worker profile has the required skills, dedicated board exists or can be created.
3. Draft the run plan: parent ledger, phases, gates, train branch, adapter, full task graph including the closeout task, and safety boundaries.
4. Get one kickoff approval. That approval covers everything workers do afterward: branches, phase PRs, self-merges of phase PRs into the train branch, issue/label updates, the final draft PR, and the review gate. Workers never ask mid-run; when in doubt they block and wait.
5. Create the parent issue, all child phase issues, train branch `shiploop/<run-slug>`, and the entire adapter task graph behind a sentinel kickoff task: one task per phase chained with parent dependency links, plus a closeout task linked to the last phase. Set up the exception notification channel. Complete the sentinel as the literal last act - that releases the run. End the interactive session.
6. The daemon runs the phases sequentially. Each phase worker branches from the train head, opens a PR into the train branch, runs the gate, records evidence, merges its own PR, updates the ledger, and completes its task - which releases the next one.
7. The closeout worker opens the final PR from the train branch to `main` as draft, runs `autoreview`, fixes findings, marks it ready, labels the parent issue `shiploop-human-review`, and leaves the checkout clean on `main`.

## Adapter Selection

Default to the adapter for the runtime that is executing Shiploop. If Shiploop is invoked from Hermes, Hermes CLI, or a Hermes/Kanban worker, use `Adapter: hermes-kanban`, `Execution: Hermes Kanban`, and load `references/hermes-kanban-adapter.md`.

Use a direct/local adapter only when the user explicitly asks the current agent to execute without a worker adapter. Do not invent adapter names from local profile names.

## Public Metadata

Every parent and phase issue must expose a `## Shiploop` metadata block. The canonical field lists (parent and phase blocks differ slightly) live in `references/github-ledger.md` - copy from there, not from memory; the status board parses these blocks. Whoever changes run state must update the block's `Status:` (and `PR:` on phase issues), not only post comments.

Use default labels `shiploop`, `shiploop-ready`, `shiploop-blocked`, and `shiploop-human-review`. Labels are informational mirrors of adapter state for humans watching the run; the dependency links in the task graph are what actually sequence work. Every label transition has a single named owner - see `references/github-ledger.md`.

## Gates

For phase gates, follow the target repo's `AGENTS.md` and local docs first. Default to TypeScript checks, lint, and Convex strict TypeScript checks when Convex exists. Resolve gate-command ambiguity at kickoff and record the commands in `.shiploop/config.yaml`; a worker that still hits ambiguity blocks, it never asks. Workers record exact commands and results before merging a phase PR. A red GitHub check that is provably pre-existing and unrelated to the diff may be waived by the phase worker itself for phase PRs only, under the waiver rules in `references/gates.md` - never on the final PR.

For the final gate, `autoreview` is mandatory and run by the closeout worker. If the target repo lacks it, the kickoff plan must include a standing pre-approval to install it; without that pre-approval a closeout worker that finds it missing blocks and waits.

## Exceptions

A blocked task plus a `shiploop-blocked` label is the exception surface. Blocked tasks are sticky: the daemon never auto-resumes them, and dependency links keep all downstream tasks parked, so the run waits indefinitely at no cost. Two failure classes never reach GitHub by themselves - adapter-side auto-blocks (crashes/kills exhausting retries) and a dead dispatch daemon - so kickoff must set up the exception channel (task notifications and/or a watchdog) per the adapter reference, or state the human's polling duty in the run plan. The human resume procedure - resolve the cause, unblock the task, fix the labels - lives in the adapter reference. Nothing in the happy path requires a human between kickoff approval and `shiploop-human-review`.

## References

- Run model, kickoff boundary, and vocabulary: `references/run-model.md`
- Per-phase and closeout worker contracts: `references/worker-contract.md`
- GitHub ledger contract: `references/github-ledger.md`
- Branching and PR flow: `references/branching-and-prs.md`
- GitHub command patterns: `references/github-commands.md`
- Phase and final gates: `references/gates.md`
- Status board CLI: `references/status-board-cli.md`
- Hermes Kanban adapter: `references/hermes-kanban-adapter.md`

## Safety

Hard-stop for protected/default-branch merges, production deploys, production/shared data mutation, external sends, paid provider spend, scraping at scale, secrets, env vars, DNS, domains, or email-provider changes unless explicitly approved. Final PR merge into `main` is always human-owned.

Never use git worktrees or scratch copies for Shiploop execution. The target repo's real checkout is the execution surface; if it is not safe to use, block before kickoff.

Workers re-read real GitHub, git, check, and review state before updating their own issue blocks, labels, or task state - worker summaries, webhook payloads, and labels are hints, not proof. Humans intervening on a blocked task re-verify the same way before unblocking.
