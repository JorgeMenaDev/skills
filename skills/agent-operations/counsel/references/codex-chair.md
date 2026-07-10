# Codex chair adapter (counsel)

Read the portable protocol first: `../SKILL.md`.

This note is for when **Codex / GPT-5.6-Luna** chairs (or sits) a counsel-style review.

## Capability check

Before calling the run a **counsel**:

1. Confirm you can launch an **OpenAI** seat (this runtime).
2. Confirm you can launch a real **Anthropic / Claude-family** seat in this environment.
3. If step 2 fails → degrade loudly to **second opinion** (or **OpenAI counsel-style review** if you spawn multiple GPT reviewers). Do not label it counsel.

## OpenAI seat defaults

- Prefer `gpt-5.6-luna` with high or xhigh reasoning effort.
- Write the report to `{DIR}/review-openai-r{ROUND}.md` (or `review-codex-r{ROUND}.md` if that naming is already in use — be consistent within one counsel dir).
- Prefer background/deliverable-first patterns when available so the report file is the completion signal.

## Anthropic seat from Codex

Only launch if the current Codex/Cursor/Hermes tool surface can actually spawn an Anthropic model. If it cannot, stop and degrade — do not invent a fake second vendor by prompting another GPT instance as "claude".

## Chair duties (unchanged)

- STOP gate: both reports (or explicit seat-down) before synthesis.
- Disposition table owned by the chair.
- Secrets: existence checks only.
