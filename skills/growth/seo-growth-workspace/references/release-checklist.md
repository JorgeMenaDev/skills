# Release Checklist

Use before publishing `seo-growth-workspace` to a registry such as `skills.sh`.

## Required Gates

Run source-repo gates from the skill source repository:

```bash
bun skills/growth/seo-growth-workspace/scripts/validate-skill.mjs
bun skills/growth/seo-growth-workspace/scripts/evaluate-release.mjs --json
```

Pass criteria:

- `validate-skill.mjs` exits successfully.
- `evaluate-release.mjs` reports `pass: true`.
- Score is at least `85/100`.
- No critical findings.
- No project-specific contamination in portable runtime files.
- No user-facing non-Bun JavaScript commands.

## Install/Replacement Gate

Before testing the skill in another repo, use the clean exporter instead of raw directory copy:

```bash
bun skills/growth/seo-growth-workspace/scripts/export-clean-skill.mjs --target /path/to/repo --dry-run
bun skills/growth/seo-growth-workspace/scripts/export-clean-skill.mjs --target /path/to/repo --force
```

If the target already has local-only or modified same-path files, the exporter will stop or report them. Move useful project-specific behavior into `.seo/adapters/` or rerun with `--force` only when replacement is intentional.

Run installed-repo dogfood gates from the target repository after install:

```bash
bun .agents/skills/seo-growth-workspace/scripts/validate-skill.mjs
bun .agents/skills/seo-growth-workspace/scripts/evaluate-release.mjs --json --profile-root target=.
```

## Scenario Gates

Inspect at least these six profiles before release:

| Profile | Expected proof |
| --- | --- |
| Product/content-engine repo | Existing `.seo` state routes to `operate`, `content-ops`, or `pseo-planning` without confusing app execution with SEO strategy |
| Marketing site | Bootstrap/technical phases prioritize HTML, metadata, schema, analytics, and CTA proof before content expansion |
| Compliance-heavy business site | Copy/content work respects proof, trust, compliance, and visible facts |
| Authenticated SaaS repo | Admin/auth evidence is captured before relying on dashboards, schedulers, or private data |
| Local or legal-service site | Local SEO, GBP, reviews, NAP, citations, and service pages are first-class when relevant |
| Local-business fixture | Synthetic local-business scenario routes through `local-seo` without requiring a real GBP login |

## Dry-Run Gates

Before deploy, prove at least one repo-local dry run without mutating unrelated files:

1. Copy or run against a temporary target root.
2. Run:

```bash
bun skills/growth/seo-growth-workspace/scripts/bootstrap-seo-workspace.mjs <target-root>
```

For an installed copy, use:

```bash
bun .agents/skills/seo-growth-workspace/scripts/bootstrap-seo-workspace.mjs <target-root>
```

3. Verify `.seo/README.md`, `.seo/context.md`, `.seo/backlog.md`, `.seo/audit.md`, `.seo/strategy.md`, `.seo/taxonomy.md`, `.seo/log.md`, `.seo/reports/`, `.seo/scripts/`, `.seo/pseo/`, and `.seo/backlinks/work-log.md`.
4. Confirm the dry run did not overwrite existing files.
5. Record command output and target type in the release run log.

## Manual Review

Before publishing:

- Review `git diff -- skills/growth/seo-growth-workspace`.
- Confirm release-only audit/run files are either intentionally included or excluded by the publish path.
- Confirm Google-facing guidance is dated where it may age.
- Confirm pSEO guidance still says plan early, publish late.
- Confirm the skill asks for explicit approval before production deploys, authenticated admin mutations, external submissions, or `skills.sh` publication.
