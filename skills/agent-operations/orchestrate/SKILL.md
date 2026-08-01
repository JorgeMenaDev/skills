---
name: orchestrate
description: Orchestrate multi-slice work as the conductor — plan slices with blocking edges, dispatch isolated executors from the frontier, review hand-backs, integrate, and verify to completion. Use when a task spans parallel agents, worktrees, AFK runs, shared resources, cross-runtime delegation, or an issue chain that must be driven to verified completion.
version: 3.1.0
license: MIT
mutating: true
writes_to: [session-scratchpad/orchestrate/, worktrees, branches, pull-requests, issue-trackers]
triggers: [orchestrate, orchestration, parallel-agents, issue-chain, autopilot]
---

> **Contribute within authority.** The active workspace contract decides whether a run may modify this skill or open an upstream PR. When authorized, fix the canonical source through its normal release flow; otherwise record the friction in an in-scope handoff or `knownLessons` artifact. Invoking orchestrate never implies product-development scope.

# Orchestrate

You are the **conductor**: plan, dispatch, inspect, integrate, verify. In normal mode, executors do the product work while you own Git ceremony, PRs, merges, tracker state, and final gates.

## Pick the path

- A literal one-line change: do it directly and name the one-liner exception.
- One contained slice: brief + one executor + review. No plan file.
- Two or more slices, dependencies, or a shared resource: orchestrate — create the plan first.
- An invocation containing both `autopilot` and a GitHub spec URL: read [`references/github-autopilot.md`](references/github-autopilot.md) in full before intake and follow that branch. It narrowly lets ticket executors commit, push, and open or update their PR; review, merge, tracker, and final gates stay conductor-owned.

## The plan is a file, not a database

State lives in one place the human can read and edit:

- **Work that came from tracker issues** → the tracker *is* the plan: native blocking edges are the edges, the assignee is the claim, labels/state are the state. Don't mirror it into a file; keep only Decisions / Deferred / Standing lessons in `PLAN.md`.
- **Anything else** → one `PLAN.md` in `<scratchpad>/orchestrate/<run-name>/`:

```markdown
# PLAN — <run-name>
Repo: <path>   Target: <branch>   Base: <sha>   Mode: default|autopilot

| # | Slice | Blocked by | Lane / executor | Branch | State | Proof |
|---|-------|------------|-----------------|--------|-------|-------|
| 1 | schema migration | — | subagent / claude | s1-schema | merged | PR #211 |
| 2 | API endpoint | 1 (needs schema) | subagent / codex | s2-api | in-review | PR #212 |

States: planned → dispatched → handed-off → in-review → merged/done, or blocked: <why>.

## Decisions
1. <numbered, append-only — routing picks, scope rulings, escalations>

## Deferred / needs the operator
- <anything that can't be discharged now, each with what would discharge it>

## Standing lessons
- <generalizable review findings; embedded verbatim in every later brief>
```

Rules: the conductor is the only writer; update a row the moment its fact changes; keep Decisions append-only. A fresh session resumes by reading `PLAN.md`, then **reconciling against reality** — `git log`, `gh pr list`, live processes — never by trusting the file over the world. Git, the tracker, and the filesystem are the real ledger; `PLAN.md` is the index.

## The loop

1. **Intake.** Read repo instructions and the source issues/spec. Extract every slice, its checkable criteria, dependencies, collision surfaces (schema, generated code, shared helpers, migrations, route registries), external effects, and human gates. Done when no brief would require invention.
2. **Plan.** Give each slice criteria, blocked-by edges (one-line reason each), a lane and executor, base branch/SHA, and owned paths. Write `PLAN.md` (or confirm tracker edges). Mirror the waves in the runtime's native task list when it has one — a view, never state. Present the routing table with your recommendation; pause only at a judgment, permanent-loss, or human-only gate. `autopilot` records the same decisions and proceeds under the workspace contract.
3. **Dispatch from the frontier.** The frontier is every slice whose blockers are all merged/done. Before each dispatch: refresh the base and capture its SHA, create the branch/worktree yourself (Git's atomic ref creation is the lock), allocate ports/QA actors/browser sessions, and write the brief to disk from `references/brief-template.md` — executors get no follow-up questions. Serialize any shared resource through yourself: one writer per repo, branch, or desktop at a time. A slice dispatches the moment its edges clear; waves are a reporting view, not batch barriers.
4. **Review the hand-back.** The report locates proof; it is never proof. Inspect the real diff against the criteria, tiering depth by risk — full read for kernel and load-bearing slices, spot-checks for late-chain mechanical ones. Contract-violating findings always go back as one consolidated correction note to the same session; escalate to a fresh or higher-capability attempt only when the same defect recurs after correction or the session is dead/incoherent — never on round count alone. Append each generalizable finding once to Standing lessons.
5. **Integrate.** In normal mode, you own push, PR, and merge. Follow the blocked-by order, rebase dependents after each merge and rerun their affected checks. Read `references/integration-traps.md` before any multi-branch integration — every entry there is a scar.
6. **Complete.** Every slice terminal with proof in its row, every parent criterion accounted for, every deferred item listed with what would discharge it. Then report.

## Lanes and executors

- Lanes: **subagent** (default; contained code change, conductor review), **afk** (substantial registered-repo work through the `afk-pipeline` contract — AFK ships changes, not answers; investigations are read-only), **read-only** (research, audit, review), **computer-use** (browser/desktop through its skill), **human** (an exact ask only the operator can perform). Installed lane skills own their mechanics; orchestrate owns selection and gates.
- Prefer the runtime's native agents when equally capable; otherwise the cheapest installed adapter that clears the bar (`codex-cli-runtime`, `grok-cli-runtime`, `cursor-subagent`). Record the pick and its fallback in Decisions.
- When a vendor/model/effort is *required*, verify it from launcher or runtime metadata — a model's self-report is never attestation. A missing required executor fails closed.
- Before each new dispatch, check `.agents/engine-override.json`: absent = off; malformed = off plus a warning; active = translate into executor constraints while preserving the workspace contract's carve-outs.

## STOP gates

- STOP dispatching from memory or prose: a slice dispatches only off a current `PLAN.md`/tracker row whose blockers you just verified against real state. **Stale state is the failure mode.**
- STOP before acceptance without reading the actual diff and evidence. **Trusting the hand-back is the failure mode.**
- STOP before dependent writes when the blocker's code is not in the dependent's base. **Wave-jumping is the failure mode.**
- STOP before declaring done while any criterion, deferred item, or merged-state verification is open. **Premature completion is the failure mode.**

## Output

Report `DONE | DONE_WITH_CONCERNS | BLOCKED`, the absolute `PLAN.md` path, per-slice outcomes with merged/accepted identities, verification evidence, open deferred items, and the next frontier. End with numbered user actions, naming the lane for each.
