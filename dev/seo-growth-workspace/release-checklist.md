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

This release does not activate or repair a live hub — no live-hub activation, mutation, or live install ships. Run the existing deterministic rehearsal only:

1. Build six synthetic hub site workspaces and a six-row canonical registry under a temp root.
2. Add an eight-row legacy inventory: six missing retired repo-local roots plus two recognized legacy-only sites.
3. Run the validator rehearsal and prove all row states are preserved and correctly classified:

```bash
node dev/seo-growth-workspace/validate-skill.mjs
```

PASS requires six canonical rows, eight legacy rows, six `stale_registry_row` findings, two `unmigrated_legacy_site` findings, zero false `candidate_workspace` findings, and realpath-deduplicated registry paths. Migration remains manual/terminal and `workspaceSchemaVersion` stays `1` (schema 1 is current; no schema-2 contract ships). `create-optional` is the sole reviewed new mutation this release adds; `GENERATED_WORKSPACE_FILES` and `repair` semantics are unchanged.

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
| E-commerce fixture | Synthetic e-commerce scenario routes through the classifier to `references/ecommerce-seo.md`; fixture-validated only — not yet exercised against a live operation |

### Fixture-only paths pending Jorge sign-off (rendered into the v4 release log at slice 7)

Accumulating list — each specialist path shipped without a nameable live operation, per the programme's dogfood default. Jorge signs this list in the release log; fixture-only paths are excluded from the v4 "dogfooded" completion claim and are the first defer candidates if v4 slips.

