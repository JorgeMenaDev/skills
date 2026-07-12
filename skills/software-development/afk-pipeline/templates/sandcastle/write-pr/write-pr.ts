import * as fs from "node:fs";
import * as path from "node:path";
import {
  buildConvergenceSection,
  loadConvergenceManifest,
} from "./convergence";

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "/tmp";

// Attempts manifest path (retry loop). Absent/unreadable ⇒ empty Convergence
// section (clean first pass surfaces nothing). Same env-conditioning pattern
// as VERIFY_MODE degrade.
const ATTEMPTS_SUMMARY_PATH =
  process.env.ATTEMPTS_SUMMARY_PATH ??
  path.join(process.env.RUNNER_TEMP ?? "/tmp", "attempts-summary.json");

const CONVERGENCE_SECTION = buildConvergenceSection(
  loadConvergenceManifest(ATTEMPTS_SUMMARY_PATH)
);

// Fixture smoke: render conditioned prompt tokens without a sandcastle agent.
if (process.env.AFK_WRITE_PR_SIMULATE === "1") {
  const out = {
    CONVERGENCE_SECTION,
    hasConvergence: CONVERGENCE_SECTION.trim().length > 0,
    VERIFY_MODE: process.env.VERIFY_MODE ?? "full",
  };
  const dest = process.argv[2];
  if (dest) {
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  } else {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  }
  process.exit(0);
}

const ISSUE_NUMBER = required("ISSUE_NUMBER");
const ISSUE_TITLE = required("ISSUE_TITLE");
const ISSUE_BODY = required("ISSUE_BODY");
const BRANCH = required("BRANCH");
const TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;
// Verify Profile (issue #20). `off` means the verify phase was skipped by design
// — there is no QA Evidence, so the PR description must say so instead of
// pointing at screenshots. Defaults to `full` for any brief that says nothing.
const VERIFY_MODE = process.env.VERIFY_MODE ?? "full";
const VERIFY_REASON = process.env.VERIFY_REASON ?? "";

const { z } = await import("zod");
const sandcastle = await import("@ai-hero/sandcastle");
const { chooseAgent, chooseSandbox, sandboxHooks } = await import("../runtime");
const { runWithRetry } = await import("../run-with-retry");

const PromptOutput = z.object({
  prTitle: z.string().min(1).max(256),
  prDescription: z.string().min(1),
});

const result = await runWithRetry({
  name: `write-pr-#${ISSUE_NUMBER}`,
  agent: chooseAgent(TOKEN, {}),
  sandbox: chooseSandbox(TOKEN),
  hooks: sandboxHooks(),
  logging: { type: "stdout" },
  promptFile: path.join(import.meta.dirname, "prompt.md"),
  promptArgs: {
    ISSUE_NUMBER,
    ISSUE_TITLE,
    ISSUE_BODY,
    BRANCH,
    VERIFY_MODE,
    VERIFY_REASON: VERIFY_REASON || "no reason provided",
    CONVERGENCE_SECTION,
  },
  output: sandcastle.Output.object({
    tag: "output",
    schema: PromptOutput,
  }),
});

fs.writeFileSync(path.join(OUTPUT_DIR, "pr_title.txt"), result.output.prTitle);
fs.writeFileSync(
  path.join(OUTPUT_DIR, "pr_description.txt"),
  result.output.prDescription
);

console.log(`\nWrote PR metadata to ${OUTPUT_DIR}`);
console.log(`  title: ${result.output.prTitle}`);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}
