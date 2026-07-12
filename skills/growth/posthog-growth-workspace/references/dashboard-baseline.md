# Dashboard Baseline — the day-one Product Overview

Every product's PostHog project gets exactly one canonical dashboard at bootstrap: **Product Overview**. Creating it is a `bootstrap` step of the product's first growth session — scripted via the API, then registered in `dashboards.md`. Nothing else ships day one: error views belong to whatever owns error tracking in your stack, replay is browsable natively, and deep-dive dashboards are built when a real question asks for them.

## The six insights

Keyed on the product's **primary conversion event** from `context.md`:

1. **DAU** — unique users, daily trend, 30d
2. **WAU** — unique users, weekly trend, 12w
3. **Pageviews by app** — daily trend broken down by the `app` property
4. **Top referring domains** — table, unique persons, 30d
5. **Primary-conversion funnel** — `$pageview` → `<primary_conversion_event>`, 30d window
6. **Conversion rate trend** — weekly `<primary_conversion_event>` uniques ÷ `$pageview` uniques

**Post-activation additions** (only once the product's activation definition exists — never guess it at bootstrap): retention keyed on the activation event, and the activation funnel. Add them to the same dashboard; don't create a second one.

## Creation recipe (API, via pg-query auth or curl)

Create the dashboard, then each insight bound to it:

```bash
# 1. dashboard → note the returned id
curl -s -X POST "$HOST/api/projects/$PROJ/dashboards/" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' -d '{"name": "Product Overview", "pinned": true}'

# 2. each insight (example: DAU); repeat per spec with the right query + name
curl -s -X POST "$HOST/api/projects/$PROJ/insights/" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' -d '{
    "name": "DAU",
    "dashboards": [<dashboard_id>],
    "query": {"kind": "InsightVizNode", "source": {"kind": "TrendsQuery",
      "series": [{"kind": "EventsNode", "event": "$pageview", "math": "dau"}],
      "dateRange": {"date_from": "-30d"}}}
  }'
```

Query sources per insight: 2 = TrendsQuery `math: "weekly_active"`, `interval: "week"`; 3 = TrendsQuery `math: "total"` + `breakdownFilter: {"breakdown": "app", "breakdown_type": "event"}`; 4 = TrendsQuery `math: "dau"` + `breakdownFilter: {"breakdown": "$referring_domain"}` displayed as table (`"display": "ActionsTable"` in trendsFilter); 5 = FunnelsQuery with `series: [$pageview, <primary_conversion_event>]`; 6 = TrendsQuery, two series (`<primary_conversion_event>` dau ÷ `$pageview` dau) with `trendsFilter: {"formula": "A/B"}`, `interval: "week"`. Verify each insight renders in the UI before registering — an insight that saves but shows an error is not created.

## Registration (what makes it real)

Every created artifact lands in the workspace `dashboards.md` inventory — name, id, URL, purpose, status `keep`. A dashboard that isn't registered doesn't exist to the next session. The `growth-review` mode reads insight 5/6 from here.

## Pre-existing dashboards (wizard-built or hand-rolled)

Reconcile at the same first session, never before: inventory everything into `dashboards.md`, keep insights that map onto the baseline spec (attach them to Product Overview rather than duplicating), mark the rest `archive` and remove them from dashboards after one review period. One canonical dashboard beats three overlapping ones — drift between lookalike dashboards is how numbers stop being trusted.
