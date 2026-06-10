#!/usr/bin/env python3
"""Read-only Shiploop train status board.

Reads GitHub phase issues plus an optional task-state SQLite database and
prints a compact read-only status board. The script is intentionally generic:
all repo, milestone, label, and database paths are CLI arguments.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import textwrap
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Iterable

METADATA_BLOCK_RE = re.compile(r"^##\s+(?:Shiploop|Autopilot)\s*$", re.IGNORECASE | re.MULTILINE)
KEY_VALUE_RE = re.compile(r"^\s*([A-Za-z][A-Za-z0-9 _/-]*):\s*(.*?)\s*$")
TASK_RE = re.compile(r"\b(?:task[-_][A-Za-z0-9_-]+|t_[A-Za-z0-9]+)\b")
ISSUE_RE = re.compile(r"#(\d+)")
PR_RE = re.compile(r"(?:PR|Pull request)\s*:?\s*#?(\d+)", re.IGNORECASE)


@dataclass
class TaskState:
    id: str
    status: str | None = None
    assignee: str | None = None
    title: str | None = None
    current_run_id: int | None = None
    worker_pid: int | None = None
    last_heartbeat_at: int | None = None
    completed_at: int | None = None
    result: str | None = None
    run_status: str | None = None
    run_outcome: str | None = None
    run_started_at: int | None = None
    run_ended_at: int | None = None
    run_summary: str | None = None


@dataclass
class BoardRow:
    issue: int
    title: str
    url: str
    issue_state: str
    labels: list[str]
    phase: str | None
    task_id: str | None
    target_branch: str | None
    assignee: str | None
    pr: str | None
    board_status: str
    next_action: str
    risk: str
    task: TaskState | None
    drift: list[str]


def run_gh(args: list[str]) -> Any:
    if not shutil.which("gh"):
        raise SystemExit("Missing dependency: gh CLI is required for GitHub issue discovery.")
    cmd = ["gh", *args]
    proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        raise SystemExit(f"gh command failed: {' '.join(cmd)}\n{proc.stderr.strip()}")
    out = proc.stdout.strip()
    return json.loads(out) if out else None


def parse_metadata_block(body: str | None) -> dict[str, str]:
    if not body:
        return {}
    match = METADATA_BLOCK_RE.search(body)
    if not match:
        return {}
    lines = body[match.end() :].splitlines()
    data: dict[str, str] = {}
    for line in lines:
        if line.startswith("## "):
            break
        kv = KEY_VALUE_RE.match(line)
        if kv:
            key = kv.group(1).strip().lower().replace(" ", "_").replace("/", "_")
            data[key] = kv.group(2).strip()
    return data


def first_task_id(*texts: str | None) -> str | None:
    for text in texts:
        if not text:
            continue
        match = TASK_RE.search(text)
        if match:
            return match.group(1)
    return None


def first_pr_ref(*texts: str | None) -> str | None:
    for text in texts:
        if not text:
            continue
        match = PR_RE.search(text)
        if match:
            return f"#{match.group(1)}"
    return None


def latest_comment_pr(repo: str, number: int) -> str | None:
    """Fallback: workers often record PR numbers in timeline comments, not the body block."""
    try:
        data = run_gh(["issue", "view", str(number), "--repo", repo, "--json", "comments"])
    except SystemExit:
        return None
    comments = (data or {}).get("comments") or []
    for comment in reversed(comments):
        ref = first_pr_ref(comment.get("body"))
        if ref:
            return ref
    return None


def connect_state_db(db_path: str | None) -> sqlite3.Connection | None:
    if not db_path:
        return None
    expanded = Path(db_path).expanduser()
    if not expanded.exists():
        return None
    conn = sqlite3.connect(str(expanded))
    conn.row_factory = sqlite3.Row
    return conn


def table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    try:
        return {row[1] for row in conn.execute(f"pragma table_info({table})")}
    except sqlite3.Error:
        return set()


def load_task(conn: sqlite3.Connection | None, task_id: str | None) -> TaskState | None:
    if not conn or not task_id:
        return None
    try:
        row = conn.execute("select * from tasks where id = ?", (task_id,)).fetchone()
    except sqlite3.Error:
        return None
    if not row:
        return None
    task_cols = set(row.keys())
    task = TaskState(
        id=task_id,
        status=row["status"] if "status" in task_cols else None,
        assignee=row["assignee"] if "assignee" in task_cols else None,
        title=row["title"] if "title" in task_cols else None,
        current_run_id=row["current_run_id"] if "current_run_id" in task_cols else None,
        worker_pid=row["worker_pid"] if "worker_pid" in task_cols else None,
        last_heartbeat_at=row["last_heartbeat_at"] if "last_heartbeat_at" in task_cols else None,
        completed_at=row["completed_at"] if "completed_at" in task_cols else None,
        result=row["result"] if "result" in task_cols else None,
    )
    run_cols = table_columns(conn, "task_runs")
    if run_cols:
        try:
            run = conn.execute(
                "select * from task_runs where task_id = ? order by started_at desc limit 1",
                (task_id,),
            ).fetchone()
        except sqlite3.Error:
            run = None
        if run:
            keys = set(run.keys())
            task.run_status = run["status"] if "status" in keys else None
            task.run_outcome = run["outcome"] if "outcome" in keys else None
            task.run_started_at = run["started_at"] if "started_at" in keys else None
            task.run_ended_at = run["ended_at"] if "ended_at" in keys else None
            task.run_summary = run["summary"] if "summary" in keys else None
    return task


def label_names(issue: dict[str, Any]) -> list[str]:
    return sorted(label.get("name", "") for label in issue.get("labels", []) if label.get("name"))


def parse_phase(value: str | None, issue_number: int) -> tuple[int, str]:
    if not value:
        return (10_000 + issue_number, "")
    match = re.search(r"-?\d+", value)
    if match:
        return (int(match.group(0)), value)
    return (10_000 + issue_number, value)


def age_seconds(ts: int | None, now: int) -> int | None:
    if not ts:
        return None
    return max(0, now - int(ts))


def human_age(seconds: int | None) -> str:
    if seconds is None:
        return "n/a"
    if seconds < 90:
        return f"{seconds}s"
    minutes = seconds // 60
    if minutes < 90:
        return f"{minutes}m"
    hours = minutes // 60
    if hours < 48:
        return f"{hours}h"
    return f"{hours // 24}d"


def derive_status(
    issue: dict[str, Any],
    labels: list[str],
    task: TaskState | None,
    ready_label: str,
    blocked_label: str,
    human_review_label: str,
) -> str:
    issue_closed = issue.get("state", "").upper() == "CLOSED"
    task_status = (task.status or "").lower() if task else ""
    if blocked_label in labels or task_status == "blocked":
        return "blocked"
    if human_review_label in labels and not issue_closed:
        return "human-review"
    if issue_closed or task_status == "done":
        return "done"
    if task_status == "running" or (task and (task.worker_pid or task.current_run_id) and not task.completed_at):
        return "running"
    if ready_label in labels or task_status == "ready":
        return "ready"
    if task_status == "todo" or issue.get("state", "").upper() == "OPEN":
        return "parked"
    return "unknown"


def infer_next_action(status: str, task: TaskState | None, labels: list[str], ready_label: str) -> str:
    if status == "blocked":
        return "inspect blocker and unblock only after the condition is verified"
    if status == "human-review":
        return "human: review and merge the final PR"
    if status == "running":
        return "wait for worker completion, then verify gates"
    if status == "ready":
        return "dispatcher/supervisor may claim this phase"
    if status == "parked":
        return "waiting for parent phase or explicit promotion"
    if status == "done":
        return "no action unless final operator merge/release gate remains"
    return "inspect state"


def infer_risk(status: str, drift: list[str], task: TaskState | None, stale: bool) -> str:
    if drift or stale:
        return "high"
    if status in {"blocked", "running"}:
        return "medium"
    return "low"


def build_rows(args: argparse.Namespace) -> list[BoardRow]:
    fields = ["number", "title", "state", "url", "labels", "body", "updatedAt"]
    gh_args = ["issue", "list", "--repo", args.repo, "--state", "all", "--limit", str(args.limit), "--json", ",".join(fields)]
    if args.milestone:
        gh_args.extend(["--milestone", args.milestone])
    if args.label:
        gh_args.extend(["--label", args.label])
    issues = run_gh(gh_args) or []
    conn = connect_state_db(args.state_db)
    now = int(time.time())
    rows: list[BoardRow] = []
    ready_open_count = 0

    for issue in issues:
        labels = label_names(issue)
        body = issue.get("body") or ""
        meta = parse_metadata_block(body)
        task_id = meta.get("task") or meta.get("kanban") or first_task_id(body)
        task = load_task(conn, task_id)
        pr = meta.get("pr") or first_pr_ref(body) or latest_comment_pr(args.repo, int(issue["number"]))
        phase = meta.get("phase")
        target_branch = meta.get("phase_branch") or meta.get("train_branch") or meta.get("target_branch")
        assignee = meta.get("worker") or meta.get("assignee") or (task.assignee if task else None)
        status = derive_status(issue, labels, task, args.ready_label, args.blocked_label, args.human_review_label)

        if issue.get("state", "").upper() == "OPEN" and args.ready_label in labels:
            ready_open_count += 1

        drift: list[str] = []
        issue_closed = issue.get("state", "").upper() == "CLOSED"
        task_status = (task.status or "").lower() if task else ""
        if issue_closed and args.ready_label in labels:
            drift.append("closed issue still has ready label")
        if task_status == "done" and not issue_closed:
            drift.append("task done but issue still open")
        if issue_closed and task and task_status not in {"done", "archived"}:
            drift.append("issue closed but task not done")
        if task_status == "blocked" and args.blocked_label not in labels and not issue_closed:
            drift.append("task blocked but issue lacks blocked label")
        if args.blocked_label in labels and task_status and task_status != "blocked" and not issue_closed:
            drift.append("issue blocked but task is not blocked")
        stale = False
        if status == "running" and task:
            hb_age = age_seconds(task.last_heartbeat_at or task.run_started_at, now)
            stale = hb_age is not None and hb_age > args.stale_seconds
            if stale:
                drift.append(f"running task heartbeat is stale ({human_age(hb_age)})")

        rows.append(
            BoardRow(
                issue=int(issue["number"]),
                title=issue.get("title") or "",
                url=issue.get("url") or "",
                issue_state=issue.get("state") or "",
                labels=labels,
                phase=phase,
                task_id=task_id,
                target_branch=target_branch,
                assignee=assignee,
                pr=pr,
                board_status=status,
                next_action=infer_next_action(status, task, labels, args.ready_label),
                risk=infer_risk(status, drift, task, stale),
                task=task,
                drift=drift,
            )
        )

    if ready_open_count > 1:
        for row in rows:
            if row.issue_state.upper() == "OPEN" and args.ready_label in row.labels:
                row.drift.append(f"multiple open ready phases detected ({ready_open_count})")
                row.risk = "high"

    rows.sort(key=lambda r: parse_phase(r.phase, r.issue)[0])
    return rows


def print_text(rows: list[BoardRow], args: argparse.Namespace) -> None:
    title = args.title or args.milestone or args.repo or "self-test"
    print(f"Shiploop status board: {title}")
    print(f"Repo: {args.repo or 'n/a'}")
    if args.milestone:
        print(f"Milestone: {args.milestone}")
    print(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print("")
    if not rows:
        print("No matching issues found.")
        return
    for row in rows:
        phase = f"Phase {row.phase}" if row.phase else f"Issue #{row.issue}"
        task = row.task
        heartbeat = human_age(age_seconds((task.last_heartbeat_at if task else None) or (task.run_started_at if task else None), int(time.time()))) if task else "n/a"
        run = task.current_run_id if task else None
        print(f"{phase} - {row.board_status.upper()} - {row.title}")
        print(f"  Issue: #{row.issue} {row.issue_state.lower()} | Risk: {row.risk}")
        if row.task_id or task:
            print(f"  Task: {row.task_id or 'n/a'} | status={task.status if task else 'missing'} | run={run or 'n/a'} | heartbeat={heartbeat}")
        if row.pr or row.target_branch or row.assignee:
            print(f"  PR: {row.pr or 'n/a'} | branch={row.target_branch or 'n/a'} | assignee={row.assignee or 'n/a'}")
        print(f"  Next: {row.next_action}")
        if row.drift:
            print("  Drift:")
            for item in row.drift:
                print(f"    - {item}")
        print(f"  URL: {row.url}")
        print("")


def sample_rows() -> list[BoardRow]:
    return [
        BoardRow(
            issue=101,
            title="Phase 1 - foundation",
            url="https://example.invalid/issues/101",
            issue_state="CLOSED",
            labels=["shiploop"],
            phase="1",
            task_id="task-example1",
            target_branch="shiploop/example-train-phase-1",
            assignee="worker-a",
            pr="#10",
            board_status="done",
            next_action="no action unless final operator merge/release gate remains",
            risk="low",
            task=TaskState(id="task-example1", status="done", assignee="worker-a", current_run_id=1, completed_at=int(time.time())),
            drift=[],
        ),
        BoardRow(
            issue=102,
            title="Phase 2 - implementation",
            url="https://example.invalid/issues/102",
            issue_state="OPEN",
            labels=["shiploop", "shiploop-ready"],
            phase="2",
            task_id="task-example2",
            target_branch="shiploop/example-train-phase-2",
            assignee="worker-a",
            pr="#10",
            board_status="running",
            next_action="wait for worker completion, then verify gates",
            risk="medium",
            task=TaskState(id="task-example2", status="running", assignee="worker-a", current_run_id=2, last_heartbeat_at=int(time.time()) - 120),
            drift=[],
        ),
    ]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Render a generic read-only status board for a Shiploop train.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Examples:
              autopilot-status-board.py --repo OWNER/REPO --milestone "Example Train"
              autopilot-status-board.py --repo OWNER/REPO --label shiploop --format json
              autopilot-status-board.py --self-test
            """
        ),
    )
    parser.add_argument("--repo", help="GitHub repository in OWNER/REPO form.")
    parser.add_argument("--milestone", help="Optional GitHub milestone/title for one train.")
    parser.add_argument("--title", help="Display title. Defaults to milestone or repo.")
    parser.add_argument("--label", default="shiploop", help="Issue label used to select Shiploop phases. Default: shiploop.")
    parser.add_argument("--ready-label", default="shiploop-ready", help="Ready label. Default: shiploop-ready.")
    parser.add_argument("--blocked-label", default="shiploop-blocked", help="Blocked label. Default: shiploop-blocked.")
    parser.add_argument("--human-review-label", default="shiploop-human-review", help="Human-review label. Default: shiploop-human-review.")
    parser.add_argument("--state-db", dest="state_db", default=os.environ.get("AUTOPILOT_STATE_DB"), help="Optional task-state SQLite DB path. Default: $AUTOPILOT_STATE_DB.")
    parser.add_argument("--kanban-db", dest="state_db", help=argparse.SUPPRESS)
    parser.add_argument("--stale-seconds", type=int, default=15 * 60, help="Running task heartbeat age considered stale. Default: 900.")
    parser.add_argument("--limit", type=int, default=200, help="Max issues to fetch. Default: 200.")
    parser.add_argument("--format", choices=["text", "json"], default="text", help="Output format. Default: text.")
    parser.add_argument("--self-test", action="store_true", help="Render a built-in generic sample without GitHub or a state database.")
    args = parser.parse_args(argv)

    if args.self_test:
        rows = sample_rows()
    else:
        if not args.repo:
            parser.error("--repo is required unless --self-test is used")
        rows = build_rows(args)

    if args.format == "json":
        print(json.dumps([asdict(row) for row in rows], indent=2, sort_keys=True))
    else:
        print_text(rows, args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
