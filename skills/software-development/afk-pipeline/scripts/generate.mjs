#!/usr/bin/env node
// afk-pipeline generator — stamps the skill's templates/ into a consumer repo.
//
// Usage:  node <skill-dir>/scripts/generate.mjs [--repo <path>] [--check]
//
// Reads <repo>/.sandcastle/config/pipeline.json + fragment .md files and writes
// the generated pipeline files (.sandcastle/* + .github/workflows/agent-implement.yml).
// Seeded files (README.md, config/) are never overwritten. --check diffs instead
// of writing and exits 1 on drift (for audits).
//
// Token safety: templates also contain RUNTIME tokens ({{ISSUE_NUMBER}},
// {{BRANCH}}, {{VERIFY_VIEWPORTS}}, ...) substituted by the phase scripts at run
// time. The generator therefore replaces ONLY the tokens in its explicit map and
// must leave every other {{...}} untouched.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TPL = path.join(SKILL_DIR, "templates");
const VERSION = (fs.readFileSync(path.join(SKILL_DIR, "SKILL.md"), "utf8").match(/^version:\s*(\S+)/m) ?? [])[1] ?? "unknown";

const args = process.argv.slice(2);
const repo = path.resolve(args.includes("--repo") ? args[args.indexOf("--repo") + 1] : ".");
const checkOnly = args.includes("--check");

