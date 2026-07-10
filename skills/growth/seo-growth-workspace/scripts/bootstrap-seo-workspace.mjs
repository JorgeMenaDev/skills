#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const taxonomyTemplatePath = path.resolve(scriptDir, "../templates/taxonomy.md");

// Keep in sync with SKILL.md frontmatter (validate-skill.mjs asserts they match).
const SKILL_VERSION = "3.1.0";
// Workspace layout contract stamped into config.json; bumped only by a
// documented migration, never by merely running a newer skill.
const WORKSPACE_SCHEMA_VERSION = 1;
// A .seo/ without config.json is adoptable as legacy-standalone only when it
// holds at least this many canonical files (keep in sync with seo-doctor.mjs).
const CANONICAL_FILES = ["backlog.md", "log.md", "audit.md", "strategy.md"];
const LEGACY_SIGNATURE_MIN = 3;

function usage() {
  return `Usage:
  node bootstrap-seo-workspace.mjs [target-dir]                 standalone workspace
  node bootstrap-seo-workspace.mjs --hub [target-dir]           hub skeleton
  node bootstrap-seo-workspace.mjs --site <slug> [target-dir]   site workspace under a hub

Standalone (default): creates or verifies the .seo/ workspace (backlog, log, audit, taxonomy,
strategy, context, backlinks, reports) in the target directory (default: current directory)
and stamps .seo/config.json with {"mode":"standalone"}.

--hub: creates the hub skeleton instead — .seo/{config.json (mode hub), registry.md, sites/}.
No standalone workspace files are written at the hub root.

--site <slug> (slug: lowercase letters/digits with inner hyphens, no leading/trailing hyphen):
creates a full site workspace at .seo/sites/<slug>/ inside an existing hub (or combined with
--hub in the same run), and prints a REGISTRATION PENDING registry row. The script never edits
registry.md itself.

Run scripts/seo-doctor.mjs (read-only) first: this script aborts on a .seo/ that has no
config.json and lacks the legacy signature (>=${LEGACY_SIGNATURE_MIN} of ${CANONICAL_FILES.join("/")}).
Existing files are never overwritten (an existing config.json is never rewritten), and mode
conflicts (standalone root given --hub, hub root given a plain run) are hard errors —
converting a workspace is a manual decision (references/migrate-uninstall.md).
taxonomy.md is sourced from the skill's templates/taxonomy.md.`;
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
      "Warning: templates/taxonomy.md not found next to this script; wrote a stub taxonomy.md. See references/ticket-architecture.md for the canonical taxonomy.\n",
    );
    return taxonomyStub;
  }
}

// One standalone workspace file set, keyed workspace-relative so the same set lands at
// .seo/ (standalone) or .seo/sites/<slug>/ (hub site). Content is mode-agnostic: inside a
// workspace, `.seo/X` prose means SITE_WORKSPACE/X (path semantics in SKILL.md).
function workspaceFiles() {
  return {
    "README.md": `# SEO workspace

Canonical files:

- \`.seo/backlog.md\` is the only task queue.
- \`.seo/context.md\` stores durable business, audience, market, and SEO context.
- \`.seo/log.md\` stores chronological handoffs.
- \`.seo/audit.md\` stores findings and evidence.
- \`.seo/strategy.md\` stores durable decisions and tooling.
- \`.seo/reports/\` stores dated reports.
- \`.seo/backlinks/work-log.md\` stores backlink/citation attempts.
`,
    "backlog.md": `# SEO backlog

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
    "log.md": `# SEO operating log

Use this as the chronological handoff for continuous SEO work. Keep entries short and link to reports or backlog tickets for detail.
`,
    "audit.md": `# SEO audit

Last updated: YYYY-MM-DD

## Findings

| ID | Priority | Area | Finding | Evidence | Recommended action |
| --- | --- | --- | --- | --- | --- |
`,
    "strategy.md": `# SEO strategy

Last updated: YYYY-MM-DD

## Business context

See \`.seo/context.md\`.

## Tooling

| Tool | Status | Notes |
| --- | --- | --- |

## Decisions
`,
    "backlinks/summary.md": `# Backlink summary

Last updated: YYYY-MM-DD
`,
    "backlinks/work-log.md": `# Backlink work log

| Date | Target | Action | Status | Evidence | Next step |
| --- | --- | --- | --- | --- | --- |
`,
    "context.md": `# SEO business context

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

function hubReadme() {
  return `# SEO hub workspace

This is a hub (orchestrator) SEO workspace managing several sites. See the skill's
references/hub-mode.md for the operating rules.

Canonical files:

- \`.seo/registry.md\` maps every managed site to its workspace root.
- \`.seo/sites/<slug>/\` holds each site's full SEO workspace (backlog, log, reports, ...).
- \`.seo/portfolio-index.md\` is the cross-site rollup (templates/portfolio-index.md).

One target site per run; never blend workspaces.
`;
}

function registrySeed() {
  return `# Portfolio Registry

See the skill's references/portfolio-registry.md for column meanings and reading rules.
Hub-managed sites use a workspace root of \`sites/<slug>\` (relative to this file's directory).

| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |
|---|---|---|---|---|---|---|
`;
}

function configContent(mode) {
  const created = new Date().toISOString().slice(0, 10);
  // skillVersion is created-by provenance (never rewritten by later runs);
  // workspaceSchemaVersion is the layout contract. Field semantics:
  // references/hub-mode.md Mode Stamp.
  return `${JSON.stringify(
    { mode, created, skillVersion: SKILL_VERSION, workspaceSchemaVersion: WORKSPACE_SCHEMA_VERSION },
    null,
    2,
  )}\n`;
}

// Returns "standalone" | "hub" | null. A .seo/ without config.json is a legacy
// standalone workspace only when it carries the legacy signature — at least
// LEGACY_SIGNATURE_MIN canonical files (back-compat rule in
// references/hub-mode.md). Anything else aborts: presence alone is not a safe
// legacy signature (the .seo/ may belong to another tool or be debris).
function existingMode(seoDir) {
  const configPath = path.join(seoDir, "config.json");
  if (existsSync(configPath)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      throw new Error(`Unreadable ${configPath} — fix or remove it before bootstrapping.`);
    }
    if (parsed.mode !== "standalone" && parsed.mode !== "hub") {
      throw new Error(`${configPath} has unknown mode ${JSON.stringify(parsed.mode)}.`);
    }
    return parsed.mode;
  }
  if (!existsSync(seoDir)) return null;
  const present = CANONICAL_FILES.filter((file) => existsSync(path.join(seoDir, file)));
  if (present.length >= LEGACY_SIGNATURE_MIN) return "standalone";
  throw new Error(
    `${seoDir} exists without config.json and carries no recognizable legacy workspace signature ` +
      `(${present.length}/${CANONICAL_FILES.length} of ${CANONICAL_FILES.join("/")}). Not adopting it. ` +
      `Run node scripts/seo-doctor.mjs ${path.dirname(seoDir)} (read-only), then make an explicit ` +
      `create/adopt/migrate decision — see references/migrate-uninstall.md.`,
  );
}

