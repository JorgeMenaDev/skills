#!/usr/bin/env python3
"""Round lifecycle and Thread Protocol for t3-dispatch.sh: every state.json
write, every notification body, the reconcile decision tree, lifecycle.jsonl
writes, every question asked of a T3 thread snapshot (`thread <question>`,
snapshot on stdin) and every orchestration command body (`command <kind>`,
args only).

Bash keeps transport only (session issue, curl, dispatch, api) and executes
the action a verb returns. It never parses thread JSON. Key names are frozen:
live crew dirs keep working.
"""

import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from uuid import uuid4


os.umask(0o077)

RUNTIME_MODES = {"approval-required", "auto-accept-edits", "auto", "full-access"}

def runtime_mode(value):
    if value not in RUNTIME_MODES:
        raise ValueError(f"unsupported runtime mode: {value}")
    return value


DELIVERY_FIELDS = ("request", "blocked_notification", "notification",
                   "startup_notification", "cleanup_notification")


def write_json(path, value):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as out:
        json.dump(value, out, indent=2)
        out.write("\n")
        out.flush()
        os.fsync(out.fileno())
    os.replace(out.name, path)


def read_round(directory, expected=None):
    current = json.loads((directory / "current-round.json").read_text())["round"]
    if expected and current != expected:
        raise ValueError(f"stale round {expected}; current round is {current}")
    path = directory / "rounds" / current / "state.json"
    return path, json.loads(path.read_text())


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def minutes_since(value):
    moment = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return max(0, int((datetime.now(timezone.utc) - moment).total_seconds() / 60))


def helper_path():
    return str(Path(__file__).resolve().parent / "t3-dispatch.sh")


def helper_command(directory, helper):
    return shlex.join([
        "env", f"T3_DISPATCH_HOME={directory.parent}",
        f"T3_DISPATCH_BASE_DIR={os.environ.get('T3_DISPATCH_BASE_DIR', str(Path.home() / '.t3'))}",
        helper,
    ])


def lifecycle_append(directory, event, **fields):
    record = {"version": 2, "event": event}
    current = directory / "current-round.json"
    if current.exists():
        record["round"] = json.loads(current.read_text())["round"]
    for key, value in fields.items():
        record[key] = int(value) if key == "sequence" and str(value).isdigit() else value
    if directory.is_dir():
        with (directory / "lifecycle.jsonl").open("a") as out:
            out.write(json.dumps(record, separators=(",", ":")) + "\n")


def lifecycle_counts(directory, rid):
    delivered = accepted = terminal = 0
    path = directory / "lifecycle.jsonl"
    if not path.exists():
        return delivered, accepted, terminal
    for line in path.read_text().splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("round") != rid:
            continue
        if event.get("event") == "notification.delivered":
            delivered += 1
        if event.get("event") == "settle.accepted":
            accepted += 1
        if event.get("event") in ("cleanup.verified", "cleanup.abandoned"):
            terminal += 1
    return delivered, accepted, terminal


def safe_error_text(value):
    if not isinstance(value, str):
        return ""
    text = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", value)
    text = re.sub(r"https?://[^\s<>\"']+", "[URL redacted]", text)
    text = re.sub(r"(?i)\b(?:authorization|proxy-authorization|set-cookie|cookie)[\"']?\s*[:=][^\r\n]*", "[credential header redacted]", text)
    text = re.sub(r"(?i)\b(?:bearer|basic)\s+[a-z0-9._~+/=-]+", "[credential redacted]", text)
    text = re.sub(
        r"(?i)([\"']?(?:[\w-]*(?:token|password|secret|api[_-]?key))[\"']?\s*[:=]\s*)(?:\"[^\"]*\"|'[^']*'|[^\s,;}]+)",
        r"\1[redacted]", text,
    )
    text = re.sub(r"\b(?:sk-|gh[pousr]_|github_pat_|xox[baprs]-)[a-zA-Z0-9_-]+", "[credential redacted]", text)
    text = re.sub(r"\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+", "[credential redacted]", text)
    text = re.sub(r"[\x00-\x1f\x7f]", " ", text)
    return " ".join(text.split())[:600]


def provider_failure(snapshot, state):
    thread = snapshot.get("thread") or {}
    latest = thread.get("latestTurn") or {}
    session = thread.get("session") or {}
    def at(value):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except (AttributeError, ValueError):
            return 0
    since = at(state["started_at"])
    turn = latest.get("turnId") if at(latest.get("requestedAt")) >= since else None
    message = (state.get("request") or {}).get("message", {}).get("messageId")
    candidates = []
    unrelated_at = 0
    for activity in thread.get("activities", []):
        kind = activity.get("kind")
        if kind not in ("runtime.error", "provider.turn.start.failed") or at(activity.get("createdAt")) < since:
            continue
        if activity.get("turnId") and activity["turnId"] != turn:
            unrelated_at = max(unrelated_at, at(activity.get("createdAt")))
            continue
        payload = activity.get("payload") or {}
        if not isinstance(payload, dict):
            continue
        if kind == "provider.turn.start.failed" and message and payload.get("requestId") != message:
            unrelated_at = max(unrelated_at, at(activity.get("createdAt")))
            continue
        detail = safe_error_text(payload.get("detail") or payload.get("message"))
        if detail:
            candidates.append((at(activity.get("createdAt")), activity.get("sequence", 0), f"{kind}: {detail}"))
    if candidates:
        return max(candidates)[2]
    if session.get("status") == "error" and at(session.get("updatedAt")) >= since and at(session.get("updatedAt")) > unrelated_at:
        if not session.get("activeTurnId") or session["activeTurnId"] == turn:
            detail = safe_error_text(session.get("lastError"))
            if detail:
                return f"session.error: {detail}"
    return ""


