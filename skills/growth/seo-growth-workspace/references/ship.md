# Ship

Turns an approved bet into a live change with a baseline, so the review can judge it later.

1. **Confirm approval.** The bet is `approved` in `bets.md`, by the owner or by a standing boundary written in `context.md`. Anything that publishes, deploys, sends outreach or changes a content-engine schedule needs that approval; a scheduled run never ships.
2. **Route the work.**
   - Page or code change: the product repository's normal branch, review and deploy flow.
   - Engine content (SuperaSEO or another webhook publisher): [content-engine-webhooks.md](content-engine-webhooks.md).
   - Listings, links and outreach: [backlinks-entity.md](backlinks-entity.md).
   - Search Console, Bing, Google Business Profile or other admin surfaces: the owning reference; screenshot or read back the setting after the change.
3. **Pass the launch gates.** Every new or materially revised public page passes [pages.md](pages.md): substantiated claims, information gain, approved revision, and live checks for status 200, self-canonical, indexable, in the sitemap, linked from at least one relevant page, and rendered on a mobile viewport. Comparisons, pricing and affiliate content also pass [commercial-integrity.md](commercial-integrity.md).
4. **Record the bet as live.** Add the live date, the evidence (URL, commit or admin readback) and the baseline: the bet's metric over the 28 days before the live date, final data. When the page is new, the baseline is zero impressions unless Search Console already shows the URL. Set the check date: live date + 28 days for changes to existing pages, + 42 days for new pages.
5. **Log it** in two or three sentences.

Done when the bet reads `live` with evidence, baseline and check date, and the change is verified on the live site.
