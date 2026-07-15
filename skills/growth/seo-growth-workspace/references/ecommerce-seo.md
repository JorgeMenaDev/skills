# E-commerce SEO Decisions

> **Dogfood status:** fixture-validated only — not yet exercised against a live operation. Keep this path out of any dogfooded-completion claim until its manual gates pass on a named live target.

Use this reference after the site-type classifier identifies an e-commerce or marketplace target. It owns commerce decisions, not crawl, schema, disclosure, substantiation, conversion-event, or internal-link mechanics.

## Commerce decision contract

### Prioritize with known value

Rank work from declared evidence: query and product relevance, buyer intent, revenue or another named value proxy, gross margin, inventory depth and availability, measured conversion evidence, Search Console demand, seasonality, competition evidence, and whether a suitable URL already exists. Search volume alone never determines priority.

- Record unavailable revenue, margin, inventory, conversion, or attribution inputs as `Unknown`. Unknown margin stays `Unknown`; never estimate it or substitute points to force a ranking.
- Prefer an opportunity only when its known evidence supports that ordering. If missing commercial evidence could reverse the order, leave the candidates tied or request the evidence.
- Record the value field, source, observation window, currency where relevant, and limitations under [evidence conventions](operating.md). Use [Search Console](search-console.md) for query/page observations and [conversion and CTA](conversion.md) for conversion-event proof.

### Map demand to a page type from the live SERP

Before creating or retargeting a URL, record a dated live-SERP observation with query, market/locale, device context, and the page types actually rewarded. Collection-dominant results support investigating a collection; product-dominant results a product; guide/comparison-dominant results editorial. Homepage dominance requires a positioning investigation, not a new page by default.

A mixed SERP triggers investigation, never automatic URL creation. Resolve the competing intents and buyer stages, inspect whether one existing page can serve the evidenced job, and record the targeting decision. Before any new URL, check overlap among homepage, collection, product, and editorial URLs for the same or near-identical demand; consolidate or retarget where that resolves cannibalization better than expansion.

### Admit a collection only when it adds shopping value

Create or retain a collection when it represents distinct evidenced demand and useful inventory and helps a shopper make a decision. Record:

- the collection's unique purpose, intended inventory, and decision-helping differentiators;
- whether a concise unique introduction or buying guidance answers a collection-specific decision (no universal word count and no copy block that obstructs products);
- its relationship to parent, related, product, and supporting editorial pages; and
- the faceted-navigation boundary: which shopper distinctions justify stable landing pages and which filters remain non-indexable mechanics.

Consolidate a thin collection when it lacks distinct demand, useful inventory, or unique decision value and another page satisfies the same job. Do not create a collection for every keyword variant or require every collection in main navigation. Route crawl depth, breadcrumbs, crawlable links, pagination/infinite scroll, internal search, orphans, and navigation mechanics to [internal linking](internal-linking.md) and [technical SEO](technical-seo.md).

Supporting editorial content must have a declared measurable job beyond adding internal links: serve evidenced informational demand, resolve a purchase objection, support qualified product discovery, earn qualified references, or produce a named assisted-conversion observation. Refresh, consolidate, or remove it according to [content refresh](content-refresh.md) when evidence shows that job is not being met.

### Decide facet, variant, and inventory lifecycles from evidence

- **Facet:** make a facet indexable only when it has distinct durable demand, sufficient useful inventory, a stable URL purpose, differentiated shopper value, and a feasible canonical/internal-link boundary. Otherwise keep it outside the indexable landing-page set and route parameter/crawl implementation to [technical SEO](technical-seo.md).
- **Variant:** choose a standalone variant URL only when the variant has distinct demand or material user value and the rendered page can remain substantively distinct and accurate. Otherwise canonicalize within the product family; route canonical and duplicate-path mechanics to [technical SEO](technical-seo.md).
- **Inventory:** classify temporary out-of-stock separately from discontinued. For a discontinued product, choose an evidence-dependent lifecycle decision from `keep`, `redirect`, `410`, or `replace`; never apply a blanket rule. Base the choice on continuing demand, useful historical/support value, a genuinely equivalent successor, link/equity evidence, expected replenishment, and the truth of the resulting destination. Temporary unavailability, seasonal collections, pagination, internal search, migrations, and status/redirect implementation route to [technical SEO](technical-seo.md).

Record the evidence, decision, owner, and recheck condition. A redirect requires a genuinely equivalent destination; `replace` requires the rendered page to identify the replacement honestly; `keep` requires continuing user value and accurate availability; `410` requires evidence that no useful replacement or retained purpose remains.

### Keep feed, schema, and rendered truth aligned

For every affected product/offer, price, currency, availability, identifiers, and review facts in the product feed, structured data, and rendered landing page must agree with the same current commercial truth. Never invent a value. Any disagreement is a blocker: stop publication or feed/schema release, identify the authoritative source and freshness gap, then route rendered/crawl issues to [technical SEO](technical-seo.md) and structured-data eligibility and implementation to [schema and rich results](schema-rich-results.md). Claim support and visible proof remain owned by [page evidence](pages.md).

This reference defines no Merchant Center adapters and no provider integrations.

### Report purchases and refunds without causal upgrades

Report commerce outcomes with the shared [non-causal outcome ladder](operating.md): keep rankings and traffic observations separate from landing sessions, product/collection views, add-to-cart, checkout, purchase, and refund state. Name the analytics attribution model, comparison window, currency, tax/shipping treatment, consent or data gaps, assisted-conversion limits, and known confounders such as promotions, brand demand, pricing, inventory, seasonality, paid/email/social assists, and returning customers.

Report gross purchases and identified refunds or adjustments separately, then label any refund-adjusted amount explicitly. A ranking or traffic change is not evidence that SEO caused purchases or revenue. Do not claim incremental or causal revenue without evidence capable of supporting causality. Conversion-event definitions and implementation remain in [conversion and CTA](conversion.md); commercial relationships and disclosures remain in [commercial integrity](commercial-integrity.md).

Paid-link concealment, fixed backlink quotas or destination/anchor ratios, and DR-only qualification are prohibited; follow [backlinks and entity authority](backlinks-entity.md).
