# HogQL Data Cookbook

Recurring queries for `scripts/pg-query.mjs`. Start here before writing a query from scratch. When a new query recurs across sessions, the active workspace contract and current task scope decide whether to add it here through the canonical release flow or record it in an existing in-scope `.growth/log.md` handoff. All queries run as:

```bash
node scripts/pg-query.mjs --project <id> --hogql "<query>"
```

HogQL notes that bite: `properties.foo` accesses event properties (returns strings — cast with `toInt`/`toFloat` when aggregating); `person.properties.foo` for person properties; `distinct_id` vs `person_id` — use `person_id` when counting humans, `distinct_id` joins raw activity; timestamps are UTC.

## Volume & health

```sql
-- Daily event volume, last 7 days (zero rows on a deployed product = install failure)
SELECT toDate(timestamp) AS day, count() FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY day ORDER BY day

-- Event catalog with volumes, last 30 days (naming drift + dead events show up here)
SELECT event, count() AS n FROM events WHERE timestamp > now() - INTERVAL 30 DAY GROUP BY event ORDER BY n DESC

-- App segmentation (NULL app = an app missing its register call)
SELECT properties.app, count() FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY properties.app
```

## Acquisition

```sql
-- Top entry pages, last 30 days
SELECT properties.$pathname, count() AS views, count(DISTINCT person_id) AS people
FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY
GROUP BY properties.$pathname ORDER BY views DESC LIMIT 20

-- Referrers / channels
SELECT properties.$referring_domain, count(DISTINCT person_id) AS people
FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY
GROUP BY properties.$referring_domain ORDER BY people DESC LIMIT 20
```

For organic-search outcomes, do not infer channel from a hand-maintained referrer list or read a nonexistent raw `$channel_type` event property. PostHog computes channel attribution on sessions. Use the bounded queries and export contract in `organic-search-outcomes.md`.

## Funnel (stage-to-stage, people-counted)

```sql
-- Adjacent-stage conversion: people who did stage A, and of those, stage B after it
SELECT
  count(DISTINCT person_id) AS did_a,
  count(DISTINCT if(b_time > a_time, person_id, NULL)) AS did_b_after_a
FROM (
  SELECT person_id,
    min(if(event = '<stage_a_event>', timestamp, NULL)) AS a_time,
    min(if(event = '<stage_b_event>', timestamp, NULL)) AS b_time
  FROM events WHERE timestamp > now() - INTERVAL 30 DAY GROUP BY person_id
) WHERE a_time IS NOT NULL
```

Segment any funnel by adding `properties.app`, `properties.$device_type`, or `properties.$geoip_country_code` to SELECT/GROUP BY. The diagnosis pattern that works: segment by geo first, then device within the losing geo — aggregate drop-offs usually localize (a real case reframed "India converts badly" into "94% of Indian traffic is mobile and mobile converts at ~0.1% — it's a mobile problem").

## Identity & activation

```sql
-- Identified vs anonymous split, last 30 days
SELECT if(person.properties.email IS NOT NULL, 'identified', 'anonymous') AS kind, count(DISTINCT person_id)
FROM events WHERE timestamp > now() - INTERVAL 30 DAY GROUP BY kind

-- Time-to-first <activation_event> from first-seen, bucketed (the wizard team's activation metric)
SELECT multiIf(delta <= 3600, '<1h', delta <= 86400, '1h-24h', delta <= 259200, '1d-3d', '>3d') AS bucket,
       count() AS people
FROM (
  SELECT person_id,
    toUnixTimestamp(min(if(event = '<activation_event>', timestamp, NULL))) - toUnixTimestamp(min(timestamp)) AS delta
  FROM events GROUP BY person_id HAVING delta IS NOT NULL AND delta >= 0
) GROUP BY bucket
```

## Retention (weekly, keyed on activation event)

```sql
SELECT cohort_week, week_n, count(DISTINCT person_id) AS people FROM (
  SELECT e.person_id,
    toStartOfWeek(first.first_ts) AS cohort_week,
    dateDiff('week', toStartOfWeek(first.first_ts), toStartOfWeek(e.timestamp)) AS week_n
  FROM events e
  INNER JOIN (
    SELECT person_id, min(timestamp) AS first_ts FROM events WHERE event = '<activation_event>' GROUP BY person_id
  ) first ON first.person_id = e.person_id
  WHERE e.event = '<activation_event>'
) GROUP BY cohort_week, week_n ORDER BY cohort_week, week_n
```

## Raw API reads (`--get`)

```bash
--get /api/projects/<id>/dashboards/                     # dashboard inventory
--get /api/projects/<id>/insights/?limit=100             # saved insights
--get /api/projects/<id>/feature_flags/                  # flags (experiment debt sweep)
--get "/api/projects/<id>/session_recordings/?limit=20"  # recent replays
--get /api/projects/<id>/surveys/                        # surveys
```
