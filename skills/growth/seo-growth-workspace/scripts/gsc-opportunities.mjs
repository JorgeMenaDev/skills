#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

// Rough cross-industry expected-CTR baselines by average position band.
// Rows are flagged when CTR falls below CTR_FLAG_RATIO * baseline for their band.
const CTR_BANDS = [
  { label: "1-3", min: 1, max: 3, baseline: 0.1 },
  { label: "4-6", min: 4, max: 6, baseline: 0.04 },
  { label: "7-10", min: 7, max: 10, baseline: 0.015 },
];
const CTR_FLAG_RATIO = 0.5;
const CANNIBALIZATION_MIN_SHARE = 0.2;
const DEFAULT_MIN_IMPRESSIONS = 100;

function usage() {
  return `Usage:
  node gsc-opportunities.mjs --input gsc-response.json [--format report|backlog] [--output out.md]
      [--brand "term1,term2"] [--min-impressions ${DEFAULT_MIN_IMPRESSIONS}] [--start-id 20]

Input can be either:
  - Google Search Console searchanalytics.query JSON with rows[]
  - An array of rows shaped like { keys: [query, page], clicks, impressions, ctr, position }

Formats:
  report (default)  Page-2 goldmine, position-banded CTR underperformers, and query
                    cannibalization tables.
  backlog           Draft .seo/backlog.md Ready rows built from the same analysis.

Options:
  --brand            Comma-separated brand terms (case-insensitive substring match).
                     Branded queries are excluded from CTR-fix analysis and reported as a count.
  --min-impressions  Minimum impressions for a row to be analyzed (default ${DEFAULT_MIN_IMPRESSIONS}).
  --start-id         First SEO-NNN id for --format backlog (default 20).

Outputs are review drafts, not automatic prioritization decisions. This is a draft backlog /
report input, not a full prioritization model. The script does not authenticate; export or
fetch data separately (see gsc-fetch.mjs).`;
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

function asPercent(value) {
  if (typeof value !== "number") return "";
  return `${(value * 100).toFixed(2)}%`;
}

function normalizeRows(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.rows;
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
  }).filter((row) => row.position > 0);
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

