# Technical SEO

Use for `technical-seo-fix` mode and for the first bootstrap audit. For multilingual or multi-region sites, also load `references/international-seo.md`.

## Audit Checklist

| Area              | Check                                                                                    | Evidence                           |
| ----------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| Indexability      | `robots.txt`, `sitemap.xml`, no accidental `noindex`, status codes                       | URLs, status codes, file paths     |
| Redirects         | max 1 hop; no chains; no soft-404s (thin pages returning 200 that should 404/410)        | full redirect chain per URL        |
| Metadata          | title, description, canonical, Open Graph/Twitter, `metadataBase` for Next.js            | rendered head or source            |
| Schema            | Organization/WebSite/SoftwareApplication/Product/LocalBusiness/Article as applicable; FAQ only for visible FAQs | JSON-LD types and validation notes |
| Internal links    | homepage to money pages, blog hub, pSEO hubs, CTA paths                                  | source route and target route      |
| Performance       | Core Web Vitals field data at p75 (see below)                                            | CrUX/PSI metrics, report link      |
| JS rendering      | key content present without JS execution (see below)                                     | curl-vs-rendered diff notes        |
| AI-crawler access | `robots.txt` + CDN bot rules match recorded policy (see below)                           | per-bot allow/block table          |
| E-E-A-T           | author/entity/experience proof visible on page: bylines with author pages, credentials, first-hand evidence, contact/about | URLs showing each signal           |
| Analytics         | installed SDK/tag, live event/pageview proof, conversion path                            | provider and screenshot/log note   |
| Security/domain   | HTTPS, canonical host, www/apex behavior, HSTS if relevant                               | status and redirect chain          |

## Core Web Vitals

Field data is the source of truth: CrUX via the PageSpeed Insights API, or the GSC Core Web Vitals report. Judge pass/fail at p75:

| Metric | Good    | Note                       |
| ------ | ------- | -------------------------- |
| LCP    | < 2.5s  | largest contentful paint   |
| INP    | < 200ms | replaced FID in March 2024 |
| CLS    | < 0.1   | layout shift               |

Lighthouse is a lab proxy only: use it to diagnose, never to report CWV pass/fail. It cannot measure INP; treat TBT as a rough stand-in.

## AI-Crawler Access

Inventory access for GPTBot, OAI-SearchBot, ClaudeBot/Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, and CCBot.

- Check `robots.txt` AND CDN-level bot rules. Cloudflare's AI-bot blocking is a common accidental suppressor of assistant visibility.
- Allow/block is a business decision, not a default. Record the per-bot choice and rationale in `.seo/strategy.md`; flag mismatches between recorded policy and live behavior.

## JS Rendering

Diff `curl` output against the rendered DOM for key pages: headings, money copy, internal links, JSON-LD. Content that exists only after JS execution is invisible to most AI crawlers and delays Google indexing. Move money content into server-rendered HTML.

## Fix Rules

- Patch the smallest surface that fixes the evidence-backed issue.
- For Next.js, prefer framework files such as `app/robots.ts`, `app/sitemap.ts`, layout metadata, and JSON-LD components.
- After adding public routes, update sitemap generation.
- After CTA/UI changes, verify desktop and at least one mobile viewport.
- Keep user-facing copy in the target project's language and market.

## Live Verification Gates

- Intended public URL returns 200.
- Missing/invalid URL returns expected 404 or redirect.
- Redirects resolve in one hop.
- Canonical matches final URL.
- Sitemap includes changed public pages.
- Robots and CDN rules do not block intended pages or intended bots.
- JSON-LD is parseable and uses appropriate types.
- Analytics/admin toggles show installed or waiting-for-traffic state.
