#!/usr/bin/env bash

set -euo pipefail
umask 077

die() { echo "t3-dispatch: $*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

CREW_HOME="${T3_DISPATCH_HOME:-$HOME/.local/state/t3-crew}"
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/t3-dispatch.sh"
STATE_HELPER="$(dirname "$SCRIPT_PATH")/t3-dispatch-state.py"
PROVIDER_USAGE="$(dirname "$SCRIPT_PATH")/provider-usage.ts"
T3_BASE="${T3_DISPATCH_BASE_DIR:-$HOME/.t3}"
STATE_DIR="$T3_BASE/userdata"
STATE_DB="$STATE_DIR/state.sqlite"
PARENT_CACHE_DIR="$CREW_HOME/.parent"
MARKER="${T3_DISPATCH_MARKER:-🚢}"
PARENT_TITLE_MAX="${T3_DISPATCH_PARENT_TITLE_MAX:-24}"
STALL_MAX_AGE_MIN="${T3_DISPATCH_STALL_MAX_AGE_MIN:-720}"
# Remind an idle parent of an unacknowledged round, bounded per round.
WAKE_RETRY_MIN="${T3_DISPATCH_WAKE_RETRY_MIN:-15}"
WAKE_MAX_ATTEMPTS="${T3_DISPATCH_WAKE_MAX_ATTEMPTS:-4}"
PARENT_TITLE=""
SESSION_ID="" TOKEN="" ORIGIN=""
RECEIPT_DIR=""

receipt() {
  [ -n "$RECEIPT_DIR" ] || return 0
  [ -f "$RECEIPT_DIR/dispatch.result" ] || printf '%s\n' "$1" >"$RECEIPT_DIR/dispatch.result"
}

on_exit() {
  local rc=$?
  receipt "failed dispatch ended without recording an outcome (shell exit $rc)"
  revoke_session
}
# trap armed only during dispatch mutations

revoke_session() {
  [ -n "$SESSION_ID" ] || return 0
  t3 auth session revoke --base-dir "$T3_BASE" "$SESSION_ID" >/dev/null 2>&1 || true
  SESSION_ID="" TOKEN=""
}

uuid() { python3 -c "import uuid; print(uuid.uuid4())"; }
nowiso() {
  python3 -c "import datetime; print(datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'))"
}

# Lifecycle history belongs to the Round module: transport outcomes are
# reported through `state.py event`, transitions record their own events.
# Best-effort like the old lifecycle_event pipeline: a history gap must never
# flip a transport outcome that already happened server-side.
round_event() {
  python3 "$STATE_HELPER" event "$@" || true
}

thread_ask() { python3 "$STATE_HELPER" thread "$@"; }
# ...and every orchestration command body comes from here (create, turn, stop,
# settle), ids included. Bash reads an id back only to record it.
command_body() { python3 "$STATE_HELPER" command "$@"; }

t3_init() {
  [ -n "$ORIGIN" ] && return 0
  for c in curl python3 t3; do require_cmd "$c"; done
  python3 -c "import json, fcntl" >/dev/null 2>&1 || die "python3 is installed but unusable; select a working Python 3 on PATH"
  [ -f "$STATE_DIR/server-runtime.json" ] || die "no server-runtime.json at $STATE_DIR (is T3 Code running?)"
  local pid
  IFS=$'\t' read -r ORIGIN pid <<<"$(python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
print(d['origin']+chr(9)+str(d['pid']))" "$STATE_DIR/server-runtime.json")"
  # The server runs as this user out of this home directory, so a plain
  # signal-0 probe is an equivalent liveness check with no interpreter.
  kill -0 "$pid" 2>/dev/null || die "recorded T3 server pid $pid is not alive"
}

issue_session() {
  t3_init
  local out="" errf attempt=1
  while :; do
    errf="$(mktemp)"
    if out="$(t3 auth session issue --base-dir "$T3_BASE" --ttl 10m --json 2>"$errf")"; then
      rm -f "$errf"
      IFS=$'\t' read -r SESSION_ID TOKEN <<<"$(printf '%s' "$out" | python3 -c "
import json,sys
d=json.load(sys.stdin); print(d['sessionId']+chr(9)+d.get('token',''))")"
      [ -n "$TOKEN" ] || { revoke_session; die "issued session carried no token"; }
      return 0
    fi
    out="$(printf '%s\n' "$out"; cat "$errf")"; rm -f "$errf"
    if printf '%s' "$out" | grep -q 'database is locked' && [ "$attempt" -lt 3 ]; then
      sleep "$([ "$attempt" -eq 1 ] && echo 0.3 || echo 0.8)"
      attempt=$((attempt + 1))
      continue
    fi
    break
  done
  die "t3 auth session issue failed — safe to retry"
}

API_HTTP=""
api() {
  local method="$1" path="$2" body="${3-}" raw="" rc=0
  if [ -n "$body" ]; then
    raw="$(printf '%s' "$body" \
      | curl -sS --connect-timeout 5 --max-time 120 -w $'\n%{http_code}' \
             -X "$method" -H @<(printf 'Authorization: Bearer %s' "$TOKEN") \
             -H 'Content-Type: application/json' --data-binary @- \
             "$ORIGIN$path")" || rc=$?
  else
    raw="$(printf 'Authorization: Bearer %s' "$TOKEN" \
      | curl -sS --connect-timeout 5 --max-time 120 -w $'\n%{http_code}' \
             -X "$method" -H @- "$ORIGIN$path")" || rc=$?
  fi
  [ "$rc" -eq 0 ] || { echo "t3-dispatch: transport failure $method $path (curl $rc)" >&2; return 22; }
  API_HTTP="${raw##*$'\n'}"
  local out="${raw%$'\n'*}"
  case "$API_HTTP" in
    2*) printf '%s' "$out"; return 0 ;;
    *) echo "t3-dispatch: $method $path HTTP $API_HTTP (response body omitted)" >&2; return 22 ;;
  esac
}

