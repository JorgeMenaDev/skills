import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, "..");

const requiredFiles = [
  "SKILL.md",
  "references/phase-architecture.md",
  "references/operating-loop.md",
  "references/business-context.md",
  "references/admin-preflight.md",
  "references/adapters.md",
  "references/skill-release-validation.md",
  "references/technical-seo.md",
  "references/search-console.md",
  "references/content-ops.md",
  "references/pseo-gates.md",
  "references/ticket-architecture.md",
  "references/internal-linking.md",
  "references/schema-rich-results.md",
  "references/content-refresh.md",
  "references/conversion-cta.md",
  "references/local-seo-gbp.md",
  "references/backlinks-entity.md",
  "references/monthly-reporting.md",
  "references/release-checklist.md",
  "templates/admin-setup.md",
  "templates/gsc-opportunity.md",
  "templates/content-plan.md",
  "templates/local-seo-gbp.md",
  "templates/backlink-gap.md",
  "templates/monthly-report.md",
  "templates/pseo-plan.md",
  "templates/taxonomy.md",
  "templates/skill-dogfood-report.md",
  "scripts/bootstrap-seo-workspace.mjs",
  "scripts/gsc-fetch.mjs",
  "scripts/gsc-oauth.mjs",
  "scripts/gsc-opportunities.mjs",
  "scripts/gsc-to-backlog.mjs",
  "scripts/backlog-to-content-keywords.mjs",
  "scripts/monthly-state.mjs",
  "scripts/monthly-report.mjs",
  "scripts/evaluate-release.mjs",
  "scripts/export-clean-skill.mjs",
  "fixtures/gsc-sample.json",
  "fixtures/backlog-sample.md",
  "fixtures/monthly-calendar-sample.json",
  "fixtures/monthly-keyword-tiers-sample.json",
  "fixtures/monthly-report-sample.json",
  "fixtures/release-scenarios.json",
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: skillRoot,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const file of requiredFiles) {
  assert(existsSync(path.join(skillRoot, file)), `Missing ${file}`);
}

const skill = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
for (const file of requiredFiles.filter((file) =>
  file.startsWith("references/"),
)) {
  assert(skill.includes(file), `SKILL.md does not reference ${file}`);
}

const bootstrapRoot = mkdtempSync(path.join(tmpdir(), "seo-skill-"));
try {
  run("bun", ["scripts/bootstrap-seo-workspace.mjs", bootstrapRoot]);
  assert(
    existsSync(path.join(bootstrapRoot, ".seo/taxonomy.md")),
    "Bootstrap did not create taxonomy",
  );
  assert(
    existsSync(path.join(bootstrapRoot, ".seo/log.md")),
    "Bootstrap did not create operating log",
  );
  assert(
    existsSync(path.join(bootstrapRoot, ".seo/context.md")),
    "Bootstrap did not create SEO business context",
  );
} finally {
  rmSync(bootstrapRoot, { recursive: true, force: true });
}

const gscOutput = run("bun", [
  "scripts/gsc-opportunities.mjs",
  "--input",
  "fixtures/gsc-sample.json",
]);
assert(
  gscOutput.includes("## Page 2 goldmine"),
  "GSC output missing page-2 section",
);
assert(
  gscOutput.includes("seo automation"),
  "GSC output missing expected page-2 query",
);
assert(
  gscOutput.includes("content seo"),
  "GSC output missing expected CTR query",
);

const gscFetchHelp = run("bun", ["scripts/gsc-fetch.mjs", "--help"]);
assert(
  gscFetchHelp.includes("GSC_ACCESS_TOKEN"),
  "GSC fetch help should document token auth",
);

const gscOAuthHelp = run("bun", ["scripts/gsc-oauth.mjs", "--help"]);
assert(
  gscOAuthHelp.includes("--print-auth-url"),
  "GSC OAuth help should document auth URL generation",
);

const gscAuthUrl = run("bun", [
  "scripts/gsc-oauth.mjs",
  "--client-id",
  "demo-client-id",
  "--print-auth-url",
]);
assert(
  gscAuthUrl.includes("webmasters.readonly"),
  "GSC OAuth URL should request read-only Search Console scope",
);

const keywordDraft = path.join(tmpdir(), `seo-keywords-${Date.now()}.json`);
try {
  run("bun", [
    "scripts/backlog-to-content-keywords.mjs",
    "--backlog",
    "fixtures/backlog-sample.md",
    "--project",
    "demo",
    "--locale",
    "en",
    "--output",
    keywordDraft,
  ]);
  const payload = JSON.parse(readFileSync(keywordDraft, "utf-8"));
  assert(
    payload.keywords.length === 3,
    "Backlog keyword draft should contain 3 rows",
  );
  assert(
    payload.keywords[0].sourceTicket === "SEO-010",
    "Backlog draft missing source ticket",
  );
} finally {
  rmSync(keywordDraft, { force: true });
}

