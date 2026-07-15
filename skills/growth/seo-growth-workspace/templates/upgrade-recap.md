# Upgrade recap — <site> (YYYY-MM-DD)

Deliberate, operator-invoked reconciliation of existing workspace state with the currently installed skill version. `references/never-dry-loop.md` § Upgrade recap and reconciled-version stamp owns the semantics; this template does not redefine them. One workspace per run. History is never rewritten. This report lives in the workspace's `reports/` directory as `reports/YYYY-MM-DD-upgrade-recap.md`.

## Header

Operator records who authorized and who executed, e.g. `Jorge / matias-fable5` — an agent executing under a human's invocation names both.

| Workspace | Installed skill version | Previous reconciled version (`never` if absent) | Operator (authorized-by / executed-by) | Date |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Upgrade context

Drift state found (stamp absent / stamp version) and the load-bearing semantic changes observed between the previous reconciled version and the installed version — the scope everything below is judged against:

-

## 1. Loops-state revalidation

One row per schema-1 file read (`loops/*.json`, ledgers, certificates):

| File | Parses under current contracts | Finding | Disposition (conforming / repaired forward / filed) |
| --- | --- | --- | --- |
|  |  |  |  |

## 2. Open-row re-triage

Every open backlog row, re-judged against the current gates — closed and Done rows are not re-opened. When the gate-owning contracts are unchanged across the version window, a light conformance scan suffices; this check never becomes a re-audit:

| Row | Current-gate finding | Outcome (`keep` / `amend` / `close`) | Class (`version-driven` / `incidental hygiene`) | Reason | Dated |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## 3. Coverage invalidation review

Every rung row reviewed under the load-bearing test — invalidate only when the changed clause alters what the rung's method would observe, accept, or reject; record the reasoning either way. A stale mark = additive `staleAsOf`/`staleReason` on the ledger row **plus** a normal backlog row as the operative exit:

| Rung | Certified under | Load-bearing reasoning (invalidated by / kept because) | Stale annotation written | Exit backlog row |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 4. Obligations conformance

| Obligation | Conforms to current companion contracts | Finding / action |
| --- | --- | --- |
|  |  |  |

## Discovered work filed

Real work surfaced by the recap exits into normal backlog rows — list the rows filed, or `none`:

-

## Re-stamp

- This workspace's own stamp re-stamped (`<workspace>/reconciliation.json` — standalone `.seo/reconciliation.json`, hub `.seo/sites/<slug>/reconciliation.json`): `reconciledSkillVersion` → <installed version>, `reconciledAt` → <date>, `report` → this file's path. Sibling workspaces are untouched.
- Confirm: no Done row, past report, or ledger history was rewritten; no state was migrated or deleted.
