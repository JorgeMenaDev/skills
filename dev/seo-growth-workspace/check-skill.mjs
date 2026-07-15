#!/usr/bin/env node

// check-skill.mjs — the v6 structural release check for seo-growth-workspace.
//
// Replaces the 52-section prose validator (validate-skill.mjs, retired in v6.0.0)
// with the checks that protect deterministic behavior:
//   1. SKILL.md frontmatter sanity and version/CHANGELOG sync
//   2. File-graph integrity: no dangling skill-file references, no orphan files,
//      no symlinks inside the skill tree
//   3. Every CLI script answers --help with exit 0
//   4. cadence-status golden fixtures (byte-compared expected outputs)
//   5. gsc-opportunities golden fixture
//   6. measurement-companion lifecycle fixture
//   7. the loop-state fixture suite (run-loop-state-fixtures.mjs)
//
// Prose quality is enforced editorially, not here (proposal §4.1, skills#145).

import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(here, "..", "..", "skills", "growth", "seo-growth-workspace");
const fixturesDir = path.join(here, "fixtures");

let passed = 0;
const failures = [];

function check(condition, label) {
  if (condition) passed += 1;
  else failures.push(label);
}

function walk(root, relative = "") {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) return [{ rel, symlink: true }];
    if (entry.isDirectory()) return walk(path.join(root, entry.name), rel);
    return [{ rel, symlink: false }];
  });
}

function runScript(relativeScript, args, options = {}) {
  return spawnSync(process.execPath, [path.join(skillRoot, relativeScript), ...args], { encoding: "utf-8", ...options });
}

// --- 1. frontmatter + version sync ---

const skillMd = readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8");
const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(skillMd)?.[1] ?? "";
const version = /^version:\s*(\S+)\s*$/m.exec(frontmatter)?.[1];
check(/^name:\s*seo-growth-workspace\s*$/m.test(frontmatter), "frontmatter: name must be seo-growth-workspace");
check(typeof version === "string" && /^[0-9]+\.[0-9]+\.[0-9]+(?:[-.][A-Za-z0-9.-]+)?$/.test(version), "frontmatter: version must be semver-shaped");
check(/^description:\s*".+"$/m.test(frontmatter), "frontmatter: description must be a quoted non-empty string");
check(/^license:\s*MIT\s*$/m.test(frontmatter), "frontmatter: license must be MIT");
check(/^mutating:\s*true\s*$/m.test(frontmatter), "frontmatter: mutating flag must stay declared");

const changelog = readFileSync(path.join(skillRoot, "CHANGELOG.md"), "utf-8");
const latestEntry = /^##\s+(\S+)/m.exec(changelog)?.[1];
check(latestEntry === version, `version sync: SKILL.md ${version} must match the newest CHANGELOG.md entry (${latestEntry})`);

// --- 2. file graph ---

const files = walk(skillRoot);
check(files.every((file) => !file.symlink), `tree: no symlinks inside the skill (${files.filter((f) => f.symlink).map((f) => f.rel).join(", ") || "ok"})`);

