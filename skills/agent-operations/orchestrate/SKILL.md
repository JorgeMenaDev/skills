---
name: orchestrate
description: Orchestrate multi-slice work through dependency-aware waves, isolated executors, review gates, integration, and recovery. Use when a task spans parallel agents, worktrees, AFK runs, shared resources, cross-runtime delegation, or an issue chain that must be driven to verified completion.
version: 1.0.0
license: MIT
mutating: true
writes_to: [session-scratchpad/orchestrate/, worktrees, branches, pull-requests, issue-trackers]
triggers: [orchestrate, orchestration, parallel-agents, issue-chain, autopilot]
---

# Orchestrate

You are the **conductor**: plan, dispatch, inspect, steer, integrate, and verify. Executors perform product work. A literal one-line change may be done directly and named as the one-liner exception.

## Contract

- Every slice has checkable criteria, one lane, one executor, typed edges, and a terminal proof.
- Lane describes operational lifecycle; executor describes the runtime/vendor. Native spawning stays runtime-owned. Non-native agents use installed adapters.
- `run.json` is the sole authority for orchestrated runs; `RUN.md` is generated. Workers write handoffs, never ledger state.
- Default mode confirms routing and each frontier. `autopilot` records those decisions and advances independently, but stops for human-only gates, irreversible external acts, or irreducible ambiguity.
- Read-only preparation may cross a future wave; writes may begin only from the emitted write frontier.
- Orchestration friction compounds into `knownLessons` and, when portable, a canonical skill improvement.

## Select the path

Run:

```bash
node <skill>/scripts/orchestrate-run.mjs preflight --repo <repo>
node <skill>/scripts/orchestrate-run.mjs classify \
  --slices <count> --dependencies <yes|no> --integration-branch <yes|no> \
  --shared-resource <yes|no>
```

- `PATH: one-liner` only for a literal one-line change.
- `PATH: simple` for one contained slice; use a brief and handoff, plus any required global resource probe.
- `PATH: orchestrated` for 2+ slices, dependencies, an integration branch, or a resource shared between slices. Initialize the ledger from `references/run-ledger.md`.

## The loop

1. **Intake.** Read repo instructions and source issues/specs. For issue chains prefer native tracker edges, then `## Blocked by` sections. Extract every slice, criterion, hidden semantic dependency, collision surface, external effect, and human gate. A single task needs a repo, goal, and checkable done criteria. Done when no brief requires invention.
2. **Plan.** Read `references/planning-and-routing.md`. Discover real executor capabilities, classify constraints as required/preferred, assign lanes/executors, type all edges, and compute start waves separately from integration order. Done when every slice and criterion has an owner and proof.
3. **Confirm.** In default mode, present the complete routing table and recommend the picks; one approval covers Wave 1. In autopilot, record the same decisions and reasons in the ledger. Done when authorization is explicit and durable.
4. **Dispatch.** Reconcile first. Acquire resources and commit write-ahead effect intent before each external act. For mutating dev slices read `references/dev-lane.md`; for other lanes follow their installed skill. Done when every dispatch has an observed runtime identity or is `UNKNOWN`/`BLOCKED`.
5. **Supervise and verify.** Inspect real diffs, reports, evidence, and runtime state. Allow one grounding checkpoint; interrupt only for scope, safety, or concrete defects. After handoff, batch accepted findings into one formal same-session correction and have the same reviewer recheck. Done when each slice is accepted or carries an exact blocker.
6. **Integrate and advance.** Follow integration edges, conductor-owned publication, CI/preview gates, refreshed-target verification, and `assert-complete`. Default mode confirms the next frontier; autopilot continues. Done when every slice and parent criterion is terminal with proof.

## Read when needed

| When | Read fully |
|---|---|
| Planning waves, lanes, executors, cross-runtime work | `references/planning-and-routing.md` |
| Creating, updating, resuming, or completing a run | `references/run-ledger.md` |
| Any mutating subagent/worktree/PR slice | `references/dev-lane.md` |
| Shared resources, external effects, UI, or evidence | `references/resources-and-evidence.md` |

## STOP gates

- STOP before dispatch on invalid/unknown state, an uncleared start edge, mismatched bases, or conflicting ownership. **Dispatching from prose or stale state is the failure mode.**
- STOP before ready/acceptance/merge without the lane handoff, self-verification, evidence manifest, conductor review, and required independent review. **Trusting the hand-back is the failure mode.**
- STOP before dependent writes when blocker code is absent from the base. **Wave-jumping is the failure mode.**
- STOP before completion until every slice and parent criterion is terminal and merged state is reverified where applicable. **Premature completion is the failure mode.**

## Output

Report `DONE | DONE_WITH_CONCERNS | BLOCKED`, absolute `run.json` path when used, wave/slice outcomes, merged or accepted identities, verification evidence, unresolved gates, and the next write/preparation frontiers. End with numbered user actions and name the execution lane for each.
