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
 * Engine pick is resolved by parse-flags/workflow and passed in REVIEW_ENGINE:
 * default Claude implementation pairs with Codex review, Cursor follows that
 * same review default, while `engine: codex` and absent/default
 * `review-engine` pairs with Claude review. NO silent fallback: requested
 * engine missing from the runner host's PATH → loud
 * skipped_no_engine note, never a quiet engine swap (acredix #64 posted
 * "engine: claude" because the cloud runner lacked codex and the old fallback
 * degraded silently, 2026-07-05).
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
const SANDCASTLE_SANDBOX = process.env.SANDCASTLE_SANDBOX ?? "none";
const CODEX_CLOUD_HOME = path.join(process.env.RUNNER_TEMP ?? OUTPUT_DIR, "codex-home");

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

const engine =
  process.env.REVIEW_ENGINE === "claude" ? "claude" : "codex";
if (!onPath(engine)) {
  const hint =
    engine === "codex"
      ? "Install `codex` on this runner, or explicitly override with `review-engine: claude` in the brief's `### Pipeline` section and retrigger."
      : "Install `claude` on this runner and retrigger.";
  summary(
    `### 🔍 Second-model review\n\n**Skipped: \`${engine}\` is not on the runner host's PATH — no review ran.** No engine fallback by design: a second-model review must be a different vendor than the implementer. ${hint}`
  );
  finish("skipped_no_engine", "none", false);
}
const childEnv = { ...process.env };
// Defense in depth: workflow expressions already pass only the selected
// provider credential, but never let an inherited host env leak the other
// vendor's long-lived credential into a tool-enabled review subprocess.
delete childEnv.GH_TOKEN;
delete childEnv.GITHUB_TOKEN;
delete childEnv.VERCEL_SANDBOX_TOKEN;
delete childEnv.PLAN_RECAP_TOKEN;
delete childEnv.PLAN_RECAP_APP_URL;
if (engine === "codex") {
  delete childEnv.CLAUDE_CODE_OAUTH_TOKEN;
} else {
  delete childEnv.CODEX_AUTH_B64;
  delete childEnv.CODEX_API_KEY;
  delete childEnv.OPENAI_API_KEY;
}
if (engine === "codex" && SANDCASTLE_SANDBOX !== "docker") {
  childEnv.CODEX_HOME = CODEX_CLOUD_HOME;
  if (!fs.existsSync(path.join(CODEX_CLOUD_HOME, "auth.json"))) {
    summary(
      "### 🔍 Second-model review\n\n**Skipped: hosted Codex auth was not materialized, so no review ran.** Set `CODEX_AUTH_B64` for hosted lanes or explicitly use `review-engine: claude`; advisory review outages never fail the pipeline."
    );
    finish("skipped_missing_auth", "codex", false);
  }
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

const reportPath = path.join(OUTPUT_DIR, "review-report.json");
const run = spawnSync(
  SKILL_BIN,
  [
    "--mode",
    "branch",
    "--base",
    `origin/${BASE_BRANCH}`,
    "--engine",
    engine,
    "--json-output",
    reportPath,
  ],
  { encoding: "utf8", timeout: 15 * 60 * 1000, env: childEnv }
);

const raw = `${run.stdout ?? ""}\n${run.stderr ?? ""}`.trim();
fs.writeFileSync(path.join(OUTPUT_DIR, "review-findings.md"), raw);

// autoreview's exit code encodes the VERDICT, not health: 1 = review completed
// WITH findings, but also 1 = graceful SystemExit error — so success is "it
// wrote a valid JSON report", never the exit code. (Judging by exit code
// misreported a completed 2-finding review as a crash and silently skipped the
// disposition pass — bcr run 28737274527's predecessor, 2026-07-05.)
let report: { findings?: unknown[]; overall_correctness?: string } | null =
  null;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch {
  report = null;
}

if (!report || run.error) {
  summary(
    `### 🔍 Second-model review (engine: ${engine})\n\nAdvisory review crashed (exit ${run.status ?? "spawn-error"}, no JSON report) — pipeline continues by design. Tail of output:\n\n\`\`\`\n${raw.slice(-1500)}\n\`\`\``
  );
  finish("engine_error", engine, false);
}

const verdict = report.overall_correctness ?? "no structured verdict";
const hasFindings =
  (report.findings?.length ?? 0) > 0 || verdict === "patch is incorrect";

summary(
  [
    `### 🔍 Second-model review (engine: ${engine})`,
    "",
    hasFindings
      ? `Reviewer flagged ${report.findings?.length ?? 0} finding(s) (verdict: ${verdict}) — a disposition pass runs next (fix or justify, committed to the branch before verify).`
      : `Reviewer verdict: ${verdict} — no disposition pass needed.`,
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
