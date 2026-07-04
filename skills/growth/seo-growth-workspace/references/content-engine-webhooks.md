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
| Test path | Test/ping event, where delivery status is visible, and any CLI/API that fires it headlessly |
| Reconcile | How engine-side state (delivered, published URL) is read and marked back: dashboard, CLI, MCP, or API |

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

One worked example follows; your engine will differ — record its contract in `.seo/adapters/<engine>.md`.

## Example: SuperaSEO (superaseo.app)

A keyword-research and article-scheduling engine with a webhook-first publishing path. Contract as of 2026-07:

| Item | Value |
| --- | --- |
| Config | CLI `superaseo integrations set-webhook` (preferred, agent-side) or the dashboard Integrations page: integration name, endpoint URL, access token; one endpoint per project |
| Auth | `Authorization: Bearer <access token>` (no HMAC); locale arrives as a `?locale=xx` query param |
| Events | `test_webhook`, `publish_articles` — fired from the dashboard button or headlessly via `superaseo integrations test` / `superaseo articles publish` |
| Payload | `data.articles[]` with one article: `id`, `title`, `slug`, `tags[]`, `content_markdown` (frontmatter stripped), `meta_description`, `image_url`, `alt_text`, `author`, `status`, `created_at` |
| Delivery | Single attempt, 30s timeout, any 2xx = success; failures surface in the dashboard for manual retry |
| Response | Return `{ "published_url": "<live URL>" }` so the engine records the real URL |
| Reconcile | `superaseo articles list` / `superaseo articles mark-published` (preferred); dashboard delivery status; or the MCP tools (`superaseo_list_articles`, `superaseo_mark_article_published`) when the engine has MCP enabled |

### CLI configuration (preferred, agent-side)

Requires `@jorgemenadev/superaseo` >= 0.1.0. The CLI lets an agent configure and drive the engine headlessly, workspace-scoped by an API key — no human in the dashboard except the one-time key issue. It supersedes/complements the existing MCP tools for agents without MCP.

Auth setup (one human step, then headless):

1. A human signs into superaseo.app → Settings → API keys → "Crear API key" and copies the `sk_live_…` secret (shown once).
2. Install and log in: `npm i -g @jorgemenadev/superaseo` then `superaseo login <sk_live_...>`. The key persists to `~/.config/superaseo/config.json` (mode 0600); `SUPERASEO_API_KEY` is the env alternative. Never print or commit the key.
3. Everything after is headless and scoped to the key's workspace. All commands emit JSON.

Configure and verify the webhook (replaces the dashboard Integrations page):

```bash
superaseo whoami                       # confirm the key resolves to the right workspace
superaseo projects list                # find the project <slug>
superaseo integrations set-webhook --project <slug> \
  --name <name> --endpoint <url> --access-token <token>
superaseo integrations get --project <slug>     # confirm endpoint + name
superaseo integrations test --project <slug>    # fires test_webhook to the receiver
superaseo integrations delete-webhook --project <slug>   # to unwire
```

Publish and reconcile:

```bash
superaseo articles list --project <slug> [--status <s>] [--locale <l>] [--limit <n>] [--cursor <c>]
superaseo articles get --project <slug> --locale <l> --slug <s>
superaseo articles publish --project <slug> --article-id <id>          # fires publish_articles
superaseo articles mark-published --project <slug> --article-id <id> \
  --published-url <url> [--commit-sha <sha>] [--dry-run]
```

Human value gate under CLI publishing: `superaseo articles publish` fires `publish_articles` itself, so the engine-side manual publish button no longer stands as the human gate. The gate must move to an explicit review step before `articles publish` — either an engine-side review status the agent checks first, or a receiver-side draft stage that holds the article until a human approves. Do not run `articles publish` on unreviewed content; record the chosen gate in `.seo/strategy.md`. This preserves the Publish Gate stance in `references/content-ops.md`.

Manual dashboard path (fallback): configure the endpoint, name, and access token on the Integrations page, use the dashboard test and publish buttons, and read delivery status there. Use this when the CLI is unavailable or the workspace has no API key issued.

Receiver notes for this contract: dedupe by article `id`; markdown is the only content format, so the receiver renders it; without a signature, endpoint secrecy and token strength carry the auth; whichever path fires the publish, keep a human value gate — the dashboard button (manual path) or an explicit review step / receiver-side draft stage (CLI path).

## Exit Criteria

The adapter file records the contract; the receiver passes the engine's test/ping event; at least one real article was delivered, deployed, and live-verified (route, sitemap, hub link); and `.seo/log.md` records the delivery evidence plus any engine/receiver mismatch.
