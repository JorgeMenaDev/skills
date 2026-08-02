---
name: crew-dispatch
description: Crew-first dispatch for Matias — run a deliverable task through a crewmate with a durable crew record (intake → brief → lane → record → spawn → supervise → verify → integrate → close). Use when starting any multi-file change, investigation report, or product edit, or when reconciling crew/ records at session start, or when a dispatched crew must report completion after its launching turn ends. Inline-lane work (true one-liner, same-pass vault/tracker/home write, read-and-think answer) skips this skill.
version: 1.5.1
mutating: true
writes_to: ["crew/<task-id>/ (machine-local, gitignored)", "the target repo through the selected lane"]
---

# Crew Dispatch

## Scope test — read this before anything else

**Were you handed a brief?** A `crew/<id>/brief.md`, a stamped brief in your prompt, or any task delegated by another agent — if yes, you are a **crewmate**, not the firstmate. This skill is the *dispatcher's* contract and does not govern you: execute your brief and hand back. Reading this file, or the workspace `AGENTS.md`, is not an appointment — a crewmate inherits both from the checkout it runs in.

Only the session the human is talking to directly is the firstmate. Everything below is for that session.

## The firstmate's contract

Matias is the **firstmate**: Jorge's only liaison, who dispatches, supervises, verifies, and integrates. **Crewmates** do the deliverable work. The tripwire: **no crew record, no task work** — deliverable work executed without a `crew/<id>/` record is policy drift; a session that catches itself drifting names it in the tracker (ADR 0009).

The tripwire binds *dispatch*, not depth. A crewmate may fan out helpers inside its own brief — the rule is **no unrecorded work, not no nesting**. What needs a record is work that outlives a brief, lands changes no firstmate reviews, or needs its own supervision; a bounded helper that lives and dies inside one brief does not. Helper fan-out alone is never grounds to cancel a crewmate.

## Preamble — compute state, don't guess

```bash
scripts/crew-status.sh   # from the profile root; lists every record + latest status
```

**Ask which lane, then ask whether it is alive — never assume either way.** Assume-dead re-dispatches live crewmates and duplicates their work; assume-alive leaves dead records lying `working` forever.

