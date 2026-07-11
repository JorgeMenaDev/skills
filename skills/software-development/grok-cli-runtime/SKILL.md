---
name: grok-cli-runtime
description: Runtime contract for delegating work to xAI's Grok Build CLI (grok-4.5) as a headless sidecar — exploration, review, structured output, or isolated implementation. Use when a task or skill routes to the grok engine/seat, or the user asks to spawn Grok directly.
version: 1.0.0
mutating: true
writes_to: ["target workspace only in write-capable mode"]
---

# Grok CLI Runtime

Contract for calling **Grok Build CLI** (`~/.grok/bin/grok`, on PATH as `grok`) from another agent. Default model **`grok-4.5`** (500k context, $2/M in $6/M out), default effort **`high`** (the model's own default; menu: `low|medium|high`). All mechanics below were proven live 2026-07-12.

## Contract

- Grok is a **sidecar**: an external `grok -p` headless process with its own session store (`~/.grok/sessions`), tools, and auth. The parent agent reviews everything before integration.
- Read-only is the default posture: restrict tools with `--tools "read_file,grep,list_dir"`.
- Write-capable runs only in an isolated branch, worktree (`--worktree`), or scratch workspace — never a dirty shared checkout.
- Grok never receives secrets, production mutations, external sends, or final-click authority.
- Auth is Jorge's **X Premium+ OAuth** in `~/.grok/auth.json` (7-day tokens, auto-refresh via refresh_token). `XAI_API_KEY` (console.x.ai, metered credits) takes precedence when exported — the CI/seed lane. A `403 permission-denied ... chat endpoint` means the auth lane lost its entitlement (subscription lapsed / wrong account), not a bug.

## Preamble

```bash
command -v grok >/dev/null 2>&1 && GROK=grok || GROK="$HOME/.grok/bin/grok"
$GROK --version || echo "GROK: missing"
```

`GROK: missing` → stop and report. Version proven: 0.2.93.

## Launch recipes (proven)

Single-turn, JSON result (parse `.text`; `.sessionId` is the resume handle):

```bash
$GROK -p "<prompt>" -m grok-4.5 --effort high --output-format json
```

Structured output — returns validated `.structuredOutput` (counsel verdicts, fan-out results):

```bash
$GROK -p "<prompt>" -m grok-4.5 --effort high \
  --json-schema '{"type":"object","properties":{...},"required":[...]}'
```

Read-only exploration/review of a repo (run from the repo; allowlist read tools):

```bash
cd <repo> && $GROK -p "<explore/review prompt>. Do not modify anything." \
  -m grok-4.5 --effort high --tools "read_file,grep,list_dir" --max-turns 20 \
  --output-format json
```

Write-capable implementation — isolated worktree, auto-approved tools, guarded by `--deny`:

```bash
cd <clean-isolated-workspace> && $GROK -p "<bounded change>. Stop before external side effects." \
  -m grok-4.5 --effort high --always-approve --deny "Bash(git push*)" --deny "Bash(sudo*)" \
  --output-format json
```

Multi-call context (proven retention): mint a UUID, create with `-s`, resume with `-r`:

```bash
SID=$(python3 -c "import uuid;print(uuid.uuid4())")
$GROK -p "<phase 1>" -m grok-4.5 -s "$SID" --output-format json
$GROK -p "<phase 2, same context>" -m grok-4.5 -r "$SID" --output-format json
```

## Gotchas

- Headless is `-p` (single prompt per process); a fresh session per call unless `-s`/`-r` is used.
- `--tools`, `--disallowed-tools`, `--max-turns` are headless-only flags.
- `--disallowed-tools "Agent"` blocks subagent spawning; use for bounded review seats.
- Effort menu is model-specific (`grok inspect` / models cache); grok-4.5 accepts `low|medium|high`, defaults high — don't invent `xhigh` here (that id belongs to Cursor's `grok-4.5-xhigh` lane, a different harness).
- Exit code is 0 even for refusals; check `.stopReason == "EndTurn"` and the content, not just exit.
- Do not confuse lanes: `cursor-subagent` also runs Grok models but through Cursor's CLI and auth; this skill is the native xAI lane.
