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
- newly added or removed shallow-discovery registry paths invalidate a reviewed plan before source verification; existing registry contents remain source-bound;
- unrelated canonical stale routes stay visible as findings without blocking a different normalized identity; same-identity stale routes remain blocking;
- every generated-path ancestor is checked for dangling/escaping symlinks and writes remain inside the reviewed root;
- only the approved `GSC_CREDENTIALS_DIR=<path>` assignment RHS (or documented path form) is statted; arbitrary assignments and credential content are ignored;
- `adopt` writes only `config.json` on at least three exactly recognized files;
- `verify` performs zero writes;
- `repair` creates only the reviewed missing generated allowlist and preserves all existing/historical bytes;
- `create-optional` creates only the reviewed absent optional allowlist, is plan-bound and replay-safe, and does not change generated-file drift or repair semantics;
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

### Enumerated v4 scenario gates (blocking — cannot be waived)

These gates are executed at the slice-7 release. Record each numbered gate as PASS or FAIL with the evidence path in the canonical gate-results artifact; WAIVED is not permitted.

1. **GBP `not_visible` + gated mutation**
   - Inputs: a dated local-business fixture or approved live observation in which one competitor attribute is not publicly visible; a proposed owned-profile category change with before evidence; and a second sequential profile change.
   - Expected result: the competitor attribute is `not_visible`, never false/absent; the category mutation remains blocked until business-owner factual confirmation, eligibility confirmation, one primary outcome, guard metrics, concurrent changes, actor/approval, recheck window, and rollback are recorded; before and after evidence and the eventual result remain separate; the sequential changes are not labelled an A/B test.
   - Evidence path: the completed `templates/local-seo-gbp.md` report plus permitted captures referenced by its observation and mutation IDs; record that artifact path in the gate-results row.
   - PASS/FAIL: PASS only when every expected state and mutation field is present and the approval follows the general authenticated/public-mutation ceiling. FAIL for a negative competitor fact inferred from non-visibility, any missing gate field, premature mutation/publication, a GBP-only approval exception, or A/B language for sequential changes.

2. **Geo-grid comparability**
   - Inputs: two true geo-grid scan records with materially equivalent parameters; a third scan with changed centre, dimensions, spacing/radius, or coordinate set; and one manual location sample.
   - Expected result: the equivalent scans may be compared and may report coverage percentages; the changed-geometry scan is rejected as a before/after comparison and reported separately; the manual sample records its locations/context and emits no top-3 or top-10 coverage percentage.
   - Evidence path: the completed `templates/local-seo-gbp.md` measurement and comparison sections plus stored scan/sample evidence referenced by measurement ID; record that artifact path in the gate-results row.
   - PASS/FAIL: PASS only when the equivalent pair matches all required context, changed geometry is explicitly rejected, and coverage percentages occur only on true grid scans with documented per-point location control. FAIL if unlike geometries are compared, a manual sample emits coverage percentages, or a paid tool/provider is treated as required or endorsed.

3. **Content-engine page with native revision evidence**
   - Inputs: one approved content-engine article revision with mapped material claims and public citations; its adapter mapping; the delivered live page; and the engine/admin revision view.
   - Expected result: the engine-native revision is the sole authoritative evidence record; claim support, dated checks, applicable voice/asset authorization and immutable rights snapshots, information gain, and exact-revision human approval pass before publication. Citation survival passes in preview/staging before public publication when available; otherwise it runs immediately upon delivery, with any failure triggering immediate rollback/unpublish or fix-forward. Engine/admin state agrees with the rendered page.
   - Evidence path: the native revision evidence locator, adapter note, permitted engine/admin capture, and dated live-render capture or inspection log; record all paths in the gate-results row.
   - PASS/FAIL: PASS only when the native record covers the exact published revision, no fallback or duplicate ledger exists, every citation survives with the intended destination and claim association, and a failed direct-delivery check is immediately rolled back/unpublished or fixed forward. FAIL for missing support/approval, duplicate provenance, backend/render disagreement, publication past a failed staged check, or any failed direct-delivery revision left public.

