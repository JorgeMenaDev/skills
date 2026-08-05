# research — vendored from mattpocock/skills + local additions

This skill is a copy of [mattpocock/skills → skills/engineering/research](https://github.com/mattpocock/skills/tree/main/skills/engineering/research), plus our own additions. Keep both intact when updating.

Promoted from a vendored install in the Matias profile on 2026-08-05: the local copy had a deliberate edit (routing the background run through `crew-dispatch` for a durable crew record) that upstream will never carry, so it lives here as a fork.

**Last synced:** upstream commit `0986eba` (2026-08-05, post-v1.2.0 — upstream's `SKILL.md` unchanged since 2026-07-01; ours differs only by the edit below).

## What's Matt's vs ours

| File | Provenance |
|---|---|
| `SKILL.md` | Matt's — **except** the opening paragraph, which routes the run through the crew playbook (`crew-dispatch` + `docs/agents/delegation.md`) instead of a bare background agent |
| `agents/openai.yaml` | Matt's, verbatim |
| `README.md` | Ours (this file) |

## How to update to Matt's latest

1. Diff upstream `skills/engineering/research/SKILL.md` against ours.
2. Take upstream's body changes wholesale, then re-apply our crew-dispatch opening paragraph.
3. Copy `agents/openai.yaml` over ours, wholesale.
4. Update the **Last synced** commit hash above, commit, push.