const tracked = files.map((file) => file.rel).filter((rel) => /^(references|templates|scripts)\//.test(rel));
const corpus = [
  skillMd,
  ...files
    .filter((file) => /^references\/.*\.md$/.test(file.rel) || /^scripts\/.*\.mjs$/.test(file.rel))
    .map((file) => readFileSync(path.join(skillRoot, file.rel), "utf-8")),
].join("\n");

for (const rel of tracked) {
  const base = path.basename(rel);
  check(corpus.includes(rel) || corpus.includes(base), `orphan: ${rel} exists but nothing references it`);
}

const mentioned = new Set();
for (const match of corpus.matchAll(/(?:references|templates|scripts)\/[A-Za-z0-9._-]+\.(?:md|mjs)/g)) mentioned.add(match[0]);
for (const rel of mentioned) {
  check(tracked.includes(rel), `dangling: ${rel} is referenced but does not exist`);
}

// --- 3. script CLIs ---

for (const rel of tracked.filter((file) => file.startsWith("scripts/") && file.endsWith(".mjs"))) {
  const source = readFileSync(path.join(skillRoot, rel), "utf-8");
  if (!source.startsWith("#!/usr/bin/env node")) continue; // shared libraries have no CLI
  const help = runScript(rel, ["--help"]);
  check(help.status === 0 && (help.stdout + help.stderr).length > 0, `${rel}: --help must exit 0 with usage text`);
}

// --- 4. cadence-status golden fixtures ---

const NOW = "2026-07-12";
const cadenceCases = readdirSync(path.join(fixturesDir, "cadence-status"))
  .filter((name) => name.endsWith(".expected.json") || name.endsWith(".expected.md"))
  .map((name) => ({
    name: name.replace(/\.expected\.(json|md)$/, ""),
    format: name.endsWith(".json") ? "json" : "backlog",
    expected: name,
  }));
check(cadenceCases.length >= 20, `cadence-status: expected fixture corpus present (${cadenceCases.length} cases)`);
for (const fixtureCase of cadenceCases) {
  const result = runScript("scripts/cadence-status.mjs", [
    "--workspace", path.join(fixturesDir, "cadence-status", fixtureCase.name),
    "--format", fixtureCase.format,
    "--now", NOW,
  ]);
  const expected = readFileSync(path.join(fixturesDir, "cadence-status", fixtureCase.expected), "utf-8");
  check(`${result.stdout}` === expected, `cadence-status ${fixtureCase.name} (${fixtureCase.format}) drifted from its expected fixture`);
}
const zoneless = runScript("scripts/cadence-status.mjs", [
  "--workspace", path.join(fixturesDir, "cadence-status", "absent"),
  "--format", "json",
  "--now", "2026-07-12T10:30:00",
]);
check(zoneless.status !== 0 && zoneless.stderr.includes("timezone-qualified"), "cadence-status: zoneless --now timestamps are rejected");

// --- 5. gsc-opportunities golden fixture ---

const gsc = runScript("scripts/gsc-opportunities.mjs", ["--input", path.join(fixturesDir, "gsc-sample.json"), "--brand", "examplebrand"]);
const gscExpected = readFileSync(path.join(fixturesDir, "gsc-opportunities.expected.md"), "utf-8");
check(gsc.stdout.replace(/^Generated: .*$/m, "Generated: <timestamp>") === gscExpected, "gsc-opportunities report drifted from its expected fixture (regenerate deliberately if intended)");

// --- 6. measurement-companion lifecycle fixture ---

const walkthrough = JSON.parse(readFileSync(path.join(fixturesDir, "measurement-companion", "walkthrough.json"), "utf-8"));
check(
  walkthrough.stages.map(({ name }) => name).join(" → ") === "recorded → due → materialized → inconclusive → resolved",
  "measurement companion fixture must exercise the complete lifecycle in order",
);
check(
  walkthrough.stages.every(({ obligation }) => JSON.stringify([obligation.hypothesis, obligation.pageCohortFingerprint]) === walkthrough.identity),
  "measurement companion: every lifecycle stage retains the same obligation identity",
);

// --- 7. loop-state fixture suite ---

const loopState = spawnSync(process.execPath, [path.join(here, "run-loop-state-fixtures.mjs")], { encoding: "utf-8" });
check(loopState.status === 0, `loop-state fixture suite failed:\n${loopState.stdout}${loopState.stderr}`);
if (loopState.status === 0) console.log(`  (${loopState.stdout.trim()})`);

// --- summary ---

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} of ${passed + failures.length} checks failed`);
  for (const label of failures) console.error(`  ✗ ${label}`);
  process.exit(1);
}
console.log(`ok: check-skill passed ${passed} checks (version ${version})`);
