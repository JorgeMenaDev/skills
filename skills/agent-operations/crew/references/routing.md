# Routing

Build a model table from your own T3 catalog and experience. Keep it in a local workspace document or the crew home, outside the installed skill so updates cannot overwrite it.

```bash
bun "$CREW_SKILL/scripts/t3-model-selection.ts" --catalog
bun "$CREW_SKILL/scripts/provider-usage.ts" --json
```

The catalog emits enabled, installed instances and exact model slugs with their available options. Instance IDs are user configuration, not universal provider names. A model may appear through more than one instance. Select the instance that uses the intended account.

Use this table structure; replace placeholders with catalog values before dispatch:

| Job | Instance ID | Model slug | Effort | Selection reason |
| --- | --- | --- | --- | --- |
| Implementation | `<your-instance>` | `<catalog-slug>` | `<supported-option-or-empty>` | Your observed quality and available capacity |
| Independent review | `<another-instance>` | `<catalog-slug>` | `<supported-option-or-empty>` | A separate review of the actual diff |

Prefer a model that can finish the brief. Split independent deliverables across providers when that helps; keep tightly coupled changes together. Escalate a failed brief with its evidence instead of sending the same vague request to more workers.

The quota reader considers the tightest valid, recent T3-reported window: exhausted is `skip`, below 20% is `avoid`, otherwise `prefer`. Unsupported or stale readings are `no-data`. These are routing hints, not a billing guarantee or proof of unused subscription credit. Subscription and API billing remain those of the selected provider account.

Model selection is revalidated on corrections. Requested effort is sent on each turn; provider metadata, when available, is stronger evidence than the request alone.
