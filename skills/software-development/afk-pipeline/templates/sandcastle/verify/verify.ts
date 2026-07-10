import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import * as sandcastle from "@ai-hero/sandcastle";
import { chooseAgent, chooseSandbox, sandboxHooks } from "../runtime";
import { runWithRetry } from "../run-with-retry";

const ISSUE_NUMBER = required("ISSUE_NUMBER");
const ISSUE_TITLE = required("ISSUE_TITLE");
const BRANCH = required("BRANCH");
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "/tmp";
const TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;

// Verify Profile (issue #20). One prompt template, parameterized by env — the
// workflow sets these from the parsed Pipeline Flags. Defaults reproduce the
// full sweep byte-for-byte for any brief that says nothing. The `off` profile
// never reaches here: the workflow skips this step entirely.
const VERIFY_VIEWPORTS =
  process.env.VERIFY_VIEWPORTS ?? "390x844, 768x1024, 1440x900, 1920x1080";
const VERIFY_LOCALES = process.env.VERIFY_LOCALES ?? "all";
const RECORDING_MODE = process.env.RECORDING_MODE ?? "off";
const RECORDING_HOST_PATH = path.join(OUTPUT_DIR, "recording", `issue-${ISSUE_NUMBER}.webm`);
const RECORDING_PATH = process.env.SANDCASTLE_SANDBOX === "vercel"
  ? `.sandcastle/.sandcastle-artifacts/issue-${ISSUE_NUMBER}/interaction.webm`
  : RECORDING_HOST_PATH;

const Verdict = z.object({
  pass: z.boolean(),
  summary: z.string().min(1),
  failedCriteria: z.array(z.string()).default([]),
});

// Internal phase timeout (v2.2.2). Without it a hung verify burns the whole
// job's timeout-minutes budget and dies as an opaque `cancelled` — no reason
// file, no blocked label, disposition skipped (superaseo #55, three runs,
// 2026-07-04/05). Timing out here instead produces an honest failure through
// the normal fail() path. The review phase has its own 15-min cap.
const VERIFY_TIMEOUT_MINUTES = Number(process.env.VERIFY_TIMEOUT_MINUTES ?? 60);

const result = await withTimeout(
  runWithRetry({
    name: `verify-#${ISSUE_NUMBER}`,
    agent: chooseAgent(TOKEN),
    sandbox: chooseSandbox(TOKEN),
    hooks: sandboxHooks(),
    logging: { type: "stdout" },
    promptFile: path.join(import.meta.dirname, "prompt.md"),
    promptArgs: {
      ISSUE_NUMBER,
      ISSUE_TITLE,
      BRANCH,
      VERIFY_VIEWPORTS,
      VERIFY_LOCALES,
      RECORDING_MODE,
      RECORDING_PATH,
    },
    output: sandcastle.Output.object({
      tag: "verdict",
      schema: Verdict,
    }),
  })
);

// Repo evidence root (real path, never a symlink) — from .sandcastle/config.
const EVIDENCE_DIR = "{{EVIDENCE_DIR}}";

const evidenceReport = path.join(
  ...EVIDENCE_DIR.split("/"),
  `issue-${ISSUE_NUMBER}`,
  "report.md"
);
if (!fs.existsSync(evidenceReport)) {
  fail(
    `Verify phase finished without writing ${evidenceReport} — no QA Evidence, so the run cannot be trusted.`
  );
}

if (RECORDING_MODE === "on") {
  const size = fs.existsSync(RECORDING_HOST_PATH) ? fs.statSync(RECORDING_HOST_PATH).size : 0;
  if (size < 1024) {
    fail(
      `Recorded verification was requested but ${RECORDING_HOST_PATH} is missing or empty — ` +
        `the run cannot claim video evidence.`
    );
  }
  console.log(`Recorded verification: ${RECORDING_HOST_PATH} (${size} bytes)`);
}

console.log(`\nVerify phase verdict: ${result.output.pass ? "PASS" : "FAIL"}`);
console.log(`  ${result.output.summary}`);

if (!result.output.pass) {
  fail(
    `Verify phase failed acceptance criteria:\n` +
      result.output.failedCriteria.map((c) => `- ${c}`).join("\n") +
      `\n\n${result.output.summary}`
  );
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("VERIFY_PHASE_TIMEOUT")),
      VERIFY_TIMEOUT_MINUTES * 60 * 1000
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } catch (err) {
    if (err instanceof Error && err.message === "VERIFY_PHASE_TIMEOUT") {
      // The sandbox container may still be running; the workflow's reap step
      // (cancelled() || failure()) kills it after this process exits.
      fail(
        `Verify phase exceeded its ${VERIFY_TIMEOUT_MINUTES}-minute internal timeout. ` +
          `The verify agent never returned a verdict — treat as not verified. ` +
          `Tune with VERIFY_TIMEOUT_MINUTES if this task legitimately needs longer.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer!);
  }
}

function fail(message: string): never {
  console.error(`\nFAILED: ${message}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "failure_reason.txt"), message);
  process.exit(1);
}
