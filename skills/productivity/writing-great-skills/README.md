# writing-great-skills — vendored from mattpocock/skills + local additions

This skill is a copy of [mattpocock/skills → skills/productivity/writing-great-skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills), plus our own additions. Keep both intact when updating.

**Last synced:** upstream commit `16a2a5cd00b4416f673f4ff38c7971a04dd708e7` (2026-07-06).

## What's Matt's vs ours

| File | Provenance |
|---|---|
| `SKILL.md` | Matt's, verbatim — **except** the two sections at the bottom: `## Reliability Patterns` and `## Review Checklist` (ours) |
| `GLOSSARY.md` | Matt's, verbatim |
| `PATTERNS.md` | Ours entirely — does not exist upstream |
| `README.md` | Ours (this file) |

## How to update to Matt's latest

1. Clone/fetch upstream: `git clone --depth 1 https://github.com/mattpocock/skills.git`
2. Copy upstream `SKILL.md` and `GLOSSARY.md` over ours, wholesale.
3. Re-append our two sections (`## Reliability Patterns`, `## Review Checklist`) to the end of `SKILL.md` — take them from git history or the pre-update copy.
4. Leave `PATTERNS.md` untouched.
5. Sanity check: `diff <upstream SKILL.md> SKILL.md` should show **only** our two appended sections; `GLOSSARY.md` should be identical.
6. Update the **Last synced** commit hash above, commit, push.

If Matt has meanwhile edited a region we've also touched (i.e. he adds sections at the bottom of `SKILL.md`), place his content before ours and keep our sections last.
