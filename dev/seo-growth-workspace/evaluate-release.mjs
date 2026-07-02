#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(
  scriptDir,
  "../../skills/growth/seo-growth-workspace",
);
const args = process.argv.slice(2);

function usage() {
  return `Usage:
  node dev/seo-growth-workspace/evaluate-release.mjs [--json] [--profile-root name=/path/to/repo]

Scores the portable seo-growth-workspace release candidate and optionally inspects
real repo profiles without modifying them. Higher score is better.`;
}

function argValues(name) {
  return args.flatMap((arg, index) => (arg === name ? [args[index + 1]] : []));
}

function walk(root, files = []) {
  for (const entry of readdirSync(root)) {
    const absolute = path.join(root, entry);
    const relative = path.relative(skillRoot, absolute);
    if (entry === ".git" || entry === "node_modules") continue;
    if (statSync(absolute).isDirectory()) {
      walk(absolute, files);
      continue;
    }
    files.push(relative);
  }
  return files;
}

function walkRelative(root, relativeRoot = "") {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((entry) => {
    const absolute = path.join(root, entry);
    const relative = path.join(relativeRoot, entry);
    if (statSync(absolute).isDirectory()) return walkRelative(absolute, relative);
    return [relative];
  });
}

function read(relativePath) {
  return readFileSync(path.join(skillRoot, relativePath), "utf-8");
}

function exists(relativePath) {
  return existsSync(path.join(skillRoot, relativePath));
}

function addFinding(findings, category, severity, message, file = null) {
  findings.push({ category, severity, message, file });
}

function award(checks, findings, category, weight, condition, message, file = null) {
  checks[category] = checks[category] ?? { score: 0, max: 0 };
  checks[category].max += weight;
  if (condition) {
    checks[category].score += weight;
    return;
  }
  addFinding(findings, category, "warn", message, file);
}

function awardRatio(checks, findings, category, weight, passed, total, message) {
  checks[category] = checks[category] ?? { score: 0, max: 0 };
  checks[category].max += weight;
  const ratio = total === 0 ? 1 : passed / total;
  checks[category].score += weight * ratio;
  if (passed < total) {
    addFinding(findings, category, "warn", `${message}: ${passed}/${total}`);
  }
}

function portableFiles() {
  return walk(skillRoot).filter((file) => /\.(md|mjs|json)$/.test(file));
}

function installFiles() {
  return walk(skillRoot);
}

function scanPortableFiles(files) {
  return files.map((file) => ({ file, text: read(file) }));
}

function includesAny(scanned, regex) {
  return scanned.filter(({ text }) => regex.test(text));
}

function loadScenarioFixture(findings) {
  const fixture = path.join(scriptDir, "fixtures/release-scenarios.json");
  if (!existsSync(fixture)) {
    addFinding(findings, "Scenario readiness", "warn", "Missing release scenario fixture", fixture);
    return [];
  }
  try {
    const payload = JSON.parse(readFileSync(fixture, "utf-8"));
    return Array.isArray(payload.profiles) ? payload.profiles : [];
  } catch (error) {
    addFinding(findings, "Scenario readiness", "critical", `Invalid release scenario fixture ${fixture}: ${error.message}`, fixture);
    return [];
  }
}

function classifyProjectRoot(value) {
  const [name, ...rest] = value.split("=");
  const root = rest.join("=");
  const missing = !name || !root || !existsSync(root);

  if (missing) {
    return { name: name || value, root, exists: false, signals: [], recommendedMode: "missing" };
  }

  try {
    return inspectProjectRoot(name, root);
  } catch (error) {
    // e.g. ENOTDIR when the profile root is a file, or permission errors.
    return {
      name,
      root,
      exists: false,
      signals: [],
      recommendedMode: "unreadable",
      error: error.message,
    };
  }
}

