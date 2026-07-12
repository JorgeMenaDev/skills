#!/usr/bin/env python3
"""Bounded deep-research loop over a resumable Grok Build CLI session."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = json.dumps(
    {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "status": {"type": "string", "enum": ["continue", "done"]},
            "summary": {"type": "string"},
            "newFindings": {"type": "array", "items": {"type": "string"}},
            "sources": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "title": {"type": "string"},
                        "url": {"type": "string"},
                        "supports": {"type": "string"},
                    },
                    "required": ["title", "url", "supports"],
                },
            },
            "openGaps": {"type": "array", "items": {"type": "string"}},
            "nextQuestion": {"type": "string"},
        },
        "required": [
            "status",
            "summary",
            "newFindings",
            "sources",
            "openGaps",
            "nextQuestion",
        ],
    },
    separators=(",", ":"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    query_group = parser.add_mutually_exclusive_group(required=True)
    query_group.add_argument("--query", help="Research question")
    query_group.add_argument("--query-file", help="UTF-8 file containing the research question")
    parser.add_argument("--output-dir", help="Directory for report and evidence")
    parser.add_argument("--max-iterations", type=int, default=6)
    parser.add_argument("--max-turns", type=int, default=20)
    parser.add_argument("--model", default="grok-4.5")
    parser.add_argument("--effort", choices=("low", "medium", "high"), default="high")
    args = parser.parse_args()
    if not 1 <= args.max_iterations <= 50:
        parser.error("--max-iterations must be between 1 and 50")
    if not 1 <= args.max_turns <= 100:
        parser.error("--max-turns must be between 1 and 100")
    if args.query_file:
        args.query = Path(args.query_file).expanduser().read_text(encoding="utf-8").strip()
        if not args.query:
            parser.error("--query-file is empty")
    return args


def run_grok(grok: str, prompt: str, args: argparse.Namespace, session_id: str, resume: bool, schema: bool) -> dict:
    command = [
        grok,
        "-p",
        prompt,
        "-m",
        args.model,
        "--effort",
        args.effort,
        "--max-turns",
        str(args.max_turns),
        "--no-subagents",
        "--always-approve",
        "--deny",
        "Bash(*)",
        "--deny",
        "write_file",
        "--deny",
        "edit_file",
        "--deny",
        "apply_patch",
        "--output-format",
        "json",
    ]
    command += ["-r", session_id] if resume else ["-s", session_id]
    if schema:
        command += ["--json-schema", SCHEMA]
    completed = subprocess.run(command, text=True, capture_output=True)
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or "Grok failed")
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Grok returned invalid JSON: {exc}") from exc
    if result.get("stopReason") != "EndTurn":
        raise RuntimeError(f"Grok stopReason was {result.get('stopReason')!r}")
    return result


def main() -> int:
    args = parse_args()
    grok = shutil.which("grok") or str(Path.home() / ".grok/bin/grok")
    if not Path(grok).exists():
        raise RuntimeError("Grok Build CLI is missing")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    output_dir = Path(args.output_dir).expanduser() if args.output_dir else Path.cwd() / "AGENT-DESK/research" / run_id
    output_dir.mkdir(parents=True, exist_ok=True)
    ledger_path = output_dir / "iterations.jsonl"
    report_path = output_dir / "report.md"
    run_path = output_dir / "run.json"
    existing = [path for path in (ledger_path, report_path, run_path) if path.exists()]
    if existing:
        raise RuntimeError("refusing to overwrite existing output: " + ", ".join(map(str, existing)))
    session_id = str(uuid.uuid4())

    iterations: list[dict] = []
    status = "capped"
    for number in range(1, args.max_iterations + 1):
        if number == 1:
            prompt = f"""Research this question deeply using current web search and web fetch: {args.query}
This is iteration 1 of at most {args.max_iterations}. Find authoritative primary sources first. Attach every finding to a source URL. Identify unresolved evidence gaps. Return status=done only when the question is adequately answered with source diversity and material uncertainties named; otherwise choose the single highest-value next question."""
        else:
            prompt = f"""Continue researching the original question. This is iteration {number} of at most {args.max_iterations}. Use web search/fetch to close the highest-value open gap from the prior pass. Do not repeat prior searches unless verifying a conflict. Add only new evidence, preserve source URLs, and return status=done only when the original question is adequately answered. If more work remains, choose one highest-value next question."""
        result = run_grok(grok, prompt, args, session_id, resume=number > 1, schema=True)
        state = result.get("structuredOutput")
        if not isinstance(state, dict):
            raise RuntimeError("Grok response lacked structuredOutput")
        entry = {"iteration": number, **state}
        iterations.append(entry)
        with ledger_path.open("a", encoding="utf-8") as ledger:
            ledger.write(json.dumps(entry, ensure_ascii=False) + "\n")
        if state["status"] == "done":
            status = "done"
            break

    final_prompt = f"""Synthesize the completed research for the original question: {args.query}
The loop status is {status} after {len(iterations)} of {args.max_iterations} allowed iterations. Produce a standalone Markdown report. Link source URLs inline to the exact claims they support. Separate observed facts, inference, disagreements, and uncertainty. Include sections: Executive answer, Findings, Conflicts and limitations, Open gaps, and Sources. If status is capped, state that clearly and do not imply completeness."""
    final = run_grok(grok, final_prompt, args, session_id, resume=True, schema=False)
    report = final.get("text")
    if not isinstance(report, str) or not report.strip():
        raise RuntimeError("Grok response lacked report text")
    report_path.write_text(report.strip() + "\n", encoding="utf-8")

    last_gaps = iterations[-1].get("openGaps", []) if iterations else []
    manifest = {
        "runId": run_id,
        "sessionId": session_id,
        "query": args.query,
        "model": args.model,
        "effort": args.effort,
        "status": status,
        "iterationsUsed": len(iterations),
        "maxIterations": args.max_iterations,
        "maxTurnsPerIteration": args.max_turns,
        "openGaps": last_gaps,
        "report": str(report_path.resolve()),
        "ledger": str(ledger_path.resolve()),
    }
    run_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