dispatch() {
  local out
  out="$(api POST /api/orchestration/dispatch "$1")" || return 22
  printf '%s' "$out" | python3 -c "
import json,sys
raw=sys.stdin.read().strip()
if not raw: sys.exit(0)
try: d=json.loads(raw)
except Exception: print('non-JSON dispatch response (body omitted)', file=sys.stderr); sys.exit(1)
if isinstance(d,dict) and (d.get('_tag') or d.get('error')):
    print('dispatch rejected (response body omitted)', file=sys.stderr); sys.exit(1)
" || return 23
  printf '%s' "$out"
}

resolve_project() {
  local want="$1"
  api GET /api/orchestration/snapshot | thread_ask project "$want" || die "no project matching '$want'"
}

require_parent_thread() {
  local thread_id="$1" project_id="$2"
  local body tid pid
  body="$(api GET "/api/orchestration/threads/$thread_id")" || \
    die "--parent-thread '$thread_id' is not a readable T3 thread"
  IFS=$'\t' read -r tid pid PARENT_TITLE <<<"$(printf '%s' "$body" | thread_ask identity)"
  [ "$tid" = "$thread_id" ] || die "--parent-thread resolved to a different id"
  [ "$pid" = "$project_id" ] || die "--parent-thread is not in the chosen project (got $pid)"
}

validate_model_selection() {
  require_cmd bun
  bun "$(dirname "$SCRIPT_PATH")/t3-model-selection.ts" "$1" "$2" "$3"
}

# Revalidate each new correction; saved delivery retries keep their exact body.
crew_model_selection() {
  local dir="$1" instance model effort
  IFS=$'\t' read -r instance model effort <<<"$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d["instance"]+"\t"+d["model"]+"\t"+(d.get("effort") or ""))' "$dir/meta.json")"
  validate_model_selection "$instance" "$model" "$effort"
}

capacity_probe() {
  local instance="$1" out=""
  out="$(CREW_USAGE_TIMEOUT_SECONDS="${CREW_USAGE_TIMEOUT_SECONDS:-20}" \
         bun "$PROVIDER_USAGE" --json --providers "$instance" 2>/dev/null)" \
    || { printf '{"verdict":"no-data","reason":"probe-failed","instance":"%s"}\n' "$instance"; return 0; }
  printf '%s' "$out" | python3 -c "
import json,sys
try:
    d = json.load(sys.stdin)
    p = (d.get('providers') or [None])[0]
    if not p: raise ValueError
except Exception:
    print(json.dumps({'verdict':'no-data','reason':'probe-unparseable'})); sys.exit(0)
print(json.dumps({'verdict': p.get('verdict') or 'no-data',
                  'status': p.get('status'), 'provider': p.get('provider'),
                  'instance': sys.argv[1], 'reason': p.get('reason'),
                  'effectiveRemainingPercent': p.get('effectiveRemainingPercent'),
                  'checkedAt': d.get('checkedAt')}))" "$instance" \
    || printf '{"verdict":"no-data","reason":"probe-unparseable"}\n'
}

capacity_field() { printf '%s' "$1" | python3 -c "
import json,sys
print(json.load(sys.stdin).get(sys.argv[1]) or '')" "$2" 2>/dev/null; }

stop_thread() {
  local body
  body="$(command_body stop "$1")" || return 22
  dispatch "$body" >/dev/null
}

settle_thread() {
  local thread_id="$1" crew_dir="${2-}" snapshot st body settle_out settle_seq settle_cmd
  snapshot="$(api GET "/api/orchestration/threads/$thread_id")" || return 22
  st="$(printf '%s' "$snapshot" | thread_ask idle)"
  [ "$st" = "idle" ] || return 4
  body="$(command_body settle "$thread_id")" || return 22
  settle_cmd="$(capacity_field "$body" commandId)"
  local settle_tmp
  settle_tmp="$(mktemp)"
  if ! dispatch "$body" >"$settle_tmp"; then
    settle_out=""
    rm -f "$settle_tmp"
    [ -n "$crew_dir" ] && round_event "$crew_dir" settle.attempt threadId "$thread_id" commandId "$settle_cmd" outcome failed at "$(nowiso)"
    return 22
  fi
  settle_out="$(<"$settle_tmp")"
  rm -f "$settle_tmp"
  settle_seq="$(printf '%s' "$settle_out" | python3 -c "import json,sys; print((json.load(sys.stdin).get('sequence') or ''))" 2>/dev/null || true)"
  [ -n "$crew_dir" ] && round_event "$crew_dir" settle.accepted threadId "$thread_id" commandId "$settle_cmd" sequence "$settle_seq" at "$(nowiso)"

  # HTTP settle does not park a ready session. Cleanup is best effort.
  local pre_session stop_cmd stop_body stop_outcome
  pre_session="$(printf '%s' "$snapshot" | thread_ask session)"
  if [ "$pre_session" = stopped ] || [ "$pre_session" = absent ]; then
    [ -n "$crew_dir" ] && round_event "$crew_dir" cleanup.verified threadId "$thread_id" at "$(nowiso)"
  else
    stop_body="$(command_body stop "$thread_id" --only-if-settled "$settle_cmd")" || return 22
    stop_cmd="$(capacity_field "$stop_body" commandId)"
    [ -n "$crew_dir" ] && round_event "$crew_dir" cleanup.attempt threadId "$thread_id" commandId "$stop_cmd" at "$(nowiso)"
    if dispatch "$stop_body" >/dev/null 2>/dev/null; then stop_outcome=accepted; else stop_outcome=failed; fi
    [ -n "$crew_dir" ] && round_event "$crew_dir" cleanup.outcome threadId "$thread_id" commandId "$stop_cmd" outcome "$stop_outcome" at "$(nowiso)"
  fi
}

reconcile_cleanup() {
  local thread_id="$1" dir="$2" action state rid stop_cmd stop_body outcome
  state="$(round_state "$dir")"; rid="$(round_field "$state" round)"
  snapshot="$(api GET "/api/orchestration/threads/$thread_id")" || return 1
  action="$(printf '%s' "$snapshot" | python3 "$STATE_HELPER" cleanup "$dir" "$rid" "$STALL_MAX_AGE_MIN")" || return 1
  case "$action" in
    none|verified|abandoned|wait) return 0 ;;
    attention) do_deliver "$dir" "$rid" cleanup_notification || return 1 ;;
    retry)
      stop_body="$(command_body stop "$thread_id" --only-if-settled "cmd-$(uuid | tr -d -)")" || return 1
      stop_cmd="$(capacity_field "$stop_body" commandId)"
      round_event "$dir" cleanup.attempt threadId "$thread_id" commandId "$stop_cmd" at "$(nowiso)"
      if dispatch "$stop_body" >/dev/null 2>/dev/null; then outcome=accepted; else outcome=failed; fi
      round_event "$dir" cleanup.outcome threadId "$thread_id" commandId "$stop_cmd" outcome "$outcome" at "$(nowiso)"
      ;;
    *) echo "t3-dispatch: unknown cleanup action: $action" >&2; return 1 ;;
  esac
}

