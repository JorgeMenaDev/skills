#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

function usage() {
  return `Usage:
  node monthly-report.mjs --input monthly-report.json [--output report.md]

Builds a one-page SEO report from exported monthly state:
GSC current/previous rows, backlog counts, keyword tier counts, and content calendar snapshot.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
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
  });
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

function metricChange(current, previous, formatter = String) {
  return formatter(current - previous);
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function rowKey(row) {
  return `${row.query}|||${row.page}`;
}

function compareRows(currentRows, previousRows) {
  const previous = new Map(previousRows.map((row) => [rowKey(row), row]));

  return currentRows
    .map((current) => {
      const prior = previous.get(rowKey(current));
      return {
        ...current,
        previousClicks: prior?.clicks ?? 0,
        previousPosition: prior?.position ?? null,
        clickDelta: current.clicks - (prior?.clicks ?? 0),
        positionDelta:
          prior?.position == null ? null : prior.position - current.position,
      };
    })
    .sort((a, b) => Math.abs(b.clickDelta) - Math.abs(a.clickDelta));
}

function buildWins({ currentSummary, previousSummary, state, movers }) {
  const wins = [];
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
  if ((state.calendar?.scheduled ?? 0) > 0) {
    wins.push(
      `${state.calendar.scheduled} content items are scheduled in the calendar.`,
    );
  }
  if ((state.backlog?.doneThisPeriod ?? 0) > 0) {
    wins.push(
      `${state.backlog.doneThisPeriod} SEO backlog items were completed.`,
    );
  }
  const topMover = movers.find((row) => row.clickDelta > 0);
  if (topMover) {
    wins.push(
      `${topMover.query} gained ${topMover.clickDelta} clicks vs the comparison period.`,
    );
  }

  return [...wins, "Baseline established for next reporting cycle."].slice(
    0,
    3,
  );
}

function buildProblems({
  currentSummary,
  previousSummary,
  state,
  currentRows,
}) {
  const problems = [];
  const lowCtr = currentRows.find(
    (row) => row.impressions >= 100 && row.position <= 10 && row.ctr < 0.02,
  );
  const pageTwo = currentRows.find(
    (row) => row.impressions >= 100 && row.position >= 11 && row.position <= 20,
  );

  if (lowCtr) {
    problems.push(
      `${lowCtr.query} has high impressions but low CTR (${asPercent(lowCtr.ctr)}).`,
    );
  }
  if (pageTwo) {
    problems.push(
      `${pageTwo.query} is still on page 2 at position ${pageTwo.position.toFixed(1)}.`,
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

  return [
    ...problems,
    "Conversion tracking must be reviewed if leads/calls are not available.",
  ].slice(0, 3);
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

function buildReport(state) {
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
  });
  const nextAction = buildNextAction(problems);
  const tiers = state.keywords?.tiers ?? {};
  const calendar = state.calendar ?? {};
  const backlog = state.backlog ?? {};

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
      metricChange(currentSummary.ctr, previousSummary.ctr, asPercent),
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
      `${backlog.ready ?? 0} Ready / ${backlog.inProgress ?? 0} In progress / ${backlog.blocked ?? 0} Blocked / ${backlog.doneThisPeriod ?? 0} Done`,
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
      row.positionDelta == null ? "new" : signedNumber(row.positionDelta, 1),
      row.ctr < 0.02 && row.impressions >= 100
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

  return `# Monthly SEO report - ${state.dateRange ?? "unknown range"}

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

  const input = argValue("--input");
  if (!input) throw new Error(usage());

  const output = argValue("--output");
  const state = JSON.parse(await readFile(input, "utf-8"));
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
