#!/usr/bin/env node

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, "../../skills/growth/seo-growth-workspace");
const STARTER = /^(?:(?:[A-Z_][A-Z0-9_]*=(?:"[^"]*"|'[^']*'|\S+))\s+)*(?:node|bun|npx|npm|pnpm|yarn|curl|git|gh|vercel|superaseo|python(?:3)?|sh|bash|(?:\.{0,2}\/|\/)[^\s]+|[^\s]+\.mjs)\b/;
const EXTERNAL_STARTER = /^(?:(?:[A-Z_][A-Z0-9_]*=\S+)\s+)*(?:bun|npx|npm|pnpm|yarn|curl|git|gh|vercel|superaseo|python(?:3)?|sh|bash|(?:\.{0,2}\/|\/))/;

function walk(root, relative = "") {
  return readdirSync(root).flatMap((entry) => {
    const absolute = path.join(root, entry);
    const next = path.join(relative, entry);
    return statSync(absolute).isDirectory() ? walk(absolute, next) : [next];
  });
}

function lex(command) {
  const tokens = [];
  let token = "";
  let quote = null;
  let escaped = false;
  for (const character of command) {
    if (escaped) {
      token += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else token += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }
    token += character;
  }
  if (escaped || quote) return { tokens, error: escaped ? "dangling escape" : "unclosed quote" };
  if (token) tokens.push(token);
  return { tokens, error: null };
}

function argv(tokens) {
  const firstCommand = tokens.findIndex((token) => !/^[A-Z_][A-Z0-9_]*=/.test(token));
  return firstCommand < 0 ? [] : tokens.slice(firstCommand + 1);
}

function secretArgv(tokens) {
  const args = argv(tokens);
  return args.find((token) => {
    if (/(?:sk_(?:live|test)|ya29\.|<(?:[^>]*(?:token|password|secret|api[-_]?key)[^>]*)>)/i.test(token)) return true;
    if (/^\$\{?[^\s}]*(?:token|password|secret|api_?key)/i.test(token)) return true;
    return /^--[^=]*(?:token|password|secret|api[-_]?key)(?![-_](?:file|path)|-stdin)(?:=|$)/i.test(token);
  });
}

function classify(command) {
  const parsed = lex(command);
  if (parsed.error) return { classification: "malformed", reason: parsed.error, tokens: parsed.tokens };
  const secret = secretArgv(parsed.tokens);
  if (secret) return { classification: "malformed", reason: `secret-looking argv: ${secret}`, tokens: parsed.tokens };
  if (
    /\bnode\s+(?:"|')?(?:\.\/)?scripts\//.test(command) ||
    (/^(?:\.\/)?scripts\/[^\s]+\.mjs\s+--/.test(command) && !/\$\{?SKILL_DIR/.test(command))
  ) {
    return { classification: "malformed", reason: "CWD-dependent script path", tokens: parsed.tokens };
  }
  if (/\.\.\.|<[^>]+>|\[[^\]]+\]/.test(command) || EXTERNAL_STARTER.test(command) || /[|;&]/.test(command)) {
    return { classification: "illustrative", reason: "requires substitution, external tool, or shell composition", tokens: parsed.tokens };
  }
  if (/\bnode\b/.test(command) && /\$\{?SKILL_DIR/.test(command) && /--help\b/.test(command)) {
    return { classification: "executable", reason: "dependency-free bundled help command", tokens: parsed.tokens };
  }
  return { classification: "illustrative", reason: "documented operator command", tokens: parsed.tokens };
}

function commandLines(block) {
  const output = [];
  let current = "";
  let startLine = 1;
  for (const [index, raw] of block.split(/\r?\n/).entries()) {
    const line = raw.trim().replace(/^\$\s+/, "");
    if (!line || line.startsWith("#")) continue;
    if (!current) startLine = index + 1;
    current = current ? `${current} ${line}` : line;
    if (current.endsWith("\\")) {
      current = current.slice(0, -1).trimEnd();
      continue;
    }
    if (STARTER.test(current)) output.push({ command: current, line: startLine });
    current = "";
  }
  if (current && STARTER.test(current)) output.push({ command: current, line: startLine });
  return output;
}

function extract(file) {
  const absolute = path.join(skillRoot, file);
  const text = readFileSync(absolute, "utf-8");
  const entries = [];
  const fencedRanges = [];
  const fence = /```[^\n]*\n([\s\S]*?)```/g;
  for (const match of text.matchAll(fence)) {
    fencedRanges.push([match.index, match.index + match[0].length]);
    const baseLine = text.slice(0, match.index).split(/\r?\n/).length;
    for (const entry of commandLines(match[1])) {
      entries.push({ file, line: baseLine + entry.line, surface: "fence", command: entry.command });
    }
  }
  const inline = /`([^`\n]+)`/g;
  for (const match of text.matchAll(inline)) {
    if (fencedRanges.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const command = match[1].trim().replace(/^\$\s+/, "");
    if (!STARTER.test(command)) continue;
    entries.push({ file, line: text.slice(0, match.index).split(/\r?\n/).length, surface: "inline", command });
  }
  return entries;
}

function inventory() {
  const files = ["SKILL.md", ...walk(path.join(skillRoot, "references"), "references"), ...walk(path.join(skillRoot, "templates"), "templates")]
    .filter((file) => file.endsWith(".md"));
  const seen = new Set();
  const entries = files.flatMap(extract).filter((entry) => {
    const key = `${entry.file}:${entry.line}:${entry.command}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((entry) => ({ ...entry, ...classify(entry.command) }));
  const counts = Object.fromEntries(["executable", "illustrative", "malformed"].map((kind) => [kind, entries.filter((entry) => entry.classification === kind).length]));
  return { generatedAt: new Date().toISOString(), skillRoot, counts, entries };
}

function verify(result) {
  const failures = result.entries.filter((entry) => entry.classification === "malformed").map((entry) => `${entry.file}:${entry.line}: ${entry.reason}: ${entry.command}`);
  const contractCases = [
    ["superaseo login <sk_live_example>", "malformed"],
    ["superaseo integrations set-webhook --access-token <token>", "malformed"],
    ["SUPERASEO_API_KEY_FILE=/secure/key superaseo whoami", "illustrative"],
    ['node "$SKILL_DIR/scripts/seo-doctor.mjs" --help', "executable"],
  ].map(([command, expected]) => ({ command, expected, actual: classify(command).classification }));
  for (const item of contractCases) {
    if (item.actual !== item.expected) failures.push(`classifier contract: expected ${item.expected}, got ${item.actual}: ${item.command}`);
  }
  const foreignCwd = mkdtempSync(path.join(tmpdir(), "seo-command-cwd-"));
  const workspace = mkdtempSync(path.join(tmpdir(), "seo-command-site-"));
  const targetRepo = mkdtempSync(path.join(tmpdir(), "seo-command-repo-"));
  const matrix = [];
  try {
    for (const entry of result.entries.filter((item) => item.classification === "executable")) {
      const command = entry.command
        .replace(/\$\{SKILL_DIR\}|\$SKILL_DIR/g, skillRoot)
        .replace(/\$\{SITE_WORKSPACE\}|\$SITE_WORKSPACE/g, workspace)
        .replace(/\$\{TARGET_REPO\}|\$TARGET_REPO/g, targetRepo);
      const run = spawnSync("/bin/sh", ["-c", command], { cwd: foreignCwd, encoding: "utf-8", env: { ...process.env, SKILL_DIR: skillRoot, SITE_WORKSPACE: workspace, TARGET_REPO: targetRepo } });
      matrix.push({ file: entry.file, line: entry.line, cwd: foreignCwd, command, status: run.status });
      if (run.status !== 0) failures.push(`${entry.file}:${entry.line}: foreign-CWD exit ${run.status}: ${run.stderr || run.stdout}`);
    }
  } finally {
    rmSync(foreignCwd, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
    rmSync(targetRepo, { recursive: true, force: true });
  }
  return { pass: failures.length === 0, failures, contractCases, matrix };
}

const result = inventory();
if (process.argv.includes("--verify")) result.verification = verify(result);
console.log(JSON.stringify(result, null, 2));
process.exit(result.verification && !result.verification.pass ? 1 : 0);