4. **No-engine page via fallback evidence**
   - Inputs: one new or materially revised article with no provenance-capable content engine; a completed dated `templates/page-evidence.md` copy at `SITE_WORKSPACE/reports/content/<slug>/<YYYY-MM-DD>-<revision-id>-evidence.md` (record revision ID, or two-digit per-page/date sequence when none exists); and its rendered page.
   - Expected result: the uniquely named fallback is the sole revision-scoped evidence record; its depth matches materiality; it contains the pre-draft brief, claim mappings/checks, applicable authorized inputs and rights snapshots, human approval, and rendered-citation result. Citation survival passes in preview/staging before public publication when available; otherwise it runs immediately upon delivery and failure triggers immediate rollback/unpublish or fix-forward.
   - Evidence path: the completed fallback record and dated live-render capture or inspection log referenced from it; record the artifact path in the gate-results row.
   - PASS/FAIL: PASS only when the unique record is complete for the exact revision, every applicable publish/delivery gate passes, and a failed direct-delivery check is immediately rolled back/unpublished or fixed forward. FAIL for a colliding filename, global/site-wide source ledger, missing applicable fields, invented legacy back-fill, absent approval, publication past a failed staged check, or a failed direct-delivery revision left public.

5. **Reachable-but-unsupported citation fails**
   - Inputs: a page revision whose cited URL returns successfully but whose source text does not substantiate one material claim, plus the claim mapping and proposed rendered page.
   - Expected result: the mapping is marked unsupported and the revision remains blocked; URL reachability does not satisfy substantiation and the page is not published/completed.
   - Evidence path: the authoritative revision record with the claim/source locator, dated source check, reviewer decision, and blocked publish result; record that path in the gate-results row.
   - PASS/FAIL: PASS only when the unsupported claim causes a non-publish result until removed, qualified, or genuinely supported. FAIL if reachability, citation presence, or a discovery assistant is treated as proof of support.

6. **Missing information gain fails**
   - Inputs: a proposed page brief with audience/query/SERP observations and no credible unique contribution or first-hand proof plan.
   - Expected result: the decision is `defer`, `update existing page`, or `choose another page type`; automatic drafting, importing, scheduling, and publishing remain blocked.
   - Evidence path: the authoritative native revision brief or dated fallback record containing the information-gain assessment and decision; record that path in the gate-results row.
   - PASS/FAIL: PASS only when the missing information gain produces a recorded non-publish outcome. FAIL if competitor averages, word counts, entity quotas, proprietary scores, or mere indexation potential permit drafting or publication.

## Dry-Run Gates

Before deploy, prove at least one repo-local dry run without mutating unrelated files:

1. Copy or run against a temporary target root.
2. Run the doctor first, write the reviewed plan outside the target/search roots, then bootstrap:

```bash
node "$SKILL_DIR/scripts/seo-doctor.mjs" <target-root> --domain example.com --decision create --plan-output <outside-root-plan>
node "$SKILL_DIR/scripts/bootstrap-seo-workspace.mjs" --plan <outside-root-plan> --action create --domain example.com <target-root>
```

For an installed copy, the same scripts under `.agents/skills/seo-growth-workspace/scripts/`.

3. Verify `.seo/README.md`, `.seo/context.md`, `.seo/backlog.md`, `.seo/audit.md`, `.seo/strategy.md`, `.seo/taxonomy.md`, `.seo/log.md`, `.seo/reports/`, `.seo/scripts/`, `.seo/pseo/`, `.seo/backlinks/work-log.md`, `.seo/backlinks/asset-rights.md`, and `.seo/config.json` with `"mode": "standalone"` and exactly `"workspaceSchemaVersion": 1`.
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