function parseArgs(argv) {
  const options = { hub: false, site: null, root: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--hub") {
      options.hub = true;
    } else if (arg === "--site") {
      options.site = argv[i + 1];
      if (options.site === undefined || options.site.startsWith("-")) {
        throw new Error(`Missing value for --site\n\n${usage()}`);
      }
      i += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag ${arg}\n\n${usage()}`);
    } else if (options.root === null) {
      options.root = arg;
    } else {
      throw new Error(`Unexpected extra argument ${arg}\n\n${usage()}`);
    }
  }
  if (options.site !== null && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(options.site)) {
    throw new Error(
      `Invalid site slug ${options.site} (lowercase letters/digits with inner hyphens; ` +
        `no leading/trailing hyphen)\n\n${usage()}`,
    );
  }
  return options;
}

async function writeMissing(baseDir, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(baseDir, relativePath);
    if (existsSync(absolutePath)) continue;
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }
}

async function createWorkspace(workspaceDir) {
  const files = {
    ...workspaceFiles(),
    "taxonomy.md": await taxonomyContent(),
  };
  await Promise.all(
    ["reports", "scripts", "pseo"].map((dir) =>
      mkdir(path.join(workspaceDir, dir), { recursive: true }),
    ),
  );
  await writeMissing(workspaceDir, files);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const root = options.root ? path.resolve(options.root) : process.cwd();
  const seoDir = path.join(root, ".seo");
  const mode = existingMode(seoDir);

  if (options.hub || options.site) {
    if (mode === "standalone") {
      throw new Error(
        `${seoDir} is a standalone workspace; converting it to a hub is a manual decision. ` +
          `Remove or migrate the existing workspace first.`,
      );
    }
    if (options.site && !options.hub && mode !== "hub") {
      throw new Error(
        `--site requires an existing hub at ${seoDir} (or pass --hub in the same run).\n\n${usage()}`,
      );
    }
    await mkdir(path.join(seoDir, "sites"), { recursive: true });
    await writeMissing(seoDir, {
      "config.json": configContent("hub"),
      "README.md": hubReadme(),
      "registry.md": registrySeed(),
    });
    if (options.site) {
      const workspaceDir = path.join(seoDir, "sites", options.site);
      await createWorkspace(workspaceDir);
      console.log(`Site workspace verified at ${workspaceDir}`);
      console.log(
        `REGISTRATION PENDING: add the row to ${path.join(seoDir, "registry.md")} — this script ` +
          `never edits it, and scripts/seo-doctor.mjs flags unregistered site folders:\n` +
          `| ${options.site} | sites/${options.site} | unknown | unknown | unknown | unknown | hub-managed |`,
      );
    }
    console.log(`SEO hub verified at ${root}`);
    return;
  }

  if (mode === "hub") {
    throw new Error(
      `${seoDir} is a hub workspace; use --site <slug> to add a site workspace under it. ` +
        `Converting a hub to standalone is a manual decision.`,
    );
  }

  await createWorkspace(seoDir);
  await writeMissing(seoDir, { "config.json": configContent("standalone") });
  console.log(`SEO workspace verified at ${root}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
