#!/usr/bin/env python3
"""Run isolated, bounded deep research with Grok Build CLI."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

REQUIRED_HEADINGS = (
    "Executive answer",
    "Findings",
    "Conflicts and limitations",
    "Open gaps",
    "Sources",
)
NON_RESEARCH_TOOLS = (
    "run_terminal_cmd",
    "read_file",
    "grep",
    "search_replace",
    "list_dir",
    "todo_write",
    "task",
    "kill_task",
    "get_task_output",
    "memory_search",
    "memory_get",
    "lsp",
    "write",
    "write_file",
    "edit_file",
    "apply_patch",
)
COMPAT_SURFACES = ("SKILLS", "RULES", "AGENTS", "MCPS", "HOOKS")
PASSTHROUGH_ENV = (
    "PATH",
    "TMPDIR",
    "TMP",
    "TEMP",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "ALL_PROXY",
    "NO_PROXY",
    "XAI_API_KEY",
)
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
            "webResearchableGaps": {"type": "array", "items": {"type": "string"}},
            "externalGaps": {"type": "array", "items": {"type": "string"}},
            "nextQuestion": {"type": "string"},
        },
        "required": [
            "status",
            "summary",
            "newFindings",
            "sources",
            "webResearchableGaps",
            "externalGaps",
            "nextQuestion",
        ],
    },
    separators=(",", ":"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    query_group = parser.add_mutually_exclusive_group(required=True)
    query_group.add_argument("--query", help="Self-contained research brief")
    query_group.add_argument("--query-file", help="UTF-8 file containing the research brief")
    parser.add_argument("--output-dir", help="Directory for report and evidence")
    parser.add_argument("--max-iterations", type=int, default=6)
    parser.add_argument("--max-turns", type=int, default=20)
    parser.add_argument("--model", default="grok-4.6")
    parser.add_argument("--effort", choices=("low", "medium", "high"), default="high")
    parser.add_argument("--search-provider", choices=("native", "firecrawl"), default="native")
    parser.add_argument("--exhaustive", action="store_true", help="Allow a report body longer than 2,500 words")
    args = parser.parse_args()
    if not 1 <= args.max_iterations <= 50:
        parser.error("--max-iterations must be between 1 and 50")
    if not 1 <= args.max_turns <= 100:
        parser.error("--max-turns must be between 1 and 100")
    if args.query_file:
        args.query = Path(args.query_file).expanduser().read_text(encoding="utf-8").strip()
    if not args.query or not args.query.strip():
        parser.error("research brief is empty")
    args.query = args.query.strip()
    return args


def isolated_env(temp_home: Path, provider: str) -> dict[str, str]:
    env = {key: os.environ[key] for key in PASSTHROUGH_ENV if key in os.environ}
    env.update({"HOME": str(temp_home), "GROK_HOME": str(temp_home / ".grok")})
    for vendor in ("CURSOR", "CLAUDE"):
        for surface in COMPAT_SURFACES:
            env[f"GROK_{vendor}_{surface}_ENABLED"] = "false"
    if provider == "firecrawl":
        env["GROK_CLAUDE_MCPS_ENABLED"] = "true"
    return env


def copy_auth(real_grok_home: Path, isolated_grok_home: Path) -> None:
    auth = real_grok_home / "auth.json"
    if not auth.is_file():
        if os.environ.get("XAI_API_KEY"):
            isolated_grok_home.mkdir(parents=True)
            return
        raise RuntimeError(f"Grok authentication is missing: {auth}; XAI_API_KEY is also unset")
    isolated_grok_home.mkdir(parents=True)
    target = isolated_grok_home / "auth.json"
    shutil.copyfile(auth, target)
    target.chmod(0o600)


def configure_firecrawl(temp_home: Path) -> str:
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    source_config = Path.home() / ".claude.json"
    existing = None
    if source_config.is_file():
        try:
            existing = json.loads(source_config.read_text(encoding="utf-8")).get("mcpServers", {}).get("firecrawl")
        except (json.JSONDecodeError, OSError):
            existing = None
    if not api_key and existing:
        api_key = existing.get("env", {}).get("FIRECRAWL_API_KEY")
    if api_key:
        server = {
            "url": "https://mcp.firecrawl.dev/v2/mcp",
            "headers": {"Authorization": f"Bearer {api_key}"},
        }
        source = "environment" if os.environ.get("FIRECRAWL_API_KEY") else "existing-config"
    elif existing and existing.get("url"):
        server = {key: existing[key] for key in ("url", "headers") if key in existing}
        source = "existing-config"
    else:
        server = {"url": "https://mcp.firecrawl.dev/v2/mcp"}
        source = "remote-keyless"
    config = temp_home / ".claude.json"
    config.write_text(json.dumps({"mcpServers": {"firecrawl": server}}), encoding="utf-8")
    config.chmod(0o600)
    return source


def run_command(command: list[str], env: dict[str, str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, text=True, capture_output=True, env=env, cwd=cwd)


def inspect_isolation(grok: str, env: dict[str, str], cwd: Path, provider: str) -> None:
    completed = run_command([grok, "inspect", "--json"], env, cwd)
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or "Grok isolation inspection failed")
    try:
        state = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Grok isolation inspection returned invalid JSON: {exc}") from exc
    populated = [key for key in ("projectInstructions", "hooks", "skills", "plugins") if state.get(key)]
    mcp_names = sorted(server.get("name") for server in state.get("mcpServers", []))
    expected_mcps = ["firecrawl"] if provider == "firecrawl" else []
    if populated or mcp_names != expected_mcps:
        raise RuntimeError(
            f"isolated runtime leaked configuration: populated={populated}, mcpServers={mcp_names}"
        )


def run_grok(
    grok: str,
    prompt: str,
    args: argparse.Namespace,
    session_id: str,
    resume: bool,
    schema: bool,
    env: dict[str, str],
    cwd: Path,
    research_tools: bool,
) -> dict:
    disallowed_tools = list(NON_RESEARCH_TOOLS)
    if not research_tools:
        disallowed_tools += ["web_search", "web_fetch", "search_tool", "use_tool"]
    elif args.search_provider == "native":
        disallowed_tools += ["search_tool", "use_tool"]
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
        "--no-memory",
        "--verbatim",
        "--always-approve",
        "--disallowed-tools",
        ",".join(disallowed_tools),
        "--output-format",
        "json",
    ]
    command += ["-r", session_id] if resume else ["-s", session_id]
    if schema:
        command += ["--json-schema", SCHEMA]
    completed = run_command(command, env, cwd)
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or "Grok failed")
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Grok returned invalid JSON: {exc}") from exc
    if result.get("stopReason") != "EndTurn":
        raise RuntimeError(f"Grok stopReason was {result.get('stopReason')!r}")
    return result


def valid_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def validate_state(state: object) -> dict:
    if not isinstance(state, dict):
        raise RuntimeError("Grok response lacked structuredOutput")
    if not isinstance(state.get("summary"), str) or not state["summary"].strip():
        raise RuntimeError("research iteration lacked a summary")
    for source in state.get("sources", []):
        if not valid_url(source.get("url", "")):
            raise RuntimeError(f"research iteration returned invalid source URL: {source.get('url')!r}")
    if state.get("status") == "continue" and not state.get("nextQuestion", "").strip():
        raise RuntimeError("continuing research iteration lacked nextQuestion")
    for key in ("webResearchableGaps", "externalGaps"):
        state[key] = [re.sub(r"\s+", " ", gap).strip() for gap in state[key] if gap.strip()]
    if state.get("status") == "continue" and not state["webResearchableGaps"]:
        raise RuntimeError("continuing research iteration lacked a web-researchable gap")
    state["openGaps"] = [*state["webResearchableGaps"], *state["externalGaps"]]
    return state


def report_errors(report: str, exhaustive: bool = False) -> list[str]:
    lines = report.strip().splitlines()
    errors = []
    if not lines or not re.fullmatch(r"# .+", lines[0]):
        errors.append("the first line must be one H1 title")
    if sum(line.startswith("# ") for line in lines) != 1:
        errors.append("the report must contain exactly one H1 title")
    headings = [line[3:].strip() for line in lines if line.startswith("## ")]
    if headings != list(REQUIRED_HEADINGS):
        errors.append("H2 headings must exactly match the required sections in order")
    sections = {}
    current = None
    for line in lines:
        if line.startswith("## "):
            current = line[3:].strip()
            sections[current] = []
        elif current:
            sections[current].append(line)
    executive = "\n".join(sections.get("Executive answer", []))
    findings = "\n".join(sections.get("Findings", []))
    sources = "\n".join(sections.get("Sources", []))
    if len(re.findall(r"\b[\w'-]+\b", executive)) > 250:
        errors.append("Executive answer exceeds 250 words")
    before_sources = report.split("## Sources", 1)[0]
    if not exhaustive and len(re.findall(r"\b[\w'-]+\b", before_sources)) > 2500:
        errors.append("report body exceeds 2,500 words")
    if not re.search(r"\[[^]]+\]\(https?://[^)]+\)", findings):
        errors.append("Findings lacks an inline source link")
    source_urls = re.findall(r"https?://[^\s)>]+", sources)
    if not source_urls:
        errors.append("Sources must contain at least one URL")
    if len(source_urls) != len(set(source_urls)):
        errors.append("Sources contains duplicate URLs")
    return errors


def replace_open_gaps(report: str, web_gaps: list[str], external_gaps: list[str]) -> str:
    before, remainder = report.split("## Open gaps", 1)
    _, sources = remainder.split("## Sources", 1)
    gap_lines = ["## Open gaps", ""]
    if not web_gaps and not external_gaps:
        gap_lines.append("None.")
    if web_gaps:
        gap_lines += ["### Web-researchable gaps", "", *[f"- {gap}" for gap in web_gaps]]
    if external_gaps:
        gap_lines += ["", "### External gaps", "", *[f"- {gap}" for gap in external_gaps]]
    return before.rstrip() + "\n\n" + "\n".join(gap_lines).rstrip() + "\n\n## Sources" + sources


def add_status_metadata(report: str, status: str, used: int, cap: int) -> str:
    lines = report.strip().splitlines()
    metadata = f"**Research status:** {status} · **Iterations:** {used}/{cap} · **Run date:** {datetime.now(timezone.utc).date()} UTC"
    if status == "capped":
        metadata += "\n\nMaterial research gaps remain; see Open gaps."
    return "\n".join([lines[0], "", metadata, *lines[1:]]).strip() + "\n"


def provider_usage(grok_home: Path) -> dict:
    counts = {
        "nativeWebSearchCalls": 0,
        "nativeWebFetchCalls": 0,
        "firecrawlCalls": 0,
        "firecrawlSuccessfulCalls": 0,
        "mcpTargets": [],
        "toolCallNames": [],
    }
    targets = set()
    call_names = set()
    firecrawl_calls = {}
    tool_results = {}
    for history in grok_home.rglob("chat_history.jsonl"):
        for line in history.read_text(encoding="utf-8").splitlines():
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") == "backend_tool_call":
                name = event.get("kind", {}).get("tool_type", "")
                call_names.add(name)
                if name == "web_search":
                    counts["nativeWebSearchCalls"] += 1
                elif name == "web_fetch":
                    counts["nativeWebFetchCalls"] += 1
            for call in event.get("tool_calls", []):
                name = call.get("name", "")
                call_names.add(name)
                if name != "use_tool":
                    continue
                arguments = call.get("arguments") or {}
                if isinstance(arguments, str):
                    try:
                        arguments = json.loads(arguments)
                    except json.JSONDecodeError:
                        arguments = {}
                target = arguments.get("tool_name", "")
                if target:
                    targets.add(target)
                if target.startswith("firecrawl__"):
                    counts["firecrawlCalls"] += 1
                    firecrawl_calls[call.get("id")] = target
            if event.get("type") == "tool_result":
                tool_results[event.get("tool_call_id")] = event.get("content")
    for call_id in firecrawl_calls:
        content = tool_results.get(call_id)
        try:
            result = json.loads(content) if isinstance(content, str) else content
        except json.JSONDecodeError:
            result = None
        successful = isinstance(result, dict) and result.get("success") is True
        if isinstance(content, str) and re.match(r'^\s*\{\s*"success"\s*:\s*true\b', content):
            successful = True
        if successful:
            counts["firecrawlSuccessfulCalls"] += 1
    counts["mcpTargets"] = sorted(targets)
    counts["toolCallNames"] = sorted(call_names)
    return counts


def verify_provider_usage(usage: dict, provider: str) -> None:
    allowed = {"web_search", "web_fetch", "update_goal"}
    if provider == "native":
        if not usage["nativeWebSearchCalls"] + usage["nativeWebFetchCalls"]:
            raise RuntimeError("native research completed without a recorded native web call")
        if usage["firecrawlCalls"] or usage["mcpTargets"]:
            raise RuntimeError("native research used an MCP tool")
    elif not usage["firecrawlSuccessfulCalls"]:
        raise RuntimeError("Firecrawl research completed without a successful recorded Firecrawl call")
    else:
        allowed.update({"search_tool", "use_tool"})
    if any(not target.startswith("firecrawl__") for target in usage["mcpTargets"]):
        raise RuntimeError(f"unexpected MCP target used: {usage['mcpTargets']}")
    unexpected = sorted(set(usage["toolCallNames"]) - allowed)
    if unexpected:
        raise RuntimeError(f"research used unexpected tools: {unexpected}")


def main() -> int:
    args = parse_args()
    real_home = Path.home()
    real_grok_home = Path(os.environ.get("GROK_HOME", real_home / ".grok")).expanduser()
    grok = shutil.which("grok") or str(real_grok_home / "bin/grok")
    if not Path(grok).exists():
        raise RuntimeError("Grok Build CLI is missing")

    started = datetime.now(timezone.utc)
    run_id = started.strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    output_dir = Path(args.output_dir).expanduser() if args.output_dir else Path.cwd() / "AGENT-DESK/research" / run_id
    if output_dir.exists():
        raise RuntimeError(f"refusing to overwrite existing output directory: {output_dir}")
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    staging = tempfile.TemporaryDirectory(prefix=f".{output_dir.name}-", dir=output_dir.parent)
    staging_dir = Path(staging.name)
    ledger_path = staging_dir / "iterations.jsonl"
    report_path = staging_dir / "report.md"
    run_path = staging_dir / "run.json"
    final_ledger_path = output_dir / "iterations.jsonl"
    final_report_path = output_dir / "report.md"

    session_id = str(uuid.uuid4())
    iterations = []
    forced_audits = 0
    status = "capped"
    provider_config_source = None

    with tempfile.TemporaryDirectory(prefix="grok-deep-research-") as temp:
        temp_home = Path(temp) / "home"
        workspace = Path(temp) / "workspace"
        workspace.mkdir(parents=True)
        copy_auth(real_grok_home, temp_home / ".grok")
        if args.search_provider == "firecrawl":
            provider_config_source = configure_firecrawl(temp_home)
        env = isolated_env(temp_home, args.search_provider)
        inspect_isolation(grok, env, workspace, args.search_provider)

        force_audit = False
        for number in range(1, args.max_iterations + 1):
            if number == 1:
                task = "Build the evidence base needed to answer the brief."
            elif force_audit:
                forced_audits += 1
                task = "Audit the claimed completion. Close every remaining web-researchable gap before declaring completion."
            else:
                task = "Close the single highest-value web-researchable gap from the prior pass."
            provider_instruction = (
                "Use Firecrawl for search or retrieval at least once; native web search/fetch may supplement it."
                if args.search_provider == "firecrawl"
                else "Use only native web search/fetch."
            )
            prompt = f"""Research brief:\n{args.query}\n\nIteration {number} of at most {args.max_iterations}. {task}
{provider_instruction}
Use owner-controlled primary sources first. Secondary sources are discovery aids only: trace substantive claims to the organisation that owns the fact. Cite every material finding with its exact source URL. Distinguish observed facts from inference, disagreements, and uncertainty. Do not repeat prior searches unless resolving a conflict.
Classify unresolved gaps as webResearchableGaps when more public-web research could close them, or externalGaps when they require user input, a private source, future event, or offline verification. Return status=done only when webResearchableGaps is empty. Otherwise return status=continue and name one highest-value nextQuestion."""
            result = run_grok(grok, prompt, args, session_id, number > 1, True, env, workspace, True)
            state = validate_state(result.get("structuredOutput"))
            entry = {"iteration": number, **state}
            iterations.append(entry)
            with ledger_path.open("a", encoding="utf-8") as ledger:
                ledger.write(json.dumps(entry, ensure_ascii=False) + "\n")
            force_audit = state["status"] == "done" and bool(state["webResearchableGaps"])
            if state["status"] == "done" and not state["webResearchableGaps"]:
                status = "done"
                break

        length_contract = (
            "The brief explicitly requests exhaustive treatment, so the report body may exceed 2,500 words."
            if args.exhaustive
            else "Target 1,200-2,000 words and do not exceed 2,500 words excluding Sources."
        )
        final_prompt = f"""Write the final standalone Markdown report answering this research brief:\n{args.query}

