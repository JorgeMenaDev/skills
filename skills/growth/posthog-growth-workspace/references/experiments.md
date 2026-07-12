# Experiments — Hypothesis → Flag → Verdict

Use for `experiment` mode. The registry (`experiments.md` in the workspace) is the deliverable; an experiment that isn't registered didn't happen, and a registered experiment without a verdict is debt.

## Registry row (one per experiment, rewritten in place as it advances)

```md
## EXP-003 — <short name>
- Status: draft | running | verdict
- Hypothesis: <change X> will move <metric Y> for <segment Z> because <evidence from audit.md>
- Flag/experiment: <feature flag key or PostHog experiment id + URL>
- Primary metric: <event or funnel stage> · Minimum effect worth shipping: <e.g. +10% stage conversion>
- Started / decided: YYYY-MM-DD / YYYY-MM-DD
- Verdict: ship | kill | inconclusive — <one line of evidence>
```

## Method

1. **Hypothesis from evidence.** Every hypothesis cites an `audit.md` finding (funnel drop-off, replay friction, campaign result). "Let's test button color" with no finding behind it is the anti-pattern — kill it at registration.
2. **One primary metric, declared before launch,** with the minimum effect worth shipping. Deciding the metric after seeing results is how inconclusive experiments get shipped.
3. **Check power honestly.** At low traffic (hundreds of weekly users), most A/B tests can't reach significance in a tolerable window. The honest alternatives, in order: ship-and-watch (before/after on the primary metric with a note that it's uncontrolled), test bigger changes (large effects need small samples), or don't test — decide from replays and qualitative evidence. Running an underpowered test for months is the worst option; say so in the registry.
4. **Mechanics.** Feature flags and experiments are created via API/CLI (`pg-query.mjs --get /api/projects/<id>/feature_flags/`, `POST /api/projects/<id>/experiments/`) or once by hand and registered. The flag key goes in the registry; the product-repo code change that consumes the flag is normal product work (whatever lane the repo uses), not this skill editing instrumentation.
5. **Verdict is a dated decision.** ship / kill / inconclusive, with one line of evidence and the follow-up (ship → remove the flag ticket; kill → what the hypothesis got wrong; inconclusive → what would have to change to re-run). Flags left running after verdicts are debt — sweep them in `growth-review`.
