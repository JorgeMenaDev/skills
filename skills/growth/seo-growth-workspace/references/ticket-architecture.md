# Ticket Architecture

Use this before creating or changing `.seo/backlog.md`.

## Canonical Ticket Shape

| Field    | Rule                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID       | `SEO-000`, `SEO-001`, monotonically increasing per target workspace                                                                                                             |
| Priority | `P0` urgent indexability/data loss, `P1` revenue/conversion/measurement, `P2` quality/performance/schema, `P3` content/internal links/pSEO, `P4` authority/backlinks/monitoring |
| Area     | One of `indexability`, `gsc`, `analytics`, `cro`, `schema`, `performance`, `content`, `internal-links`, `pseo`, `local-seo`, `backlinks`, `entity`, `ai-visibility`, `reporting`, `admin` |
| Ticket   | One clear outcome, not a vague theme                                                                                                                                            |
| Verify   | The exact evidence required to move to Done                                                                                                                                     |
| Status   | Location in `Ready`, `In progress`, `Blocked`, or `Done` table                                                                                                                  |

## Evidence Standards

Every ticket needs at least one concrete verification source:

- File path and command output for repo changes.
- Live URL, status code, rendered metadata, sitemap/robots output, or browser screenshot for site changes.
- Admin report row for Vercel/GSC/analytics/DNS/scheduler changes.
- API/CLI output for content engine state.
- Public URL evidence for backlinks/citations.
- Date range and property for GSC/analytics reports.

Weak evidence such as "looks good", "should work", or "configured" is not enough.

## Binary Eligibility Gate

An implementation ticket is eligible only when every condition below is satisfied. This is a phase-1, nonnumeric gate; comparative scoring, portfolio mix, and stage weighting are deferred.

- Dated source signal.
- Target-owned outcome.
- Non-duplicate fingerprint checked against the backlog, log, audit, reports, obligations, and existing tickets.
- Phase readiness per the existing first-run phase ladder in `references/phase-architecture.md`.
- Plausible business-impact hypothesis.
- At least one dated first-party or `[E]`/`[P]` observation; use the evidence-tier rules in `references/evidence-conventions.md`.
- A baseline, or an explicit proxy/acquisition plan naming the decision threshold it will inform.
- The metric and decision the work can affect.
- Rough effort and dependencies.
- Acceptance evidence by the existing Done Criteria below; do not create a second verification standard.

If any condition fails, retain the candidate as a dated skip or blocked record with the failing gate, owner, and either a dated recheck value or `closed:<reason>`. `closed:<reason>` requires human provenance and is exempt from recheck liveness. A gate without an observable predicate or honest recheck value is blocked, not silently eligible.

### Gate and cadence composition

For a due cadence occurrence, due-ness is its dated source signal, and the cadence row’s stated check and decision satisfy the hypothesis and metric conditions. Dedupe and all other eligibility conditions still apply. A still-open ticket for the same `{cadenceId, dueWindow}` reuses that ticket instead of materializing another one. See `references/never-dry-loop.md` for the occurrence lifecycle and state contract.

## Emergency Selector

A due safety check is evidence to run the check, never evidence of a P0. Only an observed red delta promotes to P0 through this selector, which runs ahead of Current focus and In progress. If it interrupts active work, record the interrupted ticket and its exact resume point in the handoff; resume it after the emergency is verified or honestly blocked. Universal safety checks remain eligible regardless of cadence or stage.

## Work Selection

When choosing the next task, use this order:

1. The Emergency Selector above for an observed red safety delta.
2. `Current focus` in `.seo/backlog.md` when it points to a real ticket and still belongs to the requested target surface.
3. First real row in `In progress`.
4. Top Ready ticket by priority and table order.
5. Blocked ticket that has become unblockable because access, data, ownership, deployment, or product state changed.
6. New evidence-backed ticket from stale notes, expired recheck dates, missing reports, or checkpoint findings.

Do not create a duplicate ticket when `.seo/log.md`, `.seo/audit.md`, `.seo/reports/*`, or an existing backlog row already points to the same outcome.

## Empty Backlog Rule

An empty `Ready` and `In progress` queue does not mean SEO is done. Use `references/operating-loop.md` to run the smallest applicable checkpoint and route its result through the three-terminal contract in `references/never-dry-loop.md`: create eligible work, issue a scoped dated sleep certificate, or record an honest blocker. A partial check must name the checked coverage; it cannot claim that nothing valuable exists.

When the user explicitly asks to exhaust all unblocked work, complete the required coverage sweep before issuing a sleep certificate. Do not create a recheck ticket only to keep the queue alive, and do not treat external gates or side infrastructure monitoring as target-owned work.

Do not run every audit every time. Use stale evidence, missing reports, recent publishes, changed routes, changed access, or the latest handoff note to choose the checkpoint.

## Done Criteria By Area

At the ticket's transition to Done, if the completed work created or materially revised a public surface, acquire the per-site lease and create or reuse the deduplicated measurement companion in `.seo/loops/measurement-obligations.json` defined by `references/never-dry-loop.md`. Record the ship-time baseline, metric, decision the measurement can change, due date, hypothesis, and page/cohort fingerprint. Apply the exemption only when the outcome is operationally final at ship time: ask whether any plausible post-ship observation could change a keep, rollback, iterate, or follow-up decision; if yes, the obligation is required, and only a recorded `no` with its final outcome and evidence is exempt. Due-date offsets by change type are configurable defaults (knobs rule: `references/never-dry-loop.md`).

| Area             | Done requires                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `indexability`   | Live URL, robots/sitemap/canonical/noindex evidence                                            |
| `gsc`            | Property/date-range evidence, exported/browser data, follow-up if data is fresh or unavailable |
| `analytics`      | Installed code/admin state plus live traffic/event or blocked no-traffic note                  |
| `cro`            | CTA path verified desktop and mobile                                                           |
| `schema`         | Rendered JSON-LD type and parseable output                                                     |
| `content`        | Keyword/brief/article/calendar state plus route/sitemap proof                                  |
| `internal-links` | Source pages, target pages, anchor text, and deployed verification                             |
| `pseo`           | Plan/data/gates plus explicit publish/no-publish decision                                      |
| `local-seo`      | GBP/citation/review matrix plus ranked actions or applied changes                              |
| `backlinks`      | Public indexable URL or logged outreach/submission status                                      |
| `ai-visibility`  | AI-crawler access evidence plus dated citation matrix or assistant-referral data               |
| `reporting`      | Data source, date range, deltas, wins/problems/next action                                     |

Any ticket that creates or materially revises a public SEO page also inherits the mandatory evidence and optional-submission decision in `references/page-launch.md`, regardless of Area.

## Blocker Rules

- Use the Binary Eligibility Gate above to classify failed candidate gates; also block on missing credentials, missing ownership, unsafe legal/business facts, contradictory backend/UI state that would make the next action risky, or any failed mandatory page-launch gate.
- Each blocker needs: what is blocked, exact evidence, owner, and next unblock action.
- If a route/tool has a safe fallback, use the fallback and log the limitation instead of blocking.
- Park side infrastructure or monitoring tickets when they are not the requested target site's SEO growth work. Keep their evidence in a report/log entry, but do not let them consume the active `operate` loop.

## Backlog Hygiene

- Keep one current focus ticket.
- Do not create duplicate tickets for the same outcome.
- Move completed tickets to Done with date and verification summary.
- Record long-form evidence in `.seo/audit.md` or `.seo/reports/*`, not inside the backlog table.
- Write the chronological handoff in `.seo/log.md` after each run.
