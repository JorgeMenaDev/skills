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
node dev/seo-growth-workspace/command-inventory.mjs --verify
node dev/seo-growth-workspace/evaluate-release.mjs --json
```

Pass criteria:

- `validate-skill.mjs` exits 0.
- `command-inventory.mjs --verify` reports zero malformed/secret-argv entries and every executable row exits 0 from the generated foreign-CWD matrix.
- `evaluate-release.mjs` reports `pass: true`, score at least `85/100`, no critical findings, no zero-scored category, and no known findings.
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

## Disposable Registry Rehearsal (blocking — cannot be waived)

V3.1 does not activate or repair a live hub. Run the existing deterministic rehearsal only:

1. Build six synthetic hub site workspaces and a six-row canonical registry under a temp root.
2. Add an eight-row legacy inventory: six missing retired repo-local roots plus two recognized legacy-only sites.
3. Run the validator rehearsal and prove all row states are preserved and correctly classified:

```bash
node dev/seo-growth-workspace/validate-skill.mjs
```

PASS requires six canonical rows, eight legacy rows, six `stale_registry_row` findings, two `unmigrated_legacy_site` findings, zero false `candidate_workspace` findings, and realpath-deduplicated registry paths. Migration remains manual/terminal in v3.1.

## Plan/Action Safety Gate (blocking — cannot be waived)

The existing validator must prove direct bootstrap bypass, expired/tampered/mismatched/source-changed plans, replay, ambiguous identity, schema-ahead state, and generated symlink escape all fail before workspace writes. It must also prove:

- reviewed standalone/hub mode is plan-bound; a stamped standalone root cannot gain hub registry/sites, and the first site under an absent root requires an explicit reviewed `--hub`;
- grandfathered legacy site IDs are one safe filesystem segment, match the real workspace basename rather than the public Site cell, and all hub-site writes remain inside `.seo/sites`;
- a missing canonical route blocks the selected identity while missing legacy inventory remains non-routing;
- every generated-path ancestor is checked for dangling/escaping symlinks and writes remain inside the reviewed root;
- only the approved `GSC_CREDENTIALS_DIR=<path>` assignment RHS (or documented path form) is statted; arbitrary assignments and credential content are ignored;
- `adopt` writes only `config.json` on at least three exactly recognized files;
- `verify` performs zero writes;
- `repair` creates only the reviewed missing generated allowlist and preserves all existing/historical bytes;
- doctor writes only `--plan-output`, outside every scan root, and never emits credential content.
- two validator processes pass concurrently: plans bind the target and discovered inputs, not volatile unrelated entries under a shared system-temp parent.

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
2. Run the doctor first, write the reviewed plan outside the target/search roots, then bootstrap:

```bash
node "$SKILL_DIR/scripts/seo-doctor.mjs" <target-root> --domain example.com --decision create --plan-output <outside-root-plan>
node "$SKILL_DIR/scripts/bootstrap-seo-workspace.mjs" --plan <outside-root-plan> --action create --domain example.com <target-root>
```

For an installed copy, the same scripts under `.agents/skills/seo-growth-workspace/scripts/`.

3. Verify `.seo/README.md`, `.seo/context.md`, `.seo/backlog.md`, `.seo/audit.md`, `.seo/strategy.md`, `.seo/taxonomy.md`, `.seo/log.md`, `.seo/reports/`, `.seo/scripts/`, `.seo/pseo/`, `.seo/backlinks/work-log.md`, and `.seo/config.json` with `"mode": "standalone"` and `"workspaceSchemaVersion": 1`.
4. Confirm the dry run did not overwrite existing files (preseed one file with sentinel content and byte-compare after a rerun).
5. Hub dry run — against a second temporary root:

```bash
node "$SKILL_DIR/scripts/seo-doctor.mjs" <hub-root> --hub --site example-com --domain example.com --decision create --plan-output <outside-root-plan>
node "$SKILL_DIR/scripts/bootstrap-seo-workspace.mjs" --plan <outside-root-plan> --action create --domain example.com --hub --site example-com <hub-root>
```

Verify `.seo/config.json` with `"mode": "hub"`, `.seo/registry.md`, the full workspace set under `.seo/sites/example-com/`, the `REGISTRATION PENDING` line in the output, and no standalone workspace files at the hub root. Confirm a consumed-plan replay and direct plan-less rerun both refuse.

6. Record command output and target type in the release run log.

## Manual Review

Before publishing:

- Review `git diff -- skills/growth/seo-growth-workspace`.
- Confirm release-only audit/run files are either intentionally included or excluded by the publish path.
- Confirm Google-facing guidance is dated where it may age.
- Confirm the standard Performance report, rollout-limited Generative AI export, and unsupported AI-causality inference remain distinct.
- Confirm the Search generative AI include/exclude setting is described as an authenticated human-operated control, not a universal API or ranking lever.
- Confirm pSEO guidance still says plan early, publish late.
- Confirm the skill asks for explicit approval before production deploys, authenticated admin mutations, external submissions, or `skills.sh` publication.
- Confirm the release diff contains no schema-2 contracts, migration implementation, writer leases, live-hub mutation, or live install.
