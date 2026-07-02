# Content Engine Webhooks

Use for `content-ops` mode when a content engine (keyword-research plus article-generation/scheduling SaaS) pushes finished articles to the target application through a webhook and the target should deploy them automatically.

The engine owns keywords, calendar, and article production. The target owns the receiving endpoint, rendering, and live verification. The skill's job is to wire the two safely and prove the published result is real.

## Integration Contract

Before building or auditing a receiver, record the engine's actual contract in `.seo/adapters/<engine>.md`:

| Field | What to record |
| --- | --- |
| Endpoint config | Where URL/token are configured in the engine; one or many endpoints per project |
| Auth | HMAC signature (preferred) or static bearer token; exact header names |
| Events | Exact `event_type` values and when they fire (manual button vs scheduled/cron) |
| Payload | Field-by-field article shape; content format (markdown/HTML); single vs batch |
| Delivery | Retries, timeout, expected response codes, idempotency key or stable ids |
| Response contract | What the receiver should return (for example `published_url`) |
| Test path | Test/ping event and where delivery status is visible in the engine |

## Receiver Requirements

- HTTPS endpoint; reject requests without a valid signature or token. For static bearer tokens, compare in constant time and treat the token as a secret: env var only, never printed or committed.
- Idempotent by stable article `id` (upsert by id or slug). Manual or automatic retries resend the same article; the receiver must never duplicate posts.
- Validate before writing: slug shape (no path traversal), required fields present, expected content format. Store the raw payload for audit.
- Respond fast with 2xx only on real success; non-2xx must mean "not published". If the engine reads a response field such as `published_url`, return the actual live URL.
- The human value review must happen somewhere: engine-side before the send, or receiver-side by landing articles as drafts until reviewed. Record the chosen gate in `.seo/strategy.md`; skipping both is a scaled-content policy risk (see the Publish Gate in `references/content-ops.md`).

## Post-Deploy Verification

A webhook delivery is not "published" until:

- The live route returns 200 with rendered title, meta description, and body.
- The post is in `sitemap.xml` and linked from the blog hub, so a crawl path exists.
- Rendered metadata/schema match the payload without invented facts.
- The `.seo/backlog.md` content ticket and the engine's dashboard state agree. Backend/UI disagreement is a blocker, not a success.

## Example: SuperaSEO (superaseo.app)

A keyword-research and article-scheduling engine with a webhook-first publishing path. Contract as of 2026-07:

| Item | Value |
| --- | --- |
| Config | Integrations page: integration name, endpoint URL, access token; one endpoint per project |
| Auth | `Authorization: Bearer <access token>` (no HMAC); locale arrives as a `?locale=xx` query param |
| Events | `test_webhook`, `publish_articles` (fired manually from the dashboard) |
| Payload | `data.articles[]` with one article: `id`, `title`, `slug`, `tags[]`, `content_markdown` (frontmatter stripped), `meta_description`, `image_url`, `alt_text`, `author`, `status`, `created_at` |
| Delivery | Single attempt, 30s timeout, any 2xx = success; failures surface in the dashboard for manual retry |
| Response | Return `{ "published_url": "<live URL>" }` so the engine records the real URL |
| Reconcile | Dashboard delivery status; optional MCP tools (`superaseo_list_articles`, `superaseo_mark_article_published`) when the engine has MCP enabled |

Receiver notes for this contract: dedupe by article `id`; markdown is the only content format, so the receiver renders it; without a signature, endpoint secrecy and token strength carry the auth; the manual publish button is the engine-side human gate — keep it, or add a receiver-side draft stage if delivery ever becomes automatic.

## Exit Criteria

The adapter file records the contract; the receiver passes the engine's test/ping event; at least one real article was delivered, deployed, and live-verified (route, sitemap, hub link); and `.seo/log.md` records the delivery evidence plus any engine/receiver mismatch.
