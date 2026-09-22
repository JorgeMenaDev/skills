# Releasing seo-growth-workspace

## Every release

1. **Check green:** `node dev/seo-growth-workspace/check-skill.mjs` must exit 0. It covers structure, links, script help, the golden fixtures in `fixtures/`, credential-free dry runs, and retired v7 terms.
2. **CHANGELOG entry:** add a `## <version>` section at the top of `skills/growth/seo-growth-workspace/CHANGELOG.md` and set the same `version:` in SKILL.md.
3. **Editorial pass on prose:** hunt no-ops sentence by sentence and delete what fails. Add a step before adding a warning.
4. **Run it for real** when a change touches `review.md` or a script: one review on a live site, read the report, and fix the instruction rather than the output.
5. **Push**, then consumers update through `npx skills update seo-growth-workspace`.

Regenerating a golden fixture is a deliberate act: name the reason in the commit.

## History

The `2026-*-release-run.md` records and the older validation docs describe the v3 to v7 harness. They are history, not process.