ASSERT_REASON=""
provider_failure() {
  printf '%s' "$2" | thread_ask failure "$1"
}
assert_launched() {
  local crew_dir="$1" thread_id="$2" baseline="$3" waited=0 snap ts lines
  while [ "$waited" -lt 30 ]; do
    snap="$(api GET "/api/orchestration/threads/$thread_id")" || return 0
    lines="$(wc -l < "$crew_dir/status" | tr -d ' ')"
    [ "$lines" -gt "$baseline" ] && return 0
    ts="$(printf '%s' "$snap" | thread_ask turn)"
    case "$ts" in
      completed|error|interrupted)
        ASSERT_REASON="$(provider_failure "$crew_dir" "$snap")" || ASSERT_REASON=""
        ASSERT_REASON="${ASSERT_REASON:-turn $ts before a crew status update; provider error detail unavailable}"
        return 3 ;;
    esac
    sleep 2; waited=$((waited+2))
  done
  return 0
}

# compose_title <parent-title> <task-segment> -> "🚢 parser investigation · reproduce-error"
# The sidebar shows who dispatched the child, not just what it does. The parent
# segment is clamped tail-first, so the leading words — the ones that tell two
# sibling conversations apart — survive. A parent that is itself a crew thread
# sheds its marker, so nesting never stacks boats.
compose_title() {
  MARKER="$MARKER" PMAX="$PARENT_TITLE_MAX" PARENT_TITLE="$1" TASK="$2" python3 -c "
import os
marker=os.environ['MARKER'].strip()
parent=' '.join(os.environ['PARENT_TITLE'].split())
if marker and parent.startswith(marker):
    parent=parent[len(marker):].strip()
task=os.environ['TASK'].strip()
try: pmax=int(os.environ['PMAX'])
except ValueError: pmax=24
if parent and len(parent)>pmax:
    parent=parent[:max(pmax-1,1)]+'…'
print(' '.join(x for x in [marker, ' · '.join(y for y in [parent, task] if y)] if x))
"
}

crew_dir_for() {
  local id="$1"
  [[ "$id" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}$ ]] || die "bad id: $id"
  printf '%s/%s' "$CREW_HOME" "$id"
}

# --- verbs -------------------------------------------------------------------

caller_key() {
  local key="${CLAUDE_CODE_SESSION_ID:-${CODEX_THREAD_ID:-${CODEX_COMPANION_SESSION_ID:-${CURSOR_CONVERSATION_ID:-}}}}"
  # T3 Code's opencode-go instances export no session id — only the serving
  # process id (OPENCODE_PID). A PID can be recycled, so pair it with that
  # process's start time: one cache entry per live session, never a stale one.
  if [ -z "$key" ] && [ -n "${OPENCODE_PID:-}" ]; then
    local started
    started="$(ps -o lstart= -p "$OPENCODE_PID" 2>/dev/null | tr -s ' ' | tr ' ' '-')"
    key="opencode-${OPENCODE_PID}-${started:-unknown}"
  fi
  printf '%s' "${key:-unknown}"
}

# T3 stamps Claude and Codex events with the harness id as providerThreadId
# inside a per-thread log file. Cursor stamps CURSOR_CONVERSATION_ID on native
# payload sessionId (and may omit providerThreadId). The filename answers
# "which thread am I" with no round trip. Exactly one matching thread or
# nothing: an ambiguous hit falls through to the nonce proof.
resolve_from_logs() {
  local key="$1" hits
  [ -n "$key" ] && [ "$key" != "unknown" ] || return 1
  hits="$(grep -l -F -e "\"providerThreadId\":\"$key\"" -e "\"sessionId\":\"$key\"" "$STATE_DIR"/logs/provider/events.*.log* 2>/dev/null \
    | sed -E 's#.*/events\.([0-9a-f-]{36})\.log.*#\1#' | sort -u)"
  [ "$(printf '%s' "$hits" | grep -c .)" -eq 1 ] || return 1
  printf '%s\n' "$hits"
}
cached_parent_thread() {
  local key tid; key="$(caller_key)"
  [ "$key" = "unknown" ] && return 0
  if [ -s "$PARENT_CACHE_DIR/$key" ]; then cat "$PARENT_CACHE_DIR/$key"; return 0; fi
  if tid="$(resolve_from_logs "$key")"; then
    mkdir -p "$PARENT_CACHE_DIR"; printf '%s\n' "$tid" >"$PARENT_CACHE_DIR/$key"; printf '%s\n' "$tid"
  fi
  return 0
}