def pending_requests(snapshot):
    thread = snapshot.get("thread")
    if not isinstance(thread, dict):
        raise ValueError("thread snapshot missing")
    pending = {}
    def order(activity):
        return (activity.get("sequence") is not None, activity.get("sequence", 0),
                activity.get("createdAt", ""), activity.get("kind", "").endswith("resolved"))
    for activity in sorted(thread.get("activities", []), key=order):
        payload = activity.get("payload") or {}
        if not isinstance(payload, dict) or not isinstance(payload.get("requestId"), str):
            continue
        request_id, kind = payload["requestId"], activity.get("kind", "")
        if kind in ("approval.requested", "user-input.requested"):
            pending[request_id] = {
                "requestId": request_id, "kind": kind, "summary": activity.get("summary"),
                **{key: payload[key] for key in ("detail", "requestKind", "requestType", "questions", "options") if key in payload},
            }
        elif kind in ("approval.resolved", "user-input.resolved"):
            pending.pop(request_id, None)
        elif kind in ("provider.approval.respond.failed", "provider.user-input.respond.failed"):
            detail = str(payload.get("detail", "")).lower()
            if any(marker in detail for marker in (
                "stale pending approval request", "unknown pending approval request",
                "unknown pending permission request", "stale pending user-input request",
                "unknown pending user-input request", "unknown pending user input request",
                "unknown pending codex user input request",
            )):
                pending.pop(request_id, None)
    if not pending and (thread.get("hasPendingApprovals") or thread.get("hasPendingUserInput")):
        pending["summary"] = {"requestId": "summary", "summary": "Open the child thread to inspect its pending request."}
    return sorted(pending.values(), key=lambda request: request["requestId"])


def thread_idle(snapshot):
    if pending_requests(snapshot) != []:
        return False
    thread = snapshot.get("thread")
    if not thread:
        return False
    busy = ((thread.get("session") or {}).get("status") in ("starting", "running")
            or (thread.get("latestTurn") or {}).get("state") == "running"
            or thread.get("hasPendingApprovals") or thread.get("hasPendingUserInput"))
    return not busy


# --- Thread Protocol --------------------------------------------------
# The one place that knows what a snapshot means. Bash pipes the snapshot in
# and gets a word, an exit code, or JSON back; it never reads a field itself.

def thread_turn(snapshot):
    """Canonical turn state. A session in error with no turn at all is how T3
    reports a model rejected at start, so that reads as `error`."""
    thread = snapshot.get("thread") or {}
    state = (thread.get("latestTurn") or {}).get("state") or "none"
    if state == "none" and (thread.get("session") or {}).get("status") == "error":
        return "error"
    return state


def thread_session(snapshot):
    session = (snapshot.get("thread") or {}).get("session")
    return (session or {}).get("status") or "absent"


def thread_has_message(snapshot, message_id):
    thread = snapshot.get("thread") or {}
    return any(message.get("id") == message_id for message in thread.get("messages", []))


def thread_describe(snapshot):
    thread = snapshot.get("thread") or {}
    latest = thread.get("latestTurn") or {}
    lines = [f"id {thread.get('id')}", f"title {thread.get('title')}",
             f"session {thread_session(snapshot) if thread.get('session') else '(none)'}",
             f"latestTurn {latest.get('state') or '(none)'} turnId {latest.get('turnId') or latest.get('id') or '(none)'}"]
    if thread.get("backgroundLiveness"):
        lines.append(f"backgroundLiveness {thread['backgroundLiveness']}")
    return "\n".join(lines)


def thread_list(project_snapshot, project_id):
    """whoami's inventory: mid-turn threads first. A list, never an identity."""
    order = {"running": 0, "ready": 1, "idle": 2}
    rows = []
    for thread in project_snapshot.get("threads", []):
        if thread.get("projectId") != project_id:
            continue
        status = ((thread.get("session") or {}).get("status")) or "idle"
        rows.append((status, thread["id"], (thread.get("title") or "")[:60]))
    rows.sort(key=lambda row: (order.get(row[0], 9), row[2]))
    return "\n".join(f"{tid}\t{status}\t{title}" for status, tid, title in rows)


def thread_identity(snapshot):
    """id, projectId, title as one tab-separated line; a missing title is empty."""
    thread = snapshot.get("thread") or {}
    return "\t".join([thread.get("id") or "", thread.get("projectId") or "", (thread.get("title") or "").strip()])


