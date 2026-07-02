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

## Work Selection

When choosing the next task, use this order:

1. `Current focus` in `.seo/backlog.md` when it points to a real ticket and still belongs to the requested target surface.
2. First real row in `In progress`.
3. Top Ready ticket by priority and table order.
4. Blocked ticket that has become unblockable because access, data, ownership, deployment, or product state changed.
5. New evidence-backed ticket from stale notes, expired recheck dates, missing reports, or checkpoint findings.

Do not create a duplicate ticket when `.seo/log.md`, `.seo/audit.md`, `.seo/reports/*`, or an existing backlog row already points to the same outcome.

## Empty Backlog Rule

An empty `Ready` and `In progress` queue does not mean SEO is done. It means the operator should use `references/operating-loop.md` to run the smallest useful checkpoint, then either:

- create one evidence-backed Ready ticket,
- update a newly unblocked existing ticket,
- write a reporting/recheck ticket with a concrete date, or
- log evidence that no immediate action is useful yet.

When the user has explicitly asked to exhaust all unblocked work, do not create a recheck ticket only to keep the queue alive. A "no immediate action remains" checkpoint is acceptable when remaining work is external-gated by recrawl lag, missing access, missing contact/profile ownership, business decisions, or side infrastructure monitoring.

Do not run every audit every time. Use stale evidence, missing reports, recent publishes, changed routes, changed access, or the latest handoff note to choose the checkpoint.

## Done Criteria By Area

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

## Blocker Rules

- Block only on missing credentials, missing ownership, unsafe legal/business facts, or contradictory backend/UI state that would make the next action risky.
- Each blocker needs: what is blocked, exact evidence, owner, and next unblock action.
- If a route/tool has a safe fallback, use the fallback and log the limitation instead of blocking.
- Park side infrastructure or monitoring tickets when they are not the requested target site's SEO growth work. Keep their evidence in a report/log entry, but do not let them consume the active `operate` loop.

## Backlog Hygiene

- Keep one current focus ticket.
- Do not create duplicate tickets for the same outcome.
- Move completed tickets to Done with date and verification summary.
- Record long-form evidence in `.seo/audit.md` or `.seo/reports/*`, not inside the backlog table.
- Write the chronological handoff in `.seo/log.md` after each run.
