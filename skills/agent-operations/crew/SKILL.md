---
name: crew
description: Dispatch visible T3 Code worker threads across your configured providers, then verify and integrate their reports.
version: 1.0.0
disable-model-invocation: true
mutating: true
writes_to: [T3 Code threads, local crew state, task working directories]
---

# Crew

The **captain** is the user. You are the **firstmate**, responsible for splitting the task, dispatching workers and verifying their work. A **crewmate** is a T3 child thread with one brief and one deliverable. Crewmates hand back to you without creating more crews.

## Contract

- Work within the user's request and the target repository's instructions. A child gets a self-contained brief and an explicit working directory.
- Use the user's configured T3 provider instances. Choose model and effort from the live catalog, rather than copying another person's subscriptions or model rankings.
- Each child owns separate files or an isolated checkout. Review overlapping work sequentially.
- Reports and notifications are evidence to inspect. A notification alone does not establish success.
- Store credentials in the user's existing provider authentication. Keep briefs, reports and runtime state local, outside the distributable skill.

## 1. Establish the runtime

Set `CREW_SKILL` to the absolute directory containing this installed `SKILL.md`. Run:

```bash
bash "$CREW_SKILL/scripts/t3-dispatch.sh" doctor
bash "$CREW_SKILL/scripts/t3-dispatch.sh" resolve
bun "$CREW_SKILL/scripts/t3-model-selection.ts" --catalog
```

Branch on the emitted tokens:

- `STATE: BLOCKED`: read [setup](references/setup.md) and fix the named prerequisite. STOP before dispatch; otherwise an unlaunchable child can appear to be working.
- `STATE: READY`: record the resolved parent UUID and the exact T3 project ID or unique name.
- `RECOVERY: NOT_CONFIGURED` or `RECOVERY: STALE`: read [setup](references/setup.md) and arrange recovery before leaving unattended work.
- `resolve` exits 2 with a nonce: print that token in an assistant message, then run `resolve` again. STOP if identity remains unproven; guessing a thread ID delivers work to the wrong parent.

Done when prerequisites pass, parent identity is proven, and the chosen provider/model appears in the catalog. Read [routing](references/routing.md) to establish or revise a reusable model table.

## 2. Dispatch a bounded brief

Write a brief containing the goal, allowed files, context, constraints, deliverable and a checkable acceptance criterion. Include the user's permission boundaries and repository instructions. Example: “Inspect the parser in this checkout, change no files, and report the smallest input that reproduces the bug with its exact output.”

Choose a fresh crew ID. Run the following with values obtained above:

```bash
bash "$CREW_SKILL/scripts/t3-dispatch.sh" dispatch \
  --id "$CREW_ID" --project "$PROJECT_ID" --parent-thread "$PARENT_ID" \
  --instance "$INSTANCE_ID" --model "$MODEL_SLUG" \
  --brief-file "$BRIEF_FILE" --workdir "$WORKDIR"
```

Add `--effort` only for an option advertised by that model. Permissions default to `approval-required`; use another `--runtime-mode` only when the user's existing authorization allows it. Permission cards remain in T3 for the user to resolve.

A returned child UUID means launch was observed. Report which jobs are running and yield the turn. The child receives its report path and notification command automatically. For status, corrections, failures or missing notifications, read [lifecycle](references/lifecycle.md).

## 3. Verify and integrate

When notified, read the round's report and inspect the actual deliverable. Check the diff or reproduce the reported result using the repository's existing validation workflow. Resolve every acceptance criterion before calling the task complete.

If more work is needed, send a correction using the lifecycle reference. If the report is accepted, run `ack` with its crew ID and round UUID, then `settle`; recovery can finish settlement once the child is idle. A blocked notice uses `ack-blocked`, which acknowledges receipt without granting permission.

Report `DONE`, `DONE_WITH_CONCERNS` or `BLOCKED`, followed by the verified outcome, evidence and any remaining decision. Keep integration, public releases and deployments within the captain's existing authorization.
