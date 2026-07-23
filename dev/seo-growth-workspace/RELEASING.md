# Releasing seo-growth-workspace

The release flow introduced in v6 (skills#145). No criterion matrix, no attestations, no gate-results artifacts — deterministic behavior is guarded by fixtures; prose is guarded editorially.

## Every release

1. **Fixtures green**: `node dev/seo-growth-workspace/check-skill.mjs` — structural check, golden fixtures, and the loop-state suite. It must exit 0.
2. **CHANGELOG entry**: add a `## <version>` section at the top of `skills/growth/seo-growth-workspace/CHANGELOG.md` and set the matching `version:` in SKILL.md frontmatter (check-skill enforces the sync).
3. **Editorial pass on prose changes**: hunt no-ops sentence by sentence; most prose that fails should go, not be rewritten. New normative clauses obey design rule 4 (judgment failed twice on the same point with bad SEO consequences) — otherwise the fix is a fixture, a logged judgment, or nothing.
4. **PR + merge**, then consumers propagate through their normal `npx skills` update flow. Workspaces reconcile via the upgrade pass in `references/operating.md` — never bulk, never unattended.

## Adversarial review — only when it pays

Mandatory for changes to script behavior (especially `scripts/loop-state.mjs` — it is serialization law) or to any of the four outcome-protecting invariants (no silent dry exits; no certificate under drift or stale coverage; no Done without evidence; no publish past integrity gates). Verify every finding against the real contract before fixing; reject findings that re-legislate judgment. Doc-only releases do not require it.

## Field friction

Edge cases discovered by live workspaces become fixtures in `fixtures/loop-state/` (or notes on the tracking issue), not clauses and not same-day releases. Regenerating a golden fixture is always a deliberate act — name the reason in the commit.

## History

Release-run records (`2026-*-release-run.md`) and archived gate-results (`../archive/seo-growth-workspace/`) document the v3–v5 harness era; they are history, not process.
