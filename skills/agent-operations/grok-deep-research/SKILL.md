---
name: grok-deep-research
description: Use when the user wants iterative web research, asks Grok to investigate a topic deeply, or requests a bounded research loop. Runs Grok Build CLI with grok-4.5, preserves one resumable session, and produces a cited report plus an iteration ledger.
version: 1.0.1
mutating: true
writes_to: ["requested output directory or ./AGENT-DESK/research/<run-id>/", "~/.grok/sessions"]
---

# Grok Deep Research

Run a recursive research loop with native xAI **Grok Build CLI**, `grok-4.5`, and web search. Each pass resumes one session, closes a named evidence gap, and decides whether another pass is needed.

## Contract

- Research is read-only: web search/fetch only; no repository edits, shell work, external sends, or production actions.
- Preserve source URLs and distinguish sourced facts, inference, and uncertainty.
- The iteration cap is optional to the caller and defaults to **6**. A finite cap is always enforced; raise it explicitly rather than allowing an unbounded cost loop.
- Stop early when Grok returns `done`; hitting the cap produces a report marked `capped`, not a fabricated completion.
- Deliver `report.md`, `iterations.jsonl`, and `run.json` only after verifying all are non-empty.

## Preamble

```bash
command -v grok >/dev/null 2>&1 && GROK=grok || GROK="$HOME/.grok/bin/grok"
$GROK --version || echo "GROK: missing"
```

`GROK: missing` → stop. Load `grok-cli-runtime` for auth diagnosis; a models listing is not a real chat probe.

## Run

From this skill directory:

```bash
python3 scripts/grok_deep_research.py \
  --query-file "<absolute path to research brief.md>" \
  --output-dir "<absolute output directory>"
```

Use `--query "<research question>"` for short prompts. Exactly one of `--query` or `--query-file` is required.

Optional controls:

```bash
# Explicit loop cap and per-call agent-turn cap
python3 scripts/grok_deep_research.py \
  --query "<research question>" \
  --max-iterations 10 \
  --max-turns 20 \
  --output-dir "<absolute output directory>"
```

The wrapper uses `grok-4.5` at high effort, creates one UUID session, resumes it across passes, disables subagents, and asks each pass for schema-constrained state. It then resumes once more to synthesize the report from the accumulated session evidence.

## Workflow

1. Turn the request into one research question. Record any scope, date, geography, or comparison constraints in that question.
2. Choose the smallest reasonable cap: 3 for a focused fact pattern, 6 by default, 10–15 for broad comparative work.
3. Run the wrapper. Do not treat process exit alone as success.
4. Read `run.json`; require `status` to be `done` or `capped`, every iteration to contain a summary, and every cited source to retain a URL.
5. Read the beginning and end of `report.md`. If capped with material open gaps, state them and offer a higher-cap continuation rather than silently rerunning.

## Output

Reply with:

```text
Status: done | capped
Iterations: <used>/<cap>
Report: <absolute path>/report.md
Ledger: <absolute path>/iterations.jsonl
Open gaps: <none or short list>
```

Attach `report.md` when the channel supports files.

## Failure modes

- **Infinite research:** the finite default exists to prevent runaway cost. Increase the cap explicitly.
- **Fresh session per pass:** destroys accumulated context. The wrapper must create once with `-s` and continue with `-r`.
- **Exit-0 trust:** Grok can exit 0 without a valid research result. Parse `.stopReason` and `.structuredOutput`.
- **Citation theatre:** a URL list without claim linkage is not a cited report. Require inline links attached to the claims they support.
- **Premature synthesis:** generating the report before the loop returns `done` or reaches its cap hides unresolved gaps.
