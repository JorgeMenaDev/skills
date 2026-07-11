# SEO Growth Workspace Release Run — 2026-07-11

## v4.0.0 — publishing-integrity architecture (integrated release, slice 7)

Started: 2026-07-11
Target skill: `skills/growth/seo-growth-workspace`
Operator: matias/opus-4.8
Programme: `JorgeMenaDev/skills#59` (counsel-converged v4); this slice: `#73`.
Canonical rationale: `vault/AGENT-DESK/reports/seo-v4-wayfinder-2026-07-11/v4-proposal.md` (JorgeMenaDev/matias).

This document is a **rendering of** the canonical gate-results artifact
`dev/seo-growth-workspace/gate-results-4.0.0.json`. That artifact — not this log — is the
single source of truth for scenario results. `evaluate-release.mjs` self-executes the
validator, imports its deterministic rows bound by digest, reads the manual rows, and
rejects a missing/stale/wrong-digest/duplicate/malformed/non-PASS artifact.

## Source identity

- Integration branch `seo-v4-s10`, built on `seo-v4` tip `83458f5` (slice 6b, rendered-output exporter).
- Source identity is **path/digest identity**: the release binds to skill source digest
  `0a186e04…` and dev-tooling digest `3a41f19f…` (full values in `gate-results-4.0.0.json`).
  Both the validator report and every gate-results row carry these digests; any drift is rejected.
- **Release evidence = source commit + this dated release log** (the repo uses no tags; the
  checklist defines none). The 4.0.0 stamp lands here and only here.

## Release boundary

PASS — repository candidate only. No live workspace, credential content, hub activation/repair,
install, provider mutation, schema 2, deterministic migrator, or writer lease entered this run.
`workspaceSchemaVersion` stays `1`; migration remains manual/terminal. `create-optional` is the
sole reviewed new mutation this release adds (`GENERATED_WORKSPACE_FILES` and `repair` semantics
unchanged). The one atomic merge of `seo-v4` → `main` carrying this stamp is **Jorge-gated** and
happens after his sign-off; consumer propagation is a separate later pass (proposal §9).

## Version integrity

The 4.0.0 stamp is consistent across every surface the validator checks:

| Surface | Value |
| --- | --- |
| `SKILL.md` frontmatter `version` | 4.0.0 |
| `scripts/bootstrap-seo-workspace.mjs` `SKILL_VERSION` | 4.0.0 |
| Validator `version consistency` section (SKILL.md ↔ bootstrap) | PASS |
| Exported clean copy `SKILL.md` / bootstrap | 4.0.0 / 4.0.0 |
| Criterion-matrix version rows (`(a) version consistency`) | closed-by-slice-7 |

## Blocking gates

Run from the worktree root:

```bash
node dev/seo-growth-workspace/validate-skill.mjs
node dev/seo-growth-workspace/command-inventory.mjs --verify
node dev/seo-growth-workspace/evaluate-release.mjs --json
```

| Gate | Result | Exit |
| --- | --- | --- |
| `validate-skill.mjs` | PASS (`seo-growth-workspace skill validation passed`) | 0 |
| `command-inventory.mjs --verify` | PASS — 5 executable / 87 illustrative / 0 malformed; foreign-CWD matrix all exit 0 | 0 |
| `evaluate-release.mjs --json` | PASS — `pass: true`, score 100/100, 0 findings, `blockingGatesGreen` + `gateResultsGreen` true | 0 |

## Gate-results artifact (rendered)

`gate-results-4.0.0.json` — `gateResultsVersion: 1`, `boundReportVersion: 1`.

- **Deterministic (a)-rows: 48 / 48 PASS.** Imported from `validate-skill.mjs --report`, one row per
  validator section, bound to the report by `sourceDigest` + `toolingDigest`. The evaluator
  re-executes the validator and rejects the artifact unless every section is reproduced exactly
  with matching results and digests.
