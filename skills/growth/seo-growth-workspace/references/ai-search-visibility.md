# AI Search Visibility

Use for the `ai-visibility` phase of every first run, for `operate` checkpoints and tickets in the `ai-visibility` area, and whenever the user asks how the site shows up in ChatGPT/Perplexity/Gemini/AI Overviews. AI/LLM visibility is a default part of organic growth work, not an opt-in experiment.

No special markup tricks exist for Google AI surfaces: AI Overviews and AI Mode use core Search ranking, and Google says no AI-specific markup or files are required. This workflow is about access, extractability, and honest measurement — not "AEO/GEO" hacks. Keep the framing from the AI Search Note in `references/phase-architecture.md`.

Index backing matters for the non-Google engines: ChatGPT search and Copilot draw on Bing's index, Claude on Brave Search, Gemini and AI Overviews on Google's. Not indexed there means not citable there.

## 1. Crawler Access Inventory

Run the AI-crawler access check in `references/technical-seo.md`: robots.txt and CDN-level rules (Cloudflare-style AI-bot blocking is a common accidental suppressor) for GPTBot, OAI-SearchBot, ClaudeBot/Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, and CCBot. Allow/block is a business decision, not a default: blocking a cite-path crawler means that assistant cannot cite the site; blocking training-only crawlers (CCBot) does not affect citation. Record the decision and rationale in `.seo/strategy.md`.

## 2. Query-Set Visibility Audit

Pick 10-20 money queries from `.seo/context.md` and GSC. Run each through the platforms and record one row per query:

| Query | ChatGPT | Perplexity | Gemini | AI Overviews | URL cited | Competitors cited | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |

Record cited-or-not per platform, which of the site's URLs was cited, and which competitors were cited instead. AI answers are nondeterministic: one run is a dated sample, not a ranking. Date every run and keep the query set stable between runs.

## 3. Content Requirements For Citation

For pages the audit says should be cited but are not:

| Requirement | Check |
| --- | --- |
| Renders without JavaScript | Fetch raw HTML; main content present without JS execution (most AI crawlers do not run it) |
| Extractable answer | Self-contained, direct answer near the top of the page, not buried mid-article |
| Concrete facts | Specific numbers, dates, and named sources; "we're the best" is not citable |
| Machine-readable pricing/docs | Public, indexable, plain-HTML pricing and docs; no login wall or JS-only rendering |
| `llms.txt` | Unproven experiment. Fine to add; never report it as a ranking lever or a completed win |

File fixes as normal backlog tickets with evidence.

## 4. Bing And IndexNow

Because Bing's index feeds several assistants, verify Bing Webmaster Tools is set up and the sitemap submitted. Add IndexNow only if the stack supports it cheaply. Low effort, commonly skipped.

## 5. Monthly Spot-Check

Re-run the query set monthly. Log each run to `.seo/reports/ai-visibility-YYYY-MM-DD.md` and compare against the prior report. Track assistant referrals in analytics (referrers such as `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`) — referral traffic is the honest outcome metric; citation screenshots are not. GSC folds AI-surface impressions into normal totals with no AI-specific report; see `references/search-console.md` before interpreting click/impression divergence.

## Exit Criteria

- Crawler allow/block decision recorded in `.seo/strategy.md`.
- Dated visibility matrix saved to `.seo/reports/ai-visibility-YYYY-MM-DD.md`.
- Extractability fixes filed as backlog tickets or explicitly deferred.
- Assistant-referral tracking exists in analytics, or the blocker is documented with an owner.

## Guardrails

- Do not fabricate authority to bait citations: no invented statistics, fake author credentials, synthetic reviews or mentions, or bulk-posted "expert" content.
- Do not report `llms.txt`, schema, or any markup change as an AI-ranking win. Report observed citations and referral deltas only.
- Do not promise citation outcomes; record observed state and its changes.
