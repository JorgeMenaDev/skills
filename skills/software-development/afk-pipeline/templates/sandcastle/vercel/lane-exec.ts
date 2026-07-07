/**
 * Lane proxy — every phase step runs `bun .sandcastle/vercel/lane-exec.ts <script>`
 * (or `--sh '<command>'`) instead of invoking the script directly.
 *
 * On the cloud (`none`) and local (`docker`) lanes this is a transparent
 * pass-through: it spawns the same command locally and exits with its code —
 * zero behavior change.
 *
 * On the sandbox lane (SANDCASTLE_SANDBOX=vercel, label `agent:implement-sandbox`)
 * the GitHub-hosted runner is only a driver: the FIRST call creates one Vercel
 * Sandbox (Firecracker microVM) for the whole job — cloned from the repo at
 * {{BASE_BRANCH}} via AGENT_PAT, secrets injected as create-time env — and
 * bootstraps the toolchain (bun, Claude Code, agent-browser + Chromium deps,
 * bun install). Every phase then executes INSIDE the microVM with
 * SANDCASTLE_SANDBOX=none: the microVM is the sandbox, so the phases' own
 * noSandbox path is correct there (same reasoning as the cloud lane, ADR 0002,
 * but isolated from the runner). See matias docs/adr/0004.
 *
 * Contracts kept across the remote boundary:
 * - stdout/stderr stream to the job log; exit codes propagate.
 * - OUTPUT_DIR artifacts (failure_reason.txt, review-summary.md, pr_title.txt,
 *   pr_description.txt) sync back to RUNNER_TEMP after every call — including
 *   failures — so the surrounding workflow steps read them unchanged.
 * - $GITHUB_OUTPUT writes inside the sandbox bridge back to the host step's
 *   real GITHUB_OUTPUT (unique remote file per call, appended after the run).
 * - Branch push and salvage run INSIDE the sandbox (that's where the work is);
 *   `--stop` tears the sandbox down (always-run workflow step; the create-time
 *   timeout is the backstop).
 *
 * Known degrade (same as the cloud lane): the codex review engine has no
 * headless auth in the sandbox, so `review-engine: codex` skips loudly.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const LANE = process.env.SANDCASTLE_SANDBOX ?? "none";
const RUNNER_TEMP = process.env.RUNNER_TEMP ?? process.env.OUTPUT_DIR ?? "/tmp";
const [mode, ...rest] = process.argv.slice(2);

if (!mode) {
  console.error("usage: lane-exec.ts <script-relative-to-.sandcastle> | --sh '<command>' | --salvage | --stop");
  process.exit(2);
}

// Only the implement phase — always the job's first lane-exec call — may CREATE
// the sandbox. Later calls (gate, verify, push, salvage) finding no sandbox on
// record means implement died before/at creation: erroring out here, WITHOUT
// touching failure_reason.txt, preserves the original failure for the blocked
// comment instead of masking it behind a pointless second microVM + bootstrap.
const MAY_CREATE = mode === "implement/implement.ts";

// ---------------------------------------------------------------------------
// Pass-through lanes: run locally, exactly as the workflow used to.
// ---------------------------------------------------------------------------
if (LANE !== "vercel") {
  if (mode === "--stop") process.exit(0);
  const r =
    mode === "--sh" || mode === "--salvage"
      ? spawnSync("bash", ["-c", mode === "--salvage" ? "bash .sandcastle/salvage.sh" : (rest[0] ?? "")], { stdio: "inherit" })
      : spawnSync("bun", [path.join(".sandcastle", mode), ...rest], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

// ---------------------------------------------------------------------------
// Vercel sandbox lane.
// ---------------------------------------------------------------------------
const { Sandbox } = await import("@vercel/sandbox");

const TEAM_ID = "{{SANDBOX_TEAM_ID}}";
const PROJECT_ID = "{{SANDBOX_PROJECT_ID}}";
const VCPUS = Number("{{SANDBOX_VCPUS}}") || 4;
const TIMEOUT_MINUTES = Number(process.env.VERCEL_SANDBOX_TIMEOUT_MINUTES ?? "115");
const TOKEN = process.env.VERCEL_SANDBOX_TOKEN ?? "";
const WORKDIR = "/vercel/sandbox";
const REMOTE_OUT = "/tmp/out";

// Sandboxes are addressed by NAME (Sandbox.get has no id param). Deterministic
// per run so parallel issues never collide and a retry never resumes stale state.
const SANDBOX_NAME = `afk-i${process.env.ISSUE_NUMBER ?? "0"}-r${process.env.GITHUB_RUN_ID ?? process.pid}`;
const CREATED_FILE = path.join(RUNNER_TEMP, "vercel-sandbox-created");
const BOOT_FILE = path.join(RUNNER_TEMP, "vercel-sandbox-booted");

/** Artifacts phases write to OUTPUT_DIR that later workflow steps read from RUNNER_TEMP. */
const ARTIFACTS = ["failure_reason.txt", "review-summary.md", "pr_title.txt", "pr_description.txt"];

