# Changelog

## 7.1.0

The skill records the duplication doctrine and adds a supply-side gate for engine-owned publishing. `references/search-console.md` states the duplication evidence tiers: string/lexical similarity between keywords or titles is an `[H]` flag that justifies investigation, never an `[E]` finding and never alone a consolidation decision; measured GSC query-overlap is the `[E]` evidence for a competing-pages problem; near-duplication is not a policy violation — Google: "Some duplicate content on a site is normal and it's not a violation of Google's spam policies" — because the determinant is why the pages exist, not how similar they are; and no third-party similarity threshold exists, so any locally adopted number is a local `[H]`, never an industry standard. The autopublish quality watch now includes the supply-side overlap gate (`references/content-engine-webhooks.md`, watch clause in `references/operating.md`): before an engine's publish window, compare the queue against the published corpus and against itself and alert on overlap, framed as doorway/scaled-content-abuse exposure rather than cannibalization, because the demand-side GSC signal arrives after pages rank. `references/policy.md` adds a Search Console Manual Actions cadence row — the first-party detector for that site-level exposure. A repo-wide search found none of the three unsupported claims in the skill (the removed helpful-content "duplicate, overlapping, or redundant articles" line, the "3 of top 10" figure, and duplicate-content-as-penalty framing); no text to remove.

## 7.0.0

SEO Ships no longer have a numerical rolling limit. The `cap` and `cap exception` commands, their exception allocation machinery, and cap fields in `ship record` output are removed; exit code 7 remains reserved so the refusal code does not move. Ship events, evidence and integrity gates, exact-revision approval, live verification, and 28-day measurement obligations remain mandatory. Historical `capExceptions` data is tolerated as inert legacy state and is never rewritten.

## 6.1.2

`bootstrap-seo-workspace.mjs` now reads the installed `SKILL.md` version when creating a reconciliation stamp. New workspaces therefore start reconciled to the release that created them instead of the stale hard-coded `5.2.3` value.

## 6.1.1

`seo-doctor.mjs` now accepts byte-identical real copies installed for multiple runtimes while continuing to fail closed when their skill contents differ. This keeps lifecycle plans compatible with dual-target, no-symlink installations without weakening install-drift detection.

## 6.1.0

Ahrefs External Crawl is now a mandatory monthly checkpoint at every SEO stage. A completed crawl qualifies only with at least 90% coverage of a dated declared site-wide or named partial scope, a normalized report, and independent verification of promoted findings; provider work stays in supervised UI use. Existing cadence occurrences and the reconciliation stamp carry the additive rollout, and workspace schema 1 is unchanged ([skills#162](https://github.com/JorgeMenaDev/skills/issues/162)).

## 6.0.1

`loop-state.mjs` now records dated URL-specific cap exceptions through an idempotent writer and preflights named planned URLs, including qualifying shared releases, against unused grant tokens. `sleep heartbeat` now re-runs the certificate's drift, due/in-flight work, coverage, and autopublish guards before refreshing the heartbeat, and refuses once its wake date is due. The workspace schema is unchanged; transitions remain code-and-fixture owned ([skills#146](https://github.com/JorgeMenaDev/skills/issues/146)).

## 6.0.0

The radical simplification ([skills#145](https://github.com/JorgeMenaDev/skills/issues/145); ratified proposal: matias `vault/AGENT-DESK/reports/2026-07-15-seo-skill-radical-simplification.md`). **Zero on-disk workspace format changes** — every existing workspace keeps working; on first v6 contact a workspace is drifted and clears it with the new upgrade pass (`references/operating.md`).

### The protocol is now code

`scripts/loop-state.mjs` is the single writer and validator of all `loops/` state and the reconciliation stamp: occurrence and obligation lifecycles with idempotent crash retries, ship events and the rolling cap, sleep certification (fail-closed exit codes for drift, in-flight state, stale coverage, armed ungated autopublish), stamp check/write, and read-only `verify` (proven byte-neutral on all seven live consumer workspaces before release). ~150 lines of serialization prose died into it; field-discovered edge cases become fixtures in `dev/seo-growth-workspace/fixtures/loop-state/`, never new clauses. Adversarially reviewed (codex, 13 findings: 12 fixed, 1 rejected with an in-code note).

### The upgrade recap is now a 12-line upgrade pass

The four-check recap ceremony, its 908-word template, version-window reconstruction, `version-driven`/`incidental hygiene` classification, same-day compounding rules, report filename law, and the `carried by` vocabulary are deleted. What remains: `verify` (code), re-judge every open row with a dated disposition (judgment), check ships/promises have obligations (judgment), short dated report, re-stamp. Drift semantics are unchanged: absence is drift; drift blocks sleep certificates only.

### Where every file went

| v5 file | v6 home |
| --- | --- |
| references/never-dry-loop.md, operating-loop.md, ticket-architecture.md, frontier-sweep.md, evidence-conventions.md, scheduled-operation.md | references/operating.md (serialization → scripts/loop-state.mjs) |
| references/operating-policy.md | references/policy.md (near-verbatim) |
| references/hub-mode.md, migrate-uninstall.md, portfolio-registry.md, adapters.md, admin-preflight.md | references/workspace.md |
| references/phase-architecture.md, business-context.md | references/first-run.md |
| references/page-evidence.md, page-launch.md | references/pages.md |
| references/conversion-cta.md, posthog-outcome-bridge.md | references/conversion.md |
| references/community-source-pages.md | references/content-ops.md |
| references/image-rights.md | references/backlinks-entity.md |
| references/affiliate-promo-integrity.md | references/commercial-integrity.md |
| templates/upgrade-recap.md, sleep-certificate.md | superseded by scripts/loop-state.mjs |
| templates/frontier-sweep-ledger.md, page-evidence.md, gsc-opportunity.md, backlink-gap.md, admin-setup.md, portfolio-index.md, utility-tool-page-plan.md | inlined in their owning references |

### Governance

The proposal's §4.1 design rules are the skill's constitution, carried in SKILL.md. Rule 4 kills the friction→release flywheel: a new normative clause requires evidence that judgment failed twice on the same point with bad SEO consequences. The v5 release harness (2,571-line validator, 17 manual attestations, gate-results artifacts) is replaced by `dev/seo-growth-workspace/check-skill.mjs` + the fixture suites; adversarial review is mandatory only for script-behavior or outcome-protecting-invariant changes.

## 5.2.3 and earlier

See the closed release-run records under `dev/seo-growth-workspace/` and the git history of the deleted `dev/seo-growth-workspace/release-checklist.md`.