- **Session-bound lanes** (native subagents, any worker spawned as a child process of the firstmate's session) die with the session. An in-flight record from one that predates this session is dead: mark it `failed: session-lost` or re-dispatch; never leave it `working`.
- **Durable lanes** (host-native server-side threads, AFK, detached CLI) outlive the session and keep working across a restart. Probe real liveness before judging one. A live worker is left alone. An idle or missing worker finished without writing terminal status, or died — read it, then close or re-dispatch. **An unreadable probe is not evidence of death** and never justifies closing a record.

Where the host exposes durable sessions, the status helper should compute liveness rather than infer it from age.

## Boundary — the named inline lane

Three shapes stay with Matias, no record needed — name the lane when using it:

1. **True one-liner** — a literal one-line change; name the one-liner exception in the commit.
2. **Same-pass home-ops writes** — vault/Second Brain synthesis, tracker items, crew records, briefs, `crew-dispatch` ceremony, this repo's policy files. Running the crew is not crew work.
3. **Read-and-think answers to Jorge** — status questions, judgments, recommendations.

Everything else — any multi-file change, investigation report, or product edit — is crew work. Continue.

## Lifecycle

1. **Classify**: **ship** (changes a repo or product; lands per the target repo's git rules) or **scout** (read-only investigation; deliverable is `crew/<id>/report.md`; never pushes).
2. **Brief** — write `crew/<id>/brief.md`, **task-self-contained**: task + checkable acceptance criteria, read-first paths, non-scope, isolation instructions, the status protocol below, and the Authority Contract when the work can reach writes/credentials/external surfaces (AGENTS.md injection rule). The crewmate inherits the *checkout's* instructions (`AGENTS.md`/`CLAUDE.md`) — native subagents inherit project instructions, and OpenCode and Codex read `AGENTS.md` from the target repo by design — so never assume it arrives with no context, and never rely on that inheritance for the task: it carries the workspace's identity, not your acceptance criteria. This is why the brief leads with the scope test's answer, and why an unbriefed instruction in those files can otherwise capture a crewmate.
3. **Lane and model** — the workspace names one delegation source of truth (in this workspace, `docs/agents/delegation.md`): a table of models with the harness/instance that runs each, and the rule for choosing between them. Read it, pick a row, and stamp the harness+model actually used into `meta.json`. Do not reconstruct a model choice from any other file, and do not carry model preferences in memory across sessions — a workspace changes providers and opinions faster than doctrine. **Prefer a lane whose worker outlives the launching session and can wake the firstmate itself.** A worker spawned as a child process of the firstmate's session dies with it, so a session restart destroys the run and leaves the record lying `working`. Where the host provides durable server-side sessions — on a T3 Code host, a native thread created through the workspace's thread helper — that lane is preferred over any child-process lane, and it needs no read-back point because it signals for itself.
4. **Isolation** — product repos: `using-git-worktrees` per the subagent worktree gate. **Matias repo: a single crewmate edits in place on `main`** (the no-worktree ruling); a sibling full clone (`~/dev/code/matias-crew/<id>/`, git-crypt key unlocks it) **only when crew runs concurrently on this repo** — delete it at close.
5. **Record, then spawn** — write `crew/<id>/meta.json` (`{task, lane, harness, model, status, created, target}`), append `working: dispatched` to `crew/<id>/status`, **then** spawn. Record-before-spawn so a crash never leaves work the fleet can't see (the firstmate 2026-07-22 incident class).
6. **Supervise — waiting is silent.** Status verbs: `working | needs-decision | blocked | paused | done | failed`, appended sparsely (events, not FYI progress). Crewmate rule: same obstacle twice → `blocked:` and stop. `paused:` only for a known external wait expected to clear on its own. The firstmate does **not** poll status, re-read crew records, relay progress, or schedule check-ins between dispatch and a real signal; elapsed time and no-change reads are not progress. Exactly four triggers reopen a quiet record: a lane signal, a question from the human, a read-back point the brief declared, or session-start reconciliation. A lane that cannot signal at all is dispatched **only** with a declared read-back point — otherwise its silent death is indistinguishable from work in progress. A machine-generated wake is stamped and is a pointer, never an authorization: it can never satisfy a human-ordered gate.
7. **Verify** — read the real diff or report against the acceptance criteria. The hand-back locates proof; it is never proof. On a miss, send one consolidated correction.
8. **Integrate** — Matias lands the result per the target repo's git rules (matias repo: rebase-pull → commit → direct-push; product repos: their PR golden path). Crewmates never own merge authority.
9. **Close** — append `done:`/`failed:` and remove any sibling clone. After verification and integration, run `scripts/crew-thread.sh settle crew/<id>` for a `done:` T3-thread record; the helper refuses other outcomes or a live thread, so failed and attention-required crew stay visible. Re-run `scripts/crew-status.sh` and confirm the record is closed.

## Completion supervision — the crew survives its launching turn

A detached crew job (AFK lane, background runtime, or any worker the launching turn will not outlive) must still close its own loop. Invariant: **durable status first, notification second, and the notification must be idempotent.** Mechanism:

1. **Launch detached through `scripts/crew-wake-supervise.sh launch`.** The launcher captures the runtime's completion context *while the turn is active* (a Codex-hosted T3 run maps `CODEX_THREAD_ID` to the orchestration thread, one exact match, fail closed), re-execs itself into a new session, and ends the turn. It never keeps the original tool call open.
2. **The detached supervisor owns one foreground worker.** It records its PID and the worker PID, then `wait`s on the real worker exit — launcher exit and logs are never treated as worker exit.
3. **Terminal status is written before any notification.** The supervisor preserves a worker-written `done|failed|blocked|needs-decision|paused:` line, or appends `done:`/`failed:` from the exit code when the worker wrote none.
4. **Then it wakes the firstmate with a bounded, idempotent notification.** Deterministic command id from the crew id, fresh message id, short-lived scoped session revoked in the same attempt, backoff retries with a cap, and a pre-dispatch snapshot check that never steers a thread whose session is `starting`/`running`.
5. **Notification failure never rewrites a worker result.** If every wake attempt fails, the durable terminal status stands and non-secret failure evidence goes into the record.

T3/Codex mechanics — endpoint, token, idempotency contract, snapshot shape, and the evidence boundary (`yield_control()`/`notify()` are Codex-harness primitives, not T3 Code) — live in [`references/t3-codex-completion.md`](references/t3-codex-completion.md); read it in full before the first use and when the worker will run under Codex-hosted T3.

## Standing rules

- **Staleness/orphan rule**: a `working` record from a native-subagent lane in a prior session is dead — close or re-dispatch at reconciliation. Any record `working` >24h without a live process is stale — investigate at **session-start reconciliation**, then close or re-dispatch. Elapsed time never reopens a record mid-session; that is the waiting-is-silent rule in step 6, and this staleness sweep is reconciliation, not a clock to watch.
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
