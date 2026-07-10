#!/usr/bin/env node

// Maintainer validation for skills/growth/seo-growth-workspace.
// Run from anywhere: node dev/seo-growth-workspace/validate-skill.mjs [--skill-dir <path>]

import {
  appendFileSync,
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(scriptDir, "fixtures");

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

const skillRoot = path.resolve(
  argValue("--skill-dir") ??
    path.resolve(scriptDir, "../../skills/growth/seo-growth-workspace"),
);

const requiredFiles = [
  "SKILL.md",
  "references/hub-mode.md",
  "references/migrate-uninstall.md",
  "references/phase-architecture.md",
  "references/operating-loop.md",
  "references/business-context.md",
  "references/admin-preflight.md",
  "references/adapters.md",
  "references/technical-seo.md",
  "references/search-console.md",
  "references/content-ops.md",
  "references/content-engine-webhooks.md",
  "references/pseo-gates.md",
  "references/ticket-architecture.md",
  "references/internal-linking.md",
  "references/schema-rich-results.md",
  "references/content-refresh.md",
  "references/conversion-cta.md",
  "references/local-seo-gbp.md",
  "references/backlinks-entity.md",
  "references/monthly-reporting.md",
  "references/ai-search-visibility.md",
  "references/data-tools.md",
  "references/international-seo.md",
  "references/competitor-profiling.md",
  "references/scheduled-operation.md",
  "references/portfolio-registry.md",
  "templates/taxonomy.md",
  "templates/local-seo-gbp.md",
  "templates/backlink-gap.md",
  "templates/content-plan.md",
  "templates/pseo-plan.md",
  "templates/gsc-opportunity.md",
  "templates/monthly-report.md",
  "templates/admin-setup.md",
  "templates/portfolio-index.md",
  "scripts/workspace-state.mjs",
  "scripts/seo-doctor.mjs",
  "scripts/bootstrap-seo-workspace.mjs",
  "scripts/gsc-oauth.mjs",
  "scripts/gsc-fetch.mjs",
  "scripts/gsc-opportunities.mjs",
  "scripts/monthly-report.mjs",
  "scripts/portfolio-status.mjs",
];

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function section(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf-8",
    ...options,
  });

  if (result.error) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed to spawn: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

function runScript(relativeScript, scriptArgs) {
  return run(process.execPath, [
    path.join(skillRoot, relativeScript),
    ...scriptArgs,
  ]);
}

function fixture(name) {
  return path.join(fixturesDir, name);
}

function normalizeTimestamps(text) {
  return text.replace(/^Generated: .*$/m, "Generated: <timestamp>");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function treeDigest(root) {
  const visit = (dir, relative = "") => readdirSync(dir).sort().flatMap((entry) => {
    const absolute = path.join(dir, entry);
    const next = path.join(relative, entry);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink()) return [`${next}:link:${readlinkSync(absolute)}`];
    if (stats.isDirectory()) return [`${next}:dir`, ...visit(absolute, next)];
    return [`${next}:file:${hash(readFileSync(absolute))}`];
  });
  return hash(visit(root).join("\n"));
}

function makePlan(root, { domain = "example.com", decision, site = null, repairFiles = [], extra = [] }) {
  const planDir = mkdtempSync(path.join("/private/tmp", "seo-plan-fixture-"));
  const planPath = path.join(planDir, "plan.json");
  const args = [root, "--domain", domain, "--decision", decision, "--plan-output", planPath, "--format", "json"];
  if (site) args.push("--site", site);
  if (repairFiles.length) args.push("--repair-files", repairFiles.join(","));
  args.push(...extra);
  const result = spawnSync(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), ...args], { encoding: "utf-8" });
  return { planDir, planPath, result, report: JSON.parse(result.stdout || "{}") };
}

function plannedBootstrap(root, { domain = "example.com", action = "create", hub = false, site = null, files = [] }) {
  const planned = makePlan(root, { domain, decision: action, site, repairFiles: files });
  if (planned.result.status !== 0) throw new Error(planned.result.stderr || planned.result.stdout);
  const args = ["--plan", planned.planPath, "--action", action, "--domain", domain];
  if (hub) args.push("--hub");
  if (site) args.push("--site", site);
  if (files.length) args.push("--files", files.join(","));
  args.push(root);
  const output = run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), ...args]);
  rmSync(planned.planDir, { recursive: true, force: true });
  return output;
}

// --- File inventory ---
section("file inventory", () => {
  for (const file of requiredFiles) {
    check(existsSync(path.join(skillRoot, file)), `Missing ${file}`);
  }
});

// --- SKILL.md routes every reference ---
section("SKILL.md routing", () => {
  const skill = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
  for (const file of requiredFiles.filter((f) => f.startsWith("references/"))) {
    check(skill.includes(file), `SKILL.md does not reference ${file}`);
  }
});

// --- SKILL.md version matches the bootstrap script's stamp constant ---
section("version consistency", () => {
  const skill = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
  const skillVersion = skill.match(/^version:\s*(\S+)/m)?.[1];
  const bootstrap = readFileSync(
    path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"),
    "utf-8",
  );
  const stampVersion = bootstrap.match(/SKILL_VERSION = "([^"]+)"/)?.[1];
  check(
    skillVersion !== undefined && skillVersion === stampVersion,
    `SKILL.md version (${skillVersion}) must match bootstrap SKILL_VERSION (${stampVersion})`,
  );
});

// --- bootstrap-seo-workspace.mjs ---
section("bootstrap smoke test", () => {
  const bootstrapRoot = mkdtempSync(path.join(tmpdir(), "seo-skill-"));
  try {
    plannedBootstrap(bootstrapRoot, { domain: "standalone.example" });
    for (const file of [
      ".seo/taxonomy.md",
      ".seo/log.md",
      ".seo/context.md",
      ".seo/backlog.md",
    ]) {
      check(
        existsSync(path.join(bootstrapRoot, file)),
        `Bootstrap did not create ${file}`,
      );
    }
    const taxonomy = readFileSync(
      path.join(bootstrapRoot, ".seo/taxonomy.md"),
      "utf-8",
    );
    const template = readFileSync(
      path.join(skillRoot, "templates/taxonomy.md"),
      "utf-8",
    );
    check(
      taxonomy === template,
      "Bootstrap taxonomy should be sourced verbatim from templates/taxonomy.md",
    );
    const configPath = path.join(bootstrapRoot, ".seo/config.json");
    check(existsSync(configPath), "Bootstrap did not stamp .seo/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    check(
      config.mode === "standalone",
      "Default bootstrap must stamp config.json with mode standalone",
    );
    check(
      config.workspaceSchemaVersion === 1,
      "Bootstrap must stamp config.json with workspaceSchemaVersion 1",
    );
  } finally {
    rmSync(bootstrapRoot, { recursive: true, force: true });
  }
});

