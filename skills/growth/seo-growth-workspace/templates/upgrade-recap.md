# Upgrade recap — <site> (YYYY-MM-DD)

Deliberate, operator-invoked reconciliation of existing workspace state with the currently installed skill version. `references/never-dry-loop.md` § Upgrade recap and reconciled-version stamp owns the semantics; this template does not redefine them. One workspace per run. History is never rewritten. A recap whose four checks all produce zero findings may use the short form the contract licenses (header; window evidence in the shape the full form would record — install-commit pair, `never`/`malformed` reconstruction or conservative-baseline statement, or per-family pairs; the load-bearing semantic-change summary or an explicit pointer to an identical same-window summary in a prior same-day report; per check its mandatory item-level outcomes in compact one-line-per-item form — per-row keeps and per-rung reasoning are required regardless of report form — or the zero count where no items were reviewed; re-stamp) instead of this full template. An absent ledger collapses only its **ledger-row review** to one line — `ledger absent — nothing to review` (absence is not drift); check 4's reverse direction (Done-row/log promises, ship history) always runs regardless of ledger absence. This report lives in the workspace's `reports/` directory as `reports/YYYY-MM-DD-upgrade-recap-<installed version>.md` — the version suffix keeps same-day recaps across consecutive upgrades collision-free; if the path already exists (a same-version rerun), append the first free numeric suffix (`…-2.md`) rather than ever overwriting, and record the path actually written in the stamp.

## Header

Operator records who authorized and who executed, e.g. `Jorge / matias-fable5` — an agent executing under a human's invocation names both.

| Workspace | Installed skill version | Previous reconciled version (`never` if absent; `malformed` if the stamp existed but could not be trusted — quote the unparsable content in Upgrade context) | Operator (authorized-by / executed-by) | Date |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Upgrade context

Drift state found — one of `stamp absent`, `stamp malformed` (preserve the bad content or parse error here), or the stamp's version — and the load-bearing semantic changes observed between the previous reconciled version (or the conservative baseline when it is `never`/`malformed`: treat all current protocols as unreconciled) and the installed version — the scope everything below is judged against. Under `never`/`malformed` there is no version pair and that is the expected shape: describe the current protocols' load-bearing demands against the observed workspace state. If a version window was reconstructed from installer/version-control history (see check 2), record the reconstruction evidence here:

-

## 1. Loops-state revalidation

One row per schema-1 file read (`loops/*.json`, ledgers, certificates):

| File | Parses under current contracts | Finding | Disposition (conforming / repaired forward / filed / noted — owned elsewhere) |
| --- | --- | --- | --- |
|  |  |  |  |

## 2. Open-row re-triage

Every open backlog row, re-judged against the current gates — closed and Done rows are not re-opened, and rows carrying a dated skip disposition are closed for this purpose. When the gate-owning contracts are unchanged across the version window, a light conformance scan suffices; under `never`, the window may be reconstructed from the consuming repo's installer/version-control history (evidence in Upgrade context), otherwise every open row gets full re-judgment, classed by the creating-version test (`references/never-dry-loop.md` check 2; unknowable creating version → `version-driven` by convention, reason-noted). This check never becomes a re-audit:

| Row | Current-gate finding | Outcome (`keep` / `amend` / `close`) | Class (`version-driven` / `incidental hygiene`) | Reason | Dated |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## 3. Coverage invalidation review

Every rung row reviewed under the load-bearing test — invalidate only when the changed clause alters what the rung's method would observe, accept, or reject; under `never` the test degenerates to "does the artifact's method satisfy the current rung contract"; a pure policy-mirror change (e.g. `maxAgeDays`) is never load-bearing by itself, though ordinary expiry under the current policy value still applies through the coverage reader. Record the reasoning either way. A stale mark = additive `staleAsOf`/`staleReason` on the ledger row **plus** a normal backlog row as the operative exit:

| Rung | Certified under | Load-bearing reasoning (invalidated by / kept because) | Stale annotation written | Exit backlog row |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 4. Obligations conformance

Both directions: ledger rows conform to the current contracts, and everything the current contracts would obligate has its ledger entry — ship-history companions AND dated recheck promises in Done rows or log entries lacking both a ledger entry and a recorded exemption. Outcomes: `conforms` / `filed <row>` / `carried by <row or ledger key>` / `exempt <dated reason>` — missing ones filed as normal backlog rows, never fabricated retroactively:

| Obligation | Conforms to current companion contracts | Finding / action |
| --- | --- | --- |
|  |  |  |

## Discovered work filed

Real work surfaced by the recap exits into normal backlog rows — list the rows filed, or `none`:

-

## Re-stamp

- This workspace's own stamp re-stamped (`<workspace>/reconciliation.json` — standalone `.seo/reconciliation.json`, hub `.seo/sites/<slug>/reconciliation.json`): `reconciledSkillVersion` → <installed version>, `reconciledAt` → <date>, `report` → this file's **workspace-relative** path (`reports/…`, never repo-root-relative). Sibling workspaces are untouched.
- Confirm: no Done row, past report, or ledger history was rewritten; no state was migrated or deleted. (Coverage-row `maxAgeDays` mirror corrections and additive `staleAsOf`/`staleReason` annotations are the two permitted in-place ledger mutations and are not history rewrites — `observedAt` and `artifact` stay untouched.)