/** Env forwarded into every in-sandbox command (only keys present on the driver). */
const FORWARD_KEYS = [
  "ISSUE_NUMBER",
  "ISSUE_TITLE",
  "BRANCH",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "GH_TOKEN",
  "GH_REPO",
  "GITHUB_RUN_ID",
  "VERIFY_MODE",
  "VERIFY_VIEWPORTS",
  "VERIFY_LOCALES",
  "VERIFY_REASON",
  "VERIFY_TIMEOUT_MINUTES",
  "REVIEW_ENGINE",
  // Union of pipeline.json passthroughKeys + verifySecrets — the microVM needs
  // every secret the workflow-step env carries for the phases.
  ...{{FORWARD_SECRET_KEYS}},
];

function fail(message: string): never {
  console.error(`\nFAILED: ${message}`);
  try {
    fs.writeFileSync(path.join(RUNNER_TEMP, "failure_reason.txt"), message);
  } catch {}
  process.exit(1);
}

const creds = { token: TOKEN, teamId: TEAM_ID, projectId: PROJECT_ID };

async function getExisting() {
  if (!fs.existsSync(CREATED_FILE)) return null;
  return Sandbox.get({ ...creds, name: SANDBOX_NAME });
}

function forwardEnv(ghOutputFile: string): Record<string, string> {
  const env: Record<string, string> = {
    CI: "true",
    SANDCASTLE_SANDBOX: "none",
    OUTPUT_DIR: REMOTE_OUT,
    GITHUB_OUTPUT: ghOutputFile,
  };
  for (const key of FORWARD_KEYS) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

let callSeq = 0;
async function runInside(sandbox: any, script: string): Promise<number> {
  const ghOutputFile = `${REMOTE_OUT}/ghout-${process.pid}-${++callSeq}`;
  const cmd = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", `export PATH="$HOME/.bun/bin:$PATH"; cd ${WORKDIR}; ${script}`],
    cwd: WORKDIR,
    env: forwardEnv(ghOutputFile),
    stdout: process.stdout,
    stderr: process.stderr,
  });

  // Sync artifacts + step outputs back to the host, success or failure —
  // the failure path is exactly when failure_reason.txt matters.
  for (const name of ARTIFACTS) {
    try {
      const content = await sandbox.fs.readFile(`${REMOTE_OUT}/${name}`, "utf8");
      if (content != null) fs.writeFileSync(path.join(RUNNER_TEMP, name), content);
    } catch {}
  }
  if (process.env.GITHUB_OUTPUT) {
    try {
      const out = await sandbox.fs.readFile(ghOutputFile, "utf8");
      if (out) fs.appendFileSync(process.env.GITHUB_OUTPUT, out.endsWith("\n") ? out : out + "\n");
    } catch {}
  }
  return cmd.exitCode ?? 1;
}

/** One-time toolchain bootstrap; idempotent, re-run if a prior call died mid-boot. */
const BOOTSTRAP = `set -euo pipefail
git config user.name "JorgeMenaDev"
git config user.email "77608748+JorgeMenaDev@users.noreply.github.com"
git checkout -B "{{BASE_BRANCH}}" "origin/{{BASE_BRANCH}}" 2>/dev/null || git checkout -B "{{BASE_BRANCH}}"
git checkout -B "$BRANCH"
mkdir -p ${REMOTE_OUT}
command -v bun >/dev/null 2>&1 || curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
export PATH="$HOME/.bun/bin:$PATH"
npm i -g @anthropic-ai/claude-code agent-browser --silent
sudo dnf install -y -q nss nspr atk at-spi2-atk cups-libs libdrm libXcomposite libXdamage libXrandr mesa-libgbm alsa-lib pango cairo at-spi2-core libXcursor libXext libXi libXtst libxkbcommon >/dev/null 2>&1
agent-browser install >/dev/null 2>&1
bun install --frozen-lockfile
echo "sandbox bootstrap complete: node $(node -v), bun $(bun --version), $(claude --version)"`;

