#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GENERATED_WORKSPACE_DIRS,
  GENERATED_WORKSPACE_FILES,
  OPTIONAL_WORKSPACE_FILES,
  LEGACY_SIGNATURE_MIN,
  SITE_ID_PATTERN,
  classifyWorkspace,
  isSafeLegacySiteId,
  isWithin,
  normalizeHost,
  planHash,
  registryDiscoveryFingerprint,
  safeRealpath,
  sha256,
  stableJson,
  verifySourceRecords,
} from "./workspace-state.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const taxonomyTemplatePath = path.resolve(scriptDir, "../templates/taxonomy.md");
const SKILL_VERSION = "5.0.0";
const WORKSPACE_SCHEMA_VERSION = 1;
const ACTIONS = new Set(["create", "adopt", "verify", "repair", "create-optional"]);

function usage() {
  return `Usage:
  node bootstrap-seo-workspace.mjs --plan <file> --action create --domain <host> [--hub] [--site <id>] [target-dir]
  node bootstrap-seo-workspace.mjs --plan <file> --action adopt --domain <host> [target-dir]
  node bootstrap-seo-workspace.mjs --plan <file> --action verify --domain <host> [--site <id>] [target-dir]
  node bootstrap-seo-workspace.mjs --plan <file> --action repair --domain <host> --files <comma,list> [--site <id>] [target-dir]
  node bootstrap-seo-workspace.mjs --plan <file> --action create-optional --domain <host> --files <comma,list> [--site <id>] [target-dir]

Every invocation requires a current, approved plan from seo-doctor.mjs. Create scaffolds
an absent standalone/hub target. Adopt stamps config.json only on a recognized legacy
standalone workspace (>=${LEGACY_SIGNATURE_MIN} exact schema-1 signatures). Repair creates
only the approved missing generated files/directories and never overwrites existing bytes.
Create-optional creates only approved absent optional files and never changes drift state.
Verify performs zero writes. Mutating actions atomically consume the plan; replay fails.

Migration is manual in v3.1. A migrate plan is terminal and this script refuses it.`;
}

function parseArgs(argv) {
  const options = { plan: null, action: null, domain: null, hub: false, site: null, files: [], root: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--hub") {
      options.hub = true;
      continue;
    }
    if (["--plan", "--action", "--domain", "--site", "--files"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}\n\n${usage()}`);
      if (arg === "--plan") options.plan = value;
      else if (arg === "--action") options.action = value;
      else if (arg === "--domain") options.domain = value;
      else if (arg === "--site") options.site = value;
      else options.files = value.split(",").map((item) => item.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown flag ${arg}\n\n${usage()}`);
    if (options.root === null) options.root = arg;
    else throw new Error(`Unexpected extra argument ${arg}\n\n${usage()}`);
  }
  if (!options.plan || !options.action || !options.domain) throw new Error(`--plan, --action, and --domain are required\n\n${usage()}`);
  if (!ACTIONS.has(options.action)) throw new Error(`Invalid --action ${options.action}; migrate is manual in v3.1\n\n${usage()}`);
  if (new Set(["repair", "create-optional"]).has(options.action) && options.files.length === 0) throw new Error(`${options.action} requires --files`);
  if (!new Set(["repair", "create-optional"]).has(options.action) && options.files.length > 0) throw new Error("--files is valid only with --action repair or create-optional");
  return options;
}

const taxonomyStub = `# SEO ticket taxonomy (stub)

This install is missing templates/taxonomy.md. Read references/ticket-architecture.md and fill this file in.
`;

async function taxonomyContent() {
  try {
    return await readFile(taxonomyTemplatePath, "utf-8");
  } catch {
    process.stderr.write("Warning: templates/taxonomy.md is missing; writing the documented stub.\n");
    return taxonomyStub;
  }
}

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

## Authority funnel (v4)

Whole-file migration is explicit operator opt-in only. Do not replace or widen the legacy table above during bootstrap, repair, or optional-file creation.

