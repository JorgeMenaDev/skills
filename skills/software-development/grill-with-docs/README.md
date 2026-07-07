# grill-with-docs — divergent fork of mattpocock/skills

Originally vendored from [mattpocock/skills → skills/engineering/grill-with-docs](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs), then customised beyond reconciliation. Adopted here as a fully-owned fork on 2026-07-07.

## Why it forked

- **Our additions**: the `<target-repo>` resolution block (grill for a repo other than the one the session sits in, resolved via the AFK registry at `.agents/afk-pipeline/REGISTRY.md`), and doc writes routed to the target repo. This machinery is specific to Jorge's fleet and will never exist upstream.
- **Upstream moved away**: Matt later gutted `grill-with-docs` to a two-line wrapper around `/grilling` + `/domain-modeling` and deleted `ADR-FORMAT.md` / `CONTEXT-FORMAT.md`. There is no upstream to sync with anymore — this fork keeps the rich pre-refactor body.

## Maintenance

- **Do not** run `sync-vendored-skills` update flows against mattpocock/skills for this skill — this repo is its single source of truth now.
- Worth an occasional glance at upstream's `grilling` and `domain-modeling` skills: improvements to those may be worth porting into this body by hand.
- Consumers install it from `JorgeMenaDev/skills` via the `skills` CLI like any other skill here.
