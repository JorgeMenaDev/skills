import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import path from "node:path";

export const CANONICAL_FILES = ["backlog.md", "log.md", "audit.md", "strategy.md"];
export const LEGACY_SIGNATURE_MIN = 3;
export const SITE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export const GENERATED_WORKSPACE_FILES = new Set([
  "README.md",
  "context.md",
  "backlog.md",
  "log.md",
  "strategy.md",
  "audit.md",
  "taxonomy.md",
  "backlinks/summary.md",
  "backlinks/work-log.md",
]);

export const GENERATED_WORKSPACE_DIRS = new Set(["reports", "scripts", "pseo"]);

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function safeRealpath(input) {
  try {
    return realpathSync(input);
  } catch {
    const suffix = [];
    let cursor = path.resolve(input);
    while (!existsSync(cursor)) {
      const parent = path.dirname(cursor);
      if (parent === cursor) return path.resolve(input);
      suffix.unshift(path.basename(cursor));
      cursor = parent;
    }
    return path.join(realpathSync(cursor), ...suffix);
  }
}

export function isWithin(candidate, parent) {
  const relative = path.relative(safeRealpath(parent), safeRealpath(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function normalizeHost(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

function h1Contains(text, phrase) {
  return text.split(/\r?\n/).some((line) => /^#\s+/.test(line) && line.toLowerCase().includes(phrase));
}

function headingContains(text, phrases) {
  return text
    .split(/\r?\n/)
    .some((line) => /^#{2,6}\s+/.test(line) && phrases.some((phrase) => line.toLowerCase().includes(phrase)));
}

function hasStatusTable(text) {
  const lines = text.split(/\r?\n/);
  return lines.some((line, index) => {
    if (!/^\s*\|/.test(line) || !/\bID\b/i.test(line)) return false;
    const context = lines.slice(Math.max(0, index - 5), index + 1).join("\n");
    return /(?:^|\n)#{2,6}\s+(?:Ready|In progress|Blocked|Done)\b/im.test(context);
  });
}

export function recognizeLegacyFile(file, text) {
  if (typeof text !== "string") return false;
  if (file === "backlog.md") {
    return (
      h1Contains(text, "seo backlog") &&
      /\bCurrent focus\b/i.test(text) &&
      (headingContains(text, ["ready", "in progress", "blocked", "done"]) || hasStatusTable(text)) &&
      (!/^\s*\|.*\|\s*$/m.test(text) || hasStatusTable(text))
    );
  }
  if (file === "log.md") {
    if (h1Contains(text, "seo operating log")) return true;
    const datedH2 = /^##\s+\d{4}-\d{2}-\d{2}\b/m.test(text);
    return datedH2 && /\b(?:SEO|action|evidence|verify|verified|deployed|indexed|ranking|traffic)\b/i.test(text);
  }
  if (file === "audit.md") {
    return (
      h1Contains(text, "seo audit") &&
      (headingContains(text, ["findings"]) || /^\s*\|.*\b(?:Finding|Evidence)\b.*\|\s*$/im.test(text))
    );
  }
  if (file === "strategy.md") {
    return h1Contains(text, "seo strategy") && headingContains(text, ["business context", "tooling", "decisions"]);
  }
  return false;
}

export function recognizeLegacyWorkspace(workspaceDir) {
  const files = CANONICAL_FILES.map((file) => {
    const absolute = path.join(workspaceDir, file);
    if (!existsSync(absolute)) return { file, present: false, recognized: false };
    try {
      return { file, present: true, recognized: recognizeLegacyFile(file, readFileSync(absolute, "utf-8")) };
    } catch {
      return { file, present: true, recognized: false };
    }
  });
  return {
    files,
    present: files.filter((entry) => entry.present).map((entry) => entry.file),
    recognized: files.filter((entry) => entry.recognized).map((entry) => entry.file),
  };
}

export function classifyWorkspace(workspaceDir, { hubSite = false } = {}) {
  if (!existsSync(workspaceDir)) {
    return { classification: "none", mode: hubSite ? "hub" : null, present: [], recognized: [], config: null };
  }
  const legacy = recognizeLegacyWorkspace(workspaceDir);
  const configPath = path.join(workspaceDir, "config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      if (config.mode !== "standalone" && config.mode !== "hub") {
        return { classification: "invalid-config", mode: null, ...legacy, config, configError: `unknown mode ${JSON.stringify(config.mode)}` };
      }
      if (
        config.workspaceSchemaVersion !== undefined &&
        (!Number.isInteger(config.workspaceSchemaVersion) || config.workspaceSchemaVersion !== 1)
      ) {
        return {
          classification: config.workspaceSchemaVersion > 1 ? "unsupported-schema" : "invalid-config",
          mode: config.mode,
          ...legacy,
          config,
          configError: `workspaceSchemaVersion ${JSON.stringify(config.workspaceSchemaVersion)} is not schema 1`,
        };
      }
      return { classification: config.mode, mode: config.mode, ...legacy, config };
    } catch (error) {
      return { classification: "invalid-config", mode: null, ...legacy, config: null, configError: error.message };
    }
  }
  if (hubSite && legacy.recognized.length >= LEGACY_SIGNATURE_MIN) {
    return { classification: "hub-site", mode: "hub", ...legacy, config: null };
  }
  return {
    classification: legacy.recognized.length >= LEGACY_SIGNATURE_MIN ? "legacy-standalone" : "unrecognized",
    mode: null,
    ...legacy,
    config: null,
  };
}

function fingerprintEntry(absolute, relative, policy) {
  let stats;
  try {
    stats = lstatSync(absolute);
  } catch {
    return [`${relative}:missing`];
  }
  const mode = stats.mode & 0o777;
  if (stats.isSymbolicLink()) return [`${relative}:symlink:${readlinkSync(absolute)}:${mode.toString(8)}`];
  if (stats.isDirectory()) {
    const head = `${relative}:dir:${mode.toString(8)}`;
    if (policy === "self") return [head];
    const children = readdirSync(absolute).sort().flatMap((entry) =>
      fingerprintEntry(path.join(absolute, entry), path.join(relative, entry), policy),
    );
    return [head, ...children];
  }
  const stat = `${relative}:file:${stats.size}:${Math.trunc(stats.mtimeMs)}:${mode.toString(8)}`;
  if (policy === "stat") return [stat];
  return [stat, sha256(readFileSync(absolute))];
}

export function fingerprintPath(input, policy = "content") {
  const absolute = path.resolve(input);
  if (policy === "listing") {
    try {
      const roots = [absolute, ...readdirSync(absolute).sort().map((entry) => path.join(absolute, entry))];
      const rows = roots.flatMap((candidate) => {
        const seo = path.join(candidate, ".seo");
        const legacyRegistry = path.join(candidate, ".agents/seo/REGISTRY.md");
        const signals = [];
        if (existsSync(seo)) signals.push(`${path.relative(absolute, seo) || ".seo"}:${fingerprintEntry(seo, ".", "stat").join("|")}`);
        if (existsSync(legacyRegistry)) signals.push(`${path.relative(absolute, legacyRegistry)}:${fingerprintEntry(legacyRegistry, ".", "content").join("|")}`);
        return signals;
      });
      return sha256(rows.join("\n"));
    } catch {
      return sha256("missing");
    }
  }
  return sha256(fingerprintEntry(absolute, ".", policy).join("\n"));
}

export function makeSourceRecord(input, policy = "content") {
  const absolute = path.resolve(input);
  return { path: absolute, policy, hash: fingerprintPath(absolute, policy) };
}

export function verifySourceRecords(records) {
  return records.flatMap((record) => {
    const actual = fingerprintPath(record.path, record.policy);
    return actual === record.hash ? [] : [{ ...record, actual }];
  });
}

export function planHash(plan) {
  const { hash: _hash, ...payload } = plan;
  return sha256(stableJson(payload));
}

export function missingGeneratedArtifacts(workspaceDir) {
  return [
    ...[...GENERATED_WORKSPACE_FILES].filter((file) => !existsSync(path.join(workspaceDir, file))),
    ...[...GENERATED_WORKSPACE_DIRS].filter((dir) => !existsSync(path.join(workspaceDir, dir))),
  ].sort();
}

export function skillFolderHash(skillDir) {
  const files = [];
  const collect = (current) => {
    for (const entry of readdirSync(current).sort((a, b) => a.localeCompare(b))) {
      if (entry === ".git" || entry === "node_modules") continue;
      const absolute = path.join(current, entry);
      const stats = lstatSync(absolute);
      if (stats.isDirectory()) collect(absolute);
      else if (stats.isFile()) files.push({ relative: path.relative(skillDir, absolute).split(path.sep).join("/"), content: readFileSync(absolute) });
    }
  };
  collect(skillDir);
  files.sort((a, b) => a.relative.localeCompare(b.relative));
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file.relative);
    digest.update(file.content);
  }
  return digest.digest("hex");
}
