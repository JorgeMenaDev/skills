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
- At webhook delivery, run the [Page Evidence](pages.md) publish-and-delivery gate: verify every intended public inline citation from the authoritative article revision in preview/staging before public publication (or immediately upon delivery when no preview exists), and record the result in the native revision evidence. Page Evidence owns the recorded citation fields and the failed-citation handling; this section only triggers that gate for the webhook path.
- The `.seo/backlog.md` content ticket and the engine's dashboard state agree. Backend/UI disagreement is a blocker, not a success.

Citation reachability alone is not proof of claim support: claim support is decided by the authoritative revision evidence under [Page Evidence](pages.md), not by a citation returning 200.

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

Requires `@jorgemenadev/superaseo` >= 0.1.0 (>= 0.2.0 for the content-plan commands below). The CLI has full dashboard parity — everything the SuperaSEO UI shows (schedule, planner/calendar, keywords, articles, integrations) is readable and drivable headlessly, workspace-scoped by an API key — no human in the dashboard except the one-time key issue. It supersedes/complements the existing MCP tools for agents without MCP.

Auth setup (one human step, then headless):

1. A human signs into superaseo.app → Settings → API keys → "Crear API key" and copies the `sk_live_…` secret (shown once).
2. Install with `npm i -g @jorgemenadev/superaseo`. Primary auth path: load `SUPERASEO_API_KEY` from the approved credential store into the process environment — the key never appears in argv, shell history, output, or the repo. Legacy fallback (>= 0.2.0): the CLI's file-backed login, a one-time `superaseo login` call that takes the copied key as its single argument and stores it in `~/.config/superaseo/config.json` (chmod 600) — that call exposes the key in shell history and the process list, so use it only where the env-var path is unavailable. Env var wins over the config file.
3. `superaseo whoami` is the universal access probe — run it before concluding "no CLI access"; a machine can be authenticated via the config file with no env var set anywhere.
4. Everything after is headless and scoped to the key's workspace: **one key = one workspace = possibly many projects**; select with `--project <slug>`. All commands emit JSON. Record the proven access state (auth location, workspace → project mapping, probe) in the site's adapter note per `references/workspace.md` — never re-discover it.

Verify an existing webhook from the CLI:

```bash
superaseo whoami                       # confirm the key resolves to the right workspace
superaseo projects list                # find the project <slug>
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

Content-plan operations (CLI >= 0.2.0) — the scheduler/planner surface, previously dashboard-only:

```bash
superaseo scheduler get --project <slug>                 # scheduleConfig (enabled, daysOfWeek, hourLocal, autoPublish) + timezone
superaseo scheduler set --project <slug> --enabled true --days mon,thu --hour 9 --auto-publish false   # MUTATING — owner approval
superaseo scheduler history --project <slug> [--limit n] # past runs; empty = the cron has never acted on this project
superaseo calendar list --project <slug> [--status planned|completed] [--lane es|en]   # planner rows
superaseo calendar reschedule|remove --project <slug> …  # MUTATING — compress or prune a backlog
superaseo keywords list --project <slug> [--tier p1|p2|p3] [--status <s>]
superaseo generate start|status --project <slug>
```

Planner semantics an operator must know: **"Overdue" is a derived dashboard label, not a stored status** — `calendar list` returns `planned|completed` only, and rejects `--status overdue`; compute overdue yourself as planned rows with `scheduledFor < now` on an active project. The usual cause of a large overdue pile is simply a schedule that was never enabled — the engine's cron skips projects with no enabled `scheduleConfig` (confirm with `scheduler history` returning zero runs). The scheduler drains **one article per slot, at most one slot per local day**: generation fires in slot N, publish in slot N+1, so a backlog clears at ~cadence-per-day rate; widen `--days`, or `calendar reschedule|remove` weak rows, to compress.

Human value gate under CLI publishing: `superaseo articles publish` fires `publish_articles` itself, so the engine-side manual publish button no longer stands as the human gate. The gate must move to an explicit review step before `articles publish` — either an engine-side review status the agent checks first, or a receiver-side draft stage that holds the article until a human approves. Do not run `articles publish` on unreviewed content; record the chosen gate in `.seo/strategy.md`. The same stance governs `scheduler set --auto-publish true`: it removes the per-article review step entirely, so it is an explicit owner decision, recorded in `.seo/strategy.md` with a post-publish quality-watch ticket on the first autopublished articles. This preserves the Publish Gate stance in `references/content-ops.md`.

**Pre-publish quality window (autopublish engines).** Even with `autoPublish=true`, generation and publication land in different slots (generate in slot N, publish in slot N+1), so a generated article usually sits in `ready_to_publish` for hours. When the quality-watch ticket fires, do not wait for the URL to go live: pull the pending article with `articles get` and review it **inside that window** — title/year freshness, locale voice, internal-link targets (do they hit current canonical paths or a redirect hop?), brand naming, claim quality. Defects found pre-publish split three ways: engine-level causes (stale-year titles from a prompt without current-date injection, misconfigured required internal links) get filed against the engine project/repo so every future article is fixed; article-level defects get a fix-forward ticket to patch the published file the same day; only a below-the-bar article justifies interrupting the owner's autopublish decision. Reviewing at N+0 converts the post-publish watch into a pre-publish gate at zero extra cost.

**Supply-side overlap gate.** The demand-side GSC cannibalization signal (`references/search-console.md`) is measured but retrospective — it fires only after pages rank, months late for a daily engine. Engine-owned publishing therefore runs a supply-side check in the same quality-watch window: before the engine's publish window, compare the queue against the published corpus and against itself, and alert on overlap. Overlap is string- or title-level similarity — an `[H]` flag that justifies investigation per the duplication evidence tiers, never an `[E]` finding and never an automatic merge or de-dupe decision. Frame the exposure as spam-policy risk (doorway abuse and scaled content abuse, whose determinant is why the pages exist, not how similar they are), not as cannibalization. Completion: the watch records the overlap comparison for the window, and every flagged near-variant carries a documented investigation outcome or holds its publish until one exists.

Authenticated dashboard path: configure the endpoint, name, and access token on the Integrations page, then use its test button. This is the required setup path while the CLI contract accepts the receiver token only in argv; never place that token in a command. The read/test CLI commands above remain safe after setup.

Receiver notes for this contract: dedupe by article `id`; markdown is the only content format, so the receiver renders it; without a signature, endpoint secrecy and token strength carry the auth; whichever path fires the publish, keep a human value gate — the dashboard button (manual path) or an explicit review step / receiver-side draft stage (CLI path).

## Exit Criteria

The adapter file records the contract; the receiver passes the engine's test/ping event; at least one real article was delivered, deployed, and live-verified (route, sitemap, hub link); and `.seo/log.md` records the delivery evidence plus any engine/receiver mismatch.
