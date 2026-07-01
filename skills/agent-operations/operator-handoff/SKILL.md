---
name: operator-handoff
description: Job-file handoff between a requesting agent and the Operator — a human-supervised computer-use agent driving the machine's real desktop and browser. Use when a task needs real clicks or credentials the agent doesn't hold (desktop app setup, third-party dashboards, OAuth consents, captchas, 2FA), when delegating a Gherkin-spec QA run or a fully-designed code slice, or when resuming after a run ("check the operator report", "run job NNN").
mutating: true
writes_to: [.agents/operator/]
---

# Operator Handoff

Two roles use this skill:

- **Requester** (the agent in this session): writes jobs, resumes from reports. **This is almost always you.**
- **Operator** (a computer-use agent supervised by the human): executes jobs on the real desktop/browser, writes reports with evidence.

The job file is the only channel between them — no shared context, no follow-up questions. **The job is the contract.**

## Preamble (run FIRST — the script decides your role, you don't)

Set `JOB_ID` to the job number from the invocation (`/operator-handoff 003` → `003`; empty if none), then run:

```bash
JOB_ID="<NNN-or-empty>"
cd "$(git rev-parse --show-toplevel)" 2>/dev/null
_O=.agents/operator; _J=$_O/jobs; _R=$_O/reports
[ -f "$_O/HOST.md" ] && echo "HOST: $_O/HOST.md" || echo "HOST: missing"
if [ -n "$JOB_ID" ]; then
  _JOB=$(find $_J -name "${JOB_ID}-*.md" 2>/dev/null | head -1)
  _REP=$(find $_R -name "${JOB_ID}-*.md" 2>/dev/null | head -1)
  if [ -z "$_JOB" ]; then echo "ROLE: requester"; echo "WARN: no job file for $JOB_ID"
  elif [ -z "$_REP" ]; then echo "ROLE: operator"; echo "JOB_FILE: $_JOB"
  else echo "ROLE: requester-resume"; echo "JOB_FILE: $_JOB"; echo "REPORT_FILE: $_REP"; fi
else echo "ROLE: requester"; fi
for j in $(find $_J -name "*.md" 2>/dev/null | sort); do n=$(basename "$j" | cut -d- -f1); [ -n "$(find $_R -name "${n}-*.md" 2>/dev/null)" ] || echo "PENDING: $(basename "$j")"; done
```

Branch ONLY on the echoed tokens:

- `HOST: missing` → whatever your role, first scaffold `.agents/operator/HOST.md` from [reference/host-template.md](reference/host-template.md): infer what you can from the repo, ask the human the rest, and make the file committable (gitignore exception). Then continue.
- `ROLE: operator` → read `HOST.md` and [reference/operator-runbook.md](reference/operator-runbook.md) in full, then EXECUTE `JOB_FILE` now, in this session. **STOP-GATE: telling the human to run the job you were just told to run is the exact failure this preamble exists to prevent.** No handback, no waiting.
- `ROLE: requester-resume` → read `HOST.md`, then do the **On resume** step of the workflow.
- `ROLE: requester` → read `HOST.md`, then the workflow below.

## HOST.md — the host profile

The skill is generic; everything machine-, account-, or repo-specific lives in `.agents/operator/HOST.md` (committed): requester identity, operator environment, legal secrets destinations, app URL + sign-in actor, the review gate for `code` jobs, local conventions. Both roles read it in full before acting. If writing a job needs a host fact that isn't there yet, add it to `HOST.md` as you go.

## Directories

```
.agents/operator/HOST.md                    # host profile (committed; everything below is gitignored)
.agents/operator/jobs/<NNN>-<slug>.md       # work requests
.agents/operator/reports/<NNN>-<slug>.md    # results, same NNN + slug
.agents/operator/evidence/<NNN>/            # screenshots & sanitized output for a job
```

- **Job ID**: zero-padded `NNN`. Next ID = highest existing job number + 1.
- **Pending job** = job file with no matching report file (same `NNN`).
- These dirs are an interface: only jobs in `jobs/`, only reports in `reports/`. A stray `NNN-` file in `reports/` masks a pending job.
- To retire a pending job that should never run, write its report yourself: `**Status:** SUPERSEDED` + one line why. Never delete job files — they are the trail.

## Job kinds

| Kind | Use for | Template |
|---|---|---|
| `generic` | Any desktop/browser/CLI errand: app setup, verify an email flow, inspect a vendor console, collect a one-off proof. **The default.** | [reference/job-templates.md](reference/job-templates.md) |
| `config` | Third-party dashboard setup producing env values | same |
| `qa` | Execute committed Gherkin specs across browser/dashboard/CLI/API; verdict per scenario | same |
| `code` | Implement an already-decided design slice (design settled, scope pinned) in a code repo | same |

## Requester workflow

1. Decide the work actually needs the Operator (see Division of labor). If not, do it yourself.
2. For `qa` jobs: write/update the `.feature` spec first, commit it under `tests/gherkin/<domain>/`. Put the actor, entry URL, sign-in path, and selected scenario IDs in the job, not the spec.
3. For `code` jobs: only delegate when design is fully decided — no open questions. The job must carry every decision the Operator needs (glossary terms, design-doc links, file-level plan, validation commands, repo conventions). If you'd have to leave a decision open, don't delegate — settle it first or implement yourself.
4. Write `jobs/<NNN>-<slug>.md` from the matching template. Always include: goal, exact steps/URLs/app names, what to produce, where to put it, and the secrets rule. For desktop app jobs, name the app, the exact menus/buttons, and what "done" looks like on screen.
5. STOP. Tell the human: `/operator-handoff <NNN>` — nothing more. The Operator's runbook covers everything else; never restate its rules in the handoff prompt.
6. **On resume**: read `reports/<NNN>-*.md` (+ evidence), verify any env keys it claims to have written (key NAME presence only), continue the task. For failed `qa` scenarios, treat each as a bug to triage — the report is evidence, not the fix. For `code` jobs, your review is **conformance only** (architecture followed? scope respected? nothing extra?) — the Operator already self-reviewed for bugs; flag deviations to the human, then commit per the repo's conventions. The Operator never commits.

## Secrets rule (both roles)

Secret values go ONLY into a destination the job names, chosen from the legal ones `HOST.md` lists (an env file, a platform env, a password manager). Job, report, and evidence files carry env key NAMES, never values. Never screenshot a page with a visible secret.

## Division of labor

- **Operator**: anything needing real clicks on the host machine — desktop app setup/config, real human-account logins (OAuth, captchas, 2FA, payments), third-party dashboards, full Gherkin regression packs, and `code` jobs whose architecture is already fully decided.
- **Requester directly**: design work, drafting, repo edits, anything headless or scriptable. No job file needed.
- Rule of thumb: if it takes real credentials the agent doesn't hold, a GUI it can't drive headlessly, or it's pure execution of a pinned design — hand it off. `HOST.md` may sharpen this split for the repo.
