#!/usr/bin/env node

// loop-state.mjs — the single writer and validator for schema-1 loop state.
//
// Prose in references/operating.md states what the state MEANS; this tool owns
// what the bytes look like, which transitions are legal, and which crash
// intermediates are tolerated. Field-discovered edge cases become fixtures in
// dev/seo-growth-workspace/fixtures/loop-state/, never new prose clauses.
//
// Every command prints exactly one JSON object on stdout. Stable exit codes:
//   0 ok        1 usage/internal error   2 malformed state (fail closed)
//   3 drift     4 in-flight reconciliation demand
//   5 coverage stale or annotated        6 armed ungated autopublish
//   7 ship capacity exhausted            8 refused transition or identity conflict

import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXIT = { OK: 0, USAGE: 1, MALFORMED: 2, DRIFT: 3, IN_FLIGHT: 4, COVERAGE: 5, AUTOPUBLISH: 6, CAP: 7, REFUSED: 8 };

const RESERVED_LOOP_FILES = new Set(["coverage-ledger.json", "measurement-obligations.json", "ship-events.json"]);
const OCCURRENCE_STATES = new Set(["due", "materialized", "attempted", "satisfied", "blockedUntil"]);
const OBLIGATION_STATES = new Set(["pending", "due", "materialized", "resolved", "superseded"]);
const RESULTS = new Set(["ok", "alerted"]);
const ESCALATIONS = new Set(["none", "needs_human"]);
const SHIP_SOURCES = new Set(["deploy", "webhook", "pseo-batch", "other"]);
const QUALIFICATIONS = new Set(["qualified", "ambiguous"]);
const COVERAGE_MAX_AGE_DAYS = { A: 30, B: 14, C: 30, D: 60, E: 30, F: 30, G: 90, H: 90, I: 90, J: 30 };
const SHIP_CAPS = { unknown: 2, early: 2, growth: 4, mature: 7 };
const STAGES = new Set(Object.keys(SHIP_CAPS));
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WINDOW_PATTERN = /^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function usage() {
  return `Usage: node loop-state.mjs <command> --workspace <path-to-.seo-workspace> [options]

Commands (every command prints one JSON object; exit codes are stable and documented in the source header):

  verify [--now <date|timestamp>] [--repair]
      Validate every schema-1 surface: loops/*.json occurrences and wake fields,
      measurement-obligations.json, ship-events.json, coverage-ledger.json, and the
      reconciliation stamp. Read-only unless --repair, which corrects coverage
      maxAgeDays policy mirrors (the only mutation). Advisory notes list in-flight
      rows, expired or staleAsOf-annotated rungs, and mirror drift. Unknown fields
      anywhere are tolerated, never validated, never deleted. Exit 2 on malformed state.

  occurrence add        --loop <file> --cadence <id> --window <D/D> --due-at <D> --fingerprint <fp> [--priority P0-P4] [--area <a>]
  occurrence materialize --loop <file> --cadence <id> --window <D/D> --ticket <id>
  occurrence attempt    --loop <file> --cadence <id> --window <D/D>
  occurrence satisfy    --loop <file> --cadence <id> --window <D/D> --result ok|alerted
  occurrence block      --loop <file> --cadence <id> --window <D/D> --next-at <D> --max-at <D> [--needs-human]
      Transitions: due -> materialized -> attempted -> satisfied | blockedUntil.
      Retries reuse the existing ticket (attempt from blockedUntil). Re-running the
      same command with the same values is an idempotent no-op; conflicting values
      exit 8. The occurrence identity is {cadenceId, dueWindow}, unique across all
      loop files.

  obligation add          --hypothesis <h> --cohort <fp> --baseline-measured-at <D> --baseline-value <v> --baseline-evidence <e> --metric <m> --decision <d> --due-at <D> [--wake-at <D>] [--priority P0-P4] [--area <a>]
  obligation claim        --hypothesis <h> --cohort <fp> --fingerprint <fp>
  obligation materialize  --hypothesis <h> --cohort <fp> --ticket <id>
  obligation resolve      --hypothesis <h> --cohort <fp> --resolved-at <D> --note <calibration note>
  obligation inconclusive --hypothesis <h> --cohort <fp> --attempted-at <D> --reason <r> --evidence-note <e> --wake-at <D>
  obligation supersede    --hypothesis <h> --cohort <fp> --successor-hypothesis <h> --successor-cohort <fp> --successor-evidence <e>
      Transitions: pending -> due -> materialized -> resolved | superseded. claim
      persists the candidate fingerprint before ticket creation (crash-retryable);
      inconclusive appends the attempt and returns the same lineage to pending in
      one atomic replacement. Identity is {hypothesis, pageCohortFingerprint}.

  ship record --event-id <id> --dedupe-key <k> --published-at <timestamp> --initiated-by <actor> --source deploy|webhook|pseo-batch|other --url <u> [--url <u>...] --qualification qualified|ambiguous --evidence <e> [--evidence <e>...] [--ticket <id>]
      Appends one normalized ship event. An existing event with the same dedupeKey
      and eventId is an idempotent no-op; the same dedupeKey with a different
      eventId exits 8. URLs are stored as a sorted unique set.

  cap [--now <date|timestamp>] [--stage unknown|early|growth|mature]
      Rolling seven-day ship usage vs the stage cap (unknown/early 2, growth 4,
      mature 7). Stage comes from --stage, else the newest stageStamp in loops/*.json,
      else unknown. An event is exception-covered when every URL it counts appears in
      a capExceptions grant in ship-events.json; covered events do not consume cap.
      Exit 7 when no capacity remains.

  sleep certify --loop <file> --payload <json-file|-> [--now <date|timestamp>] [--installed <version>|--skill <SKILL.md path>]
      Validate the certificate payload (dedupeKey, fingerprint with target/mode/
      requestedSurface/remit/mutationCeiling/authorizationClass, checkedEvidence,
      gateFailures, earliestNextDue and/or wakeOn, coverage complete|partial), stamp
      dated and heartbeatAt, and write it as sleepCertificate in --loop, mirroring
      earliestNextDue into the loop's nextWakeAt. Refusals: malformed state (2),
      drift (3), unreconciled in-flight occurrence or obligation (4), expired or
      staleAsOf-annotated coverage rung under coverage=complete (5), armed
      autopublish without a quality-watch occurrence covering the next publish
      window (6).
  sleep heartbeat --loop <file> [--now <timestamp>]
      Update sleepCertificate.heartbeatAt in place; no other bytes change.

  stamp check [--installed <version>|--skill <SKILL.md path>]
      Compare reconciliation.json to the installed skill version (read from SKILL.md
      frontmatter next to this script unless overridden). Absent or malformed stamps
      are drift. Exit 3 on drift.
  stamp write [--installed <version>|--skill <path>] [--report <workspace-relative path>] [--now <date>]
      Write the reconciliation stamp. --report records the upgrade-pass report path.
  stamp report-path [--installed <version>|--skill <path>] [--now <date>]
      Print a collision-free reports/YYYY-MM-DD-upgrade-pass-<version>.md path.

The tool never touches backlog.md, log.md, reports, or any human-readable surface.`;
}

// ---------- argument parsing ----------

function parseArgs(argv) {
  const args = { _: [], urls: [], evidence: [] };
  const multi = { "--url": "urls", "--evidence": "evidence" };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!flag.startsWith("--")) {
      args._.push(flag);
      continue;
    }
    if (flag === "--repair" || flag === "--needs-human") {
      args[flag.slice(2)] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined) throw usageError(`Missing value for ${flag}`);
    if (multi[flag]) args[multi[flag]].push(value);
    else args[flag.slice(2)] = value;
    i += 1;
  }
  return args;
}

function usageError(message) {
  const error = new Error(message);
  error.exitCode = EXIT.USAGE;
  return error;
}

