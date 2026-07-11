// Convex integrity gate — codegen + schema validation with zero credentials.
//
// Incident this prevents (arketix/acredix run 28749642800, 2026-07-05): the
// implement agent couldn't run `convex codegen` in the sandbox ("no Convex
// login"), so it HAND-APPLIED the _generated/*.d.ts deltas — ~125 lines of
// divergence from canonical codegen that typecheck happened to accept.
// Hand-edited codegen is a corruption vector; this gate makes it impossible
// to ship: it regenerates _generated with REAL codegen against a keyless
// anonymous local Convex backend (CONVEX_AGENT_MODE=anonymous — no login, no
// deploy key). Schema/type validation failures fail the RUN. Divergent
// committed _generated does NOT fail the run (since v2.5.1/2.4.3): by the
// time divergence is measured, the working tree holds canonical codegen that
// typecheck + schema push already validated, so the gate SELF-HEALS — it
// commits the canonical output itself (a visible `[convex-gate]` commit in
// the PR) instead of discarding a whole implement run over machine output.
// (andyChat run 28868627711, 2026-07-07: a full slice-4 implement+review was
// lost to a hand-edited api.d.ts the prompt already forbade — prompts don't
// make this impossible, the gate does.) Hand-edits still can never ship:
// they are overwritten by real codegen either way. If the agent's code
// depended on phantom hand-written types, PR CI typecheck fails the merge —
// the error surfaces at review instead of burning the run.
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
import * as os from "node:os";
import * as path from "node:path";
import { execSync, spawn } from "node:child_process";

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
// Isolated HOME: on self-hosted runners the host user may have a real Convex
// login (~/.convex/config.json) — convex 1.31 then tries to reconcile the
// anonymous-agent deployment against the account and prompts interactively,
// killing the gate (bcr run 28780385669, 2026-07-06: "not linked with your
// account", persistent backend never came up). A scratch HOME makes the gate
// credential-blind like the cloud VM, and keeps its backend state away from
// the host user's real local deployments in ~/.convex/convex-backend-state.
// The convex binary resolves from the checkout's node_modules, not $HOME.
const gateHome = fs.mkdtempSync(path.join(os.tmpdir(), "convex-gate-home-"));
const env = {
  ...process.env,
  CONVEX_AGENT_MODE: "anonymous",
  HOME: gateHome,
};

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

// 0. Reap lingering local backends only on disposable hosted runners. The
// self-hosted Docker lane executes this gate on the shared Mac host, so a broad
// pkill there can terminate unrelated developer sessions or another repo's gate.
// Manual local invocations are also never allowed to reap host processes. A
// Vercel phase helper runs inside a disposable microVM and may skip this block:
// provider teardown deletes that VM before the host-side final gate, which runs
// on a disposable GitHub/Blacksmith runner and is safe to reap.
if (
  process.env.GITHUB_ACTIONS === "true" &&
  process.env.SANDCASTLE_SANDBOX !== "docker"
) {
  try {
    execSync("pkill -f convex-local-backend", { stdio: "ignore" });
    execSync("sleep 2");
    console.log("convex-gate: reaped a lingering backend on this disposable runner");
  } catch {
    /* none running — the normal case */
  }
} else {
  console.log("convex-gate: skipped broad backend reap on a shared/manual host");
}

// 1. Repo-specific prep (e.g. acredix's workspace symlinks). Fatal if it fails.
if (GATE_PREP) sh(GATE_PREP);

