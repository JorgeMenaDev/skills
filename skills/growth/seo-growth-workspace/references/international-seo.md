# International SEO

Use for `technical-seo-fix` when the site targets multiple languages or regions. The site-type classifier in `references/phase-architecture.md` routes multilingual/multi-region sites here.

Misconfigured hreflang fails silently: Google drops broken pairs without warning and may index only one locale. Verify rendered output, never framework config.

## Structure Decision

| Structure | Use when | Notes |
| --- | --- | --- |
| Subfolder (`/es/`, `/de/`) | Default | One domain's authority serves all locales; cheapest to maintain |
| Subdomain (`es.example.com`) | Existing infra forces it | Treated roughly like subfolders by Google; more setup surface |
| ccTLD (`example.de`) | Legal or market requirement per country | Strongest geo signal; splits authority, cost, and maintenance |
| URL parameter (`?lang=es`) | Never | Explicitly not recommended by Google |

Do not serve locales by IP or Accept-Language negotiation on one URL — Googlebot crawls from US IPs and sends no Accept-Language header. Separate URLs plus hreflang.

## Hreflang Audit Checklist

| Check | Rule | Failure mode |
| --- | --- | --- |
| Self-reference | Every variant lists itself in the hreflang set | Missing self-reference → entire set ignored |
| Reciprocity | If A points to B, B must point back to A | One-directional → pair dropped |
| Codes | ISO 639-1 language + optional ISO 3166-1 alpha-2 region: `en`, `en-GB`. Never `en-UK`; language-only is valid | Invalid code → annotation ignored |
| `x-default` | Present in every variant's set, pointing to the fallback or language-selector page | Wrong-locale traffic lands unpredictably |
| Target health | Every target returns 200, is indexable, and is its own canonical | Broken target → cluster discarded, crawl budget wasted |
| Canonical agreement | Each locale self-canonicals; never cross-locale canonicals; the canonical URL must be inside the hreflang set | Cross-locale canonical suppresses that locale; canonical outside the set → all hreflang ignored |
| One surface | Choose head `<link>` OR sitemap `xhtml:link`; if both exist they must agree | Conflicting pair dropped. Sitemap scales better for many locales: no page weight, one place to fix |
| Framework caveat | Next.js `alternates.languages` does not emit a self-reference by default | Verify the rendered head/sitemap, not the config file |

## Locale Quality Gate

Thin or machine-translated locales are a site-wide quality risk: helpful-content signals apply to the whole site, so bad locales drag down strong pages. Translate all main content, not just navigation chrome — boilerplate-only translation clusters as duplicates. Do not noindex thin locales or cross-canonical them; improve or remove. Launch fewer, better locales.

## Evidence

- Verify hreflang and canonicals in rendered HTML and the live sitemap.
- Spot-check per-market SERPs with a VPN or `hl`/`gl` parameters.
- Split GSC performance per locale (subdirectory properties or page-path filters). GSC's International Targeting report is deprecated; hreflang plus content signals are the mechanism.

## Exit Criteria

- Structure decision recorded in `.seo/strategy.md` with rationale.
- Hreflang checklist run against rendered output; every failure filed as a backlog ticket with evidence URLs.
- Locale quality assessed; each thin locale has an improve-or-remove decision.
- Per-locale GSC baseline recorded, or the access blocker documented with an owner.
