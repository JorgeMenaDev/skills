# pSEO Gates

Use for `pseo-planning` mode and before publishing programmatic pages.

## Default Decision

Plan pSEO early, publish late. For new domains or newly verified GSC properties, do not mass-publish until normal blog/content publishing is proven.

These gates operationalize Google's doorway pages policy and scaled content abuse policy (March 2024); cite them by name when defending a publish/no-publish decision.

## Publish Gates

All must be true before publishing a batch:

- At least one normal blog/article URL is deployed and linked.
- The blog/article URL is indexed or independently discoverable (crawlable internal links plus sitemap). Manual submission alone does not satisfy this gate.
- Sitemap includes the page type or generated URLs.
- Each generated page has unique copy, not token-swapped boilerplate.
- Each page has a specific buyer, search intent, pain, offer, internal links, and CTA.
- Data source has been validated for missing/duplicate variables.
- Batch size is small enough to inspect manually before expanding.

## Batch Expansion Gate

Publish batch N+1 only after batch N reaches a target indexed rate (for example 80% within 2-4 weeks). Watch "Crawled — currently not indexed" in GSC: rising counts signal a quality problem, not a queue.

## Plan Shape

Use `.seo/pseo/plan.md` or `templates/pseo-plan.md` with:

- Page types and URL patterns.
- Data source paths.
- Buyer/search intent for each type.
- Internal-link strategy.
- Quality gates.
- Publish/no-publish decision.
- First batch size and rollback/removal plan.

## Playbook Chooser

Data defensibility: proprietary > product-derived > user-generated > licensed > public. The weaker the data, the more unique per-page value each page must add.

| If you have...              | Playbook                                    |
| --------------------------- | ------------------------------------------- |
| Proprietary or product data | Directory/profile pages ("[category] tools") |
| Integrations                | "[A] + [B] integration" pages               |
| Design/creative assets      | Templates, examples                         |
| Multi-segment audience      | Personas ("[product] for [audience]")       |
| Real local presence         | Service/location pages (gate below)         |
| Utility/tool product      | Conversions/calculators ("[X] to [Y]")      |
| Reusable public utilities | Tool pages (calculators, generators, checkers, formatters, templates) |
| Deep domain expertise     | Glossary, curation ("best [category]")      |
| Competitor landscape        | Comparisons (formats below)                 |

## Common Page Types

| Type              | Example                         | Notes                                    |
| ----------------- | ------------------------------- | ---------------------------------------- |
| Audience solution | `/seo-automatico-para-agencias` | Needs segment-specific pain and workflow |
| Comparison        | `/alternativa-a-surfer-seo`     | Fair, accurate, current; pick a format below |
| Use case          | `/software-seo-para-blogs-b2b`  | Anchor around problem and workflow       |
| Service/location  | `/plomeria-emergencia-santiago` | Only for true local/service businesses   |
| Utility tool      | `/linkedin-text-formatter`      | Must provide a working task result, not just an article or empty form |

For utility/free tool pages, load `utility-tool-pages.md`; use pSEO gates only when the page family is generated from a dataset or batch template.

## Comparison Page Formats

Before publishing any format below, apply `references/commercial-integrity.md`; it owns selection methodology, self-inclusion, material-benefit disclosure, direct alternative links, update dates, and the anti-authority-rental boundary.

| Format                 | Intent                        | URL pattern              | Core sections                                                              |
| ---------------------- | ----------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| Alternative (singular) | Ready to switch from X        | `/alternatives/x`        | Switch pain, you as the alternative, comparison, who should(n't) switch, migration, CTA |
| Alternatives (plural)  | Researching options           | `/x-alternatives`        | Selection criteria, 4-7 real options (you first), summary table, recommendation by use case |
| You vs X               | Comparing you to X            | `/vs/x`                  | TL;DR, at-a-glance table, category-by-category, who each is best for (be honest), switcher proof |
| X vs Y (third-party)   | Comparing two competitors     | `/compare/x-vs-y`        | Both overviews, category comparison, who each fits, you as the third option |

## Service And City Page Gate

Use this only for true local or service-area businesses. Do not create generic doorway pages for cities, neighborhoods, or services the business does not actually serve.

Before creating or publishing service-city pages, confirm:

- The service area is real and can be stated honestly.
- Unique local proof, examples, constraints, FAQs, or service context.
- Internal links from relevant service, city, blog, GBP, or hub pages.
- A CTA with a real phone, booking, contact, or lead path.
- Reviews, testimonials, awards, licenses, photos, and local claims are real or clearly omitted.
- Citation or local profile targets are identified when relevant.
- The batch is small enough to inspect manually before expanding.

If unique local proof is missing, create a broader service page, location hub, or content brief instead of publishing thin city variants.

## Verification

- Sample generated pages locally or in preview.
- Run the target's pSEO data validator before publishing when one exists; save the manifest/report.
- When reviewing a planned batch, save the publish-preview manifest with `--snapshot-output .seo/pseo/<slug>-publish-snapshot.json` and review it before building routes or requesting indexing.
- Routes rendered before the gate clears stay `noindex,nofollow` and out of `sitemap.xml` until the normal blog/indexing path and manual QA are proven.
- Check title/meta/H1 uniqueness.
- Check internal links and sitemap: for the first batch, homepage/hub links reach all published/indexable pages and no crawl paths reach planned/noindex pages.
- Check mobile layout.
- Confirm no accidental indexation of draft/low-quality pages.