function inspectProjectRoot(name, root) {
  const warnings = [];
  const has = (relativePath) => existsSync(path.join(root, relativePath));
  const rootFiles = readdirSync(root);
  const packageJsonPath = path.join(root, "package.json");
  let packageJson = {};
  if (existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    } catch (error) {
      warnings.push(`Malformed package.json at ${packageJsonPath}: ${error.message}`);
    }
  }
  const profileText = `${name} ${root} ${packageJson.name ?? ""}`.toLowerCase();
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const frameworks = [
    has("next.config.js") || has("next.config.mjs") || dependencies.next ? "next" : null,
    has("astro.config.mjs") || has("astro.config.ts") || dependencies.astro ? "astro" : null,
    has("convex") || dependencies.convex ? "convex" : null,
    dependencies["@vercel/analytics"] ? "vercel-analytics" : null,
  ].filter(Boolean);
  const packageManager = has("bun.lock") || has("bun.lockb") ? "bun" : has("pnpm-lock.yaml") ? "pnpm" : has("yarn.lock") ? "yarn" : has("package-lock.json") ? "npm" : "unknown";
  const hasSeoWorkspace = has(".seo");
  const hasProductMarketing = has(".agents/product-marketing.md");
  const hasSeoContext = has(".seo/context.md");
  const hasLegacyContext =
    has(".seo/strategy.md") || has(".seo/audit.md") || has(".agents/product-marketing.md");
  const hasAdapters =
    has(".seo/adapters") &&
    readdirSync(path.join(root, ".seo/adapters")).some((file) => file.endsWith(".md"));
  const localLike = /\b(local|service|legal|gbp|nap|citation|review)\b/.test(profileText);
  const publicSignals = rootFiles.filter((file) =>
    /^(app|pages|src|public|content|posts|blog|astro\.config|next\.config)/.test(file),
  );
  const recommendedMode = hasSeoWorkspace ? "operate" : "bootstrap";
  const recommendedPhases = [
    "classification",
    "technical",
    hasSeoWorkspace ? "measurement" : null,
    publicSignals.length > 0 ? "metadata" : null,
    frameworks.includes("convex") ? "content" : null,
    hasProductMarketing ? "conversion" : null,
    localLike ? "local" : null,
    localLike ? "authority" : null,
  ].filter(Boolean);

  return {
    name,
    root,
    exists: true,
    packageManager,
    frameworks,
    hasSeoWorkspace,
    hasSeoContext,
    hasLegacyContext,
    hasAdapters,
    hasProductMarketing,
    publicSignals,
    recommendedMode,
    recommendedPhases,
    warnings,
  };
}

function compareInstalledSkill(root) {
  const targetSkillRoot = path.join(root, ".agents/skills/seo-growth-workspace");
  if (!existsSync(targetSkillRoot)) {
    return {
      installed: false,
      localOnlyFiles: [],
      modifiedSamePathFiles: [],
      missingFiles: installFiles(),
    };
  }

  const expected = installFiles();
  const expectedSet = new Set(expected);
  const existing = walkRelative(targetSkillRoot);
  const localOnlyFiles = existing.filter((file) => !expectedSet.has(file));
  const modifiedSamePathFiles = expected.filter((file) => {
    const target = path.join(targetSkillRoot, file);
    if (!existsSync(target)) return false;
    return readFileSync(path.join(skillRoot, file), "utf-8") !== readFileSync(target, "utf-8");
  });
  const missingFiles = expected.filter((file) => !existsSync(path.join(targetSkillRoot, file)));

  return {
    installed: true,
    localOnlyFiles,
    modifiedSamePathFiles,
    missingFiles,
  };
}

