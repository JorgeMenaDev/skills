# Funnels, Activation, Retention

Use for `bootstrap` (defining the funnel) and `operate`/`growth-review` (reading it). The method is: define once in `context.md`, measure with the cookbook, act on the single biggest drop-off.

## Define before measuring

`context.md` must name, per product:

- **North-star metric** — the one number that proxies delivered value (not revenue, not signups; the repeated action that means the product worked).
- **Primary conversion event** — the snake_case event marking the visitor→user commitment (e.g. `quote_form_submitted`, `account_created`). Every product declares one at provisioning; if `context.md` lacks it, defining it *is* the bootstrap work.
- **Activation definition** — the earliest observable moment a new user has experienced the core value ("aha"). Pick from real behavior: query what actions week-2-retained users took in week 1 that churned users didn't, then choose the cheapest such action as the activation event. Guessing activation from the roadmap instead of retained-user behavior is the classic failure.
- **Funnel stages** — 3–6 events from first touch to activated, each an existing event name. Fewer, real stages beat aspirational ones.

## Measuring

Cookbook queries (`data-cookbook.md`) cover stage-to-stage conversion, time-to-convert, and retention curves. Prefer building the canonical funnel as a saved insight (API `POST /api/projects/<id>/insights/` with a funnel query, or by hand in the UI once) and registering it in `dashboards.md` — a saved insight is re-readable by the next session; an ad-hoc query is not.

Read funnels segmented before acting: by `app`, by device, by acquisition source. An aggregate drop-off often localizes to one segment, and the fix differs entirely (mobile UX vs channel quality).

## Acting

One rule: work the **single biggest drop-off** between adjacent stages, sized by absolute users lost, not percentage. The action is a backlog ticket with the stage, the segment, the evidence query, and a hypothesis — which usually flows into `replay-mining` (watch users at that stage) or `experiment` (test the fix).

## Retention

- Read retention keyed on the **activation event**, not signup — signup retention conflates onboarding failure with product failure.
- Flat-after-drop curves are healthy (a retained core exists); curves that never flatten mean no product-market fit for that cohort — a positioning/ICP question (`campaigns/positioning.md`), not a UX fix.
- Compare cohorts monthly in `growth-review`: is the curve's flat line rising release over release? That, not topline events, is the growth signal.
