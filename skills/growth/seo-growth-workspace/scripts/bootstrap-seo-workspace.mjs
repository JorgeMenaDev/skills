#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const taxonomyTemplatePath = path.resolve(scriptDir, "../templates/taxonomy.md");

function usage() {
  return `Usage:
  node bootstrap-seo-workspace.mjs [target-dir]

Creates or verifies the .seo/ workspace (backlog, log, audit, taxonomy, strategy, context,
backlinks, reports) in the target directory (default: current directory). Existing files are
never overwritten. .seo/taxonomy.md is sourced from the skill's templates/taxonomy.md.`;
}

// Stub only for degraded installs missing templates/taxonomy.md. No inline taxonomy is
// restated here: the canonical taxonomy has a single owner (references/ticket-architecture.md).
const taxonomyStub = `# SEO ticket taxonomy (stub)

This install is missing templates/taxonomy.md. Read the canonical taxonomy — priorities, areas,
evidence standard, and work selection — in the skill's references/ticket-architecture.md, then fill this file in.
`;

async function taxonomyContent() {
  try {
    return await readFile(taxonomyTemplatePath, "utf-8");
  } catch {
    process.stderr.write(
      "Warning: templates/taxonomy.md not found next to this script; wrote a stub .seo/taxonomy.md. See references/ticket-architecture.md for the canonical taxonomy.\n",
    );
    return taxonomyStub;
  }
}

function staticFiles() {
  return {
    ".seo/README.md": `# SEO workspace

Canonical files:

- \`.seo/backlog.md\` is the only task queue.
- \`.seo/context.md\` stores durable business, audience, market, and SEO context.
- \`.seo/log.md\` stores chronological handoffs.
- \`.seo/audit.md\` stores findings and evidence.
- \`.seo/strategy.md\` stores durable decisions and tooling.
- \`.seo/reports/\` stores dated reports.
- \`.seo/backlinks/work-log.md\` stores backlink/citation attempts.
`,
    ".seo/backlog.md": `# SEO backlog

Last updated: YYYY-MM-DD
Current focus: none

## Rules

- Use \`.seo/taxonomy.md\` for priorities, areas, evidence standards, and done criteria.
- Keep one current focus ticket.
- Empty Ready/In progress tables do not mean SEO is done; use the operating loop to run the next small evidence-backed checkpoint.
- Record long evidence in \`.seo/audit.md\` or \`.seo/reports/\`, not in this table.

## Ready

| ID | P | Area | Ticket | Verify |
| --- | --- | --- | --- | --- |

## In progress

| ID | Started | Notes |
| --- | --- | --- |

## Blocked

| ID | Blocker | Since |
| --- | --- | --- |

## Done

| ID | Completed | Verify |
| --- | --- | --- |
`,
    ".seo/log.md": `# SEO operating log

Use this as the chronological handoff for continuous SEO work. Keep entries short and link to reports or backlog tickets for detail.
`,
    ".seo/audit.md": `# SEO audit

Last updated: YYYY-MM-DD

## Findings

| ID | Priority | Area | Finding | Evidence | Recommended action |
| --- | --- | --- | --- | --- | --- |
`,
    ".seo/strategy.md": `# SEO strategy

Last updated: YYYY-MM-DD

## Business context

See \`.seo/context.md\`.

## Tooling

| Tool | Status | Notes |
| --- | --- | --- |

## Decisions
`,
    ".seo/backlinks/summary.md": `# Backlink summary

Last updated: YYYY-MM-DD
`,
    ".seo/backlinks/work-log.md": `# Backlink work log

| Date | Target | Action | Status | Evidence | Next step |
| --- | --- | --- | --- | --- | --- |
`,
    ".seo/context.md": `# SEO business context

## Business basics

## Offer and conversion paths

## Audience and buyer stages

## SEO goals

## Current standing

## Competitors

## Prior SEO work

## Constraints and operating preferences
`,
  };
}

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--help" || arg === "-h") {
    console.log(usage());
    return;
  }
  if (arg?.startsWith("-")) {
    throw new Error(`Unknown flag ${arg}\n\n${usage()}`);
  }

  const root = arg ? path.resolve(arg) : process.cwd();
  const files = {
    ...staticFiles(),
    ".seo/taxonomy.md": await taxonomyContent(),
  };

  await Promise.all(
    [".seo/reports", ".seo/scripts", ".seo/pseo"].map((dir) =>
      mkdir(path.join(root, dir), { recursive: true }),
    ),
  );

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    if (existsSync(absolutePath)) continue;
    await ensureDir(absolutePath);
    await writeFile(absolutePath, content);
  }

  console.log(`SEO workspace verified at ${root}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
