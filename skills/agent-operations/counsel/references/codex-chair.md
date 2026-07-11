# Codex chair adapter (counsel)

Read the portable protocol first: `../SKILL.md`.

This note is for when **Codex** chairs (or sits) a counsel-style review.

## Capability check

Before calling the run a **counsel**:

1. Confirm you can launch an **OpenAI** seat (this runtime).
2. Confirm you can launch a real **Anthropic / Claude-family** seat in this environment.
3. If step 2 fails → degrade loudly to **second opinion** (or **OpenAI counsel-style review** if you spawn multiple GPT reviewers). Do not label it counsel.

## OpenAI seat defaults

- Default to `gpt-5.6-sol` with high reasoning effort.
- When the chair is already running in Codex and native subagents are available, use the native subagent tool. Do not shell out to `codex exec` merely to spawn another OpenAI seat.
- Native launch metadata is authoritative. If the native surface does not expose model/effort selection or attestation, record the seat as a native OpenAI seat and do not claim `gpt-5.6-sol`/high from self-report.
- Use the Codex CLI only from a non-Codex chair, when native subagents are unavailable, or when the run explicitly requires an exact model/effort that the native surface cannot select:
  ```bash
  codex exec -m gpt-5.6-sol -c model_reasoning_effort=high \
    --dangerously-bypass-approvals-and-sandbox < reviewer-prompt.md
  ```
- Write the report to `{DIR}/review-openai-r{ROUND}.md` (or `review-codex-r{ROUND}.md` if that naming is already in use — be consistent within one counsel dir).
- Prefer background/deliverable-first patterns when available so the report file is the completion signal.

On later rounds, resume the native seat with the runtime's native follow-up mechanism when supported. For a CLI seat, resume the pinned session id. Otherwise relaunch fresh; the proposal appendix preserves the round context.

## Anthropic seat from Codex

Only launch if the current Codex/Cursor/Hermes tool surface can actually spawn an Anthropic model. If it cannot, stop and degrade — do not invent a fake second vendor by prompting another GPT instance as "claude".

## Chair duties (unchanged)

- STOP gate: both reports (or explicit seat-down) before synthesis.
- Disposition table owned by the chair.
- Secrets: existence checks only.
