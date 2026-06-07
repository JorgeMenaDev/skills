---
name: work-tracking
description: "Use when a multi-step plan needs durable tracking across a repo: markdown plans, GitHub Issues, Linear, memory, or a mix. Helps decide where work should live, when to promote tasks to issues, and how future agents should find the current state."
version: 1.0.0
license: MIT
---

# Work Tracking

## Overview

Use this skill when a multi-step plan needs a durable way to be tracked across sessions, repositories, agents, PRs, and implementation work.

The default operating model is:

- **Repo markdown = canonical strategy/spec.**
- **GitHub Issues = execution queue for implementation-ready tasks.**
- **Memory = compact convention/pointer only, never the backlog itself.**
- **Linear = optional product/company planning layer, only when the user explicitly wants that visibility.**

This is intentionally cross-repo. It applies when work starts as a conversation and needs to become durable, discoverable, and executable.

## When to Use

Use this skill when:

- the user asks how to track a plan, audit findings, backlog, roadmap, or initiative;
- an agent or external tool produces several implementation gaps;
- a chat decision needs to become repo-visible work;
- deciding whether to use markdown, GitHub Issues, Linear, memory, or all of them;
- work spans multiple sessions or may be picked up by another agent later;
- a plan needs to be reviewable in git and executable through PRs.

Do not use this for one-off TODOs that fit in the current chat. Do not use memory as a backlog.

## Relationship to Built-In Planning Skills

This skill decides **where work should live and how it should be tracked**. It should deliberately leverage any installed planning skills instead of duplicating them:

- Use the target agent's planning skill when the work needs an implementation-ready plan with exact files, bite-sized tasks, commands, tests, and verification steps.
- Use a no-execution planning mode when the user explicitly wants planning only: inspect context, write a markdown plan, and do not execute implementation.
- Use this `work-tracking` skill after or alongside those skills to decide whether the result should remain in an agent-local plan path, be promoted to `docs/plans/` or `roadmap/`, become GitHub Issues, or get a compact memory pointer.

Default composition:

```text
planning skill = how to write the implementation plan
plan/no-exec mode = planning without implementation
work-tracking = durable tracking policy across repo markdown, GitHub Issues, Linear, and memory
```

If a plan starts in an agent-local path but becomes strategic, architectural, or multi-session canonical work, promote or copy it into the repo's public/internal docs path (`roadmap/` or `docs/plans/`) and leave a pointer rather than treating the agent-local path as the only source of truth.

## Default Tracking Model

### 1. Canonical plan in the relevant repo

Save architectural or multi-phase plans in the repo where the work belongs.

Preferred locations, in order:

```text
roadmap/YYYY-MM-DD-short-topic.md
docs/plans/YYYY-MM-DD-short-topic.md
.agents/plans/YYYY-MM-DD-short-topic.md
```

Choose based on repo conventions:

- use `roadmap/` for product/architecture direction or multi-phase initiatives;
- use `docs/plans/` for implementation plans;
- use `.agents/plans/` or the target agent's local plan path for plans that should stay out of public docs but remain repo-local.

The markdown plan should include:

- goal;
- architecture summary;
- TL;DR backlog;
- phases or milestones;
- concrete tasks;
- exact files to modify when known;
- verification commands;
- readiness gates;
- explicit non-goals.

### 2. Add a discoverability pointer

If the plan is current work, add a short pointer from the repo's roadmap/index file when one exists:

```md
Current focus: <initiative name>.
See roadmap/YYYY-MM-DD-short-topic.md.
```

Common pointer locations:

```text
ROADMAP.md
README.md
docs/README.md
roadmap/README.md
```

Do not duplicate the full plan in multiple places. Link to the canonical file.

### 3. GitHub Issues for execution-ready tasks

Use GitHub Issues when a task is ready to implement, assign, label, discuss, or link to PRs.

Recommended shape:

- one epic issue for the initiative if it spans multiple PRs;
- child issues for concrete implementation tasks;
- labels appropriate to the repo;
- each child issue links back to the canonical roadmap/plan file.

Example epic:

```text
<Initiative>: readiness before live rollout
```