cmd_resolve() {
  local forget=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --forget) forget=1; shift ;;
      *) die "usage: resolve [--forget]" ;;
    esac
  done
  local key; key="$(caller_key)"
  [ "$key" != "unknown" ] || die "resolve: no harness session id in the environment — cannot identify this thread"
  mkdir -p "$PARENT_CACHE_DIR"
  local cache="$PARENT_CACHE_DIR/$key" pending="$PARENT_CACHE_DIR/$key.nonce"
  if [ "$forget" -eq 1 ]; then rm -f "$cache" "$pending"; fi
  if [ -s "$cache" ]; then cat "$cache"; return 0; fi
  local tid
  if tid="$(resolve_from_logs "$key")"; then
    printf '%s\n' "$tid" >"$cache"; rm -f "$pending"; printf '%s\n' "$tid"; return 0
  fi
  [ -r "$STATE_DB" ] || die "resolve: cannot read $STATE_DB"
  local nonce
  if [ -s "$pending" ]; then
    nonce="$(cat "$pending")"
    local tid
    tid="$(sqlite3 "file:$STATE_DB?immutable=1" \
      "select thread_id from projection_thread_messages where role='assistant' and text like '%${nonce}%' order by created_at desc limit 1;" 2>/dev/null || true)"
    if [ -n "$tid" ]; then
      printf '%s\n' "$tid" >"$cache"
      rm -f "$pending"
      printf '%s\n' "$tid"
      return 0
    fi
  else
    nonce="t3parent-$(date +%s)-${RANDOM}${RANDOM}"
    printf '%s\n' "$nonce" >"$pending"
  fi
  cat >&2 <<EOF
resolve: this thread's identity is not yet proven, and it cannot be guessed from a
title. Use the returned identity proof.

Print this token verbatim in your next reply, then run 'resolve' again:

  $nonce

EOF
  return 2
}

cmd_whoami() {
  local project=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --project) project="$2"; shift 2 ;;
      *) die "usage: whoami --project <name|id>" ;;
    esac
  done
  [ -n "$project" ] || die "--project is required"
  issue_session
  local project_id; project_id="$(resolve_project "$project")"
  api GET /api/orchestration/snapshot | thread_ask list "$project_id"
  revoke_session
}

cmd_status() {
  local id="${1-}"
  [ -n "$id" ] || die "usage: status <id>"
  local dir; dir="$(crew_dir_for "$id")"
  [ -d "$dir" ] || die "unknown crew id: $id (no $dir)"
  local state report="$dir/REPORT.md"
  if [ -f "$dir/current-round.json" ]; then
    state="$(round_state "$dir")"; printf '%s\n' "$state"
    report="$(round_field "$state" recovery_report)"
    [ -n "$report" ] || report="$(round_field "$state" report)"
  fi
  echo "== meta =="; [ -f "$dir/meta.json" ] && cat "$dir/meta.json" || echo "(none)"
  echo "== status =="; [ -f "$dir/status" ] && cat "$dir/status" || echo "(none)"
  echo "== dispatch.result =="; [ -f "$dir/dispatch.result" ] && cat "$dir/dispatch.result" || echo "(none)"
  echo "== report: $report =="; [ -f "$report" ] && wc -c "$report" || echo "(not written)"
  if [ -f "$dir/meta.json" ]; then
    issue_session
    local child
    child="$(crew_child "$dir")"
    if [ -n "$child" ]; then
      echo "== child thread =="
      local snap=""
      if ! snap="$(api GET "/api/orchestration/threads/$child")"; then
        echo "(unreadable: request for thread $child failed — see error above)"
      elif ! printf '%s' "$snap" | thread_ask describe; then
        echo "(unreadable: parse failed)"
      fi
    fi
    revoke_session
  fi
}

cmd_dispatch() {
  local id="" instance="" model="" parent="" brief="" effort="" project="" title="" workdir="" allow_low=""
  local force_parent=0 runtime_mode="approval-required"
  while [ $# -gt 0 ]; do
    case "$1" in
      --allow-low) allow_low=1; shift ;;
      --id) id="$2"; shift 2 ;;
      --instance) instance="$2"; shift 2 ;;
      --model) model="$2"; shift 2 ;;
      --parent-thread) parent="$2"; shift 2 ;;
      --force-parent) force_parent=1; shift ;;
      --brief-file) brief="$2"; shift 2 ;;
      --effort) effort="$2"; shift 2 ;;
      --project) project="$2"; shift 2 ;;
      --title) title="$2"; shift 2 ;;
      --workdir) workdir="$2"; shift 2 ;;
      --runtime-mode) runtime_mode="$2"; shift 2 ;;
      *) die "unknown flag: $1" ;;
    esac
  done
  [ -n "$id" ] && [ -n "$instance" ] && [ -n "$model" ] && [ -n "$parent" ] && [ -n "$brief" ] || \
    die "usage: dispatch --id <slug> --instance <id> --model <m> --parent-thread <uuid> --brief-file <path> --workdir <path> [--effort] --project <name|id> [--runtime-mode <mode>] [--title] [--allow-low] [--force-parent]"
  [ -n "$project" ] || die "--project is required"
  case "$runtime_mode" in
    approval-required|auto-accept-edits|auto|full-access) ;;
    *) die "unsupported --runtime-mode: $runtime_mode" ;;
  esac
  [ -f "$brief" ] || die "brief not found: $brief"
  [ -n "$workdir" ] || \
    die "--workdir is required: the directory the child works in (its target repo, or $CREW_HOME/$id for repo-less work)."

  local self_thread; self_thread="$(cached_parent_thread)"
  [ -n "$self_thread" ] || die "caller identity is unproven. Run '$SCRIPT_PATH resolve' in the calling T3 session before dispatch. --force-parent changes the destination only; it cannot bypass identity proof."
  [[ "$self_thread" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]] || die "caller identity is malformed. Run '$SCRIPT_PATH resolve --forget' to rebuild its proof."
  if [ "$self_thread" != "$parent" ] && [ "$force_parent" -eq 0 ]; then
    die "--parent-thread $parent is not this thread ($self_thread). Hand-backs would wake a different session. Fix the id, or pass --force-parent if you genuinely mean to notify another thread."
  fi
  if [ "$self_thread" != "$parent" ]; then
    echo "t3-dispatch: explicit notification destination override: caller=$self_thread parent=$parent" >&2
  fi

  local selection
  selection="$(validate_model_selection "$instance" "$model" "$effort")" || die "choose a catalog-supported model and effort before dispatch"

  # Gates run before crew metadata or T3 thread creation. The lock wrapper may
  # already have created the directory's lock file.
  local capacity capacity_verdict
  capacity="$(capacity_probe "$instance")"
  capacity_verdict="$(capacity_field "$capacity" verdict)"
  case "$capacity_verdict" in
    skip)
      die "refusing to dispatch: provider capacity for --instance $instance is exhausted ($(capacity_field "$capacity" reason)). Choose another eligible model or wait for capacity to reset" ;;
    no-data) echo "t3-dispatch: capacity unavailable for $instance ($(capacity_field "$capacity" reason)); proceeding with unknown headroom" >&2 ;;
    avoid)
      [ -n "$allow_low" ] || \
        die "refusing to dispatch: provider capacity for --instance $instance is low ($(capacity_field "$capacity" effectiveRemainingPercent)% remaining). Prefer an eligible provider with more headroom, or pass --allow-low if this provider is uniquely capable for the task" ;;
  esac

  local dir; dir="$(crew_dir_for "$id")"
  if [ -d "$dir" ] && [ -f "$dir/meta.json" ]; then
    die "crew id already exists: $dir — pick a new --id"
  fi
  mkdir -p "$dir"
  # Validated after mkdir so `--workdir $CREW_HOME/<id>` (repo-less work) exists.
  [ -d "$workdir" ] || die "--workdir does not exist: $workdir"
  [ "$brief" -ef "$dir/brief.md" ] || cp "$brief" "$dir/brief.md"
  : >"$dir/status"
  : >"$dir/lifecycle.jsonl"

  trap on_exit EXIT
  [ -n "$project" ] || die "--project is required"
  issue_session
  local project_id; project_id="$(resolve_project "$project")"
  require_parent_thread "$parent" "$project_id"

  local task_seg="${title:-$id}"
  title="$(compose_title "$PARENT_TITLE" "$task_seg")"

  rm -f "$dir/dispatch.result"
  RECEIPT_DIR="$dir"

  local thread_id created
  thread_id="$(uuid)"
  created="$(nowiso)"

  local create_body
  create_body="$(command_body create "$dir" "$thread_id" "$project_id" "$title" "$selection" "$workdir" "$runtime_mode")" \
    || { revoke_session; die "thread.create body could not be built"; }
  dispatch "$create_body" >/dev/null || { revoke_session; die "thread.create rejected"; }

  python3 -c "
