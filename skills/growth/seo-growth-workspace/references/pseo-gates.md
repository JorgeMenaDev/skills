# pSEO Gates

Use for `pseo-planning` mode and before publishing programmatic pages.

## Default Decision

Plan pSEO early, publish late. For new domains or newly verified GSC properties, do not mass-publish until normal blog/content publishing is proven.

## Publish Gates

All must be true before publishing a batch:

- At least one normal blog/article URL is deployed and linked.
- The blog/article URL is indexed, submitted for indexing, or has a documented crawl path.
- Sitemap includes the page type or generated URLs.
- Each generated page has unique copy, not token-swapped boilerplate.
- Each page has a specific buyer, search intent, pain, offer, internal links, and CTA.
- Data source has been validated for missing/duplicate variables.
- Batch size is small enough to inspect manually before expanding.

## Plan Shape

Use `.seo/pseo/plan.md` or `templates/pseo-plan.md` with:

- Page types and URL patterns.
- Data source paths.
- Buyer/search intent for each type.
- Internal-link strategy.
- Quality gates.
- Publish/no-publish decision.
- First batch size and rollback/removal plan.

## Common Page Types

| Type              | Example                         | Notes                                    |
| ----------------- | ------------------------------- | ---------------------------------------- |
| Audience solution | `/seo-automatico-para-agencias` | Needs segment-specific pain and workflow |
| Comparison        | `/alternativa-a-surfer-seo`     | Must be fair, accurate, and current      |
| Use case          | `/software-seo-para-blogs-b2b`  | Anchor around problem and workflow       |
| Service/location  | `/plomeria-emergencia-santiago` | Only for true local/service businesses   |

## Service And City Page Gate

Use this only for true local or service-area businesses. Do not create generic doorway pages for cities, neighborhoods, or services the business does not actually serve.

Before creating or publishing service-city pages, confirm:

- The service area is real and can be stated honestly.
- The page has unique local proof, examples, constraints, FAQs, or service context.
- The page has internal links from relevant service, city, blog, GBP, or hub pages.
- The CTA uses a real phone, booking, contact, or lead path.
- Reviews, testimonials, awards, licenses, photos, and local claims are real or clearly omitted.
- Citation or local profile targets are identified when relevant.
- The batch is small enough to inspect manually before expanding.

If unique local proof is missing, create a broader service page, location hub, or content brief instead of publishing thin city variants.

## Verification

- Sample generated pages locally or in preview.
- When the target has a pSEO data validator, run it before publishing and save the manifest or report.
- When reviewing a planned batch, add `--snapshot-output .seo/pseo/<slug>-publish-snapshot.json` to save the rendered publish-preview manifest. Review this file before building real routes or submitting URLs for indexing.
- If planned pSEO routes are rendered before the publish gate is cleared, keep them `noindex,nofollow` and out of `sitemap.xml` until the normal blog/indexing path and manual QA are proven.
- Check title/meta/H1 uniqueness.
- Check internal links and sitemap. For the first published batch, verify homepage or hub links to all published/indexable pSEO pages and no crawl paths to planned/noindex pages.
- Check mobile layout.
- Confirm no accidental indexation of draft/low-quality pages.
