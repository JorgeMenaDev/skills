# GitHub Copilot CLI chair adapter (counsel)

Read the portable protocol first: `../SKILL.md`.

This note is for when a **GitHub Copilot CLI** agent chairs a counsel. It maps
the skill's two logical seats (`openai`, `anthropic`) onto Copilot's `task`
sub-agent tool. Nothing here changes the portable contract.

## Runtime facts this adapter relies on

Copilot CLI exposes a `task` tool that launches sub-agents in separate context
windows:

- `agent_type: general-purpose` — full toolset (reads sources, writes files).
- `model` override — reaches an OpenAI flagship (e.g. `gpt-5.5`) and an
  Anthropic flagship (e.g. `claude-opus-4.8`): two genuine vendors.
- `reasoning_effort` override — `high` / `xhigh`.
- `mode: background` — runs concurrently; the chair is notified on completion
  and reads results with `read_agent`. Multiple background agents launched in
  one assistant turn run in parallel.
- `read_agent` / `list_agents` report each agent's **backing `model`** — a
  chair-readable runtime signal, independent of anything the seat writes.
- `task` sub-agents are **stateless**: there is no resume for a completed agent.

## Capability fence — run counsel only if ALL hold

1. Both vendor seats can be launched concurrently (`mode: background`, same turn).
2. The chair can wait for both without reading either result mid-flight.
3. The chair can read each agent's backing `model` from runtime metadata (below).

If any fails, **do not call it a counsel** — degrade per the naming table.

## Seat launch

One `task` call per seat, in the **same assistant turn** (parallel, blind):

| Seat | `model` (default today) | `reasoning_effort` |
|---|---|---|
| openai | `gpt-5.5` | `high` (`xhigh` for an especially hard call) |
| anthropic | `claude-opus-4.8` | `high` (`xhigh` for an especially hard call) |

`agent_type: general-purpose`, `mode: background`. The model **strings are
defaults, not the contract** — the contract is "current OpenAI flagship + real
Anthropic/Claude-family flagship". Update the strings when the model menu
changes.

## Prompt & report file

- Pass the SKILL.md **reviewer prompt verbatim**, filling `{proposal path}`,
  `{source paths}`. Inside that prompt's write-path line
  (`{DIR}/review-<seat>-r{ROUND}.md`) the chair substitutes `{DIR}`, `{ROUND}`,
  and the `<seat>` token per launch → `review-openai-r{ROUND}.md` /
  `review-anthropic-r{ROUND}.md`. Without per-seat substitution both seats write
  the same path and collide.
- On rounds ≥2, include the prompt's conditional `{Round ≥2: … re-litigate a
  rejection only with new evidence}` line.
- **Additionally** (a chair convention, on top of the verbatim prompt) require
  each report to open with:
  `Seat: <seat> / model: <string> / vendor: <family>`. This is a *corroborating*
  record only — vendor authority is the chair-read metadata below.

## Vendor attestation — chair-read, not seat self-report

A stale/unknown `model` string may silently substitute a default, and a
stateless seat can only echo the string it was *asked* for — so **seat
self-report cannot establish vendor**. After both agents finish:

1. Read each agent's backing `model` from `read_agent` / `list_agents` metadata.
2. Map string → family: `gpt-*` / `o*-*` → **OpenAI**; `claude-*` → **Anthropic**.
   A model string that is **present but unrecognized** is **un-attestable** —
   fence/degrade, never guess the vendor.
3. The seat's self-reported header is corroborating; on mismatch the runtime
   metadata wins.

## STOP gate, completion signal, seat-down

- Wait for **both** agents (completion notifications) before reading either
  report. Do not read the first-returning seat and start synthesizing while the
  other runs (anchoring).
- Completion notification is the *trigger*; the **report file is the
  authoritative artifact** — validate it: exists, non-empty, ends with one
  allowed verdict line (`SHIP AS-IS` / `SHIP WITH CHANGES:` / `RETHINK:`).
- **Fallback:** if an agent completed and returned a valid report as its final
  message but wrote no file, save that returned message to the report path
  *before* any seat-down ruling (matches SKILL.md's "otherwise return the report
  as the final message for the chair to save").
- A seat is **down** when its `task` agent ends `failed` / `cancelled` / times
  out, **or** produced neither a valid file nor a valid returned report. Do
  **not** relaunch a down seat as the same vendor to fake a pair — degrade per
  the naming table and record which seat was down.

## Naming — label by chair-read vendors of the VALID reports

| Valid reports | Label |
|---|---|
| 2, resolving to **{OpenAI, Anthropic}** | **counsel** |
| exactly 1 valid | **second opinion** (name the vendor) |
| ≥2 valid, all OpenAI | **OpenAI counsel-style review** |
| ≥2 valid, all one non-OpenAI vendor | **second opinion** (name the vendor) |
| any pair NOT {OpenAI, Anthropic}, or any un-attestable seat | degrade / flag — not a counsel |
| 0 valid | **no review** — abort |

## Rounds ≥2

`task` sub-agents are stateless → relaunch fresh each round. Carry **all prior
rounds' findings + dispositions** in the next proposal draft's appendix
(SKILL.md's appendix protocol) so a fresh seat has full context — this makes
relaunch equivalent to resume.

## Chair duties (unchanged)

- STOP gate: both valid reports (or explicit seat-down) before synthesis.
- Disposition table owned by the chair; the chair rules on every finding.
- Secrets: existence checks only; never pass credential values into prompts.
