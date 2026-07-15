# Upgrade recap — <site> (YYYY-MM-DD)

Deliberate, operator-invoked reconciliation of existing workspace state with the currently installed skill version. `references/never-dry-loop.md` § Upgrade recap and reconciled-version stamp owns the semantics; this template does not redefine them. One workspace per run. History is never rewritten.

## Header

| Workspace | Installed skill version | Previous reconciled version (`never` if absent) | Operator | Date |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 1. Loops-state revalidation

One row per schema-1 file read (`loops/*.json`, ledgers, certificates):

| File | Parses under current contracts | Finding | Disposition (conforming / repaired forward / filed) |
| --- | --- | --- | --- |
|  |  |  |  |

## 2. Open-row re-triage

Every open backlog row, re-judged against the current gates — closed and Done rows are not re-opened:

| Row | Current-gate finding | Outcome (`keep` / `amend` / `close`) | Reason | Dated |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 3. Coverage invalidation review

Coverage-ledger rows certified against changed or newly added rungs/policies:

| Rung | Certified under | Invalidated by | Marked stale (due work) |
| --- | --- | --- | --- |
|  |  |  |  |

## 4. Obligations conformance

| Obligation | Conforms to current companion contracts | Finding / action |
| --- | --- | --- |
|  |  |  |

## Discovered work filed

Real work surfaced by the recap exits into normal backlog rows — list the rows filed, or `none`:

-

## Re-stamp

- `.seo/reconciliation.json` re-stamped: `reconciledSkillVersion` → <installed version>, `reconciledAt` → <date>, `report` → this file's path.
- Confirm: no Done row, past report, or ledger history was rewritten; no state was migrated or deleted.