def thread_project(project_snapshot, want):
    for project in project_snapshot.get("projects", []):
        if project.get("id") == want or (project.get("title") or "") == want:
            return project["id"]
    return None


def thread_question(question, args):
    raw = sys.stdin.read() if not sys.stdin.isatty() else ""
    try:
        snapshot = json.loads(raw)
        if not isinstance(snapshot, dict):
            raise ValueError("snapshot is not an object")
    except ValueError as error:
        # Two callers tolerate an unreadable snapshot: settle reports the child
        # as unknown and waits, status prints why. Everyone else fails.
        if question == "idle":
            print("unknown")
            return 0
        if question == "describe":
            print("(unreadable: empty response)" if not raw.strip() else "(unreadable: malformed response)")
            return 0
        raise ValueError(f"thread {question}: unreadable snapshot ({error})")
    if question == "idle":
        try:
            print("idle" if thread_idle(snapshot) else "active")
        except ValueError:
            print("unknown")
        return 0
    if question == "turn":
        print(thread_turn(snapshot))
        return 0
    if question == "session":
        print(thread_session(snapshot))
        return 0
    if question == "has-message":
        return 0 if thread_has_message(snapshot, args[0]) else 1
    if question == "pending":
        print(json.dumps(pending_requests(snapshot)))
        return 0
    if question == "failure":
        _, state = read_round(Path(args[0]), args[1] if len(args) > 1 else None)
        print(provider_failure(snapshot, state))
        return 0
    if question == "describe":
        print(thread_describe(snapshot))
        return 0
    if question == "list":
        listing = thread_list(snapshot, args[0])
        if listing:
            print(listing)
        return 0
    if question == "identity":
        print(thread_identity(snapshot))
        return 0
    if question == "project":
        project_id = thread_project(snapshot, args[0])
        if project_id is None:
            return 3
        print(project_id)
        return 0
    raise ValueError(f"unknown thread question: {question}")


# --- Thread Protocol: command bodies ---------------------------------
# One envelope for every thread.turn.start, one id rule per command kind:
# create and turn are deterministic on crew id and thread, stop on thread, so
# a replay at the same point is a no-op; settle is fresh per attempt because a
# commandId burned by a rejected settle returns 500 forever.

def deterministic_command_id(*parts):
    return "cmd-" + hashlib.sha256("|".join(parts).encode()).hexdigest()[:32]


def turn_command(thread_id, text, message_id, command_id, created, selection=None, mode=None):
    body = {"type": "thread.turn.start", "commandId": command_id, "threadId": thread_id,
            "message": {"messageId": message_id, "role": "user", "text": text, "attachments": []},
            "interactionMode": "default", "createdAt": created}
    if mode is not None:
        body["runtimeMode"] = runtime_mode(mode)
    if selection is not None:
        body["modelSelection"] = selection
    return body


def crewmate_contract(directory, rid, report, helper, follow_up):
    """The one wording of what a crewmate owes. The follow-up variant adds the
    no-reuse rule; everything else is identical so there is one contract."""
    crew_id = shlex.quote(directory.name)
    helper = helper_command(directory, helper)
    subject = "follow-up" if follow_up else "brief"
    text = f"""

---
## Hand-back (required)

You are a **crewmate**, not the parent. Execute the {subject} above.

Before any other work, append exactly `started: round {rid}` to `{directory}/status`.

1. Write your proof to `{report}` (status ok|failed, deliverables, how to verify).
2. Append one terminal line to `{directory}/status`: `done:` or `failed:` plus a short reason.
3. Wake the parent by running exactly:
   `{helper} notify {crew_id} --round {rid} --kind done`
   or
   `{helper} notify {crew_id} --round {rid} --kind failed`

If you need a decision, write the exact question, options and recommendation to the report,
append `blocked:` plus the reason to the crew status file, then run `{helper} notify {crew_id} --round {rid} --kind blocked` and stop.
Do not claim failure or completion just because you need input. Native T3 approval/input cards are detected automatically.

Reserve REPORT.md for this round's hand-back; put research and other deliverables in separate files.
Do not message other threads. The notify command delivers a pointer; the parent verifies the report.
"""
    if follow_up:
        text += "Do not reuse a previous round's report or notification command.\n"
    return text