function parseBrandTerms(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function analyze(rows, { brandTerms, minImpressions }) {
  const eligible = rows.filter((row) => row.impressions >= minImpressions);
  const isBranded = (query) => {
    const lower = query.toLowerCase();
    return brandTerms.some((term) => lower.includes(term));
  };

  const pageTwo = eligible
    .filter((row) => row.position >= 11 && row.position <= 20)
    .sort((a, b) => b.impressions - a.impressions);

  const ctrPopulation = eligible.filter((row) => bandFor(row.position) !== null);
  const brandedExcluded = ctrPopulation.filter((row) => isBranded(row.query)).length;
  const ctrFixes = ctrPopulation
    .filter((row) => !isBranded(row.query))
    .map((row) => ({ ...row, band: bandFor(row.position) }))
    .filter((row) => row.ctr < row.band.baseline * CTR_FLAG_RATIO)
    .sort((a, b) => b.impressions - a.impressions);

  const byQuery = new Map();
  for (const row of eligible) {
    if (!byQuery.has(row.query)) byQuery.set(row.query, []);
    byQuery.get(row.query).push(row);
  }
  const cannibalization = [...byQuery.entries()]
    .map(([query, queryRows]) => {
      const total = queryRows.reduce((sum, row) => sum + row.impressions, 0);
      const meaningful = queryRows
        .map((row) => ({ ...row, share: total === 0 ? 0 : row.impressions / total }))
        .filter((row) => row.share >= CANNIBALIZATION_MIN_SHARE)
        .sort((a, b) => b.impressions - a.impressions);
      return { query, total, pages: meaningful };
    })
    .filter((entry) => entry.pages.length >= 2)
    .sort((a, b) => b.total - a.total);

  return { eligible, pageTwo, ctrFixes, cannibalization, brandedExcluded };
}

function buildReport(analysis, { brandTerms, minImpressions }) {
  const pageTwoRows = analysis.pageTwo.slice(0, 25).map((row) => [
    row.query,
    row.page,
    String(row.clicks),
    String(row.impressions),
    asPercent(row.ctr),
    row.position.toFixed(1),
    "Review title/H1/content/internal links",
  ]);

  const ctrRows = analysis.ctrFixes.slice(0, 25).map((row) => [
    row.query,
    row.page,
    String(row.clicks),
    String(row.impressions),
    asPercent(row.ctr),
    asPercent(row.band.baseline),
    row.position.toFixed(1),
    "Rewrite title/meta for search intent",
  ]);

  const bandRows = CTR_BANDS.map((band) => [
    band.label,
    asPercent(band.baseline),
    `< ${asPercent(band.baseline * CTR_FLAG_RATIO)}`,
  ]);

  const cannibalizationRows = analysis.cannibalization
    .slice(0, 10)
    .flatMap((entry) =>
      entry.pages.map((row) => [
        entry.query,
        row.page,
        String(row.clicks),
        String(row.impressions),
        asPercent(row.share),
        row.position.toFixed(1),
      ]),
    );

  const brandNote =
    brandTerms.length === 0
      ? "No --brand terms provided; branded queries are not excluded. Pass --brand \"term1,term2\" to exclude them."
      : `Branded queries excluded from CTR analysis: ${analysis.brandedExcluded} (terms: ${brandTerms.join(", ")}).`;

  return `# GSC opportunities

Generated: ${new Date().toISOString()}

Rows analyzed: ${analysis.eligible.length} (minimum ${minImpressions} impressions). ${brandNote}

## Page 2 goldmine

Queries ranking 11-20 with meaningful impressions; small on-page improvements often move these to page 1.

${markdownTable(["Query", "Page", "Clicks", "Impressions", "CTR", "Position", "Action"], pageTwoRows)}

## CTR underperformers (position-banded)

Expected CTR varies steeply with position, so rows are compared against a baseline for their
position band instead of one flat threshold. A row is flagged when its CTR is below
${Math.round(CTR_FLAG_RATIO * 100)}% of the band baseline. Baselines are rough cross-industry
medians; interpret against your own SERP mix (SERP features and AI Overviews can depress CTR
without any title problem).

${markdownTable(["Position band", "Expected CTR baseline", "Flag threshold"], bandRows)}

${markdownTable(["Query", "Page", "Clicks", "Impressions", "CTR", "Band baseline", "Position", "Action"], ctrRows)}

## Query cannibalization

Queries where two or more pages each capture at least ${Math.round(CANNIBALIZATION_MIN_SHARE * 100)}%
of the query's impressions. Decide one canonical target per query; consolidate or differentiate the rest.

${markdownTable(["Query", "Page", "Clicks", "Impressions", "Share of query", "Position"], cannibalizationRows)}
`;
}

function formatId(value) {
  return `SEO-${String(value).padStart(3, "0")}`;
}

function buildBacklog(analysis, startId) {
  const pageTwo = analysis.pageTwo.slice(0, 10);
  const ctrFixes = analysis.ctrFixes.slice(0, 10);

  const tickets = [
    ...pageTwo.map((row, index) => ({
      id: formatId(startId + index),
      priority: "P1",
      area: "content",
      ticket: `Optimize ${row.query} content cluster`,
      verify: `GSC query ${row.query} improves from position ${row.position.toFixed(1)} on ${row.page}`,
    })),
    ...ctrFixes.map((row, index) => ({
      id: formatId(startId + pageTwo.length + index),
      priority: "P1",
      area: "cro",
      ticket: `Rewrite title and meta for ${row.query}`,
      verify: `GSC CTR for ${row.query} improves from ${asPercent(row.ctr)} (band ${row.band.label} baseline ${asPercent(row.band.baseline)}) on ${row.page}`,
    })),
  ];

  return `# Draft SEO backlog rows from GSC

This is a draft backlog, not a full prioritization model. Review every row before merging into .seo/backlog.md.

${markdownTable(
    ["ID", "P", "Area", "Ticket", "Verify"],
    tickets.map((ticket) => [
      ticket.id,
      ticket.priority,
      ticket.area,
      ticket.ticket,
      ticket.verify,
    ]),
  )}
`;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const input = argValue("--input");
  if (!input) throw new Error(usage());

  const format = argValue("--format") ?? "report";
  if (format !== "report" && format !== "backlog") {
    throw new Error(`Unknown --format "${format}". Use report or backlog.`);
  }

  const minImpressions = Number(
    argValue("--min-impressions") ?? DEFAULT_MIN_IMPRESSIONS,
  );
  if (!Number.isInteger(minImpressions) || minImpressions < 0) {
    throw new Error("--min-impressions must be a non-negative integer");
  }

  const startId = Number(argValue("--start-id") ?? 20);
  if (!Number.isInteger(startId) || startId < 1) {
    throw new Error("--start-id must be a positive integer");
  }

  const brandTerms = parseBrandTerms(argValue("--brand"));
  const output = argValue("--output");
  const payload = await readJsonFile(input);
  const analysis = analyze(normalizeRows(payload), {
    brandTerms,
    minImpressions,
  });
  const text =
    format === "backlog"
      ? buildBacklog(analysis, startId)
      : buildReport(analysis, { brandTerms, minImpressions });

  if (output) {
    await writeFile(output, text);
    console.log(`Wrote ${output}`);
    return;
  }

  console.log(text);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
