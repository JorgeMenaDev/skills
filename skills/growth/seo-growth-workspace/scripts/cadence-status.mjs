#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const RESERVED_LOOP_FILES = new Set([
  "coverage-ledger.json",
  "measurement-obligations.json",
  "ship-events.json",
  "site-lease.json",
]);
const STATES = new Set(["due", "materialized", "attempted", "satisfied", "blockedUntil"]);
const OBLIGATION_STATES = new Set(["pending", "due", "materialized", "resolved", "superseded"]);
const RESULTS = new Set(["ok", "alerted"]);
const ESCALATIONS = new Set(["none", "needs_human"]);
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WINDOW_PATTERN = /^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/;
const QUALIFIED_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function usage() {
  return `Usage:
  node cadence-status.mjs --workspace <path-to-.seo> [--format backlog|json] [--now <ISO date>]

Cold-reads schema-1 cadence occurrences under <workspace>/loops/ and emits due
occurrences and measurement obligations as draft backlog rows or structured JSON.
It also names the earliest next-due date for sleep-certificate continuity.

Options:
  --workspace  Explicit path to the resolved .seo workspace root.
  --format     backlog (default) or json.
  --now        YYYY-MM-DD or timezone-qualified ISO timestamp (default: current time).

The script is read-only, uses no network, and never materializes tickets.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}\n\n${usage()}`);
  }
  return value;
}

function parseDate(value, field) {
  if (typeof value !== "string") throw new Error(`${field} must be a YYYY-MM-DD date`);
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new Error(`${field} must be a YYYY-MM-DD date`);
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.toISOString().slice(0, 10) !== value) throw new Error(`${field} is not a valid calendar date`);
  return value;
}

