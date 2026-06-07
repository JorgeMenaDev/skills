# Skills for Real Growth Work

[![skills.sh](https://skills.sh/b/JorgeMenaDev/skills)](https://skills.sh/JorgeMenaDev/skills)

Agent skills by Jorge Mena for SEO, growth, product marketing, and revenue work that needs evidence, execution, verification, and memory.

Most AI growth work fails in boring ways. The agent gives generic advice. It optimizes pages without understanding the business. It creates SEO plans that never become tickets, code, content, or live proof. Then the next session forgets what happened.

These skills are designed to push against that. They are small, portable, and built around real operating loops: understand the business, inspect reality, pick one high-leverage action, verify it, and leave the next agent a clean handoff.

## Quickstart

Install the flagship skill:

```bash
npx skills@latest add JorgeMenaDev/skills --skill seo-growth-workspace
```

Install for Codex explicitly:

```bash
npx skills@latest add JorgeMenaDev/skills --skill seo-growth-workspace -a codex
```

Or browse the repo interactively:

```bash
npx skills@latest add JorgeMenaDev/skills
```

## Start Here

### `seo-growth-workspace`

A durable SEO operating workspace for agents. It bootstraps `.seo/`, captures business context, audits live/code/admin evidence, creates a prioritized backlog, implements one high-leverage action, verifies the live result, and logs the handoff.

Use it when SEO work needs to become real work: technical fixes, Search Console opportunities, schema, local SEO, content operations, internal links, backlinks, pSEO planning, conversion paths, or monthly reporting.

## Why These Skills Exist

### 1. Generic Advice Is Cheap

The internet already has enough SEO checklists. The useful work is deciding what matters for this business, this repo, this market, and this moment.

`seo-growth-workspace` forces the agent to gather context, inspect evidence, and turn findings into a backlog instead of stopping at recommendations.

### 2. Growth Work Needs Memory

SEO compounds only when the next pass can trust the previous one. Without durable notes, agents re-audit the same surfaces, forget blockers, and repeat work that already failed.

The `.seo/` workspace keeps context, backlog, audit evidence, reports, backlinks, decisions, and handoffs in predictable files.

### 3. Plans Should Become Proof

A content plan is not done because the calendar looks nice. A technical fix is not done because code changed. A backlink is not live because it was submitted.

The operating loop pushes every action toward verification: live URLs, rendered metadata, sitemap state, Search Console evidence, analytics proof, UI checks, or public links.

### 4. One Focus Beats Ten Half-Steps

Growth agents love opening five lanes at once. This repo prefers one current focus ticket, clear done criteria, and a handoff that makes the next move obvious.

## Reference

### Growth

- **[seo-growth-workspace](./skills/growth/seo-growth-workspace/SKILL.md)** — Durable SEO operating workspace for product and local-business sites: context, audit, backlog, implementation, verification, reports, and handoffs.

### Software Development

- **[work-tracking](./skills/software-development/work-tracking/SKILL.md)** — Decide where multi-step work should live: repo markdown, GitHub Issues, Linear, memory, or a mix.

## Layout

```text
skills/<category>/<skill-name>/SKILL.md
```

Each skill follows the Agent Skills format: a `SKILL.md` file with YAML frontmatter, optional `references/`, optional `templates/`, optional `scripts/`, and no project-specific secrets.