def command_body(kind, args):
    now = now_iso()
    if kind == "create":
        directory, thread_id, project_id, title, selection, workdir, mode = Path(args[0]), *args[1:7]
        selection = json.loads(selection)
        model = {"instanceId": selection["instanceId"], "model": selection["model"]}
        if selection.get("options"):
            model["options"] = selection["options"]
        return {"type": "thread.create",
                "commandId": deterministic_command_id(directory.name, "create", thread_id),
                "threadId": thread_id, "projectId": project_id, "title": title,
                "modelSelection": model, "runtimeMode": runtime_mode(mode), "interactionMode": "default",
                "branch": None, "worktreePath": workdir or None, "createdAt": now}
    if kind == "turn":
        variant, directory, thread_id, selection, rid = args[0], Path(args[1]), args[2], json.loads(args[3]), args[4]
        meta = json.loads((directory / "meta.json").read_text())
        report = str(directory / "rounds" / rid / "REPORT.md")
        helper = helper_path()
        if variant == "brief":
            brief = (directory / "brief.md").read_text()
            # OpenCode title echo: keep CREW: id as the first line (historical workaround).
            text = (f"CREW: {directory.name}\n\nYou were dispatched to execute one brief.\n"
                    f"Crew dir: {directory}\nParent thread: {meta['parent_thread']}\n\n---\n\n{brief}"
                    + crewmate_contract(directory, rid, report, helper, follow_up=False))
            command_id = deterministic_command_id(directory.name, "turn", thread_id)
        elif variant == "follow-up":
            message = Path(args[5]).read_text()
            text = (f"CREW FOLLOW-UP: {directory.name} round={rid}\n\n{message}"
                    + crewmate_contract(directory, rid, report, helper, follow_up=True))
            command_id = "cmd-" + str(uuid4())
        else:
            raise ValueError(f"unknown turn variant: {variant}")
        return turn_command(thread_id, text, str(uuid4()), command_id, now, selection, meta["runtime_mode"])
    if kind == "stop":
        thread_id, rest = args[0], args[1:]
        body = {"type": "thread.session.stop", "threadId": thread_id, "createdAt": now}
        if rest[:1] == ["--only-if-settled"]:
            body.update(commandId=f"session-stop-for-settle:{rest[1]}", onlyIfSettled=True)
        elif rest:
            raise ValueError("stop takes an optional --only-if-settled <settle-id>")
        else:
            body["commandId"] = deterministic_command_id("stop", thread_id)
        return body
    if kind == "settle":
        return {"type": "thread.settle", "commandId": "cmd-" + uuid4().hex, "threadId": args[0]}
    raise ValueError(f"unknown command kind: {kind}")


def observe_blocked(directory, path, state, data, helper):
    previous = state.get("blocked") or {}
    requests = data.get("requests", [])
    now = datetime.now(timezone.utc).isoformat()
    if not requests and not data.get("detail"):
        if previous.get("source") == "provider" and not previous.get("resolved_at"):
            state["blocked"] = {**previous, "resolved_at": now}
            write_json(path, state)
        return state
    source = data.get("source", "provider")
    same = previous.get("requests") == requests if source == "provider" else previous.get("detail") == data.get("detail")
    if previous.get("source") == source and not previous.get("resolved_at") and same:
        return state
    block_id, message_id = str(uuid4()), str(uuid4())
    report = path.parent / f"BLOCKED-{block_id}.md"
    meta = json.loads((directory / "meta.json").read_text())
    action = (
        "Respond to the original approval or input card in T3. That resumes the existing turn. "
        "Do not use send while a provider request is pending."
        if source == "provider" else
        "Resolve the decision, then use t3-dispatch.sh send with the answer to start the next round."
    )
    report.write_text(f"# Crew needs attention\n\nRound: {state['round']}\nChild thread: {meta['child_thread']}\n\n"
                      + (data.get("detail") or json.dumps(requests, indent=2)) + "\n\n" + action + "\n")
    block = {"id": block_id, "source": source, "requests": requests,
             "report": str(report), "raised_at": now}
    if source == "report":
        block["detail"] = data["detail"]
    text = (f"\u2063CREW_OP kind=blocked crew={directory.name} round={state['round']} "
            f"block={block_id} dest={meta['parent_thread']} notification={message_id} at={now}\n"
            f"Crew needs input or approval. Read {report} and verify the request against its brief. "
            "Handle it within existing authority; human-only actions and new judgment decisions need the user. "
            f"{action} Acknowledge receipt with {helper_command(directory, helper)} ack-blocked {shlex.quote(directory.name)} "
            f"--round {state['round']} --block {block_id}. This acknowledgement grants no approval "
            "and does not complete or settle the round. If the request has already resolved, do not repeat it.")
    state.update({"blocked": block, "blocked_acked_at": None, "blocked_notification_delivered_at": None,
                  "blocked_notification_attempted_at": None,
                  "blocked_notification": turn_command(meta["parent_thread"], text, message_id,
                                                       "cmd-" + str(uuid4()), now)})
    write_json(path, state)
    return state


