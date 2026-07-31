---
name: opencode-cli-runtime
description: Runtime contract for delegating work to OpenCode CLI as a headless sidecar. Use when a non-OpenCode runtime delegates one task, review, question, or one-vendor second opinion to OpenCode. OpenCode's own subagents are native delegation; this is the cross-runtime contract.
version: 1.0.1
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
cd <target-repo> && $OC run "<prompt>" --format json
```

- The message is positional; there is no `--prompt` or `--message` flag.
- `--format json` prints newline-delimited JSON events (NDJSON), not a single result object.
- For a long prompt, build one quoted argument with a single-quoted heredoc.
- Allow minutes for tool-using turns.

## Parsing the event stream

`--format json` emits one JSON object per line. A run is complete when a `step_finish` event with `.part.reason == "stop"` appears; a `step_finish` with reason `"tool-calls"` is intermediate, not the answer. Concatenate `.part.text` from `text` events for the reply.

```bash
cd <target-repo> && $OC run "<prompt>" --format json \
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
| Review, research, question, second opinion | read-only prompt, no `--auto` |
| Authorized repository edits | `--auto` in an isolated branch/worktree/scratch only |

`--auto` auto-approves permissions that are not explicitly denied (dangerous!). In print mode nobody can answer a permission prompt, so choose flags from the active workspace contract before launch. Use `--auto` only when the contract authorizes edits, and run write-capable work in a clean isolated workspace — never a dirty shared checkout. The parent reviews the diff before integration.

## Model and agent

- Default model is `opencode-go/deepseek-v4-flash`; leave `--model` unset to use it. Override only when the task or routing contract names a different model (`-m <provider/model>`).
- `--agent <name>` selects the agent (e.g. `build`, `plan`). The `general` and `explore` agents are OpenCode's native subagents — a delegated run stays on the primary agent unless the contract says otherwise.
- `--dir <path>` runs in a specific directory; pass it when the caller's cwd differs from the target repo.

## Traps

- Plain `opencode` opens the TUI and hangs a headless caller; always use `opencode run ... --format json`.
- `--format json` is an event stream, not a single JSON object — do not `jq` the whole output as one document.
- A `step_finish` with reason `"tool-calls"` means the run is mid-turn; only reason `"stop"` completes it.
- For long background work, prefer a prompt that writes a report file so completion is observable.
