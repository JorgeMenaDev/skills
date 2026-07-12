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
| `performance`    | CWV field data, lab performance checks, mobile rendering          |
| `content`        | keyword research, blog calendar, briefs, articles                 |
| `internal-links` | crawl paths, anchors, hubs, orphan pages                          |
| `pseo`           | programmatic page planning, datasets, templates, publish gates    |
| `local-seo`      | GBP, reviews, citations, NAP, service areas                       |
| `backlinks`      | link opportunities, outreach, submissions                         |
| `entity`         | brand/entity consistency, profiles, sameAs                        |
| `ai-visibility`  | AI-crawler access, assistant citations, assistant referral proof  |
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
| `ai-visibility`  | AI-crawler access evidence plus dated citation matrix or referral data         |
| `reporting`      | Source, date range, deltas, wins/problems/next action                          |

## Work Selection

The work-selection order, duplicate rules, empty-backlog rule, and blocker rules live in the skill's `references/ticket-architecture.md`. Follow that file; do not restate its rules here. An empty Ready/In progress queue does not mean SEO is done — run the smallest useful operating-loop checkpoint and route the materialized workspace through the three-terminal contract in `references/never-dry-loop.md`.
