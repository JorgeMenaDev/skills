---
name: orchestrate
description: Orchestrate multi-slice work through dependency-aware waves, isolated executors, review gates, integration, and recovery. Use when a task spans parallel agents, worktrees, AFK runs, shared resources, cross-runtime delegation, or an issue chain that must be driven to verified completion.
version: 2.0.2
license: MIT
mutating: true
writes_to: [session-scratchpad/orchestrate/, worktrees, branches, pull-requests, issue-trackers]
triggers: [orchestrate, orchestration, parallel-agents, issue-chain, autopilot]
---

> **🚧 In progress — contribute back.** This skill is open source and under active, top-priority development, and every run is also product development for the skill itself. Contribute improvements of every kind — bug fixes, new features and modes, sharper references, better runbooks, new scripts, smarter workflows — not just corrections of gaps you hit. When a run reveals anything that would make the skill better, implement it and open a pull request to `JorgeMenaDev/skills` in the same session (or record the idea in the run's handoff log if the session can't). Making this skill better is part of operating it.

# Orchestrate

You are the **conductor**: plan, dispatch, inspect, steer, integrate, and verify. Executors perform product work. A literal one-line change may be done directly and named as the one-liner exception.

## Contract

- Every slice has checkable criteria, one lane, one executor, typed edges, and a terminal proof.
- Lane describes operational lifecycle; executor describes the runtime/vendor. Native spawning stays runtime-owned. Non-native agents use installed adapters.
- `run.json` is the sole authority for orchestrated runs; `RUN.md` is generated. Workers write handoffs, never ledger state.
- On the orchestrated path, mutating dispatch is fail-closed behind ledger authority: an initialized run, fresh clean reconciliation, and an emitted write frontier. `REQUIRES_INIT` means run `start` — or `adopt` for work already in flight — before any external act.
- Default mode confirms routing and each frontier. `autopilot` records those decisions and advances independently, but stops for human-only gates, irreversible external acts, or irreducible ambiguity.
- The write frontier is rolling: a slice may dispatch the moment its start edges clear; waves are the reporting view, not batch barriers. Read-only preparation may cross a future wave; writes may begin only from the emitted write frontier.
- Long runs checkpoint at wave boundaries; a fresh conductor resumes from `RESUME.md` plus `takeover`, never from prose memory.
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
- `PATH: orchestrated` for 2+ slices, dependencies, an integration branch, or a resource shared between slices. `classify` prints `REQUIRES_INIT`: initialize with one command — `start --dir <scratchpad>/orchestrate/<run-id> --spec <spec.json>` — or `adopt` when orchestration is discovered mid-run; both per `references/run-ledger.md`.

## The loop

1. **Intake.** Read repo instructions and source issues/specs. For issue chains prefer native tracker edges, then `## Blocked by` sections. Extract every slice, criterion, hidden semantic dependency, collision surface, external effect, and human gate. A single task needs a repo, goal, and checkable done criteria. Done when no brief requires invention.
2. **Plan.** Read `references/planning-and-routing.md`. Discover real executor capabilities, classify constraints as required/preferred, assign lanes/executors, type all edges, and compute start waves separately from integration order. Budget depletable capacity — engine/review quota, agent slots, disk, QA actors — with a pre-declared failover ladder per resource, and stage the next wave's external inputs one wave ahead. Done when every slice and criterion has an owner and proof.
3. **Confirm.** In default mode, present the complete routing table and recommend the picks; one approval covers Wave 1. In autopilot, record the same decisions and reasons in the ledger. Done when authorization is explicit and durable.
4. **Dispatch.** Reconcile first. Acquire resources and commit write-ahead effect intent before each external act. For mutating dev slices read `references/dev-lane.md`; for other lanes follow their installed skill. Done when every dispatch has an observed runtime identity or is `UNKNOWN`/`BLOCKED`.
5. **Supervise and verify.** Inspect real diffs, reports, evidence, and runtime state, tiering review depth by slice risk. Allow one grounding checkpoint; interrupt only for scope, safety, or concrete defects. After handoff, classify findings as contract-violating or advisory and follow the convergence and correction ladder in `references/dev-lane.md`; escalation triggers are defect recurrence or executor degradation, never round count. Done when each slice is accepted or carries an exact blocker.
6. **Integrate and advance.** Follow integration edges, conductor-owned publication, CI/preview gates, refreshed-target verification, and `assert-complete`. External gates that cannot be discharged now enter the ledger's deferred-gate register and block completion until discharged or separately authorized. Default mode confirms the next frontier; autopilot continues. Done when every slice and parent criterion is terminal with proof.

## Read when needed

| When | Read fully |
|---|---|
| Planning waves, lanes, executors, cross-runtime work | `references/planning-and-routing.md` |
| Creating, updating, resuming, or completing a run | `references/run-ledger.md` |
| Any mutating subagent/worktree/PR slice | `references/dev-lane.md` |
| Writing a brief, executor report, or standing lessons | `references/brief-template.md` |
| Shared resources, external effects, UI, or evidence | `references/resources-and-evidence.md` |

## STOP gates

- STOP before dispatch on `REQUIRES_INIT` without an initialized ledger, invalid/unknown state, an uncleared start edge, mismatched bases, or conflicting ownership. **Dispatching from prose or stale state is the failure mode.**
- STOP before ready/acceptance/merge without the lane handoff, self-verification, evidence manifest, conductor review, and required independent review. **Trusting the hand-back is the failure mode.**
- STOP before dependent writes when blocker code is absent from the base. **Wave-jumping is the failure mode.**
- STOP before completion until every slice and parent criterion is terminal and merged state is reverified where applicable. **Premature completion is the failure mode.**

## Output

Report `DONE | DONE_WITH_CONCERNS | BLOCKED`, absolute `run.json` path when used, wave/slice outcomes, merged or accepted identities, verification evidence, unresolved gates, and the next write/preparation frontiers. End with numbered user actions and name the execution lane for each.