import json, pathlib, sys
pathlib.Path(sys.argv[1]).write_text(json.dumps({
  'id': sys.argv[2],
  'parent_thread': sys.argv[3],
  'child_thread': sys.argv[4],
  'instance': sys.argv[5],
  'model': sys.argv[6],
  'effort': sys.argv[7] or None,
  'project_id': sys.argv[8],
  'title': sys.argv[9],
  'workdir': sys.argv[10] or None,
  'created_at': sys.argv[11],
  'capacity_verdict': sys.argv[12] or None,
  'capacity_allow_low': bool(sys.argv[13]),
  'caller_thread': sys.argv[14],
  'parent_override': sys.argv[14] != sys.argv[3],
  'runtime_mode': sys.argv[15],
}, indent=2)+'\n')
" "$dir/meta.json" "$id" "$parent" "$thread_id" "$instance" "$model" "$effort" \
  "$project_id" "$title" "$workdir" "$created" "$capacity_verdict" "$allow_low" "$self_thread" "$runtime_mode"

  local round_json rid report
  round_json="$(python3 "$STATE_HELPER" begin "$dir" "$(wc -l < "$dir/status")")"
  rid="$(round_field "$round_json" round)"; report="$(round_field "$round_json" report)"
  # The crewmate contract (started marker, REPORT.md, notify) is one template
  # in the Thread Protocol; the child is told which script to call from there.
  local turn_body
  turn_body="$(command_body turn brief "$dir" "$thread_id" "$selection" "$rid")" \
    || { echo "failed: turn body could not be built" >>"$dir/status"; revoke_session; die "turn body could not be built"; }

  if ! dispatch "$turn_body" >/dev/null; then
    echo "failed: thread.turn.start rejected" >>"$dir/status"
    local stopped=""
    stop_thread "$thread_id" >/dev/null 2>&1 && stopped=" (thread $thread_id stopped)"
    revoke_session
    die "thread.turn.start rejected — half-dispatch cleaned up$stopped; pick a new --id"
  fi

  # Written before the assertion so the child's terminal line always lands after
  # it — a fast child can finish inside the assertion window.
  echo "working: dispatched t3 thread $thread_id ($instance/$model${effort:+ @$effort}) parent $parent" >>"$dir/status"

  # Accepted is not launched. Catch the corpse before printing a thread id.
  # Baseline is the status line count now: any line the child adds proves it ran.
  local status_baseline; status_baseline="$(wc -l < "$dir/status" | tr -d ' ')"
  if ! assert_launched "$dir" "$thread_id" "$status_baseline"; then
    echo "failed: died on arrival — $ASSERT_REASON" >>"$dir/status"
    local stopped=""
    stop_thread "$thread_id" >/dev/null 2>&1 && stopped=" (thread $thread_id stopped)"
    receipt "failed $ASSERT_REASON"
    RECEIPT_DIR=""
    trap - EXIT
    revoke_session
    die "child died on arrival ($instance/$model): $ASSERT_REASON$stopped — check the model id and provider capacity, then redispatch under a new --id"
  fi

  receipt "ok $thread_id"
  RECEIPT_DIR=""
  trap - EXIT
  revoke_session
  echo "$thread_id"
  # Parent-facing, stderr so it never pollutes the captured thread id.
  cat >&2 <<EOF