async function ensureSandbox() {
  if (!TOKEN) fail("VERCEL_SANDBOX_TOKEN is not set — the sandbox lane needs the team-scoped token as a repo secret.");
  if (!TEAM_ID || !PROJECT_ID) {
    fail("sandbox.teamId / sandbox.projectId missing from .sandcastle/config/pipeline.json — the sandbox lane is not provisioned for this repo (see reference/installation.md).");
  }
  let sandbox = await getExisting();
  if (!sandbox) {
    if (!MAY_CREATE) {
      console.error(`No sandbox on record for this job (implement never created one) — refusing to create from "${mode}".`);
      process.exit(1);
    }
    const repo = process.env.GH_REPO ?? "";
    const pat = process.env.AGENT_PAT || process.env.GH_TOKEN || "";
    if (!repo || !pat) fail("GH_REPO / AGENT_PAT (or GH_TOKEN) missing — cannot clone into the sandbox.");
    try {
      sandbox = await Sandbox.create({
      ...creds,
      name: SANDBOX_NAME,
      runtime: "node22",
      timeout: TIMEOUT_MINUTES * 60_000,
      resources: { vcpus: VCPUS },
      tags: { purpose: "afk-pipeline", issue: process.env.ISSUE_NUMBER ?? "unknown" },
      source: {
        type: "git",
        url: `https://github.com/${repo}.git`,
        username: "x-access-token",
        password: pat,
        revision: "{{BASE_BRANCH}}",
      },
        env: forwardEnv(`${REMOTE_OUT}/ghout-bootstrap`),
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      const body = (e as any)?.text ?? (e as any)?.json?.error?.message ?? "";
      fail(`Vercel sandbox creation failed: ${detail}${body ? ` — ${body}` : ""}`);
    }
    fs.writeFileSync(CREATED_FILE, SANDBOX_NAME);
    console.log(`Created Vercel sandbox "${SANDBOX_NAME}" (${VCPUS} vCPU, ${TIMEOUT_MINUTES}m timeout) on project ${PROJECT_ID}`);
  }
  if (!fs.existsSync(BOOT_FILE)) {
    console.log("Bootstrapping sandbox toolchain (bun, Claude Code, agent-browser + Chromium)...");
    const code = await runInside(sandbox, BOOTSTRAP);
    if (code !== 0) fail(`sandbox toolchain bootstrap failed (exit ${code}) — see log above.`);
    fs.writeFileSync(BOOT_FILE, "1");
  }
  return sandbox;
}

if (mode === "--stop") {
  try {
    const sandbox = await getExisting();
    if (sandbox) {
      await sandbox.stop();
      console.log("Vercel sandbox stopped.");
    } else {
      console.log("No sandbox to stop.");
    }
  } catch (e) {
    console.error(`sandbox stop failed (non-fatal): ${e instanceof Error ? e.message : e}`);
  }
  process.exit(0);
}

const sandbox = await ensureSandbox();
let script: string;
if (mode === "--salvage") {
  // Cancel/timeout kills only the DRIVER process — the remote phase command
  // keeps running inside the microVM. Kill leftover phase processes (bracketed
  // regexes so pkill never matches this command line itself) and clear a stale
  // git lock before salvaging, or `git add -A` races the still-live agent.
  script = `pkill -f '[.]sandcastle/(implement|verify|review|write-pr)' 2>/dev/null || true
pkill -f '[c]laude' 2>/dev/null || true
pkill -f '[a]gent-browser' 2>/dev/null || true
sleep 2
rm -f .git/index.lock
bash .sandcastle/salvage.sh`;
} else if (mode === "--sh") {
  script = rest[0] ?? "";
} else {
  script = `bun .sandcastle/${mode} ${rest.join(" ")}`.trim();
}
process.exit(await runInside(sandbox, script));
