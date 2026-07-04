#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

// Keep in sync with gsc-opportunities.mjs: position-banded expected-CTR baselines.
const CTR_BANDS = [
  { label: "1-3", min: 1, max: 3, baseline: 0.1 },
  { label: "4-6", min: 4, max: 6, baseline: 0.04 },
  { label: "7-10", min: 7, max: 10, baseline: 0.015 },
];
const CTR_FLAG_RATIO = 0.5;

// Keep in sync with gsc-opportunities.mjs: branded-query parsing/matching.
function parseBrandTerms(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function isBranded(query, brandTerms) {
  const lower = String(query).toLowerCase();
  return brandTerms.some((term) => lower.includes(term));
}

function usage() {
  return `Usage:
  node monthly-report.mjs --target "Example SaaS" \\
      --date-range "2026-04-01 to 2026-04-30" --comparison-range "2026-03-01 to 2026-03-31" \\
      --gsc-current current.json --gsc-previous previous.json --backlog .seo/backlog.md \\
      [--brand "acme,acme app"] [--keyword-tiers tiers.json] [--calendar calendar.json] \\
      [--allow-missing-gsc] [--output report.md]

Builds a one-page SEO report directly from exported GSC rows and local SEO/content-engine state:
metric deltas, query/page movers (including disappeared queries), wins/problems, and a single
next action.

Inputs:
  --gsc-current / --gsc-previous  GSC searchAnalytics.query JSON exports (rows[]).
  --backlog                       .seo/backlog.md (Ready/In progress/Blocked/Done tables).
  --brand                         Optional comma-separated brand terms (case-insensitive substring).
                                  Branded queries stay in topline totals but are excluded from
                                  problem selection and the single next action.
  --keyword-tiers                 Optional JSON: { "p1": n, "p2": n, "p3": n } or { "tiers": {...} }.
  --calendar                      Optional JSON: entries[] with status fields, or precomputed counts.
  --allow-missing-gsc             Produce a partial report marked "partial — GSC exports unavailable"
                                  instead of failing when GSC exports (or backlog) are absent.

Do not include secrets in any input file.`;
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

async function readJsonFile(filePath) {
  const text = await readFile(filePath, "utf-8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function normalizeRows(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.rows;
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const keys = row.keys ?? [];
    return {
      query: String(row.query ?? keys[0] ?? ""),
      page: String(row.page ?? keys[1] ?? ""),
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? row.avgPosition ?? 0),
    };
  }).filter((row) => row.position > 0);
}

function summarizeRows(rows) {
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const ctr = impressions === 0 ? 0 : clicks / impressions;
  const weightedPosition =
    impressions === 0
      ? 0
      : rows.reduce((sum, row) => sum + row.position * row.impressions, 0) /
        impressions;

  return { clicks, impressions, ctr, position: weightedPosition };
}

function asPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function signedNumber(value, decimals = 0) {
  const fixed = value.toFixed(decimals);
  return value > 0 ? `+${fixed}` : fixed;
}