def observe_startup(directory, path, state, snapshot, max_age):
    marker = state.get("execution_marker")
    if not marker:
        return state
    now = datetime.now(timezone.utc)
    thread = snapshot.get("thread") or {}
    busy = (thread.get("session") or {}).get("status") in ("starting", "running") or (thread.get("latestTurn") or {}).get("state") == "running"
    lines = (directory / "status").read_text().splitlines()[state["status_baseline"]:]
    notice = state.get("startup_attention")
    if marker in lines or state.get("kind") or not busy:
        if notice and not notice.get("resolved_at"):
            notice["resolved_at"] = now.isoformat()
            write_json(path, state)
        return state
    age = (now - datetime.fromisoformat(state["started_at"].replace("Z", "+00:00"))).total_seconds() / 60
    if age < 15 or notice:
        return state
    meta = json.loads((directory / "meta.json").read_text())
    report = path.parent / "STARTUP.md"
    detail = ("T3 still marks this round active, but its first-action acknowledgement is missing after 15 minutes. "
              "This does not prove the child is stuck. Inspect the current thread, brief and work before intervening. "
              "Do not stop or resend solely because of this notice. Respond to native input or approval cards in T3 if present.")
    report.write_text(f"# Startup acknowledgement missing\n\nRound: {state['round']}\nChild thread: {meta['child_thread']}\n\n"
                      f"Expected status line: `{marker}`\n\n{detail}\n")
    state["startup_attention"] = {"report": str(report), "raised_at": now.isoformat()}
    if age <= max_age:
        message_id = str(uuid4())
        text = (f"\u2063CREW_OP kind=attention crew={directory.name} round={state['round']} "
                f"dest={meta['parent_thread']} notification={message_id} at={now.isoformat()}\n"
                f"Read {report}. {detail} This notice is not a hand-back and requires no round acknowledgement.")
        state["startup_notification"] = turn_command(meta["parent_thread"], text, message_id,
                                                     "cmd-" + str(uuid4()), now.isoformat())
    write_json(path, state)
    return state


def cleanup_action(directory, path, state, snapshot, max_age):
    thread = snapshot["thread"]
    if thread is not None and not isinstance(thread, dict):
        raise ValueError("invalid cleanup thread snapshot")
    if thread is not None and "session" not in thread:
        raise ValueError("cleanup session snapshot missing")
    meta = json.loads((directory / "meta.json").read_text())
    child = meta.get("child_thread", "")
    now = datetime.now(timezone.utc)
    _, accepted, terminal = lifecycle_counts(directory, state["round"])
    if accepted <= terminal:
        return "none"
    notice = state.get("cleanup_attention")
    action = None
    if thread is None:
        action = "verified"
    elif thread.get("settledOverride") != "settled" or (thread.get("session") or {}).get("status") in ("starting", "running") or (thread.get("latestTurn") or {}).get("state") == "running" or pending_requests(snapshot):
        action = "abandoned"
    elif thread.get("session") is None or thread["session"].get("status") == "stopped":
        action = "verified"
    if action:
        if notice and not notice.get("resolved_at"):
            notice.update(resolved_at=now.isoformat(), resolution=action)
            write_json(path, state)
        lifecycle_append(directory, f"cleanup.{action}", threadId=child, at=now.isoformat())
        return action
    events = []
    for line in (directory / "lifecycle.jsonl").read_text().splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("round") == state["round"]:
            events.append(event)
    attempts = [event for event in events if event.get("event") == "cleanup.attempt"]
    def at(value):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    if attempts and (now - at(attempts[-1]["at"])).total_seconds() < 60:
        return "wait"
    if len(attempts) < 4:
        return "retry"
    if not notice:
        since = next((at(event["at"]) for event in events if event.get("event") == "settle.accepted"), at(state["started_at"]))
        errors = [activity for activity in thread.get("activities", [])
                  if activity.get("kind") == "provider.session.stop.failed" and at(activity["createdAt"]) >= since]
        latest = max(errors, key=lambda activity: at(activity["createdAt"]), default={})
        detail = safe_error_text((latest.get("payload") or {}).get("detail")) or "No current cleanup error detail available."
        report = path.parent / "CLEANUP.md"
        instruction = ("Automatic cleanup has reached its four-attempt limit without a confirmed stopped session. "
                       "Inspect the child and its provider configuration in T3 before repairing it. "
                       "Do not restart the shared server or kill unrelated processes. "
                       "The work remains acknowledged and settled; cleanup is still unverified.")
        report.write_text(f"# Cleanup needs attention\n\nRound: {state['round']}\nChild thread: {meta['child_thread']}\n\n"
                          f"Recorded attempts: {len(attempts)}\n\n{instruction}\n\nProvider evidence: {detail}\n")
        state["cleanup_attention"] = {"report": str(report), "raised_at": now.isoformat(), "attempts": len(attempts)}
        if (now - at(state["started_at"])).total_seconds() <= max_age * 60:
            message_id = str(uuid4())
            text = (f"\u2063CREW_OP kind=attention crew={directory.name} round={state['round']} "
                    f"dest={meta['parent_thread']} notification={message_id} at={now.isoformat()}\n"
                    f"Read {report}. {instruction} No new round acknowledgement is required.")
            state["cleanup_notification"] = turn_command(meta["parent_thread"], text, message_id,
                                                         "cmd-" + str(uuid4()), now.isoformat())
        write_json(path, state)
    return "attention"


def read_stdin_json(required):
    if not sys.stdin.isatty():
        raw = sys.stdin.read()
        if raw.strip():
            return json.loads(raw)
    if required:
        raise ValueError("snapshot required on stdin")
    return None


