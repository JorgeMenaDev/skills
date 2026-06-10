# Content Operations

Use for `content-ops` mode: keywords, clusters, blog calendars, briefs, article publishing, internal links, and content engines.

## Preflight Gates

1. Business context exists and includes audience, market, language, conversion path, and competitors.
2. Target project/domain exists in the content engine or is created intentionally.
3. Blog renderer or publishing destination exists before scheduling content.
4. Sitemap generation includes blog hub and generated posts.
5. Production backend/CLI and authenticated UI agree on project/calendar state.
6. Content-engine or publisher-bot repos have a local adapter in `.seo/adapters/` or equivalent strategy notes that map project, keyword, calendar, article, publish, and reconciliation proof commands.

If any gate fails, create a blocker or technical ticket before importing/scheduling content.

## Keyword Batch Shape

Recommended columns/fields:

`id`, `keyword`, `cluster`, `difficulty`, `difficultyTier`, `volumeBucket`, `contentType`, `intent`, `buyerStage`, `relevance`, `priorityScore`, `priorityTier`, `status`.

Prioritize P1 keywords that combine commercial relevance, product fit, and realistic difficulty. Keep P2/P3 for expansion.

## Competitor Demand Gaps

Use this when competitors rank for useful demand that the target does not yet capture. Use GSC, a paid keyword/content-gap tool, manual SERP review, or competitor pages; record the source and limitation.

| Keyword | Competitor URL | Buyer stage | Volume/difficulty if known | Existing page | Action | Priority |
| --- | --- | --- | --- | --- | --- | --- |

Actions should be one of: optimize an existing page, create a page/article, import to the content engine, add internal links, defer. Do not import every gap into the calendar; keep only topics with product fit, buyer intent, and a plausible route to ranking or conversion.

## Calendar Verification

After seeding a lane, verify:

- Keyword tier counts.
- Scheduled rows with dates, locale/lane, status, content type, and keyword.
- UI visibility in the production workspace.
- Next planned item or processing queue status.
- Blog route and sitemap behavior.

## Report Output

Use `templates/content-plan.md`. Include:

- Data source and script/command used.
- Keyword tier counts.
- Scheduled P1 topics.
- Publish destination and route pattern.
- UI/backend mismatches.
- Next article or review action.

## Content Engine Bridge

When the target uses a content engine:

- Load `references/adapters.md` and the repo's local adapter before creating/importing/scheduling content work.
- Store durable project config and keyword batches in the target repo's established content-engine paths.
- Prefer a small import script for repeatability.
- Use the repo's CLI/status commands to verify tiers/calendar/status.
- Do not print API keys, admin keys, or provider secrets.
