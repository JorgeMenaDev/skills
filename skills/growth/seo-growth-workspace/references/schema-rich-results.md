# Schema And Rich Results

Use for schema audits, JSON-LD implementation, and rich-results validation.

## Schema Selection

| Site/page type          | Preferred schema                                                               |
| ----------------------- | ------------------------------------------------------------------------------ |
| SaaS/product homepage   | `Organization`, `WebSite`, `SoftwareApplication`, `FAQPage` if real FAQs exist |
| Local business homepage | `LocalBusiness` subtype, `WebSite`, `FAQPage` if real FAQs exist               |
| Blog post/article       | `Article` or `BlogPosting`, `BreadcrumbList` if breadcrumbs exist              |
| pSEO comparison         | `WebPage`, `BreadcrumbList`, `FAQPage` only with visible FAQs                  |
| Pricing                 | `Product`/`Offer` only when pricing is visible and accurate                    |

## Guardrails

- Schema must match visible page content.
- Do not invent reviews, aggregate ratings, addresses, prices, awards, or availability.
- Use absolute canonical URLs.
- Keep IDs stable with `@id` anchors.
- Prefer one graph per page over scattered duplicate snippets.

## Audit Matrix

| URL | Expected schema | Rendered schema | Missing/invalid | Risk | Fix |
| --- | --------------- | --------------- | --------------- | ---- | --- |

## Route-Family Coverage

Schema is not a site-level yes/no. Sample at least one representative URL per public route family that exists:

| Route family | Expected schema | Rendered types/counts | Visible-content match? | Leakage? | Validation guard? |
| --- | --- | --- | --- | --- | --- |
| Homepage | `Organization`, `WebSite`, product/local type, real homepage FAQ if present | | | | |
| Blog/article | `Article` or `BlogPosting`, `BreadcrumbList` when breadcrumbs exist | | | | |
| Published pSEO | `WebPage`, `BreadcrumbList`, page-specific `FAQPage` only with visible FAQs | | | | |
| Planned/noindex pSEO | Site identity only unless the page is intentionally indexable | | | | |
| Resource/tool | `TechArticle`, `HowTo`, `SoftwareApplication`, or `WebPage` only when visible content supports it | | | | |
| Pricing | `Product`/`Offer` only when pricing and terms are visible and accurate | | | | |

Check for type leakage across shared layouts. Homepage `SoftwareApplication` or homepage `FAQPage` should not silently render on blog, resource, or pSEO pages unless the visible page content also supports that schema. Compare rendered type counts, not just whether JSON-LD exists.

## Done Criteria

- JSON-LD renders in production HTML.
- It parses as JSON.
- Types match visible content.
- Important URLs are checked after deploy by route family.
