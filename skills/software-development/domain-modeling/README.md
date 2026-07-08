# domain-modeling — divergent fork of mattpocock/skills

Vendored from [mattpocock/skills → skills/engineering/domain-modeling](https://github.com/mattpocock/skills/tree/main/skills/engineering/domain-modeling) (v1.1.0 body, verbatim below the fork block), then extended with the `<target-repo>` block. Adopted as an owned fork on 2026-07-08, superseding the retired `grill-with-docs` fork (now in `skills/deprecated/`) as the home of target-repo routing.

## Why it forked

- **Our addition**: the `<target-repo>` gate — a grill/triage/wayfinder session may run from an orchestration profile (e.g. the matias Hermes profile) while the plan belongs to a product repo; the gate resolves that target on explicit signals only and routes ALL exploration and doc writes (`CONTEXT.md`, `docs/adr/`) to the target clone. This machinery is specific to Jorge's fleet and will never exist upstream.
- Routing lives HERE (not in a grill-with-docs wrapper) because every composition point — upstream's one-line `grill-with-docs`, `triage` step 4, `wayfinder` charting and ticket resolution — invokes `/domain-modeling` directly, and doc writes happen only in this skill. Decided by two-vendor counsel, 2026-07-08 (3 rounds, converged).

## Who consumes it

- **matias profile only.** Product repos self-grill (cwd = target), so they vendor upstream `domain-modeling` verbatim — the gate would be inert machinery there. Other orchestration profiles may adopt this fork later.

## Maintenance

- **Do not** run `sync-vendored-skills` update flows against mattpocock/skills for this skill — this repo is its source of truth (classifies `OWN-REPO`).
- Port duty: on each upstream domain-modeling release, hand-port improvements into the body below the `<target-repo>` block. Keep the frontmatter `description` identical to upstream's — it is the model-invocation trigger; changing it perturbs when the skill auto-fires.
- `CONTEXT-FORMAT.md` and `ADR-FORMAT.md` ship with the skill (relative links in the body); keep them synced with upstream's copies.