function refusal(exitCode, message, extra = {}) {
  const error = new Error(message);
  error.exitCode = exitCode;
  error.extra = extra;
  return error;
}

function required(args, name, flag) {
  const value = args[name];
  if (typeof value !== "string" || value.trim() === "") throw usageError(`${flag} is required`);
  return value;
}

// ---------- shared parsing/validation (kept semantically identical to cadence-status.mjs) ----------

function parseDate(value, field) {
  if (typeof value !== "string") throw new Error(`${field} must be a YYYY-MM-DD date`);
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new Error(`${field} must be a YYYY-MM-DD date`);
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.toISOString().slice(0, 10) !== value) throw new Error(`${field} is not a valid calendar date`);
  return value;
}

function parseWindow(value, field) {
  if (typeof value !== "string") throw new Error(`${field} must be YYYY-MM-DD/YYYY-MM-DD`);
  const match = WINDOW_PATTERN.exec(value);
  if (!match) throw new Error(`${field} must be YYYY-MM-DD/YYYY-MM-DD`);
  const start = parseDate(match[1], `${field} start`);
  const end = parseDate(match[2], `${field} end`);
  if (start > end) throw new Error(`${field} start must not be after its end`);
  return { start, end };
}

function parseTimestamp(value, field) {
  if (typeof value !== "string" || !TIMESTAMP_PATTERN.test(value)) {
    throw new Error(`${field} must be a timezone-qualified ISO timestamp`);
  }
  // new Date() normalizes impossible dates (2026-02-30 -> March); validate the
  // written calendar date instead of trusting the parser.
  parseDate(value.slice(0, 10), field);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`${field} is not a valid timestamp`);
  return parsed;
}

// --now accepts a date or a timezone-qualified timestamp. A bare date means
// "as of the end of that day": ships published any time that day count, and
// dated fields stamp that date.
function parseNow(value) {
  if (!value) {
    const instant = new Date();
    return { date: instant.toISOString().slice(0, 10), instant };
  }
  if (DATE_PATTERN.test(value)) {
    const date = parseDate(value, "--now");
    return { date, instant: new Date(`${date}T23:59:59.999Z`) };
  }
  const instant = parseTimestamp(value, "--now");
  return { date: instant.toISOString().slice(0, 10), instant };
}

function nullableDate(value, field) {
  return value === null || value === undefined ? null : parseDate(value, field);
}

function isCalendarDate(value) {
  try {
    parseDate(value, "date");
    return true;
  } catch {
    return false;
  }
}

function nonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field} must be a non-empty string`);
  return value;
}

function validateTicket(value, field) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be null or an object`);
  nonEmptyString(value.id, `${field}.id`);
  if (value.status !== "open" && value.status !== "closed") throw new Error(`${field}.status must be open or closed`);
  return { id: value.id, status: value.status };
}

function validateSchemaEnvelope(payload) {
  const schemas = ["schema", "schemaVersion"].filter((field) => payload[field] !== undefined);
  if (schemas.length === 0) throw new Error("schema or schemaVersion field is missing");
  const invalid = schemas.find((field) => payload[field] !== 1);
  if (invalid) throw new Error(`${invalid} must be 1; received ${JSON.stringify(payload[invalid])}`);
}

function validatePriorityArea(value, field) {
  const priority = value.priority === undefined ? null : value.priority;
  if (priority !== null && !/^P[0-4]$/.test(String(priority))) throw new Error(`${field}.priority must be P0-P4 or omitted`);
  const area = value.area === undefined ? null : value.area;
  if (area !== null && (typeof area !== "string" || area.trim() === "")) throw new Error(`${field}.area must be a non-empty string or omitted`);
}

function validateOccurrence(key, value, source) {
  const field = `${source} occurrences[${JSON.stringify(key)}]`;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object`);
  nonEmptyString(value.cadenceId, `${field}.cadenceId`);
  const window = parseWindow(value.dueWindow, `${field}.dueWindow`);
  if (key !== JSON.stringify([value.cadenceId, value.dueWindow])) {
    throw new Error(`${field} key does not match cadenceId and dueWindow`);
  }
  const dueAt = parseDate(value.dueAt, `${field}.dueAt`);
  if (dueAt < window.start || dueAt > window.end) throw new Error(`${field}.dueAt must fall inside dueWindow`);
  if (!OCCURRENCE_STATES.has(value.state)) throw new Error(`${field}.state is unknown`);
  nonEmptyString(value.candidateFingerprint, `${field}.candidateFingerprint`);
  const ticket = validateTicket(value.ticket, `${field}.ticket`);
  if (value.result !== null && !RESULTS.has(value.result)) throw new Error(`${field}.result must be ok, alerted, or null`);
  if (!Number.isInteger(value.attempt) || value.attempt < 0) throw new Error(`${field}.attempt must be a non-negative integer`);
  const nextAt = nullableDate(value.nextAt, `${field}.nextAt`);
  const maxAt = nullableDate(value.maxAt, `${field}.maxAt`);
  if (!ESCALATIONS.has(value.escalation)) throw new Error(`${field}.escalation must be none or needs_human`);
  if (value.state === "satisfied" && !RESULTS.has(value.result)) throw new Error(`${field}.result must be ok or alerted when satisfied`);
  if (value.state !== "satisfied" && value.result !== null) throw new Error(`${field}.result must be null until satisfied`);
  if (value.state === "blockedUntil" && (nextAt === null || maxAt === null || nextAt > maxAt)) {
    throw new Error(`${field} blockedUntil state requires nextAt and maxAt with nextAt not after maxAt`);
  }
  if (value.state !== "blockedUntil" && (nextAt !== null || maxAt !== null)) {
    throw new Error(`${field}.nextAt and maxAt must be null outside blockedUntil`);
  }
  if (value.state === "due" && ticket !== null) throw new Error(`${field}.ticket must be null before materialization`);
  if (value.state !== "due" && ticket === null) throw new Error(`${field}.ticket must link the materialized occurrence`);
  if (value.state === "satisfied" && ticket.status !== "closed") throw new Error(`${field}.ticket must be closed when satisfied`);
  if (value.state !== "due" && value.state !== "satisfied" && ticket.status !== "open") {
    throw new Error(`${field}.ticket must remain open until satisfied`);
  }
  if (value.state === "blockedUntil" && value.attempt < 1) throw new Error(`${field}.attempt must be positive when blockedUntil`);
  validatePriorityArea(value, field);
}

function validateObligation(key, value, source) {
  const field = `${source} obligations[${JSON.stringify(key)}]`;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object`);
  for (const name of ["hypothesis", "pageCohortFingerprint", "metric", "decision"]) {
    nonEmptyString(value[name], `${field}.${name}`);
  }
  if (key !== JSON.stringify([value.hypothesis, value.pageCohortFingerprint])) {
    throw new Error(`${field} key does not match hypothesis and pageCohortFingerprint`);
  }
  if (!value.baseline || typeof value.baseline !== "object" || Array.isArray(value.baseline)) {
    throw new Error(`${field}.baseline must be an object`);
  }
  parseDate(value.baseline.measuredAt, `${field}.baseline.measuredAt`);
  nonEmptyString(value.baseline.value, `${field}.baseline.value`);
  nonEmptyString(value.baseline.evidence, `${field}.baseline.evidence`);
  parseDate(value.dueAt, `${field}.dueAt`);
  if (!OBLIGATION_STATES.has(value.state)) throw new Error(`${field}.state is unknown`);
  const fingerprint = value.candidateFingerprint;
  if (fingerprint !== null && (typeof fingerprint !== "string" || fingerprint.trim() === "")) {
    throw new Error(`${field}.candidateFingerprint must be a non-empty string or null`);
  }
  const ticket = validateTicket(value.ticket, `${field}.ticket`);
  if (!Array.isArray(value.attempts)) throw new Error(`${field}.attempts must be an array`);
  value.attempts.forEach((attempt, index) => {
    if (!attempt || typeof attempt !== "object" || Array.isArray(attempt)) throw new Error(`${field}.attempts[${index}] must be an object`);
    parseDate(attempt.attemptedAt, `${field}.attempts[${index}].attemptedAt`);
    nonEmptyString(attempt.reason, `${field}.attempts[${index}].reason`);
    nonEmptyString(attempt.evidence, `${field}.attempts[${index}].evidence`);
  });
  nullableDate(value.wakeAt, `${field}.wakeAt`);
  const resolvedAt = nullableDate(value.resolvedAt, `${field}.resolvedAt`);
  if (value.calibrationNote !== null && typeof value.calibrationNote !== "string") {
    throw new Error(`${field}.calibrationNote must be a string or null`);
  }
  if ((value.state === "pending" || value.state === "due") && ticket !== null) {
    throw new Error(`${field}.ticket must be null before materialization`);
  }
  if ((value.state === "materialized" || value.state === "resolved") && fingerprint === null) {
    throw new Error(`${field}.candidateFingerprint must be non-empty after materialization`);
  }
  if (value.state === "resolved") {
    if (ticket?.status !== "closed") throw new Error(`${field}.ticket must be closed when resolved`);
    if (resolvedAt === null) throw new Error(`${field}.resolvedAt is required when resolved`);
    if (typeof value.calibrationNote !== "string" || value.calibrationNote.trim() === "") {
      throw new Error(`${field}.calibrationNote must be non-empty when resolved`);
    }
  }
  if (value.successor !== null && value.successor !== undefined) {
    if (!value.successor || typeof value.successor !== "object" || Array.isArray(value.successor)) {
      throw new Error(`${field}.successor must be null or an object`);
    }
    for (const name of ["hypothesis", "pageCohortFingerprint", "evidence"]) {
      nonEmptyString(value.successor[name], `${field}.successor.${name}`);
    }
  }
  if (value.state === "superseded") {
    if (!value.successor) throw new Error(`${field}.successor is required when superseded`);
    if (ticket?.status === "open") throw new Error(`${field}.ticket must be closed or null when superseded`);
  } else if (value.successor !== null && value.successor !== undefined) {
    throw new Error(`${field}.successor must be null unless superseded`);
  }
  validatePriorityArea(value, field);
}

