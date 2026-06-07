import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const files = {
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
  ".seo/taxonomy.md": `# SEO ticket taxonomy

## Priorities

| Priority | Meaning |
| --- | --- |
| P0 | Indexability, data loss, or production blockers |
| P1 | Revenue, conversion, measurement, or high-confidence quick wins |
| P2 | Quality, performance, schema, or reliability improvements |
| P3 | Content, internal links, pSEO planning, or expansion |
| P4 | Authority, backlinks, monitoring, or longer-term bets |

## Areas

\`indexability\`, \`gsc\`, \`analytics\`, \`cro\`, \`schema\`, \`performance\`, \`content\`, \`internal-links\`, \`pseo\`, \`local-seo\`, \`backlinks\`, \`entity\`, \`reporting\`, \`admin\`

## Evidence standard

Every ticket needs a concrete Verify cell: command output, live URL/status, rendered metadata/schema, admin report, API/CLI output, or public backlink/citation URL.

## Work selection

Use this order: Current focus, first In progress row, top Ready row, newly unblockable Blocked row, then one new evidence-backed ticket from the operating loop.
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

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
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
  console.error(error);
  process.exit(1);
});