Example child issues:

```text
Resolve config split-brain
Enforce policy in server boundary
Add canonical submission endpoint
Add request audit metadata
Add safe status tool
Add readiness smoke test
```

### 4. Memory only stores the durable convention/pointer

Memory can record compact durable facts, for example:

```text
For work tracking, canonical multi-phase plans live as repo markdown; execution-ready tasks are promoted to GitHub Issues; memory stores only pointers/conventions.
```

Memory must not store the backlog itself, issue bodies, status checklists, or detailed task progress.

### 5. Linear only when explicitly useful

Use Linear when:

- the user explicitly wants company/team/product planning visibility;
- the work belongs in a broader product roadmap outside GitHub;
- team members expect to manage it in Linear;
- credentials are configured and the target team/project is known.

If Linear is not clearly needed, default to repo markdown + GitHub Issues because that stays close to code, PRs, CI, and implementation history.

## Decision Tree

1. **Is this a multi-phase technical, product, or architectural plan?**
   - Yes: write markdown in the relevant repo.
   - No: keep it in chat/TODO unless it needs persistence.

2. **Does the task need implementation, assignment, labels, discussion, or PR linkage?**
   - Yes: create GitHub Issue(s).
   - No: keep it in the plan.

3. **Does the work need company/product planning visibility outside GitHub?**
   - Yes: consider Linear after credentials/team/project are confirmed.
   - No: keep it in GitHub/repo docs.

4. **Is it just a convention or pointer future agents should remember?**
   - Yes: save a compact memory.
   - No: do not use memory.

## Operating Procedure

1. **Capture the plan**
   - Write or update repo-local markdown.
   - Keep it canonical, specific, and implementation-ready enough for future agents.

2. **Add a discoverability pointer**
   - Update an index/roadmap file if the repo has one and the initiative is active.

3. **Promote tasks to GitHub Issues**
   - Create one epic issue if the plan spans multiple PRs.
   - Create child issues only when tasks are clear enough to implement.
   - Link each issue to the roadmap file and/or section.

4. **Execute through PRs**
   - Issues define the queue.
   - PRs close issues.
   - The markdown plan records high-level status and phase gates.

5. **Update memory sparingly**
   - Save only the convention/pointer, not detailed state.

## Status Conventions in Markdown Plans

Use simple, reviewable status markers:

```md
- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked
```

For phase gates:

```md
## Phase 2 Readiness Gate

Do not roll out live behavior until:

- [ ] Canonical endpoint exists.
- [ ] Policy is enforced.
- [ ] Audit metadata is captured.
- [ ] Smoke test passes.
```

Keep status high-level in markdown. Detailed task chatter belongs in GitHub Issue comments or PRs.

## Common Pitfalls

1. **Using memory as the backlog.** Memory is invisible, not diffable, not assignable, and easy to drift.

2. **Creating GitHub Issues too early.** If the task is still architectural or ambiguous, keep it in markdown until it becomes implementation-ready.

3. **Putting repo-infrastructure work into product planning by default.** Use Linear only when it creates useful company/team visibility.

4. **Duplicating the whole plan in multiple places.** Keep one canonical markdown plan, then link to it from issues, PRs, and roadmap indexes.

5. **Forgetting future-agent discoverability.** Add a pointer from a repo index when the plan is current work.

6. **Making the convention project-specific.** This workflow is for cross-repo tracking. Project-specific details belong in that project's own plan or skills. If the user says "between us" or "different repos," create or update a cross-repo/user-level skill, not a repo-owned `.agents/skills/` entry.

7. **Assuming one agent profile sees every skill.** If this work-tracking convention should guide another named profile or client, verify that the skill is installed there.

## Verification Checklist

- [ ] Canonical markdown plan exists in the relevant repo.
- [ ] Current-work pointer exists in an index/roadmap file when relevant.
- [ ] GitHub Issues exist only for execution-ready tasks.
- [ ] Issues link back to the roadmap/plan file or section.
- [ ] Memory contains only a compact convention/pointer, not backlog details.
- [ ] Linear is only used if the user explicitly wants company/product planning visibility.
