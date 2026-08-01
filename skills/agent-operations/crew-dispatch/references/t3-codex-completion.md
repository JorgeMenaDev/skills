# T3/Codex completion-supervision runtime reference

Owns the runtime-specific evidence boundary and usage for `crew-dispatch` completion supervision. Verified read-only against T3 Code commit `0ad91b6e7fc1fcb6d5f4bc736d84c337e912bc62` (see the verification crew report `t3code-completion-verification-20260801/report.md`); the T3 Code checkout itself needs no changes.

## The mechanism, in one paragraph

T3 Code starts a model turn only through the `thread.turn.start` command, which **requires a `role: "user"` message**. No provider/tool event schedules another turn — `thread.activity.append` and `thread.session.set` are server-internal commands an external process cannot send. The only supported external entry point is `POST /api/orchestration/dispatch`, gated on the `orchestration:operate` scope. The engine deduplicates commands by a caller-chosen `commandId` persisted in a receipt table (exactly-once wake across retries **and** server restarts). Therefore: a detached supervisor writes the durable crew status, then wakes the firstmate with a deterministic-`commandId` user turn.

## Evidence boundary — what is and is not verifiable from T3 Code

- **`yield_control()` / `notify()` do not exist in T3 Code.** They are Codex-harness primitives inside the `codex` process T3 Code spawns. Their semantics (does the turn stay open? can a notification fire after `turn/completed`?) **cannot be verified from the T3 Code repository** and must not be assumed.
- T3 Code's turn boundary is set by the Codex process: `turn/completed` → canonical `turn.completed` → `activeTurnId` clears → the idle reaper's 30-minute clock starts. Keeping the original tool call open is a *short* wait at best and fails on server restart, interrupt, session stop, model switch, and concurrent turn start — never a durable completion channel.
- The worker-facing truth is `crew/<id>/status`. The wake is a pointer to it, never a verdict.

## Thread identity: mapping `CODEX_THREAD_ID` to the orchestration thread

While the original turn is active the launcher holds the provider cursor in the `CODEX_THREAD_ID` environment variable. For Codex-hosted T3 the mapping is read-only:

1. Locate the active T3 state database. Candidate state dirs (in order): `CREW_COMPLETION_T3_STATE_DIR` (explicit override, used by fixtures), then `T3CODE_HOME`'s `userdata/` and `dev/`, then `$HOME/.t3`'s `userdata/` and `dev/`. A candidate must contain both `state.sqlite` and `server-runtime.json`; the recorded `pid` in `server-runtime.json` must be alive (`kill -0`). The state DB is opened **strictly read-only** (`sqlite3 -readonly`).
2. Query `provider_session_runtime` for the codex row whose `resume_cursor_json.threadId` equals `CODEX_THREAD_ID`:

```sql
SELECT thread_id FROM provider_session_runtime
WHERE provider_name = 'codex'
  AND json_extract(resume_cursor_json, '$.threadId') = '<CODEX_THREAD_ID>';
```

3. **Require exactly one match** across all live candidates — the matching `thread_id` is the orchestration thread. Zero matches (no live server, cursor not found, or not Codex-hosted) or multiple matches **fail closed**: no wake is sent, never a guessed thread.
4. Use that state dir's `server-runtime.json` for the runtime `origin` (`{"version":1,"pid":N,"port":N,"origin":"http://127.0.0.1:3773","devUrl":...}`) and re-validate the recorded server PID is alive before each wake attempt.
5. Persist the **state kind** (`userdata` or `dev`, the state dir basename) plus, for `dev`, the recorded `devUrl` — non-secret — so the wake's auth commands target the same store the thread was captured from.

## Authenticated idempotent wake

1. **Issue a short-lived scoped session against the matched state kind.** Issued sessions carry `orchestration:read` + `orchestration:operate`, covering both the snapshot read and the dispatch. Construction (verified against the pinned CLI): an explicit `--base-dir` always resolves to `<base>/userdata`, so:
   - `kind=userdata`: `t3 auth session issue --base-dir <base> --ttl 10m --json` and `t3 auth session revoke --base-dir <base> <sessionId>`.
   - `kind=dev`: `T3CODE_HOME=<base> VITE_DEV_SERVER_URL=<devUrl> t3 auth session issue --ttl 10m --json` and the same env for `revoke` — **no `--base-dir`**. `devUrl` is taken from the matched `server-runtime.json`; a dev state dir without a recorded `devUrl` fails closed at launch.
   The token is consumed from stdin (`curl -H @-`), never placed in argv or persisted. If issuance succeeds but token parsing fails while a session id is available, that session is revoked before returning — never silently leaked.
