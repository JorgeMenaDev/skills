#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  return `Usage:
  node portfolio-status.mjs --registry <file> [--format md|json]

Reads the portfolio registry markdown table (references/portfolio-registry.md Row
Shape) and, for each site, inspects that workspace root's .seo/ state to build a
ranked "which site deserves the next SEO hour" table. Read-only: no network, no
secrets, never writes.

Per row it reads (when present):
  .seo/backlog.md   Ready-table rows -> open P0/P1 count + In progress/Ready/Blocked
                    counts + top Ready ticket title.
  .seo/log.md       Most recent "## YYYY-MM-DD" entry -> last-touched date.
  .seo/reports/     Latest YYYY-MM-DD-dated report file -> folded into last-touched
                    (a fresh report is a touch even when the log lags).

Output columns: Site | Last touched | Days stale | Open P0/P1 |
In progress/Ready/Blocked | Top opportunity | Workspace.

Ranking (deterministic): workspaces missing entirely rank first (flagged
"no workspace"); then present workspaces by score = daysStale * (openP0P1 + 1),
highest first, ties broken by open P0/P1 then site name. A present-but-never-touched
workspace (no dated log/report) sorts as maximally stale. The score is prioritization
evidence, not the decision: a cold revenue-critical site can still outrank a warmer one.

Inputs contain no secrets; the Credentials column records locations only.`;
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

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

function expandHome(input) {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

// Split a markdown table row into trimmed cells, dropping the outer pipes.
// Splits on unescaped pipes only, then unescapes `\|` back to a literal pipe so a
// cell written with an escaped pipe (the house escapeCell convention) round-trips.
function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isDivider(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

// Parse the registry table: skip header + divider rows, keep rows whose first
// cell is a real site value. Tolerates surrounding whitespace and `unknown` cells.
function parseRegistry(markdown) {
  const sites = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    const cells = splitRow(line);
    if (isDivider(cells)) continue;
    if (cells.length < 2) continue;
    const site = cells[0];
    if (!site || site.toLowerCase() === "site") continue; // header / empty
    sites.push({
      site,
      workspaceRaw: cells[1] ?? "",
      gscProperty: cells[2] ?? "",
      credentials: cells[3] ?? "",
      market: cells[4] ?? "",
      publishGate: cells[5] ?? "",
      notes: cells[6] ?? "",
    });
  }
  return sites;
}

// Backlog Ready rows carry `| SEO-NNN | P | Area | Ticket | Verify |`; In progress
// and Blocked tables omit the priority column, so open P0/P1 is counted from Ready
// rows only — the other queues surface through the status counts, not priority.
function parseBacklog(markdown) {
  const sections = { ready: [], "in progress": [], blocked: [], done: [] };
  let active = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const name = heading[1].trim().toLowerCase();
      active = Object.hasOwn(sections, name) ? name : null;
      continue;
    }
    if (active) sections[active].push(line);
  }

  const seoRows = (lines) =>
    lines.filter((line) => line.trim().startsWith("| SEO-"));
  const readyRows = seoRows(sections.ready);
  const priorityOf = (row) => splitRow(row)[1] ?? "";
  const titleOf = (row) => splitRow(row)[3] ?? "";

  return {
    ready: readyRows.length,
    inProgress: seoRows(sections["in progress"]).length,
    blocked: seoRows(sections.blocked).length,
    openP0P1: readyRows.filter((row) => /^P[01]$/.test(priorityOf(row))).length,
    topOpportunity: readyRows.length ? titleOf(readyRows[0]) || null : null,
  };
}

function latestLogDate(markdown) {
  const dates = [...markdown.matchAll(/^##\s+(\d{4}-\d{2}-\d{2})/gm)].map(
    (match) => match[1],
  );
  return dates.length ? dates.sort().at(-1) : null;
}

function latestReportDate(reportsDir) {
  if (!existsSync(reportsDir)) return null;
  let latest = null;
  for (const name of readdirSync(reportsDir)) {
    const match = name.match(/(\d{4}-\d{2}-\d{2})/);
    if (match && (latest === null || match[1] > latest)) latest = match[1];
  }
  return latest;
}

// ISO dates (YYYY-MM-DD) compare lexicographically, so max() is a string compare.
function maxDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function daysBetween(fromDate, nowMs) {
  const then = Date.parse(`${fromDate}T00:00:00Z`);
  if (Number.isNaN(then)) return null;
  const days = Math.floor((nowMs - then) / 86400000);
  return days < 0 ? 0 : days;
}

function inspectSite(entry, nowMs) {
  const workspaceRaw = entry.workspaceRaw;
  const unresolved =
    !workspaceRaw || workspaceRaw.toLowerCase() === "unknown";
  const root = unresolved ? null : expandHome(workspaceRaw);
  const seoDir = root ? path.join(root, ".seo") : null;
  const missing = !seoDir || !existsSync(seoDir);

  if (missing) {
    return {
      site: entry.site,
      workspaceRaw,
      missing: true,
      lastTouched: null,
      daysStale: null,
      openP0P1: 0,
      backlog: null,
      score: null,
    };
  }

  const backlogPath = path.join(seoDir, "backlog.md");
  const logPath = path.join(seoDir, "log.md");
  const reportsDir = path.join(seoDir, "reports");

  let backlog = null;
  try {
    if (existsSync(backlogPath)) {
      backlog = parseBacklog(readFileSync(backlogPath, "utf-8"));
    }
  } catch {
    backlog = null; // unreadable -> honest gaps, never a crash
  }

  let logDate = null;
  try {
    if (existsSync(logPath)) {
      logDate = latestLogDate(readFileSync(logPath, "utf-8"));
    }
  } catch {
    logDate = null;
  }

  let reportDate = null;
  try {
    reportDate = latestReportDate(reportsDir);
  } catch {
    reportDate = null;
  }

  const lastTouched = maxDate(logDate, reportDate);
  const daysStale = lastTouched ? daysBetween(lastTouched, nowMs) : null;
  const openP0P1 = backlog ? backlog.openP0P1 : 0;
  // Present-but-never-touched (no dated log/report) sorts as maximally stale.
  const score = daysStale === null ? Infinity : daysStale * (openP0P1 + 1);

  return {
    site: entry.site,
    workspaceRaw,
    missing: false,
    lastTouched,
    daysStale,
    openP0P1,
    backlog,
    score,
  };
}

function rankCompare(a, b) {
  if (a.missing !== b.missing) return a.missing ? -1 : 1;
  if (a.missing && b.missing) return a.site.localeCompare(b.site);
  if (a.score !== b.score) {
    if (a.score === Infinity) return -1;
    if (b.score === Infinity) return 1;
    return b.score - a.score;
  }
  if (a.openP0P1 !== b.openP0P1) return b.openP0P1 - a.openP0P1;
  return a.site.localeCompare(b.site);
}

function toTableRow(row) {
  if (row.missing) {
    return [
      row.site,
      "no workspace",
      "—",
      "—",
      "—",
      "—",
      row.workspaceRaw || "unknown",
    ];
  }
  const backlog = row.backlog;
  return [
    row.site,
    row.lastTouched ?? "—",
    row.daysStale === null ? "—" : String(row.daysStale),
    backlog ? String(backlog.openP0P1) : "—",
    backlog
      ? `${backlog.inProgress}/${backlog.ready}/${backlog.blocked}`
      : "—",
    backlog ? backlog.topOpportunity ?? "—" : "—",
    row.workspaceRaw,
  ];
}

function renderMarkdown(ranked, registryPath, generated) {
  const headers = [
    "Site",
    "Last touched",
    "Days stale",
    "Open P0/P1",
    "In progress/Ready/Blocked",
    "Top opportunity",
    "Workspace",
  ];
  const table = markdownTable(headers, ranked.map(toTableRow));
  return `# Portfolio status