function profileFindings(profile) {
  if (!profile.exists) {
    return profile.error
      ? [`Profile root could not be inspected (${profile.root}): ${profile.error}`]
      : [`Profile root does not exist: ${profile.root}`];
  }

  const findings = [...(profile.warnings ?? [])];
  if (!profile.hasSeoWorkspace) {
    findings.push("Missing .seo workspace; run bootstrap before operate.");
  } else if (!profile.hasSeoContext) {
    const fallback = profile.hasLegacyContext
      ? "legacy context exists in other .seo/.agents files"
      : "no obvious fallback context files found";
    findings.push(`Missing .seo/context.md (${fallback}).`);
  }

  const contentEngineLike =
    profile.frameworks.includes("convex") ||
    profile.publicSignals.includes("content") ||
    profile.recommendedPhases.includes("content");
  if (contentEngineLike && !profile.hasAdapters) {
    findings.push("Content-engine-like repo has no .seo/adapters/*.md mapping.");
  }

  const installed = compareInstalledSkill(profile.root);
  if (!installed.installed) {
    findings.push("Repo-local .agents/skills/seo-growth-workspace copy is missing.");
  } else {
    if (installed.localOnlyFiles.length > 0) {
      findings.push(`Installed skill has local-only files: ${installed.localOnlyFiles.slice(0, 8).join(", ")}${installed.localOnlyFiles.length > 8 ? ", ..." : ""}.`);
    }
    if (installed.modifiedSamePathFiles.length > 0) {
      findings.push(`Installed skill has modified same-path files: ${installed.modifiedSamePathFiles.slice(0, 8).join(", ")}${installed.modifiedSamePathFiles.length > 8 ? ", ..." : ""}.`);
    }
    if (installed.missingFiles.length > 0) {
      findings.push(`Installed skill is missing files: ${installed.missingFiles.slice(0, 8).join(", ")}${installed.missingFiles.length > 8 ? ", ..." : ""}.`);
    }
  }

  return findings;
}

