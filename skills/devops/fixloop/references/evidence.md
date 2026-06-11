# Evidence Pass — Read-Only Investigation

Contract: read-only. Do not modify application code, production data, secrets, deployments, auth users, billing state, or env vars during this pass. Output: findings, confidence, evidence, recommended actions — as a ledger comment.

## Tool Order

1. **Alerting surface**: the exact exception, release, URL, user context, tags, request ID, replay ID.
2. **Backend/data**: logs and read-only queries for the request ID. Prefer read-only MCP/API access over tailing CLIs.
3. **Hosting/deploys**: deployments and runtime logs when the symptom involves HTTP routes, builds, server actions, or missing env.
4. **Local source**: connect the tool evidence to the exact code path and data access pattern.

Adapt the surfaces to the stack in `DEBUGGING.md`; the principle is alert → data → infra → source.

## Rules

- Cross-check at least two surfaces before calling a root cause likely.
- Do not infer production errors from the alerting surface alone when the failure is data- or webhook-specific — confirm in backend logs.
- Use the handles doc's known-good commands and respect its Avoid list.
- Keep raw payloads short and redacted. Keep IDs, request IDs, deployment URLs, and file paths — they let the next agent reproduce the investigation.
- Every new gotcha goes into the handles doc's Avoid section before the pass ends.

## Output

One comment on the ledger issue (template in [ledger.md](ledger.md)):

- Evidence summary
- Timeline with absolute timestamps
- Root cause assessment with confidence
- Ruled-out hypotheses
- Recommended actions
- Commands run (sanitized)