function validateShipEvent(value, index, source, seen) {
  const field = `${source} events[${index}]`;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object`);
  nonEmptyString(value.eventId, `${field}.eventId`);
  nonEmptyString(value.dedupeKey, `${field}.dedupeKey`);
  parseTimestamp(value.publishedAt, `${field}.publishedAt`);
  nonEmptyString(value.initiatedBy, `${field}.initiatedBy`);
  if (!SHIP_SOURCES.has(value.source)) throw new Error(`${field}.source must be deploy, webhook, pseo-batch, or other`);
  if (value.ticketId !== null && value.ticketId !== undefined && (typeof value.ticketId !== "string" || value.ticketId.trim() === "")) {
    throw new Error(`${field}.ticketId must be a non-empty string or null`);
  }
  if (!Array.isArray(value.urls) || value.urls.length === 0) throw new Error(`${field}.urls must be a non-empty array`);
  value.urls.forEach((url, i) => nonEmptyString(url, `${field}.urls[${i}]`));
  if (new Set(value.urls).size !== value.urls.length) throw new Error(`${field}.urls must not contain duplicates`);
  if (!QUALIFICATIONS.has(value.qualification)) throw new Error(`${field}.qualification must be qualified or ambiguous`);
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) throw new Error(`${field}.evidence must be a non-empty array`);
  value.evidence.forEach((entry, i) => nonEmptyString(entry, `${field}.evidence[${i}]`));
  if (seen.dedupeKeys.has(value.dedupeKey)) throw new Error(`${field}.dedupeKey duplicates events[${seen.dedupeKeys.get(value.dedupeKey)}]`);
  seen.dedupeKeys.set(value.dedupeKey, index);
  if (seen.eventIds.has(value.eventId)) throw new Error(`${field}.eventId duplicates events[${seen.eventIds.get(value.eventId)}]`);
  seen.eventIds.set(value.eventId, index);
}

function validateCapExceptions(value, source) {
  if (value === undefined) return;
  if (!Array.isArray(value)) throw new Error(`${source} capExceptions must be an array when present`);
  value.forEach((grant, index) => {
    const field = `${source} capExceptions[${index}]`;
    if (!grant || typeof grant !== "object" || Array.isArray(grant)) throw new Error(`${field} must be an object`);
    parseDate(grant.dated, `${field}.dated`);
    nonEmptyString(grant.grantedBy, `${field}.grantedBy`);
    nonEmptyString(grant.site, `${field}.site`);
    nonEmptyString(grant.reason, `${field}.reason`);
    if (!Array.isArray(grant.urls) || grant.urls.length === 0) throw new Error(`${field}.urls must be a non-empty array`);
    grant.urls.forEach((url, i) => nonEmptyString(url, `${field}.urls[${i}]`));
  });
}

function validateStageStamp(value, source) {
  if (value === undefined || value === null) return;
  const field = `${source} stageStamp`;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object`);
  if (!STAGES.has(value.stage)) throw new Error(`${field}.stage must be unknown, early, growth, or mature`);
  parseDate(value.evaluated, `${field}.evaluated`);
}

function validateCoverageRow(rung, row, source) {
  if (!/^[A-J]$/.test(rung)) throw new Error(`${source} rung key ${JSON.stringify(rung)} must be a letter A-J`);
  if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`${source} rungs.${rung} must be an object`);
  parseDate(row.observedAt, `${source} rungs.${rung}.observedAt`);
  if (!Number.isInteger(row.maxAgeDays) || row.maxAgeDays < 1) throw new Error(`${source} rungs.${rung}.maxAgeDays must be a positive integer`);
  nonEmptyString(row.artifact, `${source} rungs.${rung}.artifact`);
  if (row.staleAsOf !== undefined) parseDate(row.staleAsOf, `${source} rungs.${rung}.staleAsOf`);
  if (row.staleReason !== undefined) nonEmptyString(row.staleReason, `${source} rungs.${rung}.staleReason`);
}

function validateWakeFields(payload, source, failures) {
  if (Object.hasOwn(payload, "nextWakeAt") && payload.nextWakeAt !== null) {
    try {
      parseDate(payload.nextWakeAt, `${source} nextWakeAt`);
    } catch (error) {
      failures.push({ file: source, reason: error.message });
    }
  }
  if (Object.hasOwn(payload, "wakeOn") && payload.wakeOn !== null) {
    if (!Array.isArray(payload.wakeOn)) {
      failures.push({ file: source, reason: `${source} wakeOn must be null or an array` });
      return;
    }
    payload.wakeOn.forEach((entry, index) => {
      try {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`${source} wakeOn[${index}] must be an object`);
        for (const name of ["predicate", "source", "owner", "fingerprint"]) {
          nonEmptyString(entry[name], `${source} wakeOn[${index}].${name}`);
        }
      } catch (error) {
        failures.push({ file: source, reason: error.message });
      }
    });
  }
}

