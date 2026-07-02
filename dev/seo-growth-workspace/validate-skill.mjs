#!/usr/bin/env node

// Maintainer validation for skills/growth/seo-growth-workspace.
// Run from anywhere: node dev/seo-growth-workspace/validate-skill.mjs [--skill-dir <path>]

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
  "templates/taxonomy.md",
  "templates/local-seo-gbp.md",
  "templates/backlink-gap.md",
  "templates/content-plan.md",
  "templates/pseo-plan.md",
  "templates/gsc-opportunity.md",
  "templates/monthly-report.md",
  "templates/admin-setup.md",
  "scripts/bootstrap-seo-workspace.mjs",
  "scripts/gsc-oauth.mjs",
  "scripts/gsc-fetch.mjs",
  "scripts/gsc-opportunities.mjs",
  "scripts/monthly-report.mjs",
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

// --- bootstrap-seo-workspace.mjs ---
section("bootstrap smoke test", () => {
  const bootstrapRoot = mkdtempSync(path.join(tmpdir(), "seo-skill-"));
  try {
    run(process.execPath, [
      path.join(skillRoot, "scripts/bootstrap-seo-workspace.mjs"),
      bootstrapRoot,
    ]);
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
  } finally {
    rmSync(bootstrapRoot, { recursive: true, force: true });
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

if (failures.length > 0) {
  console.error(`seo-growth-workspace skill validation FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("seo-growth-workspace skill validation passed");
