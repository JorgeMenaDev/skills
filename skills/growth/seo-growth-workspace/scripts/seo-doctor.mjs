#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CANONICAL_FILES,
  GENERATED_WORKSPACE_DIRS,
  GENERATED_WORKSPACE_FILES,
  LEGACY_SIGNATURE_MIN,
  SITE_ID_PATTERN,
  classifyWorkspace,
  fingerprintPath,
  isWithin,
  makeSourceRecord,
  missingGeneratedArtifacts,
  normalizeHost,
  planHash,
  safeRealpath,
  sha256,
  skillFolderHash,
  stableJson,
} from "./workspace-state.mjs";

const PLAN_TTL_MS = 15 * 60 * 1000;
const INSTALL_SURFACES = [
  ".agents/skills/seo-growth-workspace",
  ".claude/skills/seo-growth-workspace",
  "skills/seo-growth-workspace",
  ".commandcode/skills/seo-growth-workspace",
];
const DOC_FILES = ["AGENTS.md", "CLAUDE.md", "README.md"];
const DECISIONS = new Set(["unresolved", "create", "adopt", "migrate", "repair"]);

function usage() {
  return `Usage:
  node seo-doctor.mjs [root] [--site <id>] [--domain <host>]
    [--search-root <dir>]... [--plan-output <outside-scan-roots.json>]
    [--decision create|adopt|migrate|repair] [--workspace <path>]
    [--repair-files <comma,separated,paths>] [--format md|json]

Lifecycle preflight for schema-1 workspaces. It reads scanned state and writes nothing
unless --plan-output is supplied. That one plan path must be outside every scanned root.
Plans expire after 15 minutes and bind the root, domain, search roots, source fingerprints,
decision, chosen workspace, and repair allowlist.

The canonical hub registry (.seo/registry.md) routes. The legacy registry
(.agents/seo/REGISTRY.md) is inventory only. Bootstrap consumes only reviewed create,
adopt, or repair plans; migrate is a terminal manual outcome in v3.1.

Exit codes: 0 no findings (or an approved plan), 1 findings/unapproved plan, 2 usage/read error.`;
}

function parseArgs(argv) {
  const options = {
    root: null,
    site: null,
    domain: null,
    searchRoots: [],
    planOutput: null,
    decision: "unresolved",
    workspace: null,
    repairFiles: [],
    format: "md",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--search-roots") {
      const value = argv[++i];
      if (!value) throw new Error(`Missing value for ${arg}\n\n${usage()}`);
      options.searchRoots.push(...value.split(",").map((item) => item.trim()).filter(Boolean));
      continue;
    }
    if (["--site", "--domain", "--search-root", "--plan-output", "--decision", "--workspace", "--repair-files", "--format"].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}\n\n${usage()}`);
      if (arg === "--site") options.site = value;
      else if (arg === "--domain") options.domain = value;
      else if (arg === "--search-root") options.searchRoots.push(value);
      else if (arg === "--plan-output") options.planOutput = value;
      else if (arg === "--decision") options.decision = value;
      else if (arg === "--workspace") options.workspace = value;
      else if (arg === "--repair-files") options.repairFiles = value.split(",").map((item) => item.trim()).filter(Boolean);
      else options.format = value;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown flag ${arg}\n\n${usage()}`);
    if (options.root === null) options.root = arg;
    else throw new Error(`Unexpected extra argument ${arg}\n\n${usage()}`);
  }
  if (!DECISIONS.has(options.decision)) throw new Error(`Invalid --decision ${options.decision}\n\n${usage()}`);
  if (!new Set(["md", "json"]).has(options.format)) throw new Error(`Invalid --format ${options.format}\n\n${usage()}`);
  if (options.repairFiles.length > 0 && options.decision !== "repair") {
    throw new Error("--repair-files is valid only with --decision repair");
  }
  return options;
}

function expandHome(input) {
  if (input === "~") return os.homedir();
  return input.startsWith("~/") ? path.join(os.homedir(), input.slice(2)) : input;
}