function parseNow(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (DATE_PATTERN.test(value)) return parseDate(value, "--now");
  if (!QUALIFIED_TIMESTAMP_PATTERN.test(value)) {
    throw new Error("--now must be YYYY-MM-DD or a timezone-qualified ISO timestamp");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error("--now must be YYYY-MM-DD or a valid timezone-qualified ISO timestamp");
  return parsed.toISOString().slice(0, 10);
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

function nullableDate(value, field) {
  return value === null ? null : parseDate(value, field);
}

function nullableNonEmptyString(value, field) {
  if (value === null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string or null`);
  }
  return value;
}

function validateTicket(value, field) {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be null or an object`);
  }
  if (typeof value.id !== "string" || value.id.trim() === "") {
    throw new Error(`${field}.id must be a non-empty string`);
  }
  if (value.status !== "open" && value.status !== "closed") {
    throw new Error(`${field}.status must be open or closed`);
  }
  return { id: value.id, status: value.status };
}

function validateSchemaEnvelope(payload) {
  const schemas = ["schema", "schemaVersion"].filter((field) => payload[field] !== undefined);
  if (schemas.length === 0) throw new Error("schema or schemaVersion field is missing");
  const invalidSchema = schemas.find((field) => payload[field] !== 1);
  if (invalidSchema) throw new Error(`${invalidSchema} must be 1; received ${JSON.stringify(payload[invalidSchema])}`);
}

function validateOccurrence(key, value, source) {
  const field = `${source} occurrences[${JSON.stringify(key)}]`;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  if (typeof value.cadenceId !== "string" || value.cadenceId.trim() === "") {
    throw new Error(`${field}.cadenceId must be a non-empty string`);
  }
  const window = parseWindow(value.dueWindow, `${field}.dueWindow`);
  if (key !== JSON.stringify([value.cadenceId, value.dueWindow])) {
    throw new Error(`${field} key does not match cadenceId and dueWindow`);
  }
  const dueAt = parseDate(value.dueAt, `${field}.dueAt`);
  if (dueAt < window.start || dueAt > window.end) {
    throw new Error(`${field}.dueAt must fall inside dueWindow`);
  }
  if (!STATES.has(value.state)) throw new Error(`${field}.state is unknown`);
  if (typeof value.candidateFingerprint !== "string" || value.candidateFingerprint.trim() === "") {
    throw new Error(`${field}.candidateFingerprint must be a non-empty string`);
  }
  const ticket = validateTicket(value.ticket, `${field}.ticket`);
  const result = value.result;
  if (result !== null && !RESULTS.has(result)) throw new Error(`${field}.result must be ok, alerted, or null`);
  if (!Number.isInteger(value.attempt) || value.attempt < 0) {
    throw new Error(`${field}.attempt must be a non-negative integer`);
  }
  const nextAt = nullableDate(value.nextAt, `${field}.nextAt`);
  const maxAt = nullableDate(value.maxAt, `${field}.maxAt`);
  if (!ESCALATIONS.has(value.escalation)) {
    throw new Error(`${field}.escalation must be none or needs_human`);
  }
  if (value.state === "satisfied" && !RESULTS.has(result)) {
    throw new Error(`${field}.result must be ok or alerted when satisfied`);
  }
  if (value.state !== "satisfied" && result !== null) {
    throw new Error(`${field}.result must be null until satisfied`);
  }
  if (value.state === "blockedUntil" && (nextAt === null || maxAt === null || nextAt > maxAt)) {
    throw new Error(`${field} blockedUntil state requires nextAt and maxAt with nextAt not after maxAt`);
  }
  if (value.state !== "blockedUntil" && (nextAt !== null || maxAt !== null)) {
    throw new Error(`${field}.nextAt and maxAt must be null outside blockedUntil`);
  }
  if (value.state === "due" && ticket !== null) {
    throw new Error(`${field}.ticket must be null before materialization`);
  }
  if (value.state !== "due" && ticket === null) {
    throw new Error(`${field}.ticket must link the materialized occurrence`);
  }
  if (value.state === "satisfied" && ticket.status !== "closed") {
    throw new Error(`${field}.ticket must be closed when satisfied`);
  }
  if (value.state !== "due" && value.state !== "satisfied" && ticket.status !== "open") {
    throw new Error(`${field}.ticket must remain open until satisfied`);
  }
  if (value.state === "blockedUntil" && value.attempt < 1) {
    throw new Error(`${field}.attempt must be positive when blockedUntil`);
  }
  const priority = value.priority === undefined ? null : value.priority;
  if (priority !== null && !/^P[0-4]$/.test(String(priority))) {
    throw new Error(`${field}.priority must be P0-P4 or omitted`);
  }
  const area = value.area === undefined ? null : value.area;
  if (area !== null && (typeof area !== "string" || area.trim() === "")) {
    throw new Error(`${field}.area must be a non-empty string or omitted`);
  }
  return {
    source,
    cadenceId: value.cadenceId,
    dueWindow: value.dueWindow,
    dueAt,
    state: value.state,
    candidateFingerprint: value.candidateFingerprint,
    ticket,
    result,
    attempt: value.attempt,
    nextAt,
    maxAt,
    escalation: value.escalation,
    priority,
    area,
  };
}

async function readCadenceState(workspace) {
  const loops = path.join(workspace, "loops");
  try {
    if (!(await stat(workspace)).isDirectory()) {
      return { cadenceState: "invalid", occurrences: [], failures: [{ file: ".", reason: "workspace root is not a directory" }] };
    }
  } catch (error) {
    const reason = error.code === "ENOENT" ? "workspace root does not exist" : `cannot inspect workspace root (${error.code ?? error.name})`;
    return { cadenceState: "invalid", occurrences: [], failures: [{ file: ".", reason }] };
  }
  let entries;
  try {
    entries = await readdir(loops, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return { cadenceState: "absent", occurrences: [], failures: [] };
    return { cadenceState: "invalid", occurrences: [], failures: [{ file: "loops", reason: `cannot read loops directory (${error.code ?? error.name})` }] };
  }

  const occurrences = [];
  const failures = [];
  let foundCadenceState = false;
  const files = entries
    .filter((entry) => (entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith(".json") && !RESERVED_LOOP_FILES.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of files) {
    const absolute = path.join(loops, entry.name);
    const source = path.relative(workspace, absolute);
    let text;
    try {
      text = await readFile(absolute, "utf-8");
    } catch (error) {
      failures.push({ file: source, reason: `cannot read loop state (${error.code ?? error.name})` });
      continue;
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      failures.push({ file: source, reason: `invalid JSON: ${error.message}` });
      continue;
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      failures.push({ file: source, reason: "loop state must be a JSON object" });
      continue;
    }
    if (!Object.hasOwn(payload, "occurrences")) continue;
    foundCadenceState = true;
    try {
      validateSchemaEnvelope(payload);
      if (!payload.occurrences || typeof payload.occurrences !== "object" || Array.isArray(payload.occurrences)) {
        throw new Error("occurrences must be an object map");
      }
      for (const [key, value] of Object.entries(payload.occurrences)) {
        occurrences.push(validateOccurrence(key, value, source));
      }
    } catch (error) {
      failures.push({ file: source, reason: error.message });
    }
  }

  const identities = new Map();
  for (const occurrence of occurrences) {
    const identity = JSON.stringify([occurrence.cadenceId, occurrence.dueWindow]);
    const prior = identities.get(identity);
    if (prior) {
      failures.push({
        file: occurrence.source,
        reason: `duplicate occurrence identity ${identity}; already defined in ${prior.source}`,
      });
    } else {
      identities.set(identity, occurrence);
    }
  }

  if (failures.length > 0) return { cadenceState: "invalid", occurrences: [], failures };
  return {
    cadenceState: foundCadenceState ? "present" : "absent",
    occurrences,
    failures,
  };
}

function validateObligation(key, value, source) {
  const field = `${source} obligations[${JSON.stringify(key)}]`;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  for (const name of ["hypothesis", "pageCohortFingerprint", "metric", "decision"]) {
    if (typeof value[name] !== "string" || value[name].trim() === "") {
      throw new Error(`${field}.${name} must be a non-empty string`);
    }
  }
  if (key !== JSON.stringify([value.hypothesis, value.pageCohortFingerprint])) {
    throw new Error(`${field} key does not match hypothesis and pageCohortFingerprint`);
  }
  if (!value.baseline || typeof value.baseline !== "object" || Array.isArray(value.baseline)) {
    throw new Error(`${field}.baseline must be an object`);
  }
  const measuredAt = parseDate(value.baseline.measuredAt, `${field}.baseline.measuredAt`);
  if (typeof value.baseline.value !== "string" || value.baseline.value.trim() === "") {
    throw new Error(`${field}.baseline.value must be a non-empty string`);
  }
  if (typeof value.baseline.evidence !== "string" || value.baseline.evidence.trim() === "") {
    throw new Error(`${field}.baseline.evidence must be a non-empty string`);
  }
  const dueAt = parseDate(value.dueAt, `${field}.dueAt`);
  if (!OBLIGATION_STATES.has(value.state)) throw new Error(`${field}.state is unknown`);
  const candidateFingerprint = nullableNonEmptyString(value.candidateFingerprint, `${field}.candidateFingerprint`);
  const ticket = validateTicket(value.ticket, `${field}.ticket`);
  if (!Array.isArray(value.attempts)) throw new Error(`${field}.attempts must be an array`);
  const attempts = value.attempts.map((attempt, index) => {
    if (!attempt || typeof attempt !== "object" || Array.isArray(attempt)) {
      throw new Error(`${field}.attempts[${index}] must be an object`);
    }
    const attemptedAt = parseDate(attempt.attemptedAt, `${field}.attempts[${index}].attemptedAt`);
    if (typeof attempt.reason !== "string" || attempt.reason.trim() === "") {
      throw new Error(`${field}.attempts[${index}].reason must be a non-empty string`);
    }
    if (typeof attempt.evidence !== "string" || attempt.evidence.trim() === "") {
      throw new Error(`${field}.attempts[${index}].evidence must be a non-empty string`);
    }
    return { attemptedAt, reason: attempt.reason, evidence: attempt.evidence };
  });
  const wakeAt = nullableDate(value.wakeAt, `${field}.wakeAt`);
  const resolvedAt = nullableDate(value.resolvedAt, `${field}.resolvedAt`);
  if (value.calibrationNote !== null && typeof value.calibrationNote !== "string") {
    throw new Error(`${field}.calibrationNote must be a string or null`);
  }
  if ((value.state === "pending" || value.state === "due") && ticket !== null) {
    throw new Error(`${field}.ticket must be null before materialization`);
  }
  if (value.state === "materialized") {
    if (candidateFingerprint === null) {
      throw new Error(`${field}.candidateFingerprint must be non-empty after materialization`);
    }
  }
  if (value.state === "resolved") {
    if (candidateFingerprint === null) {
      throw new Error(`${field}.candidateFingerprint must be non-empty when resolved`);
    }
    if (ticket?.status !== "closed") throw new Error(`${field}.ticket must be closed when resolved`);
    if (resolvedAt === null) throw new Error(`${field}.resolvedAt is required when resolved`);
    if (typeof value.calibrationNote !== "string" || value.calibrationNote.trim() === "") {
      throw new Error(`${field}.calibrationNote must be non-empty when resolved`);
    }
  }
  let successor = null;
  if (value.successor !== null) {
    if (!value.successor || typeof value.successor !== "object" || Array.isArray(value.successor)) {
      throw new Error(`${field}.successor must be null or an object`);
    }
    for (const name of ["hypothesis", "pageCohortFingerprint", "evidence"]) {
      if (typeof value.successor[name] !== "string" || value.successor[name].trim() === "") {
        throw new Error(`${field}.successor.${name} must be a non-empty string`);
      }
    }
    successor = {
      hypothesis: value.successor.hypothesis,
      pageCohortFingerprint: value.successor.pageCohortFingerprint,
      evidence: value.successor.evidence,
    };
  }
  if (value.state === "superseded") {
    if (successor === null) throw new Error(`${field}.successor is required when superseded`);
    if (ticket?.status === "open") throw new Error(`${field}.ticket must be closed or null when superseded`);
  } else if (successor !== null) {
    throw new Error(`${field}.successor must be null unless superseded`);
  }
  return {
    source,
    hypothesis: value.hypothesis,
    pageCohortFingerprint: value.pageCohortFingerprint,
    baseline: {
      measuredAt,
      value: value.baseline.value,
      evidence: value.baseline.evidence,
    },
    metric: value.metric,
    decision: value.decision,
    dueAt,
    state: value.state,
    candidateFingerprint,
    ticket,
    attempts,
    wakeAt,
    resolvedAt,
    calibrationNote: value.calibrationNote,
    successor,
  };
}

async function readObligationState(workspace) {
  const absolute = path.join(workspace, "loops", "measurement-obligations.json");
  const source = "loops/measurement-obligations.json";
  let text;
  try {
    text = await readFile(absolute, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") return { obligationState: "absent", obligations: [], failures: [] };
    return { obligationState: "invalid", obligations: [], failures: [{ file: source, reason: `cannot read obligation ledger (${error.code ?? error.name})` }] };
  }
  try {
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("obligation ledger must be a JSON object");
    validateSchemaEnvelope(payload);
    if (!payload.obligations || typeof payload.obligations !== "object" || Array.isArray(payload.obligations)) {
      throw new Error("obligations must be an object map");
    }
    return {
      obligationState: "present",
      obligations: Object.entries(payload.obligations).map(([key, value]) => validateObligation(key, value, source)),
      failures: [],
    };
  } catch (error) {
    return { obligationState: "invalid", obligations: [], failures: [{ file: source, reason: error.message }] };
  }
}

function nextDueFor(occurrence, now) {
  if (occurrence.state === "satisfied" || occurrence.state === "materialized" || occurrence.state === "attempted") return null;
  if (occurrence.state === "blockedUntil") return now > occurrence.maxAt ? null : occurrence.nextAt;
  return occurrence.dueAt;
}

function analyze(state, obligationState, now) {
  const failures = [...state.failures, ...obligationState.failures];
  if (failures.length > 0) {
    return {
      status: "fail_closed",
      cadenceState: state.cadenceState,
      obligationState: obligationState.obligationState,
      due: [],
      deduplicated: [],
      earliestNextDue: null,
      obligations: [],
      failures,
    };
  }
  const sorted = [...state.occurrences].sort((a, b) =>
    a.dueAt.localeCompare(b.dueAt) || a.cadenceId.localeCompare(b.cadenceId) || a.dueWindow.localeCompare(b.dueWindow)
  );
  const due = sorted.flatMap((occurrence) => {
    if (occurrence.state === "due" && occurrence.dueAt <= now) return [{ ...occurrence, action: "materialize" }];
    if (occurrence.state === "blockedUntil" && now > occurrence.maxAt) {
      return [{ ...occurrence, action: "needs_human", requiredEscalation: "needs_human" }];
    }
    if (occurrence.state === "blockedUntil" && occurrence.nextAt <= now) return [{ ...occurrence, action: "retry" }];
    return [];
  });
  const deduplicated = sorted.filter((occurrence) =>
    occurrence.ticket?.status === "open" && occurrence.dueAt <= now
  );
  const nextDates = sorted.map((occurrence) => nextDueFor(occurrence, now)).filter(Boolean).sort();
  const obligations = obligationState.obligations
    .filter((obligation) =>
      obligation.state === "due"
      || obligation.state === "pending"
      || (obligation.state === "materialized" && (obligation.ticket === null || obligation.ticket.status === "closed"))
    )
    .map((obligation) => ({
      ...obligation,
      effectiveDueAt: obligation.state === "pending" ? obligation.wakeAt ?? obligation.dueAt : obligation.dueAt,
    }))
    .sort((a, b) =>
      a.effectiveDueAt.localeCompare(b.effectiveDueAt)
      || a.hypothesis.localeCompare(b.hypothesis)
      || a.pageCohortFingerprint.localeCompare(b.pageCohortFingerprint)
    );
  const dueObligations = obligations
    .filter((obligation) => obligation.state === "materialized" || obligation.effectiveDueAt <= now)
    .map((obligation) => ({
      ...obligation,
      action: obligation.state === "materialized" && obligation.ticket?.status === "closed"
        ? "reconcile_inconclusive_return"
        : obligation.candidateFingerprint === null
          ? "materialize"
          : "reconcile_materialization",
    }));
  nextDates.push(...obligations.map((obligation) => obligation.effectiveDueAt));
  nextDates.sort();
  return {
    status: "ok",
    cadenceState: state.cadenceState,
    obligationState: obligationState.obligationState,
    due,
    deduplicated,
    earliestNextDue: nextDates[0] ?? null,
    obligations: dueObligations,
    failures: [],
  };
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function markdownTable(headers, rows) {
  if (rows.length === 0) return "_No cadence occurrences or measurement obligations are due._";
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

function buildBacklog(report, startId) {
  if (report.status === "fail_closed") {
    return `# Cadence status — fail closed

No draft rows were emitted because cadence state could not be parsed safely.

${markdownTable(
    ["File", "Reason"],
    report.failures.map((failure) => [failure.file, failure.reason]),
  )}
`;
  }
  const cadenceRows = report.due.filter((occurrence) => occurrence.action === "materialize");
  const rows = cadenceRows.map((occurrence, index) => [
    `SEO-${String(startId + index).padStart(3, "0")}`,
    occurrence.priority ?? "P4",
    occurrence.area ?? "reporting",
    `Run cadence ${occurrence.cadenceId} for ${occurrence.dueWindow}`,
    `Record ok, alerted, or honest blocked evidence for ${occurrence.cadenceId} due ${occurrence.dueAt}`,
  ]);
  const materializedObligations = report.obligations.filter((obligation) => obligation.action === "materialize");
  rows.push(...materializedObligations.map((obligation, index) => [
    `SEO-${String(startId + cadenceRows.length + index).padStart(3, "0")}`,
    "P1",
    "measurement",
    `Measure ${obligation.metric} for ${obligation.pageCohortFingerprint}`,
    `${obligation.hypothesis}; use the result to decide ${obligation.decision}`,
  ]));
  const obligationActions = report.obligations
    .filter((obligation) => obligation.action !== "materialize")
    .map((obligation) => [
      obligation.ticket?.id ?? "unlinked",
      obligation.action === "reconcile_materialization" ? "Reconcile materialization" : "Complete inconclusive return",
      obligation.hypothesis,
      obligation.pageCohortFingerprint,
      obligation.action === "reconcile_materialization"
        ? "Reuse the persisted fingerprint and repair the missing ticket link"
        : "Atomically clear the fingerprint and ticket, append the attempt, and set wakeAt",
    ]);
  const existingActions = report.due.filter((occurrence) => occurrence.action !== "materialize").map((occurrence) => [
    occurrence.ticket.id,
    occurrence.action === "retry" ? "Retry" : "Escalate to needs_human",
    occurrence.cadenceId,
    occurrence.dueWindow,
    occurrence.action === "retry"
      ? `Backoff elapsed at ${occurrence.nextAt}; reuse the existing ticket and fingerprint`
      : `Backoff bound ${occurrence.maxAt} passed; do not retry automatically`,
  ]);
  const existingSection = existingActions.length === 0
    ? ""
    : `

## Existing occurrence actions

${markdownTable(["Ticket", "Action", "Cadence", "Due window", "Reason"], existingActions)}`;
  const obligationSection = obligationActions.length === 0
    ? ""
    : `

## Obligation reconciliation actions

${markdownTable(["Ticket", "Action", "Hypothesis", "Page cohort", "Reason"], obligationActions)}`;
  const backlog = `# Draft SEO backlog rows from cadence and obligations

This is a draft backlog, not a direct workspace mutation. Review every row before merging into .seo/backlog.md.

Earliest next-due: ${report.earliestNextDue ?? "none"}

${markdownTable(["ID", "P", "Area", "Ticket", "Verify"], rows)}${existingSection}${obligationSection}
`;
  return existingActions.length === 0 && obligationActions.length === 0 ? backlog : backlog.trimEnd();
}

async function nextBacklogId(workspace) {
  try {
    const backlog = await readFile(path.join(workspace, "backlog.md"), "utf-8");
    const ids = [...backlog.matchAll(/\bSEO-(\d+)\b/g)]
      .map((match) => Number(match[1]))
      .filter((value) => Number.isSafeInteger(value) && value < Number.MAX_SAFE_INTEGER);
    return ids.length === 0 ? 1 : Math.max(...ids) + 1;
  } catch (error) {
    if (error.code === "ENOENT") return 1;
    return { file: "backlog.md", reason: `cannot read backlog for draft ID allocation (${error.code ?? error.name})` };
  }
}

function withFailure(report, failure) {
  return {
    ...report,
    status: "fail_closed",
    cadenceState: "invalid",
    due: [],
    deduplicated: [],
    earliestNextDue: null,
    obligations: [],
    failures: [...report.failures, failure],
  };
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const workspaceArg = argValue("--workspace");
  if (!workspaceArg) throw new Error(usage());
  const format = argValue("--format") ?? "backlog";
  if (format !== "backlog" && format !== "json") {
    throw new Error(`Unknown --format "${format}". Use backlog or json.`);
  }
  const workspace = path.resolve(workspaceArg);
  const now = parseNow(argValue("--now"));
  const state = await readCadenceState(workspace);
  const obligationState = await readObligationState(workspace);
  const analysis = analyze(state, obligationState, now);
  let report = { now, ...analysis };
  let startId = 1;
  const hasDraftRows = report.status === "ok" && (
    report.due.some((occurrence) => occurrence.action === "materialize")
    || report.obligations.some((obligation) => obligation.action === "materialize")
  );
  if (format === "backlog" && hasDraftRows) {
    const backlogState = await nextBacklogId(workspace);
    if (typeof backlogState === "number") startId = backlogState;
    else report = withFailure(report, backlogState);
  }
  const output = format === "json" ? JSON.stringify(report, null, 2) : buildBacklog(report, startId);
  console.log(output);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
