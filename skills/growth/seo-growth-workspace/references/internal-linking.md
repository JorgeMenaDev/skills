# Internal Linking

Use for audits and fixes involving link equity, crawl paths, blog hubs, pSEO hubs, and conversion paths.

## Audit Matrix

| Source URL | Target URL | Anchor text | Current state | Desired state | Intent | Priority | Fix |
| ---------- | ---------- | ----------- | ------------- | ------------- | ------ | -------- | --- |

Check:

- Homepage links to primary money pages, blog hub, and key pSEO hubs.
- Blog posts link to relevant product/service pages and related articles.
- pSEO pages link back to hubs and high-intent CTAs.
- Orphan pages are listed and assigned sources.
- Anchor text is descriptive and natural, not repeated exact-match spam.
- Footer/nav links support core conversion and crawl paths.

## Done Criteria

- Link exists in rendered HTML or verified route output.
- Target returns 200 and canonical is correct.
- Sitemap includes the target if it is intended to be indexed.
- Mobile layout does not hide or break critical CTAs.

## Threshold Checkpoints

When the site has at least 3 published blog posts, verify each detail page has crawlable related-reading links:

- Link only to published/indexable posts.
- Exclude the current post from its own related list.
- Verify rendered heading text, links, target status, and canonical URLs.
- Add a source or test guard when the codebase has validation scripts.

After a first pSEO batch is published/indexable, verify homepage or hub crawl paths:

- Homepage links to each published/indexable pSEO money page, or links to a hub that links to all of them.
- No homepage or hub links point to planned/noindex pSEO pages.
- Rendered HTML contains crawlable `<a>` links.
- Each target returns 200, has the expected canonical, and is `index, follow`.

## Common Fixes

- Add blog hub to nav/footer when blog exists.
- Add related-reading sections after first post batch.
- Add fixed internal targets to project YAML for generated content.
- Add pSEO hub pages before publishing large page sets.