const cfgDir = path.join(repo, ".sandcastle", "config");
const cfgPath = path.join(cfgDir, "pipeline.json");
if (!fs.existsSync(cfgPath)) {
  console.error(`No ${cfgPath} — seed one from ${path.join(TPL, "seed", "config")} first (see reference/installation.md).`);
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

// The generated phase scripts require @ai-hero/sandcastle >= this version
// (older APIs lack handle.copyIn — a stale pin from a previous orchestrator
// fails the implement phase at runtime, not install time).
const MIN_SANDCASTLE = [0, 12];
{
  const pkgPath = path.join(repo, "package.json");
  const deps = fs.existsSync(pkgPath)
    ? { ...(JSON.parse(fs.readFileSync(pkgPath, "utf8")).dependencies ?? {}), ...(JSON.parse(fs.readFileSync(pkgPath, "utf8")).devDependencies ?? {}) }
    : {};
  const declared = deps["@ai-hero/sandcastle"];
  const nums = declared?.match(/\d+/g)?.slice(0, 2).map(Number);
  if (declared && nums && (nums[0] < MIN_SANDCASTLE[0] || (nums[0] === MIN_SANDCASTLE[0] && nums[1] < MIN_SANDCASTLE[1]))) {
    console.error(`Root package.json pins @ai-hero/sandcastle ${declared} — the generated scripts need >= ${MIN_SANDCASTLE.join(".")}. Run: bun add -d '@ai-hero/sandcastle@^0.12.0'`);
    process.exit(1);
  }
  if (!declared) {
    console.warn(`WARN: @ai-hero/sandcastle not in root package.json — the first run will fail at bun install. Run: bun add -d '@ai-hero/sandcastle@^0.12.0'`);
  }
}

// String fields may be arrays-of-lines for JSON readability.
const str = (v) => (Array.isArray(v) ? v.join("\n") : (v ?? ""));
const req = (k) => {
  const v = str(cfg[k]);
  if (!v) { console.error(`pipeline.json missing required field: ${k}`); process.exit(1); }
  return v;
};
const frag = (name) => {
  const p = path.join(cfgDir, name);
  if (!fs.existsSync(p)) { console.error(`Missing fragment: ${p}`); process.exit(1); }
  return fs.readFileSync(p, "utf8").trimEnd();
};

const passthroughKeys = cfg.passthroughKeys ?? [];
const verifySecrets = cfg.verifySecrets ?? passthroughKeys;

// Rendered blocks -----------------------------------------------------------
const passthroughDoc = str(cfg.passthroughDoc)
  .split("\n").filter(Boolean).join("\n * ") || "This repo's verify phase needs no injected secrets.";
const passthroughArr = passthroughKeys.length
  ? "[\n" + passthroughKeys.map((k) => `  "${k}",`).join("\n") + "\n]"
  : "[]";
const verifySecretsEnv = verifySecrets
  .map((k) => `          ${k}: \${{ secrets.${k} }}`).join("\n");
const evidenceDir = req("evidenceDir");
const recapExcludes = [
  ...new Set(["docs/evidence", evidenceDir, ...(cfg.recapExtraExcludes ?? [])]),
].map((d) => `  ":(exclude)${d}/**",`).join("\n");

const deployNote = req("deployNote");

// Convex integrity gate (optional): convexDir = the Convex package dir
// relative to the repo root ("packages/backend", "." for root convex/), empty
// for repos without Convex. convexGateEnv seeds the anonymous local deployment
// with env vars its auth.config reads (dummy values are fine — the deployment
// is throwaway); convexGatePrep is a repo-specific setup command run first.
const convexDir = str(cfg.convexDir);
const convexRules = convexDir
  ? `# CONVEX INTEGRITY (non-negotiable)

This repo's Convex backend lives at \`${convexDir}\`. Files under
\`**/_generated/**\` are machine output — NEVER write or edit them by hand,
even if codegen looks unavailable in the sandbox. It is not: run

    bun .sandcastle/implement/convex-gate.ts --regen

(from the repo root) after any change under \`${convexDir}/convex/\` and commit
the regenerated files. It boots an anonymous local Convex backend — no login,
no deploy key — and runs real codegen + schema/type validation. After this
phase the pipeline reruns that gate; any divergence between committed
_generated and real codegen is OVERWRITTEN with the canonical output in an
automatic commit the reviewer sees. Hand-applied codegen can never ship — but
if your code leans on hand-written phantom types, the canonical regen breaks
it at PR CI. Run --regen yourself so you build against the real API surface,
not an imagined one.`
  : "";

const TOKENS = {
  "{{PROJECT_NAME}}": req("projectName"),
  "{{IMAGE_NAME}}": req("imageName"),
  "{{BUN_VERSION}}": req("bunVersion"),
  "{{BASE_BRANCH}}": cfg.baseBranch ?? "main",
  "{{PASSTHROUGH_DOC}}": passthroughDoc,
  "{{PASSTHROUGH_KEYS}}": passthroughArr,
  "{{VERIFY_SECRETS_ENV}}": verifySecretsEnv || "          # (no repo verify secrets configured)",
  "{{DEPLOY_NOTE}}": deployNote,
  "{{DEPLOY_NOTE_LOWER}}": deployNote.charAt(0).toLowerCase() + deployNote.slice(1),
  "{{IMPLEMENT_GATE}}": req("implementGate"),
  "{{IMPLEMENT_GATE_NOTE}}": str(cfg.implementGateNote),
  "{{EVIDENCE_DIR}}": evidenceDir,
  "{{EVIDENCE_DIR_NOTE}}": str(cfg.evidenceDirNote),
  "{{ENTRY_URL}}": req("entryUrl"),
  "{{LOCALES_NOTE}}": req("localesNote"),
  "{{FIX_NOTES}}": str(cfg.fixNotes),
  "{{CONVEX_DIR}}": convexDir,
  "{{CONVEX_GATE_PREP}}": str(cfg.convexGatePrep),
  "{{CONVEX_GATE_ENV_JSON}}": JSON.stringify(cfg.convexGateEnv ?? {}),
  "{{CONVEX_RULES}}": convexRules,
  "{{REPORT_EXTRAS}}": req("reportExtras"),
  "{{RECAP_EVIDENCE_EXCLUDES}}": recapExcludes,
  "{{ORIENTATION_MD}}": frag("orientation.md"),
  "{{VERIFY_BOOT_MD}}": frag("verify-boot.md"),
  "{{VERIFY_NOTES_MD}}": frag("verify-notes.md"),
  "{{WRITE_PR_OUTPUT_MD}}": frag("write-pr-output.md"),
};

function render(tpl) {
  let out = tpl;
  for (const [token, value] of Object.entries(TOKENS)) out = out.split(token).join(value);
  return out;
}

function header(relOut) {
  const line = `GENERATED by afk-pipeline v${VERSION} — edit .sandcastle/config/ and re-run scripts/generate.mjs; do not hand-edit.`;
  if (relOut.endsWith(".ts") || relOut.endsWith(".mjs")) return `// ${line}\n`;
  if (relOut.endsWith(".yml") || relOut.endsWith(".yaml") || relOut.endsWith(".example") || relOut.endsWith(".gitignore")) return `# ${line}\n`;
  if (relOut.endsWith(".md")) return `<!-- ${line} -->\n`;
  return "";
}

// template path (relative to templates/) -> output path (relative to repo root)
const FILES = {
  "workflow/agent-implement.yml": ".github/workflows/agent-implement.yml",
  "sandcastle/.env.example": ".sandcastle/.env.example",
  "sandcastle/.gitignore": ".sandcastle/.gitignore",
  "sandcastle/Dockerfile": ".sandcastle/Dockerfile",
  "sandcastle/runtime.ts": ".sandcastle/runtime.ts",
  "sandcastle/retry-feedback.ts": ".sandcastle/retry-feedback.ts",
  "sandcastle/run-with-retry.ts": ".sandcastle/run-with-retry.ts",
  "sandcastle/flags/parse-flags.ts": ".sandcastle/flags/parse-flags.ts",
  "sandcastle/implement/implement.ts": ".sandcastle/implement/implement.ts",
  "sandcastle/implement/prompt.md": ".sandcastle/implement/prompt.md",
  "sandcastle/implement/convex-gate.ts": ".sandcastle/implement/convex-gate.ts",
  "sandcastle/verify/verify.ts": ".sandcastle/verify/verify.ts",
  "sandcastle/verify/prompt.md": ".sandcastle/verify/prompt.md",
  "sandcastle/write-pr/write-pr.ts": ".sandcastle/write-pr/write-pr.ts",
  "sandcastle/write-pr/prompt.md": ".sandcastle/write-pr/prompt.md",
  "sandcastle/review/review.ts": ".sandcastle/review/review.ts",
  "sandcastle/review/review-fix.ts": ".sandcastle/review/review-fix.ts",
  "sandcastle/review/fix-prompt.md": ".sandcastle/review/fix-prompt.md",
  "sandcastle/recap/recap.ts": ".sandcastle/recap/recap.ts",
  "sandcastle/recap/mdx-authoring-rules.md": ".sandcastle/recap/mdx-authoring-rules.md",
};

let drift = 0;
for (const [tplRel, outRel] of Object.entries(FILES)) {
  const rendered = header(outRel) + render(fs.readFileSync(path.join(TPL, tplRel), "utf8"));
  const leftovers = [...rendered.matchAll(/\{\{[A-Z0-9_]+\}\}/g)]
    .map((m) => m[0])
    .filter((t) => !["{{ISSUE_NUMBER}}", "{{ISSUE_TITLE}}", "{{BRANCH}}", "{{VERIFY_VIEWPORTS}}", "{{VERIFY_LOCALES}}", "{{VERIFY_MODE}}", "{{VERIFY_REASON}}", "{{FINDINGS}}"].includes(t));
  if (leftovers.length) {
    console.error(`Unresolved generator tokens in ${outRel}: ${[...new Set(leftovers)].join(", ")}`);
    process.exit(1);
  }
  const outAbs = path.join(repo, outRel);
  const current = fs.existsSync(outAbs) ? fs.readFileSync(outAbs, "utf8") : null;
  if (current === rendered) continue;
  drift++;
  if (checkOnly) {
    console.log(`DRIFT: ${outRel}${current === null ? " (missing)" : ""}`);
  } else {
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, rendered);
    console.log(`wrote ${outRel}`);
  }
}

if (!checkOnly) {
  cfg.templateVersion = VERSION;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
}
console.log(checkOnly
  ? (drift ? `${drift} file(s) out of date with afk-pipeline v${VERSION}` : `clean against afk-pipeline v${VERSION}`)
  : `done — ${drift} file(s) (re)generated for afk-pipeline v${VERSION}`);
if (checkOnly && drift) process.exit(1);
