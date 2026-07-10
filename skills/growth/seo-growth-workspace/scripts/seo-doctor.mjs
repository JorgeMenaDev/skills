#!/usr/bin/env node

// seo-doctor.mjs — read-only preflight for the seo-growth-workspace skill.
// Inspects, NEVER writes. Run it before scripts/bootstrap-seo-workspace.mjs
// and before every step of references/migrate-uninstall.md.

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const CANONICAL_FILES = ["backlog.md", "log.md", "audit.md", "strategy.md"];
const LEGACY_SIGNATURE_MIN = 3; // keep in sync with bootstrap-seo-workspace.mjs
const INSTALL_SURFACES = [
  ".agents/skills/seo-growth-workspace",
  ".claude/skills/seo-growth-workspace",
  "skills/seo-growth-workspace",
  ".commandcode/skills/seo-growth-workspace",
];
const DOC_FILES = ["AGENTS.md", "CLAUDE.md", "README.md"];
const SKIP_DIRS = new Set([".git", "node_modules"]);

function usage() {
  return `Usage:
  node seo-doctor.mjs [root] [--site <slug>] [--domain <host>]
                      [--search-roots <dir,dir,...>] [--format md|json]

Read-only preflight for bootstrap, migration, and uninstall. Inspects, never
writes. Bootstrap and migration MUST run this first and resolve every finding
with an explicit create / adopt / migrate decision.

Reports:
  target      The workspace at <root>/.seo (or <root>/.seo/sites/<slug> with
              --site): none | standalone | hub | hub-site | legacy-standalone
              (no config.json but >=${LEGACY_SIGNATURE_MIN} of ${CANONICAL_FILES.join("/")}) |
              unrecognized (a .seo/ with neither config.json nor that
              signature) | invalid-config.
  candidates  OTHER workspaces that may hold the same site's state: every
              workspace found under --search-roots (default: the target root
              and its parent directory), plus any row in a reachable registry
              (<root>/.seo/registry.md, <root>/.agents/seo/REGISTRY.md, or a
              scanned hub's registry.md) whose Site column matches --domain.
              Site identity = normalized hostname: lowercase, with scheme,
              path, port, "sc-domain:", and one leading "www." stripped —
              anything else is a different site.
  installs    Skill copies at the four install surfaces (${INSTALL_SURFACES.map((s) => s.split("/")[0]).join(", ")}),
              including symlinks and whether their targets exist.
  docs        .seo/ or seo-growth-workspace mentions in the root's
              ${DOC_FILES.join("/")} (stale when the root has no workspace).
  registry    For a hub target: sites/<slug> folders absent from registry.md
              (REGISTRATION PENDING) and rows pointing at missing workspaces.

Exit codes: 0 clean, 1 findings, 2 usage or read error.`;
}

function parseArgs(argv) {
  const options = {
    root: null,
    site: null,
    domain: null,
    searchRoots: null,
    format: "md",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (["--site", "--domain", "--search-roots", "--format"].includes(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}\n\n${usage()}`);
      }
      if (arg === "--site") options.site = value;
      else if (arg === "--domain") options.domain = value;
      else if (arg === "--search-roots") {
        options.searchRoots = value.split(",").map((p) => p.trim()).filter(Boolean);
      } else options.format = value;
      i += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag ${arg}\n\n${usage()}`);
    } else if (options.root === null) {
      options.root = arg;
    } else {
      throw new Error(`Unexpected extra argument ${arg}\n\n${usage()}`);
    }
  }
  if (options.format !== "md" && options.format !== "json") {
    throw new Error(`Unknown --format ${options.format} (expected md or json)\n\n${usage()}`);
  }
  return options;
}