- **Manual (b)-rows: 17 / 17 PASS** — the enumerated non-waivable gates from `release-checklist.md`
  § Enumerated v4 scenario gates. Each carries the skill source digest it attests; `blocked`/`partial`
  cannot satisfy a required gate.

| # | Gate | Result | Mode |
| --- | --- | --- | --- |
| b01 | GBP `not_visible` + gated mutation | PASS | fixture |
| b02 | Geo-grid comparability | PASS | fixture |
| b03 | Content-engine page with native revision evidence | PASS | fixture + live-partial |
| b04 | No-engine page via fallback evidence | PASS | fixture |
| b05 | Reachable-but-unsupported citation fails | PASS | fixture |
| b06 | Missing information gain fails | PASS | fixture |
| b07 | Local personalized AI observation | PASS | fixture |
| b08 | Predicted AI lift fails | PASS | fixture |
| b09 | Sparse customer-evidenced discovery journey | PASS | fixture |
| b10 | Community-source pilot with pre-registered gates | PASS | fixture-only |
| b11 | Token-swapped community pages fail | PASS | fixture |
| b12 | Affiliate offer expiry + regulated-category escalation | PASS | fixture-only |
| b13 | Unauthorized or expired affiliate code fails | PASS | fixture |
| b14 | Hidden affiliate commission fails | PASS | fixture |
| b15 | Commerce truth and lifecycle walk | PASS | fixture-only |
| b16 | Rights-gated authority walk | PASS | fixture-only inputs |
| b17 | Authority rental or opaque indexer fails | PASS | fixture |

Each manual gate was executed by verifying that the governing reference contract mandates the
required decision (the shipped skill produces the expected PASS/FAIL when followed) and walking a
labelled fixture of the described inputs. Evidence references (durable committed reference sections)
are recorded per row in the gate-results artifact.

## Audits (slice 7)

| Audit | Verdict | Notes |
| --- | --- | --- |
| Criterion-matrix completeness | PASS | 153 rows; every row closed by its owning slice; the 9 `(a) version consistency` rows closed-by-slice-7 with the 4.0.0 stamp; C36-07 (anti-authority-rental, owned by `commercial-integrity.md`, slice 1) corrected from a stray `open` to `closed-by-slice-1`; all duplicate/overlapping mappings flagged; each row has exactly one owner and one scenario. |
| Cross-reference audit | PASS (1 fix applied) | Provenance/substantiation, comparison disclosure, conversion stages, authority-rental, and indexing rules each defined once with consumers linking. Fixed: `content-engine-webhooks.md` restated the page-evidence publish/citation-survival gate near-verbatim; trimmed to link `page-evidence.md` and keep only the webhook-delivery trigger (no oracle asserted the removed text). |
| Architecture proof | PASS | `SKILL.md` 153 lines (thin router, progressive loading); no global sources ledger; `asset-rights.md` is `OPTIONAL_WORKSPACE_FILES`, not a required/generated file; GEO appears only as a negation ("not a separate GEO mode"); no mandatory affiliate/community phase in `phase-architecture.md`; `workspaceSchemaVersion` stays 1. |
| Portability audit | PASS | No SuperaSEO-specific fields in portable contracts (the single worked example in `content-engine-webhooks.md` is established precedent); no vendor code/prompts/scores imported (Semrush/Surfer appear only as neutral optional mentions; Crawlyx/geo-seo-claude absent); no universal legal wording (regulated-category handling is escalation/evidence with explicit non-legal disclaimers). |

## First-party sources checked (live, 2026-07-11)

- **Google Search spam policies** (developers.google.com; page updated 2026-05-15) — site-reputation
  abuse, scaled-content abuse, and link-spam / authority-rental all current; substantiates the
  anti-authority-rental boundary (gates b14, b17) and the AI/comparison guidance.
