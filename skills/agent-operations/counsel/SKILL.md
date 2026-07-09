---
name: counsel
description: Convene a two-vendor counsel — flagship reviewers from different vendors at high effort — to adversarially review an important architecture/design decision or proposal before committing. Use when the user says "counsel", wants a second opinion on a plan, or a hard-to-reverse decision deserves cross-vendor review.
version: 1.1.0
---

# Counsel (portable protocol)

Two flagship reviewers from **different vendors** attack a written proposal in parallel; you **chair**: synthesize their findings, revise, re-convene until verdicts converge — **max 3 rounds**. The chair rules on every finding and owns the final call; the seats advise.

Runtime launch mechanics live in adapters — not here:

- Claude Code: consumer-local `.claude/skills/counsel/SKILL.md`
- Codex / GPT chair notes: `references/codex-chair.md`
- GitHub Copilot CLI: `references/github-copilot-chair.md`

## Naming (do not overclaim)

| Label | When |
|---|---|
| **counsel** | Two vendors successfully participated |
| **second opinion** | Only one vendor/family participated (engine down or unavailable) |
| **OpenAI counsel-style review** | Multiple OpenAI reviewers, no Anthropic seat |

## Contract

- Two seats, two vendors, every round. An engine down ⇒ degrade loudly: a one-seat run is a *second opinion*, not a counsel — name that in the record. Each seat's vendor must be established by evidence the chair can verify (runtime metadata, launch surface), **not** by the seat self-reporting its own model — where one tool launches both seats and only a model string differs, self-report can silently echo a substituted default and fake the second vendor.
- The proposal is a **file**, and it names the source paths reviewers verify claims against — reviewers judge evidence, not prose.
- Every finding gets a **disposition**: accepted → visible revision in the next draft; rejected → one-line justification in the record. A finding about a *fact* (proposal contradicts a file) is settled by the chair re-reading the file, never by preference.
- Seats read; only the chair writes the proposal.
- Secrets never enter prompts or reports — existence checks only.

## Bench (logical seats)

Edit this table when flagships change. Adapters map these seats onto concrete launch tools.

| Seat | Vendor family | Role |
|---|---|---|
| openai | OpenAI flagship (e.g. gpt-5.5, high/xhigh effort) | Adversarial reviewer |
| anthropic | Anthropic flagship (e.g. opus, high/xhigh effort) | Adversarial reviewer |

## The loop

1. **Setup** — create a session scratchpad dir; state comes from disk, not memory:
   ```bash
   DIR="<session-scratchpad>/counsel/<decision-slug>" && mkdir -p "$DIR"
   ROUND=$(( $(ls "$DIR"/proposal-v*.md 2>/dev/null | wc -l | tr -d ' ') + 1 ))
   echo "DIR: $DIR"; echo "ROUND: $ROUND"
   ```
2. **Draft** `proposal-v$ROUND.md`: the decision, verified current state, design, alternatives considered, risks, sizing — plus source paths seats should verify against. Round ≥2: append prior findings + disposition table and "what changed in this draft".
3. **Convene both seats in parallel**, same reviewer prompt (below), each blind to the other. Round 1 spawns fresh; rounds ≥2 resume each seat's own session when the runtime supports it (else relaunch fresh — appendix protocol makes both modes equivalent).
4. **STOP — wait for both reports before writing a word of synthesis.** Ruling on the early return anchors the round on one vendor and reduces the counsel to an echo.
5. **Synthesize**: merge findings, mark agreements/conflicts, write the disposition table. Verdict gate:
   - Both `SHIP AS-IS`, or every accepted change already incorporated → **CONVERGED**, go to 6.
   - Any accepted BLOCKER or a `RETHINK` verdict → material revision: back to 2.
   - `ROUND` = 3 → **EXHAUSTED**: chair rules; standing objections recorded as **DISSENT**.
   - Findings all rejected with justification → do not re-convene; rule now.
6. **Deliver** the counsel record (format below) ending with "Your actions". Decision that sticks → vault ADR/entity note per vault rules, linking the record.

## Reviewer prompt (both seats — fill `{}`)

> You are one seat of a two-vendor counsel reviewing an architecture proposal. Be adversarial and concrete — find what is wrong, missing, or over-engineered; verify every claim you can against the sources; do not praise.
> Read `{proposal path}`. Verify against: `{source paths}`. Never read or quote credential values — existence checks only.
> {Round ≥2: Your prior findings and their dispositions are in the proposal's appendix; re-litigate a rejection only with new evidence.}
> Report: numbered findings, each `severity (BLOCKER/MAJOR/MINOR) — claim it concerns — concrete fix`. End with one verdict line: `SHIP AS-IS` / `SHIP WITH CHANGES:` (list) / `RETHINK:` (why).
> Write the report to `{DIR}/review-<seat>-r{ROUND}.md` when the runtime can write files; otherwise return the report as the final message for the chair to save.

## Counsel record (deliverable to Jorge)

```
## Counsel: <decision> — <CONVERGED | DISSENT | EXHAUSTED> after N round(s)
| Round | openai verdict | anthropic verdict | Material changes |
Findings that changed the design: <bullets, seat-attributed>
Rejected findings + justification: <bullets>
Dissent (if any): <seat, objection, why the chair overruled>
Final proposal: <path>
```

If degraded: title the record `## Second opinion: …` (or `## OpenAI counsel-style review: …`) and say which seat was unavailable.

## Anti-patterns

- **Anchoring** — synthesizing from the first report while the second runs.
- **Rubber-stamp round** — re-convening with no material revision.
- **Chair abdication** — pasting a seat's review as the decision.
- **Echo bench** — both seats from one vendor because the other engine was down, still calling it counsel.
