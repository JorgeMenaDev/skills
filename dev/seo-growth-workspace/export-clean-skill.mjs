#!/usr/bin/env node

// Maintainer tool: copies the portable seo-growth-workspace skill package into a target repo.
// Lives in dev/ and is not part of the consumer skill package.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
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
  node dev/seo-growth-workspace/export-clean-skill.mjs --target /path/to/repo [--dry-run] [--force] [--write-install-notes]

Copies the portable seo-growth-workspace package (SKILL.md, references/, templates/,
scripts/*.mjs — no fixtures or release tooling) into:
  <target>/.agents/skills/seo-growth-workspace

Default behavior:
  - New target skill folder: copy files.
  - Existing target skill folder: stop if local-only or modified same-path files exist.
  - --dry-run: print the replacement plan and do not write.
  - --force: replace intentionally.
  - --write-install-notes: write .seo/reports/seo-growth-workspace-install-notes.md when replacement removes local changes.`;
}

function argValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    console.error(`Missing value for ${name}\n\n${usage()}`);
    process.exit(1);
  }
  return value;
}

function walk(root, relativeRoot = "") {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((entry) => {
    const absolute = path.join(root, entry);
    const relative = path.join(relativeRoot, entry);
    if (statSync(absolute).isDirectory()) return walk(absolute, relative);
    return [relative];
  });
}

// Final portable inventory: SKILL.md + references/ + templates/ + scripts/*.mjs only.
function portable(relativePath) {
  return (
    relativePath === "SKILL.md" ||
    relativePath.startsWith(`references${path.sep}`) ||
    relativePath.startsWith(`templates${path.sep}`) ||
    (relativePath.startsWith(`scripts${path.sep}`) &&
      relativePath.endsWith(".mjs"))
  );
}

function portableFiles() {
  return walk(skillRoot).filter(portable);
}

function sameFile(source, target) {
  if (!existsSync(source) || !existsSync(target)) return false;
  return readFileSync(source).equals(readFileSync(target));
}

function targetState(targetSkillRoot, expectedFiles) {
  const expected = new Set(expectedFiles);
  const existing = walk(targetSkillRoot);
  const localOnlyFiles = existing.filter((file) => !expected.has(file));
  const modifiedSamePathFiles = expectedFiles.filter((file) => {
    const target = path.join(targetSkillRoot, file);
    if (!existsSync(target)) return false;
    return !sameFile(path.join(skillRoot, file), target);
  });
  const missingTargetFiles = expectedFiles.filter(
    (file) => !existsSync(path.join(targetSkillRoot, file)),
  );

  return { localOnlyFiles, modifiedSamePathFiles, missingTargetFiles };
}

function copyFile(relativePath, targetSkillRoot) {
  const source = path.join(skillRoot, relativePath);
  const target = path.join(targetSkillRoot, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target);
}

function writeInstallNotes(resolvedTargetRoot, plan) {
  const reportDir = path.join(resolvedTargetRoot, ".seo/reports");
  if (!existsSync(path.join(resolvedTargetRoot, ".seo"))) return;
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    path.join(reportDir, "seo-growth-workspace-install-notes.md"),
    `# SEO growth workspace install notes

The clean exporter replaced a previous local skill copy.

## Local-only files removed

${plan.localOnlyFiles.length ? plan.localOnlyFiles.map((file) => `- ${file}`).join("\n") : "- None"}

## Modified same-path files replaced

${plan.modifiedSamePathFiles.length ? plan.modifiedSamePathFiles.map((file) => `- ${file}`).join("\n") : "- None"}

Move reusable project-specific behavior into \`.seo/adapters/\` before the next replacement if any of these are still needed.
`,
  );
}

const targetRoot = argValue("--target");
if (args.includes("--help") || args.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

if (!targetRoot) {
  console.error(usage());
  process.exit(1);
}

const dryRun = args.includes("--dry-run") || args.includes("--check");
const force = args.includes("--force");
const writeNotes = args.includes("--write-install-notes");
const resolvedTargetRoot = path.resolve(targetRoot);
const targetSkillRoot = path.join(
  resolvedTargetRoot,
  ".agents/skills/seo-growth-workspace",
);
const files = portableFiles();
const state = targetState(targetSkillRoot, files);
const riskyReplacement =
  state.localOnlyFiles.length > 0 || state.modifiedSamePathFiles.length > 0;

const plan = {
  targetRoot: resolvedTargetRoot,
  targetSkillRoot,
  copiedFiles: files.length,
  dryRun,
  force,
  willWrite: !dryRun && (!riskyReplacement || force),
  localOnlyFiles: state.localOnlyFiles,
  modifiedSamePathFiles: state.modifiedSamePathFiles,
  missingTargetFiles: state.missingTargetFiles,
};

console.log(JSON.stringify(plan, null, 2));

if (dryRun) process.exit(0);

if (riskyReplacement && !force) {
  console.error(
    "\nExisting skill copy has local-only or modified same-path files. Move useful repo-specific behavior to .seo/adapters/ or rerun with --force when replacement is intentional.",
  );
  process.exit(1);
}

rmSync(targetSkillRoot, { recursive: true, force: true });
mkdirSync(targetSkillRoot, { recursive: true });
for (const file of files) copyFile(file, targetSkillRoot);

if (writeNotes && riskyReplacement) writeInstallNotes(resolvedTargetRoot, plan);
