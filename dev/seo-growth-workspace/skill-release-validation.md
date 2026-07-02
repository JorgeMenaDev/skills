# Skill Release Validation

Use for `release-dogfood`: testing this skill inside a real target repo before publishing it.

This mode validates the skill, not the target site's SEO backlog. It should expose friction in instructions, install flow, adapters, phase sequencing, and proof requirements.

## Ground Rules

- Do not deploy, push, commit, mutate admin dashboards, mutate production data, request indexing, send external submissions, or edit app code unless the user explicitly changes scope.
- Prefer repo, public URL, existing `.seo`, and UI-safe evidence.
- Do not create or edit `.seo/backlog.md` unless the user explicitly asks for a real SEO operation pass.
- Mark constrained phases as `partial` or `blocked`; do not force OAuth, dashboard export, or production mutation to make the report look complete.
- Write one dated report in `.seo/reports/skill-dogfood-YYYY-MM-DD.md` and one short `.seo/log.md` handoff.

## Phase Statuses

Use these statuses for each phase:

| Status | Meaning |
| --- | --- |
| `complete` | Phase was exercised with enough repo, public, or existing workspace evidence |
| `partial` | Phase was exercised but constrained by no-auth, no-mutation, or missing data |
| `blocked` | Phase could not be usefully exercised without user input or external access |
| `not applicable` | Phase does not fit the target site type, with evidence |

## Dogfood Flow

1. Validate the installed skill copy:

```bash
bun .agents/skills/seo-growth-workspace/scripts/validate-skill.mjs
```

2. Run the installed release evaluator:

```bash
bun .agents/skills/seo-growth-workspace/scripts/evaluate-release.mjs --json --profile-root target=.
```

3. Load `phase-architecture.md` and classify the target.
4. Read existing `.seo` state without normalizing it unless writes are allowed.
5. Exercise every phase: classification, technical, metadata, schema, measurement, conversion, content, pSEO, local, authority, reporting.
6. Separate real target SEO observations from skill frictions.
7. Map each skill friction to a source file or section that should change.

## Report Shape

Use `templates/skill-dogfood-report.md`.

Every report should include:

- target root and installed skill path,
- constraints honored,
- commands run,
- phase coverage table,
- skill frictions with source file pointers,
- real SEO observations separated from skill issues,
- incomplete work and limitations.
