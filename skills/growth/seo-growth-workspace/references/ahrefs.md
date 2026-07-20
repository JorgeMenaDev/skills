# Ahrefs External Crawl

Use for bootstrap or adoption preflight, the monthly Ahrefs External Crawl, provider-access checks, and any Ahrefs evidence. This file owns the provider-specific capability, scope, evidence, and checkpoint contract. Generic cadence and gate timing live in `references/policy.md`; occurrence transitions and reconciliation live in `references/operating.md` and `scripts/loop-state.mjs`.

## Capability boundary and authority

**External Crawl** is the sole mandatory Ahrefs capability. Run it monthly at every SEO stage as cadence id `ahrefs-external-crawl`. **Authority Discovery** is optional, on demand, and supplementary: independently verify anything promoted from it, and create no cadence or access gate for its absence. Organic Discovery and Domain Rating, including the public DR API, are outside this mandatory contract.

Ahrefs is third-party evidence and never displaces:

- Search Console for Google performance and index evidence;
- first-party analytics for outcomes;
- live HTTP/HTML for current production behavior;
- repository state for implementation intent; or
- deterministic crawling and indexability checks.

Provider work uses supervised Chrome. The authorized lane covers manual project preflight, crawl operation, and inspection of permitted results. It does not authorize payment or a paid-plan commitment, unattended UI automation, scraping, private endpoints, bulk extraction, browser extensions, Ahrefs Web Analytics, API/MCP integration, automatic provisioning, or a credential store.

## Preflight and declared scope

Operate exactly one resolved SITE_WORKSPACE. Record credentials by configured location or account identity only, never by value. Before a crawl, capture:

- the canonical public origin and aliases; sitemap or other canonical URL source; public exclusions; dated denominator; and whether the declaration is `site-wide` or a named `partial` scope;
- Ahrefs workspace custodian and project identity; verification state and method; plan/capability; crawl credits or page ceiling; configured scope, device, filters, schedule, and last completed crawl;
- availability of the supervised Chrome lane; and
- existing GSC, analytics, live/repository, deterministic-crawl, and Ahrefs evidence needed for precedence and deduplication.

The declared scope contains only canonical public URLs. Exclude unrelated authenticated, staging, private, and regulated surfaces. A site-wide declaration uses the dated canonical public set. When provider capacity prevents site-wide coverage, a named partial declaration is valid only when it lists the included URL set, exclusions, denominator, and explicit partial status.

Coverage is the number of declared in-scope URLs included in the completed crawl divided by the dated declared denominator. A qualifying site-wide or named partial crawl reaches at least 90%. A named partial result remains partial regardless of its percentage and cannot support a site-wide claim.

## Normalized report

Write one dated durable report for the occurrence. Screenshots and permitted exports may support it but never replace it.

| Field | Required content |
| --- | --- |
| Site and run | Site, date, operator, Ahrefs workspace/project, plan/capability |
| Scope | Canonical origin, `site-wide` or named `partial`, URL source, exclusions, denominator date |
| Crawl | Completion/freshness, configuration, device, filters, schedule context |
| Coverage | Numerator, denominator, percentage, and whether the 90% gate passed |
| Evidence | Baseline pointers, independent live/repository verification, stronger-source contradictions |
| Findings | Unique normalized defect/action, source URLs, affected targets, severity, duplicate status, disposition, owner |
| Cost and limits | Operator time, page/credit limits, missing surfaces, reproducibility limits |
| Decision | Occurrence result, decision changed, gate or next wake, limitations |

Normalize findings by unique independently verified defect or action. Provider labels, occurrence totals, raw issue counts, Health Score, an enabled schedule, and project verification are context only. Compare each candidate with existing audit, backlog, reports, and deterministic evidence before promoting it; reproduction uses live behavior and repository intent where relevant.

For cross-site rollout proof, keep workspace reconciliation and provider completion separate:

| Site | Installed version | Reconciliation report/stamp | Reconciliation state | Ahrefs project/scope | Access state | Latest completed crawl | Coverage | Evidence report | Ahrefs checkpoint | Gate/next wake | Verify result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Occurrence and checkpoint

Use the existing cadence occurrence lifecycle in `references/operating.md` with one `{cadenceId, dueWindow}` identity and one carrier ticket per monthly window. Migration introduces only the current or next window; it never backfills history. An Ahrefs occurrence and deterministic Crawl/indexability remain independent even when their due windows align: neither can satisfy or block the other.

Apply the material-invalidation triggers in `references/policy.md` without reopening or rewriting occurrence history. Before the current occurrence is satisfied, discard stale candidate evidence from its qualification decision and keep that occurrence due with its existing carrier. After satisfaction, preserve the satisfied occurrence and create exactly one invalidation successor whose distinct `dueWindow` runs from the material-change date through the day before the next regular monthly window; all material changes observed on the same workspace date coalesce into that successor and its one carrier. Satisfy it only after that workspace date closes and its qualifying evidence remains current. The checkpoint returns to due and cannot pass again until the successor qualifies. This successor is current work, not migration backfill, and all transitions remain owned by the existing occurrence lifecycle.

Report the checkpoint as:

- **`passed`** — a dated crawl completed, covered at least 90% of its declared site-wide or named partial scope, has the normalized report above, and every promoted finding was independently verified. Satisfy with existing result `ok` or `alerted`; `alerted` links the owning non-duplicate remediation work.
- **`due`** — the current window has no qualifying result, including before materialization, during active execution, or after material invalidation.
- **`blocked`** — the provider checkpoint cannot complete. Use the existing blocked occurrence transition and record one gate without duplicating its carrier ticket.

Missing account, session, project, permission, capability, credits, or useful coverage uses `access:ahrefs`. Temporary loss of the supervised Chrome lane uses `browser-slot:ahrefs`. Apply the wake and escalation timing owned by `references/policy.md`. Either gate leaves this occurrence incomplete while unrelated SEO and deterministic crawling continue.

Reconciliation and the Ahrefs checkpoint are independent status axes. An upgrade report records reconciliation as `current` or `pending` and Ahrefs as `passed`, `due`, or `blocked`; provider access never proves contract currency, and reconciliation never proves provider completion. Preserve prior occurrences, reports, gates, findings, and remediation ownership during upgrade or rollback.
