# Self-Driving & Scouts — Capability Doc

What PostHog Self-driving is and how scouts work, so growth sessions can reason about them. **Adoption is not this skill's decision**: which products opt in, which scouts run, and GitHub-connection posture are fleet-doctrine calls (for the Andes fleet: wayfinder matias#114 → `andes-stack`). Until the operating profile's doctrine says a product has opted in, this reference is read-only knowledge.

Facts below are from PostHog's own write-ups, June–July 2026 (Andy Maguire's scout deep-dive; Josh Snyder & Cleo Lant's pipeline article; PostHog CLI post). Self-driving was open beta and scouts invite-only as of then — verify current access state at `posthog.com/docs/self-driving` before acting.

## The pipeline: scouts → signals → reports → PRs

- A **scout** is a small scheduled agent — essentially a skill (SKILL.md + optional references/scripts, per the Agent Skills spec) run in a harness with the PostHog MCP as its toolset, a project-scoped token as its sandbox, and a durable scratchpad as memory. Most run hourly. Business logic is English, not code: "a flagship NPS survey needs ≥30 responses/week and a ≥10% drop before it's worth acting on."
- When a scout finds something real it **emits a signal** (finding + evidence + suggested action + P0–P4 severity + dedupe key). Scouts are one source among many — error tracking, raw events, health checks, and warehouse tables also feed signals.
- Signals are normalized, **grouped into reports** (weight threshold promotes a report), researched by an agent with repo + MCP context, and land in the PostHog **Inbox** — often with a **draft PR built in a sandbox** ("Agent-authored — requires human review; do not self-merge").
- Setup: `npx @posthog/wizard@latest self-driving` (one of the wizard's allowed uses); needs GitHub repo connection and org-level AI-data-processing consent; drive it via Web, Slack, or MCP.

## Canonical scouts (~20 ship out of the box)

Samples: experiments validity (sample-ratio mismatch, zombie experiments), revenue analytics (MRR/churn shifts, broken Stripe syncs), surveys (NPS regressions, open-text themes), web analytics (channel divergence, 404 spikes), feature flags (evaluation cliffs, ghost flags, flag debt).

## What makes a scout good (the transferable design doctrine)

"The hard part of a scout isn't finding things. It's *not* finding things." A scout that emits on every wobble trains you to ignore it. The mechanics:

- **Emit bar**: emit only when confident the finding is real and attention-worthy; otherwise write a scratchpad note with an explicit **promote trigger** ("emit if a second independent voice echoes it").
- **Disqualifiers**: named pseudo-signals — single user, dev-environment burst, internal test data.
- **Dedupe keys** + scratchpad memory (rolling cursor, addressed-themes list, self-curated tags) so it never repeats itself.

This doctrine applies to any monitoring this skill sets up, scouts or not — a growth-review section that flags every metric wobble has the same disease.

## Custom-scout patterns worth knowing

- **Custom-event scouts**: point a scout at any event stream — feedback widgets, support events, MCP agent feedback. PostHog's `signals-scout-mcp-feedback` watches one event and escalates recurring defects via scratchpad rules.
- **Warehouse scouts**: anything you can land in PostHog is scout-able — their brand-mentions scout reads a social-listening tool's Slack channel synced into the data warehouse as a table.
- **Funnel scouts**: a scout owns a product's activation funnel, flags regressions against its own trailing baseline, and proposes the experiment to fix the weakest step.
- Authoring: don't hand-write — PostHog ships an `authoring-signals-scouts` skill (emit contract, dedupe, disqualifiers, scheduling) and an `exploring-signals-scouts` fleet-health skill via the PostHog AI Plugin.

## Overlap warning

Scouts→signals→reports is an operator-notification surface. If the operating profile already has one (the Andes fleet's BCR Relay owns customer signals), the boundary between them is a doctrine decision — don't wire scout notifications into a second channel unilaterally.
