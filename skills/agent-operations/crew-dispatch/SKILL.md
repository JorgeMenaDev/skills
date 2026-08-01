---
name: crew-dispatch
description: Crew-first dispatch for Matias — run a deliverable task through a crewmate with a durable crew record (intake → brief → lane → record → spawn → supervise → verify → integrate → close). Use when starting any multi-file change, investigation report, or product edit, or when reconciling crew/ records at session start, or when a dispatched crew must report completion after its launching turn ends. Inline-lane work (true one-liner, same-pass vault/tracker/home write, read-and-think answer) skips this skill.
version: 1.2.0
mutating: true
writes_to: ["crew/<task-id>/ (machine-local, gitignored)", "the target repo through the selected lane"]
---

# Crew Dispatch

Matias is the **firstmate**: Jorge's only liaison, who dispatches, supervises, verifies, and integrates. **Crewmates** do the deliverable work. The tripwire: **no crew record, no task work** — deliverable work executed without a `crew/<id>/` record is policy drift; a session that catches itself drifting names it in the tracker (ADR 0009).

## Preamble — compute state, don't guess

```bash
scripts/crew-status.sh   # from the profile root; lists every record + latest status
```

Any in-flight record from a **native-subagent lane** predates this session → it is dead (native subagents never survive their session). Mark it `failed: session-lost` or re-dispatch; never leave it `working`.

## Boundary — the named inline lane

Three shapes stay with Matias, no record needed — name the lane when using it:

1. **True one-liner** — a literal one-line change; name the one-liner exception in the commit.
2. **Same-pass home-ops writes** — vault/Second Brain synthesis, tracker items, crew records, briefs, `crew-dispatch` ceremony, this repo's policy files. Running the crew is not crew work.
3. **Read-and-think answers to Jorge** — status questions, judgments, recommendations.

Everything else — any multi-file change, investigation report, or product edit — is crew work. Continue.

## Lifecycle

