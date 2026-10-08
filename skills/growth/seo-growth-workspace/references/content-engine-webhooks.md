# Content Engines and Webhooks

Use when a site's content comes from a content engine (keyword-research plus article-generation/scheduling SaaS): operating its project and calendar, and wiring the webhook that pushes finished articles to the target application.

The engine owns keywords, calendar, and article production. The target owns the receiving endpoint, rendering, and live verification. The skill's job is to wire the two safely and prove the published result is real.

## Operating the engine

Before creating, importing or scheduling content:

1. Read the site's adapter note (`.seo/adapters/<engine>.md`); it maps the project, keyword, calendar, article, publish and reconciliation commands.
2. Confirm `context.md` covers audience, market, language, conversion path and competitors.
3. Confirm the target project exists in the engine or is created intentionally, a blog renderer or publishing destination exists, the sitemap includes the blog hub and generated posts, and the production backend or CLI agrees with the authenticated UI on project and calendar state. A failed check in steps 2 or 3 is a `defect` candidate.
4. Store durable project config and keyword batches in the target repository's established content-engine paths; a small import script keeps them repeatable.
5. **Demand-first calendar.** The calendar holds only keywords that DataForSEO data backs, each aimed at a page the business needs. Build it in this order:
   1. **Audit the pool.** Export every queued and scheduled keyword with the engine's CLI and size them all in one request (`demand.mjs --keywords-file`). Rows without reported volume leave the calendar. Why: on one engine calendar (Chile, 2026-10-08), only 15 of 323 engine-chosen keywords had any measurable volume.
   2. **Find candidates in the buyer's own words.** Name what the buyer handles: the portals, forms, regulations and problems of their job. Run `demand.mjs --suggest <seed>` for each one, plus `--seeds` for related ideas. Category-based idea endpoints drift into generic national searches in a niche B2B market.
   3. **Check live results** with `scripts/serp.mjs` for every survivor.
   4. Schedule a keyword only when all of these hold:
      - It has reported volume for the site's market and language.
      - Its intent fits a buyer the business serves: a problem, comparison, cost-factor or how-to question that leads to one of its services.
      - An article can win its results. Shopping, government, product-seller, marketplace and login results are a no, and so are certificate look-ups where searchers fetch their own document from an official account. Results led by document-sharing sites (Studocu, Scribd) or thin blogs are weak competition, so they count as winnable.
      - It names the page it feeds and that page's call to action. It leaves a landing page's head query and every existing post's topic alone.

   A keyword below the reporting threshold needs a written reason, such as a support article a service page needs. Record volume, source and date beside the keyword batch, and log the paid calls in `research.md`. The engine's own volume tiers are guesses, not demand evidence. When the blog template has no in-article conversion block, open a `conversion` candidate. Why: on another client calendar, 11 of 23 engine-chosen topics had no reported search volume, and two faced product-seller results.

6. **Operate the engine through its CLI.** Keyword imports, calendar rows, schedule and generation config all go through the engine's own CLI or API. When the engine is yours and an operation is missing, add it to the CLI, release it, then continue. A CLI gap is a defect to fix, and backend functions, deploy keys and direct database writes stay out of the workflow.

After seeding a lane, verify with the engine's CLI or status commands and record in the review: keyword tier counts, scheduled rows (date, locale or lane, status, content type, keyword), visibility in the production UI, the next planned item or queue status, blog route and sitemap behavior, and any UI/backend mismatch. Keep API keys, admin keys and provider secrets out of all output.

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
- The bet in `bets.md` and the engine's dashboard state agree. Backend/UI disagreement is a blocker, not a success.

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

Requires `@jorgemenadev/superaseo` >= 0.3.0. The CLI is the operating interface for SuperaSEO: integrations, articles, keywords, calendar, scheduler and generation config, workspace-scoped by an API key, with no human in the dashboard after the one-time key issue. SuperaSEO is maintained alongside this skill. When an operation is missing, extend the CLI in the `superaseo` repository (`apps/cli` and its `/cli/*` routes), release a new version and record it here.

Auth setup (one human step, then headless):

1. A human signs into superaseo.app → Settings → API keys → "Crear API key" and copies the `sk_live_…` secret (shown once).
2. Install with `npm i -g @jorgemenadev/superaseo`. Primary auth path: load `SUPERASEO_API_KEY` from the approved credential store into the process environment — the key never appears in argv, shell history, output, or the repo. Legacy fallback (>= 0.2.0): the CLI's file-backed login, a one-time `superaseo login` call that takes the copied key as its single argument and stores it in `~/.config/superaseo/config.json` (chmod 600) — that call exposes the key in shell history and the process list, so use it only where the env-var path is unavailable. Env var wins over the config file.
3. `superaseo whoami` is the universal access probe — run it before concluding "no CLI access"; a machine can be authenticated via the config file with no env var set anywhere.
4. Everything after is headless and scoped to the key's workspace: **one key = one workspace = possibly many projects**; select with `--project <slug>`. All commands emit JSON. Record the proven access state (auth location, workspace → project mapping, probe) in the site's adapter note (`adapters/` in the workspace) so the next run does not re-discover it.

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