| Date | Target | Lifecycle | Query | Market/geo | Source URL | Qualification | Reply disposition | Paid request | Amount | Link live | Indexable | 30-day check | 90-day check | Referral | Qualified conversion | Cost | Limitations | Evidence | Next step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Lifecycle: discovered → qualified → contacted → replied → won → live/verified → lost/expired. Record link-live and indexable as two independent facts.
`,
    "backlinks/asset-rights.md": `# Asset rights

This is the current-state master for assets considered for distribution or reclamation. No image work may proceed without sufficient ownership or license evidence.

| Asset ID | Original file | Creator/rightsholder | Created/acquired | Ownership/license evidence | Platform | Upload URL | License + version | Attribution requirement | Permitted credit destination | Model/property/trademark releases | Material edits | Privacy/metadata review | Checked date | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
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

This hub manages several site workspaces. See references/hub-mode.md.

- \`.seo/registry.md\` is the canonical route registry.
- \`.seo/sites/<id>/\` holds each site's schema-1 workspace.
- One target site is resolved per run.
`;
}

function registrySeed() {
  return `# Portfolio Registry

See references/portfolio-registry.md. Hub roots are relative to this file.

| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |
|---|---|---|---|---|---|---|
`;
}

function configContent(mode) {
  return `${JSON.stringify({ mode, created: new Date().toISOString().slice(0, 10), skillVersion: SKILL_VERSION, workspaceSchemaVersion: WORKSPACE_SCHEMA_VERSION }, null, 2)}\n`;
}

function assertContained(root, candidate) {
  if (!isWithin(candidate, root)) throw new Error(`Path escapes reviewed root: ${candidate}`);
  const relative = path.relative(root, candidate);
  let cursor = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try {
      if (!lstatSync(cursor).isSymbolicLink()) continue;
      let resolved;
      try {
        resolved = realpathSync(cursor);
      } catch {
        throw new Error(`Path crosses a dangling symlink: ${cursor}`);
      }
      if (!isWithin(resolved, root)) throw new Error(`Path crosses a symlink outside the reviewed root: ${cursor}`);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
  }
}

async function mkdirContained(root, directory) {
  assertContained(root, directory);
  await mkdir(directory, { recursive: true });
  assertContained(root, directory);
}

async function writeContained(root, file, content) {
  assertContained(root, file);
  await mkdirContained(root, path.dirname(file));
  assertContained(root, file);
  await writeFile(file, content, { flag: "wx" });
  assertContained(root, file);
}

async function writeMissing(baseDir, files, allowlist = null, root = baseDir) {
  for (const [relative, content] of Object.entries(files)) {
    if (allowlist && !allowlist.has(relative)) continue;
    const absolute = path.join(baseDir, relative);
    if (existsSync(absolute)) continue;
    await writeContained(root, absolute, content);
  }
}

async function createWorkspace(workspaceDir, allowlist = null, root = workspaceDir) {
  const directories = ["reports", "scripts", "pseo"];
  for (const directory of directories) {
    if (!allowlist || allowlist.has(directory)) await mkdirContained(root, path.join(workspaceDir, directory));
  }
  await writeMissing(workspaceDir, { ...workspaceFiles(), "taxonomy.md": await taxonomyContent() }, allowlist, root);
}