Use only evidence accumulated in this session. Do not mention tools, prompts, iterations, status metadata, or output files. Cite every material claim inline with a Markdown link; the Sources section is a deduplicated audit index, not a substitute for inline citations. Separate observed fact, inference, disagreement, and uncertainty.

Required contract:
# <question-oriented title>
## Executive answer
## Findings
## Conflicts and limitations
## Open gaps
## Sources

Keep those H2 sections in that order and make Sources the final H2. Findings may use flexible H3 subheadings. The Executive answer must be at most 250 words. {length_contract} Add tables, adjacent options, or up to five recommended actions only when useful. Avoid process narration, repeated conclusions, and invented references."""
        final = run_grok(grok, final_prompt, args, session_id, True, False, env, workspace, False)
        report = final.get("text")
        if not isinstance(report, str) or not report.strip():
            raise RuntimeError("Grok response lacked report text")
        errors = report_errors(report, args.exhaustive)
        if errors:
            repair_prompt = "Repair the report to satisfy the exact Markdown contract. Do not add new facts. Problems: " + "; ".join(errors)
            repaired = run_grok(grok, repair_prompt, args, session_id, True, False, env, workspace, False)
            report = repaired.get("text", "")
            errors = report_errors(report, args.exhaustive)
        if errors:
            raise RuntimeError("report contract validation failed after repair: " + "; ".join(errors))

        last = iterations[-1]
        report = replace_open_gaps(report, last["webResearchableGaps"], last["externalGaps"])
        errors = report_errors(report, args.exhaustive)
        if errors:
            raise RuntimeError("canonical gap rendering broke the report contract: " + "; ".join(errors))

        usage = provider_usage(temp_home / ".grok")
        verify_provider_usage(usage, args.search_provider)
        unexpected_files = [path for path in workspace.rglob("*") if path.is_file()]
        if unexpected_files:
            raise RuntimeError("isolated research wrote workspace files: " + ", ".join(map(str, unexpected_files)))

    final_report = add_status_metadata(report, status, len(iterations), args.max_iterations)
    report_path.write_text(final_report, encoding="utf-8")
    completed = datetime.now(timezone.utc)
    manifest = {
        "runId": run_id,
        "sessionId": session_id,
        "query": args.query,
        "model": args.model,
        "effort": args.effort,
        "searchProvider": args.search_provider,
        "providerConfigurationSource": provider_config_source,
        "providerUsage": usage,
        "isolatedRuntime": True,
        "reportContract": "2.0",
        "status": status,
        "iterationsUsed": len(iterations),
        "forcedAuditIterations": forced_audits,
        "maxIterations": args.max_iterations,
        "maxTurnsPerIteration": args.max_turns,
        "webResearchableGaps": last["webResearchableGaps"],
        "externalGaps": last["externalGaps"],
        "openGaps": last["openGaps"],
        "reportWordCount": len(re.findall(r"\b[\w'-]+\b", final_report)),
        "startedAt": started.isoformat(),
        "completedAt": completed.isoformat(),
        "durationSeconds": round((completed - started).total_seconds(), 3),
        "report": str(final_report_path.resolve()),
        "ledger": str(final_ledger_path.resolve()),
    }
    run_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    staging_dir.rename(output_dir)
    staging.cleanup()
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