function validateSleepCertificate(cert, source) {
  const field = `${source} sleepCertificate`;
  if (!cert || typeof cert !== "object" || Array.isArray(cert)) throw new Error(`${field} must be an object`);
  parseDate(cert.dated, `${field}.dated`);
  nonEmptyString(cert.dedupeKey, `${field}.dedupeKey`);
  if (!cert.fingerprint || typeof cert.fingerprint !== "object" || Array.isArray(cert.fingerprint)) {
    throw new Error(`${field}.fingerprint must be an object`);
  }
  for (const name of ["target", "mode", "requestedSurface", "remit", "mutationCeiling", "authorizationClass"]) {
    nonEmptyString(cert.fingerprint[name], `${field}.fingerprint.${name}`);
  }
  if (!Array.isArray(cert.checkedEvidence) || cert.checkedEvidence.length === 0) {
    throw new Error(`${field}.checkedEvidence must be a non-empty array`);
  }
  cert.checkedEvidence.forEach((entry, i) => nonEmptyString(entry, `${field}.checkedEvidence[${i}]`));
  // gateFailures documents candidates REJECTED at eligibility gates during the
  // sweep (required evidence for a "nothing valuable" claim) — it is not a list
  // of unresolved blockers, so a non-empty array is legal on a valid certificate.
  if (!Array.isArray(cert.gateFailures)) throw new Error(`${field}.gateFailures must be an array`);
  cert.gateFailures.forEach((entry, i) => nonEmptyString(entry, `${field}.gateFailures[${i}]`));
  const earliestNextDue = nullableDate(cert.earliestNextDue, `${field}.earliestNextDue`);
  if (!Array.isArray(cert.wakeOn ?? [])) throw new Error(`${field}.wakeOn must be an array`);
  (cert.wakeOn ?? []).forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`${field}.wakeOn[${index}] must be an object`);
    for (const name of ["predicate", "source", "owner", "fingerprint"]) {
      nonEmptyString(entry[name], `${field}.wakeOn[${index}].${name}`);
    }
  });
  if (earliestNextDue === null && (cert.wakeOn ?? []).length === 0) {
    throw new Error(`${field} requires earliestNextDue and/or a wakeOn predicate for continuity`);
  }
  if (cert.coverage !== "complete" && cert.coverage !== "partial") throw new Error(`${field}.coverage must be complete or partial`);
  if (cert.heartbeatAt !== undefined) parseTimestamp(cert.heartbeatAt, `${field}.heartbeatAt`);
}

// ---------- workspace IO ----------

function failedWorkspace(failures) {
  const absent = { state: "absent", payload: null };
  return { failures, loopFiles: [], obligationsFile: absent, shipsFile: absent, coverageFile: absent };
}

function readJsonFile(absolute, source, failures) {
  let text;
  try {
    text = readFileSync(absolute, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") return { state: "absent", payload: null };
    failures.push({ file: source, reason: `cannot read (${error.code ?? error.name})` });
    return { state: "invalid", payload: null };
  }
  try {
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      failures.push({ file: source, reason: "must be a JSON object" });
      return { state: "invalid", payload: null };
    }
    return { state: "present", payload };
  } catch (error) {
    failures.push({ file: source, reason: `invalid JSON: ${error.message}` });
    return { state: "invalid", payload: null };
  }
}