function isDirectory(input) {
  try {
    return statSync(input).isDirectory();
  } catch {
    return false;
  }
}

function childDirs(input) {
  try {
    return readdirSync(input)
      .filter((entry) => entry !== ".git" && entry !== "node_modules")
      .map((entry) => path.join(input, entry))
      .filter(isDirectory);
  } catch {
    return [];
  }
}

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

function cellValue(cell) {
  const quoted = String(cell ?? "").match(/`([^`]+)`/);
  return (quoted ? quoted[1] : String(cell ?? "")).trim();
}

function parseRegistry(registryPath, kind) {
  const text = readFileSync(registryPath, "utf-8");
  const table = text.split(/\r?\n/).filter((line) => line.trim().startsWith("|"));
  if (table.length < 2) return { path: registryPath, kind, rows: [], malformed: ["no parseable table"] };
  const header = splitRow(table[0]);
  const normalized = header.map((cell) => cell.toLowerCase());
  const siteIndex = normalized.findIndex((cell) => cell === "site" || cell === "site id");
  const rootIndex = normalized.findIndex((cell) => cell.includes("workspace root"));
  const credentialsIndex = normalized.findIndex((cell) => cell.includes("credential"));
  if (siteIndex < 0 || rootIndex < 0) {
    return { path: registryPath, kind, rows: [], malformed: ["missing Site or Workspace root column"] };
  }
  const malformed = [];
  const rows = [];
  for (const [index, line] of table.slice(1).entries()) {
    const cells = splitRow(line);
    if (isDivider(cells)) continue;
    if (cells.length !== header.length) {
      malformed.push(`line ${index + 2}: ${cells.length} cells; expected ${header.length}`);
      continue;
    }
    const site = cells[siteIndex];
    const workspaceRaw = cells[rootIndex];
    if (!site || !workspaceRaw) {
      malformed.push(`line ${index + 2}: empty site or workspace root`);
      continue;
    }
    rows.push({
      site,
      normalizedSite: normalizeHost(site),
      workspaceRaw,
      credentialsRaw: credentialsIndex >= 0 ? cells[credentialsIndex] : null,
      line: index + 2,
    });
  }
  return { path: registryPath, kind, rows, malformed };
}

function resolveRegistryWorkspace(registryPath, raw) {
  const value = cellValue(raw);
  if (!value || /^(?:unknown|none(?: yet)?)$/i.test(value)) return { root: null, workspace: null };
  const root = path.resolve(path.dirname(registryPath), expandHome(value.replace(/^dir:/, "")));
  if (isDirectory(path.join(root, ".seo"))) return { root, workspace: path.join(root, ".seo") };
  if (isDirectory(root) && CANONICAL_FILES.some((file) => existsSync(path.join(root, file)))) {
    return { root, workspace: root };
  }
  return { root, workspace: null };
}

function discover(searchRoots) {
  const workspaces = new Map();
  const canonicalRegistries = new Map();
  const legacyRegistries = new Map();
  const dirs = new Map();
  for (const searchRoot of searchRoots) {
    for (const dir of [searchRoot, ...childDirs(searchRoot)]) dirs.set(safeRealpath(dir), dir);
  }
  for (const dir of dirs.values()) {
    const seoDir = path.join(dir, ".seo");
    if (isDirectory(seoDir)) {
      const classified = classifyWorkspace(seoDir);
      if (classified.classification === "hub") {
        const registryPath = path.join(seoDir, "registry.md");
        if (existsSync(registryPath)) canonicalRegistries.set(safeRealpath(registryPath), registryPath);
        for (const siteDir of childDirs(path.join(seoDir, "sites"))) {
          workspaces.set(safeRealpath(siteDir), {
            workspaceDir: siteDir,
            hub: seoDir,
            ...classifyWorkspace(siteDir, { hubSite: true }),
          });
        }
      } else {
        workspaces.set(safeRealpath(seoDir), { workspaceDir: seoDir, hub: null, ...classified });
      }
    }
    const legacyPath = path.join(dir, ".agents/seo/REGISTRY.md");
    if (existsSync(legacyPath)) legacyRegistries.set(safeRealpath(legacyPath), legacyPath);
  }
  return {
    workspaces,
    canonicalRegistryPaths: [...canonicalRegistries.values()],
    legacyRegistryPaths: [...legacyRegistries.values()],
  };
}

function inspectInstalls(root) {
  return INSTALL_SURFACES.flatMap((surface) => {
    const absolute = path.join(root, surface);
    try {
      const stats = lstatSync(absolute);
      const symlink = stats.isSymbolicLink();
      const target = symlink ? readlinkSync(absolute) : null;
      const resolved = target ? path.resolve(path.dirname(absolute), target) : absolute;
      return [{ surface, path: absolute, symlink, target, targetExists: existsSync(resolved), realpath: existsSync(resolved) ? safeRealpath(resolved) : null }];
    } catch {
      return [];
    }
  });
}

function inspectDocs(root, rootClassification) {
  return DOC_FILES.flatMap((file) => {
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) return [];
    const text = readFileSync(absolute, "utf-8");
    const mentions = text.match(/\.seo\/|seo-growth-workspace/g)?.length ?? 0;
    return mentions ? [{ file, path: absolute, mentions, stale: new Set(["none", "unrecognized"]).has(rootClassification) }] : [];
  });
}

function credentialPath(registryPath, raw) {
  const value = cellValue(raw).replace(/^dir:/, "");
  if (!value || /^(?:unknown|none(?: yet)?|env:)/i.test(value)) return null;
  if (!/[/.~]/.test(value)) return null;
  return path.resolve(path.dirname(registryPath), expandHome(value));
}

function permissionFinding(input) {
  try {
    const stats = statSync(input);
    const mode = stats.mode & 0o777;
    return mode & 0o077 ? { path: input, mode: mode.toString(8).padStart(3, "0"), directory: stats.isDirectory() } : null;
  } catch {
    return null;
  }
}

function inspectGeneratedSymlinks(workspaceDir) {
  if (!workspaceDir || !existsSync(workspaceDir)) return [];
  const artifacts = [...GENERATED_WORKSPACE_FILES, ...GENERATED_WORKSPACE_DIRS];
  return artifacts.flatMap((relative) => {
    const absolute = path.join(workspaceDir, relative);
    try {
      if (!lstatSync(absolute).isSymbolicLink()) return [];
      const targetRaw = readlinkSync(absolute);
      const target = path.resolve(path.dirname(absolute), targetRaw);
      if (!existsSync(target)) return [{ relative, target: targetRaw, issue: "dangling" }];
      if (!isWithin(realpathSync(target), workspaceDir)) return [{ relative, target: targetRaw, issue: "escape" }];
      return [];
    } catch {
      return [];
    }
  });
}

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, ...details });
}

function diagnose(options) {
  const root = safeRealpath(path.resolve(expandHome(options.root ?? process.cwd())));
  const seoDir = path.join(root, ".seo");
  const rootState = classifyWorkspace(seoDir);
  const hub = rootState.classification === "hub" ? seoDir : null;
  let target = { workspaceDir: seoDir, ...rootState };
  if (options.site) {
    const siteDir = path.join(seoDir, "sites", options.site);
    target = { workspaceDir: siteDir, ...classifyWorkspace(siteDir, { hubSite: true }) };
  }
  const defaultSearchRoots = [root, path.dirname(root)];
  const searchRoots = [...new Set([...defaultSearchRoots, ...options.searchRoots.map(expandHome)].map((item) => safeRealpath(path.resolve(item))))];
  const discovered = discover(searchRoots);
  const canonicalRegistryPaths = new Map(discovered.canonicalRegistryPaths.map((item) => [safeRealpath(item), item]));
  const targetCanonicalRegistry = path.join(seoDir, "registry.md");
  if (existsSync(targetCanonicalRegistry)) canonicalRegistryPaths.set(safeRealpath(targetCanonicalRegistry), targetCanonicalRegistry);
  const legacyRegistryPaths = new Map(discovered.legacyRegistryPaths.map((item) => [safeRealpath(item), item]));
  const targetLegacyRegistry = path.join(root, ".agents/seo/REGISTRY.md");
  if (existsSync(targetLegacyRegistry)) legacyRegistryPaths.set(safeRealpath(targetLegacyRegistry), targetLegacyRegistry);
  const registries = [
    ...[...canonicalRegistryPaths.values()].map((item) => parseRegistry(item, "canonical")),
    ...[...legacyRegistryPaths.values()].map((item) => parseRegistry(item, "legacy")),
  ];
  const findings = [];

  if (target.classification === "unrecognized") {
    addFinding(findings, "unrecognized_workspace", `${target.workspaceDir} has ${target.present.length} canonical filenames but only ${target.recognized.length} recognized schema-1 files.`);
  }
  if (target.classification === "invalid-config" || target.classification === "unsupported-schema") {
    addFinding(findings, target.classification.replace("-", "_"), `${path.join(target.workspaceDir, "config.json")}: ${target.configError}`);
  }
  if (target.workspaceDir && existsSync(target.workspaceDir) && new Set(["standalone", "hub-site"]).has(target.classification)) {
    const missing = missingGeneratedArtifacts(target.workspaceDir);
    if (missing.length > 0) addFinding(findings, "workspace_drift", `${target.workspaceDir} is missing generated defaults: ${missing.join(", ")}.`, { files: missing });
  }
  for (const symlink of inspectGeneratedSymlinks(target.workspaceDir)) {
    addFinding(findings, "generated_symlink_escape", `${path.join(target.workspaceDir, symlink.relative)} is a ${symlink.issue} symlink (${symlink.target}).`, { file: symlink.relative });
  }

  const registryInventory = [];
  const canonicalRoots = new Set();
  const siteSeen = new Map();
  const rootSeen = new Map();
  for (const registry of registries) {
    for (const malformed of registry.malformed) addFinding(findings, "malformed_registry", `${registry.path}: ${malformed}.`);
    for (const row of registry.rows) {
      const resolved = resolveRegistryWorkspace(registry.path, row.workspaceRaw);
      const realWorkspace = resolved.workspace ? safeRealpath(resolved.workspace) : null;
      const item = { ...row, registry: registry.path, registryKind: registry.kind, ...resolved, realWorkspace };
      registryInventory.push(item);
      if (registry.kind === "canonical" && realWorkspace) canonicalRoots.add(realWorkspace);
      const siteKey = `${registry.kind}:${row.normalizedSite}`;
      if (siteSeen.has(siteKey)) addFinding(findings, "duplicate_registry_site", `${registry.kind} registry site ${row.site} appears at ${siteSeen.get(siteKey)} and ${registry.path}:${row.line}.`);
      else siteSeen.set(siteKey, `${registry.path}:${row.line}`);
      if (realWorkspace) {
        const rootKey = `${registry.kind}:${realWorkspace}`;
        if (rootSeen.has(rootKey)) addFinding(findings, "duplicate_registry_root", `${registry.kind} registry root ${realWorkspace} appears at ${rootSeen.get(rootKey)} and ${registry.path}:${row.line}.`);
        else rootSeen.set(rootKey, `${registry.path}:${row.line}`);
      }
      const permission = credentialPath(registry.path, row.credentialsRaw);
      if (permission) {
        const overpermissive = permissionFinding(permission);
        if (overpermissive) addFinding(findings, "credential_permissions", `Credential reference ${permission} has mode ${overpermissive.mode}; expected no group/other permissions.`, { credentialPath: permission, mode: overpermissive.mode });
      }
    }
  }
  for (const item of registryInventory) {
    if (!item.workspace) {
      addFinding(findings, "stale_registry_row", `${item.registryKind} registry row ${item.site} points at a missing workspace (${item.workspaceRaw}); it is inventory, not a candidate.`, { registry: item.registry, site: item.site });
    } else if (item.registryKind === "legacy" && !canonicalRoots.has(item.realWorkspace)) {
      addFinding(findings, "unmigrated_legacy_site", `Legacy-only site ${item.site} remains visible at ${item.realWorkspace}.`, { registry: item.registry, site: item.site, workspace: item.realWorkspace });
    }
  }

  if (hub) {
    const registered = new Set(registryInventory.filter((item) => item.registryKind === "canonical" && item.realWorkspace).map((item) => item.realWorkspace));
    for (const siteDir of childDirs(path.join(hub, "sites"))) {
      if (!registered.has(safeRealpath(siteDir))) addFinding(findings, "unregistered_hub_site", `${siteDir} is not in the canonical hub registry.`);
    }
  }

  let domain = options.domain;
  if (!domain && options.site) {
    const targetKey = safeRealpath(target.workspaceDir);
    domain = registryInventory.find((item) => item.registryKind === "canonical" && item.realWorkspace === targetKey)?.site ?? null;
  }
  const normalizedDomain = normalizeHost(domain);
  const candidates = registryInventory.filter((item) => item.registryKind === "canonical" && normalizedDomain && item.normalizedSite === normalizedDomain && item.workspace && item.realWorkspace !== safeRealpath(target.workspaceDir));
  for (const candidate of candidates) addFinding(findings, "candidate_workspace", `Canonical identity ${normalizedDomain} also resolves to ${candidate.realWorkspace}.`, { workspace: candidate.realWorkspace, registry: candidate.registry });
  if (target.classification === "legacy-standalone" && !normalizedDomain) {
    addFinding(findings, "unbound_workspace", `${target.workspaceDir} is structurally recognized but has no explicit or canonical-registry identity.`);
  }

  const installs = inspectInstalls(root);
  for (const install of installs) {
    if (install.symlink && !install.targetExists) addFinding(findings, "dangling_install", `${install.path} -> ${install.target ?? "?"} is dangling.`);
  }
  const healthyInstallRoots = new Set(installs.filter((item) => item.targetExists).map((item) => item.realpath));
  if (healthyInstallRoots.size > 1) addFinding(findings, "duplicate_install", `${healthyInstallRoots.size} distinct skill installs exist under ${root}.`);

  const lockPath = path.join(root, "skills-lock.json");
  if (existsSync(lockPath)) {
    try {
      const lock = JSON.parse(readFileSync(lockPath, "utf-8"));
      const entry = lock?.skills?.["seo-growth-workspace"];
      if (installs.length > 0 && !entry) addFinding(findings, "skills_lock_drift", `${lockPath} has no seo-growth-workspace entry for an installed copy.`);
      if (entry && installs.length === 0) addFinding(findings, "skills_lock_drift", `${lockPath} records seo-growth-workspace but no install surface exists.`);
      if (entry && (!entry.computedHash || !entry.skillPath)) addFinding(findings, "skills_lock_drift", `${lockPath} has an incomplete seo-growth-workspace entry.`);
      if (entry?.computedHash && healthyInstallRoots.size > 0) {
        const installedHashes = [...healthyInstallRoots].map((installRoot) => skillFolderHash(installRoot));
        if (!installedHashes.includes(entry.computedHash)) addFinding(findings, "skills_lock_drift", `${lockPath} computedHash does not match any installed seo-growth-workspace directory.`);
      }
    } catch (error) {
      addFinding(findings, "skills_lock_drift", `${lockPath} is malformed: ${error.message}.`);
    }
  } else if (installs.length > 0) {
    addFinding(findings, "skills_lock_drift", `${root} has a skill install but no skills-lock.json.`);
  }

  const docMentions = inspectDocs(root, rootState.classification);
  for (const doc of docMentions) {
    if (doc.stale) addFinding(findings, "active_path_drift", `${doc.file} points at SEO workspace state but ${root} has no adoptable active workspace.`);
  }

  const chosenWorkspace = safeRealpath(path.resolve(expandHome(options.workspace ?? target.workspaceDir)));
  const missing = target.workspaceDir ? missingGeneratedArtifacts(target.workspaceDir) : [];
  const requestedRepair = [...new Set(options.repairFiles)].sort();
  const invalidRepair = requestedRepair.filter((file) => !GENERATED_WORKSPACE_FILES.has(file) && !GENERATED_WORKSPACE_DIRS.has(file));
  const unresolved = findings.filter((finding) => {
    if (finding.code === "stale_registry_row") return false;
    if (options.decision === "repair" && finding.code === "workspace_drift") {
      return stableJson(requestedRepair) !== stableJson((finding.files ?? []).filter((file) => requestedRepair.includes(file)).sort());
    }
    if (options.decision === "adopt" && finding.code === "unbound_workspace" && normalizedDomain) return false;
    return true;
  });
  let decisionError = null;
  if (options.decision === "create" && target.classification !== "none") decisionError = `create requires an absent target, got ${target.classification}`;
  if (options.decision === "adopt" && (target.classification !== "legacy-standalone" || target.recognized.length < LEGACY_SIGNATURE_MIN || !normalizedDomain)) decisionError = "adopt requires explicit identity and at least three recognized schema-1 files";
  if (options.decision === "repair" && (!new Set(["standalone", "hub-site"]).has(target.classification) || requestedRepair.length === 0 || invalidRepair.length > 0 || requestedRepair.some((file) => !missing.includes(file)))) decisionError = "repair requires a stamped/registered schema-1 workspace and an exact allowlist of missing generated artifacts";
  if (options.decision === "unresolved") decisionError = "decision remains unresolved";

  const sourcePathMap = new Map();
  const addSource = (input, policy = "content") => sourcePathMap.set(`${path.resolve(input)}:${policy}`, { path: path.resolve(input), policy });
  addSource(target.workspaceDir, "content");
  for (const registry of registries) addSource(registry.path, "content");
  for (const install of installs) addSource(install.path, "content");
  if (existsSync(lockPath)) addSource(lockPath, "content");
  for (const doc of docMentions) addSource(doc.path, "content");
  for (const item of registryInventory) {
    const input = credentialPath(item.registry, item.credentialsRaw);
    if (input) addSource(input, "stat");
  }
  const sources = [...sourcePathMap.values()].map((source) => makeSourceRecord(source.path, source.policy));
  const legacySiteId = options.site && !SITE_ID_PATTERN.test(options.site) && registryInventory.some((item) => (item.site === options.site || path.basename(item.realWorkspace ?? "") === options.site) && item.realWorkspace === safeRealpath(target.workspaceDir)) ? options.site : null;
  const publicTarget = {
    workspaceDir: target.workspaceDir,
    classification: target.classification,
    mode: target.mode,
    present: target.present,
    recognized: target.recognized,
    configError: target.configError,
    workspaceSchemaVersion: target.config?.workspaceSchemaVersion,
  };
  const publicInventory = registryInventory.map(({ credentialsRaw: _credentialsRaw, ...item }) => item);
  const publicCandidates = candidates.map((item) => ({
    site: item.site,
    normalizedSite: item.normalizedSite,
    workspace: item.realWorkspace,
    registry: item.registry,
    registryKind: item.registryKind,
  }));

  const result = {
    root,
    generated: new Date().toISOString(),
    site: options.site,
    legacySiteId,
    domain: domain ?? null,
    normalizedDomain: normalizedDomain || null,
    searchRoots,
    target: publicTarget,
    chosenWorkspace,
    candidates: publicCandidates,
    installs,
    registries: registries.map((registry) => ({ path: registry.path, kind: registry.kind, rows: registry.rows.length, malformed: registry.malformed })),
    registryInventory: publicInventory,
    docMentions,
    findings,
    unresolvedFindings: unresolved,
    decision: options.decision,
    decisionError,
    repairFiles: requestedRepair,
    clean: findings.length === 0,
  };

  if (options.planOutput) {
    if (!normalizedDomain && new Set(["create", "adopt", "repair"]).has(options.decision)) {
      throw new Error("--domain is required for create, adopt, and repair plans");
    }
    const planOutput = path.resolve(expandHome(options.planOutput));
    if (searchRoots.some((searchRoot) => isWithin(planOutput, searchRoot))) {
      throw new Error(`--plan-output must be outside every scanned/search root: ${planOutput}`);
    }
    if (!isDirectory(path.dirname(planOutput))) throw new Error(`--plan-output parent must already exist: ${path.dirname(planOutput)}`);
    const generatedAt = new Date();
    const plan = {
      contract: "seo-growth-workspace/bootstrap-plan-v1",
      output: safeRealpath(planOutput),
      generatedAt: generatedAt.toISOString(),
      expiresAt: new Date(generatedAt.getTime() + PLAN_TTL_MS).toISOString(),
      root,
      rootHash: sha256(root),
      domain: normalizedDomain || null,
      domainHash: sha256(normalizedDomain || ""),
      site: options.site,
      legacySiteId,
      searchRoots,
      searchRootsHash: sha256(stableJson(searchRoots)),
      sources,
      sourcesHash: sha256(stableJson(sources)),
      target: {
        workspaceDir: target.workspaceDir,
        classification: target.classification,
        recognized: target.recognized,
      },
      chosenWorkspace,
      candidates: candidates.map((item) => ({ site: item.site, workspace: item.realWorkspace, registry: item.registry })),
      installs: installs.map((item) => ({ surface: item.surface, realpath: item.realpath, targetExists: item.targetExists })),
      findings: findings.map((finding) => ({ code: finding.code, message: finding.message })),
      unresolvedFindingCodes: unresolved.map((finding) => finding.code),
      decision: options.decision,
      decisionError,
      repairFiles: requestedRepair,
      approved: !decisionError && unresolved.length === 0,
      terminal: options.decision === "migrate",
    };
    plan.hash = planHash(plan);
    writeFileSync(planOutput, `${JSON.stringify(plan, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    result.plan = { output: planOutput, hash: plan.hash, expiresAt: plan.expiresAt, approved: plan.approved, terminal: plan.terminal };
  }
  return result;
}