- **Ahrefs Terms of Service** (ahrefs.com/terms; last modified 2026-06-18) — §4.3(i)/(j) prohibit
  automated access and scraping except through the Ahrefs API. `references/data-tools.md` documents
  the official public keyless Domain-Rating endpoint (verified 2026-07-11) with a mandatory
  recheck-before-each-use caveat, external-request disclosure, third-party-estimate labelling, and
  required "Domain Rating by Ahrefs" attribution; the offline analyzer makes no network call.
- **Platform-license table (#43)** — **excluded** under its ratified reverification condition:
  current official Unsplash/Pexels/Pixabay/Flickr/CC terms could not be reverified offline at release
  time. The generic rights contract, green-evidence gate, same-funnel routing, per-asset/run
  current-check stop gate, and enforcement-escalation boundary all ship; the platform table does not.

## Known limitations

- **No live content-engine article with inline citations available.** `superaseo.app` is live and
  renders real pages, but its public URLs checked (`/`, `/alternativa-a-chatgpt`) are
  landing/comparison pages without inline body citations. Gate b03's rendered-citation-survival
  sub-behavior is therefore contract-verified + fixture-walked, with live confirmation only that the
  content engine renders real pages — not a full end-to-end live citation-survival walk. No live
  operation was manufactured.
- **Fixture-only specialist paths** (below) ship validated against fixtures only, not a live operation.
- **Ahrefs public DR endpoint** is documented from its official API-docs page with a recheck caveat;
  the ToS page itself does not enumerate the public endpoint, so per-use reverification is required.

## Clean export

```bash
node dev/seo-growth-workspace/export-clean-skill.mjs --target <disposable> --dry-run
node dev/seo-growth-workspace/export-clean-skill.mjs --target <disposable>
node dev/seo-growth-workspace/validate-skill.mjs --skill-dir <disposable>/.agents/skills/seo-growth-workspace
```

PASS — dry run made no install; clean export produced 56 portable files (SKILL.md + references + templates
+ scripts/*.mjs), including every v4 reference/script/template. The exported copy stamped 4.0.0 in both
`SKILL.md` and the bootstrap `SKILL_VERSION` and passed the full validator (exit 0). Dev tooling — the
validator, evaluator, command inventory, exporter, fixtures, `gate-results-4.0.0.json`, and this release
log — remained outside the portable package. `git diff --check` clean.

## Fixture-only sign-off list (Jorge)

Per the programme's dogfood default, each path below shipped without a nameable live operation in the
fleet and is validated against labelled fixtures only. These paths are **excluded from the v4
"dogfooded" completion claim** and are the first defer candidates if v4 slips. Jorge signs this list.

- [ ] **Community-source pages** (`references/community-source-pages.md`) — whole path; not exercised against a live operation.
- [ ] **Affiliate / promo integrity** (`references/affiliate-promo-integrity.md`) — whole path; not exercised against a live operation.
- [ ] **E-commerce decisions** (`references/ecommerce-seo.md`) — whole path; not exercised against a live operation.
- [ ] **Image distribution / reclamation play** (`references/image-rights.md`) — the live distribution/outreach play only; the asset-rights master, green-evidence gate, same-funnel routing, current-check stop gate, and enforcement-escalation boundary are structural and unconditional.
- [ ] **Platform-license table (#43)** — excluded under its ratified reverification condition; shipping it later requires release-time reverification of current official terms, then only as a dated routing aid with a per-asset/run stop gate.

Sign-off (Jorge): SIGNED — approved via the orchestrate release gate ("Sign + atomic merge now"), recorded by the conducting agent on his explicit selection.  Date: 2026-07-11

## Result

PASS — v4.0.0 repository candidate meets every blocking release gate: three commands exit 0, the
canonical gate-results artifact is fresh/digest-bound/complete with 48 deterministic + 17 manual rows
all PASS, all four slice-7 audits pass, version integrity holds, and clean export validates. The single
atomic merge of `seo-v4` → `main` and consumer propagation remain Jorge-gated and are **not** performed
in this slice.
