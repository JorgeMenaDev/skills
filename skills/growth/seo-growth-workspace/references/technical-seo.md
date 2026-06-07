# Technical SEO

Use for `technical-seo-fix` mode and for the first bootstrap audit.

## Audit Checklist

| Area            | Check                                                                                    | Evidence                           |
| --------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| Indexability    | `robots.txt`, `sitemap.xml`, no accidental `noindex`, status codes, redirects            | URLs, status codes, file paths     |
| Metadata        | title, description, canonical, Open Graph/Twitter, `metadataBase` for Next.js            | rendered head or source            |
| Schema          | Organization/WebSite/SoftwareApplication/Product/LocalBusiness/FAQ/Article as applicable | JSON-LD types and validation notes |
| Internal links  | homepage to money pages, blog hub, pSEO hubs, CTA paths                                  | source route and target route      |
| Performance     | mobile render, CWV/PageSpeed/Lighthouse when requested or available                      | score/report link                  |
| Analytics       | installed SDK/tag, live event/pageview proof, conversion path                            | provider and screenshot/log note   |
| Security/domain | HTTPS, canonical host, www/apex behavior, HSTS if relevant                               | status and redirect chain          |

## Fix Rules

- Patch the smallest surface that fixes the evidence-backed issue.
- For Next.js, prefer framework files such as `app/robots.ts`, `app/sitemap.ts`, layout metadata, and JSON-LD components.
- After adding public routes, update sitemap generation.
- After CTA/UI changes, verify desktop and at least one mobile viewport.
- Keep user-facing copy in the target project's language and market.

## Live Verification Gates

- Intended public URL returns 200.
- Missing/invalid URL returns expected 404 or redirect.
- Canonical matches final URL.
- Sitemap includes changed public pages.
- Robots does not block intended pages.
- JSON-LD is parseable and uses appropriate types.
- Analytics/admin toggles show installed or waiting-for-traffic state.
