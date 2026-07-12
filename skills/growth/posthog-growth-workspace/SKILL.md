---
name: posthog-growth-workspace
description: "Use when operating data-driven growth for a product instrumented with PostHog — funnels, activation, retention, experiments, session-replay mining, campaign plays, and periodic growth reviews. Triggers: \"growth review\", \"why aren't users activating\", \"run an experiment\", \"mine session replays\", \"what does the product data say\", \"set up the growth workspace\", \"monthly growth report\". Creates a durable .growth workspace per product, reads live PostHog data CLI-first, does one verified high-leverage action per pass, and logs handoffs. Installs in a single product repo (standalone) or in an orchestrator/agent-profile repo managing many products (hub). Install/instrumentation doctrine and SEO/search-channel work belong to other skills."
version: 1.0.0
license: MIT
mutating: true
writes_to: [".growth/"]
---

# PostHog Growth Workspace

> **🚧 In progress — contribute back.** This skill is open source and under active development; every run is also product development for the skill itself. When a run reveals anything that would make it better — sharper references, new cookbook queries, better playbooks — implement it and open a pull request to `JorgeMenaDev/skills` in the same session, or record the idea in the run's handoff log.

Run a durable growth operating workspace on top of a product's live PostHog data. The goal is not advice; it is evidence from real events, one verified action per pass, and continuity between sessions.

Use this skill as a mode router. Load only the reference the selected mode needs.

## Ground Rules

- Every claim about the product cites live PostHog data (a query, insight, or replay), never intuition. If the data disproves the hypothesis, that is the finding.
- PostHog access is CLI/REST only: `scripts/pg-query.mjs` (HogQL + raw API) or `posthog-cli`. Auth comes from the environment (`POSTHOG_PERSONAL_API_KEY`); never print keys.
- Keep one current focus ticket at a time; task lists live only in `.growth/backlog.md`.
- Evidence goes to `.growth/audit.md`, decisions to `.growth/strategy.md`, handoffs to `.growth/log.md`, dated reviews to `.growth/reports/`.
- Registries are rewritten in place, never forked: dashboards in `dashboards.md`, experiments in `experiments.md`, campaigns in `campaigns.md`.

## Boundaries

Three-way contract — respect it in both directions:

- **Install doctrine** (SDK wiring, proxy, identify, consent, keys, provisioning) belongs to the consuming stack's doctrine — for the Andes fleet, `andes-stack` `references/analytics-posthog.md`. This skill audits install health *from the data side* only (`references/platform-ops.md`) and never edits product-repo instrumentation.
- **This skill** owns everything done *with* the data: dashboards and insights (creation + audit), funnels, experiments, replay mining, campaign plays, growth reviews.
- **Search-channel growth** (keywords, content, Search Console, AI-search visibility, SEO-page CTAs) belongs to `seo-growth-workspace`. `references/campaigns/channels.md` excludes organic search and points there.

## Required Workspace

Create or verify at GROWTH_WORKSPACE (see Install Modes), copying skeletons from `templates/workspace/`:

```text
.growth/
  README.md       # what this workspace is, for the next agent
  context.md      # product, ICP, funnel, north-star + primary conversion event
  backlog.md      # prioritized growth tickets, one current focus
  log.md          # session handoffs
  strategy.md     # durable decisions, tooling, PostHog project id
  audit.md        # evidence: live data findings
  dashboards.md   # PostHog dashboards/insights inventory (names, ids, URLs)
  experiments.md  # hypothesis → flag → verdict registry
  campaigns.md    # campaign plays + outcomes
  reports/        # dated growth reviews
```

## Install Modes

Hub mode is stamped in the hub's `.growth/config.json` (`{"mode": "hub"}`); standalone is inferred by its absence — light machinery, create-if-missing, no migration tooling:

- **standalone** — a product repo; GROWTH_WORKSPACE is repo-local `.growth/`.
- **hub** — an orchestrator repo managing many products; the hub's `.growth/` holds `config.json`, `registry.md` (slug → product, repo, PostHog project id, last review), and one workspace per product under `.growth/products/<slug>/`. Resolve the target product from `registry.md` before any work.

## Choose A Mode

Pick the narrowest mode that satisfies the request; default to `operate`.

| Mode | Use when | Exit criteria |
| --- | --- | --- |
| `operate` | Continuing growth work without a narrower request | State read, one evidence-backed action completed and verified in live PostHog data, `log.md` handoff written |
| `bootstrap` | Starting a workspace | `.growth/` exists, `context.md` names ICP + north star + primary conversion event, first audit and backlog rows exist |
| `experiment` | Testing a hypothesis with a flag/experiment | Hypothesis, flag, and success metric registered in `experiments.md`; experiment launched or verdict recorded |
| `replay-mining` | Extracting friction from session replays | Replays reviewed, friction findings with replay links in `audit.md`, at least one backlog row filed or explicitly ruled out |
| `campaign` | Running a marketing/sales play | One playbook from `references/campaigns/` executed against the real product, outcome row in `campaigns.md` |
| `growth-review` | Periodic review (monthly per product; hub-batched; manually triggered — scheduling it is the operating profile's decision, not this skill's) | Dated report in `reports/` with metric deltas, experiment verdicts, and the single next action; hub runs also stamp each product's last-review date in `registry.md` |

`operate` reads state in this order: `backlog.md` → `log.md` → `audit.md` → `strategy.md` → latest `reports/*` → `context.md`. If `.growth/` is missing, run `bootstrap` first. If no ticket is ready, pick the smallest checkpoint from the funnel: install health (`references/platform-ops.md`) → activation/retention (`references/funnels-activation-retention.md`) → replay friction → experiment pipeline → campaign pipeline. Log the evidence even when everything is healthy.

## Data Access

`scripts/pg-query.mjs` runs HogQL (`--project <id> --hogql "…"`) and raw API reads (`--get /api/projects/<id>/…`). Recurring queries live in `references/data-cookbook.md` — start there before writing a query from scratch; graduate a new query into the cookbook when it recurs.

## Progressive References

- Install-health audit from the data side: `references/platform-ops.md`
- Funnels, activation, retention method: `references/funnels-activation-retention.md`
- Experiment method and registry discipline: `references/experiments.md`
- Session-replay mining: `references/replay-mining.md`
- HogQL cookbook: `references/data-cookbook.md`
- Self-driving / scouts (capability doc; adoption is a fleet-doctrine decision, not this skill's): `references/scouts-self-driving.md`
- Marketing-budget framework: `references/budget-framework.md`
- Campaign playbooks: `references/campaigns/positioning.md`, `launch.md`, `channels.md`, `pricing.md`, `sales.md`
