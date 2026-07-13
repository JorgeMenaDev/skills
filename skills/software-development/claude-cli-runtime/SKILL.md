---
name: claude-cli-runtime
description: Claude Code headless runtime contract. Use when a non-Claude runtime delegates one task, review, question, or one-vendor second opinion to Claude/Fable. Two-vendor adversarial review belongs to counsel.
version: 1.0.0
mutating: true
writes_to: ["target workspace only when the active workspace contract authorizes write-capable execution"]
---

# Claude Code Runtime

Call Claude Code headlessly from a non-Claude runtime with one canonical command shape.

## Contract

- Resolve the active workspace authority contract before composing the prompt. It governs writes, credentials, external actions, production changes, destructive operations, and human gates. Include the exact contract in any delegated prompt that may reach those surfaces.
- Without a workspace contract, use the read-only tool set and stop before external effects.
- Run from the target repository so Claude discovers its local instructions.
- Capture the returned session id; it is the only reliable follow-up handle.

## Canonical invocation

```bash
cd <target-repo> && claude -p "<prompt>" --output-format json
```

- The prompt is positional, or arrives on stdin. There is no `--prompt`, `--message`, or `--task` flag.
- `-p` / `--print` is non-interactive mode; JSON output requires it.
- For a long prompt, build one quoted argument with a single-quoted heredoc.
- Allow minutes for tool-using turns.

Successful output is one JSON object. Read `.result`, require `.is_error == false` and `.subtype == "success"`, and preserve `.session_id`. A non-empty `.permission_denials` means the requested tool authority was insufficient.

## Follow-ups

```bash
cd <target-repo> && claude -p "<follow-up>" \
  --resume <session_id> --output-format json
```

Use the explicit session id. `--continue` selects the most recent conversation in the working directory and races with parallel work.

## Tool authority

| Intent | Flags |
|---|---|
| Review, research, question, second opinion | `--tools "Read,Grep,Glob"` |
| Authorized repository edits | `--permission-mode acceptEdits` |
| Authorized edits plus named shell commands | `--permission-mode acceptEdits --allowedTools "Bash(git *),Bash(npm *)"` |

In print mode nobody can answer a permission prompt, so choose flags from the active workspace contract before launch. Use `bypassPermissions` only in a disposable sandbox when that contract permits it.

## Piping and structured output

```bash
git diff main | claude -p "Review this diff. Report concrete defects with file:line." \
  --output-format json --tools "Read,Grep,Glob" | jq -r '.result'
```

Stdin is context; the positional prompt remains the instruction. Use `--json-schema '<schema>'` when the caller requires validated structured output.

## Model and effort

Leave `--model` unset to use runtime configuration. Override only when the task or routing contract names a model. Likewise, pass `--effort` only when required by that contract.

## Traps

- Run `claude --help` before using any flag not documented here.
- `--bare` restricts authentication sources and can break subscription-backed sessions.
- A sandbox must allow Claude's network access and its runtime home writes.
- Plain `claude` opens an interactive UI and hangs a headless caller; always use `-p`.
- For long background work, prefer a prompt that writes a report file so completion is observable.