function escapeCell(value) {
  return String(value ?? "—").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function table(headers, rows) {
  return [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)].join("\n");
}

function renderMarkdown(result) {
  const lines = [
    "# SEO doctor",
    "",
    `Generated: ${result.generated}`,
    `Root: ${result.root}`,
    `Domain: ${result.domain ?? "unbound"}`,
    `Decision: ${result.decision}${result.decisionError ? ` (${result.decisionError})` : ""}`,
    "",
    "## Target",
    "",
    `- Workspace: ${result.target.workspaceDir}`,
    `- Classification: ${result.target.classification}`,
    `- Recognized schema-1 files: ${result.target.recognized.length}/${CANONICAL_FILES.length}${result.target.recognized.length ? ` (${result.target.recognized.join(", ")})` : ""}`,
    "",
    "## Registry inventory",
    "",
    result.registryInventory.length ? table(["Kind", "Site", "Workspace", "State"], result.registryInventory.map((item) => [item.registryKind, item.site, item.realWorkspace ?? item.workspaceRaw, item.workspace ? (item.registryKind === "legacy" ? "legacy inventory" : "canonical route") : "stale row"])) : "None found.",
    "",
    "## Findings",
    "",
    result.findings.length ? result.findings.map((finding) => `- ${finding.code}: ${finding.message}`).join("\n") : "Clean — no findings.",
  ];
  if (result.plan) lines.push("", "## Plan", "", `- Output: ${result.plan.output}`, `- SHA-256: ${result.plan.hash}`, `- Expires: ${result.plan.expiresAt}`, `- Approved: ${result.plan.approved ? "yes" : "no"}`, `- Terminal: ${result.plan.terminal ? "yes (manual migration)" : "no"}`);
  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return 0;
  }
  const result = diagnose(options);
  process.stdout.write(options.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderMarkdown(result));
  if (result.plan) return result.plan.approved || result.plan.terminal ? 0 : 1;
  return result.clean ? 0 : 1;
}

try {
  process.exit(main());
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