- Community-source pages (`references/community-source-pages.md`) — whole path.
- Affiliate/promo integrity (`references/affiliate-promo-integrity.md`) — whole path.
- E-commerce decisions (`references/ecommerce-seo.md`) — whole path.
- Image rights (`references/image-rights.md`) — the live distribution/outreach play only; the asset-rights master, green-evidence gate, same-funnel routing, current-check stop gate, and enforcement-escalation boundary are structural and unconditional.
- Platform-license table (#43): excluded under its ratified reverification condition — current official terms could not be reverified at implementation time; a per-asset/run current official-source check ships instead. Shipping it requires release-time reverification and then only as a dated routing aid.

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

7. **Local personalized AI observation**
   - Inputs: a maintained prompt-set entry with stable prompt ID/version and verbatim local query; at least two completed runs on one visible platform/model and surface; declared locale and controlled city/coordinates or location method; login/account, personalization/memory, device/app, timestamp/timezone, and Maps/transactional/sponsored context; and the stored answer artifacts.
   - Expected result: one row exists per run with the full row-level context, ordered business mentions, and independent mention, recommendation, and citation evidence; visible product/model identifiers are transcribed rather than guessed; recurrence is stated only as `x of y` completed runs inside the declared prompt, time, platform/model, and context sample; the answers are described as dated samples, never rankings.
   - Evidence path: the completed `.seo/reports/ai-visibility-YYYY-MM-DD.md` report, its maintained prompt set, and the permitted answer captures/exports referenced by observation ID; record those artifact paths in the gate-results row.
   - PASS/FAIL: PASS only when every run row is reproducible from its own context, all repeats are evidenced, semantics remain separate, and recurrence stays within the declared sample. FAIL for missing row context, a guessed model/state, inferred recommendation or citation, a single run presented as stable, or any ranking/population/platform-wide claim.

8. **Predicted AI lift fails**
   - Inputs: a proposed content, technical, backlink, disclosure, markup, or profile action accompanied by copy promising, forecasting, scoring, or projecting an increase in AI mentions, recommendations, citations, traffic, leads, revenue, or AI visibility.
   - Expected result: the projection is rejected and removed; the action may retain a non-causal hypothesis and a dated repeat-observation plan, but no predicted lift is emitted or used to justify publication or prioritization.
   - Evidence path: the blocked/revised AI visibility report or backlog/work-log record showing the original proposed claim, reviewer decision, final non-causal wording, owner, and recheck plan; record that artifact path in the gate-results row.
   - PASS/FAIL: PASS only when every promised or projected AI-visibility lift claim fails review and the surviving record separates action from later observed outcome. FAIL if any output promises, calculates, scores, forecasts, or projects AI-visibility lift from an action.

9. **Sparse customer-evidenced discovery journey**
   - Inputs: a sparse set of dated `Reported` or `Observed` customer evidence covering at least one supported discovery surface, one evidenced unsuitable surface, unresolved stages or fields, and a supported social or video surface requiring execution beyond SEO.
   - Expected result: the matrix is created in `.seo/context.md`; only directly evidenced surfaces are `active`; the unsuitable surface is `rejected` with its evidence-based reason; unresolved stages, fields, and decisions remain `Unknown`; customer recall remains `Reported`; and social/video execution is recorded as an outside-skill handoff rather than a campaign. No matrix is created when the qualifying customer evidence is removed, and unrelated simple work remains unblocked.
   - Evidence path: the completed `.seo/context.md`, its customer-evidence artifacts and provenance references, and any outside-skill handoff record referenced by the matrix; record those artifact paths in the gate-results row.
   - PASS/FAIL: PASS only when every active surface has its own `Reported` or `Observed` customer-evidence basis, every rejection has a recorded reason, all unsupported values stay `Unknown`, and social/video execution remains outside the SEO skill. FAIL for inferred activation, a fabricated complete journey, an unreasoned rejection, customer recall upgraded beyond `Reported`, a required matrix for evidence-free or simple work, a surface score, a per-channel ledger, or social/video campaign execution inside this skill.

10. **Community-source pilot with pre-registered gates (fixture-only)**
   - Inputs: labelled fixture inputs for a proposed one-to-three-page community-source pilot, including dated demand evidence, diverse manually accessed source sets and attribution fields, page-specific analysis/information-gain plans, privacy decisions, a removal-request fixture, and one immutable pre-publication plan defining metrics, go/no-go criteria, rollback rules, owners, and calendar dates for weeks 2, 4, 8, and 12.
   - Expected result: each page separates minimal attributed quotes, paraphrases, and publisher analysis; every source has platform, direct thread/permalink, public handle or sensitive-context redaction, and access date; the removal fixture is acknowledged/assessed within two business days and its dependent section is reworked or removed within five business days with outcome recorded; all page-evidence and applicable commercial-integrity gates pass. No fourth page is approved until the week-12 criteria pass and the operator explicitly approves expansion; indexation or impressions alone do not pass.
   - Evidence path: a labelled dated fixture report in the existing `.seo/reports/` home, the exact revision-evidence records, source/removal records, pre-registration snapshot, four review rows, and operator decision referenced by stable paths; record those paths in the gate-results row. This fixture evidence does not establish live-operation dogfood.
   - PASS/FAIL: PASS only when the fixture walks all four unchanged pre-registered gates, records every required metric or `Unknown`, demonstrates the timed removal workflow, remains within one to three pages, and blocks expansion without both a passing week-12 review and explicit approval. FAIL for redefined gates after results, a single-thread page, missing attribution/separation, scraping/covert participation/parasite publishing, unresolved publish/commercial gates, rollout from indexation/impressions, or an unlabelled claim of live dogfood.

11. **Token-swapped community pages fail**
   - Inputs: two fixture community-page proposals sharing a template and substantially identical section logic, with only the target keyword/community name and quotes or threads swapped.
   - Expected result: both proposals are rejected before publication because their source sets, analysis, and information gain are interchangeable rather than page-specific; neither may consume a pilot slot as an approved page.
   - Evidence path: the two labelled fixture briefs and the dated review record identifying the shared structure and recording the blocked publish decisions; record those paths in the gate-results row.
   - PASS/FAIL: PASS only when every affected page fails publication and the decision cites interchangeable source set, analysis, or information gain. FAIL if swapped quotes, keywords, thread links, or community names are accepted as sufficient differentiation.

12. **Affiliate offer expiry and regulated-category escalation (fixture-only)**
   - Inputs: labelled fixture inputs for one issuer-authorized affiliate offer with verbatim material terms, start/expiry dates, dated verification, a scheduled pre-expiry recheck, program/trademark constraints, and a financial, health, insurance, gambling, alcohol, supplement, or similar category flag requiring operator escalation.
   - Expected result: the offer is publishable only while `verified-active`; it moves to `expiring` while inside the pre-expiry window with its scheduled recheck pending. Successful reverification explicitly returns it to `verified-active` with a new checked-at date and, where applicable, another recheck before the same expiry, overriding the time-based state. It is promptly removed, unpublished, or updated at expiry rather than presented as evergreen. The regulated-category fixture remains blocked until target jurisdiction, escalation owner/date, materials, approver, outcome, conditions, and evidence location are recorded — and, for `approved with conditions`, until every stated condition carries verified fulfillment evidence against the exact revision (or approval becomes unconditional). Tracked conversion, confirmed/approved conversion, approved commission, paid commission, `reversed/adjusted`, and net revenue remain distinct (conversion approval is never treated as commission approval); an offer whose scheduled recheck date passes unverified becomes `unverified` and unpublishable — including a `no stated expiry` offer; every reversal/adjustment has its own identified amount rather than appearing only as a netted revenue figure, and every commission-bearing relationship passes the linked commercial-integrity disclosure gate.
   - Evidence path: a labelled dated fixture report in the existing `.seo/reports/` home, the exact page-evidence record, secure pointer for any sensitive code/terms, expiry/recheck record, escalation decision, disclosure review, and commission-state evidence referenced by stable paths; record those paths in the gate-results row. This fixture evidence does not establish live-operation dogfood.
   - PASS/FAIL: PASS only when authorization and all offer fields are evidenced, `expiring` means the recheck is pending, successful in-window reverification explicitly restores `verified-active` with its new check/recheck evidence, publication occurs only in `verified-active`, expiry handling completes promptly, regulated publication waits for a recorded approved outcome, sensitive values remain behind pointers, disclosure is present, and lifecycle reporting does not upgrade tracked or pending value to revenue or net reversals without a distinct reversal/adjustment amount. FAIL for an ambiguous expiring-state exit, absent/currently unsupported evidence, evergreen dated claims, missing escalation, secret Markdown, hidden commission, conflated lifecycle states, or any reversal/adjustment reported only inside a net figure.

13. **Unauthorized or expired affiliate code fails**
   - Inputs: two labelled fixtures: one leaked, private, employee-only, targeted, invented, or otherwise unauthorized code without explicit publication permission; and one formerly verified code whose evidenced expiry date has passed.
   - Expected result: neither code may receive or retain `verified-active`; both are rejected from publication, and the expired code is promptly removed, unpublished, or updated without an unrelated destination substitution.
   - Evidence path: the fixture offer records, issuer/program evidence or missing-authorization finding, dated status decisions, affected page/CTA locators, and blocked/removal outcomes in the existing page-evidence record, dated report, or backlog; record those paths in the gate-results row.
   - PASS/FAIL: PASS only when both fixtures fail publication and the expired public state is corrected promptly. FAIL if inferred authorization, a pattern-derived code, `unverified`, `expiring`, `expired`, or `revoked` status can publish, or expiry is hidden behind an evergreen claim or redirect.

14. **Hidden affiliate commission fails**
   - Inputs: a labelled fixture page containing an affiliate/referral link whose relationship can generate commission or another material benefit, with no clear proximate disclosure satisfying `references/commercial-integrity.md`.
   - Expected result: publication is rejected until the commission-bearing relationship appears in the required disclosure and that disclosure survives the applicable rendered/mobile review; pending or unearned commission does not remove the disclosure requirement.
   - Evidence path: the fixture page/revision evidence, affiliate relationship record, commercial-integrity disclosure review, rendered/mobile inspection evidence when available, and blocked/fixed publish decision; record those paths in the gate-results row.
   - PASS/FAIL: PASS only when the undisclosed commission-bearing link fails publication and the corrected revision is reconsidered through the shared disclosure gate. FAIL if a footer, generic policy, pending status, or lack of paid revenue permits the hidden relationship to publish.

15. **Commerce truth and lifecycle walk (fixture-only)**
   - Inputs: the synthetic e-commerce profile; a prioritization set with unknown margin; a dated mixed collection/product/editorial live-SERP observation; existing collection, product, and editorial targeting records; one discontinued product with demand, successor, link, inventory, and retained-value evidence; and current feed, structured-data, and rendered landing-page price/availability facts.
   - Expected result: unknown margin remains `Unknown` and is not estimated to force a ranking; the mixed SERP produces an investigation rather than automatic URL creation; collection/product/editorial cannibalization is checked before any new URL decision; the discontinued product receives one evidence-dependent `keep`, `redirect`, `410`, or `replace` decision with rationale and recheck condition; and feed, schema, and rendered landing-page price and availability agree, with any disagreement blocking release and routing to the existing technical/schema owners.
   - Evidence path: a labelled dated fixture report in the existing `.seo/reports/` home, referencing the synthetic profile, dated SERP capture/observation, overlap check, lifecycle evidence and decision, and feed/schema/rendered-page comparison; record those stable artifact paths in the gate-results row. This fixture evidence does not establish live-operation dogfood.
   - PASS/FAIL: PASS only when every expected decision and truth check is recorded, no unknown is estimated, no mixed-SERP URL is auto-created, and any truth disagreement blocks release. FAIL for a forced score, skipped cannibalization check, blanket inventory rule, automatic mixed-SERP URL, inconsistent commerce truth allowed to ship, or a claim that rankings/traffic caused purchases or revenue.

16. **Scenario 10 — rights-gated authority walk (fixture-only inputs)**
   - Inputs: labelled fixtures for one manually discovered listicle prospect with no paid tool available; one reverse-image match whose asset-rights row begins non-green and later receives sufficient current evidence; and one assessed use whose current license permits use without attribution.
   - Expected result: record the paid-tool/Ahrefs absence as a limitation and walk the listicle prospect through `discovered → qualified → contacted → replied → won → live/verified`, with separate link-live/indexable facts and completed 30- and 90-day checks; hold the image match at discovery with no contact until its master row is green and the use assessment passes; generate no demand for the permitted unattributed use.
   - Evidence path: labelled fixture rows in a temporary/scenario `.seo/backlinks/work-log.md` Authority funnel (v4), the linked `.seo/backlinks/asset-rights.md` row and use assessment, and the gate-results row containing those stable paths. Fixture evidence does not establish live image-distribution dogfood.
   - PASS/FAIL: PASS only when the no-paid-tool prospect reaches live-at-90-days with all required funnel evidence, the match cannot advance before green rights evidence, and permitted unattributed use creates no contact or demand. FAIL for a paid-tool dependency, skipped lifecycle/check, conflated live/indexable fact, pre-gate contact, reverse-match proof claim, or demand for permitted unattributed use.

17. **Authority rental or opaque indexer fails**
   - Inputs: a labelled fixture proposal to rent third-party authority, publish primarily for host-domain signals, or pay an opaque service to force discovery/indexation.
   - Expected result: reject the proposal under `references/commercial-integrity.md` without entering or advancing the authority funnel.
   - Evidence path: the fixture proposal, commercial-integrity decision, blocked funnel state, and gate-results row containing those stable paths.
   - PASS/FAIL: PASS only when both authority-rental and opaque-indexer variants fail. FAIL if either can qualify, be contacted, be paid, or be reported as an authority outcome.

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
- Confirm the clean export includes every current portable file — including all references, scripts, and templates added this release — and that the exported copy's `SKILL.md` `version` and bootstrap `SKILL_VERSION` agree on the shipping version. Dev tooling (validator, evaluator, command inventory, exporter, fixtures, the gate-results artifact, and the dated release log) stays excluded from the export.
- Confirm the canonical gate-results artifact (`dev/seo-growth-workspace/gate-results-<shipped version>.json (currently gate-results-5.1.2.json; evaluate-release.mjs GATE_RESULTS_FILENAME names the canonical file)`) is the single source of truth for scenario results: `evaluate-release.mjs` self-executes the validator, imports its deterministic rows bound by digest, reads the manual rows, and rejects a missing/stale/wrong-digest/duplicate/malformed/non-PASS artifact. The dated release log renders this artifact and is never an alternate source of truth.
- Confirm the release diff contains no schema-2 contracts, migration implementation, live-hub mutation, or live install. Portable source contains no writer lease, lock helper/state, or runtime contention branch; `references/operating-policy.md` owns the simple no-concurrent-mutation assumption.
