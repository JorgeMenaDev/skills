#!/usr/bin/env bash
#
# crew-wake-supervise.sh — detached completion supervision for crew jobs.
#
# Modes:
#   launch   <crew-dir> -- <worker...>   capture T3 context while the turn is
#                                        active, write crew-dir/completion.json,
#                                        append `working:` to crew-dir/status,
#                                        re-exec detached into `supervise`, exit.
#   supervise <crew-dir> -- <worker...>  spawn the one foreground worker, record
#                                        supervisor+worker PIDs, wait on the real
#                                        worker exit, finalize the terminal status,
#                                        then issue a bounded idempotent T3 wake.
#
# Non-secret supervision context lives in crew-dir/completion.json; diagnostics
# in crew-dir/completion.log. The T3 bearer token never reaches argv or files:
# it is consumed from stdin via `curl -H @-` and revoked in the same attempt.
# The worker command line is caller-supplied and becomes this helper's argv
# (visible to `ps`), so credential-bearing worker arguments are forbidden.
#
# Env overrides:
#   CODEX_THREAD_ID                      provider cursor -> T3 thread (required)
#   CREW_COMPLETION_T3_STATE_DIR         explicit T3 state dir (fixtures)
#   CREW_COMPLETION_T3_BASE_DIR          explicit base dir for the t3 CLI
#   CREW_COMPLETION_DRY_RUN=1            simulate t3/curl; safe fixture path
#   CREW_COMPLETION_SNAPSHOT_FILE        dry-run: read snapshot from this file
#   CREW_COMPLETION_MAX_ATTEMPTS         wake retry cap, positive int (default 6)
#   CREW_COMPLETION_RETRY_BASE_SECONDS   backoff start, non-negative int, each
#                                        sleep capped at 60 (default 30)
#
# Runtime reference: references/t3-codex-completion.md.

set -u

DRY_RUN="${CREW_COMPLETION_DRY_RUN:-0}"
T3_STATE_DIR_OVERRIDE="${CREW_COMPLETION_T3_STATE_DIR:-}"
T3_BASE_DIR_OVERRIDE="${CREW_COMPLETION_T3_BASE_DIR:-}"
MAX_ATTEMPTS="${CREW_COMPLETION_MAX_ATTEMPTS:-6}"
RETRY_BASE="${CREW_COMPLETION_RETRY_BASE_SECONDS:-30}"
SNAPSHOT_FILE="${CREW_COMPLETION_SNAPSHOT_FILE:-}"

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

die() {
  printf 'crew-wake-supervise: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

require_toolchain() {
  # Every command this helper invokes directly.
  local c
  for c in sed grep shasum awk cut cat kill sleep date basename dirname head tail \
    mv nohup sqlite3 curl python3; do
    require_cmd "$c"
  done
  if [ "$DRY_RUN" -ne 1 ]; then
    require_cmd t3
  fi
}

validate_retry_inputs() {
  case "$MAX_ATTEMPTS" in
    ''|*[!0-9]*) die "CREW_COMPLETION_MAX_ATTEMPTS must be a positive integer" ;;
  esac
  [ "$MAX_ATTEMPTS" -ge 1 ] || die "CREW_COMPLETION_MAX_ATTEMPTS must be at least 1"
  case "$RETRY_BASE" in
    ''|*[!0-9]*) die "CREW_COMPLETION_RETRY_BASE_SECONDS must be a non-negative integer" ;;
  esac
}

log() { printf '[%s] %s\n' "$(now)" "$*" >>"$LOG_FILE" 2>/dev/null || true; }

jesc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

