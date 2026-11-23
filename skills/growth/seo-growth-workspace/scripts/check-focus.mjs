#!/usr/bin/env node

// check-focus.mjs: fails when a site workspace has no named business outcome, goal or
// not-winnable list. Run at setup and at the start of every review (references/review.md §1).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const USAGE = `Usage:
  node check-focus.mjs <SITE_WORKSPACE>

Checks that context.md has an "## Outcome" block and strategy.md a "## Current focus" block
with every field filled (shapes in references/setup.md). Exits 1 and names each missing field.
A field may say Unknown; an Unknown system of record makes reading it the first bet.`;

// Field lines a block must carry, as "- Name: value".
const REQUIRED = {
  "context.md": { heading: "## Outcome", fields: ["Outcome", "System of record", "Counting rule", "Coverage", "Capacity", "Google Business Profile"] },
  "strategy.md": { heading: "## Current focus", fields: ["Goal", "Constraint", "Not winnable", "Next decision"] },
};

// Returns the lines under the first heading that starts with `heading`, up to the next "## ".
function block(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) return null;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

function fieldValue(lines, name) {
  const line = lines.find((entry) => entry.trim().startsWith(`- ${name}:`));
  const value = line?.slice(line.indexOf(":") + 1).trim() ?? "";
  return value && !value.startsWith("<") ? value : null;
}

function main() {
  const workspace = process.argv[2];
  if (!workspace || workspace === "--help" || workspace === "-h") {
    console.log(USAGE);
    process.exit(workspace ? 0 : 1);
  }
  const problems = [];
  const notes = [];
  for (const [file, { heading, fields }] of Object.entries(REQUIRED)) {
    const filePath = path.join(workspace, file);
    if (!existsSync(filePath)) {
      problems.push(`${file} is missing: create it from references/setup.md`);
      continue;
    }
    const lines = block(readFileSync(filePath, "utf-8"), heading);
    if (!lines) {
      problems.push(`${file} has no "${heading}" block: add it with the fields in references/setup.md`);
      continue;
    }
    for (const name of fields) {
      const value = fieldValue(lines, name);
      if (!value) problems.push(`${file} ${heading}: fill "- ${name}:" (references/setup.md)`);
      if (name === "System of record" && value && /^unknown/i.test(value)) {
        notes.push("System of record is Unknown: look in the business's own systems first; reading it is the first bet");
      }
    }
  }
  for (const note of notes) console.log(`note: ${note}`);
  if (problems.length > 0) {
    console.error(`check-focus: ${problems.length} missing in ${workspace}`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`ok: ${workspace} names its outcome, goal, constraint and not-winnable list`);
}

main();
