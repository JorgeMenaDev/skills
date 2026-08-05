# writing-for-agents — vendored from mattpocock/skills + local additions

This skill is a copy of [mattpocock/skills → skills/productivity/writing-for-agents](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-for-agents), plus our own additions. Keep both intact when updating.

Formerly `writing-great-skills` — upstream renamed and restructured it in v1.2.0 (breaking, no alias): the reference now covers any document an agent consumes, `GLOSSARY.md` was merged into `SKILL.md`, skill-only mechanics moved to `SKILL-MECHANICS.md`, and the skill became model-invoked. Our fork followed the rename on 2026-08-05.

**Last synced:** upstream commit `0986eba` (2026-08-05, post-v1.2.0).

## What's Matt's vs ours

| File | Provenance |
|---|---|
| `SKILL.md` | Matt's, verbatim — **except** the two sections at the bottom: `## Reliability Patterns` and `## Review Checklist` (ours) |
| `SKILL-MECHANICS.md` | Matt's, verbatim |
| `agents/openai.yaml` | Matt's, verbatim |
| `PATTERNS.md` | Ours entirely — does not exist upstream |
| `README.md` | Ours (this file) |

## How to update to Matt's latest

1. Clone/fetch upstream: `git clone --depth 1 https://github.com/mattpocock/skills.git`
2. Copy upstream `SKILL.md`, `SKILL-MECHANICS.md`, and `agents/openai.yaml` over ours, wholesale.
3. Re-append our two sections (`## Reliability Patterns`, `## Review Checklist`) to the end of `SKILL.md` — take them from git history or the pre-update copy.
4. Leave `PATTERNS.md` untouched.
5. Sanity check: `diff <upstream SKILL.md> SKILL.md` should show **only** our two appended sections; the other Matt files should be identical.
6. Update the **Last synced** commit hash above, commit, push.

If Matt has meanwhile edited a region we've also touched (i.e. he adds sections at the bottom of `SKILL.md`), place his content before ours and keep our sections last.
