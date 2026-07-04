# AFK pipeline (sandcastle) — this repo's install

Four-phase label-driven pipeline: **implement → verify (real browser) → draft PR
→ best-effort visual recap**. Trigger: add `agent:implement` (cloud) or
`agent:implement-local` (self-hosted Docker) to a GitHub issue carrying an Agent
Brief. Protocol + brief/flag contracts: the `afk-pipeline` skill
(JorgeMenaDev/skills). Routing: the consumer's `.agents/afk-pipeline/REGISTRY.md`.

## Generated vs owned

Every file here except `config/` and this README is GENERATED from the skill's
templates (see file headers). Repo-specific truth lives in `config/pipeline.json`
+ the `config/*.md` fragments; edit those and re-run:

```
node <skills-checkout>/skills/software-development/afk-pipeline/scripts/generate.mjs --repo .
```

## Go-live checklist (fill in per repo)

- [ ] Labels: `agent:implement`, `agent:implement-local`, `agent:in-progress`, `agent:blocked`
- [ ] Secrets: `CLAUDE_CODE_OAUTH_TOKEN`, `AGENT_PAT`, `PLAN_RECAP_TOKEN`, `PLAN_RECAP_APP_URL` + this repo's verify secrets (see `config/pipeline.json`)
- [ ] Local lane: self-hosted runner registered; Docker image builds (`docker build -t <imageName> .sandcastle/`)
- [ ] Registry row added in the consumer's `.agents/afk-pipeline/REGISTRY.md`
