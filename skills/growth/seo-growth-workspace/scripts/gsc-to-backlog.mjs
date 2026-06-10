#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises";

function usage() {
  return `Usage:
  bun gsc-to-backlog.mjs --input gsc-response.json [--output backlog.md] [--start-id 20]

Converts Search Console query+page rows into draft .seo/backlog.md Ready rows.
Use this as a review draft, not an automatic prioritization decision.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
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

function formatId(value) {
  return `SEO-${String(value).padStart(3, "0")}`;
}

function escapeCell(value) {
  return value.replace(/\|/g, "\\|");
}

function buildBacklog(rows, startId) {
  const pageTwo = rows
    .filter(
      (row) =>
        row.position >= 11 && row.position <= 20 && row.impressions >= 100,
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  const ctrFixes = rows
    .filter(
      (row) => row.impressions >= 100 && row.position <= 10 && row.ctr < 0.02,
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

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
      verify: `GSC CTR for ${row.query} improves from ${(row.ctr * 100).toFixed(2)}% on ${row.page}`,
    })),
  ];

  return `# Draft SEO backlog rows from GSC

Review before merging into .seo/backlog.md.

| ID | P | Area | Ticket | Verify |
| --- | --- | --- | --- | --- |
${tickets.map((ticket) => `| ${ticket.id} | ${ticket.priority} | ${ticket.area} | ${escapeCell(ticket.ticket)} | ${escapeCell(ticket.verify)} |`).join("\n")}
`;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const input = argValue("--input");
  if (!input) throw new Error(usage());

  const startId = Number(argValue("--start-id") ?? 20);
  if (!Number.isInteger(startId) || startId < 1) {
    throw new Error("--start-id must be a positive integer");
  }

  const output = argValue("--output");
  const payload = JSON.parse(await readFile(input, "utf-8"));
  const backlog = buildBacklog(normalizeRows(payload), startId);

  if (output) {
    await writeFile(output, backlog);
    console.log(`Wrote ${output}`);
    return;
  }

  console.log(backlog);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
