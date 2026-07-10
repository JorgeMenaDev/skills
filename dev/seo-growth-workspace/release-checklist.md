# Release Checklist

Use before publishing `seo-growth-workspace` to a registry such as `skills.sh`.

## Gate Status Convention

Record every gate below in the release run log as **PASS**, **FAIL**, or **WAIVED**:

- **PASS** — the gate ran and met its criteria; record the command and evidence.
- **FAIL** — blocks release until fixed or explicitly waived.
- **WAIVED** — requires a written rationale and an owner in the run log. Gates marked **blocking** can never be waived.
- A run log with any gate unset, FAIL, or "not yet done" is not a passing log. Do not publish from it, whatever the numeric score says.

## Required Gates

Both tools live in `dev/seo-growth-workspace/`, not inside the portable skill. Run from the skills repo root:

```bash
node dev/seo-growth-workspace/validate-skill.mjs
node dev/seo-growth-workspace/evaluate-release.mjs --json
```

Pass criteria:

- `validate-skill.mjs` exits 0.
- `evaluate-release.mjs` reports `pass: true`, score at least `85/100`, no critical findings.
- No project-specific contamination in portable runtime files.

To validate an exported copy, reroute the validator with `--skill-dir` (dev tooling is intentionally excluded from exports, so there is no installed-copy validator or evaluator command):

```bash
node dev/seo-growth-workspace/validate-skill.mjs --skill-dir /path/to/repo/.agents/skills/seo-growth-workspace
```

`evaluate-release.mjs` always scores the source tree; inspect consumer repos read-only from the source repo with `--profile-root name=/path/to/repo`.

## Install/Replacement Gate

The exporter is dev tooling too — use it instead of raw directory copy:

```bash
node dev/seo-growth-workspace/export-clean-skill.mjs --target /path/to/repo --dry-run
node dev/seo-growth-workspace/export-clean-skill.mjs --target /path/to/repo --force
```

If the target already has local-only or modified same-path files, the exporter stops or reports them. Move useful project-specific behavior into the workspace's `adapters/` or rerun with `--force` only when replacement is intentional.

## Hub-Migration Dogfood Gate (blocking — cannot be waived)

Empty fixtures prove scaffolding, not migration. Before release, run one real hub-migration rehearsal on a **disposable copy** of a real consumer:

1. Copy a real consumer repo (mature `.seo/`, installed skill copies, doc pointers) and a copy of its hub to a temp dir.
2. Run the doctor on both copies and record every finding:

```bash
node skills/growth/seo-growth-workspace/scripts/seo-doctor.mjs <consumer-copy> --domain <host>
node skills/growth/seo-growth-workspace/scripts/seo-doctor.mjs <hub-copy> --domain <host>
```

3. Rehearse `references/migrate-uninstall.md` end-to-end against the copies: migrate, strip, post-migration hygiene, re-doctor both ends.
4. Record PASS only when the final doctor runs are clean on both ends. Record every finding the rehearsal surfaced, fixed or filed.

## Scenario Gates

Inspect at least these six profiles before release; each row gets its own PASS/FAIL/WAIVED status in the run log:

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
2. Run the doctor first, then bootstrap (both ship in the portable skill, so installed-copy paths work too):

```bash
node skills/growth/seo-growth-workspace/scripts/seo-doctor.mjs <target-root>
node skills/growth/seo-growth-workspace/scripts/bootstrap-seo-workspace.mjs <target-root>
```

For an installed copy, the same scripts under `.agents/skills/seo-growth-workspace/scripts/`.

3. Verify `.seo/README.md`, `.seo/context.md`, `.seo/backlog.md`, `.seo/audit.md`, `.seo/strategy.md`, `.seo/taxonomy.md`, `.seo/log.md`, `.seo/reports/`, `.seo/scripts/`, `.seo/pseo/`, `.seo/backlinks/work-log.md`, and `.seo/config.json` with `"mode": "standalone"` and `"workspaceSchemaVersion": 1`.
4. Confirm the dry run did not overwrite existing files (preseed one file with sentinel content and byte-compare after a rerun).
5. Hub dry run — against a second temporary root:

```bash
node skills/growth/seo-growth-workspace/scripts/bootstrap-seo-workspace.mjs --hub --site example-com <hub-root>
```

Verify `.seo/config.json` with `"mode": "hub"`, `.seo/registry.md`, the full workspace set under `.seo/sites/example-com/`, the `REGISTRATION PENDING` line in the output, and no standalone workspace files at the hub root. Confirm a plain rerun against the hub root refuses (no silent mode conversion).

6. Record command output and target type in the release run log.

## Manual Review

Before publishing:

- Review `git diff -- skills/growth/seo-growth-workspace`.
- Confirm release-only audit/run files are either intentionally included or excluded by the publish path.
- Confirm Google-facing guidance is dated where it may age.
- Confirm pSEO guidance still says plan early, publish late.
- Confirm the skill asks for explicit approval before production deploys, authenticated admin mutations, external submissions, or `skills.sh` publication.