Content-plan operations — keywords, calendar, scheduler and generation config:

```bash
superaseo scheduler get --project <slug>                 # scheduleConfig (enabled, daysOfWeek, hourLocal, autoPublish) + timezone
superaseo scheduler set --project <slug> --enabled true --days mon,thu --hour 9 --auto-publish false   # MUTATING — owner approval
superaseo scheduler history --project <slug> [--limit n] # past runs; empty = the cron has never acted on this project
superaseo keywords list --project <slug> [--tier p1|p2|p3] [--status <s>]   # export for the pool audit
superaseo keywords add --project <slug> --file batch.json   # MUTATING — upsert sized keywords (or --keyword "<text>" …)
superaseo keywords skip|requeue --project <slug> --keyword-id <id>
superaseo calendar list --project <slug> [--status planned|completed] [--lane es|en]   # planner rows
superaseo calendar add --project <slug> --keyword-id <id> --date YYYY-MM-DD [--lane es]   # MUTATING — schedule a sized keyword
superaseo calendar reschedule|remove|retry --project <slug> --plan-id <id> …   # MUTATING — compress or prune a backlog
superaseo projects config get --project <slug> > config.json   # generation config (positioning, required links, cluster overrides)
superaseo projects config set --project <slug> --file config.json   # MUTATING — full replace; edit the file from `get`
superaseo generate start|status --project <slug>
```

Planner semantics an operator must know: **"Overdue" is a derived dashboard label, not a stored status** — `calendar list` returns `planned|completed` only, and rejects `--status overdue`; compute overdue yourself as planned rows with `scheduledFor < now` on an active project. The usual cause of a large overdue pile is simply a schedule that was never enabled — the engine's cron skips projects with no enabled `scheduleConfig` (confirm with `scheduler history` returning zero runs). The scheduler drains **one article per slot, at most one slot per local day**: generation fires in slot N, publish in slot N+1, so a backlog clears at ~cadence-per-day rate; widen `--days`, or `calendar reschedule|remove` weak rows, to compress.

Human value gate under CLI publishing: `superaseo articles publish` fires `publish_articles` itself, so the engine-side manual publish button no longer stands as the human gate. The gate must move to an explicit review step before `articles publish` — either an engine-side review status the agent checks first, or a receiver-side draft stage that holds the article until a human approves. Do not run `articles publish` on unreviewed content; record the chosen gate in `.seo/strategy.md`. The same stance governs `scheduler set --auto-publish true`: it removes the per-article review step entirely, so it is an explicit owner decision, recorded in `.seo/strategy.md`, and the next review checks the first autopublished articles. This preserves the Publish Gate stance in `references/content-ops.md`.

**Pre-publish quality check (autopublish engines).** Generation and publication land in different slots (generate in slot N, publish in slot N+1), so a generated article usually sits in `ready_to_publish` for hours. When a review covers an autopublishing site, pull pending articles with `articles get` and check them inside that window: title and year freshness, locale voice, internal-link targets (current canonical paths, not redirect hops), brand naming, claim quality. Engine-level causes (stale-year titles from a prompt without the current date, misconfigured required links) are fixed in the engine so every future article benefits; article-level defects become a same-day fix-forward bet; only a below-the-bar article justifies asking the owner to pause autopublish.

**Supply-side overlap check.** Search Console shows cannibalization only after pages rank, months late for a daily engine. When a review covers an engine's queue, compare the queue against the published corpus and against itself. Title or string similarity is a hypothesis that justifies investigation, never a finding and never an automatic de-dupe. Frame the exposure as spam-policy risk (doorway and scaled content abuse, where the determinant is why the pages exist), not as cannibalization. Near-variants become review candidates. Prepare the exact correction or hold decision, then follow the site's existing authorization; a scheduled review alone grants no permission to hold or alter publishing.

Authenticated dashboard path: configure the endpoint, name, and access token on the Integrations page, then use its test button. This is the required setup path while the CLI contract accepts the receiver token only in argv; never place that token in a command. The read/test CLI commands above remain safe after setup.

Receiver notes for this contract: dedupe by article `id`; markdown is the only content format, so the receiver renders it; without a signature, endpoint secrecy and token strength carry the auth; whichever path fires the publish, keep a human value gate — the dashboard button (manual path) or an explicit review step / receiver-side draft stage (CLI path).

## Exit Criteria

The adapter file records the contract; the receiver passes the engine's test/ping event; at least one real article was delivered, deployed, and live-verified (route, sitemap, hub link); and `.seo/log.md` records the delivery evidence plus any engine/receiver mismatch.