Generated: ${generated}
Registry: ${registryPath}

${table}
`;
}

function renderJson(ranked, registryPath, generated) {
  return JSON.stringify(
    {
      registry: registryPath,
      generated,
      sites: ranked.map((row) => ({
        site: row.site,
        workspace: row.workspaceRaw,
        missing: row.missing,
        lastTouched: row.lastTouched,
        daysStale: row.daysStale,
        openP0P1: row.missing ? null : row.openP0P1,
        inProgress: row.backlog ? row.backlog.inProgress : null,
        ready: row.backlog ? row.backlog.ready : null,
        blocked: row.backlog ? row.backlog.blocked : null,
        topOpportunity: row.backlog ? row.backlog.topOpportunity : null,
      })),
    },
    null,
    2,
  );
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const registryPath = argValue("--registry");
  if (!registryPath) {
    throw new Error(usage());
  }
  const format = argValue("--format") ?? "md";
  if (format !== "md" && format !== "json") {
    throw new Error(`Unknown --format ${format} (expected md or json)\n\n${usage()}`);
  }

  const markdown = readFileSync(registryPath, "utf-8");
  const entries = parseRegistry(markdown);
  const nowMs = Date.now();
  const ranked = entries
    .map((entry) => inspectSite(entry, nowMs))
    .sort(rankCompare);
  const generated = new Date(nowMs).toISOString();

  const output =
    format === "json"
      ? renderJson(ranked, registryPath, generated)
      : renderMarkdown(ranked, registryPath, generated);
  console.log(output);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
