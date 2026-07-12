# Skills for Real Growth and Agent Operations

[![skills.sh](https://skills.sh/b/JorgeMenaDev/skills)](https://skills.sh/JorgeMenaDev/skills)

Agent skills I use for SEO, growth, and agent-operations work that needs evidence, execution, verification, and memory — not one-shot audits or slide-deck recommendations.

Real growth work is hard. One-shot prompts produce generic checklists. Framework-heavy workflows try to own the process, but they often bury the business context and make it hard to tell what actually shipped. These skills stay small, composable, and adaptable. They work with any model. Hack around with them. Make them your own.

## Quickstart (30-second setup)

1. Run the skills.sh installer:

```bash
npx skills@latest add JorgeMenaDev/skills
```

2. Pick the skills you want and which coding agents to install them on.

3. Open a session in a target repo and invoke the skill that matches the work — for example, start SEO work with `seo-growth-workspace`.

Most people begin with **`seo-growth-workspace`**. For unattended multi-phase shipping, add **`shiploop`**. When the question is where a plan should live, use **`work-tracking`**.

### `operator-handoff`

A job-file handoff protocol between a requesting agent and the Operator — a human-supervised computer-use agent on a real desktop/browser. Jobs, reports, and evidence live in `.agents/operator/`; a per-repo `HOST.md` carries the machine-, account-, and repo-specific facts so the skill itself stays portable.

Use it when a task needs real clicks or credentials the agent doesn't hold: desktop app setup, third-party dashboards, OAuth consents, captchas, 2FA, Gherkin QA runs, or delegated implementation of fully-designed code slices.

```bash
npx skills@latest add JorgeMenaDev/skills --skill operator-handoff
```

### `counsel`

A two-vendor adversarial review protocol for hard-to-reverse architecture or design decisions. Two flagship reviewers from different vendors attack a file-backed proposal in parallel; the chair synthesizes, revises, and re-convenes for up to three rounds. A one-vendor run is a *second opinion*, not counsel. Runtime launch adapters stay consumer-local (e.g. Claude Code `.claude/skills/counsel/`).

```bash
npx skills@latest add JorgeMenaDev/skills --skill counsel
```

### `source-to-system`

A system-first review loop for external articles, videos, repositories, prompts, and tactics. It captures the material claims in temporary scratch space, compares them with the user's existing systems, selects one owned improvement or no change, and stops for approval before durable workspace or external-system mutation.

```bash
npx skills@latest add JorgeMenaDev/skills --skill source-to-system
```

## Why These Skills Exist

I built these skills to fix failure modes I keep seeing in AI growth and agent-ops work.

### #1: The Agent Gave Generic SEO Advice

> "No-one knows exactly what they want."
>
> David Thomas & Andrew Hunt, [The Pragmatic Programmer](https://www.amazon.com/Pragmatic-Programmer-Your-Journey-Mastery/dp/0135957052)

**The problem.** The internet already has enough SEO checklists. The useful work is deciding what matters for *this* business, *this* repo, *this* market, and *this* moment. Most agents skip that and optimize pages without understanding the business.

**The fix** is **[`seo-growth-workspace`](./skills/growth/seo-growth-workspace/SKILL.md)** — gather context, inspect live and code evidence, and turn findings into a prioritized backlog instead of stopping at recommendations.

<details>
<summary>Example: recommendation vs ticket</summary>

- **Before:** "Improve meta descriptions across the blog."
- **After:** A `.seo/backlog.md` ticket — target URL, rendered title/description evidence, business intent, one verification step, and a handoff note in `.seo/log.md`.

</details>

### #2: The Next Session Forgot Everything

**The problem.** SEO compounds only when the next pass can trust the previous one. Without durable notes, agents re-audit the same surfaces, forget blockers, and repeat work that already failed.

**The fix** is a predictable workspace. **`seo-growth-workspace`** bootstraps `.seo/` — context, backlog, audit evidence, reports, backlinks, decisions, and handoffs in files the next agent can find. **`work-tracking`** applies the same idea when the question is broader: repo markdown, GitHub Issues, Linear, or memory.

### #3: "Done" Meant a Doc, Not Live Proof

> "Always take small, deliberate steps. The rate of feedback is your speed limit."
>
> David Thomas & Andrew Hunt, [The Pragmatic Programmer](https://www.amazon.com/Pragmatic-Programmer-Your-Journey-Mastery/dp/0135957052)

**The problem.** A content plan is not done because the calendar looks nice. A technical fix is not done because code changed. A backlink is not live because it was submitted.

**The fix** is verification built into the loop: live URLs, rendered metadata, sitemap state, Search Console evidence, analytics proof, UI checks, or public links. Every action pushes toward proof, not paperwork.

### #4: Five Lanes Open, Nothing Shipped

**The problem.** Growth agents love opening five lanes at once — audit, content, schema, backlinks, reporting — and finishing none of them. Unattended runs die when context resets. Incidents get "fixed" without a durable record.

**The fix** is one current focus ticket, clear done criteria, and skills for the heavy lifts:

- **`seo-growth-workspace`** — one high-leverage SEO action per pass, with handoff.
- **`shiploop`** — multi-phase shipping through GitHub issue ledgers, gated PRs, and worker adapters when the run must survive context loss.

### Summary

Growth fundamentals matter more than ever: context before advice, memory between sessions, proof before "done," and one focus at a time. These skills condense that into repeatable operating loops for SEO work, plan tracking, autonomous shipping, and production incidents.

## Reference

All skills below are **model-invoked** — the agent can reach for them when the task fits, or you can invoke them directly.

### Growth

- **[seo-growth-workspace](./skills/growth/seo-growth-workspace/SKILL.md)** — Durable SEO operating workspace: bootstrap `.seo/`, capture business context, audit evidence, prioritize backlog, implement one action, verify live, log handoff. Technical SEO, Search Console, schema, local SEO, content ops, internal links, backlinks, pSEO, conversion paths, monthly reporting.

### Agent Operations

- **[operator-handoff](./skills/agent-operations/operator-handoff/SKILL.md)** — Job-file handoff between a requesting agent and a human-supervised computer-use Operator: jobs, reports, evidence trails, and a per-repo `HOST.md` host profile.
- **[orchestrate](./skills/agent-operations/orchestrate/SKILL.md)** — Conduct dependency-aware multi-agent work through typed waves, isolated executors, durable run state, review gates, and verified integration.
- **[source-to-system](./skills/agent-operations/source-to-system/SKILL.md)** — Turn external material into one evidence-backed, owned system improvement or an explicit no-change decision.

### Software Development

- **[design-system-keeper](./skills/software-development/design-system-keeper/SKILL.md)** — Extract, encode, and enforce a repo's real design system as an agent-readable canon (v0 Design Systems 2.0 shape): sourced rules, a primitive index, verify-against-source builds, and a drift backlog instead of memory-built lookalikes.
- **[cursor-subagent](./skills/software-development/cursor-subagent/SKILL.md)** — Cursor sidecar delegation for explicit Cursor/Grok exploration, review, or isolated implementation.
- **[work-tracking](./skills/software-development/work-tracking/SKILL.md)** — Decide where multi-step work should live: repo markdown, GitHub Issues, Linear, memory, or a mix. When to promote tasks to issues and how future agents find current state.

### DevOps

- **[shiploop](./skills/devops/shiploop/SKILL.md)** — Turn a plan, fix, or feature into an unattended shipping run: GitHub issue ledger, dependency-gated phases, gated PRs, review evidence, optional worker adapters.
- ~~**fixloop**~~ — deprecated 2026-07-05 ([history](./deprecated/fixloop/SKILL.md)): incident debugging now = Sentry evidence + `STACK.md` handles (Matias profile) + the `diagnosing-bugs` skill (github.com/mattpocock/skills) + per-repo `AGENTS.md` debugging notes.

## Maintainer Notes

`cursor-subagent` source lives in `skills/software-development/cursor-subagent/`. Update it there first, bump `version:` in `SKILL.md`, commit and push `JorgeMenaDev/skills`, then update consumers such as Matias with:

```bash
cd ~/.hermes/profiles/matias
npx skills@latest update cursor-subagent -p -y
```

Public page: https://www.skills.sh/jorgemenadev/skills/cursor-subagent
