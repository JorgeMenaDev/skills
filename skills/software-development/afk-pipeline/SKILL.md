---
name: afk-pipeline
description: Run a dev task as an AFK Task — grill the request, choose Pipeline Flags, write an Agent Brief, and trigger the label-driven pipeline that ends in a draft PR. Use when the user asks for a code change, feature, or fix in a repo listed in the AFK registry, asks which phases a task needs, or wants the pipeline installed in a new repo.
version: 2.6.1
mutating: true
writes_to: [.agents/afk-pipeline/]
---

# AFK Pipeline

Dev work runs **AFK**: a GitHub-issue label triggers a pipeline that implements the change, verifies it in a real browser, opens a **draft PR** carrying committed QA Evidence, and publishes a visual recap. A human reviews and merges. In a registered repo you never implement product code inline — your deliverable is the **brief, and the brief is the contract**: the pipeline agents get no follow-up questions.

## Preamble (run FIRST)

```bash
cd "$(git rev-parse --show-toplevel)" 2>/dev/null
_R=.agents/afk-pipeline/REGISTRY.md
[ -f "$_R" ] && echo "REGISTRY: $_R" || echo "REGISTRY: missing"
```

- `REGISTRY: missing` → either you are not in the consumer's home repo (ask where the registry lives), or the pipeline was never adopted here (offer [reference/installation.md](reference/installation.md)).
- Otherwise Read the registry file in full now — it maps each repo to trigger labels, default lane, clone path, and quirks. Do not route from memory of it.

## Contract

- Every dev task in a registered repo goes through an Agent Brief — no inline implementation, no direct pushes, no merges.
- Phases are fail-safe ON: Pipeline Flags only reduce work; absent flags mean the full pipeline (implement → advisory second-model review → verify → draft PR → recap).
- The second-model review runs on the **codex engine by default, on every repo and lane** — a different vendor than the implementer. `review-engine: claude` in the brief is the only override; a runner without the requested engine skips the review loudly instead of silently swapping engines.
- Repos with a Convex backend (`convexDir` in `.sandcastle/config/pipeline.json`) get a **Convex integrity gate**, always-on and not flag-controlled: the pipeline regenerates `_generated` with real codegen against a keyless anonymous local backend; the schema/types not validating fails the RUN, while divergent committed files are **self-healed** (v2.5.1) — the gate commits the canonical codegen output itself (visible `[convex-gate]` commit in the PR) instead of discarding the whole implement run over machine output (a full andyChat slice was lost to this on 2026-07-07). Hand-editing `_generated` is forbidden everywhere. Companion stack policy: merging a Convex change must trigger an automatic backend release (Vercel-coupled build or a main-push deploy workflow) — a repo where merged backend code waits for a manual `convex deploy` is drift.
- Skip decisions key on **predicted diff shape** — the files and surfaces the change will actually touch — never on how the task is framed.
- Labeling starts a paid, unattended run; the user confirms brief + flags before any label lands.
- **No failed run loses committed work** (v2.4.0): any failure or timeout-cancel after the branch exists salvage-pushes the agent branch (uncommitted debris included as an explicit WIP commit) and the failure comment names it. A salvaged branch is unreviewed-for-merge by definition; a successful retry force-replaces it. The one class this cannot cover: a crash inside the implement phase before the agent commits.
- **Three lanes** (v2.5.0, rearchitected v2.6.0), selected per task by trigger label: `agent:implement` (cloud — GitHub-hosted VM, noSandbox), `agent:implement-local` (self-hosted runner, agent in Docker), `agent:implement-sandbox` (GitHub-hosted runner + **Vercel Sandbox** microVM). The sandbox lane rides sandcastle's own isolated-provider machinery: the AGENT runs inside a per-phase Firecracker microVM and the workspace syncs in/out via git bundle/format-patch, so push, salvage, artifacts, and step outputs stay host-side on all three lanes. `.sandcastle/vercel/provider.ts` is a thin hardened stand-in for sandcastle's stock `sandboxes/vercel` (stock gaps as of 0.12.0: exec ignores `stdin` — which is how claudeCode delivers the PROMPT — no transport-fault tolerance, no `persistent: false`; collapse it once upstreamed). Per-repo provisioning: `sandbox: {teamId, projectId}` in pipeline.json (the repo's Vercel team + its `afk-sandbox` project), the team-scoped `VERCEL_SANDBOX_TOKEN` repo secret, and the `@vercel/sandbox` devDependency. Unprovisioned label use fails loudly at the first agent phase. Known degrade shared with the cloud lane: codex reviews skip loudly (no headless codex auth off the mini).

## The loop

1. **Route.** Find the target repo's registry row. No row → not an AFK repo: do normal work, or offer installation. Done when: row in hand.
2. **Mini-grill.** Interrogate the request until the brief is writable: goal, constraints, acceptance criteria, blast radius, and what could hide inside it. One question at a time, with your recommended answer. Never paper over ambiguity: an unclear or underspecified request means the issue does not get written yet — ask until it's settled. Escalate to a full `grill-with-docs` session (target = this repo) when the task reshapes domain language, carries a trade-off worth an ADR, or introduces a new integration, credential, or external service. Done when: every acceptance criterion is checkable by an agent with no context (browser or shell), and you can predict the diff shape.
3. **Flags.** Apply [reference/phase-rubric.md](reference/phase-rubric.md) to the predicted diff shape. Done when: each flag has a one-line reason.
4. **Brief.** Write it per [reference/brief-template.md](reference/brief-template.md), `### Pipeline` section included, and show the user the full body plus your flag reasoning.
5. **STOP — get explicit go-ahead before creating/labeling anything.** The failure this gate prevents: an unattended agent burning a full run on a mis-scoped brief the user never read.
6. **Trigger.** Create the issue, add the repo's trigger label (lane per registry default). Watch by polling `gh run view <id> --json status` in a loop — never `gh run watch` (unbounded output).
7. **Deliver.** When the draft PR opens, hand over PR + QA Evidence + recap links, plus the live deploy-preview URL when the repo has a PR-preview integration (e.g. Vercel comments it on the PR) — it's the fastest human review surface, ahead of screenshots. If the diff touches the pipeline itself, say plainly: pipeline changes execute from the default branch, so they can't self-prove — their first validating run is the first run *after* merge.

## Output format

End a triggered task with: issue URL, run URL, flag set with reasons, and a status line — `WAITING_ON: review` or `BLOCKED: <one line of evidence>`.

## Watching a local-lane run

The agent's output streams to the **GitHub Actions job log** (repo → Actions → agent-implement run, or `gh run watch -R <owner>/<repo>`), plus the committed evidence dir and the PR recap. Docker Desktop is only for liveness/CPU/kill: sandcastle boots the container detached with a keepalive PID 1 and drives all work via `docker exec`, so the container's own Logs tab is empty **by design**. Container names are `sandcastle-<uuid>` — hardcoded upstream in `@ai-hero/sandcastle` (no name option; never `docker rename` a live one, sandcastle addresses it by that name). Identify containers by IMAGE: `docker ps --format '{{.Names}}  {{.Image}}  {{.RunningFor}}'` — the per-repo image (`sandcastle-<project>`) tells you whose run it is.