function atomicWriteJson(absolute, payload) {
  mkdirSync(path.dirname(absolute), { recursive: true });
  // Unique name + O_EXCL ("wx"): never follows or truncates a pre-planted
  // symlink at a predictable temp path.
  const tmp = `${absolute}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, { flag: "wx" });
  try {
    renameSync(tmp, absolute);
  } catch (error) {
    rmSync(tmp, { force: true });
    throw error;
  }
}

function loadWorkspace(workspace) {
  const failures = [];
  try {
    if (!statSync(workspace).isDirectory()) {
      return failedWorkspace([{ file: ".", reason: "workspace root is not a directory" }]);
    }
  } catch (error) {
    const reason = error.code === "ENOENT" ? "workspace root does not exist" : `cannot inspect workspace root (${error.code ?? error.name})`;
    return failedWorkspace([{ file: ".", reason }]);
  }
  const loops = path.join(workspace, "loops");
  const loopFiles = [];
  let entries = [];
  try {
    entries = readdirSync(loops, { withFileTypes: true })
      .filter((entry) => (entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith(".json") && !RESERVED_LOOP_FILES.has(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (error.code !== "ENOENT") failures.push({ file: "loops", reason: `cannot read loops directory (${error.code ?? error.name})` });
  }
  for (const entry of entries) {
    const source = path.join("loops", entry.name);
    const { state, payload } = readJsonFile(path.join(workspace, source), source, failures);
    if (state !== "present") continue;
    validateWakeFields(payload, source, failures);
    try {
      validateStageStamp(payload.stageStamp, source);
    } catch (error) {
      failures.push({ file: source, reason: error.message });
    }
    if (Object.hasOwn(payload, "sleepCertificate") && payload.sleepCertificate !== null) {
      try {
        validateSleepCertificate(payload.sleepCertificate, source);
      } catch (error) {
        failures.push({ file: source, reason: error.message });
      }
    }
    if (Object.hasOwn(payload, "occurrences")) {
      try {
        validateSchemaEnvelope(payload);
        if (!payload.occurrences || typeof payload.occurrences !== "object" || Array.isArray(payload.occurrences)) {
          throw new Error("occurrences must be an object map");
        }
        for (const [key, value] of Object.entries(payload.occurrences)) validateOccurrence(key, value, source);
      } catch (error) {
        failures.push({ file: source, reason: error.message });
      }
    }
    loopFiles.push({ name: entry.name, source, payload });
  }
  const identities = new Map();
  for (const file of loopFiles) {
    for (const key of Object.keys(file.payload.occurrences ?? {})) {
      const prior = identities.get(key);
      if (prior) failures.push({ file: file.source, reason: `duplicate occurrence identity ${key}; already defined in ${prior}` });
      else identities.set(key, file.source);
    }
  }

  const obligationsFile = readJsonFile(path.join(workspace, "loops", "measurement-obligations.json"), "loops/measurement-obligations.json", failures);
  if (obligationsFile.state === "present") {
    try {
      validateSchemaEnvelope(obligationsFile.payload);
      const map = obligationsFile.payload.obligations;
      if (!map || typeof map !== "object" || Array.isArray(map)) throw new Error("obligations must be an object map");
      for (const [key, value] of Object.entries(map)) validateObligation(key, value, "loops/measurement-obligations.json");
    } catch (error) {
      failures.push({ file: "loops/measurement-obligations.json", reason: error.message });
    }
  }

  const shipsFile = readJsonFile(path.join(workspace, "loops", "ship-events.json"), "loops/ship-events.json", failures);
  if (shipsFile.state === "present") {
    try {
      validateSchemaEnvelope(shipsFile.payload);
      if (!Array.isArray(shipsFile.payload.events)) throw new Error("events must be an array");
      const seen = { dedupeKeys: new Map(), eventIds: new Map() };
      shipsFile.payload.events.forEach((event, index) => validateShipEvent(event, index, "loops/ship-events.json", seen));
      validateCapExceptions(shipsFile.payload.capExceptions, "loops/ship-events.json");
    } catch (error) {
      failures.push({ file: "loops/ship-events.json", reason: error.message });
    }
  }

  const coverageFile = readJsonFile(path.join(workspace, "loops", "coverage-ledger.json"), "loops/coverage-ledger.json", failures);
  if (coverageFile.state === "present") {
    try {
      validateSchemaEnvelope(coverageFile.payload);
      const rungs = coverageFile.payload.rungs;
      if (!rungs || typeof rungs !== "object" || Array.isArray(rungs)) throw new Error("rungs must be an object map");
      for (const [rung, row] of Object.entries(rungs)) validateCoverageRow(rung, row, "loops/coverage-ledger.json");
    } catch (error) {
      failures.push({ file: "loops/coverage-ledger.json", reason: error.message });
    }
  }

  return { failures, loopFiles, obligationsFile, shipsFile, coverageFile };
}

function readStamp(workspace) {
  const empty = { reconciledSkillVersion: null, reconciledAt: null, report: null };
  let text;
  try {
    text = readFileSync(path.join(workspace, "reconciliation.json"), "utf-8");
  } catch (error) {
    return { stampState: error.code === "ENOENT" ? "absent" : "malformed", ...empty };
  }
  try {
    const parsed = JSON.parse(text);
    const reportValid = (value) => value === null || (
      typeof value === "string" && value.length > 0
      && !path.win32.isAbsolute(value) && !path.posix.isAbsolute(value)
      && !/^[A-Za-z]:/.test(value) && !value.split(/[\\/]/).includes("..")
    );
    if (
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
      && parsed.schema === 1
      && typeof parsed.reconciledSkillVersion === "string" && parsed.reconciledSkillVersion.length > 0
      && typeof parsed.reconciledAt === "string" && isCalendarDate(parsed.reconciledAt)
      && Object.hasOwn(parsed, "report") && reportValid(parsed.report)
    ) {
      return {
        stampState: "present",
        reconciledSkillVersion: parsed.reconciledSkillVersion,
        reconciledAt: parsed.reconciledAt,
        report: parsed.report,
      };
    }
    return { stampState: "malformed", ...empty };
  } catch {
    return { stampState: "malformed", ...empty };
  }
}

function safeVersion(value, source) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) {
    throw usageError(`${source} version ${JSON.stringify(value)} must match [A-Za-z0-9._-]{1,64} (it becomes a filename component)`);
  }
  return value;
}

function installedVersion(args) {
  if (args.installed) return safeVersion(args.installed, "--installed");
  const skillPath = args.skill
    ? path.resolve(args.skill)
    : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "SKILL.md");
  let text;
  try {
    text = readFileSync(skillPath, "utf-8");
  } catch (error) {
    throw usageError(`cannot read installed version from ${skillPath} (${error.code ?? error.name}); pass --installed or --skill`);
  }
  const match = /^version:\s*(\S+)\s*$/m.exec(text);
  if (!match) throw usageError(`no version: frontmatter line in ${skillPath}`);
  return safeVersion(match[1], skillPath);
}

function addDays(date, days) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ---------- analysis shared by verify / sleep certify ----------

function analyzeWorkspace(state, now) {
  const inFlightOccurrences = [];
  for (const file of state.loopFiles) {
    for (const [key, value] of Object.entries(file.payload.occurrences ?? {})) {
      if ((value.state === "materialized" || value.state === "attempted") && value.ticket?.status === "open") {
        inFlightOccurrences.push({ file: file.source, identity: key });
      }
    }
  }
  const inFlightObligations = [];
  for (const [key, value] of Object.entries(state.obligationsFile.payload?.obligations ?? {})) {
    if (value.state === "materialized" && (value.ticket === null || value.ticket?.status === "open" || value.ticket?.status === "closed")) {
      // Every materialized row is either actively owned by its open ticket or a
      // crash intermediate (null or closed ticket); all demand reconciliation
      // before sleep.
      inFlightObligations.push({ file: "loops/measurement-obligations.json", identity: key, ticketStatus: value.ticket?.status ?? null });
    }
  }
  const staleRungs = [];
  const annotatedRungs = [];
  const mirrorDrift = [];
  for (const [rung, row] of Object.entries(state.coverageFile.payload?.rungs ?? {})) {
    const policyAge = COVERAGE_MAX_AGE_DAYS[rung];
    const expiresAt = addDays(row.observedAt, policyAge);
    if (expiresAt <= now.date) staleRungs.push({ rung, observedAt: row.observedAt, expiresAt });
    if (row.staleAsOf !== undefined && row.staleAsOf <= now.date) {
      annotatedRungs.push({ rung, staleAsOf: row.staleAsOf, staleReason: row.staleReason ?? null });
    }
    if (row.maxAgeDays !== policyAge) mirrorDrift.push({ rung, stored: row.maxAgeDays, policy: policyAge });
  }
  const autopublish = [];
  for (const file of state.loopFiles) {
    const mirror = file.payload.schedulerMirror;
    if (mirror && typeof mirror === "object" && !Array.isArray(mirror) && mirror.autoPublish === true && mirror.enabled !== false) {
      autopublish.push({ file: file.source, nextPublishWindow: mirror.nextPublishWindow ?? null });
    }
  }
  return { inFlightOccurrences, inFlightObligations, staleRungs, annotatedRungs, mirrorDrift, autopublish };
}

function qualityWatchCovers(state, windowValue) {
  const publishDate = typeof windowValue === "string" ? windowValue.slice(0, 10) : null;
  for (const file of state.loopFiles) {
    for (const value of Object.values(file.payload.occurrences ?? {})) {
      if (!/quality-watch|autopublish/i.test(value.cadenceId)) continue;
      if (publishDate === null) return true;
      const [start, end] = value.dueWindow.split("/");
      if (start <= publishDate && publishDate <= end) return true;
    }
  }
  return false;
}

// ---------- commands ----------

function cmdVerify(workspace, args) {
  const now = parseNow(args.now);
  const state = loadWorkspace(workspace);
  const stamp = readStamp(workspace);
  if (state.failures.length > 0) {
    return { exitCode: EXIT.MALFORMED, report: { command: "verify", status: "fail_closed", failures: state.failures, stamp } };
  }
  const analysis = analyzeWorkspace(state, now);
  let repaired = [];
  if (args.repair && analysis.mirrorDrift.length > 0) {
    const payload = state.coverageFile.payload;
    for (const { rung, policy } of analysis.mirrorDrift) payload.rungs[rung].maxAgeDays = policy;
    atomicWriteJson(path.join(workspace, "loops", "coverage-ledger.json"), payload);
    repaired = analysis.mirrorDrift;
    analysis.mirrorDrift = [];
  }
  return {
    exitCode: EXIT.OK,
    report: {
      command: "verify",
      status: "ok",
      now: now.date,
      loopFiles: state.loopFiles.map((file) => file.source),
      occurrenceCount: state.loopFiles.reduce((sum, file) => sum + Object.keys(file.payload.occurrences ?? {}).length, 0),
      obligationCount: Object.keys(state.obligationsFile.payload?.obligations ?? {}).length,
      shipEventCount: state.shipsFile.payload?.events?.length ?? 0,
      coverageRungs: Object.keys(state.coverageFile.payload?.rungs ?? {}),
      stamp,
      notes: {
        inFlightOccurrences: analysis.inFlightOccurrences,
        inFlightObligations: analysis.inFlightObligations,
        staleRungs: analysis.staleRungs,
        annotatedRungs: analysis.annotatedRungs,
        mirrorDrift: analysis.mirrorDrift,
        armedAutopublish: analysis.autopublish,
        repairedMirrors: repaired,
      },
    },
  };
}

function requireValidWorkspace(workspace) {
  const state = loadWorkspace(workspace);
  if (state.failures.length > 0) {
    throw refusal(EXIT.MALFORMED, "workspace loop state is malformed; run verify and repair forward first", { failures: state.failures });
  }
  return state;
}

function findLoopFile(state, workspace, loopName) {
  if (!loopName || !loopName.endsWith(".json") || RESERVED_LOOP_FILES.has(loopName) || path.basename(loopName) !== loopName) {
    throw usageError("--loop must name a non-reserved .json file directly under loops/");
  }
  const existing = state.loopFiles.find((file) => file.name === loopName);
  if (existing) return existing;
  const created = { name: loopName, source: path.join("loops", loopName), payload: { schema: 1 } };
  state.loopFiles.push(created);
  return created;
}

function findOccurrenceAnywhere(state, cadenceId, dueWindow) {
  const key = JSON.stringify([cadenceId, dueWindow]);
  for (const file of state.loopFiles) {
    if (file.payload.occurrences?.[key]) return { key, file, record: file.payload.occurrences[key] };
  }
  return { key, file: null, record: null };
}

function writeLoopFile(workspace, file) {
  atomicWriteJson(path.join(workspace, file.source), file.payload);
}

function cmdOccurrence(workspace, action, args) {
  const state = requireValidWorkspace(workspace);
  const cadenceId = required(args, "cadence", "--cadence");
  const windowRaw = required(args, "window", "--window");
  parseWindow(windowRaw, "--window");

  if (action === "add") {
    const loopName = required(args, "loop", "--loop");
    const dueAt = parseDate(required(args, "due-at", "--due-at"), "--due-at");
    const fingerprint = required(args, "fingerprint", "--fingerprint");
    const existing = findOccurrenceAnywhere(state, cadenceId, windowRaw);
    if (existing.record) {
      const sameRequest = existing.record.state === "due"
        && existing.record.candidateFingerprint === fingerprint
        && existing.record.dueAt === dueAt
        && (args.priority === undefined || existing.record.priority === args.priority)
        && (args.area === undefined || existing.record.area === args.area);
      if (sameRequest) {
        return { exitCode: EXIT.OK, report: { command: "occurrence add", status: "noop", reason: "identity already present with the same values", file: existing.file.source } };
      }
      throw refusal(EXIT.REFUSED, `occurrence ${existing.key} already exists in ${existing.file.source} (state ${existing.record.state}); same-window re-materialization always deduplicates and only an identical retry is a no-op`);
    }
    const file = findLoopFile(state, workspace, loopName);
    const record = {
      cadenceId,
      dueWindow: windowRaw,
      dueAt,
      state: "due",
      candidateFingerprint: fingerprint,
      ticket: null,
      result: null,
      attempt: 0,
      nextAt: null,
      maxAt: null,
      escalation: "none",
    };
    if (args.priority !== undefined) record.priority = args.priority;
    if (args.area !== undefined) record.area = args.area;
    const key = JSON.stringify([cadenceId, windowRaw]);
    validateOccurrence(key, record, file.source);
    file.payload.occurrences = { ...(file.payload.occurrences ?? {}), [key]: record };
    writeLoopFile(workspace, file);
    return { exitCode: EXIT.OK, report: { command: "occurrence add", status: "written", file: file.source, identity: key } };
  }

  const { key, file, record } = findOccurrenceAnywhere(state, cadenceId, windowRaw);
  if (!record) throw refusal(EXIT.REFUSED, `occurrence ${key} does not exist; run occurrence add first`);
  const finish = (nextRecord, status = "written") => {
    validateOccurrence(key, nextRecord, file.source);
    file.payload.occurrences[key] = nextRecord;
    writeLoopFile(workspace, file);
    return { exitCode: EXIT.OK, report: { command: `occurrence ${action}`, status, file: file.source, identity: key, state: nextRecord.state } };
  };

  if (action === "materialize") {
    const ticketId = required(args, "ticket", "--ticket");
    if (record.state === "materialized" && record.ticket?.id === ticketId) {
      return { exitCode: EXIT.OK, report: { command: "occurrence materialize", status: "noop", reason: "already materialized against that ticket", file: file.source, identity: key } };
    }
    if (record.state !== "due") throw refusal(EXIT.REFUSED, `occurrence ${key} is ${record.state}; materialize requires due`);
    return finish({ ...record, state: "materialized", ticket: { id: ticketId, status: "open" } });
  }
  if (action === "attempt") {
    if (record.state === "attempted") {
      return { exitCode: EXIT.OK, report: { command: "occurrence attempt", status: "noop", reason: "already attempted", file: file.source, identity: key } };
    }
    if (record.state !== "materialized" && record.state !== "blockedUntil") {
      throw refusal(EXIT.REFUSED, `occurrence ${key} is ${record.state}; attempt requires materialized or blockedUntil (retries reuse the ticket)`);
    }
    return finish({ ...record, state: "attempted", nextAt: null, maxAt: null });
  }
  if (action === "satisfy") {
    const result = required(args, "result", "--result");
    if (!RESULTS.has(result)) throw usageError("--result must be ok or alerted");
    if (record.state === "satisfied" && record.result === result) {
      return { exitCode: EXIT.OK, report: { command: "occurrence satisfy", status: "noop", reason: "already satisfied", file: file.source, identity: key } };
    }
    if (record.state !== "attempted") throw refusal(EXIT.REFUSED, `occurrence ${key} is ${record.state}; satisfy requires attempted`);
    return finish({ ...record, state: "satisfied", result, ticket: { ...record.ticket, status: "closed" } });
  }
  if (action === "block") {
    const nextAt = parseDate(required(args, "next-at", "--next-at"), "--next-at");
    const maxAt = parseDate(required(args, "max-at", "--max-at"), "--max-at");
    const escalation = args["needs-human"] ? "needs_human" : record.escalation;
    if (record.state === "blockedUntil" && record.nextAt === nextAt && record.maxAt === maxAt && record.escalation === escalation) {
      return { exitCode: EXIT.OK, report: { command: "occurrence block", status: "noop", reason: "already blocked with the same backoff", file: file.source, identity: key } };
    }
    if (record.state !== "materialized" && record.state !== "attempted" && record.state !== "blockedUntil") {
      throw refusal(EXIT.REFUSED, `occurrence ${key} is ${record.state}; block requires materialized, attempted, or blockedUntil`);
    }
    return finish({
      ...record,
      state: "blockedUntil",
      attempt: record.attempt + 1,
      nextAt,
      maxAt,
      escalation,
    });
  }
  throw usageError(`unknown occurrence action "${action}"`);
}

function loadObligations(state, workspace) {
  if (state.obligationsFile.state === "absent") {
    state.obligationsFile = { state: "present", payload: { schema: 1, obligations: {} } };
  }
  return {
    payload: state.obligationsFile.payload,
    write: () => atomicWriteJson(path.join(workspace, "loops", "measurement-obligations.json"), state.obligationsFile.payload),
  };
}

function cmdObligation(workspace, action, args) {
  const state = requireValidWorkspace(workspace);
  const hypothesis = required(args, "hypothesis", "--hypothesis");
  const cohort = required(args, "cohort", "--cohort");
  const key = JSON.stringify([hypothesis, cohort]);
  const ledger = loadObligations(state, workspace);
  const record = ledger.payload.obligations[key];
  const finish = (nextRecord, status = "written", extra = {}) => {
    validateObligation(key, nextRecord, "loops/measurement-obligations.json");
    ledger.payload.obligations[key] = nextRecord;
    ledger.write();
    return { exitCode: EXIT.OK, report: { command: `obligation ${action}`, status, identity: key, state: nextRecord.state, ...extra } };
  };

  if (action === "add") {
    const next = {
      hypothesis,
      pageCohortFingerprint: cohort,
      baseline: {
        measuredAt: parseDate(required(args, "baseline-measured-at", "--baseline-measured-at"), "--baseline-measured-at"),
        value: required(args, "baseline-value", "--baseline-value"),
        evidence: required(args, "baseline-evidence", "--baseline-evidence"),
      },
      metric: required(args, "metric", "--metric"),
      decision: required(args, "decision", "--decision"),
      dueAt: parseDate(required(args, "due-at", "--due-at"), "--due-at"),
      state: "pending",
      candidateFingerprint: null,
      ticket: null,
      attempts: [],
      wakeAt: args["wake-at"] ? parseDate(args["wake-at"], "--wake-at") : parseDate(args["due-at"], "--due-at"),
      resolvedAt: null,
      calibrationNote: null,
      successor: null,
    };
    if (args.priority !== undefined) next.priority = args.priority;
    if (args.area !== undefined) next.area = args.area;
    if (record) {
      if (record.state === "pending" && JSON.stringify(record.baseline) === JSON.stringify(next.baseline) && record.dueAt === next.dueAt) {
        return { exitCode: EXIT.OK, report: { command: "obligation add", status: "noop", reason: "identity already present with the same baseline", identity: key } };
      }
      throw refusal(EXIT.REFUSED, `obligation ${key} already exists (state ${record.state})`);
    }
    return finish(next);
  }

  if (!record) throw refusal(EXIT.REFUSED, `obligation ${key} does not exist; run obligation add first`);

  if (action === "claim") {
    const fingerprint = required(args, "fingerprint", "--fingerprint");
    if (record.candidateFingerprint === fingerprint && (record.state === "pending" || record.state === "due")) {
      return { exitCode: EXIT.OK, report: { command: "obligation claim", status: "noop", reason: "fingerprint already persisted", identity: key } };
    }
    if (record.state !== "pending" && record.state !== "due") {
      throw refusal(EXIT.REFUSED, `obligation ${key} is ${record.state}; claim requires pending or due`);
    }
    if (record.candidateFingerprint !== null && record.candidateFingerprint !== fingerprint) {
      throw refusal(EXIT.REFUSED, `obligation ${key} already carries fingerprint ${record.candidateFingerprint}; reconcile the in-progress materialization instead`);
    }
    return finish({ ...record, candidateFingerprint: fingerprint });
  }
  if (action === "materialize") {
    const ticketId = required(args, "ticket", "--ticket");
    if (record.state === "materialized" && record.ticket?.id === ticketId) {
      return { exitCode: EXIT.OK, report: { command: "obligation materialize", status: "noop", reason: "already materialized against that ticket", identity: key } };
    }
    if (record.state === "materialized" && record.ticket === null) {
      // Legal crash intermediate: fingerprint persisted and state advanced, ticket
      // link lost. Reconciliation repairs the missing link.
      return finish({ ...record, ticket: { id: ticketId, status: "open" } }, "reconciled");
    }
    if (record.state !== "pending" && record.state !== "due") {
      throw refusal(EXIT.REFUSED, `obligation ${key} is ${record.state}; materialize requires pending or due`);
    }
    if (record.candidateFingerprint === null) {
      throw refusal(EXIT.REFUSED, `obligation ${key} has no persisted candidate fingerprint; run obligation claim first (crash-retryable materialization)`);
    }
    return finish({ ...record, state: "materialized", ticket: { id: ticketId, status: "open" } });
  }
  if (action === "resolve") {
    const resolvedAt = parseDate(required(args, "resolved-at", "--resolved-at"), "--resolved-at");
    const note = required(args, "note", "--note");
    if (record.state === "resolved" && record.resolvedAt === resolvedAt) {
      return { exitCode: EXIT.OK, report: { command: "obligation resolve", status: "noop", reason: "already resolved", identity: key } };
    }
    if (record.state !== "materialized") throw refusal(EXIT.REFUSED, `obligation ${key} is ${record.state}; resolve requires materialized`);
    if (record.ticket === null) throw refusal(EXIT.REFUSED, `obligation ${key} has no ticket link; reconcile the crash intermediate with obligation materialize first`);
    return finish({ ...record, state: "resolved", ticket: { ...record.ticket, status: "closed" }, resolvedAt, calibrationNote: note });
  }
  if (action === "inconclusive") {
    const attempt = {
      attemptedAt: parseDate(required(args, "attempted-at", "--attempted-at"), "--attempted-at"),
      reason: required(args, "reason", "--reason"),
      evidence: required(args, "evidence-note", "--evidence-note"),
    };
    const wakeAt = parseDate(required(args, "wake-at", "--wake-at"), "--wake-at");
    if (record.state !== "materialized") throw refusal(EXIT.REFUSED, `obligation ${key} is ${record.state}; inconclusive requires materialized`);
    if (record.attempts.some((prior) => prior.attemptedAt === attempt.attemptedAt && prior.reason === attempt.reason)) {
      return { exitCode: EXIT.OK, report: { command: "obligation inconclusive", status: "noop", reason: "attempt already recorded", identity: key } };
    }
    return finish({
      ...record,
      state: "pending",
      candidateFingerprint: null,
      ticket: null,
      attempts: [...record.attempts, attempt],
      wakeAt,
    });
  }
  if (action === "supersede") {
    const successor = {
      hypothesis: required(args, "successor-hypothesis", "--successor-hypothesis"),
      pageCohortFingerprint: required(args, "successor-cohort", "--successor-cohort"),
      evidence: required(args, "successor-evidence", "--successor-evidence"),
    };
    if (record.state === "superseded") {
      return { exitCode: EXIT.OK, report: { command: "obligation supersede", status: "noop", reason: "already superseded", identity: key } };
    }
    if (record.state === "resolved") throw refusal(EXIT.REFUSED, `obligation ${key} is resolved; supersession retains only unresolved lineage`);
    const ticket = record.ticket === null ? null : { ...record.ticket, status: "closed" };
    return finish({ ...record, state: "superseded", ticket, successor });
  }
  throw usageError(`unknown obligation action "${action}"`);
}

function cmdShipRecord(workspace, args) {
  const state = requireValidWorkspace(workspace);
  if (state.shipsFile.state === "absent") state.shipsFile = { state: "present", payload: { schema: 1, events: [] } };
  const payload = state.shipsFile.payload;
  const event = {
    eventId: required(args, "event-id", "--event-id"),
    dedupeKey: required(args, "dedupe-key", "--dedupe-key"),
    publishedAt: required(args, "published-at", "--published-at"),
    initiatedBy: required(args, "initiated-by", "--initiated-by"),
    source: required(args, "source", "--source"),
    ticketId: args.ticket ?? null,
    urls: [...new Set(args.urls)].sort(),
    qualification: required(args, "qualification", "--qualification"),
    evidence: args.evidence,
  };
  if (event.urls.length === 0) throw usageError("--url is required at least once");
  const existing = payload.events.find((candidate) => candidate.dedupeKey === event.dedupeKey);
  if (existing) {
    if (existing.eventId === event.eventId) {
      return { exitCode: EXIT.OK, report: { command: "ship record", status: "noop", reason: "dedupeKey already recorded", eventId: existing.eventId } };
    }
    throw refusal(EXIT.REFUSED, `dedupeKey already recorded under eventId ${existing.eventId}; a retry must reuse the same event identity`);
  }
  const seen = { dedupeKeys: new Map(), eventIds: new Map() };
  payload.events.forEach((prior, index) => {
    seen.dedupeKeys.set(prior.dedupeKey, index);
    seen.eventIds.set(prior.eventId, index);
  });
  validateShipEvent(event, payload.events.length, "loops/ship-events.json", seen);
  payload.events.push(event);
  atomicWriteJson(path.join(workspace, "loops", "ship-events.json"), payload);
  return { exitCode: EXIT.OK, report: { command: "ship record", status: "written", eventId: event.eventId, countedUrls: event.urls.length } };
}

function resolveStage(state, args) {
  if (args.stage) {
    if (!STAGES.has(args.stage)) throw usageError("--stage must be unknown, early, growth, or mature");
    return { stage: args.stage, source: "--stage" };
  }
  let best = null;
  for (const file of state.loopFiles) {
    const stampValue = file.payload.stageStamp;
    if (!stampValue || typeof stampValue !== "object" || Array.isArray(stampValue)) continue;
    if (!STAGES.has(stampValue.stage) || !isCalendarDate(stampValue.evaluated)) continue;
    if (!best || stampValue.evaluated > best.evaluated) best = { stage: stampValue.stage, evaluated: stampValue.evaluated, source: file.source };
  }
  if (best) return { stage: best.stage, source: `${best.source} stageStamp (${best.evaluated})` };
  return { stage: "unknown", source: "default (no stageStamp found)" };
}

function cmdCap(workspace, args) {
  const now = parseNow(args.now);
  const state = requireValidWorkspace(workspace);
  const { stage, source } = resolveStage(state, args);
  const cap = SHIP_CAPS[stage];
  const events = state.shipsFile.payload?.events ?? [];
  const exceptions = Array.isArray(state.shipsFile.payload?.capExceptions) ? state.shipsFile.payload.capExceptions : [];
  const exceptionUrls = new Set(exceptions.flatMap((grant) => (Array.isArray(grant?.urls) ? grant.urls : [])));
  const windowStartMs = now.instant.valueOf() - 7 * 86400000;
  const counted = [];
  const excepted = [];
  for (const event of events) {
    const publishedMs = new Date(event.publishedAt).valueOf();
    if (publishedMs <= windowStartMs || publishedMs > now.instant.valueOf()) continue;
    const covered = event.urls.every((url) => exceptionUrls.has(url));
    (covered ? excepted : counted).push({ eventId: event.eventId, publishedAt: event.publishedAt, urls: event.urls, qualification: event.qualification });
  }
  const remaining = Math.max(0, cap - counted.length);
  const report = {
    command: "cap",
    now: now.instant.toISOString(),
    stage,
    stageSource: source,
    cap,
    counted: counted.length,
    excepted: excepted.length,
    remaining,
    countedEvents: counted,
    exceptedEvents: excepted,
  };
  return { exitCode: remaining > 0 ? EXIT.OK : EXIT.CAP, report };
}

function cmdSleepCertify(workspace, args) {
  const now = parseNow(args.now);
  const loopName = required(args, "loop", "--loop");
  const payloadPath = required(args, "payload", "--payload");
  const raw = payloadPath === "-" ? readFileSync(0, "utf-8") : readFileSync(path.resolve(payloadPath), "utf-8");
  let cert;
  try {
    cert = JSON.parse(raw);
  } catch (error) {
    throw usageError(`certificate payload is not valid JSON: ${error.message}`);
  }
  if (!cert || typeof cert !== "object" || Array.isArray(cert)) throw usageError("certificate payload must be a JSON object");
  cert = { ...cert, dated: now.date, heartbeatAt: now.instant.toISOString() };
  validateSleepCertificate(cert, `loops/${loopName}`);
  if (cert.earliestNextDue !== null && cert.earliestNextDue !== undefined && cert.earliestNextDue <= now.date) {
    throw usageError(`earliestNextDue ${cert.earliestNextDue} is not after ${now.date}; already-due work cannot certify sleep`);
  }

  const state = requireValidWorkspace(workspace);

  const installed = installedVersion(args);
  const stamp = readStamp(workspace);
  if (stamp.stampState !== "present" || stamp.reconciledSkillVersion !== installed) {
    throw refusal(EXIT.DRIFT, `upgrade drift outstanding (installed ${installed}, stamp ${stamp.stampState === "present" ? stamp.reconciledSkillVersion : stamp.stampState}); no certificate may be minted under drift`, { stamp, installed });
  }

  const analysis = analyzeWorkspace(state, now);
  if (analysis.inFlightOccurrences.length > 0 || analysis.inFlightObligations.length > 0) {
    throw refusal(EXIT.IN_FLIGHT, "unreconciled in-flight occurrence or obligation; re-read the canonical backlog and complete the interrupted transition before sleep", {
      inFlightOccurrences: analysis.inFlightOccurrences,
      inFlightObligations: analysis.inFlightObligations,
    });
  }
  if (cert.coverage === "complete" && (analysis.staleRungs.length > 0 || analysis.annotatedRungs.length > 0)) {
    throw refusal(EXIT.COVERAGE, "coverage=complete requires every rung artifact within max-age and free of staleAsOf annotations", {
      staleRungs: analysis.staleRungs,
      annotatedRungs: analysis.annotatedRungs,
    });
  }
  for (const armed of analysis.autopublish) {
    if (!qualityWatchCovers(state, armed.nextPublishWindow)) {
      throw refusal(EXIT.AUTOPUBLISH, `armed autopublish in ${armed.file} has no quality-watch occurrence covering its next publish window; disarm it or materialize the watch`, { armed });
    }
  }

  const file = findLoopFile(state, workspace, loopName);
  file.payload.sleepCertificate = cert;
  // Mirror (or clear) the wake date so a wakeOn-only recertification cannot
  // leave a stale nextWakeAt disagreeing with its own certificate.
  file.payload.nextWakeAt = cert.earliestNextDue ?? null;
  if (!Object.hasOwn(file.payload, "schema") && !Object.hasOwn(file.payload, "schemaVersion")) file.payload.schema = 1;
  writeLoopFile(workspace, file);
  return {
    exitCode: EXIT.OK,
    report: { command: "sleep certify", status: "written", file: file.source, dated: cert.dated, earliestNextDue: cert.earliestNextDue ?? null, coverage: cert.coverage },
  };
}

function cmdSleepHeartbeat(workspace, args) {
  const now = parseNow(args.now);
  const state = requireValidWorkspace(workspace);
  const loopName = required(args, "loop", "--loop");
  const file = state.loopFiles.find((candidate) => candidate.name === loopName);
  if (!file || !file.payload.sleepCertificate) {
    throw refusal(EXIT.REFUSED, `loops/${loopName} carries no sleep certificate to heartbeat`);
  }
  file.payload.sleepCertificate.heartbeatAt = now.instant.toISOString();
  writeLoopFile(workspace, file);
  return { exitCode: EXIT.OK, report: { command: "sleep heartbeat", status: "written", file: file.source, heartbeatAt: file.payload.sleepCertificate.heartbeatAt } };
}

function cmdStamp(workspace, action, args) {
  const installed = installedVersion(args);
  const stamp = readStamp(workspace);
  if (action === "check") {
    const drift = stamp.stampState !== "present" || stamp.reconciledSkillVersion !== installed;
    return {
      exitCode: drift ? EXIT.DRIFT : EXIT.OK,
      report: { command: "stamp check", installed, drift, ...stamp },
    };
  }
  if (action === "write") {
    const now = parseNow(args.now);
    let report = null;
    if (args.report !== undefined) {
      report = nonEmptyString(args.report, "--report");
      if (path.posix.isAbsolute(report) || path.win32.isAbsolute(report) || /^[A-Za-z]:/.test(report) || report.split(/[\\/]/).includes("..")) {
        throw usageError("--report must be a workspace-relative path");
      }
    }
    atomicWriteJson(path.join(workspace, "reconciliation.json"), {
      schema: 1,
      reconciledSkillVersion: installed,
      reconciledAt: now.date,
      report,
    });
    return { exitCode: EXIT.OK, report: { command: "stamp write", status: "written", reconciledSkillVersion: installed, reconciledAt: now.date, report } };
  }
  if (action === "report-path") {
    const now = parseNow(args.now);
    const base = `reports/${now.date}-upgrade-pass-${installed}`;
    let candidate = `${base}.md`;
    for (let suffix = 2; existsSync(path.join(workspace, candidate)); suffix += 1) {
      candidate = `${base}-${suffix}.md`;
    }
    return { exitCode: EXIT.OK, report: { command: "stamp report-path", path: candidate } };
  }
  throw usageError(`unknown stamp action "${action}"`);
}

// ---------- entry ----------

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    console.log(usage());
    return;
  }
  const args = parseArgs(argv);
  const [command, maybeAction] = args._;
  const workspaceArg = args.workspace;
  if (!workspaceArg) throw usageError("--workspace is required");
  const workspace = path.resolve(workspaceArg);

  const actions = {
    verify: () => cmdVerify(workspace, args),
    occurrence: () => cmdOccurrence(workspace, maybeAction, args),
    obligation: () => cmdObligation(workspace, maybeAction, args),
    ship: () => {
      if (maybeAction !== "record") throw usageError(`unknown ship action "${maybeAction}"`);
      return cmdShipRecord(workspace, args);
    },
    cap: () => cmdCap(workspace, args),
    sleep: () => {
      if (maybeAction === "certify") return cmdSleepCertify(workspace, args);
      if (maybeAction === "heartbeat") return cmdSleepHeartbeat(workspace, args);
      throw usageError(`unknown sleep action "${maybeAction}"`);
    },
    stamp: () => cmdStamp(workspace, maybeAction, args),
  };
  if (!actions[command]) throw usageError(`unknown command "${command}"\n\n${usage()}`);
  const { exitCode, report } = actions[command]();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = exitCode;
}

try {
  main();
} catch (error) {
  const payload = { status: "refused", reason: error.message, ...(error.extra ?? {}) };
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = error.exitCode ?? EXIT.USAGE;
}
