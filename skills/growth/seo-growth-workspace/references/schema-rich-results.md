# Schema And Rich Results

Use for schema audits, JSON-LD implementation, and rich-results validation.

## Schema Selection

| Site/page type          | Preferred schema                                                               |
| ----------------------- | ------------------------------------------------------------------------------ |
| SaaS/product homepage   | `Organization`, `WebSite`, `SoftwareApplication`; `FAQPage` only if visible FAQs need semantic markup |
| Local business homepage | `LocalBusiness` subtype, `WebSite`; `FAQPage` only if visible FAQs need semantic markup |
| Blog post/article       | `Article` or `BlogPosting`, `BreadcrumbList` if breadcrumbs exist              |
| pSEO comparison         | `WebPage`, `BreadcrumbList`; `FAQPage` only with visible page-specific FAQs    |
| Pricing                 | `Product`/`Offer` only when pricing is visible and accurate                    |

## Guardrails

- Schema must match visible page content.
- Do not invent reviews, aggregate ratings, addresses, prices, awards, or availability.
- Use absolute canonical URLs.
- Keep IDs stable with `@id` anchors.
- Prefer one graph per page over scattered duplicate snippets.
- FAQ rich results are no longer appearing in Google Search as of 2026-05-07, and Search Console API support for the FAQ appearance is being deprecated in August 2026. Use `FAQPage` only when visible FAQs genuinely help users; do not treat it as a Google rich-result growth lever.

## Audit Matrix

| URL | Expected schema | Rendered schema | Missing/invalid | Risk | Fix |
| --- | --------------- | --------------- | --------------- | ---- | --- |

## Route-Family Coverage

Schema is not a site-level yes/no. Sample at least one representative URL per public route family that exists:

| Route family | Expected schema | Rendered types/counts | Visible-content match? | Leakage? | Validation guard? |
| --- | --- | --- | --- | --- | --- |
| Homepage | `Organization`, `WebSite`, product/local type, visible homepage FAQ only when useful | | | | |
| Blog/article | `Article` or `BlogPosting`, `BreadcrumbList` when breadcrumbs exist | | | | |
| Published pSEO | `WebPage`, `BreadcrumbList`, page-specific `FAQPage` only when visible FAQs add real value | | | | |
| Planned/noindex pSEO | Site identity only unless the page is intentionally indexable | | | | |
| Resource/tool | `TechArticle`, `HowTo`, `SoftwareApplication`, or `WebPage` only when visible content supports it | | | | |
| Pricing | `Product`/`Offer` only when pricing and terms are visible and accurate | | | | |

Check for type leakage across shared layouts. Homepage `SoftwareApplication` or homepage `FAQPage` should not silently render on blog, resource, or pSEO pages unless the visible page content also supports that schema. Compare rendered type counts, not just whether JSON-LD exists.

## Done Criteria

- JSON-LD renders in production HTML.
- It parses as JSON.
- Types match visible content.
- Important URLs are checked after deploy by route family.