jstr() { sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$2" | head -1; }

jnum() { sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p" "$2" | head -1; }

pid_alive() { kill -0 "$1" 2>/dev/null; }

append_status() {
  printf '%s\n' "$2" >>"$1"
}

usage() {
  echo "usage: crew-wake-supervise.sh {launch|supervise} <crew-dir> -- <worker-command...>"
}

# --- T3 context capture (runs in `launch` while the original turn is active) ---

candidate_state_dirs() {
  if [ -n "$T3_STATE_DIR_OVERRIDE" ]; then
    printf '%s\n' "$T3_STATE_DIR_OVERRIDE"
    return
  fi
  local base="${T3CODE_HOME:-$HOME/.t3}"
  printf '%s\n' "$base/userdata" "$base/dev"
}

capture_t3_context() {
  # Fail closed: exactly one live codex row whose resume cursor equals CODEX_THREAD_ID.
  T3_CAPTURE_ERROR=""
  local cursor="${CODEX_THREAD_ID:-}"
  if [ -z "$cursor" ]; then
    T3_CAPTURE_ERROR="missing CODEX_THREAD_ID (no T3 context; fail closed)"
    return 1
  fi
  local d spid out matched n
  local total_matches=0 chosen_thread="" chosen_dir="" chosen_origin="" chosen_server_pid="" chosen_base=""
  local chosen_kind="" chosen_dev_url=""
  while IFS= read -r d; do
    [ -f "$d/state.sqlite" ] || continue
    [ -f "$d/server-runtime.json" ] || continue
    spid=$(jnum pid "$d/server-runtime.json")
    [ -n "$spid" ] || continue
    pid_alive "$spid" || continue
    out=$(sqlite3 -readonly -noheader -separator $'\t' "$d/state.sqlite" \
      "SELECT thread_id, json_extract(resume_cursor_json, '$.threadId')
       FROM provider_session_runtime WHERE provider_name = 'codex';" 2>>"$LOG_FILE") || continue
    matched=$(printf '%s\n' "$out" | awk -F '\t' -v c="$cursor" '$2 == c { print $1 }')
    n=$(printf '%s\n' "$matched" | grep -c '[^[:space:]]' 2>/dev/null || true)
    [ "$n" -gt 0 ] || continue
    total_matches=$((total_matches + n))
    chosen_thread=$(printf '%s\n' "$matched" | grep '[^[:space:]]' | head -1)
    chosen_dir="$d"
    chosen_origin=$(jstr origin "$d/server-runtime.json")
    chosen_server_pid="$spid"
    chosen_base="${d%/*}"
    chosen_kind=$(basename "$d")
    chosen_dev_url=$(jstr devUrl "$d/server-runtime.json")
  done < <(candidate_state_dirs)
  if [ "$total_matches" -eq 0 ]; then
    T3_CAPTURE_ERROR="zero matches for CODEX_THREAD_ID=$cursor (fail closed)"
    return 1
  fi
  if [ "$total_matches" -gt 1 ]; then
    T3_CAPTURE_ERROR="ambiguous T3 context: $total_matches matches for CODEX_THREAD_ID=$cursor (fail closed)"
    return 1
  fi
  [ -n "$chosen_origin" ] || { T3_CAPTURE_ERROR="no server-runtime.json origin in $chosen_dir"; return 1; }
  [ "$chosen_kind" = "userdata" ] || [ "$chosen_kind" = "dev" ] || {
    T3_CAPTURE_ERROR="unrecognized state dir kind: $chosen_kind (fail closed)"; return 1; }
  if [ "$chosen_kind" = "dev" ] && [ -z "$chosen_dev_url" ]; then
    T3_CAPTURE_ERROR="dev state dir has no devUrl in server-runtime.json; cannot construct auth targeting dev (fail closed)"
    return 1
  fi
  T3_THREAD_ID="$chosen_thread"
  T3_ORIGIN="$chosen_origin"
  T3_SERVER_PID="$chosen_server_pid"
  T3_STATE_DIR="$chosen_dir"
  T3_BASE_DIR="${T3_BASE_DIR_OVERRIDE:-$chosen_base}"
  T3_STATE_KIND="$chosen_kind"
  T3_DEV_URL="$chosen_dev_url"
  return 0
}

# --- context file ---

write_context() {
  local dry
  [ "$DRY_RUN" -eq 1 ] && dry=true || dry=false
  {
    printf '{'
    printf '"crewId":"%s",' "$(jesc "$CREW_ID")"
    printf '"statusPath":"%s",' "$(jesc "$STATUS_FILE")"
    printf '"phase":"%s",' "$(jesc "$PHASE")"
    printf '"supervisorPid":%s,' "${SUPERVISOR_PID:-null}"
    printf '"workerPid":%s,' "${WORKER_PID:-null}"
    printf '"t3":{'
    printf '"threadId":"%s",' "$(jesc "${T3_THREAD_ID:-}")"
    printf '"origin":"%s",' "$(jesc "${T3_ORIGIN:-}")"
    printf '"serverPid":%s,' "${T3_SERVER_PID:-null}"
    printf '"stateDir":"%s",' "$(jesc "${T3_STATE_DIR:-}")"
    printf '"baseDir":"%s",' "$(jesc "${T3_BASE_DIR:-}")"
    printf '"kind":"%s",' "$(jesc "${T3_STATE_KIND:-userdata}")"
    printf '"devUrl":"%s"' "$(jesc "${T3_DEV_URL:-}")"
    printf '},'
    printf '"wake":{"commandId":"%s","dryRun":%s},' "$(jesc "${WAKE_COMMAND_ID:-}")" "$dry"
    printf '"notification":{"status":"%s","evidence":"%s","attempts":%s,"lastAttemptAt":"%s"' \
      "$(jesc "$NOTIFICATION_STATUS")" "$(jesc "$NOTIFICATION_EVIDENCE")" "${NOTIFICATION_ATTEMPTS:-0}" "$(jesc "$NOTIFICATION_LAST_AT")"
    printf '}}\n'
  } >"$CTX_TMP" && mv "$CTX_TMP" "$CTX_FILE"
}

read_context() {
  [ -f "$CTX_FILE" ] || { log "no context file $CTX_FILE"; return 1; }
  CREW_ID=$(jstr crewId "$CTX_FILE")
  STATUS_FILE=$(jstr statusPath "$CTX_FILE")
  T3_THREAD_ID=$(jstr threadId "$CTX_FILE")
  T3_ORIGIN=$(jstr origin "$CTX_FILE")
  T3_SERVER_PID=$(jnum serverPid "$CTX_FILE")
  T3_STATE_DIR=$(jstr stateDir "$CTX_FILE")
  T3_BASE_DIR=$(jstr baseDir "$CTX_FILE")
  T3_STATE_KIND=$(jstr kind "$CTX_FILE")
  T3_DEV_URL=$(jstr devUrl "$CTX_FILE")
  WAKE_COMMAND_ID=$(jstr commandId "$CTX_FILE")
  [ -n "$T3_THREAD_ID" ] || { log "context missing threadId"; return 1; }
  [ -n "$T3_ORIGIN" ] || { log "context missing origin"; return 1; }
  [ -n "$T3_SERVER_PID" ] || { log "context missing serverPid"; return 1; }
  [ -n "$T3_BASE_DIR" ] || T3_BASE_DIR="${T3_STATE_DIR%/*}"
  [ "$T3_STATE_KIND" = "userdata" ] || [ "$T3_STATE_KIND" = "dev" ] || {
    log "context missing valid state kind"; return 1; }
  if [ "$T3_STATE_KIND" = "dev" ] && [ -z "$T3_DEV_URL" ]; then
    log "context missing devUrl for dev state"; return 1
  fi
  return 0
}

# --- wake (runs in `supervise`, after the durable terminal status exists) ---

wake_once() {
  # returns 0 dispatched, 2 busy (retry later), 1 other failure; revokes the
  # issued session in the same attempt no matter what.
  pid_alive "$T3_SERVER_PID" || { log "wake skipped: recorded server pid $T3_SERVER_PID not alive"; return 1; }
  # Auth commands target the state kind the thread was captured from: explicit
  # --base-dir always resolves to <base>/userdata, so a dev state dir needs
  # T3CODE_HOME + VITE_DEV_SERVER_URL (no --base-dir).
  local issue_cmd=() revoke_cmd=()
  if [ "$T3_STATE_KIND" = "dev" ]; then
    issue_cmd=(env T3CODE_HOME="$T3_BASE_DIR" VITE_DEV_SERVER_URL="$T3_DEV_URL" t3 auth session issue --ttl 10m --json)
    revoke_cmd=(env T3CODE_HOME="$T3_BASE_DIR" VITE_DEV_SERVER_URL="$T3_DEV_URL" t3 auth session revoke)
  else
    issue_cmd=(t3 auth session issue --base-dir "$T3_BASE_DIR" --ttl 10m --json)
    revoke_cmd=(t3 auth session revoke --base-dir "$T3_BASE_DIR")
  fi
  local token="" session_id=""
  if [ "$DRY_RUN" -eq 1 ]; then
    token="dry-run-token"
    session_id="dry-run-session"
    log "dry-run: would issue: ${issue_cmd[*]} (kind=$T3_STATE_KIND)"
  else
    local json_out
    json_out=$("${issue_cmd[@]}" 2>>"$LOG_FILE") || { log "session issue failed"; return 1; }
    token=$(printf '%s' "$json_out" | sed -n 's/^[[:space:]]*"token": "\([^"]*\)".*$/\1/p' | head -1)
    session_id=$(printf '%s' "$json_out" | sed -n 's/^[[:space:]]*"sessionId": "\([^"]*\)".*$/\1/p' | head -1)
    if [ -z "$token" ]; then
      log "session parse failed"
      if [ -n "$session_id" ]; then
        "${revoke_cmd[@]}" "$session_id" >>"$LOG_FILE" 2>&1 ||
          log "revoke failed for session $session_id"
      else
        log "revoke impossible: no sessionId in issue output"
      fi
      return 1
    fi
    if [ -z "$session_id" ]; then
      log "no sessionId in issue output; cannot revoke precisely (TTL-bound)"
    fi
  fi
  local rc=1
  local snapshot_body="" runtime_mode="full-access" interaction_mode="default" sess_status=""
  if [ "$DRY_RUN" -eq 1 ] && [ -n "$SNAPSHOT_FILE" ]; then
    snapshot_body=$(cat "$SNAPSHOT_FILE" 2>/dev/null) || {
      log "snapshot fixture unreadable"; return 1; }
  elif [ "$DRY_RUN" -eq 1 ]; then
    snapshot_body='{"thread":{"session":{"status":"idle"},"runtimeMode":"full-access","interactionMode":"default"}}'
    log "dry-run: snapshot GET skipped; assumed idle"
  else
    local resp code
    resp=$(printf 'Authorization: Bearer %s\n' "$token" | curl -sS -w '\n%{http_code}' \
      -H @- "$T3_ORIGIN/api/orchestration/threads/$T3_THREAD_ID" 2>>"$LOG_FILE") || {
      log "snapshot GET failed"; rc=1; }
    if [ -n "$resp" ]; then
      code=${resp##*$'\n'}
      case $code in
        2*) snapshot_body=${resp%$'\n'*}; rc=0 ;;
        *) log "snapshot http $code"; rc=1 ;;
      esac
    fi
  fi
  [ "$DRY_RUN" -eq 1 ] && rc=0
  if [ "$rc" -eq 0 ]; then
    sess_status=$(printf '%s' "$snapshot_body" |
      sed -n 's/.*"session":[[:space:]]*{\([^}]*\)}.*/\1/p' |
      sed -n 's/.*"status":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
    runtime_mode=$(printf '%s' "$snapshot_body" |
      sed -n 's/.*"runtimeMode":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
    interaction_mode=$(printf '%s' "$snapshot_body" |
      sed -n 's/.*"interactionMode":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
    [ -n "$runtime_mode" ] || runtime_mode="full-access"
    [ -n "$interaction_mode" ] || interaction_mode="default"
    if [ "$sess_status" = "starting" ] || [ "$sess_status" = "running" ]; then
      log "thread busy (session $sess_status); not steering — retry later"
      rc=2
    else
      local fresh_msg_id payload code2
      fresh_msg_id="msg-$(date +%s)-$$-$RANDOM"
      local text
      text="crew $CREW_ID $STATUS_VERB: exit $WORKER_RC; firstmate: read and verify $STATUS_FILE and the crew record before integrating."
      payload=$(printf '{"type":"thread.turn.start","commandId":"%s","threadId":"%s","message":{"messageId":"%s","role":"user","text":"%s","attachments":[]},"runtimeMode":"%s","interactionMode":"%s","createdAt":"%s"}' \
        "$WAKE_COMMAND_ID" "$T3_THREAD_ID" "$fresh_msg_id" "$(jesc "$text")" "$runtime_mode" "$interaction_mode" "$(now)")
      if [ "$DRY_RUN" -eq 1 ]; then
        log "dry-run: dispatch POST $T3_ORIGIN/api/orchestration/dispatch threadId=$T3_THREAD_ID commandId=$WAKE_COMMAND_ID runtimeMode=$runtime_mode interactionMode=$interaction_mode"
        rc=0
      else
        code2=$(printf 'Authorization: Bearer %s\n' "$token" | curl -sS -o /dev/null -w '%{http_code}' \
          -H @- -H 'Content-Type: application/json' -X POST -d "$payload" \
          "$T3_ORIGIN/api/orchestration/dispatch" 2>>"$LOG_FILE") || {
          log "dispatch POST failed"; rc=1; }
        case $code2 in
          2*) rc=0 ;;
          *) log "dispatch http $code2"; rc=1 ;;
        esac
      fi
    fi
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    log "dry-run: would revoke: ${revoke_cmd[*]} $session_id (kind=$T3_STATE_KIND)"
  elif [ -n "$session_id" ]; then
    "${revoke_cmd[@]}" "$session_id" >>"$LOG_FILE" 2>&1 ||
      log "revoke failed for session $session_id"
  fi
  return "$rc"
}

wake_with_retry() {
  local attempt=0 delay=$RETRY_BASE rc
  while :; do
    attempt=$((attempt + 1))
    NOTIFICATION_ATTEMPTS=$attempt
    wake_once
    rc=$?
    if [ "$rc" -eq 0 ]; then
      NOTIFICATION_STATUS="dispatched"
      NOTIFICATION_EVIDENCE=""
      NOTIFICATION_LAST_AT=$(now)
      log "wake dispatched on attempt $attempt"
      return 0
    fi
    if [ "$rc" -eq 2 ]; then
      NOTIFICATION_EVIDENCE="busy_thread"
    else
      NOTIFICATION_EVIDENCE="wake_failed_rc_$rc"
    fi
    if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
      NOTIFICATION_STATUS="failed"
      NOTIFICATION_LAST_AT=$(now)
      log "wake failed after $attempt attempts; durable status kept; evidence=$NOTIFICATION_EVIDENCE"
      return 1
    fi
    log "wake attempt $attempt rc=$rc; retrying in ${delay}s"
    local s=$delay
    [ "$s" -gt 60 ] && s=60
    sleep "$s"
    delay=$((delay * 2))
  done
}

# --- launch ---

cmd_launch() {
  local crew_dir="$1"
  shift
  [ "${1:-}" = "--" ] && shift
  local worker=("$@")
  LOG_FILE="$crew_dir/completion.log"
  CTX_FILE="$crew_dir/completion.json"
  CTX_TMP="$CTX_FILE.tmp"
  [ -d "$crew_dir" ] || die "crew dir missing: $crew_dir"
  [ -f "$crew_dir/status" ] || die "no status file in $crew_dir"
  [ "${#worker[@]}" -gt 0 ] || die "no worker command after --"
  require_toolchain
  validate_retry_inputs
  CREW_ID=$(basename "$crew_dir")
  STATUS_FILE="$crew_dir/status"
  PHASE="launching"
  NOTIFICATION_STATUS="none"
  NOTIFICATION_EVIDENCE=""
  NOTIFICATION_ATTEMPTS=0
  NOTIFICATION_LAST_AT=""
  WAKE_COMMAND_ID="cmd-$(printf '%s' "$CREW_ID" | shasum -a 256 | cut -c1-40)"
  SUPERVISOR_PID="null"
  WORKER_PID="null"
  # Crew IDs are single-use: the deterministic command id and prior terminal
  # lines make a relaunch ambiguous, so any existing completion.json refuses.
  if [ -f "$CTX_FILE" ]; then
    die "crew ID already used: $CTX_FILE exists; use a fresh crew ID"
  fi
  if ! capture_t3_context; then
    log "launch failed: $T3_CAPTURE_ERROR"
    NOTIFICATION_STATUS="failed"
    NOTIFICATION_EVIDENCE="t3_context_unresolved: $T3_CAPTURE_ERROR"
    NOTIFICATION_ATTEMPTS=0
    NOTIFICATION_LAST_AT=$(now)
    write_context
    append_status "$crew_dir/status" "failed: t3 context unresolved ($T3_CAPTURE_ERROR)"
    exit 1
  fi
  log "context captured: thread=$T3_THREAD_ID origin=$T3_ORIGIN serverPid=$T3_SERVER_PID stateDir=$T3_STATE_DIR"
  write_context
  append_status "$crew_dir/status" "working: detached supervision started"
  local bin
  bin="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  nohup python3 -c 'import os,sys
try:
    os.setsid()
except OSError:
    pass
os.execv(sys.argv[1], sys.argv[1:])' "$bin" supervise "$crew_dir" -- "${worker[@]}" \
    >>"$LOG_FILE" 2>&1 </dev/null &
  return 0
}

# --- supervise ---

cmd_supervise() {
  local crew_dir="$1"
  shift
  [ "${1:-}" = "--" ] && shift
  local worker=("$@")
  LOG_FILE="$crew_dir/completion.log"
  CTX_FILE="$crew_dir/completion.json"
  CTX_TMP="$CTX_FILE.tmp"
  CREW_ID=$(basename "$crew_dir")
  STATUS_FILE="$crew_dir/status"
  PHASE="supervising"
  read_context || { append_status "$crew_dir/status" "failed: supervisor could not read completion.json"; exit 1; }
  [ "${#worker[@]}" -gt 0 ] || die "no worker command after --"
  require_toolchain
  validate_retry_inputs
  "${worker[@]}" &
  WORKER_PID=$!
  SUPERVISOR_PID=$$
  NOTIFICATION_STATUS="none"
  NOTIFICATION_EVIDENCE=""
  NOTIFICATION_ATTEMPTS=0
  NOTIFICATION_LAST_AT=""
  write_context
  log "supervisor pid $SUPERVISOR_PID; worker pid $WORKER_PID; waiting for real worker exit"
  wait "$WORKER_PID"
  WORKER_RC=$?
  log "worker exited rc=$WORKER_RC"
  # Terminal status: preserve a worker-written one, else derive from the exit code.
  local terminal_line status_verb
  terminal_line=$(grep -E '^(done|failed|blocked|needs-decision|paused):' "$STATUS_FILE" | tail -1)
  if [ -n "$terminal_line" ]; then
    status_verb=$(printf '%s' "$terminal_line" | sed 's/:.*//')
    log "preserved worker terminal status: $terminal_line"
  else
    if [ "$WORKER_RC" -eq 0 ]; then
      status_verb="done"
      terminal_line="done: exit 0"
    else
      status_verb="failed"
      terminal_line="failed: exit $WORKER_RC"
    fi
    append_status "$STATUS_FILE" "$terminal_line"
    log "appended terminal status from exit code: $terminal_line"
  fi
  STATUS_VERB="$status_verb"
  # Durable status exists now; notify is secondary and never rewrites the result.
  if [ -z "$T3_THREAD_ID" ] || [ -z "$T3_ORIGIN" ]; then
    NOTIFICATION_STATUS="skipped"
    NOTIFICATION_EVIDENCE="no_t3_context"
    NOTIFICATION_LAST_AT=$(now)
    log "wake skipped: no T3 context captured at launch"
  else
    wake_with_retry
  fi
  PHASE="finished"
  write_context
  exit 0
}

# --- entry ---

main() {
  [ "$#" -ge 3 ] || { usage >&2; exit 2; }
  local mode="$1"
  local crew_dir="$2"
  case "$mode" in
    launch) cmd_launch "$crew_dir" "${@:3}" ;;
    supervise) cmd_supervise "$crew_dir" "${@:3}" ;;
    *) usage >&2; exit 2 ;;
  esac
}

main "$@"
