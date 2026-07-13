# Draft SEO backlog rows from cadence and obligations

This is a draft backlog, not a direct workspace mutation. Review every row before merging into .seo/backlog.md.

Earliest next-due: 2026-07-06

| ID | P | Area | Ticket | Verify |
| --- | --- | --- | --- | --- |
| SEO-001 | P3 | measurement | Measure non-brand CTR for sha256:pricing-page | Improve non-brand CTR; use the result to decide keep the title treatment or revert it |

## Obligation reconciliation actions

| Ticket | Action | Hypothesis | Page cohort | Reason |
| --- | --- | --- | --- | --- |
| SEO-106 | Reconcile closed ticket | Finish inconclusive return | sha256:closed-crash | Canonical ticket disposition decides: complete the interrupted resolution or the inconclusive return in one atomic ledger replacement |
| unlinked | Reconcile materialization | Reconcile ticket creation | sha256:ticket-crash | Reuse the persisted fingerprint and repair the missing ticket link |
| unlinked | Reconcile materialization | Recover due materialization | sha256:due-crash | Reuse the persisted fingerprint and repair the missing ticket link |
| unlinked | Reconcile materialization | Recover pending materialization | sha256:pending-crash | Reuse the persisted fingerprint and repair the missing ticket link |
| SEO-051 | Reconcile in-flight obligation | Verify schema lift | sha256:inflight-cohort | Active ticket owns execution; verify it is still open in the canonical backlog before any sleep decision |
| SEO-105 | Reconcile in-flight obligation | Improve indexation | sha256:docs-cohort | Active ticket owns execution; verify it is still open in the canonical backlog before any sleep decision |
