# Organic Outcome Bridge v1 — Andesphere dogfood

Date: 2026-07-13
Producer: `posthog-growth-workspace` 1.2.0
Consumer: `seo-growth-workspace` 5.1.2
Pilot: Andesphere public site, PostHog project `302810`, Search Console property `sc-domain:andesphere.com`

## Contract proved

- PostHog channel attribution was queried through `session.$channel_type = 'Organic Search'`; the nonexistent raw event `$channel_type` property was not used.
- Search Console and PostHog used the same closed 2026-06-12 through 2026-07-09 Pacific Time window. PostHog boundaries were `2026-06-12T07:00:00Z` inclusive through `2026-07-10T07:00:00Z` exclusive.
- PostHog was scoped to allowed entry host `www.andesphere.com`. Fifteen raw GSC page keys normalized to 14 unique canonical landing pages; `/es` was the only exact PostHog match and canonical-key uniqueness was verified.
- Every exported URL was verified as a public canonical page; no raw path values were persisted and the withheld non-public-path count was zero. The producer export contained aggregate counts only. Qualified leads and customers remained `null` because no verified same-session mappings exist; revenue is deliberately unavailable in v1.

## Joined decision table

| Landing page | GSC clicks | GSC impressions | GSC CTR | GSC position | Organic sessions | Primary conversions | Qualified leads | Customers | Revenue | Quality | SEO decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `https://www.andesphere.com/es` | 1 | 7 | 14.3% | 31.0 | 2 | 0 | unavailable | unavailable | unavailable | baseline; low sample; consent coverage unknown; GSC top rows only | No outcome-led backlog change. Preserve this baseline and continue demand/indexation work until a comparable window has enough volume. |
| `https://www.andesphere.com/` | 0 | 11 | 0% | 3.3 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Do not infer zero engagement; inspect analytics coverage and canonical mapping before changing SEO. |
| `https://www.andesphere.com/blog` | 0 | 46 | 0% | 24.8 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/blog/ai-automation-for-agencies` | 0 | 2 | 0% | 1.5 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/blog/ai-automation-quick-wins-sme` | 0 | 5 | 0% | 8.8 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/blog/ai-roi-calculator-custom-solutions` | 0 | 15 | 0% | 20.0 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/blog/llm-integration-services-2026` | 0 | 1 | 0% | 7.0 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/blog/why-custom-ai-solutions-matter` | 0 | 4 | 0% | 6.3 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/es/blog/agencia-chatbot-vs-freelancer-chatbot-para-empresas-chilenas-2026` | 0 | 2 | 0% | 10.5 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/showcase` | 0 | 12 | 0% | 17.3 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/solutions/ai-agents-london` | 0 | 32 | 0% | 62.9 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/solutions/ai-automation-london` | 0 | 70 | 0% | 50.8 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; two raw page keys canonicalized; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |
| `https://www.andesphere.com/solutions/custom-software-development-london` | 0 | 1,584 | 0% | 71.0 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Highest-demand unmatched page; validate analytics coverage/canonical behavior before interpreting conversion. |
| `https://www.andesphere.com/solutions/custom-software-singapore` | 0 | 5 | 0% | 19.4 | unavailable | unavailable | unavailable | unavailable | unavailable | GSC top rows only; no PostHog match | Same unmatched-path diagnostic; no outcome-led change. |

Outcome evidence changed the proposed SEO action: **no**. It prevented a false conversion-rate or revenue conclusion from a two-session sample.

## Commands and results

- `gsc-fetch.mjs --site sc-domain:andesphere.com --start 2026-06-12 --end 2026-07-09 --dimensions page` returned 15 page-dimensional rows, normalized to 14 canonical keys. `/es` had 1 click, 7 impressions, 14.3% CTR, and average position 31.0.
- A separate query/page export returned 95 rows for query analysis; it was not summed as the page total because query-dimensional rows can omit anonymized queries.
- The host-scoped session query returned `www.andesphere.com/es`: 2 organic sessions.
- The outcome query used the same session-start cohort, deduplicated `quote_form_submitted` and `cal_booking_completed` by session, and returned `/es`: 0 primary conversions.
- `node dev/seo-growth-workspace/validate-skill.mjs` passed.
- `node dev/seo-growth-workspace/command-inventory.mjs --verify` passed with 0 malformed commands and all executable foreign-CWD checks green.
- `node dev/seo-growth-workspace/evaluate-release.mjs --json` passed at 100/100 with all 52 deterministic and 17 manual gates green against `gate-results-5.1.2.json`.

## Limits

This is baseline evidence, not causal or decision-grade evidence. Search Console returns top rows rather than guaranteed-complete data; PostHog consent coverage is not yet quantified; no query was attributed to a person or session; CRM and billing remain the authorities for customer and revenue truth.
