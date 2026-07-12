# Operating Loop

Use for `operate` mode: continuing SEO work from an existing target repo without treating SEO as a one-time checklist.

## Purpose

The skill should always answer:

- What was the last SEO action?
- What evidence was collected?
- What is currently in progress or ready?
- If nothing is ready, what should be checked next?
- What is the next smallest evidence-backed improvement?

Do not conclude SEO is done because the visible backlog is empty. Apply the Empty Backlog Rule in `references/ticket-architecture.md` and route every dry result through the three-terminal contract in `references/never-dry-loop.md`.

## State Read Order

`.seo/` here means the resolved workspace root — repo-local `.seo/` in standalone mode, `.seo/sites/<slug>/` in hub mode (`references/hub-mode.md`). Read current state before choosing work:

1. `.seo/backlog.md` for current focus, in-progress work, Ready rows, Blocked rows, and Done history.
2. `.seo/loops/` for optional schema-1 loop state, wake predicates, certificates, occurrences, obligations, coverage, and lease contention; run `node "$SKILL_DIR/scripts/cadence-status.mjs" --workspace "$SITE_WORKSPACE" --format backlog` to derive the current cadence status.
3. `.seo/log.md` for the last action, handoff notes, stale leads, and recheck dates.
4. `.seo/audit.md` for evidence-backed findings and unresolved risks.
5. `.seo/strategy.md` for durable decisions, tooling, market, language, and production paths.
6. Latest relevant `.seo/reports/*` for dated GSC, analytics, content, pSEO, backlink, local SEO, validation, or admin evidence.
7. `.seo/backlinks/work-log.md` for pending outreach, submissions, and live-link states.
8. `.seo/context.md` for business context, ICP, competitors, conversion paths, and constraints. If missing in a mature workspace, use `.seo/strategy.md`, `.seo/audit.md`, `.seo/README.md`, and any product/positioning doc the repo keeps (for example `.agents/product-marketing.md`) for the current run and record workspace drift.

If `.seo/` is missing, run `bootstrap` first. If a required file is missing in an existing workspace, create only that missing file and preserve existing notes unless the run is no-write; then report the drift instead of writing.

## Target Boundary

Before continuing a current-focus or blocked ticket, ask whether it is still the target site's growth work. A ticket should be parked or moved out of the active loop when it is mainly:

- infrastructure monitoring,
- another site's publishing path,
- waiting on another operator or a scheduled run,
- blocked on product/business ownership rather than SEO implementation, or
- outside the surface the user asked to improve.

Label reports with the target surface at the top. When parking a side monitor, record the evidence, owner/surface, and next unblock signal, then continue with the smallest target-owned SEO checkpoint. In hub mode, a parked ticket that belongs to another *registered* site may additionally be re-filed into that site's backlog per the Cross-Site Re-Filing rule in `references/hub-mode.md`.

## Work Selection Order

Choose work using the Work Selection order in `references/ticket-architecture.md`. That file owns the order, duplicate rules, and done criteria; do not restate them here or in the workspace.

At selection, after the state read and under the per-site lease, derive and persist a `candidateFingerprint` for each due measurement obligation before ticket creation; the obligation may remain `pending` or `due` with a null ticket during this legal intermediate. Reconcile by that fingerprint, find and reuse an active ticket carrying it or create one Ready row, then set the obligation to `materialized` and persist the ticket ID. A `materialized` obligation with a fingerprint and null ticket is also a legal interruption state. If interrupted after either write, repeat the same sequence: fingerprint reconciliation converges on the one active Ready ticket, surfaces either intermediate, and repairs the missing link instead of creating a duplicate. A `materialized` obligation whose linked ticket is already closed is surfaced as an in-flight inconclusive return and reconciled through the one atomic ledger replacement defined in `references/never-dry-loop.md`. The script reports due and repairable in-flight obligations; `operate` performs this materialization and reconciliation.

## Lightweight Checkpoints

When no current, in-progress, or Ready ticket exists, do not rerun every audit. Pick the smallest checkpoint suggested by stale evidence or the most likely growth constraint.

| Area | Check | Likely ticket area |
| --- | --- | --- |
| Indexability | robots, sitemap, canonical host, noindex, changed public routes | `indexability` |
| Search Console | sitemap read state, URL inspection state, page/query opportunities, stale follow-ups | `gsc` |
| Analytics | pageview proof, conversion events, organic landing pages, missing CTA/form tracking | `analytics` |
| Conversion | cold-visitor CTA paths, pricing/contact/demo path, mobile CTA behavior | `cro` |
| Content | blog renderer, recent posts, content calendar, keyword gaps, stale briefs | `content` |
| Internal links | orphan pages, blog-to-money-page links, pSEO hub links, repeated exact-match anchors | `internal-links` |
| pSEO | planned vs published state, sitemap/noindex policy, batch QA, stale generated pages | `pseo` |
| Schema | rendered JSON-LD, visible-content match, missing page-type schema | `schema` |
| Performance | CWV field data (CrUX/PSI or the GSC CWV report), public pages loading app/auth code, image/font regressions | `performance` |
| Authority | backlink work-log states, staged prospects, live-link verification, entity/profile gaps | `backlinks` or `entity` |
| AI visibility | AI-crawler access state, assistant citations for money queries, assistant referral traffic | `ai-visibility` |
| Local | GBP, reviews, citations, service-area pages, local competitor changes | `local-seo` |
| Reporting | missing monthly report, stale metrics, no single next action | `reporting` |

If all checks look healthy, record the evidence in the coverage ledger and route the result through the three-terminal contract. A sleep certificate is valid only when the required coverage is fresh; otherwise select the stale rung or record the missing observation as blocked.

## Empty Backlog Final Checkpoint

Use this when the user asks to continue until no backlog items remain, or when all visible work is external-gated.

1. Read backlog, log, audit, strategy, latest reports, and live public sanity routes.
2. Read `.seo/loops/` and acquire the per-site lease before any state mutation, as required by `references/never-dry-loop.md`.
3. Separate unblocked repo-owned SEO actions from external gates such as GSC recrawl lag, missing profile ownership, missing contact destination, legal/business facts, or infrastructure monitoring.
4. If no unblocked repo-owned action remains, run the progressive frontier sweep in `references/frontier-sweep.md`. Then issue a scoped dated sleep certificate or record an honest blocker; do not write a dry checkpoint that bypasses the terminal contract or create a fake Ready ticket.
5. Move out-of-scope side monitors out of the active backlog with evidence and an owner/surface note.
6. Name the next unblock signals clearly without turning them into backlog items.

## Handoff Log

Write a short `.seo/log.md` handoff after each run when evidence, wake state, or terminal outcome changes, per the hot-loop coalescing rule in `references/never-dry-loop.md`. Long evidence belongs in `.seo/audit.md` or `.seo/reports/*`; the log is for continuity.

```md
## YYYY-MM-DD - Short title

- Mode: operate / technical-seo-fix / content-ops / ...
- Read: backlog, log, audit, strategy, latest reports.
- Chosen ticket: SEO-000 or `new ticket created`.
- Evidence: command, live URL, report path, admin surface, or limitation.
- Result: executed work, scoped dated sleep, or honest blocked; include any schedule stop/cancellation/exhaust marker when applicable.
- Next lead: one concrete follow-up with owner or recheck date.
```

## Exit Criteria

`operate` exits only after current state has been read, the next work has been selected by the order above, and one terminal from `references/never-dry-loop.md` has been recorded. Executed work still requires verification evidence and a handoff entry; a sleep certificate or blocked result carries its own evidence, wake/recheck state, and appropriate handoff without claiming work was done.