def build_handback(directory, state, kind, parent, helper, now, message_id):
    report = state.get("recovery_report") or state["report"]
    text = (f"\u2063CREW_OP kind={kind} crew={directory.name} "
            f"round={state['round']} dest={parent} notification={message_id} at={now}\n"
            f"Crew hand-back is awaiting acknowledgement. Read {report}, verify against "
            f"the brief, then run {helper_command(directory, helper)} ack {shlex.quote(directory.name)} --round {state['round']}. "
            "If this round was already integrated, acknowledge it without repeating the work.")
    return turn_command(parent, text, message_id, "cmd-" + str(uuid4()), now)


def check_report(state):
    path = state.get("recovery_report") or state["report"]
    try:
        text = Path(path).read_text().strip()
    except OSError:
        raise ValueError(f"write the round report before notify: {path}")
    if not text or "(child writes status + deliverables here before notify)" in text:
        raise ValueError(f"report is empty or still a placeholder: {path}")
    return path, text


def do_prepare(directory, path, state, kind):
    _, report_text = check_report(state)
    helper = helper_path()
    now = now_iso()
    if kind in ("done", "failed"):
        previous = state.get("kind")
        if previous and previous != kind:
            raise ValueError(f"round already completed as {previous}; send a new correction round")
        if previous == kind:
            return state
        # An explicit final hand-back supersedes the child's own decision report.
        # Native provider requests remain open until T3 records their resolution.
        blocked = state.get("blocked") or {}
        if blocked.get("source") == "report" and not blocked.get("resolved_at"):
            state["blocked"] = {**blocked, "resolved_at": now}
        meta = json.loads((directory / "meta.json").read_text())
        state["notification"] = build_handback(directory, state, kind, meta["parent_thread"], helper, now, str(uuid4()))
        state["kind"] = kind
        state["notification_delivered_at"] = None
        write_json(path, state)
        return state
    if kind == "blocked":
        if state.get("kind"):
            raise ValueError("round already completed; send a new round for further work")
        return observe_blocked(directory, path, state,
                               {"source": "report", "detail": report_text}, helper)
    raise ValueError(f"--kind must be done, failed or blocked (got {kind})")


def pending_field(state, field):
    body = state.get(field)
    if not body:
        return False
    if field == "request":
        return not state.get("request_delivered_at")
    if field == "blocked_notification":
        blocked = state.get("blocked") or {}
        return not (blocked.get("resolved_at") or state.get("blocked_acked_at")
                    or state.get("blocked_notification_delivered_at"))
    if field == "notification":
        return bool(state.get("kind")) and not state.get("notification_delivered_at")
    if field == "startup_notification":
        return (not state.get("startup_notification_delivered_at")
                and not (state.get("startup_attention") or {}).get("resolved_at"))
    if field == "cleanup_notification":
        return not state.get("cleanup_notification_delivered_at")
    raise ValueError(f"unknown delivery field: {field}")


def do_next_delivery(directory, path, state, snapshot, want):
    fields = (want,) if want else DELIVERY_FIELDS
    for field in fields:
        if field not in DELIVERY_FIELDS:
            raise ValueError(f"unknown delivery field: {field}")
        if not pending_field(state, field):
            continue
        body = state[field]
        if field != "request" and "modelSelection" not in body and snapshot is not None:
            # Resolve the parent's selected options on the first delivery
            # attempt, after saving the pending notification. Saved delivery
            # retries keep their exact body.
            body = {**body, "modelSelection": snapshot["thread"]["modelSelection"],
                    "runtimeMode": runtime_mode(snapshot["thread"]["runtimeMode"])}
            state[field] = body
            write_json(path, state)
        message_id = body["message"]["messageId"]
        print(f"{field}\t{body['threadId']}\t{message_id}")
        print(json.dumps(body))
        return
    # Nothing pending: no output, exit 0.


def status_tail_kind(directory, state):
    kind = "failed"
    for line in (directory / "status").read_text().splitlines()[int(state["status_baseline"]):]:
        if line.startswith("done:"):
            kind = "done"
        if line.startswith("failed:"):
            kind = "failed"
        if line.startswith("blocked:"):
            kind = "blocked"
    return kind


def report_is_usable(path):
    try:
        return bool(Path(path).read_text().strip())
    except OSError:
        return False


