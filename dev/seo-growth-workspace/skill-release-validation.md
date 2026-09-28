# Skill release validation

Validate the portable skill before release. Structural checks cannot tell whether an agent discovers a useful opportunity or finishes the work.

## Structural check

From the source repository, run:

```bash
node dev/seo-growth-workspace/check-skill.mjs
```

This checks frontmatter/version, the file graph, script help, offline golden data renders and credential-free dry runs. Preserve existing script fixtures unless their behavior intentionally changes.

## Behavioral comparison

For every release that changes `SKILL.md`, a reference or a template, use saved real site inputs with enough evidence to choose and prepare work. Keep private customer data and credentials out of the public skill repository.

1. Save the starting skill revision and the candidate revision, the exact request, the input manifest and evaluation constraints.
2. Run fresh agents independently against each version with the same request and raw site evidence. Give them only the applicable skill and inputs. Do not give them the intended answer, suspected defect, proposed fix or the other run's output. Restrict evaluation writes to scratch output and prohibit external mutations.
3. Use the standing case set: one frozen packet for each of three cases (a growth site with live bets awaiting results; a business with a measurable qualified-outcome path; a site under an explicit maintenance or pause mandate), plus a synthetic held-out case. The consumer keeps the packets in its private store with checksums and reuses them across releases so results compare. Add a held-out case when a finding changes the instructions.
4. Run both versions on each model a consumer's scheduled review uses, before merge.
5. Judge actual outputs: respects the mandate and current decisions; uses performance and outside demand proportionately; chooses against alternatives; identifies original proof; avoids live/queued duplicates; takes each chosen bet to a finished state (`live`, `package` or `evidence request`) with substantiated work; proposes an approval-boundary line only when the same approval repeats (citing both bets), only one that removes a per-item approval, and only in the report; distinguishes delivery from outcomes; handles capacity/interference; keeps unknowns honest. Record failures and trade-offs, not just a pass count.
6. Fix observed instruction failures and rerun the affected behavior. A small replay is evidence about those cases, not proof of general model reliability or future rankings.

## Live use and release record

After checks and the normal repository review/release flow, install through the consumer's normal installer. Verify the installed revision and runtime copies. Exercise the changed method on one named live site under its existing authorization; dry-run evaluations do not establish live execution. Record the useful work advanced, actual requests/cost where available, preparation effort, handoffs, unresolved constraints and next outcome check. Do not claim a route was exercised merely because its instructions exist.

Record the source revision, commands/results, behavioral evidence and named-site limitations in a dated file under `dev/seo-growth-workspace/`. The site's own report and bet remain its operational record. No second site ledger or universal release dashboard is needed.