function evaluate() {
  const findings = [];
  const checks = {};
  const skill = read("SKILL.md");
  const references = [
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
  ];
  const scripts = [
    "scripts/bootstrap-seo-workspace.mjs",
    "scripts/gsc-oauth.mjs",
    "scripts/gsc-fetch.mjs",
    "scripts/gsc-opportunities.mjs",
    "scripts/monthly-report.mjs",
  ];
  const templates = [
    "templates/admin-setup.md",
    "templates/gsc-opportunity.md",
    "templates/content-plan.md",
    "templates/local-seo-gbp.md",
    "templates/backlink-gap.md",
    "templates/monthly-report.md",
    "templates/pseo-plan.md",
    "templates/taxonomy.md",
  ];
  // Maintainer tooling lives in dev/seo-growth-workspace, next to this script.
  const releaseToolingFiles = [
    path.join(scriptDir, "release-checklist.md"),
    path.join(scriptDir, "fixtures/release-scenarios.json"),
    path.join(scriptDir, "validate-skill.mjs"),
    path.join(scriptDir, "export-clean-skill.mjs"),
  ];
  const portable = portableFiles();
  const allPortable = scanPortableFiles(portable);
  const combinedPortableText = allPortable.map(({ text }) => text).join("\n").toLowerCase();
  const allReferencesLinked = references.filter((file) => skill.includes(file)).length;
  const scenarioProfiles = loadScenarioFixture(findings);
  const phaseArchitecture = exists("references/phase-architecture.md")
    ? read("references/phase-architecture.md").toLowerCase()
    : "";
  const releaseChecklistPath = path.join(scriptDir, "release-checklist.md");
  const releaseChecklist = existsSync(releaseChecklistPath)
    ? readFileSync(releaseChecklistPath, "utf-8").toLowerCase()
    : "";

  award(checks, findings, "Structure", 2, /^---[\s\S]*name:\s*seo-growth-workspace[\s\S]*description:/m.test(skill), "SKILL.md frontmatter should include name and description", "SKILL.md");
  awardRatio(checks, findings, "Structure", 7, [...references, ...scripts, ...templates].filter(exists).length, references.length + scripts.length + templates.length, "Required runtime files present");
  awardRatio(checks, findings, "Structure", 3, allReferencesLinked, references.length, "SKILL.md links current references");
  awardRatio(checks, findings, "Structure", 3, releaseToolingFiles.filter((file) => existsSync(file)).length, releaseToolingFiles.length, "Release tooling files present in dev/seo-growth-workspace");

  // Generic contamination patterns: no personal names or private project markers —
  // any user-specific absolute path, email address, or UUID is a packaging leak.
  const contaminationPatterns = [
    { label: "absolute home path", regex: /\/(?:Users|home)\/[A-Za-z0-9._-]+/ },
    {
      label: "email address",
      regex: /[A-Za-z0-9._%+-]+@(?!example\.(?:com|org|net))[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/,
    },
    {
      label: "UUID",
      regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    },
  ];
  const contamination = allPortable.flatMap(({ file, text }) => {
    const hits = contaminationPatterns.filter(({ regex }) => regex.test(text));
    return hits.length === 0
      ? []
      : [{ file, markers: hits.map(({ label }) => label).join("/") }];
  });
  const secretExamples = includesAny(allPortable, /(ya29\.|sk-[A-Za-z0-9]|GSC_REFRESH_TOKEN=.*[A-Za-z0-9]{12})/);
  award(checks, findings, "Portability", 11, contamination.length === 0, `Portable files contain user-specific contamination: ${contamination.map(({ file, markers }) => `${file} (${markers})`).join(", ")}`);
  award(checks, findings, "Portability", 4, secretExamples.length === 0, `Portable files may contain secret-like examples: ${secretExamples.map(({ file }) => file).join(", ")}`);

  award(checks, findings, "Matt-style architecture", 3, skill.split("\n").length <= 180, "SKILL.md should remain a concise router", "SKILL.md");
  award(checks, findings, "Matt-style architecture", 3, /mode router|choose a mode/i.test(skill), "SKILL.md should explicitly route modes", "SKILL.md");
  award(checks, findings, "Matt-style architecture", 3, /Load only the file needed|Progressive References/i.test(skill), "SKILL.md should enforce progressive disclosure", "SKILL.md");
  award(checks, findings, "Matt-style architecture", 3, /Keep one current focus/i.test(skill), "Skill should keep one current focus", "SKILL.md");
  award(checks, findings, "Matt-style architecture", 3, /Do not print secrets|Never print credential|Do not store or print the token/i.test(combinedPortableText), "Skill should include secret-handling guardrails");
  award(checks, findings, "Matt-style architecture", 3, /phase|ladder|site type|classifier/.test(phaseArchitecture) && skill.includes("references/phase-architecture.md"), "Skill should expose a progressive phase architecture", "references/phase-architecture.md");
  award(checks, findings, "Matt-style architecture", 2, /adapter|content engine|repo-specific/.test(combinedPortableText) && skill.includes("references/adapters.md"), "Skill should preserve repo-local adapter guidance", "references/adapters.md");

  award(checks, findings, "SEO freshness", 3, /robots|sitemap|canonical|noindex|redirect/.test(combinedPortableText), "Skill should cover indexability foundations");
  award(checks, findings, "SEO freshness", 3, /title|description|canonical|open graph|twitter/.test(combinedPortableText), "Skill should cover metadata and snippets");
  award(checks, findings, "SEO freshness", 4, /visible page content|visible-content|visible content/.test(combinedPortableText), "Schema guidance should require visible-content match");
  award(checks, findings, "SEO freshness", 3, /FAQ rich results are no longer appearing|2026-05-07|may 7, 2026/.test(combinedPortableText), "FAQ rich-result deprecation should be explicit");
  award(checks, findings, "SEO freshness", 4, /\b(generative ai|ai search|llms\.txt|AEO|GEO)\b/i.test(combinedPortableText) && /do not|avoid|ignore/.test(combinedPortableText), "AI SEO guidance should reject hacky Google Search gates");
  award(checks, findings, "SEO freshness", 3, /not a full prioritization model|review every row|draft backlog/.test(combinedPortableText), "GSC helper outputs should be framed as draft inputs");

  award(checks, findings, "Marketing usefulness", 3, /CTA|conversion|proof|objection|form/i.test(combinedPortableText), "Skill should cover conversion and CTA work");
  award(checks, findings, "Marketing usefulness", 3, /content|blog|calendar|brief/i.test(combinedPortableText), "Skill should cover content operations");
  award(checks, findings, "Marketing usefulness", 3, /pSEO|programmatic|publish gate/i.test(combinedPortableText), "Skill should cover pSEO gates");
  award(checks, findings, "Marketing usefulness", 2, /GBP|Google Business Profile|NAP|reviews|citations/i.test(combinedPortableText), "Skill should cover local SEO");
  const marketingSkillNames = ["product-marketing", "customer-research", "copywriting", "content-strategy", "programmatic-seo", "ai-seo"];
  const mentionedMarketingSkills = marketingSkillNames.filter((name) => combinedPortableText.includes(name));
  award(checks, findings, "Marketing usefulness", 4, mentionedMarketingSkills.length >= 3, "Skill should bridge to marketing skills when available");

  const expectedScenarioPhases = new Set(scenarioProfiles.flatMap((profile) => profile.expectedPhases ?? []));
  const coveredScenarioPhases = [...expectedScenarioPhases].filter((phase) => phaseArchitecture.includes(phase));
  award(checks, findings, "Scenario readiness", 4, scenarioProfiles.length >= 6, "Release scenarios should include at least six profiles", "fixtures/release-scenarios.json");
  awardRatio(checks, findings, "Scenario readiness", 5, coveredScenarioPhases.length, expectedScenarioPhases.size, "Phase architecture covers expected scenario phases");
  award(checks, findings, "Scenario readiness", 3, /bootstrap|operate|technical-seo-fix|content-ops|pseo-planning|local-seo/.test(phaseArchitecture), "Phase architecture should map scenarios to modes", "references/phase-architecture.md");
  award(checks, findings, "Scenario readiness", 3, /validate-skill|evaluate-release|dry run|bootstrap/.test(releaseChecklist), "Release checklist should define validation and dry-run gates", "references/release-checklist.md");

  const categories = Object.fromEntries(
    Object.entries(checks).map(([category, result]) => [
      category,
      {
        score: Number(result.score.toFixed(2)),
        max: result.max,
      },
    ]),
  );
  const score = Number(Object.values(categories).reduce((sum, item) => sum + item.score, 0).toFixed(2));
  const criticalFindings = findings.filter((finding) => finding.severity === "critical");
  const projectProfiles = argValues("--profile-root")
    .filter(Boolean)
    .map((value) => {
      const profile = classifyProjectRoot(value);
      return { ...profile, findings: profileFindings(profile) };
    });

  for (const profile of projectProfiles) {
    for (const finding of profile.findings) {
      addFinding(findings, "Profile readiness", "warn", `${profile.name}: ${finding}`);
    }
  }

  return {
    skill: "seo-growth-workspace",
    score,
    maxScore: 100,
    pass: score >= 85 && criticalFindings.length === 0,
    passBar: 85,
    categories,
    findings,
    scenarioProfiles: scenarioProfiles.map(({ id, siteType, expectedModes, expectedPhases }) => ({
      id,
      siteType,
      expectedModes,
      expectedPhases,
    })),
    projectProfiles,
  };
}

function printMarkdown(result) {
  console.log(`# SEO growth workspace release evaluation

Score: ${result.score}/${result.maxScore}
Pass: ${result.pass ? "yes" : "no"}

## Categories

| Category | Score |
| --- | ---: |
${Object.entries(result.categories)
  .map(([category, value]) => `| ${category} | ${value.score}/${value.max} |`)
  .join("\n")}

## Findings

${result.findings.length === 0 ? "No findings." : result.findings.map((finding) => `- ${finding.severity}: ${finding.category}: ${finding.message}${finding.file ? ` (${finding.file})` : ""}`).join("\n")}
`);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const result = evaluate();
if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printMarkdown(result);
}

process.exit(result.pass ? 0 : 1);
