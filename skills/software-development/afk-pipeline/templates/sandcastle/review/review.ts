/**
 * Second-model review (advisory) — runs the repo's vendored `autoreview` skill
 * against the implement phase's branch diff, BEFORE verify, so the fix pass and
 * the evidence both cover reviewed code.
 *
 * ADVISORY BY CONSTRUCTION: this script always exits 0. Every degrade path
 * (skill not vendored, no engine binary, engine crash) writes a summary note
 * instead of failing the run — a review-engine outage must never brick an
 * unattended pipeline. The workflow additionally wraps the step in
 * `continue-on-error: true` as a second belt.
 *
 * Engine pick: `codex` when the binary is on the runner host's PATH (the
 * recommended reviewer — a different vendor than the implement agent), else
 * `claude` (still a fresh, isolated context; autoreview runs it with
 * --safe-mode so repo hooks/skills/MCP stay out of the review). Neither →
 * skipped_no_engine.
 *
 * Outputs (GITHUB_OUTPUT): outcome, engine, has_findings.
 * Files (OUTPUT_DIR): review-findings.md (raw engine output),
 * review-summary.md (posted on the issue by the workflow).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync, spawnSync } from "node:child_process";

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "/tmp";
const BASE_BRANCH = "{{BASE_BRANCH}}";
const SKILL_BIN = ".agents/skills/autoreview/scripts/autoreview";

function out(kv: Record<string, string>) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(kv)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n"
  );
}

function summary(text: string) {
  fs.writeFileSync(path.join(OUTPUT_DIR, "review-summary.md"), text);
}

function onPath(bin: string): boolean {
  const r = spawnSync("sh", ["-c", `command -v ${bin}`], { encoding: "utf8" });
  return r.status === 0 && r.stdout.trim().length > 0;
}

function finish(outcome: string, engine: string, hasFindings: boolean): never {
  out({ outcome, engine, has_findings: String(hasFindings) });
  process.exit(0);
}

// --- degrade paths -----------------------------------------------------------
if (!fs.existsSync(SKILL_BIN)) {
  summary(
    "### 🔍 Second-model review\n\nSkipped: the `autoreview` skill is not vendored in this repo (`.agents/skills/autoreview/`). Install it with `npx skills add openclaw/agent-skills` and re-run to get advisory reviews."
  );
  finish("skipped_missing_skill", "none", false);
}

const engine = onPath("codex") ? "codex" : onPath("claude") ? "claude" : null;
if (!engine) {
  summary(
    "### 🔍 Second-model review\n\nSkipped: neither `codex` nor `claude` is on the runner host's PATH. Install one on the runner (codex recommended) to get advisory reviews."
  );
  finish("skipped_no_engine", "none", false);
}

// --- run the review ----------------------------------------------------------
// Ensure the base ref exists for the diff (single-branch checkouts miss it).
try {
  execSync(
    `git fetch --no-tags origin ${BASE_BRANCH}:refs/remotes/origin/${BASE_BRANCH}`,
    { stdio: "ignore" }
  );
} catch {
  /* already present */
}

const run = spawnSync(
  SKILL_BIN,
  ["--mode", "branch", "--base", `origin/${BASE_BRANCH}`, "--engine", engine],
  { encoding: "utf8", timeout: 15 * 60 * 1000 }
);

const raw = `${run.stdout ?? ""}\n${run.stderr ?? ""}`.trim();
fs.writeFileSync(path.join(OUTPUT_DIR, "review-findings.md"), raw);

if (run.status !== 0 || run.error) {
  summary(
    `### 🔍 Second-model review (engine: ${engine})\n\nAdvisory review crashed (exit ${run.status ?? "spawn-error"}) — pipeline continues by design. Tail of output:\n\n\`\`\`\n${raw.slice(-1500)}\n\`\`\``
  );
  finish("engine_error", engine, false);
}

// autoreview's structured verdict line: `overall: patch is correct|incorrect (…)`
const verdict = raw.match(/^overall:\s*patch is (correct|incorrect)/im)?.[1];
const hasFindings = verdict === "incorrect";

summary(
  [
    `### 🔍 Second-model review (engine: ${engine})`,
    "",
    hasFindings
      ? "Reviewer flagged findings — a disposition pass runs next (fix or justify, committed to the branch before verify)."
      : `Reviewer verdict: ${verdict ? "patch is correct" : "no structured verdict"} — no disposition pass needed.`,
    "",
    "<details><summary>Raw review output</summary>",
    "",
    "```",
    raw.slice(0, 6000),
    "```",
    "",
    "</details>",
    "",
    "_Advisory: review findings never fail the run; blocker/major findings are fixed or explicitly rejected with rationale in the evidence file._",
  ].join("\n")
);
finish(hasFindings ? "findings" : "clean", engine, hasFindings);
