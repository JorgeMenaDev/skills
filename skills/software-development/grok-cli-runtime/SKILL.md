---
name: grok-cli-runtime
description: Runtime contract for delegating work to xAI's Grok Build CLI (grok-4.5) as a headless sidecar — exploration, review, structured output, or isolated implementation. Use when a task or skill routes to the grok engine/seat, or the user asks to spawn Grok directly.
version: 1.0.2
mutating: true
writes_to: ["target workspace only in write-capable mode", "~/.grok/auth.json during explicit auth recovery", "configured encrypted credential store during explicit deposition", "GROK_AUTH_B64 during explicit cloud seeding"]
---

# Grok CLI Runtime

Contract for calling **Grok Build CLI** (`~/.grok/bin/grok`, on PATH as `grok`) from another agent. Default model **`grok-4.5`**, default effort **`high`** (menu: `low|medium|high`).

## Contract

- Grok is a **sidecar**: an external `grok -p` headless process with its own session store (`~/.grok/sessions`), tools, and auth. The parent agent reviews everything before integration.
- Read-only is the default posture: restrict tools with `--tools "read_file,grep,list_dir"`.
- Write-capable runs only in an isolated branch, worktree (`--worktree`), or scratch workspace — never a dirty shared checkout.
- Grok never receives secrets, production mutations, external sends, or final-click authority.
- Auth lives under `$GROK_HOME` (default `~/.grok`). Treat `auth.json` as an opaque whole file: never extract, merge, or document its fields. Current CLI precedence is per-model `api_key` → per-model `env_key` → active session token → global `XAI_API_KEY`; a plain global key does not override a working OAuth session.
- `401` means missing or invalid authentication. `403 permission-denied` means xAI rejected the selected credential or team for that endpoint; it can be a wrong principal/policy, a stale cloud seed, or transient provider-side authorization state. It does not by itself prove a lapsed subscription.

## Auth safety gate

1. Pin the effective home: `GROK_HOME=${GROK_HOME:-$HOME/.grok}`. Inspect config for per-model `api_key` / `env_key`; do not infer precedence from the shell environment alone.
2. Identify the failing lane. Local OAuth, a repo-secret-backed cloud runner, a container with a different home, and Cursor's Grok models are separate lanes. Inspect the failing lane's real chat smoke; a models listing is not proof.
3. Run the minimal real chat probe below with the exact home, model, and CLI version used by that lane. Validate `.stopReason == "EndTurn"` and `.text`, not only exit 0.
4. On `403`, retry the same preserved credential before rotating it and check xAI service status. A credential that later succeeds without changing bytes proves transient authorization, not stale auth. On cloud-only failure, compare the seeded file fingerprint with the probed local file without printing either.
5. **STOP before `grok login`.** Preserve the complete current auth file in the configured encrypted credential store first. Login is recovery after the same credential remains red, not the first response to a 403.
6. After login, repeat the real chat probe and deposit the complete resulting auth file. Replace `GROK_AUTH_B64` only from a credential whose probe passed; a failed probe preserves the last known-good repo secret.

Minimal real chat probe:

```bash
env -u XAI_API_KEY GROK_HOME="${GROK_HOME:-$HOME/.grok}" \
  $GROK -p "Reply only OK" -m grok-4.5 --effort low --output-format json
```

## Preamble

```bash
command -v grok >/dev/null 2>&1 && GROK=grok || GROK="$HOME/.grok/bin/grok"
$GROK --version || echo "GROK: missing"
```

`GROK: missing` → stop and report. Active-session precedence requires Grok CLI 0.2.66 or newer.

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
- `GROK_AUTH_B64` is an AFK harness convention, not a native xAI CLI setting.
- Do not confuse lanes: `cursor-subagent` also runs Grok models but through Cursor's CLI and auth; this skill is the native xAI lane.
