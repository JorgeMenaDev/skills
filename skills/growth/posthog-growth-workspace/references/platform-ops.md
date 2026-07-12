# Platform Ops — Install Health From the Data Side

Use when a workspace is new, data looks wrong, or a growth review starts (Boundaries in SKILL.md own the install/data-work split). What this reference owns is proving, from live data alone, that the install is healthy enough to trust — and filing drift back to the doctrine owner when it isn't.

## Health checks (run in order, stop at first failure)

All via `scripts/pg-query.mjs` against the product's PostHog project id (from `strategy.md` / hub `registry.md`). Queries live in `data-cookbook.md` → Volume & health.

1. **Events arriving** — the daily-volume query. Zero rows on a deployed product = install or proxy failure. File drift; nothing downstream is trustworthy.
2. **Pageview/pageleave pair** — both `$pageview` and `$pageleave` present (event-catalog query). Pageviews without pageleaves usually means an ad-blocker-visible (unproxied) install losing the exit beacon.
3. **App segmentation** — the app-segmentation query. Every event carries the mandated `app` property; `NULL` rows lose multi-app segmentation.
4. **Identify wired** — `$identify` events exist and post-login events carry a non-anonymous `distinct_id`; person profiles carry email. No identifies on a product with auth = the identify component is missing or gated wrong.
5. **Custom-event naming** — event names are snake_case `object_action`; Title Case or camelCase names are drift from a pre-migration tracker.
6. **Primary conversion event firing** — `context.md` names it; confirm it exists in the data at plausible volume. A primary conversion event with zero occurrences is either a broken capture or an honest zero — decide which with a replay or a manual test, and record it.
7. **Replay recording** — recent recordings exist (`--get /api/projects/<id>/session_recordings/?limit=5`). Replay is expected on by default for fleet projects.

## Recording results

- Healthy: one line in `audit.md` with the date and the checks passed — do not paste query dumps.
- Drift: an `audit.md` finding (check, evidence, suspected cause) **plus** a backlog row whose action is "file to install-doctrine owner", not "fix the repo here". Repo edits from this skill are the anti-pattern this boundary exists to prevent.

## Project audit (bootstrap / periodic)

Inventory what the project already has, into `dashboards.md`: dashboards (`--get /api/projects/<id>/dashboards/`), insights worth keeping (`--get /api/projects/<id>/insights/?limit=100`), feature flags in use, surveys. Record names, ids, and URLs; mark orphans (built by wizards or one-off explorations) for keep/rebuild/delete decisions in the backlog.