def do_observe(directory, path, state, child_snapshot, max_age, retry_min, max_attempts, parent_file):
    meta = json.loads((directory / "meta.json").read_text())
    child_id, parent_id = meta["child_thread"], meta["parent_thread"]
    parent_snapshot = None
    if parent_file:
        try:
            parent_snapshot = json.loads(Path(parent_file).read_text())
        except (OSError, ValueError):
            parent_snapshot = None

    def decide(action, **extra):
        print(json.dumps({"action": action, "child": child_id, "parent": parent_id, **extra}))
        return 0

    if pending_field(state, "request"):
        return decide("deliver", reason="request-pending")
    state = observe_blocked(directory, path, state,
                            {"requests": pending_requests(child_snapshot)}, helper_path())
    if (state.get("blocked") or {}) and not (state.get("blocked") or {}).get("resolved_at"):
        return decide("deliver", reason="blocked-notice-pending")
    state = observe_startup(directory, path, state, child_snapshot, max_age)
    if pending_field(state, "startup_notification"):
        return decide("deliver", reason="startup-notice-pending")
    if state.get("kind"):
        if state.get("acked_at"):
            return decide("settle")
        if not state.get("notification_delivered_at"):
            return decide("deliver", reason="notification-pending")
        # No acknowledgement means the integration is unproven. Remind an idle
        # parent, bounded per work round, without guessing which latestTurn is ours.
        age = minutes_since(state["notification_delivered_at"])
        attempts = state.get("reminders") or 0
        if age < retry_min:
            return decide("wait", reason="reminder-not-due")
        if attempts >= max_attempts:
            state["attention"] = "hand-back remains unacknowledged after reminder limit"
            write_json(path, state)
            return decide("attention", attention=state["attention"])
        if parent_snapshot is None or not thread_idle(parent_snapshot):
            return decide("wait", reason="parent-busy")
        state["notification"] = build_handback(directory, state, state["kind"], parent_id,
                                               helper_path(), now_iso(), str(uuid4()))
        state["notification_delivered_at"] = None
        state["reminders"] = attempts + 1
        write_json(path, state)
        return decide("remind", kind=state["kind"], attempts=attempts + 1)
    if not thread_idle(child_snapshot):
        return decide("wait", reason="child-busy")
    age = minutes_since(state["started_at"])
    # Never replay history just because recovery has been installed on a new host.
    # Old unresolved rounds stay in doctor rather than being silently forgotten.
    if age > max_age:
        state["attention"] = "idle round exceeded automatic recovery age; inspect its report and thread"
        write_json(path, state)
        return decide("attention", attention=state["attention"])
    # Initial thread creation and provider startup can precede the first turn.
    latest = ((child_snapshot.get("thread") or {}).get("latestTurn") or {}).get("state") or "none"
    if latest == "none" and age < 2:
        return decide("wait", reason="grace")
    resolved_at = (state.get("blocked") or {}).get("resolved_at") or ""
    if resolved_at and minutes_since(resolved_at) < 2:
        return decide("wait", reason="block-grace")
    report_path = state.get("recovery_report") or state["report"]
    kind = "failed"
    if report_is_usable(report_path):
        # Recover the child's own terminal status only from this round's status
        # tail. A report without an explicit terminal outcome is evidence, not
        # proof of success.
        kind = status_tail_kind(directory, state)
    elif age < 2:
        return decide("wait", reason="no-report-grace")
    else:
        report_path = str(path.parent / "RECOVERY.md")
        lines = ["# Recovery hand-back", "",
                 f"The child is idle without a report for round {state['round']}.",
                 f"Inspect thread {child_id}, the brief, and any commits before accepting its work.", ""]
        detail = provider_failure(child_snapshot, state)
        lines.append(f"Provider evidence: {detail or 'no current-round provider error detail available'}")
        Path(report_path).write_text("\n".join(lines) + "\n")
        state["recovery_report"] = report_path
        write_json(path, state)
    if kind == "blocked":
        state = observe_blocked(directory, path, state,
                                {"source": "report", "detail": Path(report_path).read_text()},
                                helper_path())
        return decide("recover", kind="blocked")
    # check_report re-verifies the recovered report before building the notice.
    check_report(state)
    state["notification"] = build_handback(directory, state, kind, parent_id,
                                           helper_path(), now_iso(), str(uuid4()))
    state["kind"] = kind
    state["notification_delivered_at"] = None
    write_json(path, state)
    return decide("recover", kind=kind)


def do_settled(directory, path, state):
    blocked = state.get("blocked") or {}
    if not state.get("acked_at"):
        raise ValueError("ack the current round before settling")
    if blocked.get("source") == "report" and not blocked.get("resolved_at"):
        raise ValueError("crew decision remains unresolved")
    if state.get("settled_at"):
        print(json.dumps(state))
        return 0
    # A crash after settle.accepted must not start another cleanup budget.
    _, accepted, _ = lifecycle_counts(directory, state["round"])
    if accepted > 0:
        state["settled_at"] = now_iso()
        write_json(path, state)
        print(json.dumps(state))
        return 0
    print("round is not settled through T3 yet", file=sys.stderr)
    return 3


