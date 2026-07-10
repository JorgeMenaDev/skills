# Utility Tool Pages

Use this with `content-ops` or `pseo-planning` when a product can ship small, indexable utility pages that satisfy search intent directly: calculators, converters, checkers, generators, formatters, analyzers, templates, curated examples, or public datasets.

## Why This Works

A useful tool page can rank and convert faster than a generic article because it solves the query on-page. Treat it as a product surface and linkable asset, not as thin programmatic SEO.

Examples of page families:

- Formatters and converters: `/linkedin-text-formatter`, `/json-to-csv`, `/utm-builder`.
- Checkers and analyzers: `/shadowban-checker`, `/website-speed-checker`, `/robots-txt-checker`.
- Calculators: `/twitter-engagement-rate-calculator`, `/roi-calculator`.
- Generators: `/ai-tweet-generator`, `/bio-generator`, `/invoice-generator`.
- Curated/example pages: `/tweets/paul-graham`, `/templates/cold-email`.

## Opportunity Discovery

Build a small matrix before creating pages:

| Candidate | Query / SERP intent | Volume / trend | Difficulty | Product fit | Tool can satisfy intent? | Conversion path | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |

Sources:

1. Search Console queries where users already want a task solved.
2. Competitor tool libraries, footers, navigation, and top pages.
3. SERP autocomplete / People Also Ask / related searches.
4. Product workflows where a public lightweight version can lead to signup.
5. Support/sales questions that can become a calculator, checker, or template.

Prefer pages where the result is useful without signup, but where deeper usage naturally maps to the product.

## Page Requirements

Each tool page needs:

- One exact job-to-be-done in the title, H1, intro, and UI.
- A working interactive tool, calculator, checker, generator, template, or real curated dataset.
- Indexable explanatory content around the tool: what it does, when to use it, examples, limitations, FAQs only if genuinely visible/useful.
- A clear CTA that follows the completed job, not a generic signup interruption.
- Internal links from a tools hub, relevant product pages, blog articles, and related tools.
- Unique metadata and canonical URL.
- Schema only when it matches visible content and Google-supported eligibility.
- Mobile usability and fast interaction.
- Analytics events for tool usage and CTA clicks.

Do not publish pages that are only keyword-swapped wrappers around the same empty generator or form. If the utility cannot work yet, create a content brief or `noindex` preview instead.

## Batch Strategy

- Start with 5-25 pages only when they are genuinely distinct jobs or datasets.
- Manually QA every page in the first batch.
- Request indexing only after crawlability, sitemap, canonical, and internal links are verified.
- Expand only after impressions/indexing/tool-usage prove the first batch has quality.
- If GSC shows many `Crawled - currently not indexed` or zero engagement, pause expansion and improve usefulness/internal links.

## Tool Hub

Create or verify a hub such as `/tools` when shipping more than a few utilities.

Hub requirements:

- Groups pages by user job, not just alphabetically.
- Links to every indexable tool in the first batch.
- Includes short benefit descriptions, not duplicate keyword stuffing.
- Links back from nav/footer/product/blog where reasonable.

## Verification

Before handoff, record evidence in `.seo/audit.md` or `.seo/pseo/plan.md`:

- Preview/live URLs sampled.
- Rendered title, H1, meta, canonical, and robots state.
- Tool interaction works on desktop and mobile.
- Sitemap includes only indexable tools.
- Internal links reach all first-batch pages from the content hub, homepage, product pages, and blog.
- Analytics event names or conversion proof.
- Search Console indexing/request status when available.

## When To Use Instead Of Blog Content

Choose utility pages before blog posts when the SERP intent is task completion, the product can provide the task output directly, and a tool result creates a natural product-qualified lead.

Choose blog/content first when the query needs education, comparison, opinion, experience, or trust proof more than an interactive result.