function expandHome(input) {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function safeRealpath(p) {
  try {
    return realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

function safeRead(file) {
  try {
    return readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

function childDirs(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((entry) => !SKIP_DIRS.has(entry))
    .map((entry) => path.join(dir, entry))
    .filter((p) => isDirectory(p));
}

// Site identity: normalized hostname. Lowercase; scheme, path, port,
// "sc-domain:", and one leading "www." stripped. Anything else differs.
function normalizeHost(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .replace(/^www\./, "");
}

function canonicalIn(dir) {
  return CANONICAL_FILES.filter((file) => existsSync(path.join(dir, file)));
}

// --- registry parsing (matches portfolio-status.mjs conventions) ---

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isDivider(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function workspacePath(cell) {
  const quoted = cell.match(/`([^`]+)`/);
  return (quoted ? quoted[1] : cell).trim();
}

function parseRegistryRows(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    const cells = splitRow(line);
    if (isDivider(cells) || cells.length < 2) continue;
    const site = cells[0];
    if (!site || site.toLowerCase() === "site") continue;
    rows.push({ site, workspaceRaw: cells[1] ?? "" });
  }
  return rows;
}

// A registry root resolves to a workspace the same way portfolio-status.mjs
// does: root/.seo when present, else the root itself when it already holds
// backlog.md or log.md (a hub site folder). Neither shape -> null.
function resolveWorkspaceDirLike(rootDir) {
  const nested = path.join(rootDir, ".seo");
  if (isDirectory(nested)) return nested;
  if (
    existsSync(path.join(rootDir, "backlog.md")) ||
    existsSync(path.join(rootDir, "log.md"))
  ) {
    return rootDir;
  }
  return null;
}

// --- classification ---

function classifySeoDir(seoDir) {
  const canonicalPresent = canonicalIn(seoDir);
  const configPath = path.join(seoDir, "config.json");
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, "utf-8"));
      if (parsed.mode === "standalone" || parsed.mode === "hub") {
        return { classification: parsed.mode, mode: parsed.mode, canonicalPresent, config: parsed };
      }
      return {
        classification: "invalid-config",
        mode: null,
        canonicalPresent,
        configError: `unknown mode ${JSON.stringify(parsed.mode)}`,
      };
    } catch (error) {
      return { classification: "invalid-config", mode: null, canonicalPresent, configError: error.message };
    }
  }
  return {
    classification:
      canonicalPresent.length >= LEGACY_SIGNATURE_MIN ? "legacy-standalone" : "unrecognized",
    mode: null,
    canonicalPresent,
  };
}

// --- discovery ---

function scanWorkspaces(searchRoots) {
  const workspaces = new Map(); // realpath -> record
  const registries = [];
  const visited = new Set();
  for (const rootDir of searchRoots) {
    for (const dir of [rootDir, ...childDirs(rootDir)]) {
      const key = safeRealpath(dir);
      if (visited.has(key)) continue;
      visited.add(key);
      const seoDir = path.join(dir, ".seo");
      if (!isDirectory(seoDir)) continue;
      const classified = classifySeoDir(seoDir);
      if (classified.classification === "hub") {
        const registryPath = path.join(seoDir, "registry.md");
        if (existsSync(registryPath)) registries.push(registryPath);
        for (const siteDir of childDirs(path.join(seoDir, "sites"))) {
          workspaces.set(safeRealpath(siteDir), {
            workspaceDir: siteDir,
            classification: "hub-site",
            hub: seoDir,
            canonicalPresent: canonicalIn(siteDir),
          });
        }
        continue; // the hub itself is routing state, not a candidate workspace
      }
      workspaces.set(safeRealpath(seoDir), {
        workspaceDir: seoDir,
        classification: classified.classification,
        canonicalPresent: classified.canonicalPresent,
      });
    }
  }
  return { workspaces, registries };
}

function inspectInstalls(root) {
  const installs = [];
  for (const surface of INSTALL_SURFACES) {
    const absolute = path.join(root, surface);
    let stats;
    try {
      stats = lstatSync(absolute);
    } catch {
      continue;
    }
    const record = {
      surface,
      path: absolute,
      symlink: stats.isSymbolicLink(),
      symlinkTarget: null,
      targetExists: true,
    };
    if (record.symlink) {
      try {
        record.symlinkTarget = readlinkSync(absolute);
      } catch {
        record.symlinkTarget = null;
      }
      const resolved = record.symlinkTarget
        ? path.resolve(path.dirname(absolute), record.symlinkTarget)
        : null;
      record.targetExists = resolved ? existsSync(resolved) : false;
    }
    installs.push(record);
  }
  return installs;
}

function inspectDocs(root) {
  const pattern = /\.seo\/|seo-growth-workspace/g;
  return DOC_FILES.flatMap((file) => {
    const text = safeRead(path.join(root, file));
    if (text === null) return [];
    const mentions = text.match(pattern)?.length ?? 0;
    return mentions === 0 ? [] : [{ file, mentions }];
  });
}

// --- diagnosis ---

function diagnose(options) {
  const root = path.resolve(expandHome(options.root ?? process.cwd()));
  const seoDir = path.join(root, ".seo");
  const findings = [];
  const flag = (message) => findings.push(message);

  // (a) target workspace + mode/back-compat classification.
  let hubSeoDir = null;
  let rootClassification = "none";
  let target = { workspaceDir: null, classification: "none", mode: null, canonicalPresent: [] };
  if (isDirectory(seoDir)) {
    const classified = classifySeoDir(seoDir);
    rootClassification = classified.classification;
    if (classified.classification === "hub") hubSeoDir = seoDir;
    target = { workspaceDir: seoDir, ...classified };
  }
  if (options.site) {
    if (hubSeoDir === null) {
      flag(`--site ${options.site}: ${seoDir} is not a hub (${rootClassification}).`);
    } else {
      const siteDir = path.join(hubSeoDir, "sites", options.site);
      if (isDirectory(siteDir)) {
        target = {
          workspaceDir: siteDir,
          classification: "hub-site",
          mode: "hub",
          canonicalPresent: canonicalIn(siteDir),
        };
      } else {
        target = { workspaceDir: siteDir, classification: "none", mode: "hub", canonicalPresent: [] };
        flag(`--site ${options.site}: no site folder at ${siteDir}.`);
      }
    }
  }
  if (target.classification === "unrecognized") {
    flag(
      `${target.workspaceDir} has no config.json and only ${target.canonicalPresent.length}/${CANONICAL_FILES.length} ` +
        `canonical files (${CANONICAL_FILES.join("/")}) — not adoptable as a legacy workspace; ` +
        `decide create/adopt/migrate (references/migrate-uninstall.md).`,
    );
  }
  if (target.classification === "invalid-config") {
    flag(
      `${path.join(target.workspaceDir, "config.json")} is unreadable or has an unknown mode: ${target.configError}.`,
    );
  }

  // Hub registry cross-checks: unregistered site folders + rows without workspaces.
  let unregisteredSites = [];
  const hubRows = [];
  if (hubSeoDir) {
    const registryPath = path.join(hubSeoDir, "registry.md");
    const registryText = safeRead(registryPath);
    if (registryText === null) {
      flag(`Hub ${hubSeoDir} has no readable registry.md.`);
    } else {
      const registryDir = path.dirname(registryPath);
      for (const row of parseRegistryRows(registryText)) {
        const cell = workspacePath(row.workspaceRaw);
        if (!cell || cell.toLowerCase() === "unknown") {
          hubRows.push({ ...row, resolvedRoot: null });
          continue;
        }
        const resolvedRoot = path.resolve(registryDir, expandHome(cell));
        hubRows.push({ ...row, resolvedRoot });
        if (resolveWorkspaceDirLike(resolvedRoot) === null) {
          flag(`Registry row "${row.site}" points at a missing workspace (${row.workspaceRaw}).`);
        }
      }
      const registeredRoots = new Set(
        hubRows.filter((row) => row.resolvedRoot).map((row) => safeRealpath(row.resolvedRoot)),
      );
      unregisteredSites = childDirs(path.join(hubSeoDir, "sites"))
        .map((dir) => path.basename(dir))
        .filter((slug) => !registeredRoots.has(safeRealpath(path.join(hubSeoDir, "sites", slug))));
      for (const slug of unregisteredSites) {
        flag(
          `sites/${slug} is not in registry.md — REGISTRATION PENDING: add its row ` +
            `(references/portfolio-registry.md Row Shape).`,
        );
      }
    }
  }

  // Derive the domain from the target hub registry when --site is given without --domain.
  let domain = options.domain ?? null;
  if (!domain && options.site && hubSeoDir) {
    const siteKey = safeRealpath(path.join(hubSeoDir, "sites", options.site));
    const row = hubRows.find((r) => r.resolvedRoot && safeRealpath(r.resolvedRoot) === siteKey);
    if (row) domain = row.site;
  }
  const normalizedDomain = domain ? normalizeHost(domain) : null;

  // (b) other candidate workspaces: search-roots scan + registry rows matching the domain.
  const searchRoots = (options.searchRoots ?? [root, path.dirname(root)]).map((p) =>
    path.resolve(expandHome(p)),
  );
  const { workspaces, registries: scannedRegistries } = scanWorkspaces(searchRoots);
  const registryPaths = [
    path.join(root, ".seo/registry.md"),
    path.join(root, ".agents/seo/REGISTRY.md"),
    ...scannedRegistries,
  ].filter((p) => existsSync(p));

  const targetKey = target.workspaceDir ? safeRealpath(target.workspaceDir) : null;
  const hubKey = hubSeoDir ? safeRealpath(hubSeoDir) : null;
  const candidates = new Map();

  for (const [key, record] of workspaces) {
    if (key === targetKey) continue;
    // Site folders inside the target hub are parallel sites, not competing
    // copies; they only become candidates through a domain-matched registry row.
    if (record.hub && hubKey && safeRealpath(record.hub) === hubKey) continue;
    candidates.set(key, {
      workspaceDir: record.workspaceDir,
      classification: record.classification,
      canonicalPresent: record.canonicalPresent,
      exists: true,
      via: ["scan"],
      registry: null,
      registrySite: null,
    });
  }

  if (normalizedDomain) {
    for (const registryPath of new Set(registryPaths.map((p) => safeRealpath(p)))) {
      const text = safeRead(registryPath);
      if (text === null) continue;
      const registryDir = path.dirname(registryPath);
      for (const row of parseRegistryRows(text)) {
        if (normalizeHost(row.site) !== normalizedDomain) continue;
        const cell = workspacePath(row.workspaceRaw);
        if (!cell || cell.toLowerCase() === "unknown") {
          candidates.set(`registry:${registryPath}:${row.site}`, {
            workspaceDir: null,
            classification: "unknown-root",
            canonicalPresent: [],
            exists: false,
            via: ["registry"],
            registry: registryPath,
            registrySite: row.site,
          });
          continue;
        }
        const resolvedRoot = path.resolve(registryDir, expandHome(cell));
        const workspaceDir = resolveWorkspaceDirLike(resolvedRoot);
        const key = safeRealpath(workspaceDir ?? resolvedRoot);
        if (key === targetKey) continue; // the target itself, properly registered
        const existing = candidates.get(key);
        if (existing) {
          if (!existing.via.includes("registry")) existing.via.push("registry");
          existing.registry = registryPath;
          existing.registrySite = row.site;
          continue;
        }
        candidates.set(key, {
          workspaceDir: workspaceDir ?? resolvedRoot,
          classification: workspaceDir
            ? path.basename(workspaceDir) === ".seo"
              ? classifySeoDir(workspaceDir).classification
              : "hub-site"
            : "missing",
          canonicalPresent: workspaceDir ? canonicalIn(workspaceDir) : [],
          exists: workspaceDir !== null,
          via: ["registry"],
          registry: registryPath,
          registrySite: row.site,
        });
      }
    }
  }

  for (const candidate of candidates.values()) {
    const where =
      candidate.workspaceDir ??
      `registry ${candidate.registry} row "${candidate.registrySite}" (workspace root unknown)`;
    flag(
      `Candidate workspace at ${where} (via ${candidate.via.join("+")}` +
        `${candidate.registrySite ? `, registry site ${candidate.registrySite}` : ""}, ` +
        `${candidate.canonicalPresent.length}/${CANONICAL_FILES.length} canonical files) — ` +
        `decide create/adopt/migrate before bootstrapping.`,
    );
  }

  // (c) skill install copies across the four surfaces.
  const installs = inspectInstalls(root);
  const healthyCopies = new Set();
  for (const install of installs) {
    if (install.symlink && !install.targetExists) {
      flag(
        `Dangling symlink skill copy at ${install.path} -> ${install.symlinkTarget ?? "?"} (target missing).`,
      );
      continue;
    }
    healthyCopies.add(safeRealpath(install.path));
  }
  if (healthyCopies.size > 1) {
    flag(
      `Multiple skill install copies (${healthyCopies.size} distinct) under ${root} — ` +
        `consolidate to one surface (references/migrate-uninstall.md).`,
    );
  }

  // (d) doc pointers — stale only when the root has no (adoptable) workspace.
  const staleDocs = rootClassification === "none" || rootClassification === "unrecognized";
  const docMentions = inspectDocs(root).map((entry) => ({ ...entry, stale: staleDocs }));
  for (const entry of docMentions) {
    if (!entry.stale) continue;
    flag(
      `${entry.file} mentions .seo/ or seo-growth-workspace (${entry.mentions}x) but ${root} ` +
        `has no adoptable workspace — stale pointer.`,
    );
  }

  return {
    root,
    generated: new Date().toISOString(),
    site: options.site,
    domain,
    normalizedDomain,
    searchRoots,
    registries: registryPaths,
    target,
    candidates: [...candidates.values()],
    installs,
    docMentions,
    unregisteredSites,
    findings,
    clean: findings.length === 0,
  };
}

// --- rendering ---

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

function renderMarkdown(result) {
  const lines = [
    "# SEO doctor",
    "",
    `Generated: ${result.generated}`,
    `Root: ${result.root}`,
  ];
  if (result.domain) lines.push(`Domain: ${result.domain} (normalized: ${result.normalizedDomain})`);
  if (result.site) lines.push(`Site slug: ${result.site}`);
  lines.push(`Search roots: ${result.searchRoots.join(", ")}`);
  lines.push("", "## Target", "");
  lines.push(`- Workspace: ${result.target.workspaceDir ?? "none"}`);
  lines.push(`- Classification: ${result.target.classification}`);
  lines.push(
    `- Canonical files: ${result.target.canonicalPresent.length}/${CANONICAL_FILES.length}` +
      (result.target.canonicalPresent.length ? ` (${result.target.canonicalPresent.join(", ")})` : ""),
  );
  lines.push("", "## Candidate workspaces", "");
  lines.push(
    result.candidates.length === 0
      ? "None found."
      : markdownTable(
          ["Workspace", "Classification", "Canonical", "Via", "Registry site"],
          result.candidates.map((c) => [
            c.workspaceDir ?? "unknown",
            c.classification,
            `${c.canonicalPresent.length}/${CANONICAL_FILES.length}`,
            c.via.join("+"),
            c.registrySite ?? "—",
          ]),
        ),
  );
  lines.push("", "## Skill install copies", "");
  lines.push(
    result.installs.length === 0
      ? "None found."
      : markdownTable(
          ["Surface", "Symlink", "Target exists"],
          result.installs.map((i) => [
            i.surface,
            i.symlink ? `yes -> ${i.symlinkTarget ?? "?"}` : "no",
            i.targetExists ? "yes" : "NO (dangling)",
          ]),
        ),
  );
  lines.push("", "## Doc mentions", "");
  lines.push(
    result.docMentions.length === 0
      ? "None found."
      : markdownTable(
          ["File", "Mentions", "Stale"],
          result.docMentions.map((d) => [d.file, String(d.mentions), d.stale ? "yes" : "no"]),
        ),
  );
  if (result.unregisteredSites.length > 0) {
    lines.push("", "## Unregistered hub site folders", "");
    for (const slug of result.unregisteredSites) lines.push(`- sites/${slug} (REGISTRATION PENDING)`);
  }
  lines.push("", "## Findings", "");
  lines.push(
    result.clean
      ? "Clean — no findings."
      : result.findings.map((finding) => `- ${finding}`).join("\n"),
  );
  if (!result.clean) {
    lines.push(
      "",
      `${result.findings.length} finding(s). Make an explicit create/adopt/migrate decision before mutating (references/migrate-uninstall.md).`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return 0;
  }
  const result = diagnose(options);
  process.stdout.write(
    options.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderMarkdown(result),
  );
  return result.clean ? 0 : 1;
}

try {
  process.exit(main());
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
