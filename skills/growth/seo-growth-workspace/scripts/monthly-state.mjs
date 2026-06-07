#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

function usage() {
  return `Usage:
  node monthly-state.mjs --target "Demo SaaS" --date-range "2026-04-01 to 2026-04-30" --comparison-range "2026-03-01 to 2026-03-31" --gsc-current current.json --gsc-previous previous.json --backlog .seo/backlog.md [--keyword-tiers tiers.json] [--calendar calendar.json] [--output monthly-state.json]

Builds the input JSON for monthly-report.mjs from exported GSC rows and local SEO/content-engine state.
Do not include secrets in any input file.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

async function readJson(path) {
  if (!path) return null;
  return JSON.parse(await readFile(path, "utf-8"));
}

function sectionName(line) {
  const match = line.match(/^##\s+(.+?)\s*$/);
  return match?.[1]?.trim().toLowerCase() ?? null;
}

function countSeoRows(lines) {
  return lines.filter((line) => line.startsWith("| SEO-")).length;
}

function parseBacklog(markdown) {
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

  return {
    ready: countSeoRows(sections.ready),
    inProgress: countSeoRows(sections["in progress"]),
    blocked: countSeoRows(sections.blocked),
    doneThisPeriod: countSeoRows(sections.done),
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
  const output = argValue("--output");

  if (
    !target ||
    !dateRange ||
    !comparisonRange ||
    !currentPath ||
    !previousPath ||
    !backlogPath
  ) {
    throw new Error(usage());
  }

  const keywordTiers = normalizeTierCounts(
    await readJson(argValue("--keyword-tiers")),
  );
  const calendar = normalizeCalendar(await readJson(argValue("--calendar")));
  const backlog = parseBacklog(await readFile(backlogPath, "utf-8"));

  const state = {
    target,
    dateRange,
    comparisonRange,
    dataSources: [
      currentPath,
      previousPath,
      backlogPath,
      argValue("--keyword-tiers") ?? "keyword tiers unavailable",
      argValue("--calendar") ?? "calendar unavailable",
    ],
    gsc: {
      current: await readJson(currentPath),
      previous: await readJson(previousPath),
    },
    backlog,
    keywords: { tiers: keywordTiers },
    calendar,
  };

  const text = `${JSON.stringify(state, null, 2)}\n`;
  if (output) {
    await writeFile(output, text);
    console.log(`Wrote ${output}`);
    return;
  }

  process.stdout.write(text);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
