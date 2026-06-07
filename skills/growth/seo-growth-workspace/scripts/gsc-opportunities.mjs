#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

function usage() {
  return `Usage:
  node gsc-opportunities.mjs --input gsc-response.json [--output report.md]

Input can be either:
  - Google Search Console searchanalytics.query JSON with rows[]
  - An array of rows shaped like { keys: [query, page], clicks, impressions, ctr, position }

The script writes page-2 and CTR opportunity tables. It does not authenticate; export or query data separately.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function asPercent(value) {
  if (typeof value !== "number") return "";
  return `${(value * 100).toFixed(2)}%`;
}

function normalizeRows(payload) {
  const rows = Array.isArray(payload) ? payload : payload.rows;
  if (!Array.isArray(rows))
    throw new Error("Input must contain rows[] or be an array.");

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

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function buildReport(rows) {
  const pageTwo = rows
    .filter(
      (row) =>
        row.position >= 11 && row.position <= 20 && row.impressions >= 100,
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);

  const ctrFixes = rows
    .filter(
      (row) => row.impressions >= 100 && row.position <= 10 && row.ctr < 0.02,
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);

  const pageTwoRows = pageTwo.map((row) => [
    row.query,
    row.page,
    String(row.clicks),
    String(row.impressions),
    asPercent(row.ctr),
    row.position.toFixed(1),
    "Review title/H1/content/internal links",
  ]);

  const ctrRows = ctrFixes.map((row) => [
    row.query,
    row.page,
    String(row.clicks),
    String(row.impressions),
    asPercent(row.ctr),
    row.position.toFixed(1),
    "Rewrite title/meta for search intent",
  ]);

  return `# GSC opportunities

Generated: ${new Date().toISOString()}

## Page 2 goldmine

${markdownTable(["Query", "Page", "Clicks", "Impressions", "CTR", "Position", "Action"], pageTwoRows)}

## High-impression low-CTR

${markdownTable(["Query", "Page", "Clicks", "Impressions", "CTR", "Position", "Action"], ctrRows)}
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
  const payload = JSON.parse(await readFile(input, "utf-8"));
  const report = buildReport(normalizeRows(payload));

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
