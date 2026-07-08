/**
 * Visual Recap phase — runs in a SEPARATE `recap` job (issue #19) on a
 * GitHub-hosted `ubuntu-latest` VM after the draft PR is opened, regardless of
 * which lane implemented. Splitting it out frees the Mac mini's single runner
 * slot the moment the draft PR + issue comment exist. Because the job is always
 * GitHub-hosted, this always runs the `none`/noSandbox lane, so the agent's
 * `recap-source.json` lands directly in the checked-out working tree.
 *
 * Port of BuilderIO's pr-visual-recap workflow into our sandcastle pipeline
 * (decided 2026-07-03: recap is a pipeline phase with the PR as input, not a
 * separate pull_request-triggered workflow — that one skips draft PRs and
 * requires an ANTHROPIC_API_KEY). The deterministic steps are the official
 * `agent-native recap <cmd>` CLI (pinned exactly, never @latest); only the
 * MDX-authoring step is an agent run, dispatched through runtime.ts.
 *
 * Best-effort by contract: the workflow gates the job `continue-on-error`, so a
 * recap failure never blocks the PR. It short-circuits before any install on a
 * tiny diff, and echoes a timing line per subphase.
 */
import { execFileSync, execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { agentEnv, chooseSandbox, sandboxHooks } from "../runtime";

const ISSUE_NUMBER = required("ISSUE_NUMBER");
const PR_NUMBER = required("PR_NUMBER");
const GH_REPO = required("GH_REPO");
const GH_TOKEN = required("GH_TOKEN");
const TOKEN = required("CLAUDE_CODE_OAUTH_TOKEN");
const APP_URL = required("PLAN_RECAP_APP_URL").replace(/\/$/, "");
const RECAP_TOKEN = required("PLAN_RECAP_TOKEN");
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "/tmp";
// Pinned recap CLI version — the workflow passes the exact version it also keys
// the Playwright cache on (never @latest). Fallback keeps local debugging runs
// working when the env var is unset.
const CLI_VERSION = process.env.RECAP_CLI_VERSION ?? "0.85.6";

// Subphase timing — echo elapsed seconds so future optimization measures
// instead of guessing (issue #19). `since()` returns whole seconds from a mark.
function since(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Recap CLI paths — installed lazily to a temp prefix AFTER the tiny-diff gate
// so a skipped recap never pays for a cold install. `cli()` runs the CLI once
// installed (also gives us its own playwright for the screenshot step).
// ---------------------------------------------------------------------------
const CLI_PREFIX = path.join(OUTPUT_DIR, "recap-cli");
const CLI = path.join(CLI_PREFIX, "node_modules", ".bin", "agent-native");
const PLAYWRIGHT = path.join(CLI_PREFIX, "node_modules", ".bin", "playwright");

function cli(args: string[], opts: { env?: Record<string, string>; canFail?: boolean } = {}): string {
  try {
    return execFileSync(CLI, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
      env: { ...process.env, ...opts.env },
    });
  } catch (e) {
    if (opts.canFail) return "";
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Diff range.
// ---------------------------------------------------------------------------
const HEAD_SHA = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const BASE_SHA = execSync("git merge-base origin/main HEAD", { encoding: "utf8" }).trim();

// ---------------------------------------------------------------------------
// Tiny-diff gate — runs BEFORE any install so a skipped recap costs seconds,
// not a cold CLI + browser download. Replicates the CLI's classifyDiff rule
// (tiny = ≤1 changed file AND ≤8 changed lines over the same noise excludes)
// but ALSO excludes docs/evidence/** so the pipeline's committed QA screenshots
// can't inflate a trivial code change past the gate (issue #19).
// ---------------------------------------------------------------------------
const tGate = Date.now();
const DIFF_PATHSPECS = [
  ".",
{{RECAP_EVIDENCE_EXCLUDES}}
  ":(exclude)pnpm-lock.yaml",
  ":(exclude)**/dist/**",
  ":(exclude)**/*.snap",
  ":(exclude)**/*.lock",
  ":(exclude)**/package-lock.json",
  ":(exclude)**/bun.lockb",
  ":(exclude)**/bun.lock",
  ":(exclude)**/.next/**",
  ":(exclude)**/*.min.js",
  ":(exclude)**/*.min.css",
  ":(exclude)**/*.map",
];
function gitDiff(extraArgs: string[]): string {
  return execFileSync("git", ["diff", "--no-color", ...extraArgs, `${BASE_SHA}...${HEAD_SHA}`, "--", ...DIFF_PATHSPECS], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}
const gatedFiles = gitDiff(["--name-only"]).split("\n").filter((l) => l.length > 0).length;
const gatedLines = gitDiff([])
  .split("\n")
  .filter((l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---")).length;
const isTiny = gatedFiles <= 1 && gatedLines <= 8;
console.log(`[recap][timing] gate: ${since(tGate)} (${gatedFiles} files / ${gatedLines} lines, excl. docs/evidence)`);
if (isTiny) {
  console.log("[recap] diff is tiny — recap adds no review value, skipping before install.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Install the pinned recap CLI (only reached for non-tiny diffs).
// ---------------------------------------------------------------------------
const tInstall = Date.now();
if (!fs.existsSync(CLI)) {
  console.log(`[recap] installing @agent-native/core@${CLI_VERSION} CLI…`);
  execSync(`npm install --prefix "${CLI_PREFIX}" --no-audit --no-fund @agent-native/core@${CLI_VERSION}`, {
    stdio: "inherit",
  });
}
console.log(`[recap][timing] install: ${since(tInstall)}`);

// ---------------------------------------------------------------------------
// Warm up the plan app — cold Vercel instances transiently 404 while the
// async plugin mounts finish (learned 2026-07-03).
// ---------------------------------------------------------------------------
for (let i = 0; i < 5; i++) {
  const res = await fetch(`${APP_URL}/_agent-native/actions/get-plan-blocks?format=reference`).catch(() => null);
  if (res?.ok) break;
  console.log(`[recap] warm-up attempt ${i + 1} (${res?.status ?? "network error"})…`);
  await new Promise((r) => setTimeout(r, 3000));
}

// ---------------------------------------------------------------------------
// Collect the bounded diff for the recap agent. The CLI reports tiny/huge via
// GITHUB_OUTPUT; the tiny short-circuit above already handled the skip case
// (the CLI's tiny classification INCLUDES docs/evidence, so it can only be
// looser than ours — kept as a defensive backstop).
// ---------------------------------------------------------------------------
const ghOut = path.join(os.tmpdir(), `recap-gh-output-${PR_NUMBER}`);
fs.writeFileSync(ghOut, "");
cli(["recap", "collect-diff", "--base", BASE_SHA, "--head", "HEAD", "--out", "recap.diff", "--stat", "recap.stat"], {
  env: { GITHUB_OUTPUT: ghOut },
});
const diffFlags = fs.readFileSync(ghOut, "utf8");
const DIFF_TINY = /(^|\n)tiny=true(\n|$)/.test(diffFlags) ? "true" : "false";
const DIFF_HUGE = /(^|\n)huge=true(\n|$)/.test(diffFlags) ? "true" : "false";
if (DIFF_TINY === "true") {
  console.log("[recap] diff is tiny — recap adds no review value, skipping.");
  process.exit(0);
}

// Secret scan — fail CLOSED like upstream: on scanner error, suppress.
let scanJson = '{"suppressed":true,"reason":"secret scan failed to run; failing closed"}';
try {
  scanJson = cli(["recap", "scan", "--diff", "recap.diff", "--mode", "high-confidence"]).trim();
} catch {}
const suppressed = (() => {
  try {
    return JSON.parse(scanJson).suppressed === true;
  } catch {
    return true;
  }
})();

const PREV_PLAN_ID = cli(
  ["recap", "comment", "find-plan-id", "--repo", GH_REPO, "--issue", PR_NUMBER, "--token", GH_TOKEN],
  { canFail: true },
).trim();

let planUrl = "";
let urlReason = "";
let shotOk = "false";
let shotReason = "screenshot step did not run";
let lightImageUrl = "";
let darkImageUrl = "";

if (!suppressed) {
  cli(["recap", "block-reference", "--app-url", APP_URL, "--out", "recap-blocks.md"], { canFail: true });
  if (!fs.existsSync("recap-blocks.md")) {
    fs.writeFileSync(
      "recap-blocks.md",
      "Live plan block reference unavailable. Author conservative MDX; the deterministic publisher validates the source before posting.\n",
    );
  }

  const promptArgs = [
    "recap", "build-prompt",
    "--diff", "recap.diff", "--stat", "recap.stat", "--block-reference", "recap-blocks.md",
    "--pr", PR_NUMBER, "--repo", GH_REPO, "--head", HEAD_SHA,
    "--app-url", APP_URL, "--skill-source", "auto", "--out", "recap-prompt.md",
  ];
  if (DIFF_HUGE === "true") promptArgs.push("--huge");
  if (PREV_PLAN_ID) promptArgs.push("--prev-plan-id", PREV_PLAN_ID);
  cli(promptArgs);

  // Append our MDX authoring guardrail (issue #23). The stock CLI prompt never
  // warns against raw angle-bracket placeholder tokens; when the diff text
  // contains a `<placeholder>`-style token (e.g. the flag contract's literal
  // `<reason>`), quoting it raw makes MDX parse it as an unclosed JSX tag and
  // the Plan app rejects publish with a 422. The rule tells the author to wrap
  // such tokens in code spans.
  const rulesPath = path.join(path.dirname(new URL(import.meta.url).pathname), "mdx-authoring-rules.md");
  fs.appendFileSync("recap-prompt.md", fs.readFileSync(rulesPath, "utf8"));

  // Author the recap MDX to disk (issue #19). This job runs on a GitHub-hosted
  // VM with noSandbox, so the agent's working directory IS this one — the
  // `recap-source.json` the stock prompt tells it to write lands right here.
  // We no longer force the (potentially huge) MDX back through a
  // structured-output blob: extraction on the large payload was what failed on
  // attempt 1 of run 28656509178 and forced a costly resumed retry. A single
  // iteration authors + writes the file in one pass.
  const sourcePath = path.resolve("recap-source.json");
  fs.rmSync(sourcePath, { force: true });

  const tAuthor = Date.now();
  await sandcastle.run({
    name: `recap-#${ISSUE_NUMBER}-pr-${PR_NUMBER}`,
    // Recap is cloud-only and Claude-tuned; ENGINE overrides do not apply here.
    agent: sandcastle.claudeCode("claude-opus-4-8", {
      effort: "medium",
      env: agentEnv(TOKEN),
    }),
    sandbox: chooseSandbox(TOKEN),
    hooks: sandboxHooks(),
    logging: { type: "stdout" },
    promptFile: path.resolve("recap-prompt.md"),
  });
  console.log(`[recap][timing] authoring: ${since(tAuthor)}`);

  if (!fs.existsSync(sourcePath)) {
    urlReason = "recap agent did not write recap-source.json to disk";
  } else {
    const tPublish = Date.now();
    const urlPath = path.join(OUTPUT_DIR, "recap-url.txt");
    const publishArgs = [
      "recap", "publish",
      "--source", sourcePath, "--out", urlPath,
      "--repo", GH_REPO, "--pr", PR_NUMBER,
      "--app-url", APP_URL, "--token", RECAP_TOKEN,
      "--source-type", "pull-request", "--source-repo", GH_REPO,
      "--source-pr-number", PR_NUMBER, "--source-pr-state", "open",
    ];
    if (PREV_PLAN_ID) publishArgs.push("--prev-plan-id", PREV_PLAN_ID);
    cli(publishArgs);
    console.log(`[recap][timing] publish: ${since(tPublish)}`);

    // Canonicalize: trust only <APP_URL>/(plans|recaps)/<id> shapes.
    const raw = fs.existsSync(urlPath) ? fs.readFileSync(urlPath, "utf8").trim() : "";
    const match = raw.match(/\/(?:plans|recaps)\/([A-Za-z0-9_-]+)\/?$/);
    if (match && raw.startsWith(APP_URL)) {
      const planId = match[1];
      planUrl = `${APP_URL}/recaps/${planId}`;
      // Publish public-by-link: the recap CLI hardcodes visibility:"org", so the
      // PR-comment link hits a sign-in wall. Flip it to public after a successful
      // publish (commenting stays login-gated upstream — that's by design). Recap
      // is best-effort: a failed flip logs a warning and never fails the phase.
      try {
        const res = await fetch(`${APP_URL}/_agent-native/actions/set-resource-visibility`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${RECAP_TOKEN}` },
          body: JSON.stringify({ resourceType: "plan", resourceId: planId, visibility: "public" }),
        });
        if (!res.ok) {
          console.warn(`[recap] set-resource-visibility returned ${res.status}; recap link may require sign-in.`);
        }
      } catch (e) {
        console.warn(
          `[recap] set-resource-visibility failed: ${e instanceof Error ? e.message : String(e)}; recap link may require sign-in.`,
        );
      }
    } else {
      urlReason = raw
        ? `publisher returned a URL outside the configured plan app: ${raw.slice(0, 120)}`
        : "recap publish produced no URL";
    }
  }

  // Screenshot — pure polish; every failure path just posts a link-only comment.
  if (planUrl) {
    const tShots = Date.now();
    // `playwright install` reuses the cached browser (workflow caches
    // ~/.cache/ms-playwright keyed on the pinned CLI version); on a cache hit
    // this is a no-op, so Chrome-for-Testing downloads only on a cold miss.
    try {
      execFileSync(PLAYWRIGHT, ["install", "--with-deps", "chromium"], { stdio: "inherit" });
    } catch {
      try {
        execFileSync(PLAYWRIGHT, ["install", "chromium"], { stdio: "inherit" });
      } catch {}
    }
    for (const theme of ["light", "dark"] as const) {
      const outPng = path.join(OUTPUT_DIR, `recap-${theme}.png`);
      const shotJson = cli(
        ["recap", "shot", "--url", planUrl, "--token", RECAP_TOKEN, "--app-url", APP_URL,
         "--out", outPng, "--theme", theme, "--image-cache-key", `${PR_NUMBER}-${HEAD_SHA.slice(0, 7)}`],
        { canFail: true },
      );
      try {
        const parsed = JSON.parse(shotJson || "{}");
        if (typeof parsed.imageUrl === "string" && parsed.imageUrl) {
          if (theme === "light") lightImageUrl = parsed.imageUrl;
          else darkImageUrl = parsed.imageUrl;
        } else if (theme === "light" && typeof parsed.reason === "string") {
          shotReason = parsed.reason.slice(0, 300);
        }
      } catch {}
    }
    if (lightImageUrl || darkImageUrl) {
      shotOk = "true";
      shotReason = "";
    }
    console.log(`[recap][timing] screenshots: ${since(tShots)}`);
  }
}

// ---------------------------------------------------------------------------
// Sticky PR comment — the CLI reads its inputs from env.
// ---------------------------------------------------------------------------
cli(["recap", "comment", "upsert", "--repo", GH_REPO, "--issue", PR_NUMBER, "--token", GH_TOKEN, "--head-sha", HEAD_SHA], {
  env: {
    PLAN_URL: planUrl,
    RECAP_IMAGE_URL: lightImageUrl,
    RECAP_LIGHT_IMAGE_URL: lightImageUrl,
    RECAP_DARK_IMAGE_URL: darkImageUrl,
    RECAP_SHOT_OK: shotOk,
    RECAP_SHOT_REASON: shotReason,
    SUPPRESSED: suppressed ? "true" : "false",
    SUPPRESSED_JSON: scanJson,
    DIFF_HUGE,
    DIFF_TINY,
    PREV_PLAN_ID,
    RECAP_URL_REASON: urlReason,
  },
});

// Leave the workspace clean — these were runner-side scratch files.
for (const f of ["recap.diff", "recap.stat", "recap-blocks.md", "recap-prompt.md", "recap-source.json", "recap-url.txt"]) {
  fs.rmSync(f, { force: true });
}

if (planUrl) {
  console.log(`\n[recap] Visual recap published: ${planUrl}`);
} else {
  console.error(`\n[recap] no recap URL (${urlReason || (suppressed ? "diff suppressed by secret scan" : "unknown")})`);
  process.exit(1);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}
