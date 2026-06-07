# SEO ticket taxonomy

## Priorities

| Priority | Meaning                                                         | Examples                                                                      |
| -------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| P0       | Indexability, data loss, or production blockers                 | robots blocking site, missing sitemap on launched site, broken canonical host |
| P1       | Revenue, conversion, measurement, or high-confidence quick wins | broken CTA, missing analytics, GSC page-2 money page                          |
| P2       | Quality, performance, schema, or reliability improvements       | JSON-LD gap, CWV issue, duplicate metadata                                    |
| P3       | Content, internal links, pSEO planning, or expansion            | blog cluster, internal-link pass, pSEO dataset                                |
| P4       | Authority, backlinks, monitoring, or longer-term bets           | citation cleanup, outreach, monthly monitor                                   |

## Areas

| Area             | Scope                                                             |
| ---------------- | ----------------------------------------------------------------- |
| `indexability`   | robots, sitemap, noindex, redirects, canonical host               |
| `gsc`            | Search Console setup, reports, indexing, query/page opportunities |
| `analytics`      | analytics install, events, conversion tracking, reporting         |
| `cro`            | CTAs, forms, signup/contact paths, trust blocks                   |
| `schema`         | JSON-LD, rich-results eligibility, entity markup                  |
| `performance`    | Lighthouse, CWV, mobile rendering                                 |
| `content`        | keyword research, blog calendar, briefs, articles                 |
| `internal-links` | crawl paths, anchors, hubs, orphan pages                          |
| `pseo`           | programmatic page planning, datasets, templates, publish gates    |
| `local-seo`      | GBP, reviews, citations, NAP, service areas                       |
| `backlinks`      | link opportunities, outreach, submissions                         |
| `entity`         | brand/entity consistency, profiles, sameAs                        |
| `reporting`      | monthly reports and deltas                                        |
| `admin`          | Vercel, DNS, CMS, scheduler, auth, permissions                    |

## Done Criteria

| Area             | Evidence required                                                              |
| ---------------- | ------------------------------------------------------------------------------ |
| `indexability`   | Live URL plus robots/sitemap/canonical/noindex evidence                        |
| `gsc`            | Property/date range, exported/browser data, URL inspection or sitemap state    |
| `analytics`      | Installed code/admin state plus live event/pageview or blocked no-traffic note |
| `cro`            | Desktop and mobile CTA path verification                                       |
| `schema`         | Rendered parseable JSON-LD matching visible content                            |
| `content`        | Keyword/calendar/route/sitemap evidence                                        |
| `internal-links` | Rendered link from source to 200/canonical target                              |
| `pseo`           | Plan, data, gates, explicit publish/no-publish decision                        |
| `local-seo`      | GBP/citation/review matrix plus applied change or ranked action                |
| `backlinks`      | Public indexable URL or logged outreach/submission status                      |
| `reporting`      | Source, date range, deltas, wins/problems/next action                          |

## Work Selection

Use this order:

1. `Current focus` when it points to a real ticket.
2. First real row in `In progress`.
3. Top Ready ticket by priority and table order.
4. Blocked ticket that has become unblockable.
5. New evidence-backed ticket from stale notes, expired recheck dates, missing reports, or checkpoint findings.

Empty Ready/In progress tables do not mean SEO is done. Run the smallest useful operating-loop checkpoint, create or update one evidence-backed ticket if needed, and write the handoff in `.seo/log.md`.