function loadAndVerifyPlan(options, root) {
  const planPath = path.resolve(options.plan);
  let plan;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf-8"));
  } catch (error) {
    throw new Error(`Cannot read plan ${planPath}: ${error.message}`);
  }
  if (plan.contract !== "seo-growth-workspace/bootstrap-plan-v1") throw new Error("Plan contract is missing or unsupported");
  if (plan.hash !== planHash(plan)) throw new Error("Plan hash mismatch");
  if (plan.output !== safeRealpath(planPath)) throw new Error("Plan output-path mismatch; copied plans cannot replay");
  if (Date.now() >= Date.parse(plan.expiresAt)) throw new Error(`Plan expired at ${plan.expiresAt}`);
  if (plan.root !== root || plan.rootHash !== sha256(root)) throw new Error("Plan root mismatch");
  const domain = normalizeHost(options.domain);
  if (plan.domain !== domain || plan.domainHash !== sha256(domain)) throw new Error("Plan domain mismatch");
  if (plan.site !== options.site) throw new Error("Plan site mismatch");
  if (options.site && !isSafeLegacySiteId(options.site)) throw new Error("Site IDs must be exactly one safe filesystem segment");
  const requestedInstallMode = options.hub || options.site ? "hub" : "standalone";
  if (plan.installMode !== requestedInstallMode) throw new Error(`Plan install mode ${plan.installMode} does not match requested ${requestedInstallMode} mode`);
  if (plan.searchRootsHash !== sha256(stableJson(plan.searchRoots))) throw new Error("Plan search-root hash mismatch");
  if (plan.registryDiscoveryFingerprint !== registryDiscoveryFingerprint(plan.searchRoots)) throw new Error("Plan registry discovery changed; rerun doctor");
  if (plan.sourcesHash !== sha256(stableJson(plan.sources))) throw new Error("Plan source-list hash mismatch");
  const sourceMismatches = verifySourceRecords(plan.sources);
  if (sourceMismatches.length > 0) throw new Error(`Plan source changed: ${sourceMismatches.map((item) => item.path).join(", ")}`);
  if (!plan.approved || plan.decisionError || plan.unresolvedFindingCodes?.length) throw new Error(`Plan is not approved: ${plan.decisionError ?? plan.unresolvedFindingCodes.join(", ")}`);
  if (plan.terminal || plan.decision === "migrate") throw new Error("Migration is manual in v3.1; bootstrap refuses migrate plans");
  if (options.action !== "verify" && plan.decision !== options.action) throw new Error(`Plan decision ${plan.decision} does not match action ${options.action}`);
  const files = [...new Set(options.files)].sort();
  if (options.action === "repair" && stableJson(files) !== stableJson(plan.repairFiles)) throw new Error("Repair allowlist does not match the reviewed plan");
  if (options.action === "create-optional" && stableJson(files) !== stableJson(plan.optionalFiles)) throw new Error("Optional-file allowlist does not match the reviewed plan");
  const targetState = classifyWorkspace(plan.target.workspaceDir, { hubSite: Boolean(options.site) });
  const rootState = classifyWorkspace(path.join(root, ".seo"));
  const hubSitesDir = path.join(root, ".seo/sites");
  if (options.site && (!isWithin(hubSitesDir, path.join(root, ".seo")) || !isWithin(plan.target.workspaceDir, hubSitesDir))) throw new Error("Hub site target escapes .seo/sites");
  if (requestedInstallMode === "hub" && rootState.classification === "standalone") throw new Error("A stamped standalone root cannot be used as a hub");
  if (options.site && rootState.classification === "none" && !options.hub) throw new Error("Creating the first site under an absent root requires --hub");
  if (targetState.classification !== plan.target.classification) throw new Error(`Target classification changed: ${plan.target.classification} -> ${targetState.classification}`);
  if (safeRealpath(plan.chosenWorkspace) !== safeRealpath(plan.target.workspaceDir)) throw new Error("Plan chosen workspace is not the target workspace");
  if (options.site && !SITE_ID_PATTERN.test(options.site) && plan.legacySiteId !== options.site) throw new Error(`New site IDs must match the 1-64 character slug grammar; ${options.site} is not a grandfathered registered ID`);
  if (options.action === "create" && options.site && !SITE_ID_PATTERN.test(options.site)) throw new Error("A newly created site ID must match the 1-64 character slug grammar");
  return { plan, planPath, targetState };
}

