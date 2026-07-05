// Convex integrity gate — codegen + schema validation with zero credentials.
//
// Incident this prevents (arketix/acredix run 28749642800, 2026-07-05): the
// implement agent couldn't run `convex codegen` in the sandbox ("no Convex
// login"), so it HAND-APPLIED the _generated/*.d.ts deltas — ~125 lines of
// divergence from canonical codegen that typecheck happened to accept.
// Hand-edited codegen is a corruption vector; this gate makes it impossible
// to ship: it regenerates _generated with REAL codegen against a keyless
// anonymous local Convex backend (CONVEX_AGENT_MODE=anonymous — no login, no
// deploy key) and fails the RUN when the committed files differ, or when the
// branch's schema/functions don't push cleanly.
//
// Two modes:
//   bun .sandcastle/implement/convex-gate.ts          workflow gate: validate,
//                                                     then fail on divergence
//   bun .sandcastle/implement/convex-gate.ts --regen  agent helper: regenerate
//                                                     so the agent can commit
//
// Plain `convex codegen` is NOT a substitute — it requires a configured
// deployment in the pinned convex versions (verified 2026-07-05); the
// anonymous `dev --once` below is the only keyless path, and it also
// validates the schema so schema conflicts fail the run, not the merge.
//
// Repos without a Convex package leave convexDir empty in .sandcastle/config —
// the gate self-skips instantly.

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const CONVEX_DIR = "{{CONVEX_DIR}}";
const GATE_PREP = "{{CONVEX_GATE_PREP}}";
const GATE_ENV: Record<string, string> = {{CONVEX_GATE_ENV_JSON}};
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "/tmp";
const REGEN_ONLY = process.argv.includes("--regen");

if (!CONVEX_DIR) {
  console.log(
    "convex-gate: convexDir not configured — skipping (repo has no Convex package)."
  );
  process.exit(0);
}

const dirAbs = path.resolve(CONVEX_DIR);
const env = { ...process.env, CONVEX_AGENT_MODE: "anonymous" };

function sh(cmd: string, tolerate = false): boolean {
  console.log(`convex-gate$ ${cmd}`);
  try {
    execSync(cmd, { cwd: dirAbs, env, stdio: "inherit" });
    return true;
  } catch {
    if (tolerate) return false;
    fail(`Command failed in ${CONVEX_DIR}: ${cmd}`);
  }
}

// 1. Repo-specific prep (e.g. acredix's workspace symlinks). Fatal if it fails.
if (GATE_PREP) sh(GATE_PREP);

// 2. Bootstrap dance: a fresh anonymous deployment starts with an empty env,
// so a first push can fail on missing env vars referenced by auth.config
// (e.g. CLERK_JWT_ISSUER_DOMAIN). Boot once tolerantly to create the
// deployment, seed the configured vars, then do the real validated push.
// (Pattern proven by acredix backend-strict.yml and live-tested on superaseo.)
const gateEnvKeys = Object.keys(GATE_ENV);
if (gateEnvKeys.length > 0) {
  sh(
    "bun x convex dev --once --typecheck=disable --codegen=disable --tail-logs=disable",
    true // tolerated: the only job of this pass is to create the deployment
  );
  for (const key of gateEnvKeys) {
    sh(`bun x convex env set ${key} '${GATE_ENV[key]}'`);
  }
}

// 3. The real gate: codegen + typecheck + schema validation in one push.
console.log("convex-gate: running real codegen + schema/type validation…");
try {
  execSync(
    "bun x convex dev --once --typecheck=enable --codegen=enable --tail-logs=disable",
    { cwd: dirAbs, env, stdio: "inherit" }
  );
} catch {
  fail(
    `Convex validation failed in ${CONVEX_DIR}: the branch's schema or functions do not push cleanly (schema conflict, type error, or invalid function). Fix the Convex code — do not weaken or bypass this gate. Note: prod \`convex deploy\` additionally validates the schema against existing documents, so a change that passes here can still need the two-step optional-field + backfill pattern.`
  );
}

if (REGEN_ONLY) {
  console.log(
    "convex-gate: --regen done. Commit any regenerated _generated files."
  );
  process.exit(0);
}

// 4. Divergence check: regenerated _generated must equal committed _generated.
const status = execSync(`git status --porcelain -- "${CONVEX_DIR}"`, {
  cwd: path.resolve("."),
  encoding: "utf8",
});
const generatedDrift = status
  .split("\n")
  .filter((line) => line.includes("_generated"));
if (generatedDrift.length > 0) {
  fail(
    `Committed Convex _generated files diverge from real codegen output:\n` +
      generatedDrift.map((l) => `  ${l}`).join("\n") +
      `\n_generated is machine output — the agent hand-edited it or forgot to regenerate. ` +
      `Regenerate with \`bun .sandcastle/implement/convex-gate.ts --regen\` and commit the result; never hand-apply codegen deltas.`
  );
}

console.log(
  "convex-gate: PASS — schema/types validate and committed _generated matches real codegen."
);

function fail(message: string): never {
  console.error(`\nFAILED: ${message}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "failure_reason.txt"), message);
  process.exit(1);
}