1. **Classify**: **ship** (changes a repo or product; lands per the target repo's git rules) or **scout** (read-only investigation; deliverable is `crew/<id>/report.md`; never pushes).
2. **Brief** — write `crew/<id>/brief.md`, self-contained (the crewmate inherits nothing): task + checkable acceptance criteria, read-first paths, non-scope, isolation instructions, the status protocol below, and the Authority Contract when the work can reach writes/credentials/external surfaces (AGENTS.md injection rule).
3. **Lane** — read `.agents/engine-override.json` FIRST. Present + valid `{ "harness", "model" }` = that engine is the preferred lane for this new dispatch, through its runtime contract skill (harness `opencode` → `opencode-cli-runtime` with the named model, e.g. `opencode-go/deepseek-v4-flash`; `codex` → `codex-cli-runtime`; `grok` → `grok-cli-runtime`; `claude` → native subagent). Absent = off; malformed = off + warn Jorge. Off, or a carve-out category (conductor/orchestrator sessions, taste-gated UI/copy, structured-output fan-out, counsel/cross-vendor reviews, recap — these stay on the non-override engine): fall back to cheapest capable per AGENTS.md Portable Execution Routing — native subagent (default) → cross-vendor CLI contract skill → AFK → computer-use. Stamp the harness+model actually used into `meta.json`.
4. **Isolation** — product repos: `using-git-worktrees` per the subagent worktree gate. **Matias repo: a single crewmate edits in place on `main`** (the no-worktree ruling); a sibling full clone (`~/dev/code/matias-crew/<id>/`, git-crypt key unlocks it) **only when crew runs concurrently on this repo** — delete it at close.
5. **Record, then spawn** — write `crew/<id>/meta.json` (`{task, lane, harness, model, status, created, target}`), append `working: dispatched` to `crew/<id>/status`, **then** spawn. Record-before-spawn so a crash never leaves work the fleet can't see (the firstmate 2026-07-22 incident class).
6. **Supervise** — status verbs: `working | needs-decision | blocked | paused | done | failed`, appended sparsely (events, not FYI progress). Crewmate rule: same obstacle twice → `blocked:` and stop. `paused:` only for a known external wait expected to clear on its own.
7. **Verify** — read the real diff or report against the acceptance criteria. The hand-back locates proof; it is never proof. On a miss, send one consolidated correction.
8. **Integrate** — Matias lands the result per the target repo's git rules (matias repo: rebase-pull → commit → direct-push; product repos: their PR golden path). Crewmates never own merge authority.
9. **Close** — append `done:`/`failed:`, remove any sibling clone, re-run `scripts/crew-status.sh` and confirm the record is closed.

## Completion supervision — the crew survives its launching turn

A detached crew job (AFK lane, background runtime, or any worker the launching turn will not outlive) must still close its own loop. Invariant: **durable status first, notification second, and the notification must be idempotent.** Mechanism:

1. **Launch detached through `scripts/crew-wake-supervise.sh launch`.** The launcher captures the runtime's completion context *while the turn is active* (a Codex-hosted T3 run maps `CODEX_THREAD_ID` to the orchestration thread, one exact match, fail closed), re-execs itself into a new session, and ends the turn. It never keeps the original tool call open.
2. **The detached supervisor owns one foreground worker.** It records its PID and the worker PID, then `wait`s on the real worker exit — launcher exit and logs are never treated as worker exit.
3. **Terminal status is written before any notification.** The supervisor preserves a worker-written `done|failed|blocked|needs-decision|paused:` line, or appends `done:`/`failed:` from the exit code when the worker wrote none.
4. **Then it wakes the firstmate with a bounded, idempotent notification.** Deterministic command id from the crew id, fresh message id, short-lived scoped session revoked in the same attempt, backoff retries with a cap, and a pre-dispatch snapshot check that never steers a thread whose session is `starting`/`running`.
5. **Notification failure never rewrites a worker result.** If every wake attempt fails, the durable terminal status stands and non-secret failure evidence goes into the record.

T3/Codex mechanics — endpoint, token, idempotency contract, snapshot shape, and the evidence boundary (`yield_control()`/`notify()` are Codex-harness primitives, not T3 Code) — live in [`references/t3-codex-completion.md`](references/t3-codex-completion.md); read it in full before the first use and when the worker will run under Codex-hosted T3.

## Standing rules

- **Staleness/orphan rule**: a `working` record from a native-subagent lane in a prior session is dead — close or re-dispatch at reconciliation. Any record `working` >24h without a live process is stale: investigate, then close or re-dispatch.
- **`crew/` never holds the only copy of a Jorge-action.** Anything Jorge must do lives as exactly one `### Needs from Jorge` item on a `JorgeMenaDev/matias` issue (single inbox). Crew records are agent-facing operational state only.
- Jorge-facing reporting stays outcomes-not-mechanics: never relay crewmate status lines or reports verbatim.

## Launch permissions (Jorge ruling 2026-07-31)

Every crewmate spawns in the runtime contract's **full-permission, no-sandbox** mode: `--auto` for OpenCode, full permission-mode/bypass for headless Claude, write+full access for Codex, `--always-approve`-equivalent for Grok. Never narrow `--allowedTools`, add tool deny lists, or sandbox a crewmate: a headless run cannot answer permission prompts, so restrictions auto-reject legitimate work (observed 2026-07-31 — a `Bash(git *)`-only launch produced 18 denials and stalled the crewmate). Safety lives in the brief's Authority Contract — human-only gates (payment, 2FA, credentials only Jorge possesses) stop at the gate regardless of tool power — plus firstmate verification of the real diff/report before integration, never in tool sandboxing.

## STOP gates

- **STOP before dispatching to any cloud/sandbox AFK lane** — show Jorge the brief, flags, and lane and wait for explicit confirmation (Authority Contract). Prevents unconfirmed cloud dispatch.
- **STOP if about to spawn without a crew record** — write the record first. Prevents invisible, unreconcilable work.
- **STOP if a crewmate hand-back would land without reading its diff/report** — unverified integration is the failure this whole skill exists to prevent.
- **STOP before treating the wake as verification** — the wake only tells the firstmate to read and verify the crew record. The wake firing is not proof of worker success. Unverified wake-claims are the failure mode.

## Contract

- Durable `crew/<id>/status` is authoritative worker output; the wake is a pointer, never a verdict.
- Supervisor PIDs are explicit and recorded; the helper never uses broad process matching or destructive process commands.
- Crew IDs are single-use: an existing `completion.json` refuses a relaunch; use a fresh crew ID.
- Only non-secret supervision context is persisted in the crew record — never tokens, authorization headers, prompts, or credential-bearing commands.
- Worker argv is caller-supplied and visible to `ps` on the detached supervisor — credential-bearing worker arguments are forbidden; pass credentials by environment or file.