const gscBacklogDraft = path.join(tmpdir(), `seo-gsc-backlog-${Date.now()}.md`);
const gscKeywordDraft = path.join(
  tmpdir(),
  `seo-gsc-keywords-${Date.now()}.json`,
);
try {
  run("bun", [
    "scripts/gsc-to-backlog.mjs",
    "--input",
    "fixtures/gsc-sample.json",
    "--output",
    gscBacklogDraft,
    "--start-id",
    "40",
  ]);
  run("bun", [
    "scripts/backlog-to-content-keywords.mjs",
    "--backlog",
    gscBacklogDraft,
    "--project",
    "demo",
    "--locale",
    "en",
    "--output",
    gscKeywordDraft,
  ]);
  const payload = JSON.parse(readFileSync(gscKeywordDraft, "utf-8"));
  assert(
    payload.keywords.length === 1,
    "GSC backlog draft should produce 1 importable content keyword",
  );
  assert(
    payload.keywords[0].keyword === "seo automation",
    "GSC-to-keyword fixture should preserve the page-2 query",
  );
} finally {
  rmSync(gscBacklogDraft, { force: true });
  rmSync(gscKeywordDraft, { force: true });
}

const monthlyReport = run("bun", [
  "scripts/monthly-report.mjs",
  "--input",
  "fixtures/monthly-report-sample.json",
]);
assert(
  monthlyReport.includes("## Query/page movers"),
  "Monthly report missing movers section",
);
assert(
  monthlyReport.includes("Keyword tiers"),
  "Monthly report missing keyword tier metric",
);

const exportTarget = mkdtempSync(path.join(tmpdir(), "seo-export-"));
try {
  const dryRun = run("bun", [
    "scripts/export-clean-skill.mjs",
    "--target",
    exportTarget,
    "--dry-run",
  ]);
  assert(dryRun.includes('"dryRun": true'), "Exporter dry-run should report dryRun true");
  assert(
    !existsSync(path.join(exportTarget, ".agents/skills/seo-growth-workspace/SKILL.md")),
    "Exporter dry-run should not install files",
  );

  run("bun", [
    "scripts/export-clean-skill.mjs",
    "--target",
    exportTarget,
  ]);
  assert(
    existsSync(path.join(exportTarget, ".agents/skills/seo-growth-workspace/SKILL.md")),
    "Clean export did not install SKILL.md",
  );
  assert(
    !existsSync(
      path.join(
        exportTarget,
        ".agents/skills/seo-growth-workspace/SEO_GROWTH_WORKSPACE_AUDIT.md",
      ),
    ),
    "Clean export should exclude release audit artifacts by default",
  );
  const extraFile = path.join(
    exportTarget,
    ".agents/skills/seo-growth-workspace/references/local-adapter.md",
  );
  const modifiedFile = path.join(
    exportTarget,
    ".agents/skills/seo-growth-workspace/SKILL.md",
  );
  writeFileSync(extraFile, "# local adapter\n");
  writeFileSync(modifiedFile, `${readFileSync(modifiedFile, "utf-8")}\n<!-- local edit -->\n`);
  const blocked = spawnSync(
    "bun",
    ["scripts/export-clean-skill.mjs", "--target", exportTarget],
    {
      cwd: skillRoot,
      encoding: "utf-8",
    },
  );
  assert(blocked.status !== 0, "Exporter should refuse risky replacement without --force");
  assert(blocked.stdout.includes("local-adapter.md"), "Exporter should report local-only files");
  assert(blocked.stdout.includes("SKILL.md"), "Exporter should report modified same-path files");
  run("bun", [
    "scripts/export-clean-skill.mjs",
    "--target",
    exportTarget,
    "--force",
  ]);
  assert(
    !existsSync(path.join(exportTarget, ".seo/reports/seo-growth-workspace-install-notes.md")),
    "Exporter should not write install notes unless requested",
  );
} finally {
  rmSync(exportTarget, { recursive: true, force: true });
}
assert(
  monthlyReport.includes("Content calendar"),
  "Monthly report missing content calendar metric",
);
assert(
  monthlyReport.includes("Single next action"),
  "Monthly report missing next action",
);

const monthlyState = path.join(
  tmpdir(),
  `seo-monthly-state-${Date.now()}.json`,
);
const monthlyStateReport = path.join(
  tmpdir(),
  `seo-monthly-report-${Date.now()}.md`,
);
try {
  run("bun", [
    "scripts/monthly-state.mjs",
    "--target",
    "Demo SaaS",
    "--date-range",
    "2026-04-01 to 2026-04-30",
    "--comparison-range",
    "2026-03-01 to 2026-03-31",
    "--gsc-current",
    "fixtures/gsc-sample.json",
    "--gsc-previous",
    "fixtures/gsc-sample.json",
    "--backlog",
    "fixtures/backlog-sample.md",
    "--keyword-tiers",
    "fixtures/monthly-keyword-tiers-sample.json",
    "--calendar",
    "fixtures/monthly-calendar-sample.json",
    "--output",
    monthlyState,
  ]);
  run("bun", [
    "scripts/monthly-report.mjs",
    "--input",
    monthlyState,
    "--output",
    monthlyStateReport,
  ]);
  const state = JSON.parse(readFileSync(monthlyState, "utf-8"));
  const report = readFileSync(monthlyStateReport, "utf-8");
  assert(state.backlog.ready === 3, "Monthly state should count Ready rows");
  assert(
    report.includes("SEO backlog"),
    "Monthly state report should include backlog metric",
  );
} finally {
  rmSync(monthlyState, { force: true });
  rmSync(monthlyStateReport, { force: true });
}

console.log("seo-growth-workspace skill validation passed");
