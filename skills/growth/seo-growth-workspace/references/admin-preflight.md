# Admin And Auth Preflight

Run this before changing authenticated production surfaces. Save results in `.seo/reports/admin-setup-YYYY-MM-DD.md` using `templates/admin-setup.md`.

## Evidence Matrix

| Surface           | Evidence to capture                                                                                                        | Common blockers                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Hosting/platform  | Team/workspace, project, production domain, root directory, framework, latest deployment, deploy source, analytics toggles | Wrong team/project, monorepo root mismatch, protected deploy gate, old production alias           |
| Search Console    | Property type, verified owner/delegated access, sitemap status, URL inspection status, rich result/CWV/HTTPS reports       | Unverified property, fresh `Couldn't fetch`, permission issue, wrong domain property              |
| Analytics         | Provider, property/project, install path, live traffic proof, conversion/events configured                                 | Installed but undeployed, no traffic yet, wrong property, events missing                          |
| DNS/domain        | Registrar/DNS provider, active zone, required records, verification records, canonical host                                | Wrong zone, stale DNS, missing TXT, www/apex mismatch                                             |
| App scheduler/CMS | Project exists, locale/lane, calendar rows, publish destination, UI visibility, CLI/API agreement                          | Backend project not visible in workspace UI, missing renderer, wrong locale, blocked publish auth |
| Email/CRM/forms   | Provider, destination list/inbox, lead capture path, test submission status                                                | Form sends nowhere, automation paused, missing sender/domain setup                                |

## Rules

- Never print secret values. Record the variable/setting name and status only.
- Record exact dates for fresh states such as new GSC properties or just-submitted sitemaps.
- Treat `Couldn't fetch` immediately after sitemap submission as a retry state if live `curl`/browser fetch succeeds; log a follow-up instead of over-fixing.
- If the admin UI and CLI/API disagree, stop that lane and log the mismatch before scheduling or publishing more work.

## No-Mutation Validation

Use this path for read-only audits or runs where authenticated/admin changes are out of scope.

- Use repo, public URLs, existing `.seo` reports, and already-available screenshots/exports.
- Mark GSC, analytics, hosting dashboards, GBP, CMS, or billing/admin surfaces as `not checked by constraint` when access would require auth, export setup, or mutation.
- Do not ask for OAuth setup, dashboard exports, indexing requests, admin toggles, or provider writes during a no-mutation run.
- Record what proof would be needed for a real operation run.