def main():
    if sys.argv[1:2] == ["thread"]:
        return thread_question(sys.argv[2], sys.argv[3:])
    if sys.argv[1:2] == ["command"]:
        print(json.dumps(command_body(sys.argv[2], sys.argv[3:])))
        return 0
    action, root, *args = sys.argv[1:]
    directory = Path(root)
    if action == "lock":
        directory.mkdir(parents=True, exist_ok=True)
        # fcntl is in Python's Unix standard library. The kernel releases this
        # lock on exit, including crashes, without stale PID or mkdir recovery.
        with (directory / ".lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            env = dict(os.environ, T3_DISPATCH_LOCK_PID=str(os.getpid()))
            # Retain the lock in the shell if this supervisor is interrupted.
            result = subprocess.run(args, env=env, pass_fds=(lock.fileno(),))
            return result.returncode
    if action == "begin":
        # The send path pre-generates the round id so the follow-up text can
        # name its own round, report and notify command; dispatch omits it and
        # gets a fresh id. Either way the request body, when present, is saved
        # atomically with the round so no verb writes state.json from bash.
        rid = args[1] if len(args) > 1 else str(uuid4())
        target = directory / "rounds" / rid
        target.mkdir(parents=True)
        state = {
            "round": rid,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "report": str(target / "REPORT.md"),
            "status_baseline": int(args[0]),
            "execution_marker": f"started: round {rid}",
        }
        # Only the send path (which passes the round id) carries a request on
        # stdin. Dispatch must never read stdin: a caller whose stdin is an
        # open pipe would hang here forever.
        request = read_stdin_json(required=False) if len(args) > 1 else None
        if request:
            if request.get("type") != "thread.turn.start":
                raise ValueError("begin accepts only a thread.turn.start body on stdin")
            state["request"] = request
        # A crash before publishing the pointer leaves an unused round, never
        # half a current round. Reports from previous rounds are preserved.
        write_json(target / "state.json", state)
        write_json(directory / "current-round.json", {"round": rid})
        print(json.dumps(state))
        return 0
    if action == "event":
        name, pairs = args[0], args[1:]
        if len(pairs) % 2:
            raise ValueError("event takes key value pairs")
        fields = dict(zip(pairs[::2], pairs[1::2]))
        lifecycle_append(directory, name, **fields)
        return 0
    if action == "prepare":
        path, state = read_round(directory, args[0])
        print(json.dumps(do_prepare(directory, path, state, args[1])))
        return 0
    if action == "next-delivery":
        # A parent snapshot arrives on stdin only when the caller says so;
        # reading stdin implicitly hangs a caller whose stdin is an open pipe.
        path, state = read_round(directory, args[0])
        rest = [a for a in args[1:] if a != "--snapshot"]
        snapshot = read_stdin_json(required=True) if "--snapshot" in args else None
        do_next_delivery(directory, path, state, snapshot, rest[0] if rest else None)
        return 0
    if action == "delivered":
        path, state = read_round(directory, args[0])
        field, message_id = args[1], args[2]
        if field not in DELIVERY_FIELDS:
            raise ValueError(f"unknown delivery field: {field}")
        at = now_iso()
        if field == "notification":
            state["notification_delivered_at"] = at
            state["delivered_at"] = state.get("delivered_at") or at
        else:
            state[f"{field}_delivered_at"] = at
        write_json(path, state)
        lifecycle_append(directory, f"{field}.delivered", messageId=message_id, at=at)
        print(json.dumps(state))
        return 0
    if action == "attempted":
        path, state = read_round(directory, args[0])
        if args[1] not in DELIVERY_FIELDS:
            raise ValueError(f"unknown delivery field: {args[1]}")
        state[f"{args[1]}_attempted_at"] = now_iso()
        write_json(path, state)
        print(json.dumps(state))
        return 0
    if action == "ack":
        path, state = read_round(directory, args[0])
        if not state.get("delivered_at"):
            raise ValueError("round has no delivered hand-back")
        if not state.get("acked_at"):
            state["acked_at"] = now_iso()
            state["attention"] = None
            write_json(path, state)
            lifecycle_append(directory, "parent.acked", at=state["acked_at"])
        print(json.dumps(state))
        return 0
    if action == "observe":
        path, state = read_round(directory, args[0])
        return do_observe(directory, path, state, json.load(sys.stdin),
                          int(args[1]), int(args[2]), int(args[3]),
                          args[4] if len(args) > 4 else None)
    if action == "settled":
        path, state = read_round(directory, args[0])
        return do_settled(directory, path, state)
    if action == "cleanup":
        path, state = read_round(directory, args[0])
        print(cleanup_action(directory, path, state, json.load(sys.stdin), int(args[1])))
        return 0
    if action == "ack-blocked":
        path, state = read_round(directory, args[0])
        if (state.get("blocked") or {}).get("id") != args[1]:
            raise ValueError("stale blocked notice; read the current notice before acknowledging")
        if not state.get("blocked_notification_delivered_at"):
            raise ValueError("blocked notice has not been delivered")
        if not state.get("blocked_acked_at"):
            state["blocked_acked_at"] = datetime.now(timezone.utc).isoformat()
            write_json(path, state)
            lifecycle_append(directory, "blocked.acked", block=args[1], at=state["blocked_acked_at"])
        return 0
    if action == "read":
        path, state = read_round(directory, args[0] if args else None)
        print(json.dumps(state))
        return 0
    raise ValueError(f"unknown state action: {action}")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError) as error:
        print(f"t3-dispatch: {error}", file=sys.stderr)
        sys.exit(1)