dispatched $id — END YOUR TURN NOW. Report what is running and stop.
  The child's \`notify\` posts the hand-back to your thread and verifies delivery.
  Do NOT poll: no sleep loops, no tail on $dir/status, no repeat \`status\` calls.
  Continue independent work, then end this turn and wait for the notification.
EOF
}

round_state() { python3 "$STATE_HELPER" read "$@"; }
round_field() { capacity_field "$1" "$2"; }
require_round() {
  [ -n "$2" ] || die "--round is required; read the round id and report path with status $(basename "$1")"
  round_state "$1" "$2"
}

crew_child() {
  capacity_field "$(cat "$1/meta.json")" child_thread
}

# The request body is saved before I/O. Replaying uses the same message and
# command IDs; a lost response is checked against the thread before resending.
# next-delivery output is a TSV header (field, thread, message) plus the body
# JSON on the second line, so this transport loop parses no JSON itself.
do_deliver() {
  local dir="$1" rid="$2" want="${3-}" pending field target msg body snap waited=0
  if [ -n "$want" ]; then
    pending="$(python3 "$STATE_HELPER" next-delivery "$dir" "$rid" "$want")" || return 1
  else
    pending="$(python3 "$STATE_HELPER" next-delivery "$dir" "$rid")" || return 1
  fi
  [ -n "$pending" ] || return 0
  IFS=$'\t' read -r field target msg <<<"$(printf '%s' "$pending" | head -n 1)"
  body="$(printf '%s' "$pending" | tail -n +2)"
  issue_session
  snap="$(api GET "/api/orchestration/threads/$target")" || return 1
  if ! message_present "$snap" "$msg"; then
    if [ -n "$want" ]; then
      pending="$(printf '%s' "$snap" | python3 "$STATE_HELPER" next-delivery "$dir" "$rid" "$want" --snapshot)" || return 1
    else
      pending="$(printf '%s' "$snap" | python3 "$STATE_HELPER" next-delivery "$dir" "$rid" --snapshot)" || return 1
    fi
    [ -n "$pending" ] || return 0
    IFS=$'\t' read -r field target msg <<<"$(printf '%s' "$pending" | head -n 1)"
    body="$(printf '%s' "$pending" | tail -n +2)"
    python3 "$STATE_HELPER" attempted "$dir" "$rid" "$field" >/dev/null || return 1
    dispatch "$body" >/dev/null || return 1
    while :; do
      snap="$(api GET "/api/orchestration/threads/$target")" || return 1
      message_present "$snap" "$msg" && break
      [ "$waited" -lt 12 ] || return 1
      sleep 2; waited=$((waited + 2))
    done
  fi
  python3 "$STATE_HELPER" delivered "$dir" "$rid" "$field" "$msg" >/dev/null || return 1
}

message_present() {
  printf '%s' "$1" | thread_ask has-message "$2"
}

pending_requests() {
  printf '%s' "$1" | thread_ask pending
}

cmd_ack_blocked() {
  local id="${1-}" rid="${3-}" block="${5-}" dir
  [ "$#" -eq 5 ] && [ "${2-}" = --round ] && [ "${4-}" = --block ] || die "usage: ack-blocked <id> --round <uuid> --block <uuid>"
  dir="$(crew_dir_for "$id")"
  python3 "$STATE_HELPER" ack-blocked "$dir" "$rid" "$block" || return 1
  echo "acknowledged blocked notice $block; the decision is still separate"
}

cmd_notify() {
  local id="${1-}" rid="" kind=""; shift || true
  while [ $# -gt 0 ]; do
    case "$1" in
      --kind) kind="$2"; shift 2 ;;
      --round) rid="$2"; shift 2 ;;
      *) die "usage: notify <id> --round <uuid> --kind <done|failed|blocked>" ;;
    esac
  done
  case "$kind" in done|failed|blocked) ;; *) die "--kind must be done, failed or blocked" ;; esac
  local dir state report
  dir="$(crew_dir_for "$id")"; state="$(require_round "$dir" "$rid")"
  # prepare owns the report check, the completion guards, the hand-back and
  # blocked notice bodies, and the report-block resolution. It keeps the saved
  # notification on retries, so re-notify after a transport failure is safe.
  state="$(python3 "$STATE_HELPER" prepare "$dir" "$rid" "$kind")" || return 1
  report="$(round_field "$state" recovery_report)"
  [ -n "$report" ] || report="$(round_field "$state" report)"
  if [ "$kind" = blocked ]; then
    do_deliver "$dir" "$rid" blocked_notification || die "blocked notice pending; sweep retries it"
    echo "blocked: notified parent for round $rid" >>"$dir/status"
    echo "delivered blocked notice for round $rid"
    return 0
  fi
  [ -z "$(round_field "$state" acked_at)" ] || { echo "already acknowledged $rid"; return 0; }
  [ -z "$(round_field "$state" notification_delivered_at)" ] || { echo "already delivered $rid"; return 0; }
  if ! do_deliver "$dir" "$rid" notification; then
    echo "pending: round $rid notification will retry on sweep" >>"$dir/status"
    die "notification pending for round $rid; sweep retries the saved request"
  fi
  echo "$kind: notified parent for round $rid" >>"$dir/status"
  echo "delivered round=$rid report=$report"
}

cmd_send() {
  local id="${1-}" msg="" msg_file=""; shift || true
  while [ $# -gt 0 ]; do
    case "$1" in
      --message) msg="$2"; shift 2 ;;
      --message-file) msg_file="$2"; shift 2 ;;
      *) die "usage: send <id> --message <text> | --message-file <path>" ;;
    esac
  done
  [ -z "$msg_file" ] || msg="$(cat "$msg_file")"
  [ -n "$msg" ] || die "send requires a message"
  local dir state rid child body report selection
  dir="$(crew_dir_for "$id")"
  [ -f "$dir/meta.json" ] || die "unknown crew: $id"
  if [ -f "$dir/current-round.json" ]; then
    state="$(round_state "$dir")"
    if [ -n "$(round_field "$state" request)" ] && [ -z "$(round_field "$state" request_delivered_at)" ]; then
      die "a follow-up is already pending delivery; sweep retries it before another round can start"
    fi
  fi
  child="$(crew_child "$dir")"
  # An ordinary turn message is not a response to a provider request.
  issue_session
  local caller previous
  caller="$(cached_parent_thread)"
  [ -n "$caller" ] || die "caller identity is unproven. Run '$SCRIPT_PATH resolve' in the calling T3 session before send."
  previous="$(capacity_field "$(cat "$dir/meta.json")" parent_thread)"
  if [ "$caller" != "$previous" ]; then
    require_parent_thread "$caller" "$(capacity_field "$(cat "$dir/meta.json")" project_id)"
    python3 -c '
import json, sys
path = sys.argv[1]
meta = json.load(open(path))
meta["parent_thread"] = meta["caller_thread"] = sys.argv[2]
meta["parent_override"] = False
tmp = path + ".tmp"
json.dump(meta, open(tmp, "w"), indent=2)
__import__("os").replace(tmp, path)
' "$dir/meta.json" "$caller"
    echo "parent: $previous -> $caller (sender of the next round)" >>"$dir/status"
    echo "Hand-backs for $id now go to this thread ($caller), not $previous." >&2
  fi
  local snap pending
  snap="$(api GET "/api/orchestration/threads/$child")" || die "cannot check pending provider requests before follow-up"
  pending="$(pending_requests "$snap")"
  [ "$pending" = '[]' ] || die "child has a pending approval or input card; respond in T3 before sending another round"
  selection="$(crew_model_selection "$dir")" || die "choose a catalog-supported model and effort before starting another round"
  # The round id is pre-generated so the follow-up text can name its own
  # round, report path and notify command; begin saves the request atomically
  # with the round, so no caller writes state.json from bash.
  rid="$(uuid)"
  local msg_tmp; msg_tmp="$(mktemp)"
  printf '%s' "$msg" >"$msg_tmp"
  body="$(command_body turn follow-up "$dir" "$child" "$selection" "$rid" "$msg_tmp")" || { rm -f "$msg_tmp"; die "follow-up body could not be built"; }
  rm -f "$msg_tmp"
  state="$(printf '%s' "$body" | python3 "$STATE_HELPER" begin "$dir" "$(wc -l < "$dir/status")" "$rid")"
  rid="$(round_field "$state" round)"; report="$(round_field "$state" report)"
  if ! do_deliver "$dir" "$rid" request; then
    die "follow-up pending for round $rid; sweep retries the saved request"
  fi
  echo "sent: follow-up round $rid to $child" >>"$dir/status"
  echo "sent $child round=$rid"
  echo "Follow-up delivered; end your turn. The child will notify this round's result." >&2
}

cmd_ack() {
  local id="${1-}" rid="${3-}" dir state
  [ "${2-}" = --round ] && [ -n "$rid" ] || die "usage: ack <id> --round <uuid>"
  dir="$(crew_dir_for "$id")"; state="$(require_round "$dir" "$rid")"
  [ -n "$(round_field "$state" delivered_at)" ] || die "round has no delivered hand-back"
  [ -z "$(round_field "$state" acked_at)" ] || { echo "already acked $rid"; return 0; }
  python3 "$STATE_HELPER" ack "$dir" "$rid" >/dev/null || return 1
  echo "acked: round $rid at $(nowiso)" >>"$dir/status"
  echo "acked $id round=$rid"
}

cmd_stop() {
  local id="${1-}"
  [ -n "$id" ] || die "usage: stop <id>"
  local dir; dir="$(crew_dir_for "$id")"
  [ -f "$dir/meta.json" ] || die "unknown crew id: $id (no meta.json)"
  local child
  child="$(crew_child "$dir")"
  [ -n "$child" ] || die "meta.json for $id has no child_thread"
  issue_session
  stop_thread "$child"
  round_event "$dir" stop.requested threadId "$child" at "$(nowiso)"
  revoke_session
  echo "stop requested: child thread $child" >>"$dir/status"
  echo "stopped $child"
}

cmd_settle() {
  local id="${1-}"
  [ -n "$id" ] || die "usage: settle <id>"
  local dir; dir="$(crew_dir_for "$id")"
  [ -f "$dir/meta.json" ] || die "unknown crew id: $id (no meta.json)"
  if [ -f "$dir/current-round.json" ]; then
    local state rid
    state="$(round_state "$dir")"; rid="$(round_field "$state" round)"
  fi
  local child settled_rc=0 settled_err settled_msg
  child="$(crew_child "$dir")"
  [ -n "$child" ] || die "meta.json for $id has no child_thread"
  issue_session
  if [ -n "${rid:-}" ]; then
    # The settled verb owns the sign-off guards, the already-settled fast path
    # and the crash-after-accepted recovery. Exit 3 means no settlement exists
    # yet: run the transport below, then record it.
    settled_err="$(mktemp)"
    python3 "$STATE_HELPER" settled "$dir" "$rid" 2>"$settled_err" >/dev/null || settled_rc=$?
    if [ "$settled_rc" -eq 0 ]; then
      rm -f "$settled_err"
      reconcile_cleanup "$child" "$dir" || return 1
      revoke_session
      echo "already settled $child; checked cleanup"
      return 0
    elif [ "$settled_rc" -ne 3 ]; then
      settled_msg="$(cat "$settled_err")"; rm -f "$settled_err"
      die "${settled_msg#t3-dispatch: }"
    fi
    rm -f "$settled_err"
  fi
  local rc=0
  settle_thread "$child" "$dir" || rc=$?
  revoke_session
  case "$rc" in
    0) [ -z "${rid:-}" ] || python3 "$STATE_HELPER" settled "$dir" "$rid" >/dev/null \
         || die "settlement recording failed for $child — safe to retry"
       echo "settled: child thread $child" >>"$dir/status"
       echo "settled $child" ;;
    4) echo "settle pending: child $child is still active"; return 0 ;;
    *) echo "settle failed: dispatch error for $child" >>"$dir/status"
       die "settle dispatch failed for child $child — safe to retry" ;;
  esac
}

# Reconcile one current round under the same per-crew lock as send/notify/ack.
# No model is asked to supervise, and child completion is never delivery proof.
# The observe verb owns the decision tree and returns one action; this verb
# only runs the corresponding transport.
cmd_reconcile() {
  local id="$1" dir state rid child snap psnap decision action kind
  dir="$(crew_dir_for "$id")"
  [ -f "$dir/current-round.json" ] || return 0
  state="$(round_state "$dir")"; rid="$(round_field "$state" round)"
  child="$(crew_child "$dir")"
  issue_session
  if [ -n "$(round_field "$state" settled_at)" ]; then
    reconcile_cleanup "$child" "$dir"
    return 0
  fi
  snap="$(api GET "/api/orchestration/threads/$child")" || return 1
  # The parent snapshot feeds the reminder idle check only; an unreadable
  # parent waits instead of reminding, exactly as a busy one does.
  psnap="$(mktemp)"
  api GET "/api/orchestration/threads/$(capacity_field "$(cat "$dir/meta.json")" parent_thread)" >"$psnap" 2>/dev/null || : >"$psnap"
  if ! decision="$(printf '%s' "$snap" | python3 "$STATE_HELPER" observe "$dir" "$rid" "$STALL_MAX_AGE_MIN" "$WAKE_RETRY_MIN" "$WAKE_MAX_ATTEMPTS" "$psnap")"; then
    rm -f "$psnap"; return 1
  fi
  rm -f "$psnap"
  action="$(round_field "$decision" action)"
  case "$action" in
    deliver) do_deliver "$dir" "$rid" || return 1 ;;
    remind) do_deliver "$dir" "$rid" notification || return 1 ;;
    recover)
      kind="$(round_field "$decision" kind)"
      if [ "$kind" = blocked ]; then
        do_deliver "$dir" "$rid" blocked_notification || return 1
        echo "blocked: notified parent for round $rid" >>"$dir/status"
      else
        cmd_notify "$id" --round "$rid" --kind "$kind"
      fi ;;
    settle) cmd_settle "$id" ;;
    attention|wait) return 0 ;;
    *) echo "t3-dispatch: unknown reconcile action: $action" >&2; return 1 ;;
  esac
}

cmd_sweep() {
  local dir failures=0
  t3_init || return 1
  shopt -s nullglob
  for dir in "$CREW_HOME"/*/; do
    [ -f "$dir/current-round.json" ] || continue
    # A separate process obtains the crew lock. One bad round does not stop
    # recovery for the others; only a fully successful pass advances heartbeat.
    "$SCRIPT_PATH" reconcile "$(basename "$dir")" || failures=$((failures + 1))
  done
  [ "$failures" -eq 0 ] || { echo "sweep: $failures rounds need retry" >&2; return 1; }
  mkdir -p "$CREW_HOME"
  nowiso >"$CREW_HOME/.sweep-success.tmp"
  mv "$CREW_HOME/.sweep-success.tmp" "$CREW_HOME/sweep-success"
}

usage() {
  cat <<'EOF'
usage: t3-dispatch.sh {dispatch|notify|send|ack|ack-blocked|settle|stop|status|whoami|resolve|sweep|install|doctor} ...

  dispatch  --id <slug> --instance <id> --model <m> --parent-thread <uuid>
         --brief-file <path> --workdir <path> [--effort <level>]
         --project <name|id> [--title <t>] [--runtime-mode <mode>] [--allow-low] [--force-parent]
                                 # a proven caller may explicitly choose another parent
  notify <id> --round <uuid> --kind <done|failed|blocked>
  send <id> --message <text> | --message-file <path>
                                 # follow-up/correction to the live child; it must notify again
  ack <id> --round <uuid>        # acknowledge this hand-back; releases it to the sweep
  ack-blocked <id> --round <uuid> --block <uuid>  # receipt only, never approval
  settle <id>
  stop <id>                      # stop a wedged child; does not settle it
  status <id>                    # includes the current round and report path
  install [--dry-run]            # render/install the current user's recovery job
  doctor                        # recovery heartbeat, prerequisites and pending work
  whoami --project <name|id>   # list mid-turn threads (a list; it cannot identify you)
  resolve [--forget]             # this thread's UUID from T3's provider log; nonce proof as fallback

Runtime modes: approval-required (default), auto-accept-edits, auto, full-access
Crew dirs: ${T3_DISPATCH_HOME:-~/.local/state/t3-crew}/<id>/
EOF
}

main() {
  local cmd="${1-}"
  shift || true
  case "$cmd" in
    dispatch)  cmd_dispatch "$@" ;;
    notify) [ $# -ge 1 ] || die "usage: notify <id> --round <uuid> --kind <done|failed|blocked>"; cmd_notify "$@" ;;
    send) [ $# -ge 1 ] || die "usage: send <id> --message <text> | --message-file <path>"; cmd_send "$@" ;;
    settle) cmd_settle "$@" ;;
    stop) cmd_stop "$@" ;;
    ack) cmd_ack "$@" ;;
    ack-blocked) cmd_ack_blocked "$@" ;;
    sweep) cmd_sweep ;;
    reconcile) cmd_reconcile "$@" ;;
    install|doctor) python3 "$(dirname "$SCRIPT_PATH")/t3-dispatch-setup.py" "$cmd" "$@" ;;
    status) cmd_status "$@" ;;
    whoami) cmd_whoami "$@" ;;
    resolve) cmd_resolve "$@" ;;
    -h|--help|help|"") usage; [ -n "$cmd" ] ;;
    *) die "unknown verb: $cmd (try --help)" ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  # Lock mutations across CLI, child notify, parent ack and the launchd sweep.
  # Source-only diagnostic invocations can still exercise functions in isolation.
  if [ "${T3_DISPATCH_LOCK_PID:-}" != "$PPID" ]; then
    case "${1:-}" in
      dispatch)
        lock_id=""; previous=""
        for arg in "$@"; do
          [ "$previous" != --id ] || lock_id="$arg"
          previous="$arg"
        done
        lock_dir="$(crew_dir_for "$lock_id")" ;;
      notify|send|ack|ack-blocked|settle|stop|reconcile) lock_dir="$(crew_dir_for "${2:-}")" ;;
      sweep) lock_dir="$CREW_HOME/.sweep" ;;
      *) lock_dir="" ;;
    esac
    if [ -n "$lock_dir" ]; then
      exec python3 "$STATE_HELPER" lock "$lock_dir" /bin/bash "$SCRIPT_PATH" "$@"
    fi
  fi
  export T3_DISPATCH_HOME="$CREW_HOME" T3_DISPATCH_BASE_DIR="$T3_BASE"
  trap revoke_session EXIT
  main "$@"
fi
