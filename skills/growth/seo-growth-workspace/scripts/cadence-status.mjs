#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const RESERVED_LOOP_FILES = new Set([
  "coverage-ledger.json",
  "measurement-obligations.json",
  "site-lease.json",
]);
const STATES = new Set(["due", "materialized", "attempted", "satisfied", "blockedUntil"]);
const RESULTS = new Set(["ok", "alerted"]);
const ESCALATIONS = new Set(["none", "needs_human"]);
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WINDOW_PATTERN = /^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/;

function usage() {
  return `Usage:
  node cadence-status.mjs --workspace <path-to-.seo> [--format backlog|json] [--now <ISO date>]

Cold-reads schema-1 cadence occurrences under <workspace>/loops/ and emits due
occurrences as draft backlog rows or structured JSON. It also names the earliest
next-due date for sleep-certificate continuity.

Options:
  --workspace  Explicit path to the resolved .seo workspace root.
  --format     backlog (default) or json.
  --now        ISO date or timestamp used to evaluate due state (default: current time).

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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error("--now must be an ISO date or timestamp");
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
  };
}

async function readCadenceState(workspace) {
  const loops = path.join(workspace, "loops");
  let entries;
  try {
    entries = await readdir(loops, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return { cadenceState: "absent", occurrences: [], failures: [] };
    return { cadenceState: "invalid", occurrences: [], failures: [{ file: loops, reason: error.message }] };
  }

  const occurrences = [];
  const failures = [];
  let foundCadenceState = false;
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !RESERVED_LOOP_FILES.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of files) {
    const absolute = path.join(loops, entry.name);
    const source = path.relative(workspace, absolute);
    let payload;
    try {
      payload = JSON.parse(await readFile(absolute, "utf-8"));
    } catch (error) {
      failures.push({ file: source, reason: `invalid JSON: ${error.message}` });
      continue;
    }
    if (!Object.hasOwn(payload ?? {}, "occurrences")) continue;
    foundCadenceState = true;
    try {
      const schemas = [payload.schema, payload.schemaVersion].filter((value) => value !== undefined);
      if (schemas.length === 0 || schemas.some((value) => value !== 1)) {
        throw new Error(`schema must be 1; received ${JSON.stringify(payload.schema ?? payload.schemaVersion)}`);
      }
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

  if (failures.length > 0) return { cadenceState: "invalid", occurrences: [], failures };
  return {
    cadenceState: foundCadenceState ? "present" : "absent",
    occurrences,
    failures,
  };
}

function nextDueFor(occurrence) {
  if (occurrence.state === "satisfied" || occurrence.state === "materialized" || occurrence.state === "attempted") return null;
  if (occurrence.state === "blockedUntil") return occurrence.nextAt;
  return occurrence.dueAt;
}

function analyze(state, now) {
  if (state.failures.length > 0) {
    return {
      status: "fail_closed",
      cadenceState: state.cadenceState,
      due: [],
      deduplicated: [],
      earliestNextDue: null,
      obligations: [],
      failures: state.failures,
    };
  }
  const sorted = [...state.occurrences].sort((a, b) =>
    a.dueAt.localeCompare(b.dueAt) || a.cadenceId.localeCompare(b.cadenceId) || a.dueWindow.localeCompare(b.dueWindow)
  );
  const due = sorted.flatMap((occurrence) => {
    if (occurrence.state === "due" && occurrence.dueAt <= now) return [{ ...occurrence, action: "materialize" }];
    if (occurrence.state === "blockedUntil" && occurrence.nextAt <= now) return [{ ...occurrence, action: "retry" }];
    return [];
  });
  const deduplicated = sorted.filter((occurrence) =>
    occurrence.ticket?.status === "open" && occurrence.dueAt <= now
  );
  const nextDates = sorted.map(nextDueFor).filter(Boolean).sort();
  return {
    status: "ok",
    cadenceState: state.cadenceState,
    due,
    deduplicated,
    earliestNextDue: nextDates[0] ?? null,
    obligations: [],
    failures: [],
  };
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function markdownTable(headers, rows) {
  if (rows.length === 0) return "_No cadence occurrences are due._";
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
  const rows = report.due.filter((occurrence) => occurrence.action === "materialize").map((occurrence, index) => [
    `SEO-${String(startId + index).padStart(3, "0")}`,
    "P4",
    "reporting",
    `Run cadence ${occurrence.cadenceId} for ${occurrence.dueWindow}`,
    `Record ok, alerted, or honest blocked evidence for ${occurrence.cadenceId} due ${occurrence.dueAt}`,
  ]);
  return `# Draft SEO backlog rows from cadence

This is a draft backlog, not a direct workspace mutation. Review every row before merging into .seo/backlog.md.

Earliest next-due: ${report.earliestNextDue ?? "none"}

${markdownTable(["ID", "P", "Area", "Ticket", "Verify"], rows)}
`;
}

async function nextBacklogId(workspace) {
  try {
    const backlog = await readFile(path.join(workspace, "backlog.md"), "utf-8");
    const ids = [...backlog.matchAll(/\bSEO-(\d+)\b/g)].map((match) => Number(match[1]));
    return ids.length === 0 ? 1 : Math.max(...ids) + 1;
  } catch (error) {
    if (error.code === "ENOENT") return 1;
    throw error;
  }
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
  const analysis = analyze(state, now);
  const report = { now, ...analysis };
  const output = format === "json" ? JSON.stringify(report, null, 2) : buildBacklog(report, await nextBacklogId(workspace));
  console.log(output);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