function signedPercent(value) {
  const fixed = `${(value * 100).toFixed(2)}%`;
  return value > 0 ? `+${fixed}` : fixed;
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

// Band on the unrounded position with explicit half-open boundaries so rows in gaps like
// (10.5, 11.0) do not fall through both the CTR bands and the page-2 table (>= 11).
function bandFor(position) {
  if (!(position >= 1)) return null;
  return (
    CTR_BANDS.find((band) => position >= band.min && position < band.max + 1) ?? null
  );
}

function isLowCtr(row) {
  const band = bandFor(row.position);
  return (
    row.impressions >= 100 && band !== null && row.ctr < band.baseline * CTR_FLAG_RATIO
  );
}

function rowKey(row) {
  return `${row.query}|||${row.page}`;
}

function compareRows(currentRows, previousRows) {
  const currentKeys = new Set(currentRows.map((row) => rowKey(row)));
  const previous = new Map(previousRows.map((row) => [rowKey(row), row]));

  const movers = currentRows.map((current) => {
    const prior = previous.get(rowKey(current));
    return {
      ...current,
      previousClicks: prior?.clicks ?? 0,
      previousPosition: prior?.position ?? null,
      clickDelta: current.clicks - (prior?.clicks ?? 0),
      positionDelta:
        prior?.position == null ? null : prior.position - current.position,
      status: prior ? "both" : "new",
    };
  });

  for (const [key, prior] of previous) {
    if (currentKeys.has(key)) continue;
    movers.push({
      query: prior.query,
      page: prior.page,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      previousClicks: prior.clicks,
      previousPosition: prior.position,
      clickDelta: -prior.clicks,
      positionDelta: null,
      status: "disappeared",
    });
  }

  return movers.sort((a, b) => Math.abs(b.clickDelta) - Math.abs(a.clickDelta));
}

// Pads to `count` items with a single filler line only when there are fewer
// real findings than slots; filler never displaces a real finding.
function fillTo(items, filler, count = 3) {
  const real = items.slice(0, count);
  if (real.length < count) real.push(filler);
  return real;
}

function buildWins({ currentSummary, previousSummary, state, movers }) {
  const wins = [];
  const topMover = movers.find((row) => row.clickDelta > 0);
  if (topMover) {
    wins.push(
      `${topMover.query} gained ${topMover.clickDelta} clicks vs the comparison period.`,
    );
  }
  if (currentSummary.clicks > previousSummary.clicks) {
    wins.push(
      `Organic clicks increased by ${currentSummary.clicks - previousSummary.clicks}.`,
    );
  }
  if (currentSummary.impressions > previousSummary.impressions) {
    wins.push(
      `Organic impressions increased by ${currentSummary.impressions - previousSummary.impressions}.`,
    );
  }
  if ((state.backlog?.doneThisPeriod ?? 0) > 0) {
    wins.push(
      `${state.backlog.doneThisPeriod} SEO backlog items were completed this period.`,
    );
  }
  if ((state.calendar?.scheduled ?? 0) > 0) {
    wins.push(
      `${state.calendar.scheduled} content items are scheduled in the calendar.`,
    );
  }

  return fillTo(wins, "Baseline established for next reporting cycle.");
}

function buildProblems({
  currentSummary,
  previousSummary,
  state,
  currentRows,
  movers,
  brandTerms,
}) {
  const problems = [];
  const byImpressions = [...currentRows].sort(
    (a, b) => b.impressions - a.impressions,
  );
  // Branded queries stay in topline totals but must not become a problem or the single next
  // action: a branded high-impression low-CTR query is a brand-SERP artifact, not a title fix.
  const lowCtr = byImpressions.find(
    (row) => isLowCtr(row) && !isBranded(row.query, brandTerms),
  );
  const pageTwo = byImpressions.find(
    (row) =>
      row.impressions >= 100 &&
      row.position >= 11 &&
      row.position <= 20 &&
      !isBranded(row.query, brandTerms),
  );
  const disappeared = movers.find(
    (row) => row.status === "disappeared" && row.previousClicks > 0,
  );

  if (lowCtr) {
    const band = bandFor(lowCtr.position);
    problems.push(
      `${lowCtr.query} has high impressions but low CTR (${asPercent(lowCtr.ctr)} vs a ~${asPercent(band.baseline)} baseline for positions ${band.label}).`,
    );
  }
  if (pageTwo) {
    problems.push(
      `${pageTwo.query} is still on page 2 at position ${pageTwo.position.toFixed(1)}.`,
    );
  }
  if (disappeared) {
    problems.push(
      `${disappeared.query} disappeared from the current period after ${disappeared.previousClicks} clicks previously.`,
    );
  }
  if ((state.calendar?.overdue ?? 0) > 0) {
    problems.push(
      `${state.calendar.overdue} scheduled content items are overdue.`,
    );
  }
  if ((state.backlog?.ready ?? 0) > 3) {
    problems.push(
      `${state.backlog.ready} Ready SEO backlog items need prioritization.`,
    );
  }
  if (
    currentSummary.position > previousSummary.position &&
    previousSummary.position > 0
  ) {
    problems.push(
      "Weighted average position declined vs the comparison period.",
    );
  }

  return fillTo(
    problems,
    "Conversion tracking must be reviewed if leads/calls are not available.",
  );
}

function buildNextAction(problems) {
  const ctrProblem = problems.find((problem) => problem.includes("low CTR"));
  if (ctrProblem)
    return "Rewrite the title/meta for the highest-impression low-CTR query and request reindexing after deployment.";

  const pageTwoProblem = problems.find((problem) => problem.includes("page 2"));
  if (pageTwoProblem)
    return "Optimize the top page-2 query with title/H1/content/internal-link improvements.";

  return "Choose the top Ready backlog item with the clearest traffic or conversion impact and ship it this month.";
}

function sectionName(line) {
  const match = line.match(/^##\s+(.+?)\s*$/);
  return match?.[1]?.trim().toLowerCase() ?? null;
}

function parseDateRange(rangeText) {
  const match = rangeText?.match(
    /(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/,
  );
  if (!match) return null;
  return { start: match[1], end: match[2] };
}

function parseBacklog(markdown, dateRange) {
  const sections = {
    ready: [],
    "in progress": [],
    blocked: [],
    done: [],
  };
  let active = null;

  for (const line of markdown.split(/\r?\n/)) {
    const nextSection = sectionName(line);
    if (nextSection) {
      active = Object.hasOwn(sections, nextSection) ? nextSection : null;
      continue;
    }

    if (active) sections[active].push(line);
  }

  const countRows = (lines) =>
    lines.filter((line) => line.startsWith("| SEO-")).length;
  const doneRows = sections.done.filter((line) => line.startsWith("| SEO-"));
  const doneDates = doneRows.map((line) =>
    (line.split("|")[2] ?? "").trim(),
  );

  const range = parseDateRange(dateRange);
  const doneThisPeriod = range
    ? doneDates.filter(
        (date) =>
          /^\d{4}-\d{2}-\d{2}$/.test(date) &&
          date >= range.start &&
          date <= range.end,
      ).length
    : null;

  return {
    ready: countRows(sections.ready),
    inProgress: countRows(sections["in progress"]),
    blocked: countRows(sections.blocked),
    doneTotal: doneRows.length,
    // null when the date range is not parseable as "YYYY-MM-DD to YYYY-MM-DD"
    doneThisPeriod,
  };
}

function normalizeTierCounts(raw) {
  const tiers = raw?.tiers ?? raw ?? {};
  return {
    p1: Number(tiers.p1 ?? 0),
    p2: Number(tiers.p2 ?? 0),
    p3: Number(tiers.p3 ?? 0),
  };
}

function normalizeCalendar(raw) {
  if (!raw) return { scheduled: 0, published: 0, overdue: 0, next: [] };
  const entries = Array.isArray(raw) ? raw : raw.entries;
  if (Array.isArray(entries)) {
    return {
      scheduled: entries.filter((entry) => entry.status === "scheduled").length,
      published: entries.filter((entry) => entry.status === "published").length,
      overdue: entries.filter((entry) => entry.status === "overdue").length,
      next: entries
        .filter((entry) => entry.status === "scheduled")
        .slice(0, 5)
        .map((entry) => ({
          keyword: entry.keyword ?? entry.title ?? "",
          date: entry.date ?? entry.scheduledFor ?? "",
          status: entry.status,
        })),
    };
  }

  return {
    scheduled: Number(raw.scheduled ?? 0),
    published: Number(raw.published ?? 0),
    overdue: Number(raw.overdue ?? 0),
    next: Array.isArray(raw.next) ? raw.next.slice(0, 5) : [],
  };
}

function buildReport(state) {
  const brandTerms = state.brandTerms ?? [];
  const currentRows = normalizeRows(state.gsc?.current);
  const previousRows = normalizeRows(state.gsc?.previous);
  const currentSummary = summarizeRows(currentRows);
  const previousSummary = summarizeRows(previousRows);
  const movers = compareRows(currentRows, previousRows);
  const wins = buildWins({ currentSummary, previousSummary, state, movers });
  const problems = buildProblems({
    currentSummary,
    previousSummary,
    state,
    currentRows,
    movers,
    brandTerms,
  });
  const nextAction = buildNextAction(problems);
  const tiers = state.keywords?.tiers ?? {};
  const calendar = state.calendar ?? {};
  const backlog = state.backlog ?? {};
  const doneLabel =
    backlog.doneThisPeriod == null
      ? `${backlog.doneTotal ?? 0} Done (all time)`
      : `${backlog.doneThisPeriod} Done this period (${backlog.doneTotal ?? 0} all time)`;

  const metrics = [
    [
      "GSC clicks",
      String(currentSummary.clicks),
      String(previousSummary.clicks),
      signedNumber(currentSummary.clicks - previousSummary.clicks),
      "Organic search clicks from exported rows",
    ],
    [
      "GSC impressions",
      String(currentSummary.impressions),
      String(previousSummary.impressions),
      signedNumber(currentSummary.impressions - previousSummary.impressions),
      "Organic search impressions from exported rows",
    ],
    [
      "GSC CTR",
      asPercent(currentSummary.ctr),
      asPercent(previousSummary.ctr),
      signedPercent(currentSummary.ctr - previousSummary.ctr),
      "Weighted by clicks/impressions",
    ],
    [
      "GSC average position",
      currentSummary.position.toFixed(1),
      previousSummary.position.toFixed(1),
      signedNumber(previousSummary.position - currentSummary.position, 1),
      "Positive change means ranking improved",
    ],
    [
      "Keyword tiers",
      `P1 ${tiers.p1 ?? 0} / P2 ${tiers.p2 ?? 0} / P3 ${tiers.p3 ?? 0}`,
      "",
      "",
      "Content-engine keyword universe",
    ],
    [
      "Content calendar",
      `${calendar.scheduled ?? 0} scheduled / ${calendar.published ?? 0} published / ${calendar.overdue ?? 0} overdue`,
      "",
      "",
      "Content-engine calendar snapshot",
    ],
    [
      "SEO backlog",
      `${backlog.ready ?? 0} Ready / ${backlog.inProgress ?? 0} In progress / ${backlog.blocked ?? 0} Blocked / ${doneLabel}`,
      "",
      "",
      ".seo/backlog.md snapshot",
    ],
  ];

  const moverRows = movers
    .slice(0, 10)
    .map((row) => [
      row.query,
      row.page,
      String(row.clicks),
      String(row.previousClicks),
      signedNumber(row.clickDelta),
      row.status === "disappeared"
        ? "lost"
        : row.status === "new"
          ? "new"
          : signedNumber(row.positionDelta, 1),
      row.status === "disappeared"
        ? "Investigate lost query (content, ranking, or seasonality)"
        : isLowCtr(row) && !isBranded(row.query, brandTerms)
          ? "Rewrite title/meta"
          : row.position >= 11 && row.position <= 20
            ? "Optimize page-2 opportunity"
            : "Monitor",
    ]);

  const nextRows = (calendar.next ?? [])
    .slice(0, 5)
    .map((item) => [
      String(item.keyword ?? ""),
      String(item.date ?? ""),
      String(item.status ?? ""),
    ]);

  const partialBanner = state.partial
    ? `\n> Status: partial — GSC exports unavailable (${(state.missingSources ?? []).join(", ") || "GSC exports"}). GSC-derived sections are incomplete; fill them from repo/public evidence.\n`
    : "";

  return `# Monthly SEO report - ${state.dateRange ?? "unknown range"}
${partialBanner}
## Scope

Target: ${state.target ?? "Unknown"}
Date range: ${state.dateRange ?? "Unknown"}
Comparison range: ${state.comparisonRange ?? "Unknown"}
Data sources: ${(state.dataSources ?? []).join(", ") || "Unknown"}

## Summary

### 3 wins

${wins.map((win, index) => `${index + 1}. ${win}`).join("\n")}

### 3 problems

${problems.map((problem, index) => `${index + 1}. ${problem}`).join("\n")}

### Single next action

${nextAction}

## Metrics

${markdownTable(["Metric", "Current", "Previous", "Change", "Notes"], metrics)}

## Query/page movers

${markdownTable(["Query", "Page", "Current clicks", "Previous clicks", "Click change", "Position change", "Action"], moverRows)}

## Content engine

${markdownTable(["Keyword", "Date", "Status"], nextRows)}

## Next-month backlog changes

- Promote the single next action into the SEO backlog if it is not already present.
- Review Ready backlog count before starting new speculative work.
- Re-run this report after the next 30-day data window.
`;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const target = argValue("--target");
  const dateRange = argValue("--date-range");
  const comparisonRange = argValue("--comparison-range");
  const currentPath = argValue("--gsc-current");
  const previousPath = argValue("--gsc-previous");
  const backlogPath = argValue("--backlog");
  const tiersPath = argValue("--keyword-tiers");
  const calendarPath = argValue("--calendar");
  const brandTerms = parseBrandTerms(argValue("--brand"));
  const allowMissingGsc = process.argv.includes("--allow-missing-gsc");
  const output = argValue("--output");

  if (!target || !dateRange || !comparisonRange) {
    throw new Error(usage());
  }
  if (!allowMissingGsc && (!currentPath || !previousPath || !backlogPath)) {
    throw new Error(usage());
  }

  const missingSources = [];
  if (!currentPath) missingSources.push("--gsc-current");
  if (!previousPath) missingSources.push("--gsc-previous");
  if (!backlogPath) missingSources.push("--backlog");
  const partial = allowMissingGsc && (!currentPath || !previousPath);

  const state = {
    target,
    dateRange,
    comparisonRange,
    brandTerms,
    partial,
    missingSources,
    dataSources: [
      currentPath ?? "GSC current unavailable",
      previousPath ?? "GSC previous unavailable",
      backlogPath ?? "backlog unavailable",
      tiersPath ?? "keyword tiers unavailable",
      calendarPath ?? "calendar unavailable",
    ],
    gsc: {
      current: currentPath ? await readJsonFile(currentPath) : { rows: [] },
      previous: previousPath ? await readJsonFile(previousPath) : { rows: [] },
    },
    backlog: parseBacklog(
      backlogPath ? await readFile(backlogPath, "utf-8") : "",
      dateRange,
    ),
    keywords: {
      tiers: normalizeTierCounts(tiersPath ? await readJsonFile(tiersPath) : null),
    },
    calendar: normalizeCalendar(
      calendarPath ? await readJsonFile(calendarPath) : null,
    ),
  };

  const report = buildReport(state);

  if (output) {
    await writeFile(output, report);
    console.log(`Wrote ${output}`);
    return;
  }

  console.log(report);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
