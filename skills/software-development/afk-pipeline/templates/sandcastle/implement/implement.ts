import * as path from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { chooseImplementAgent, chooseSandbox, sandboxHooks } from "../runtime";

const ISSUE_NUMBER = required("ISSUE_NUMBER");
const ISSUE_TITLE = required("ISSUE_TITLE");
const ISSUE_BODY = required("ISSUE_BODY");
const BRANCH = required("BRANCH");
// Empty on attempt 1; attempt-loop fills the retry envelope on re-entry.
const RETRY_CONTEXT = process.env.RETRY_CONTEXT ?? "";
const TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;

const result = await sandcastle.run({
  name: `implement-#${ISSUE_NUMBER}`,
  agent: chooseImplementAgent(TOKEN),
  sandbox: chooseSandbox(TOKEN),
  hooks: sandboxHooks(),
  logging: { type: "stdout" },
  promptFile: path.join(import.meta.dirname, "prompt.md"),
  promptArgs: {
    ISSUE_NUMBER,
    ISSUE_TITLE,
    ISSUE_BODY,
    BRANCH,
    RETRY_CONTEXT,
  },
});

// Progress gating (HEAD unchanged ⇒ no-progress terminal) is owned by the
// attempt-loop wrapper via SHA comparison — works on non-main base branches
// and does not hardcode `main`. Keep sandcastle's commit count as informational.
console.log(`\nImplementation finished on ${BRANCH}.`);
console.log(`  commits this run: ${result.commits.length}`);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}