// --- bootstrap-seo-workspace.mjs: hub mode ---
section("hub bootstrap", () => {
  const hubRoot = mkdtempSync(path.join(tmpdir(), "seo-hub-"));
  try {
    // --site without a hub must fail before creating anything.
    const orphanSite = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"),
        "--site",
        "example-com",
        hubRoot,
      ],
      { encoding: "utf-8" },
    );
    check(
      orphanSite.status !== 0,
      "--site without an existing hub (or --hub) must exit non-zero",
    );

    // Malformed slugs (leading/trailing hyphen) must be rejected.
    const badSlug = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"),
        "--hub",
        "--site",
        "-bad-slug-",
        hubRoot,
      ],
      { encoding: "utf-8" },
    );
    check(badSlug.status !== 0, "A slug with leading/trailing hyphens must exit non-zero");

    const siteOutput = plannedBootstrap(hubRoot, {
      domain: "example.com",
      hub: true,
      site: "example-com",
    });
    check(
      siteOutput.includes("REGISTRATION PENDING"),
      "--site must print a REGISTRATION PENDING line for the registry row",
    );
    const config = JSON.parse(
      readFileSync(path.join(hubRoot, ".seo/config.json"), "utf-8"),
    );
    check(config.mode === "hub", "Hub bootstrap must stamp config.json with mode hub");
    check(
      existsSync(path.join(hubRoot, ".seo/registry.md")),
      "Hub bootstrap did not seed .seo/registry.md",
    );
    for (const file of [
      ".seo/sites/example-com/backlog.md",
      ".seo/sites/example-com/log.md",
      ".seo/sites/example-com/taxonomy.md",
    ]) {
      check(existsSync(path.join(hubRoot, file)), `Hub bootstrap did not create ${file}`);
    }
    check(
      !existsSync(path.join(hubRoot, ".seo/backlog.md")),
      "Hub root must not receive standalone workspace files",
    );

    // Rerunning plain bootstrap against a hub root must refuse (no silent conversion).
    const plainOnHub = spawnSync(
      process.execPath,
      [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), hubRoot],
      { encoding: "utf-8" },
    );
    check(
      plainOnHub.status !== 0,
      "Plain bootstrap on a hub root must exit non-zero (no silent conversion)",
    );
  } finally {
    rmSync(hubRoot, { recursive: true, force: true });
  }
});

// --- bootstrap-seo-workspace.mjs: legacy-adoption guard ---
section("legacy adoption guard", () => {
  const legacyRoot = mkdtempSync(path.join(tmpdir(), "seo-legacy-guard-"));
  try {
    // A .seo/ holding only one random file is NOT a legacy workspace: abort, never adopt.
    mkdirSync(path.join(legacyRoot, ".seo"), { recursive: true });
    writeFileSync(path.join(legacyRoot, ".seo/random.txt"), "not an SEO workspace\n");
    const result = spawnSync(
      process.execPath,
      [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), legacyRoot],
      { encoding: "utf-8" },
    );
    check(
      result.status !== 0,
      "Bootstrap must abort on a .seo/ without config.json or the legacy signature",
    );
    check(
      (result.stderr ?? "").includes("--plan"),
      "Direct bootstrap must route the operator to a reviewed plan",
    );
    check(
      !existsSync(path.join(legacyRoot, ".seo/config.json")),
      "An aborted bootstrap must not stamp config.json",
    );

    // Filenames with nonsense headings remain unrecognized.
    for (const file of ["backlog.md", "log.md", "audit.md"]) writeFileSync(path.join(legacyRoot, ".seo", file), `# legacy ${file}\n`);
    const nonsense = makePlan(legacyRoot, { domain: "legacy.example", decision: "adopt" });
    check(nonsense.result.status !== 0 && nonsense.report.target?.classification === "unrecognized", "Three canonical filenames with nonsense content must not be adoptable");
    rmSync(nonsense.planDir, { recursive: true, force: true });

    writeFileSync(path.join(legacyRoot, ".seo/backlog.md"), "# SEO backlog\n\nCurrent focus: none\n\n## Ready\n\n| ID | Ticket |\n| --- | --- |\n");
    writeFileSync(path.join(legacyRoot, ".seo/log.md"), "# SEO operating log\n");
    writeFileSync(path.join(legacyRoot, ".seo/audit.md"), "# SEO audit\n\n## Findings\n");
    const before = Object.fromEntries(["backlog.md", "log.md", "audit.md"].map((file) => [file, readFileSync(path.join(legacyRoot, ".seo", file), "utf-8")]));
    plannedBootstrap(legacyRoot, { domain: "legacy.example", action: "adopt" });
    check(
      JSON.parse(readFileSync(path.join(legacyRoot, ".seo/config.json"), "utf-8")).mode ===
        "standalone",
      "A signed legacy workspace must adopt as standalone",
    );
    check(
      ["backlog.md", "log.md", "audit.md"].every((file) => readFileSync(path.join(legacyRoot, ".seo", file), "utf-8") === before[file]),
      "Legacy adoption must be config-only and preserve all recognized files",
    );
  } finally {
    rmSync(legacyRoot, { recursive: true, force: true });
  }
});

// --- bootstrap-seo-workspace.mjs: sentinel idempotence (standalone + hub + site) ---
section("sentinel idempotence", () => {
  const sentinel = "SENTINEL: operator content — bootstrap must never touch this.\n";
  const bootstrap = path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs");

  const standaloneRoot = mkdtempSync(path.join(tmpdir(), "seo-sentinel-standalone-"));
  const hubRoot = mkdtempSync(path.join(tmpdir(), "seo-sentinel-hub-"));
  try {
    plannedBootstrap(standaloneRoot, { domain: "sentinel.example" });
    writeFileSync(path.join(standaloneRoot, ".seo/backlog.md"), sentinel);
    const configBefore = readFileSync(path.join(standaloneRoot, ".seo/config.json"), "utf-8");
    rmSync(path.join(standaloneRoot, ".seo/context.md"));
    plannedBootstrap(standaloneRoot, { domain: "sentinel.example", action: "repair", files: ["context.md"] });
    check(
      readFileSync(path.join(standaloneRoot, ".seo/backlog.md"), "utf-8") === sentinel,
      "Standalone rerun must preserve preseeded scaffold content byte-for-byte",
    );
    check(
      readFileSync(path.join(standaloneRoot, ".seo/config.json"), "utf-8") === configBefore,
      "Bootstrap must never rewrite an existing config.json",
    );

    plannedBootstrap(hubRoot, { domain: "sentinel.example", hub: true, site: "sentinel-site" });
    appendFileSync(path.join(hubRoot, ".seo/registry.md"), "| sentinel.example | sites/sentinel-site | unknown | unknown | unknown | unknown | fixture |\n");
    writeFileSync(path.join(hubRoot, ".seo/sites/sentinel-site/context.md"), sentinel);
    const registryBefore = readFileSync(path.join(hubRoot, ".seo/registry.md"), "utf-8");
    rmSync(path.join(hubRoot, ".seo/sites/sentinel-site/audit.md"));
    plannedBootstrap(hubRoot, { domain: "sentinel.example", action: "repair", site: "sentinel-site", files: ["audit.md"] });
    check(
      readFileSync(path.join(hubRoot, ".seo/registry.md"), "utf-8") === registryBefore,
      "Hub rerun must preserve a preseeded registry.md byte-for-byte",
    );
    check(
      readFileSync(path.join(hubRoot, ".seo/sites/sentinel-site/context.md"), "utf-8") ===
        sentinel,
      "Site rerun must preserve preseeded site scaffold content byte-for-byte",
    );
  } finally {
    rmSync(standaloneRoot, { recursive: true, force: true });
    rmSync(hubRoot, { recursive: true, force: true });
  }
});