async function consumePlan(planPath, hash) {
  const consumedPath = `${planPath}.consumed-${hash.slice(0, 12)}`;
  if (existsSync(consumedPath)) throw new Error(`Plan replay refused; consumption marker exists at ${consumedPath}`);
  await rename(planPath, consumedPath);
  return consumedPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const root = safeRealpath(path.resolve(options.root ?? process.cwd()));
  const { plan, planPath, targetState } = loadAndVerifyPlan(options, root);
  if (options.action === "verify") {
    console.log(`Plan verified: ${plan.hash} (zero writes)`);
    return;
  }

  const consumedPath = await consumePlan(planPath, plan.hash);
  const seoDir = path.join(root, ".seo");
  try {
    if (options.action === "adopt") {
      if (targetState.classification !== "legacy-standalone" || targetState.recognized.length < LEGACY_SIGNATURE_MIN) throw new Error("Adopt requires a recognized legacy standalone workspace");
      await writeContained(root, path.join(targetState.workspaceDir ?? seoDir, "config.json"), configContent("standalone"));
      console.log(`Legacy workspace adopted at ${targetState.workspaceDir ?? seoDir}; config.json was the only workspace write`);
      return;
    }

    if (options.action === "repair") {
      if (!new Set(["standalone", "hub-site"]).has(targetState.classification)) throw new Error(`Repair requires schema-1 standalone/hub-site, got ${targetState.classification}`);
      const allowlist = new Set(options.files);
      for (const file of allowlist) {
        if (!GENERATED_WORKSPACE_FILES.has(file) && !GENERATED_WORKSPACE_DIRS.has(file)) throw new Error(`Repair path is not generated: ${file}`);
        if (existsSync(path.join(plan.target.workspaceDir, file))) throw new Error(`Repair refuses existing path: ${file}`);
      }
      await createWorkspace(plan.target.workspaceDir, allowlist, options.site ? path.join(seoDir, "sites") : root);
      console.log(`Workspace repaired at ${plan.target.workspaceDir}: ${options.files.join(", ")}`);
      return;
    }

    if (options.action === "create-optional") {
      if (!new Set(["standalone", "hub-site"]).has(targetState.classification)) throw new Error(`Create-optional requires schema-1 standalone/hub-site, got ${targetState.classification}`);
      const allowlist = new Set(options.files);
      for (const file of allowlist) {
        if (!OPTIONAL_WORKSPACE_FILES.has(file)) throw new Error(`Create-optional path is not optional: ${file}`);
        if (existsSync(path.join(plan.target.workspaceDir, file))) throw new Error(`Create-optional refuses existing path: ${file}`);
      }
      await writeMissing(plan.target.workspaceDir, workspaceFiles(), allowlist, options.site ? path.join(seoDir, "sites") : root);
      console.log(`Optional workspace files created at ${plan.target.workspaceDir}: ${options.files.join(", ")}`);
      return;
    }

    if (targetState.classification !== "none") throw new Error(`Create requires an absent target, got ${targetState.classification}`);
    if (options.hub || options.site) {
      await mkdirContained(root, path.join(seoDir, "sites"));
      await writeMissing(seoDir, { "config.json": configContent("hub"), "README.md": hubReadme(), "registry.md": registrySeed() }, null, root);
      if (options.site) {
        const workspaceDir = path.join(seoDir, "sites", options.site);
        await createWorkspace(workspaceDir, null, path.join(seoDir, "sites"));
        console.log(`REGISTRATION PENDING: | ${options.site} | sites/${options.site} | unknown | unknown | unknown | unknown | hub-managed |`);
      }
      console.log(`SEO hub created at ${root}`);
      return;
    }
    await createWorkspace(seoDir, null, root);
    await writeContained(root, path.join(seoDir, "config.json"), configContent("standalone"));
    console.log(`SEO workspace created at ${root}`);
  } catch (error) {
    throw new Error(`${error.message} (plan remains consumed at ${consumedPath}; rerun doctor before retrying)`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
