---
name: grok-cli-runtime
description: xAI Grok auth and quota doctrine for any harness that runs the `grok` binary — T3 Code's `grok` provider instance, a headless `grok -p` sidecar, or a cloud runner seeded from GROK_AUTH_B64. Use when a Grok run fails with 401, 402, or 403, when Grok output is empty or DOA, or before any `grok login`.
version: 2.1.0
mutating: true
writes_to: ["~/.grok/auth.json during explicit auth recovery", "configured encrypted credential store during explicit deposition", "GROK_AUTH_B64 during explicit cloud seeding"]
---

# Grok Auth And Quota

Every lane runs the **same `grok` binary** against the same `$GROK_HOME` (default `~/.grok`) and the same xAI quota. T3 Code spawns it as `grok agent stdio` (ACP) for the `grok` provider instance; a headless sidecar runs `grok -p`. The transport differs — the auth file, the billing, and the failure codes below do not.

**Invocation is not this skill's job.** Under t3-dispatch, T3 Code owns the process, session, and permissions: pick the `grok` row in `docs/agents/delegation.md`. This skill is what to do when that run comes back red.

## Read the failure code before you touch anything

- **`401`** — missing or invalid authentication. Real auth problem; continue to the gate.
- **`402 Payment Required`** (`Grok Build usage balance exhausted`) — **quota, not auth.** The credential is valid and there is nothing to recover: no probe, no rotation, and **never `grok login`**. Logging in again cannot buy quota, and it risks a working auth file to fix a billing condition. Read the reset time from the provider usage window and route the task to another `delegation.md` row until then.
- **`403 permission-denied`** — xAI rejected the selected credential or team for that endpoint. Wrong principal/policy, a stale cloud seed, or transient provider-side state. It does **not** by itself prove a lapsed subscription.

Auth precedence in the CLI: per-model `api_key` → per-model `env_key` → active session token → global `XAI_API_KEY`. A plain global key does **not** override a working OAuth session. Treat `auth.json` as an opaque whole file: never extract, merge, or document its fields.

## Empty output is a failure to diagnose, never an empty answer

A failed run still exits the JSON contract. It prints `{"type":"error","message":"…"}` with exit 1 and carries **no** `.text` and **no** `.stopReason`. A caller that reads only `.text` gets `null` and reports "no assistant output" — indistinguishable from a model that said nothing. Observed 2026-08-04: a quota exhaustion presented as a mystery DOA for hours.

**Check `.type` before `.text`. The reason is always in `.message`.** Exit code cuts both ways: a refusal or tool loop exits **0** with real `.text`, so exit 0 is not proof of a finished reply either — check `.stopReason` is `end_turn` (or the older `EndTurn`).

## Auth safety gate

1. Pin the effective home: `GROK_HOME=${GROK_HOME:-$HOME/.grok}`. Inspect config for per-model `api_key` / `env_key`; do not infer precedence from the shell environment alone.
2. Identify the failing lane. T3 Code's `grok` instance, a local `grok -p` sidecar, a repo-secret-backed cloud runner, a container with a different home, and Cursor's Grok models are separate lanes. Probe the failing lane with a real chat; a models listing is not proof.
3. Run the probe below with the exact home, model, and CLI version that lane uses. Validate `.stopReason` is `end_turn` (or `EndTurn`) and `.text`, not only exit 0. If it returns `{"type":"error"}`, classify `.message` first — a `402` **leaves this gate immediately**.
4. On `403`, retry the same preserved credential before rotating it, and check xAI service status. A credential that later succeeds without changing bytes proves transient authorization, not stale auth. On cloud-only failure, compare the seeded file fingerprint with the probed local file without printing either.
5. **STOP before `grok login`.** Preserve the complete current auth file in the configured encrypted credential store first. Login is recovery after the same credential stays red — never the first response to a 403.
6. After login, repeat the probe and deposit the complete resulting auth file. Replace `GROK_AUTH_B64` only from a credential whose probe passed; a failed probe preserves the last known-good repo secret.

Minimal real chat probe:

```bash
command -v grok >/dev/null 2>&1 && GROK=grok || GROK="$HOME/.grok/bin/grok"
env -u XAI_API_KEY GROK_HOME="${GROK_HOME:-$HOME/.grok}" \
  "$GROK" -p "Reply only OK" -m grok-4.6 --effort low --output-format json
```

## Gotchas

- Effort menu is model-specific. `grok-4.6` accepts `low|medium|high|xhigh` and defaults `high`. `grok-4.5` accepts `low|medium|high` and defaults `high`. Cursor's `grok-4.5-xhigh` is a different harness with different auth — do not pass Cursor ids to this binary.
- `GROK_AUTH_B64` is an AFK harness convention, not a native xAI CLI setting.
- Active-session precedence requires Grok CLI 0.2.66 or newer.
- Do not confuse lanes: Cursor also runs Grok models, through Cursor's CLI and Cursor's auth. A red Cursor lane says nothing about this one.
