# Organic Search Outcomes

Use this reference when SEO, marketing, or sales needs to know what happened after organic visitors landed. This skill owns the PostHog producer. `seo-growth-workspace` owns the Search Console join and the resulting SEO decision.

The bridge is aggregate and landing-page keyed:

```text
Search Console page demand -- exact canonical landing page + closed window --> PostHog outcomes
```

Never join a Search Console query to a PostHog person, distinct ID, session, replay, email, company, or CRM record. Search Console query/page rows are aggregate and may be truncated; PostHog identities do not make them user-level.

## Preconditions

- PostHog is receiving current `$pageview` and primary-conversion events.
- `.growth/context.md` names the PostHog project, canonical site origin, allowed entry hosts, one primary outcome (one or more terminal conversion events), and any optional same-session qualified-lead/customer events that actually exist.
- The site owner supplies a closed inclusive Search Console date window. Search Console dates are Pacific Time; write matching explicit PostHog timestamps rather than relying on `now()`.
- Canonical host and redirect rules are known. Preserve path case; strip query and fragment; remove a trailing slash except for `/`; resolve known redirects/canonicals. Flag ambiguous mappings instead of merging them.

## Producer Queries

Run both with `scripts/pg-query.mjs --project <id> --hogql-file <file>`. Replace timestamps with the exact boundaries recorded in the export. `end_exclusive` is midnight after the inclusive Search Console end date.

```sql
-- Organic sessions by entry path.
SELECT
  $entry_hostname AS entry_host,
  $entry_pathname AS entry_path,
  count() AS organic_sessions
FROM sessions
WHERE $start_timestamp >= parseDateTimeBestEffort('<start_timestamp>')
  AND $start_timestamp < parseDateTimeBestEffort('<end_exclusive_timestamp>')
  AND $channel_type = 'Organic Search'
  AND $entry_hostname IN ('<allowed_entry_host>')
GROUP BY entry_host, entry_path
ORDER BY organic_sessions DESC
```

```sql
-- Session-deduplicated outcomes attributed to the organic entry path.
SELECT
  session.$entry_hostname AS entry_host,
  session.$entry_pathname AS entry_path,
  uniqExactIf(events.$session_id, event IN ('<primary_conversion_event>', '<optional_second_terminal_event>')) AS primary_conversions,
  uniqExactIf(events.$session_id, event = '<same_session_qualified_lead_event>') AS qualified_leads,
  uniqExactIf(events.$session_id, event = '<same_session_customer_event>') AS customers
FROM events
WHERE session.$start_timestamp >= parseDateTimeBestEffort('<start_timestamp>')
  AND session.$start_timestamp < parseDateTimeBestEffort('<end_exclusive_timestamp>')
  AND session.$channel_type = 'Organic Search'
  AND session.$entry_hostname IN ('<allowed_entry_host>')
GROUP BY entry_host, entry_path
```

The denominator and numerator are the same session-start cohort. v1 attributes only events carrying the original organic `$session_id`; it does not follow a person into later direct/email sessions or sessionless CRM events. Remove an optional expression when that same-session mapping is not proved and emit `null`, never zero. Later-session lifecycle attribution needs a separately approved cohort/multi-touch contract and is outside v1.

Revenue attribution is outside v1. `revenue_by_currency` must remain `null`; CRM or billing remains the business source of truth until a later contract defines event/property mappings, deduplication, currency handling, and lifecycle attribution.

Treat raw query results as ephemeral PostHog evidence; never persist their path values directly. Before serialization, each entry host/path must resolve to a verified public canonical page present in the closed-window GSC page export, public sitemap, or an equivalent reviewed public-page allowlist, and pass a live canonical/indexability check. Reject any token, email, UUID/order/tenant ID, high-entropy, authenticated, reset/invite, or otherwise dynamic/sensitive path. Record only `withheld_nonpublic_path_count` in quality metadata—never the withheld values.

For allowed public pages, build an absolute URL, apply the declared normalization/redirect/canonical map, then re-aggregate sessions and outcomes by canonical landing-page URL. Each `landing_page` must occur exactly once in `rows`; fail the export on a duplicate key. Sum session-deduplicated outcome counts across collapsed raw paths. Do not export identifier counts.

## Canonical Export

Write `.growth/reports/organic-outcomes-<end-date>.json`. This JSON is the bridge source; growth/SEO reports link it rather than copying an editable second truth.

```json
{
  "schema": "organic-outcome-bridge/v1",
  "product": "acme",
  "site_origin": "https://www.example.com",
  "window": {
    "gsc_start_date": "2026-06-01",
    "gsc_end_date": "2026-06-30",
    "gsc_timezone": "America/Los_Angeles",
    "posthog_start_timestamp": "2026-06-01T07:00:00Z",
    "posthog_end_exclusive_timestamp": "2026-07-01T07:00:00Z"
  },
  "source": {
    "posthog_project_id": "12345",
    "channel_type": "Organic Search",
    "allowed_entry_hosts": ["www.example.com"],
    "primary_conversion_events": ["signup_completed"],
    "same_session_qualified_lead_event": null,
    "same_session_customer_event": null
  },
  "quality": {
    "evidence_grade": "baseline",
    "flags": ["low_sample"],
    "consent_coverage": "unknown",
    "identity_coverage": "not_required_for_aggregate_bridge",
    "withheld_nonpublic_path_count": 0
  },
  "rows": [
    {
      "landing_page": "https://www.example.com/pricing",
      "organic_sessions": 12,
      "primary_conversions": 1,
      "qualified_leads": null,
      "customers": null,
      "revenue_by_currency": null
    }
  ]
}
```

Required quality flags when applicable: `low_sample`, `partial_window`, `consent_unknown`, `event_mapping_changed`, `canonical_mapping_ambiguous`, `duplicate_canonical_key`, `nonpublic_paths_withheld`, `synthetic_or_internal_traffic`, `crm_sync_unverified`. Use:

- `baseline` when volume is too small for comparisons.
- `directional` when the same mapping and complete windows support prioritization but not causal claims.
- `decision-grade` only when windows, mappings, canonicalization, consent coverage, and sample size are stable enough for the named decision.

## Verification And Handoff

Before handing the export to SEO:

1. Reconcile total organic sessions against a PostHog web-analytics view for the same explicit window.
2. Verify every exported URL is a public canonical/indexable page, every allowed host belongs to the target site, every canonical key is unique, and non-public/sensitive raw paths were withheld without values.
3. Confirm every numeric zero means observed zero in the same organic session; unavailable or later-session lifecycle fields stay `null`.
4. Record query files/commands and quality flags in `.growth/audit.md`; link the export from the dated growth review.
5. Hand only aggregate rows to `seo-growth-workspace`. Session replay remains a separate qualitative investigation and must not be used to identify a Search Console query.

This bridge reports association, not causation. An SEO change, campaign, or experiment needs its own design before claiming lift.
