---
name: grok-deep-research
description: Use when the user wants iterative web research, asks Grok to investigate a topic deeply, or requests a bounded research loop. Runs Grok Build CLI in an isolated runtime, defaults to native web search, optionally enables only Firecrawl MCP, and produces a stable cited report plus an iteration ledger.
version: 2.0.0
mutating: true
writes_to: ["requested output directory or ./AGENT-DESK/research/<run-id>/"]
---

# Grok Deep Research

Run a bounded, iterative research loop with native xAI **Grok Build CLI** and a self-contained research brief.

## Contract

- The research runtime is isolated from ambient instructions, skills, plugins, hooks, memories, files, MCP servers, and unrelated environment variables. It receives the brief, selected provider, and only the minimum auth/network runtime environment.
- Native Grok web search/fetch is the default. Firecrawl is opt-in and is the only MCP exposed in that mode.
- Prefer owner-controlled primary sources. Use secondary sources for discovery, then trace material claims to the organisation that owns the fact.
- Cite material claims inline. Distinguish observed facts, inference, disagreement, uncertainty, web-researchable gaps, and external gaps.
- A finite iteration cap always applies: 6 by default. `done` requires zero web-researchable gaps; otherwise the result is `capped`.
- Deliver `report.md`, `iterations.jsonl`, and `run.json` only after wrapper validation succeeds.

## Preamble

```bash
command -v grok >/dev/null 2>&1 && GROK=grok || GROK="$HOME/.grok/bin/grok"
$GROK --version || echo "GROK: missing"
```

`GROK: missing` → stop. Load `grok-cli-runtime` for auth diagnosis; a models listing is not a real chat probe.

## Run

Write one self-contained brief containing all domain context, scope, geography, dates, comparison criteria, and requested decisions. Do not rely on workspace memories or ambient instructions.

From this skill directory:

```bash
python3 scripts/grok_deep_research.py \
  --query-file "<absolute path to research brief.md>" \
  --output-dir "<absolute output directory>"
```

Use `--query "<research brief>"` for short briefs. Exactly one input is required.

Optional controls:

```bash
python3 scripts/grok_deep_research.py \
  --query "<research brief>" \
  --search-provider firecrawl \
  --exhaustive \
  --max-iterations 10 \
  --max-turns 20 \
  --output-dir "<absolute output directory>"
```

Provider choices are `native` (default) and `firecrawl`. Firecrawl uses its remote MCP transport in the isolated home, authenticated from `FIRECRAWL_API_KEY` or the existing `firecrawl` entry in `~/.claude.json`; otherwise it uses Firecrawl's keyless remote endpoint. No other MCP is copied. Omit `--exhaustive` unless the requested report may exceed the default 2,500-word body ceiling.

## Workflow

1. Create the self-contained brief. Choose the smallest reasonable cap: 3 for focused research, 6 by default, 10–15 for broad comparisons.
2. Run the wrapper. It preflights isolation, preserves one Grok session across iterations, and audits premature `done` claims.
3. Read `run.json`. Require `isolatedRuntime: true`, the requested `searchProvider`, recorded provider calls, and `status: done|capped`.
4. Read `report.md`. The wrapper enforces one H1 followed by `Executive answer`, `Findings`, `Conflicts and limitations`, `Open gaps`, and final `Sources` H2 sections.
5. If capped, report the material open gaps and offer to rerun with a higher cap instead of silently doing so.

## Output

Reply with:

```text
Status: done | capped
Iterations: <used>/<cap>
Provider: native | firecrawl
Report: <absolute path>/report.md
Ledger: <absolute path>/iterations.jsonl
Open gaps: <none or short list>
```

## Failure modes

- **Tool leakage:** never weaken the explicit non-research tool removal or reuse the caller's home/workspace; the wrapper audits actual tool calls before writing the report.
- **Citation theatre:** a Sources list does not replace inline claim citations.
- **Premature completion:** `done` with web-researchable gaps forces another audit pass.
- **Provider fiction:** provider use is verified from Grok's session trace and recorded in `run.json`.
- **Fresh sessions inside one run:** create once with `-s`; continue with `-r` so later passes retain evidence. The isolated session is deleted after publication.