2. **Read the thread snapshot** — `GET <origin>/api/orchestration/threads/<threadId>` with the bearer token. If `thread.session.status` is `starting` or `running`, the thread has an active user turn: **do not dispatch** — retry later with backoff. A busy thread is never steered or superseded.
3. **Dispatch the wake** — `POST <origin>/api/orchestration/dispatch` with `Authorization: Bearer <token>` and a `thread.turn.start` command:
   - `commandId`: deterministic, derived from the crew id (e.g. `cmd-<sha256(crew id)>`), identical across every retry → the receipt table collapses retries to one turn.
   - `messageId`: fresh per attempt (the T3 contract requires a non-empty id, not uniqueness, but a fresh one keeps replays clean).
   - `message`: `{role: "user", text: <short text telling the firstmate to read and verify crew/<id>/status; never claiming the hand-back is proof>, attachments: []}`.
   - `runtimeMode` / `interactionMode`: **preserved exactly from the thread snapshot** — the contract literals are `runtimeMode: approval-required | auto-accept-edits | auto | full-access` (default `full-access`) and `interactionMode: default | plan` (default `default`). Hyphenated values must parse intact. Only when the snapshot omits the field may the contract-valid default be used.
4. **Revoke the issued session in the same attempt** — same construction as issue — whether the wake succeeded, found a busy thread, or failed.
5. **Retry with bounded backoff** (default: 6 attempts, 30s doubling from 30s, each sleep capped at 60s). `CREW_COMPLETION_MAX_ATTEMPTS` must be a positive integer and `CREW_COMPLETION_RETRY_BASE_SECONDS` a non-negative integer (validated before launch). All attempts exhausted → keep the durable terminal status and record non-secret failure evidence in `completion.json` (`notification.status: "failed"`). A successful worker result is never rewritten as failed because notification failed.

## Crew IDs are single-use

The deterministic `commandId` and the terminal status lines make a crew ID single-use. If `crew-dir/completion.json` already exists, `launch` refuses and demands a fresh crew ID — never relaunch a used ID.

## Helper usage

```
scripts/crew-wake-supervise.sh launch <crew-dir> -- <worker-command...>
scripts/crew-wake-supervise.sh supervise <crew-dir> -- <worker-command...>
```

- `launch`: validates commands/inputs, captures T3 context from the live turn (must resolve to exactly one live codex thread), writes `crew-dir/completion.json` (non-secret supervision context), appends `working:` to `crew-dir/status`, re-execs itself detached (`setsid` via system python3; macOS has no `setsid` binary) and exits — the tool call ends immediately.
- `supervise`: the detached mode. Records supervisor+worker PIDs, `wait`s on the real worker PID, finalizes `crew-dir/status`, then performs the wake above. May also be run directly for diagnostics.
- Files: `crew-dir/completion.json` (context + non-secret notification evidence), `crew-dir/completion.log` (supervisor diagnostics — never secrets).

## Worker argv boundary — honest scope

The helper never persists worker prompts or the worker command line, and the T3 token never appears in argv. But the **worker command line is caller-supplied and becomes the detached supervisor's argv** (visible to `ps`), so credential-bearing worker arguments are **forbidden**: pass credentials by environment or file, never by argument. The helper cannot redact caller-supplied argv; that is the caller's obligation.

Environment overrides (all optional): `CODEX_THREAD_ID` (required for a wake; absent → fail closed at launch), `CREW_COMPLETION_T3_STATE_DIR`, `CREW_COMPLETION_T3_BASE_DIR`, `CREW_COMPLETION_DRY_RUN=1` (simulate issue/POST/revoke; safe fixture path), `CREW_COMPLETION_SNAPSHOT_FILE` (dry-run snapshot fixture), `CREW_COMPLETION_MAX_ATTEMPTS`, `CREW_COMPLETION_RETRY_BASE_SECONDS`.

Required commands (validated before any run): `bash`, `sed`, `grep`, `shasum`, `awk`, `cut`, `cat`, `kill`, `sleep`, `date`, `basename`, `dirname`, `head`, `tail`, `mv`, `nohup`, `sqlite3`, `curl`, `python3`; plus `t3` for real (non-dry-run) wake attempts.
