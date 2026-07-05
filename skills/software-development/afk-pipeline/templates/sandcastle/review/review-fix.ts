/**
 * Review disposition pass — runs only when review.ts reported findings. A fresh
 * agent session triages each finding (fix or reject-with-rationale), records
 * dispositions in the evidence dir, and commits on the branch — BEFORE verify,
 * so the evidence proves the post-fix code.
 *
 * Advisory like review.ts: the workflow step carries `continue-on-error: true`;
 * a crash here leaves the original implement commits intact and the run
 * proceeds to verify.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { agentEnv, chooseSandbox, sandboxHooks } from "../runtime";

const ISSUE_NUMBER = required("ISSUE_NUMBER");
const BRANCH = required("BRANCH");
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "/tmp";
const TOKEN = required("CLAUDE_CODE_OAUTH_TOKEN");

const findingsPath = path.join(OUTPUT_DIR, "review-findings.md");
const findings = fs.existsSync(findingsPath)
  ? fs.readFileSync(findingsPath, "utf8")
  : "";
if (!findings.trim()) {
  console.log("No findings file — nothing to disposition.");
  process.exit(0);
}

await sandcastle.run({
  name: `review-fix-#${ISSUE_NUMBER}`,
  agent: sandcastle.claudeCode("claude-opus-4-8", {
    effort: "high",
    env: agentEnv(TOKEN),
  }),
  sandbox: chooseSandbox(TOKEN),
  hooks: sandboxHooks(),
  logging: { type: "stdout" },
  promptFile: path.join(import.meta.dirname, "fix-prompt.md"),
  promptArgs: {
    ISSUE_NUMBER,
    BRANCH,
    FINDINGS: findings.slice(0, 20000),
  },
});

console.log(`\nReview disposition pass finished for #${ISSUE_NUMBER}.`);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}