// --- seo-doctor.mjs: read-only preflight scenarios ---
section("doctor clean root", () => {
  const container = mkdtempSync(path.join(tmpdir(), "seo-doctor-clean-"));
  try {
    const target = path.join(container, "site-repo");
    plannedBootstrap(target, { domain: "example.com" });
    // Default search roots = target + parent (the container): nothing else there.
    const json = JSON.parse(
      runScript("scripts/seo-doctor.mjs", [target, "--domain", "example.com", "--format", "json"]),
    );
    check(json.clean === true, "Doctor must report a lone standalone workspace as clean");
    check(
      json.target?.classification === "standalone",
      "Doctor must classify a stamped standalone workspace as standalone",
    );
    check(
      (json.candidates ?? []).length === 0,
      "Doctor must find no candidate workspaces for a clean root",
    );
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor decoy workspace", () => {
  const container = mkdtempSync(path.join(tmpdir(), "seo-doctor-decoy-"));
  try {
    const target = path.join(container, "site-repo");
    const hub = path.join(container, "hub");
    const bootstrap = path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs");
    plannedBootstrap(target, { domain: "example.com" });
    // Decoy: a mature hub-managed workspace for the SAME site in a sibling dir,
    // referenced by a registry row.
    plannedBootstrap(hub, { domain: "example.com", hub: true, site: "example-com" });
    writeFileSync(
      path.join(hub, ".seo/sites/example-com/log.md"),
      "# SEO operating log\n\n## 2026-01-01 - Mature handoff\n\n- Mode: operate.\n",
    );
    appendFileSync(
      path.join(hub, ".seo/registry.md"),
      "| example.com | sites/example-com | sc-domain:example.com | none yet | UK / en-GB | human approves | decoy |\n",
    );
    const result = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/seo-doctor.mjs"),
        target,
        "--domain",
        "example.com",
        "--format",
        "json",
      ],
      { encoding: "utf-8" },
    );
    check(
      result.status === 1,
      "Doctor must exit 1 when another workspace for the same site exists",
    );
    const json = JSON.parse(result.stdout || "{}");
    check(
      (json.candidates ?? []).some((candidate) => candidate.registryKind === "canonical"),
      "Doctor must flag the registry-referenced decoy workspace as a candidate",
    );
    check(
      (json.findings ?? []).some((finding) => finding.code === "candidate_workspace"),
      "Doctor findings must name the candidate workspace",
    );
    const absentTarget = path.join(container, "new-site-repo");
    mkdirSync(absentTarget);
    const blockedPlan = makePlan(absentTarget, { domain: "example.com", decision: "create" });
    check(blockedPlan.result.status === 1 && blockedPlan.report.plan?.approved === false && blockedPlan.report.plan?.terminal === false, "A canonical-registry collision must make a create plan unapproved");
    check(!existsSync(path.join(absentTarget, ".seo")), "Ambiguous discovery must remain read-only");
    rmSync(blockedPlan.planDir, { recursive: true, force: true });
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor dangling symlink", () => {
  const container = mkdtempSync(path.join(tmpdir(), "seo-doctor-symlink-"));
  try {
    const target = path.join(container, "site-repo");
    plannedBootstrap(target, { domain: "example.com" });
    mkdirSync(path.join(target, ".agents/skills"), { recursive: true });
    symlinkSync(
      path.join(target, "no-such-skill-dir"),
      path.join(target, ".agents/skills/seo-growth-workspace"),
    );
    const result = spawnSync(
      process.execPath,
      [path.join(skillRoot, "scripts/seo-doctor.mjs"), target, "--format", "json"],
      { encoding: "utf-8" },
    );
    check(result.status === 1, "Doctor must exit 1 on a dangling symlink skill copy");
    const json = JSON.parse(result.stdout || "{}");
    const install = (json.installs ?? []).find(
      (entry) => entry.surface === ".agents/skills/seo-growth-workspace",
    );
    check(
      install?.symlink === true && install?.targetExists === false,
      "Doctor must report the dangling symlink install copy (symlink: true, targetExists: false)",
    );
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor unregistered hub site", () => {
  const container = mkdtempSync(path.join(tmpdir(), "seo-doctor-unregistered-"));
  try {
    const hub = path.join(container, "hub");
    plannedBootstrap(hub, { domain: "orphan.example", hub: true, site: "orphan-site" });
    // The registry row was never added (bootstrap only prints REGISTRATION PENDING).
    const result = spawnSync(
      process.execPath,
      [path.join(skillRoot, "scripts/seo-doctor.mjs"), hub, "--format", "json"],
      { encoding: "utf-8" },
    );
    check(result.status === 1, "Doctor must exit 1 on an unregistered hub site folder");
    const json = JSON.parse(result.stdout || "{}");
    check(
      (json.findings ?? []).some((finding) => finding.code === "unregistered_hub_site"),
      "Doctor must flag hub site folders absent from the registry",
    );
    check(
      (json.findings ?? []).some((finding) => finding.message.includes("orphan-site")),
      "The unregistered-site finding must name the site",
    );
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor plan and bootstrap action contract", () => {
  const root = mkdtempSync(path.join(tmpdir(), "seo-plan-contract-"));
  const mismatchRoot = mkdtempSync(path.join(tmpdir(), "seo-plan-mismatch-"));
  const expiryRoot = mkdtempSync(path.join(tmpdir(), "seo-plan-expiry-"));
  const migrationRoot = mkdtempSync(path.join(tmpdir(), "seo-plan-migrate-"));
  const changedRoot = mkdtempSync(path.join(tmpdir(), "seo-plan-changed-"));
  try {
    const beforeDoctor = treeDigest(root);
    const planned = makePlan(root, { domain: "plan.example", decision: "create" });
    check(planned.result.status === 0 && planned.report.plan?.approved === true, "Doctor must emit an approved create plan for an absent unambiguous target");
    check(treeDigest(root) === beforeDoctor, "Doctor plan generation must not write inside any scanned root");
    const plan = JSON.parse(readFileSync(planned.planPath, "utf-8"));
    check(plan.hash?.length === 64 && plan.sourcesHash?.length === 64 && Date.parse(plan.expiresAt) > Date.now(), "Plan must bind SHA-256 source state and a future expiry");
    const copiedPlan = path.join(planned.planDir, "copied-plan.json");
    writeFileSync(copiedPlan, readFileSync(planned.planPath));
    const copied = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", copiedPlan, "--action", "verify", "--domain", "plan.example", root], { encoding: "utf-8" });
    check(copied.status !== 0 && (copied.stderr ?? "").includes("output-path mismatch"), "Copying a valid plan to another path must not enable replay");

    const beforeVerify = treeDigest(root);
    const verify = run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", planned.planPath, "--action", "verify", "--domain", "plan.example", root]);
    check(verify.includes("zero writes") && treeDigest(root) === beforeVerify && existsSync(planned.planPath), "Verify must perform zero writes and leave the plan available for its reviewed mutation");

    run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", planned.planPath, "--action", "create", "--domain", "plan.example", root]);
    check(existsSync(path.join(root, ".seo/config.json")) && !existsSync(planned.planPath), "Create must scaffold once and atomically consume its plan");
    const replay = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", planned.planPath, "--action", "create", "--domain", "plan.example", root], { encoding: "utf-8" });
    check(replay.status !== 0, "A consumed plan must not replay");
    rmSync(planned.planDir, { recursive: true, force: true });

    const mismatch = makePlan(mismatchRoot, { domain: "right.example", decision: "create" });
    const wrongDomain = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", mismatch.planPath, "--action", "create", "--domain", "wrong.example", mismatchRoot], { encoding: "utf-8" });
    check(wrongDomain.status !== 0 && !existsSync(path.join(mismatchRoot, ".seo")), "Domain mismatch must fail before any workspace write");
    rmSync(mismatch.planDir, { recursive: true, force: true });

    const expiring = makePlan(expiryRoot, { domain: "expired.example", decision: "create" });
    const expiredPlan = JSON.parse(readFileSync(expiring.planPath, "utf-8"));
    expiredPlan.expiresAt = "2000-01-01T00:00:00.000Z";
    const { hash: _oldHash, ...expiredPayload } = expiredPlan;
    expiredPlan.hash = hash(stableJson(expiredPayload));
    writeFileSync(expiring.planPath, `${JSON.stringify(expiredPlan, null, 2)}\n`);
    const expired = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", expiring.planPath, "--action", "create", "--domain", "expired.example", expiryRoot], { encoding: "utf-8" });
    check(expired.status !== 0 && (expired.stderr ?? "").includes("expired") && !existsSync(path.join(expiryRoot, ".seo")), "Expired plans must fail before any workspace write");
    rmSync(expiring.planDir, { recursive: true, force: true });

    const changing = makePlan(changedRoot, { domain: "changed.example", decision: "create" });
    mkdirSync(path.join(changedRoot, ".seo"));
    writeFileSync(path.join(changedRoot, ".seo/unreviewed.txt"), "changed after review\n");
    const changed = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", changing.planPath, "--action", "create", "--domain", "changed.example", changedRoot], { encoding: "utf-8" });
    check(changed.status !== 0 && (changed.stderr ?? "").includes("source changed") && !existsSync(path.join(changedRoot, ".seo/config.json")), "Any bound source change must fail before mutation");
    rmSync(changing.planDir, { recursive: true, force: true });

    const insidePlan = path.join(expiryRoot, "plan.json");
    const inside = spawnSync(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), expiryRoot, "--domain", "inside.example", "--decision", "create", "--plan-output", insidePlan], { encoding: "utf-8" });
    check(inside.status === 2 && !existsSync(insidePlan), "Doctor must refuse a plan output inside any scanned root");

    const migration = makePlan(migrationRoot, { domain: "migrate.example", decision: "migrate" });
    check(migration.result.status === 0 && migration.report.plan?.terminal === true, "Doctor migrate decisions must be terminal evidence plans");
    const migrateBootstrap = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", migration.planPath, "--action", "verify", "--domain", "migrate.example", migrationRoot], { encoding: "utf-8" });
    check(migrateBootstrap.status !== 0 && (migrateBootstrap.stderr ?? "").includes("manual in v3.1"), "Bootstrap must refuse terminal migrate plans");
    rmSync(migration.planDir, { recursive: true, force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(mismatchRoot, { recursive: true, force: true });
    rmSync(expiryRoot, { recursive: true, force: true });
    rmSync(migrationRoot, { recursive: true, force: true });
    rmSync(changedRoot, { recursive: true, force: true });
  }
});

section("doctor schema and filesystem safety", () => {
  const schemaRoot = mkdtempSync(path.join(tmpdir(), "seo-schema-ahead-"));
  const symlinkRoot = mkdtempSync(path.join(tmpdir(), "seo-symlink-escape-"));
  const outside = mkdtempSync(path.join(tmpdir(), "seo-symlink-outside-"));
  try {
    plannedBootstrap(schemaRoot, { domain: "schema.example" });
    const configPath = path.join(schemaRoot, ".seo/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    writeFileSync(configPath, `${JSON.stringify({ ...config, workspaceSchemaVersion: 2 }, null, 2)}\n`);
    const schema = spawnSync(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), schemaRoot, "--domain", "schema.example", "--format", "json"], { encoding: "utf-8" });
    const schemaJson = JSON.parse(schema.stdout || "{}");
    check(schema.status === 1 && schemaJson.findings?.some((finding) => finding.code === "unsupported_schema"), "Schema 2/ahead state must be blocking in v3.1");

    plannedBootstrap(symlinkRoot, { domain: "symlink.example" });
    rmSync(path.join(symlinkRoot, ".seo/context.md"));
    symlinkSync(path.join(outside, "context.md"), path.join(symlinkRoot, ".seo/context.md"));
    const symlink = spawnSync(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), symlinkRoot, "--domain", "symlink.example", "--format", "json"], { encoding: "utf-8" });
    const symlinkJson = JSON.parse(symlink.stdout || "{}");
    check(symlink.status === 1 && symlinkJson.findings?.some((finding) => finding.code === "generated_symlink_escape"), "Generated-file symlink escapes/dangling targets must block mutation");
  } finally {
    rmSync(schemaRoot, { recursive: true, force: true });
    rmSync(symlinkRoot, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

section("site ID grammar and exact legacy grandfathering", () => {
  const root = mkdtempSync(path.join(tmpdir(), "seo-site-id-"));
  try {
    plannedBootstrap(root, { domain: "valid.example", hub: true, site: "valid-site" });
    appendFileSync(path.join(root, ".seo/registry.md"), "| valid.example | sites/valid-site | unknown | unknown | unknown | unknown | fixture |\n");
    const legacyDir = path.join(root, ".seo/sites/Legacy_Site");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(path.join(legacyDir, "backlog.md"), "# SEO backlog\n\nCurrent focus: none\n\n## Ready\n\n| ID | Ticket |\n| --- | --- |\n");
    writeFileSync(path.join(legacyDir, "log.md"), "# SEO operating log\n");
    writeFileSync(path.join(legacyDir, "audit.md"), "# SEO audit\n\n## Findings\n");
    appendFileSync(path.join(root, ".seo/registry.md"), "| legacy-id.example | sites/Legacy_Site | unknown | unknown | unknown | unknown | grandfathered |\n");
    const repair = makePlan(root, { domain: "legacy-id.example", decision: "repair", site: "Legacy_Site", repairFiles: ["context.md"] });
    check(repair.result.status === 0 && repair.report.legacySiteId === "Legacy_Site", "An exact existing registry/path ID outside the grammar must be grandfathered");
    run(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", repair.planPath, "--action", "repair", "--domain", "legacy-id.example", "--site", "Legacy_Site", "--files", "context.md", root]);
    check(existsSync(path.join(legacyDir, "context.md")), "A grandfathered exact legacy ID may repair its existing workspace");
    rmSync(repair.planDir, { recursive: true, force: true });

    const create = makePlan(root, { domain: "new.example", decision: "create", site: "New_Invalid" });
    const rejected = spawnSync(process.execPath, [path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"), "--plan", create.planPath, "--action", "create", "--domain", "new.example", "--site", "New_Invalid", root], { encoding: "utf-8" });
    check(rejected.status !== 0 && !existsSync(path.join(root, ".seo/sites/New_Invalid")), "A new site ID outside the 1-64 slug grammar must fail before writes");
    rmSync(create.planDir, { recursive: true, force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

section("doctor registry, permission, lock, and non-disclosure findings", () => {
  const container = mkdtempSync(path.join(tmpdir(), "seo-doctor-integrity-"));
  try {
    const hub = path.join(container, "hub");
    const credential = path.join(container, "credential.env");
    const marker = "CREDENTIAL_VALUE_MUST_NOT_APPEAR";
    writeFileSync(credential, marker);
    chmodSync(credential, 0o644);
    plannedBootstrap(hub, { domain: "integrity.example", hub: true, site: "integrity-site" });
    appendFileSync(path.join(hub, ".seo/registry.md"), [
      `| integrity.example | sites/integrity-site | unknown | dir:${credential} | unknown | unknown | fixture |`,
      `| integrity.example | sites/integrity-site | unknown | ${marker} | unknown | unknown | duplicate |`,
      "| malformed | too-few |",
      "",
    ].join("\n"));
    mkdirSync(path.join(hub, ".agents/skills"), { recursive: true });
    symlinkSync(skillRoot, path.join(hub, ".agents/skills/seo-growth-workspace"));
    writeFileSync(path.join(hub, "skills-lock.json"), JSON.stringify({ version: 1, skills: { "seo-growth-workspace": { source: "fixture", sourceType: "github", skillPath: "skills/growth/seo-growth-workspace/SKILL.md", computedHash: "0".repeat(64) } } }));
    const result = spawnSync(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), hub, "--domain", "integrity.example", "--format", "json"], { encoding: "utf-8" });
    const json = JSON.parse(result.stdout || "{}");
    const codes = new Set((json.findings ?? []).map((finding) => finding.code));
    check(result.status === 1 && codes.has("credential_permissions") && codes.has("skills_lock_drift"), "Doctor must report stat-only credential permission and skills-lock drift");
    check(codes.has("duplicate_registry_site") && codes.has("duplicate_registry_root") && codes.has("malformed_registry"), "Doctor must distinguish duplicate-site, duplicate-root, and malformed registry rows");
    check(!result.stdout.includes(marker) && !result.stderr.includes(marker), "Credential content marker must never enter doctor output");
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

section("doctor active-path drift", () => {
  const root = mkdtempSync(path.join(tmpdir(), "seo-active-drift-"));
  try {
    writeFileSync(path.join(root, "README.md"), "SEO state lives in .seo/backlog.md\n");
    const result = spawnSync(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), root, "--format", "json"], { encoding: "utf-8" });
    const json = JSON.parse(result.stdout || "{}");
    check(result.status === 1 && json.findings?.some((finding) => finding.code === "active_path_drift"), "Stale active workspace pointers must be reported");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

section("command inventory and foreign-CWD matrix", () => {
  const result = JSON.parse(run(process.execPath, [path.join(scriptDir, "command-inventory.mjs"), "--verify"]));
  check(result.counts?.malformed === 0, "Mechanical command inventory must have zero malformed/secret-argv entries");
  check(result.verification?.pass === true && result.verification.matrix.every((row) => row.status === 0), "Every executable command must pass the generated foreign-CWD matrix");
  check(result.verification?.contractCases.every((item) => item.actual === item.expected), "Command classifier must reject secret argv while allowing env/file-backed auth");
  check(result.counts?.executable > 0 && result.counts?.illustrative > 0, "Inventory must classify executable and illustrative commands rather than hand-maintain one class");
});

section("eight-row legacy / six-row hub rehearsal", () => {
  const container = mkdtempSync(path.join(tmpdir(), "seo-registry-rehearsal-"));
  try {
    const hub = path.join(container, "hub");
    const canonicalRows = [];
    for (let index = 1; index <= 6; index += 1) {
      const id = `site-${index}`;
      const domain = `${id}.example`;
      plannedBootstrap(hub, { domain, hub: index === 1, site: id });
      const row = `| ${domain} | sites/${id} | sc-domain:${domain} | unknown | UK / en | human | fixture |`;
      appendFileSync(path.join(hub, ".seo/registry.md"), `${row}\n`);
      canonicalRows.push({ id, domain });
    }
    const legacyA = path.join(container, "legacy-extra-a");
    const legacyB = path.join(container, "legacy-extra-b");
    plannedBootstrap(legacyA, { domain: "extra-a.example" });
    plannedBootstrap(legacyB, { domain: "extra-b.example" });
    mkdirSync(path.join(hub, ".agents/seo"), { recursive: true });
    const legacyRows = [
      ...canonicalRows.map(({ domain }, index) => `| ${domain} | ${path.join(container, `retired-${index + 1}`)} | unknown | unknown | UK / en | human | retired source |`),
      `| extra-a.example | ${legacyA} | unknown | unknown | UK / en | human | legacy-only |`,
      `| extra-b.example | ${legacyB} | unknown | unknown | UK / en | human | legacy-only |`,
    ];
    writeFileSync(path.join(hub, ".agents/seo/REGISTRY.md"), ["# Legacy registry", "", "| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |", "|---|---|---|---|---|---|---|", ...legacyRows, ""].join("\n"));
    const result = spawnSync(process.execPath, [path.join(skillRoot, "scripts/seo-doctor.mjs"), hub, "--format", "json"], { encoding: "utf-8" });
    const json = JSON.parse(result.stdout || "{}");
    const codes = (json.findings ?? []).map((finding) => finding.code);
    check(json.registryInventory?.filter((row) => row.registryKind === "canonical").length === 6, "Hub rehearsal must retain all six canonical routing rows");
    check(json.registryInventory?.filter((row) => row.registryKind === "legacy").length === 8, "Legacy rehearsal must retain all eight inventory rows");
    check(codes.filter((code) => code === "stale_registry_row").length === 6 && codes.filter((code) => code === "unmigrated_legacy_site").length === 2, "Missing retired roots must be stale rows while two legacy-only sites remain visible");
    check(!codes.includes("candidate_workspace"), "Stale legacy rows must not become false candidate workspaces");
    check(new Set(json.registries.map((registry) => registry.path)).size === json.registries.length, "Registry discovery must deduplicate paths by realpath");
  } finally {
    rmSync(container, { recursive: true, force: true });
  }
});

// --- gsc-opportunities.mjs: report format + golden file ---
section("gsc-opportunities report", () => {
  const report = runScript("scripts/gsc-opportunities.mjs", [
    "--input",
    fixture("gsc-sample.json"),
    "--brand",
    "examplebrand",
  ]);
  check(report.includes("## Page 2 goldmine"), "Report missing page-2 section");
  check(
    report.includes("## CTR underperformers (position-banded)"),
    "Report missing banded CTR section",
  );
  check(
    report.includes("## Query cannibalization"),
    "Report missing cannibalization section",
  );
  check(
    report.includes("seo automation"),
    "Report missing expected page-2 query",
  );
  check(report.includes("content seo"), "Report missing expected CTR query");
  check(
    report.includes("Branded queries excluded from CTR analysis: 1"),
    "Report should count excluded branded queries",
  );
  check(
    !report.includes("examplebrand pricing"),
    "Branded query should be excluded from CTR analysis",
  );
  check(
    report.includes("seo reporting \\| dashboards"),
    "Pipe characters in queries must be escaped in table cells",
  );
  check(
    report.includes("keyword tracker"),
    "Report missing expected cannibalization query",
  );

  const expected = readFileSync(
    fixture("gsc-opportunities.expected.md"),
    "utf-8",
  );
  check(
    normalizeTimestamps(report) === expected,
    "gsc-opportunities report drifted from fixtures/gsc-opportunities.expected.md (regenerate deliberately if the change is intended)",
  );
});

// --- gsc-opportunities.mjs: backlog format ---
section("gsc-opportunities backlog", () => {
  const backlog = runScript("scripts/gsc-opportunities.mjs", [
    "--input",
    fixture("gsc-sample.json"),
    "--format",
    "backlog",
    "--start-id",
    "40",
    "--brand",
    "examplebrand",
  ]);
  check(
    backlog.includes("| ID | P | Area | Ticket | Verify |"),
    "Backlog format missing Ready-row table header",
  );
  check(backlog.includes("SEO-040"), "Backlog format should honor --start-id");
  check(
    backlog.includes("seo reporting \\| dashboards"),
    "Backlog format must escape pipe characters in queries",
  );
  check(
    backlog.includes("draft backlog"),
    "Backlog format should be framed as a review draft",
  );
});

// --- gsc-opportunities.mjs: malformed JSON names the file ---
section("malformed JSON error", () => {
  const badJson = path.join(mkdtempSync(path.join(tmpdir(), "seo-bad-")), "bad.json");
  try {
    writeFileSync(badJson, "{ not json");
    const result = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/gsc-opportunities.mjs"),
        "--input",
        badJson,
      ],
      { encoding: "utf-8" },
    );
    check(result.status !== 0, "Malformed JSON input should exit non-zero");
    check(
      (result.stderr ?? "").includes("bad.json"),
      "JSON parse errors must name the offending file",
    );
  } finally {
    rmSync(path.dirname(badJson), { recursive: true, force: true });
  }
});

// --- gsc-fetch.mjs / gsc-oauth.mjs help contracts ---
section("gsc-fetch help", () => {
  const help = runScript("scripts/gsc-fetch.mjs", ["--help"]);
  check(
    help.includes("GSC_ACCESS_TOKEN"),
    "GSC fetch help should document token auth",
  );
  check(
    help.includes("--max-rows"),
    "GSC fetch help should document pagination cap",
  );
});

section("gsc-oauth help and auth URL", () => {
  const help = runScript("scripts/gsc-oauth.mjs", ["--help"]);
  check(
    help.includes("--print-auth-url"),
    "GSC OAuth help should document auth URL generation",
  );
  check(
    !help.includes("--client-secret"),
    "GSC OAuth must not advertise a --client-secret flag (env var only)",
  );
  check(
    help.includes("GSC_CLIENT_SECRET"),
    "GSC OAuth help should require the GSC_CLIENT_SECRET env var",
  );

  const authUrl = runScript("scripts/gsc-oauth.mjs", [
    "--client-id",
    "demo-client-id",
    "--print-auth-url",
  ]);
  check(
    authUrl.includes("webmasters.readonly"),
    "GSC OAuth URL should request read-only Search Console scope",
  );
});

// --- monthly-report.mjs ---
section("monthly report", () => {
  const report = runScript("scripts/monthly-report.mjs", [
    "--target",
    "Demo SaaS",
    "--date-range",
    "2026-04-01 to 2026-04-30",
    "--comparison-range",
    "2026-03-01 to 2026-03-31",
    "--gsc-current",
    fixture("gsc-sample.json"),
    "--gsc-previous",
    fixture("gsc-previous-sample.json"),
    "--backlog",
    fixture("backlog-sample.md"),
    "--keyword-tiers",
    fixture("monthly-keyword-tiers-sample.json"),
    "--calendar",
    fixture("monthly-calendar-sample.json"),
  ]);
  check(
    report.includes("## Query/page movers"),
    "Monthly report missing movers section",
  );
  check(
    report.includes("Keyword tiers"),
    "Monthly report missing keyword tier metric",
  );
  check(
    report.includes("Content calendar"),
    "Monthly report missing content calendar metric",
  );
  check(
    report.includes("Single next action"),
    "Monthly report missing next action",
  );
  check(
    report.includes("legacy feature guide") && report.includes("| lost |"),
    "Movers table must surface disappeared queries",
  );
  check(
    report.includes("1 Done this period"),
    "Backlog Done count should be filtered to the reporting period",
  );
  check(
    report.includes("seo reporting \\| dashboards"),
    "Monthly report must escape pipe characters in table cells",
  );
  check(
    /GSC CTR \|[^|]+\|[^|]+\| [+-]\d/.test(report),
    "CTR delta should carry a +/- sign",
  );
});

// --- monthly-report.mjs: branded-query exclusion + --allow-missing-gsc ---
section("monthly report branded query", () => {
  const args = [
    "--target",
    "Branded SaaS",
    "--date-range",
    "2026-04-01 to 2026-04-30",
    "--comparison-range",
    "2026-03-01 to 2026-03-31",
    "--gsc-current",
    fixture("gsc-branded-sample.json"),
    "--gsc-previous",
    fixture("gsc-branded-sample.json"),
    "--backlog",
    fixture("backlog-sample.md"),
  ];

  const withoutBrand = runScript("scripts/monthly-report.mjs", args);
  check(
    withoutBrand.includes("examplebrand pricing has high impressions but low CTR"),
    "Without --brand, the branded low-CTR query should surface as a problem (baseline)",
  );

  const withBrand = runScript("scripts/monthly-report.mjs", [
    ...args,
    "--brand",
    "examplebrand",
  ]);
  const problemsBlock = withBrand.slice(
    withBrand.indexOf("### 3 problems"),
    withBrand.indexOf("### Single next action"),
  );
  check(
    !problemsBlock.includes("examplebrand"),
    "With --brand, the branded query must not appear in problem selection",
  );
  check(
    !withBrand.includes(
      "Rewrite the title/meta for the highest-impression low-CTR query",
    ),
    "With --brand, the Single Next Action must not target the branded low-CTR query",
  );
  check(
    withBrand.includes("| GSC impressions | 5500 |"),
    "Branded rows must still count toward topline impressions totals",
  );
});

section("monthly report allow-missing-gsc", () => {
  const partial = runScript("scripts/monthly-report.mjs", [
    "--target",
    "Cold Start",
    "--date-range",
    "2026-04-01 to 2026-04-30",
    "--comparison-range",
    "2026-03-01 to 2026-03-31",
    "--allow-missing-gsc",
  ]);
  check(
    partial.includes("partial — GSC exports unavailable"),
    "--allow-missing-gsc must mark the report partial",
  );

  const missing = spawnSync(
    process.execPath,
    [
      path.join(skillRoot, "scripts/monthly-report.mjs"),
      "--target",
      "Cold Start",
      "--date-range",
      "2026-04-01 to 2026-04-30",
      "--comparison-range",
      "2026-03-01 to 2026-03-31",
    ],
    { encoding: "utf-8" },
  );
  check(
    missing.status !== 0,
    "Without --allow-missing-gsc, missing GSC exports must exit non-zero",
  );
});

// --- gsc-fetch.mjs: --credentials-dir parsing ---
section("gsc-fetch credentials-dir", () => {
  const credsDir = mkdtempSync(path.join(tmpdir(), "seo-creds-"));
  try {
    writeFileSync(
      path.join(credsDir, "client_secret.json"),
      JSON.stringify({
        installed: { client_id: "dummy.apps.googleusercontent.com", client_secret: "dummy" },
      }),
    );
    writeFileSync(
      path.join(credsDir, "token.json"),
      JSON.stringify({ refresh_token: "dummy-refresh-token", type: "authorized_user" }),
    );
    const parsed = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/gsc-fetch.mjs"),
        "--credentials-dir",
        credsDir,
        "--site",
        "sc-domain:example.com",
        "--start",
        "2026-01-01",
        "--end",
        "2026-03-31",
      ],
      { encoding: "utf-8" },
    );
    // Dummy creds parse, then the token exchange is attempted and rejected by Google —
    // proving the credentials-dir shape reached the API stage without a shape error.
    check(
      (parsed.stderr ?? "").includes("GSC OAuth refresh failed"),
      "--credentials-dir should parse {client_secret.json, token.json} and reach the token exchange",
    );

    const badDir = mkdtempSync(path.join(tmpdir(), "seo-creds-bad-"));
    writeFileSync(
      path.join(badDir, "client_secret.json"),
      JSON.stringify({ installed: { client_id: "x", client_secret: "y" } }),
    );
    writeFileSync(path.join(badDir, "token.json"), JSON.stringify({ no_token: true }));
    const badResult = spawnSync(
      process.execPath,
      [
        path.join(skillRoot, "scripts/gsc-fetch.mjs"),
        "--credentials-dir",
        badDir,
        "--site",
        "sc-domain:example.com",
        "--start",
        "2026-01-01",
        "--end",
        "2026-03-31",
      ],
      { encoding: "utf-8" },
    );
    check(
      (badResult.stderr ?? "").includes("token.json (with refresh_token)"),
      "A credentials dir missing token.json.refresh_token should name the requirement",
    );
    rmSync(badDir, { recursive: true, force: true });
  } finally {
    rmSync(credsDir, { recursive: true, force: true });
  }
});

// --- export-clean-skill.mjs (dev sibling) ---
section("clean export", () => {
  const exporter = path.join(scriptDir, "export-clean-skill.mjs");
  const exportTarget = mkdtempSync(path.join(tmpdir(), "seo-export-"));
  try {
    const dryRun = run(process.execPath, [
      exporter,
      "--target",
      exportTarget,
      "--dry-run",
    ]);
    check(
      dryRun.includes('"dryRun": true'),
      "Exporter dry-run should report dryRun true",
    );
    const installedSkill = path.join(
      exportTarget,
      ".agents/skills/seo-growth-workspace",
    );
    check(
      !existsSync(path.join(installedSkill, "SKILL.md")),
      "Exporter dry-run should not install files",
    );

    run(process.execPath, [exporter, "--target", exportTarget]);
    check(
      existsSync(path.join(installedSkill, "SKILL.md")),
      "Clean export did not install SKILL.md",
    );
    check(
      existsSync(path.join(installedSkill, "scripts/gsc-opportunities.mjs")),
      "Clean export should install skill scripts",
    );
    check(
      !existsSync(path.join(installedSkill, "fixtures")),
      "Clean export must not install fixtures",
    );
    check(
      !existsSync(path.join(installedSkill, "scripts/validate-skill.mjs")) &&
        !existsSync(path.join(installedSkill, "scripts/evaluate-release.mjs")),
      "Clean export must not install release/dev tooling",
    );
  } finally {
    rmSync(exportTarget, { recursive: true, force: true });
  }
});

// --- portfolio-status.mjs: registry parse + ranking + escaping ---
section("portfolio status", () => {
  const help = runScript("scripts/portfolio-status.mjs", ["--help"]);
  check(
    help.includes("--registry"),
    "portfolio-status help should document --registry",
  );

  const portfolioRoot = mkdtempSync(path.join(tmpdir(), "seo-portfolio-"));
  try {
    // Stale site: old log date + a P0 Ready ticket whose title contains a pipe.
    const staleSeo = path.join(portfolioRoot, "stale", ".seo");
    const freshSeo = path.join(portfolioRoot, "fresh", ".seo");
    for (const dir of [
      path.join(staleSeo, "reports"),
      path.join(freshSeo, "reports"),
    ]) {
      run("mkdir", ["-p", dir]);
    }

    writeFileSync(
      path.join(staleSeo, "log.md"),
      "# SEO operating log\n\n## 2020-01-01 - Old handoff\n\n- Mode: operate.\n",
    );
    writeFileSync(
      path.join(staleSeo, "backlog.md"),
      [
        "# SEO backlog",
        "",
        "## Ready",
        "",
        "| ID | P | Area | Ticket | Verify |",
        "| --- | --- | --- | --- | --- |",
        "| SEO-001 | P0 | indexability | Fix robots \\| sitemap block | robots.txt 200 |",
        "| SEO-002 | P3 | content | Blog cluster | calendar exists |",
        "",
        "## In progress",
        "",
        "| ID | Started | Notes |",
        "| --- | --- | --- |",
        "",
        "## Blocked",
        "",
        "| ID | Blocker | Since |",
        "| --- | --- | --- |",
        "",
        "## Done",
        "",
        "| ID | Completed | Verify |",
        "| --- | --- | --- |",
        "",
      ].join("\n"),
    );

    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(
      path.join(freshSeo, "log.md"),
      `# SEO operating log\n\n## ${today} - Fresh handoff\n\n- Mode: operate.\n`,
    );
    writeFileSync(
      path.join(freshSeo, "backlog.md"),
      [
        "# SEO backlog",
        "",
        "## Ready",
        "",
        "| ID | P | Area | Ticket | Verify |",
        "| --- | --- | --- | --- | --- |",
        "",
        "## In progress",
        "",
        "| ID | Started | Notes |",
        "| --- | --- | --- |",
        "",
        "## Blocked",
        "",
        "| ID | Blocker | Since |",
        "| --- | --- | --- |",
        "",
        "## Done",
        "",
        "| ID | Completed | Verify |",
        "| --- | --- | --- |",
        "",
      ].join("\n"),
    );

    const registryPath = path.join(portfolioRoot, "registry.md");
    writeFileSync(
      registryPath,
      [
        "# Portfolio Registry",
        "",
        "| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        `| stale.example | \`${path.join(portfolioRoot, "stale")}\` | sc-domain:stale.example | none yet | UK / en-GB | human approves | — |`,
        `| fresh.example | frontend \`${path.join(portfolioRoot, "fresh")}\` (blog in a CMS) | sc-domain:fresh.example | none yet | UK / en-GB | human approves | — |`,
        `| gone.example | ${path.join(portfolioRoot, "missing")} | unknown | unknown | UK / en-GB | unknown | — |`,
        "",
      ].join("\n"),
    );

    const report = runScript("scripts/portfolio-status.mjs", [
      "--registry",
      registryPath,
    ]);

    check(
      report.includes("Fix robots \\| sitemap block"),
      "portfolio-status must escape pipe characters in ticket titles",
    );
    check(
      report.includes("no workspace"),
      "portfolio-status must flag a missing workspace",
    );

    const idxMissing = report.indexOf("gone.example");
    const idxStale = report.indexOf("stale.example");
    const idxFresh = report.indexOf("fresh.example");
    check(
      idxMissing !== -1 && idxStale !== -1 && idxFresh !== -1,
      "portfolio-status must list every registry row",
    );
    check(
      idxMissing < idxStale,
      "Missing workspaces must rank before present ones",
    );
    check(
      idxStale < idxFresh,
      "A stale workspace with an open P0 must rank above a fresh one",
    );

    const json = runScript("scripts/portfolio-status.mjs", [
      "--registry",
      registryPath,
      "--format",
      "json",
    ]);
    const parsed = JSON.parse(json);
    check(
      parsed.sites?.[0]?.site === "gone.example" &&
        parsed.sites?.[0]?.missing === true,
      "portfolio-status json output must rank the missing workspace first",
    );
    check(
      parsed.sites?.[1]?.site === "stale.example" &&
        parsed.sites?.[1]?.openP0P1 === 1,
      "portfolio-status json must report the stale workspace's open P0/P1 count",
    );
  } finally {
    rmSync(portfolioRoot, { recursive: true, force: true });
  }
});

// --- portfolio-status.mjs: hub layout (registry-relative roots + site-folder workspaces) ---
section("portfolio status hub layout", () => {
  const hubRoot = mkdtempSync(path.join(tmpdir(), "seo-hub-status-"));
  const legacyRoot = mkdtempSync(path.join(tmpdir(), "seo-legacy-"));
  try {
    plannedBootstrap(hubRoot, { domain: "acme.com", hub: true, site: "acme-com" });
    writeFileSync(
      path.join(hubRoot, ".seo/sites/acme-com/log.md"),
      "# SEO operating log\n\n## 2026-01-01 - Handoff\n\n- Mode: operate.\n",
      { flag: "w" },
    );
    // Legacy standalone workspace: .seo/ with no config.json.
    run("mkdir", ["-p", path.join(legacyRoot, ".seo")]);
    writeFileSync(
      path.join(legacyRoot, ".seo/log.md"),
      "# SEO operating log\n\n## 2026-01-01 - Handoff\n\n- Mode: operate.\n",
    );

    const registryPath = path.join(hubRoot, ".seo/registry.md");
    writeFileSync(
      registryPath,
      [
        "# Portfolio Registry",
        "",
        "| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| acme.com | sites/acme-com | unknown | unknown | unknown | unknown | hub-managed |",
        `| legacy.example | ${legacyRoot} | unknown | unknown | unknown | unknown | standalone repo |`,
        "",
      ].join("\n"),
    );

    // Run from a cwd that is NOT the hub to prove registry-relative resolution.
    const json = run(
      process.execPath,
      [
        path.join(skillRoot, "scripts/portfolio-status.mjs"),
        "--registry",
        registryPath,
        "--format",
        "json",
      ],
      { cwd: tmpdir() },
    );
    const parsed = JSON.parse(json);
    const bySite = Object.fromEntries(parsed.sites.map((s) => [s.site, s]));
    check(
      bySite["acme.com"]?.missing === false,
      "A hub-relative sites/<slug> row must resolve against the registry directory",
    );
    check(
      bySite["legacy.example"]?.missing === false,
      "An absolute standalone root (.seo/ without config.json) must still resolve",
    );
  } finally {
    rmSync(hubRoot, { recursive: true, force: true });
    rmSync(legacyRoot, { recursive: true, force: true });
  }
});

if (failures.length > 0) {
  console.error(`seo-growth-workspace skill validation FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("seo-growth-workspace skill validation passed");
