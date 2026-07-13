---
name: codex-cli-runtime
description: Claude-side contract for calling an installed Codex companion runtime. Use when Claude Code delegates a task, review, question, or implementation to Codex/OpenAI.
version: 1.0.0
user-invocable: false
mutating: true
writes_to: ["target workspace only when the active workspace contract authorizes write-capable execution"]
---

# Codex Runtime

Use the installed Codex companion from Claude Code. The caller owns routing and review; the companion performs one bounded task.

## Preamble

Resolve the helper from the active plugin first, then the stable marketplace installation:

```bash
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "$CLAUDE_PLUGIN_ROOT/scripts/codex-companion.mjs" ]; then
  COMPANION="$CLAUDE_PLUGIN_ROOT/scripts/codex-companion.mjs"
else
  COMPANION="$HOME/.claude/plugins/marketplaces/openai-codex/plugins/codex/scripts/codex-companion.mjs"
fi
[ -f "$COMPANION" ] && echo "CODEX_COMPANION: $COMPANION" || echo "CODEX_COMPANION: missing"
```

`CODEX_COMPANION: missing` → stop and report the missing runtime. Do not guess a versioned cache path.

## Authority contract

- Resolve the active workspace authority contract before launch. It governs read/write mode, credentials, external actions, production changes, destructive operations, and human gates.
- Include the exact contract in any delegated prompt that may reach those surfaces; a child runtime may not inherit it automatically.
- Without a workspace contract, omit `--write`, keep the task read-only, and stop before external effects.
- Write-capable work runs in a clean isolated branch, worktree, or scratch workspace. The parent reviews the diff before integration.

## Canonical invocation

Run from the target repository:

```bash
cd <target-repo> && node "$COMPANION" task "<prompt>"
```

Supported routing flags include `--background`, `--write`, `--resume-last`, `--fresh`, `--model <model>`, and `--effort <level>`. Pass the prompt as one quoted argument. Leave model and effort unset unless the task or routing contract specifies them.

No `--write` means read-only. Add it only when the active workspace contract authorizes edits. Use one `task` call per delegated handoff; do not mix companion setup, review, status, or cancellation commands into that handoff.

## Resume and background work

- `--resume-last` selects the latest resumable thread for the companion session, falling back to the target workspace only when no session id exists. Run it from the intended slice workspace.
- `--fresh` starts a new thread and requires the full prompt.
- Background workers outlive the launching shell. Make the task write a report or committed handoff, and observe that deliverable plus worker liveness.
- A later shell process may not share the launcher's in-memory job registry. A "No job found" status response is not proof that the worker failed.
- Recover prose from the matching Codex rollout only after binding it to the recorded thread id. Never print stored request bodies because they may contain sensitive prompt content.
- If a worker is dead and exact thread binding is unavailable or ambiguous, start a fresh task from the intended workspace with full context.

## Forwarding rules

- Preserve the user's task text apart from explicit runtime flags.
- Read-only review, diagnosis, research, and questions omit `--write`.
- Implementation uses `--write` only when authorized and isolated.
- Return the companion's stdout unchanged to the calling workflow; review artifacts and diffs separately before integration.
- Do not infer runtime identity from the agent's self-report. Use launcher/runtime metadata when vendor or model matters.

## Native plugin entry points

When the installed Claude plugin exposes native commands, prefer its documented review, adversarial-review, rescue, and status surfaces. Use this contract for direct companion calls and for runtimes that need an explicit portable invocation shape.

## Traps

- Run the helper with the shell working directory set to the target repository.
- A stale long-running Codex app server can retain an older binary after an upgrade. Verify the installed CLI and restart only the stale broker processes before retrying the same task.
- Long prompts must remain one argv; build them with a single-quoted heredoc.
- Never hand-edit companion job state. Reconcile liveness and rollout evidence, then resume exactly or start fresh.