// 1b. tsc resolution: convex resolves the compiler at the RELATIVE path
// `node_modules/typescript/bin/tsc` inside the convex dir (typecheck.js runTsc
// — not $PATH). Bun workspaces hoist typescript to the repo root, so a
// workspace convexDir can lack a local copy and `--typecheck=enable` dies with
// "No tsc binary found" (andyChat run 28788950712, 2026-07-06 — same root
// cause its convex-prod-deploy dry-run hit in bb5e09bd). Link the hoisted
// compiler in instead of weakening the gate to --typecheck=try/disable.
//
// lstat-aware on purpose: on the docker lane the container's workspace syncs
// back to the host, and bun's container-absolute node_modules symlinks arrive
// BROKEN on the host — existsSync() follows the link and says "absent" while
// symlinkSync() hits EEXIST and crashed the gate uncaught (andyChat run
// 28792950059, 2026-07-06). Probe the actual file convex probes, replace
// whatever dead entry sits at the link path, and never crash the gate from
// this block — if linking fails, the real gate below reports honestly.
try {
  const localTs = path.join(dirAbs, "node_modules", "typescript");
  const hoistedTs = path.resolve("node_modules", "typescript");
  const tscUsable = fs.existsSync(path.join(localTs, "bin", "tsc"));
  if (!tscUsable && fs.existsSync(path.join(hoistedTs, "bin", "tsc"))) {
    console.log(
      "convex-gate: typescript not resolvable in convexDir — linking the hoisted copy for convex typecheck."
    );
    fs.rmSync(localTs, { recursive: true, force: true }); // clears broken symlinks/dead dirs
    fs.mkdirSync(path.dirname(localTs), { recursive: true });
    fs.symlinkSync(hoistedTs, localTs);
  }
} catch (e) {
  console.warn(
    `convex-gate: tsc link attempt failed (${e}) — continuing; the validation below will report the real state.`
  );
}

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
  // First try the direct writes (works on CLI lines where `env set` reaches a
  // stopped anonymous deployment). Older pins — bcr's convex 1.31 — refuse with
  // "Local backend isn't running" (run 28756709922, 2026-07-05), so any key
  // that fails is retried against a persistent backend kept alive just for
  // the env writes.
  const pending = gateEnvKeys.filter(
    (key) => !sh(`bun x convex env set ${key} '${GATE_ENV[key]}'`, true)
  );
  if (pending.length > 0) {
    console.log(
      "convex-gate: env set needs a running backend — keeping one alive for the writes…"
    );
    const dev = spawn(
      "bun",
      [
        "x",
        "convex",
        "dev",
        "--typecheck=disable",
        "--codegen=disable",
        "--tail-logs=disable",
      ],
      { cwd: dirAbs, env, stdio: "ignore", detached: true }
    );
    // Readiness = the env write itself succeeding against OUR deployment.
    // Never health-poll a fixed port: choosePorts skips busy ports, so the
    // scratch-HOME backend may come up anywhere, and a FOREIGN backend on
    // 3210 (e.g. a dev session on the runner host) answers /version with a
    // healthy 200 and turns the poll into a lie (live-proven: bcr #114 run
    // 28922561767, acredix dev backend on 3210).
    let remaining = [...pending];
    const deadline = Date.now() + 120_000;
    while (remaining.length > 0 && Date.now() < deadline) {
      remaining = remaining.filter(
        (key) => !sh(`bun x convex env set ${key} '${GATE_ENV[key]}'`, true)
      );
      if (remaining.length > 0) await new Promise((r) => setTimeout(r, 2000));
    }
    if (remaining.length > 0) {
      try {
        process.kill(-dev.pid!, "SIGTERM");
      } catch {}
      fail(
        `Anonymous local Convex backend never accepted env writes for [${remaining.join(", ")}] within 120s while seeding gate env vars.`
      );
    }
    try {
      process.kill(-dev.pid!, "SIGTERM");
    } catch {}
    // Let the backend release the port/deployment lock before the real push.
    await new Promise((r) => setTimeout(r, 3000));
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

// 4. Divergence check + self-heal: regenerated _generated should equal
// committed _generated. When it doesn't, the working tree now holds the
// canonical output — validated by the typecheck+schema push above — so commit
// it here rather than failing the run (see header).
const repoRoot = path.resolve(".");
const status = execSync(`git status --porcelain -- "${CONVEX_DIR}"`, {
  cwd: repoRoot,
  encoding: "utf8",
});
const generatedDrift = status
  .split("\n")
  .filter((line) => line.includes("_generated"));
if (generatedDrift.length > 0) {
  console.warn(
    `convex-gate: committed _generated diverged from real codegen (agent hand-edited or forgot --regen):\n` +
      generatedDrift.map((l) => `  ${l}`).join("\n") +
      `\nconvex-gate: SELF-HEAL — committing the canonical codegen output.`
  );
  // Porcelain line: XY<space>path (codegen never renames; _generated paths
  // have no spaces). `git add` stages modifications, additions and deletions.
  const files = generatedDrift.map((l) => l.slice(3).trim()).filter(Boolean);
  try {
    execSync(`git add -- ${files.map((f) => JSON.stringify(f)).join(" ")}`, {
      cwd: repoRoot,
      stdio: "inherit",
    });
    execSync(
      `git -c user.name="afk-pipeline convex-gate" -c user.email="convex-gate@sandcastle.invalid" ` +
        `commit -m "chore(convex): self-heal _generated to canonical codegen [convex-gate]" ` +
        `-m "The implement agent committed _generated files diverging from real codegen. The gate regenerated them against an anonymous local backend (typecheck + schema validation passed) and committed the canonical output. Reviewer: this commit is pure machine output; if earlier commits relied on hand-written phantom types, PR CI typecheck will fail."`,
      { cwd: repoRoot, stdio: "inherit" }
    );
  } catch (e) {
    fail(
      `Committed Convex _generated files diverge from real codegen output and the self-heal commit failed (${e}). ` +
        `Regenerate with \`bun .sandcastle/implement/convex-gate.ts --regen\` and commit the result; never hand-apply codegen deltas.`
    );
  }
  console.log(
    "convex-gate: PASS (self-healed) — schema/types validate; _generated replaced with canonical codegen in its own commit."
  );
} else {
  console.log(
    "convex-gate: PASS — schema/types validate and committed _generated matches real codegen."
  );
}

function fail(message: string): never {
  console.error(`\nFAILED: ${message}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "failure_reason.txt"), message);
  process.exit(1);
}
