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

Most people begin with **`seo-growth-workspace`**. For unattended multi-phase shipping, add **`shiploop`**. When the question is where a plan should live, use **`work-tracking`**. To publish through Andy MCP, add **`andy-post`**.

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

### `painted-music-video`

A music video painted entirely in code: an original song with vocals (Google Lyria 3 Pro), watercolour animation in p5.brush, word-by-word karaoke, and chapters painted by parallel subagents from one storyboard, rendered to MP4 in headless Chrome. Ships the engine as templates and two worked examples (a 93 s intro film and a 62 s sequel made by a fresh agent from the skill alone). User-invoked: run `/painted-music-video`. Method inspired by [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo).

```bash
npx skills@latest add JorgeMenaDev/skills --skill painted-music-video
```

### `youtube-thumbnails`

YouTube thumbnails and channel banners painted by an image model (Codex image generation on a ChatGPT plan) and grounded in the real brand: the model paints one moment, the real logo is composited on top, and every candidate is judged at the 168×94 size phone viewers see. Ships the evidence behind each rule, prompt skeletons, a finish-and-export script and a review-sheet script.

```bash
npx skills@latest add JorgeMenaDev/skills --skill youtube-thumbnails
```

### `andy-post`

Draft and publish social posts through [Andy MCP](https://docs.andypartner.com). The operator gives a raw idea. The agent returns 2-3 drafts. After a pick, it publishes or schedules. Andy MCP is an active build: file skill or MCP friction on this repo.

```bash
npx skills@latest add JorgeMenaDev/skills --skill andy-post
```

### `grok-deep-research`

An isolated deep-research loop over native xAI Grok Build CLI. It defaults to native web search, can expose only Firecrawl MCP when requested, audits evidence gaps in one temporary session, and emits a consistently structured cited report plus provider-usage metadata.

```bash
npx skills@latest add JorgeMenaDev/skills --skill grok-deep-research
```

## Why These Skills Exist

I built these skills to fix failure modes I keep seeing in AI growth and agent-ops work.

### #1: The Agent Gave Generic SEO Advice

> "No-one knows exactly what they want."
>
> David Thomas & Andrew Hunt, [The Pragmatic Programmer](https://www.amazon.com/Pragmatic-Programmer-Your-Journey-Mastery/dp/0135957052)

**The problem.** The internet already has enough SEO checklists. The useful work is deciding what matters for *this* business, *this* repo, *this* market, and *this* moment. Most agents skip that and optimize pages without understanding the business.

**The fix** is **[`seo-growth-workspace`](./skills/growth/seo-growth-workspace/SKILL.md)** — pull live Search Console, result and demand evidence, pick one to three sized bets a week, ship them, and stop the lanes that do not earn clicks.

<details>
<summary>Example: recommendation vs bet</summary>

- **Before:** "Improve meta descriptions across the blog."
- **After:** A `.seo/bets.md` bet: the query and page behind it, its search demand, a live result check, a size scenario, a check date and a kill rule.

</details>

### #2: The Next Session Forgot Everything

**The problem.** SEO compounds only when the next pass can trust the previous one. Without durable notes, agents re-audit the same surfaces, forget blockers, and repeat work that already failed.

**The fix** is a predictable workspace. **`seo-growth-workspace`** keeps `.seo/`: context, owner decisions, bets, a research log, reports and a short run log in files the next agent can find. **`work-tracking`** applies the same idea when the question is broader: repo markdown, GitHub Issues, Linear, or memory.

### #3: "Done" Meant a Doc, Not Live Proof

> "Always take small, deliberate steps. The rate of feedback is your speed limit."
>
> David Thomas & Andrew Hunt, [The Pragmatic Programmer](https://www.amazon.com/Pragmatic-Programmer-Your-Journey-Mastery/dp/0135957052)

**The problem.** A content plan is not done because the calendar looks nice. A technical fix is not done because code changed. A backlink is not live because it was submitted.

**The fix** is verification built into the loop: live URLs, rendered metadata, sitemap state, Search Console evidence, analytics proof, UI checks, or public links. Every action pushes toward proof, not paperwork.

### #4: Five Lanes Open, Nothing Shipped

**The problem.** Growth agents love opening five lanes at once — audit, content, schema, backlinks, reporting — and finishing none of them. Unattended runs die when context resets. Incidents get "fixed" without a durable record.

**The fix** is one current focus ticket, clear done criteria, and skills for the heavy lifts:

- **`seo-growth-workspace`**: one to three sized bets a week, each with a check date and a kill rule.
- **`shiploop`** — multi-phase shipping through GitHub issue ledgers, gated PRs, and worker adapters when the run must survive context loss.

### Summary

Growth fundamentals matter more than ever: context before advice, memory between sessions, proof before "done," and one focus at a time. These skills condense that into repeatable operating loops for SEO work, plan tracking, autonomous shipping, and production incidents.

## Reference

All skills below are **model-invoked** — the agent can reach for them when the task fits, or you can invoke them directly.

### Growth

- **[seo-growth-workspace](./skills/growth/seo-growth-workspace/SKILL.md)** — Durable SEO operating workspace: bootstrap `.seo/`, capture business context, audit evidence, prioritize backlog, implement one action, verify live, log handoff. Technical SEO, Search Console, schema, local SEO, content ops, internal links, backlinks, pSEO, conversion paths, monthly reporting.
- **[andy-post](./skills/growth/andy-post/SKILL.md)** — Draft and publish X, LinkedIn, and Instagram posts through Andy MCP: raw idea → 2-3 drafts → operator picks → publish or schedule.
- **[posthog-growth-workspace](./skills/growth/posthog-growth-workspace/SKILL.md)** — Durable product-data growth workspace on live PostHog data: bootstrap `.growth/`, funnels/activation/retention, experiment and campaign registries, session-replay mining, HogQL cookbook + query runner, monthly growth reviews. Sibling of `seo-growth-workspace` — SEO stays there; install doctrine stays with your stack.

### Agent Operations

- **[orchestrate](./skills/agent-operations/orchestrate/SKILL.md)** — Conduct multi-agent work from a human-readable plan or a GitHub-autopilot spec: capability-aware frontier dispatch, isolated ticket PRs, conductor review gates, and verified integration.
- **[crew-dispatch](./skills/agent-operations/crew-dispatch/SKILL.md)** — Crew-first task dispatch with a durable `crew/<id>/` record, plus detached completion supervision: the crew reports its terminal status and wakes its supervisor after the launching turn ends (T3/Codex runtime reference included).
- **[source-to-system](./skills/agent-operations/source-to-system/SKILL.md)** — Turn external material into one evidence-backed, owned system improvement or an explicit no-change decision.
- **[grok-deep-research](./skills/agent-operations/grok-deep-research/SKILL.md)** — Run isolated, bounded Grok research with native or Firecrawl search and produce a stable cited report plus an iteration ledger.

### Software Development

- **[mobile-monorepo-ios](./skills/software-development/mobile-monorepo-ios/SKILL.md)** — Build, debug, and release Expo/React Native, native iOS, native Android, or bounded hybrid mobile work through explicit architecture, release-system, device, and distribution proof contracts.
- **[design-system-keeper](./skills/software-development/design-system-keeper/SKILL.md)** — Extract, encode, and enforce a repo's real design system as an agent-readable canon (v0 Design Systems 2.0 shape): sourced rules, a primitive index, verify-against-source builds, and a drift backlog instead of memory-built lookalikes.
- **[cursor-subagent](./skills/software-development/cursor-subagent/SKILL.md)** — Cursor sidecar delegation for explicit Cursor/Grok exploration, review, or isolated implementation.
- **[using-git-worktrees](./skills/software-development/using-git-worktrees/SKILL.md)** — Storage-aware development lifecycle: source-only task workspaces, bounded hydration, reusable local-main runtimes, isolated local state, automatic dehydrate, and reviewed retirement.
- **[work-tracking](./skills/software-development/work-tracking/SKILL.md)** — Decide where multi-step work should live: repo markdown, GitHub Issues, Linear, memory, or a mix. When to promote tasks to issues and how future agents find current state.
- **[sync-github-fork](./skills/software-development/sync-github-fork/SKILL.md)** — Confirm a GitHub fork's parent, measure divergence, and integrate upstream changes into its published default branch without rewriting fork history.

### Productivity

- **[product-feedback-report](./skills/productivity/product-feedback-report/SKILL.md)** — Create resumable founder-led feedback reports for web and mobile products, with conversational capture, screenshot/video evidence, automatic prioritization, and an always-current PDF.
- **[visual-plan](./skills/productivity/visual-plan/SKILL.md)** — Turn ordinary text plans into rich interactive visual plans with diagrams, file maps, annotated code, open questions, and UI/prototype review when useful. Agent-Native visual planning, portable across hosted, self-hosted, and local-files modes.

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
