#!/usr/bin/env node

// check-skill.mjs — the release check for seo-growth-workspace (v8).
//   1. SKILL.md frontmatter, size, and version/CHANGELOG sync
//   2. File graph: no symlinks, orphans, or dangling links
//   3. Every CLI script answers --help with exit 0
//   4. Golden fixtures: review-data, serp, demand (offline renders)
//   5. Dry runs need no credentials and send nothing
//   6. No reference points at retired v7 machinery
// Prose quality is enforced editorially, not here.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(here, "..", "..", "skills", "growth", "seo-growth-workspace");
const fixtures = path.join(here, "fixtures");

let passed = 0;
const failures = [];
const check = (condition, label) => (condition ? (passed += 1) : failures.push(label));

function walk(root, relative = "") {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) return [{ rel, symlink: true }];
    if (entry.isDirectory()) return walk(path.join(root, entry.name), rel);
    return [{ rel, symlink: false }];
  });
}

const run = (script, args, env = {}) =>
  spawnSync(process.execPath, [path.join(skillRoot, "scripts", script), ...args], {
    encoding: "utf-8",
    env: { PATH: process.env.PATH, ...env },
  });
const read = (file) => readFileSync(file, "utf-8");

// --- 1. frontmatter, size, version sync ---

const skillMd = read(path.join(skillRoot, "SKILL.md"));
const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(skillMd)?.[1] ?? "";
const version = /^version:\s*(\S+)\s*$/m.exec(frontmatter)?.[1];
check(/^name:\s*seo-growth-workspace\s*$/m.test(frontmatter), "frontmatter: name must be seo-growth-workspace");
check(typeof version === "string" && /^\d+\.\d+\.\d+(?:[-.][A-Za-z0-9.-]+)?$/.test(version), "frontmatter: version must be semver");
check(/^description:\s*".+"$/m.test(frontmatter), "frontmatter: description must be a quoted string");
check(/^license:\s*MIT\s*$/m.test(frontmatter), "frontmatter: license must be MIT");
check(/^mutating:\s*true\s*$/m.test(frontmatter), "frontmatter: mutating must stay declared");
check(skillMd.split("\n").length <= 100, `SKILL.md must stay within 100 lines (has ${skillMd.split("\n").length})`);
const latest = /^##\s+(\S+)/m.exec(read(path.join(skillRoot, "CHANGELOG.md")))?.[1];
check(latest === version, `version sync: SKILL.md ${version} must match the newest CHANGELOG entry (${latest})`);

// --- 2. file graph ---

const files = walk(skillRoot);
check(files.every((file) => !file.symlink), "tree: no symlinks inside the skill");
const tracked = files.map((file) => file.rel).filter((rel) => /^(references|templates|scripts)\//.test(rel));
const docs = files.map((file) => file.rel).filter((rel) => rel.endsWith(".md") || rel.endsWith(".mjs"));
const corpus = docs.filter((rel) => rel !== "CHANGELOG.md").map((rel) => read(path.join(skillRoot, rel))).join("\n");

for (const rel of tracked) {
  const referenced = docs.some((doc) => doc !== rel && read(path.join(skillRoot, doc)).includes(path.basename(rel)));
  check(referenced, `orphan: ${rel} exists but nothing references it`);
}
for (const match of new Set(corpus.match(/(?:references|templates|scripts)\/[A-Za-z0-9._-]+\.(?:md|mjs)/g) ?? [])) {
  check(tracked.includes(match), `dangling: ${match} is referenced but does not exist`);
}
for (const rel of docs.filter((doc) => doc.startsWith("references/"))) {
  for (const [, target] of read(path.join(skillRoot, rel)).matchAll(/\]\(([A-Za-z0-9._-]+\.md)(?:#[^)]*)?\)/g)) {
    check(existsSync(path.join(skillRoot, "references", target)), `dangling: ${rel} links ${target}`);
  }
}

// --- 3. script CLIs ---

for (const rel of tracked.filter((file) => file.startsWith("scripts/"))) {
  const help = run(path.basename(rel), ["--help"]);
  check(help.status === 0 && help.stdout.includes("Usage"), `${rel}: --help must exit 0 with usage text`);
}

// --- 4. golden fixtures ---

const golden = (label, result, expectedFile, normalise = (text) => text) =>
  check(result.status === 0 && normalise(result.stdout) === read(path.join(fixtures, expectedFile)), `${label} drifted from ${expectedFile}${result.stderr ? `: ${result.stderr}` : ""}`);

golden(
  "review-data",
  run("review-data.mjs", ["--from-raw", path.join(fixtures, "review-raw.json"), "--brand", "examplebrand"]),
  "review-data.expected.md",
  (text) => text.replace(/^Generated: .*$/m, "Generated: <timestamp>"),
);
golden("serp", run("serp.mjs", ["--from-response", path.join(fixtures, "serp-saved.json")]), "serp.expected.md");
golden("demand", run("demand.mjs", ["--from-response", path.join(fixtures, "demand-saved.json")]), "demand.expected.md");
check(run("review-data.mjs", ["--from-raw", path.join(fixtures, "review-raw.json")]).status !== 0, "review-data: --brand is required");

// --- 5. dry runs ---

const serpDry = run("serp.mjs", ["--q", "widget", "--gl", "gb", "--hl", "en", "--dry-run"]);
check(serpDry.status === 0 && JSON.parse(serpDry.stdout).bodies[0].gl === "gb", "serp --dry-run prints the request without a key");
const demandDry = run("demand.mjs", ["--keywords", "a,b", "--location", "2152", "--language", "es", "--dry-run"]);
check(demandDry.status === 0 && JSON.parse(demandDry.stdout).body[0].location_code === 2152, "demand --dry-run prints the request without credentials");
check(run("demand.mjs", ["--keywords", "a", "--seeds", "b", "--dry-run"]).status !== 0, "demand: --keywords and --seeds are exclusive");
check(run("gsc-fetch.mjs", ["--site", "sc-domain:example.com", "--start", "2026-01-01", "--end", "2026-01-02", "--dimensions", "bogus"]).status !== 0, "gsc-fetch: unknown dimensions are rejected");

// --- 6. retired v7 machinery ---

const retired = /loop-state|cadence-status|operating\.md|policy\.md|first-run\.md|workspace\.md|monthly-reporting\.md|data-tools\.md|ahrefs\.md|gsc-opportunities|seo-doctor|measurement obligation|sleep certif|frontier sweep/i;
for (const rel of docs.filter((doc) => doc !== "CHANGELOG.md" && doc !== "references/setup.md")) {
  const hit = read(path.join(skillRoot, rel)).match(retired);
  check(!hit, `${rel}: mentions retired v7 machinery (${hit?.[0]})`);
}

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} of ${passed + failures.length} checks failed`);
  for (const label of failures) console.error(`  ✗ ${label}`);
  process.exit(1);
}
console.log(`ok: check-skill passed ${passed} checks (version ${version})`);
