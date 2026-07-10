# Schema And Rich Results

Use for schema audits, JSON-LD implementation, and rich-results validation.

## Schema Selection

| Site/page type          | Preferred schema                                                               |
| ----------------------- | ------------------------------------------------------------------------------ |
| SaaS/product homepage   | `Organization`, `WebSite`, `SoftwareApplication`                               |
| Local business homepage | `LocalBusiness` subtype, `WebSite`                                             |
| Blog post/article       | `Article` or `BlogPosting`, `BreadcrumbList` if breadcrumbs exist              |
| pSEO comparison         | `WebPage`, `BreadcrumbList`; `FAQPage` only with visible page-specific FAQs    |
| Pricing                 | `Product`/`Offer` only when pricing is visible and accurate                    |

## Guardrails

- Schema must match visible page content.
- Do not invent reviews, aggregate ratings, addresses, prices, awards, or availability.
- Use absolute canonical URLs.
- Keep IDs stable with `@id` anchors.
- Prefer one graph per page over scattered duplicate snippets.
- Use `FAQPage` only when visible FAQs genuinely help users — never as a rich-result growth lever (see Deprecated Rich Results).
- `Product` markup is for shopping-data products; SaaS pricing-page eligibility is shaky. Do not promise pricing rich results.

## Deprecated Rich Results

The markup can stay valid when it accurately describes visible content, but the SERP feature is gone. Do not claim schema grounds AI answers, and do not file tickets or forecast wins on these removed result types:

| Removed  | Rich result                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Sep 2023 | `HowTo` (documentation later deleted)                                                                     |
| Oct 2024 | Sitelinks search box                                                                                      |
| Jun 2025 | Seven low-usage types: Book actions, Course info, Claim Review, Estimated salary, Learning video, Special announcement, Vehicle listing |
| May 2026 | `FAQPage` (stopped 2026-05-07); Search Console API FAQ appearance deprecated August 2026                 |

## Detection Honesty

`curl` and web-fetch cannot prove schema absence: many CMS/SEO plugins inject JSON-LD client-side, and fetch tools strip `<script>` tags. Before filing a "missing schema" ticket, require rendered-DOM evidence (`document.querySelectorAll('script[type="application/ld+json"]')`) or a Rich Results Test result.

## Audit Matrix

| URL | Expected schema | Rendered schema | Missing/invalid | Risk | Fix |
| --- | --------------- | --------------- | --------------- | ---- | --- |

## Route-Family Coverage

Schema is not a site-level yes/no. Sample at least one URL per public route family:

| Route family | Expected schema | Rendered types/counts | Visible-content match? | Leakage? | Validation guard? |
| --- | --- | --- | --- | --- | --- |
| Homepage | `Organization`, `WebSite`, product/local type, visible homepage FAQ only when useful | | | | |
| Blog/article | `Article` or `BlogPosting`, `BreadcrumbList` when breadcrumbs exist | | | | |
| Published pSEO | `WebPage`, `BreadcrumbList`, page-specific `FAQPage` only when visible FAQs add real value | | | | |
| Planned/noindex pSEO | Site identity only unless the page is intentionally indexable | | | | |
| Resource/tool | `TechArticle`, `SoftwareApplication`, or `WebPage` only when visible content supports it | | | | |
| Pricing | `Product`/`Offer` only when pricing and terms are visible and accurate | | | | |

Check type leakage from shared layouts: homepage `SoftwareApplication` or `FAQPage` must not silently render on blog, resource, or pSEO pages. Compare rendered type counts, not just JSON-LD presence.

## Done Criteria

- JSON-LD renders in production HTML.
- It parses as JSON.
- Types match visible content.
- Important URLs are checked after deploy by route family.
