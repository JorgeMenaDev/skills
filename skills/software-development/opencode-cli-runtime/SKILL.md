---
name: opencode-cli-runtime
description: Runtime contract for delegating work to OpenCode CLI as a headless sidecar. Use when a non-OpenCode runtime delegates one task, review, question, or one-vendor second opinion to OpenCode. OpenCode's own subagents are native delegation; this is the cross-runtime contract.
version: 1.0.2
mutating: true
writes_to: ["target workspace only when the active workspace contract authorizes write-capable execution"]
---

# OpenCode Runtime

Call OpenCode headlessly from a non-OpenCode runtime with one canonical command shape. Default model **`deepseek-v4-flash`** (`opencode-go/deepseek-v4-flash`).

## Contract

- Resolve the active workspace authority contract before composing the prompt. It governs writes, credentials, external actions, production changes, destructive operations, and human gates. Include the exact contract in any delegated prompt that may reach those surfaces.
- Without a workspace contract, use the read-only tool set and stop before external effects.
- Run from the target repository so OpenCode discovers its local instructions (AGENTS.md, opencode.json).
- Capture the returned session id from the event stream; it is the only reliable follow-up handle.

## Preamble

```bash
command -v opencode >/dev/null 2>&1 && OC=opencode || OC="$HOME/.local/bin/opencode"
$OC --version >/dev/null 2>&1 || echo "OPENCODE: missing"
```

`OPENCODE: missing` → stop and report the missing runtime.

## Canonical invocation

```bash
cd <target-repo> && $OC run "<prompt>" --auto --format json 2>/tmp/oc-err.log > /tmp/oc-run.jsonl
```

- `--auto` is the default posture for delegated runs (Jorge ruling 2026-07-31): headless mode cannot answer permission prompts, so a run without it auto-rejects reads/writes to any path outside the allowlist (observed: `~/.btca/...` reads denied) and the task stalls. The prompt, not the flag, still encodes scope — a read-only prompt stays read-only.
- **Never merge stderr into the NDJSON stream.** OpenCode prints warnings to stderr (e.g. subagent fallback), which corrupts the `--format json` parse; the caller's pipe then fails mid-run and kills the task via SIGPIPE (observed 2026-07-31: run died after 2 steps). Redirect stderr to a separate file and parse stdout alone.
- The message is positional; there is no `--prompt` or `--message` flag.
- `--format json` prints newline-delimited JSON events (NDJSON), not a single result object.
- For a long prompt, build one quoted argument with a single-quoted heredoc.
- Allow minutes for tool-using turns.

## Parsing the event stream

`--format json` emits one JSON object per line. A run is complete when a `step_finish` event with `.part.reason == "stop"` appears; a `step_finish` with reason `"tool-calls"` is intermediate, not the answer. Concatenate `.part.text` from `text` events for the reply.

```bash
cd <target-repo> && $OC run "<prompt>" --auto --format json 2>/tmp/oc-err.log \
  | jq -r 'select(.type=="text") | .part.text'
```

Capture `.sessionID` from any event; it is the resume handle. Exit code 0 alone is not proof of a finished reply — a refusal or tool loop can also exit 0.

## Follow-ups

```bash
cd <target-repo> && $OC run "<follow-up>" --session <session_id> --format json
```

Use the explicit session id. `--continue` selects the most recent session and races with parallel work; `--fork` forks a session before continuing.

## Tool authority

| Intent | Flags |
|---|---|
| All delegated runs (default) | `--auto` (full permissions; scope comes from the prompt) |
| Write-capable work | `--auto` in an isolated branch/worktree/scratch — never a dirty shared checkout |

`--auto` auto-approves permissions that are not explicitly denied (dangerous!). It is the **default for delegated runs** (Jorge ruling 2026-07-31): in print mode nobody can answer a permission prompt, so omitting it auto-rejects external paths and stalls the task. The authority contract still governs via the prompt — read-only prompts stay read-only, and the parent reviews the diff before integration. Use `--auto` in a clean isolated workspace for write-capable work, never a dirty shared checkout.

## Model and agent

- Default model is `opencode-go/deepseek-v4-flash`; leave `--model` unset to use it. Override only when the task or routing contract names a different model (`-m <provider/model>`).
- `--agent <name>` selects the agent (e.g. `build`, `plan`). The `general` and `explore` agents are OpenCode's native subagents — a delegated run stays on the primary agent unless the contract says otherwise.
- `--dir <path>` runs in a specific directory; pass it when the caller's cwd differs from the target repo.

## Traps

- Plain `opencode` opens the TUI and hangs a headless caller; always use `opencode run ... --format json`.
- `--format json` is an event stream, not a single JSON object — do not `jq` the whole output as one document.
- A `step_finish` with reason `"tool-calls"` means the run is mid-turn; only reason `"stop"` completes it.
- **Never `2>&1` the run into a JSON parser** — stderr warnings (e.g. subagent fallback) corrupt the NDJSON and kill the run via SIGPIPE. Redirect stderr to a file, parse stdout only.
- **`--agent general`/`explore` are subagents, not primary agents.** A headless `run --agent <subagent>` prints a fallback warning and uses the default primary agent; pass a primary agent (`build`, `plan`) or omit `--agent`.
- `--auto` is the default for delegated runs; omitting it stalls the task on any read/write outside the allowlist (observed: `~/.btca/...` reads auto-rejected).
- For long background work, prefer a prompt that writes a report file so completion is observable.
