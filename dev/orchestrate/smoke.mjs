#!/usr/bin/env node
// Smoke test for orchestrate-run.mjs: start, adopt, checkpoint, REQUIRES_INIT,
// deferred gates, plus init/inspect regression. Extends the existing example
// specs; no test framework. Run: node dev/orchestrate/smoke.mjs

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, "../../skills/agent-operations/orchestrate/scripts/orchestrate-run.mjs");
const exampleSpec = resolve(here, "../../skills/agent-operations/orchestrate/examples/three-slice-spec.json");

const root = mkdtempSync(join(tmpdir(), "orchestrate-smoke-"));
const env = { ...process.env, XDG_STATE_HOME: join(root, "state") };
delete env.ORCHESTRATE_CONDUCTOR_ID;
delete env.ORCHESTRATE_CONDUCTOR_EPOCH;

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) process.stdout.write(`ok - ${name}\n`);
  else {
    failures += 1;
    process.stderr.write(`FAIL - ${name}${detail ? `\n  ${String(detail).trim().split("\n").join("\n  ")}` : ""}\n`);
  }
};
const helper = (args) => spawnSync("node", [script, ...args], { encoding: "utf8", env });
const git = (dir, args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const readRun = (dir) => JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
const asConductor = ["--conductor-id", "conductor-example", "--conductor-epoch", "1"];

const fixtureRepo = (name) => {
  const repo = join(root, name);
  execFileSync("git", ["clone", "--quiet", origin, repo], { stdio: "ignore" });
  git(repo, ["config", "user.email", "smoke@example.com"]);
  git(repo, ["config", "user.name", "Smoke"]);
  return repo;
};

const origin = join(root, "origin.git");
execFileSync("git", ["init", "--quiet", "--bare", "-b", "main", origin]);
const seed = fixtureRepo("seed");
writeFileSync(join(seed, "README.md"), "fixture\n");
git(seed, ["add", "."]);
git(seed, ["commit", "--quiet", "-m", "fixture"]);
git(seed, ["push", "--quiet", "origin", "main"]);
const head = git(seed, ["rev-parse", "HEAD"]);

// classify: orchestrated path is fail-closed behind init
const orchestrated = helper(["classify", "--slices", "3", "--dependencies", "yes", "--integration-branch", "no", "--shared-resource", "no"]);
check("classify orchestrated emits REQUIRES_INIT", orchestrated.stdout.includes("PATH: orchestrated") && orchestrated.stdout.includes("REQUIRES_INIT:"), orchestrated.stdout);
const simple = helper(["classify", "--slices", "1", "--dependencies", "no", "--integration-branch", "no", "--shared-resource", "no"]);
check("classify simple does not require init", simple.stdout.includes("PATH: simple") && !simple.stdout.includes("REQUIRES_INIT:"), simple.stdout);

// start: one command from spec to reconciled ledger with frontiers
const spec = JSON.parse(readFileSync(exampleSpec, "utf8"));
spec.repo = { path: seed, targetBranch: "main", baseSha: "auto" };
const specPath = join(root, "spec.json");
writeFileSync(specPath, JSON.stringify(spec, null, 2));
const startDir = join(root, "run-start");
const start = helper(["start", "--dir", startDir, "--spec", specPath]);
check("start succeeds", start.status === 0, start.stderr || start.stdout);
check(
  "start emits ledger, locator, clean reconciliation, and write frontier",
  ["RUN:", "LOCATOR:", "RECONCILIATION: clean", 'WRITE_FRONTIER: ["foundation","review"]'].every((token) => start.stdout.includes(token)),
  start.stdout,
);
check("start captured the live base SHA", existsSync(join(startDir, "run.json")) && readRun(startDir).repo.baseSha === head);
const secondStart = helper(["start", "--dir", join(root, "run-start-2"), "--spec", specPath]);
check("second start fails closed on the active run", secondStart.status !== 0 && secondStart.stderr.includes("active run already exists"), secondStart.stderr);

// checkpoint: reconcile + RESUME.md + recorded checkpoint
const checkpoint = helper(["checkpoint", "--run", join(startDir, "run.json"), "--expected-revision", String(readRun(startDir).revision), "--reason", "wave boundary", ...asConductor]);
check("checkpoint succeeds", checkpoint.status === 0, checkpoint.stderr || checkpoint.stdout);
const resume = existsSync(join(startDir, "RESUME.md")) ? readFileSync(join(startDir, "RESUME.md"), "utf8") : "";
check("RESUME.md carries frontiers, attempts, and next safe act", ["## Frontiers", "## Active attempts", "## Next safe act"].every((token) => resume.includes(token)), resume.slice(0, 400));
check("checkpoint is recorded in the ledger", readRun(startDir).checkpoints.length === 1 && readRun(startDir).checkpoints[0].reason === "wave boundary");
check("no staged resume document is left behind", !existsSync(join(startDir, "RESUME.md.staged")));
const stable = (value) => Array.isArray(value) ? value.map(stable) : !value || typeof value !== "object" ? value : Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
const digestOf = (value) => createHash("sha256").update(`${JSON.stringify(stable(value), null, 2)}\n`).digest("hex");
check(
  "RESUME.md records the committed revision and digest",
  resume.includes(`- Revision: ${readRun(startDir).revision}`) && resume.includes(digestOf(readRun(startDir))),
  resume.slice(0, 400),
);
rmSync(join(startDir, "RESUME.md"));
const checkpointCountBefore = readRun(startDir).checkpoints.length;
const renderOnly = helper(["checkpoint", "--run", join(startDir, "run.json"), "--render-only"]);
check(
  "checkpoint --render-only regenerates RESUME.md without mutating the ledger",
  renderOnly.status === 0 && existsSync(join(startDir, "RESUME.md")) && readRun(startDir).checkpoints.length === checkpointCountBefore,
  renderOnly.stderr || renderOnly.stdout,
);
mkdirSync(join(startDir, ".run.lock"), { recursive: true });
writeFileSync(join(startDir, ".run.lock", "owner.json"), JSON.stringify({ id: "conductor-example", epoch: 1, pid: 999999 }));
const lockedRender = helper(["checkpoint", "--run", join(startDir, "run.json"), "--render-only"]);
check("render-only fails closed while the run lock is held", lockedRender.status !== 0 && lockedRender.stderr.includes("run lock is held"), lockedRender.stderr);
rmSync(join(startDir, ".run.lock"), { recursive: true, force: true });

// deferred gates: open gate blocks completion; malformed gate fails closed
const gatePatch = join(root, "gate-patch.json");
writeFileSync(gatePatch, JSON.stringify({ deferredGates: [{ id: "provider-oauth", sliceId: "review", description: "Real provider OAuth proof deferred", status: "open", evidence: [] }] }));
const gateUpdate = helper(["update", "--run", join(startDir, "run.json"), "--expected-revision", String(readRun(startDir).revision), "--patch", gatePatch, ...asConductor]);
check("open deferred gate is accepted", gateUpdate.status === 0, gateUpdate.stderr);
const inspected = helper(["inspect", "--run", join(startDir, "run.json")]);
check("inspect lists the open deferred gate", inspected.stdout.includes('DEFERRED_GATES_OPEN: ["provider-oauth"]'), inspected.stdout);
const incomplete = helper(["assert-complete", "--run", join(startDir, "run.json")]);
check("assert-complete blocks on the open gate", incomplete.status !== 0 && incomplete.stdout.includes("OPEN_DEFERRED_GATE: provider-oauth"), incomplete.stdout);
const rendered = helper(["render", "--run", join(startDir, "run.json")]);
check("render includes open deferred gates", rendered.status === 0 && readFileSync(join(startDir, "RUN.md"), "utf8").includes("provider-oauth"));
writeFileSync(gatePatch, JSON.stringify({ deferredGates: [{ id: "bogus-gate", description: "x", status: "someday" }] }));
const badGate = helper(["update", "--run", join(startDir, "run.json"), "--expected-revision", String(readRun(startDir).revision), "--patch", gatePatch, ...asConductor]);
check("invalid deferred gate status fails closed", badGate.status !== 0, badGate.stdout);

// gate continuity: no removal, no non-open creation, discharge with evidence works
writeFileSync(gatePatch, JSON.stringify({ deferredGates: [] }));
const removeGate = helper(["update", "--run", join(startDir, "run.json"), "--expected-revision", String(readRun(startDir).revision), "--patch", gatePatch, ...asConductor]);
check("deferred gate removal fails closed", removeGate.status !== 0 && (removeGate.stderr + removeGate.stdout).includes("cannot be removed"), removeGate.stderr);
writeFileSync(gatePatch, JSON.stringify({ deferredGates: [{ id: "provider-oauth", sliceId: "review", description: "Real provider OAuth proof deferred", status: "open", evidence: [] }, { id: "pre-discharged", description: "x", status: "discharged", evidence: ["e"] }] }));
const bornDischarged = helper(["update", "--run", join(startDir, "run.json"), "--expected-revision", String(readRun(startDir).revision), "--patch", gatePatch, ...asConductor]);
check("a new deferred gate must begin open", bornDischarged.status !== 0 && (bornDischarged.stderr + bornDischarged.stdout).includes("must begin open"), bornDischarged.stderr);
writeFileSync(gatePatch, JSON.stringify({ deferredGates: [{ id: "provider-oauth", sliceId: "review", description: "Real provider OAuth proof deferred", status: "discharged", evidence: [""] }] }));
const emptyEvidence = helper(["update", "--run", join(startDir, "run.json"), "--expected-revision", String(readRun(startDir).revision), "--patch", gatePatch, ...asConductor]);
check("discharge with empty evidence fails closed", emptyEvidence.status !== 0 && (emptyEvidence.stderr + emptyEvidence.stdout).includes("non-empty evidence"), emptyEvidence.stderr);
writeFileSync(gatePatch, JSON.stringify({ deferredGates: [{ id: "provider-oauth", sliceId: "review", description: "Real provider OAuth proof deferred", status: "discharged", evidence: ["oauth-smoke.log"] }] }));
const discharge = helper(["update", "--run", join(startDir, "run.json"), "--expected-revision", String(readRun(startDir).revision), "--patch", gatePatch, ...asConductor]);
check("an open gate discharges with evidence", discharge.status === 0, discharge.stderr);
const afterDischarge = helper(["inspect", "--run", join(startDir, "run.json")]);
check("a discharged gate leaves the open list", afterDischarge.stdout.includes("DEFERRED_GATES_OPEN: []"), afterDischarge.stdout);

// malformed checkpoints field fails closed before any ledger exists
const badCheckpoints = JSON.parse(readFileSync(exampleSpec, "utf8"));
badCheckpoints.runId = "bad-checkpoints";
badCheckpoints.checkpoints = {};
const badCheckpointsPath = join(root, "bad-checkpoints-spec.json");
writeFileSync(badCheckpointsPath, JSON.stringify(badCheckpoints, null, 2));
const badCheckpointsInit = helper(["init", "--dir", join(root, "run-badck"), "--spec", badCheckpointsPath]);
check("non-array checkpoints fails closed", badCheckpointsInit.status !== 0 && badCheckpointsInit.stderr.includes("checkpoints must be an array"), badCheckpointsInit.stderr);

// checkpoint history is append-only and immutable
writeFileSync(gatePatch, JSON.stringify({ checkpoints: [] }));
const wipeCheckpoints = helper(["update", "--run", join(startDir, "run.json"), "--expected-revision", String(readRun(startDir).revision), "--patch", gatePatch, ...asConductor]);
check("checkpoint history cannot be erased by update", wipeCheckpoints.status !== 0 && (wipeCheckpoints.stderr + wipeCheckpoints.stdout).includes("append-only"), wipeCheckpoints.stderr);

// adopt: progressed prose state without ledger proof downgrades to UNKNOWN
const adoptRepo = fixtureRepo("adopt-repo");
const adoptSpec = JSON.parse(readFileSync(exampleSpec, "utf8"));
adoptSpec.runId = "adopt-example";
adoptSpec.repo = { path: adoptRepo, targetBranch: "main", baseSha: head };
adoptSpec.slices[0].state = "ACTIVE";
adoptSpec.slices[1].state = "TERMINAL";
adoptSpec.slices[1].outcome = "merged";
adoptSpec.slices[1].terminalProof = "claimed PR merge, unledgered";
adoptSpec.effects = [
  { id: "push-unproved", type: "push", sliceId: "foundation", status: "cancelled", ownerEpoch: 1, attemptKey: "adopt-example:foundation:1", reconcile: { kind: "remote", locator: "origin", expected: "ref" }, observation: null },
  { id: "push-proved", type: "push", sliceId: "foundation", status: "cancelled", ownerEpoch: 1, attemptKey: "adopt-example:foundation:1", reconcile: { kind: "remote", locator: "origin", expected: "ref" }, observation: { definiteNonExecution: true } },
];
const adoptSpecPath = join(root, "adopt-spec.json");
writeFileSync(adoptSpecPath, JSON.stringify(adoptSpec, null, 2));
const adoptDir = join(root, "run-adopt");
const adopt = helper(["adopt", "--dir", adoptDir, "--spec", adoptSpecPath]);
check("adopt succeeds on a prose-run spec", adopt.status === 0, adopt.stderr || adopt.stdout);
const adopted = readRun(adoptDir);
const foundation = adopted.slices.find(({ id }) => id === "foundation");
const consumer = adopted.slices.find(({ id }) => id === "consumer");
check(
  "unproved ACTIVE and TERMINAL slices are downgraded to UNKNOWN with blockers",
  foundation.state === "UNKNOWN" && consumer.state === "UNKNOWN" && consumer.outcome === null && [foundation, consumer].every(({ blocker }) => blocker?.includes("adopted without ledger proof")),
  JSON.stringify({ foundation, consumer }, null, 2),
);
check("adopt reports the downgrades and forces reconciliation", adopt.stdout.includes("ADOPTED_UNKNOWN:") && adopted.reconciliation.status === "unknown", adopt.stdout);
check(
  "adopt trusts a cancelled effect only with definite non-execution proof",
  adopted.effects.find(({ id }) => id === "push-unproved").status === "unknown" && adopted.effects.find(({ id }) => id === "push-proved").status === "cancelled",
  JSON.stringify(adopted.effects, null, 2),
);
const adoptInspect = helper(["inspect", "--run", join(adoptDir, "run.json")]);
check("adopted run is valid with a closed write frontier", adoptInspect.stdout.includes("RUN_VALID: yes") && adoptInspect.stdout.includes("WRITE_FRONTIER: []"), adoptInspect.stdout);

// adopt canonicalizes repo path spellings and requires a live repository
mkdirSync(join(adoptRepo, "sub"), { recursive: true });
const aliasSpec = { ...adoptSpec, runId: "adopt-alias", repo: { path: join(adoptRepo, "sub"), targetBranch: "main", baseSha: head } };
const aliasSpecPath = join(root, "adopt-alias-spec.json");
writeFileSync(aliasSpecPath, JSON.stringify(aliasSpec, null, 2));
const adoptAlias = helper(["adopt", "--dir", join(root, "run-adopt-alias"), "--spec", aliasSpecPath]);
check("adopt canonicalizes aliases and fails closed on the active run", adoptAlias.status !== 0 && adoptAlias.stderr.includes("active run already exists"), adoptAlias.stderr || adoptAlias.stdout);
const noRepoSpec = { ...adoptSpec, runId: "adopt-norepo", repo: { path: join(root, "not-a-repo"), targetBranch: "main", baseSha: head } };
const noRepoSpecPath = join(root, "adopt-norepo-spec.json");
writeFileSync(noRepoSpecPath, JSON.stringify(noRepoSpec, null, 2));
const adoptMissing = helper(["adopt", "--dir", join(root, "run-adopt-norepo"), "--spec", noRepoSpecPath]);
check("adopt requires a live git repository", adoptMissing.status !== 0 && adoptMissing.stderr.includes("not a git repository"), adoptMissing.stderr || adoptMissing.stdout);

// adopt reaches a fixed point on a downgrade cascade deeper than any fixed pass cap:
// slice 0 claims TERMINAL/merged with no merge effect (downgrades on pass 1); slices
// 1..5 are individually valid TERMINAL slices whose start edge only breaks after the
// predecessor's downgrade, so each pass invalidates exactly one more slice.
const chainRepo = fixtureRepo("chain-repo");
const chainDepth = 6;
const chainSpec = {
  runId: "adopt-chain",
  title: "Deep cascade adoption",
  mode: "autopilot",
  repo: { path: chainRepo, targetBranch: "main", baseSha: head },
  conductor: { id: "conductor-example", epoch: 1 },
  parentCriteria: [],
  slices: [],
  edges: [],
  resources: [],
  effects: [],
  runtimeObservations: [],
  knownLessons: [],
};
for (let index = 0; index < chainDepth; index += 1) {
  const id = `chain-${index}`;
  const attemptKey = `adopt-chain:${id}:1`;
  chainSpec.slices.push({
    id,
    lane: "dev-subagent",
    executor: { constraints: [], verified: { executor: "native", vendor: "unknown", model: "unknown", effort: "unknown" }, fallback: [] },
    state: "TERMINAL",
    outcome: "merged",
    terminalProof: `PR #${index}`,
    attempt: 1,
    criteria: [{ id: `${id}-done`, text: "done", status: "passed", evidence: ["log"] }],
    handoff: { commit: "a".repeat(40) },
    reviews: { conductor: { verdict: "pass" }, independent: { verdict: "pass" }, correctionCount: 0, interventions: { scope: 0, defect: 0, safety: 0, decision: 0 } },
  });
  chainSpec.effects.push({
    id: `dispatch:${attemptKey}`,
    type: "dispatch",
    sliceId: id,
    status: "observed",
    ownerEpoch: 1,
    attemptKey,
    reconcile: { kind: "runtime", locator: `session-${index}`, expected: attemptKey },
    observation: { identity: `session-${index}` },
  });
  if (index > 0) {
    chainSpec.edges.push({ id: `chain-${index - 1}-before-${index}`, type: "start", source: `chain-${index - 1}`, target: id, gatedTransition: "ACTIVE", reason: "chain", cleared: false, evidence: [] });
    chainSpec.effects.push({
      id: `merge:${attemptKey}`,
      type: "merge",
      sliceId: id,
      status: "observed",
      ownerEpoch: 1,
      attemptKey,
      reconcile: { kind: "merge", locator: "origin/main", expected: `${"a".repeat(39)}${index}`, sourceKind: "git_ancestor" },
      observation: { identity: `${"b".repeat(39)}${index}` },
    });
  }
}
const chainSpecPath = join(root, "adopt-chain-spec.json");
writeFileSync(chainSpecPath, JSON.stringify(chainSpec, null, 2));
const chainDir = join(root, "run-adopt-chain");
const adoptChain = helper(["adopt", "--dir", chainDir, "--spec", chainSpecPath]);
const chainRun = adoptChain.status === 0 ? readRun(chainDir) : null;
check(
  "adopt downgrades a deep cascade to a valid fixed point",
  adoptChain.status === 0 && chainRun.slices.every(({ state }) => state === "UNKNOWN"),
  adoptChain.stderr || adoptChain.stdout,
);

// regression: init + inspect on the pristine example spec still work
const initDir = join(root, "run-init");
const pristine = JSON.parse(readFileSync(exampleSpec, "utf8"));
pristine.runId = "pristine-example";
pristine.repo = { path: join(root, "no-such-repo"), targetBranch: "main", baseSha: "example-base" };
const pristinePath = join(root, "pristine-spec.json");
writeFileSync(pristinePath, JSON.stringify(pristine, null, 2));
const init = helper(["init", "--dir", initDir, "--spec", pristinePath]);
check("init still works", init.status === 0, init.stderr);
const initInspect = helper(["inspect", "--run", join(initDir, "run.json")]);
check("unreconciled init keeps the write frontier closed", initInspect.stdout.includes("RUN_VALID: yes") && initInspect.stdout.includes("WRITE_FRONTIER: []"), initInspect.stdout);

// a stale locator (run.json gone) is reclaimable; a live one is not
rmSync(startDir, { recursive: true, force: true });
const reclaim = helper(["start", "--dir", join(root, "run-start-3"), "--spec", specPath]);
check("start reclaims a stale active-run locator", reclaim.status === 0 && reclaim.stdout.includes("RECONCILIATION: clean"), reclaim.stderr || reclaim.stdout);

// stale-locator reclamation is serialized by an exclusive claim
const seedIdentity = git(seed, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
const seedLocator = join(env.XDG_STATE_HOME, "orchestrate", "active-runs", `${createHash("sha256").update(seedIdentity).digest("hex")}.json`);
rmSync(join(root, "run-start-3"), { recursive: true, force: true });
mkdirSync(`${seedLocator}.claim`, { recursive: true });
const blockedReclaim = helper(["start", "--dir", join(root, "run-start-4"), "--spec", specPath]);
check("a held reclamation claim fails closed", blockedReclaim.status !== 0 && blockedReclaim.stderr.includes("reclaiming"), blockedReclaim.stderr || blockedReclaim.stdout);
rmSync(`${seedLocator}.claim`, { recursive: true, force: true });
const reclaimAfterClaim = helper(["start", "--dir", join(root, "run-start-4"), "--spec", specPath]);
check("reclamation proceeds once the claim clears", reclaimAfterClaim.status === 0, reclaimAfterClaim.stderr || reclaimAfterClaim.stdout);

// a truncated locator left by a killed process is treated as stale, not fatal
rmSync(join(root, "run-start-4"), { recursive: true, force: true });
writeFileSync(seedLocator, "");
const truncatedReclaim = helper(["start", "--dir", join(root, "run-start-5"), "--spec", specPath]);
check("a truncated locator is reclaimed instead of crashing start", truncatedReclaim.status === 0 && truncatedReclaim.stdout.includes("RECONCILIATION: clean"), truncatedReclaim.stderr || truncatedReclaim.stdout);

// an init-created ledger (no repo.identity) is still seen by start, and a legacy
// path-hashed locator from a pre-identity release also blocks a new start
const initRepo = fixtureRepo("init-collision-repo");
const initCollisionSpec = { ...JSON.parse(readFileSync(exampleSpec, "utf8")), runId: "init-collision", repo: { path: initRepo, targetBranch: "main", baseSha: head } };
const initCollisionSpecPath = join(root, "init-collision-spec.json");
writeFileSync(initCollisionSpecPath, JSON.stringify(initCollisionSpec, null, 2));
const initCollision = helper(["init", "--dir", join(root, "run-init-collision"), "--spec", initCollisionSpecPath]);
const startOverInit = helper(["start", "--dir", join(root, "run-start-over-init"), "--spec", initCollisionSpecPath]);
check("start sees an init-created active run", initCollision.status === 0 && startOverInit.status !== 0 && startOverInit.stderr.includes("active run already exists"), startOverInit.stderr || startOverInit.stdout);
const legacyRepo = fixtureRepo("legacy-repo");
const legacyRoot = git(legacyRepo, ["rev-parse", "--show-toplevel"]);
const legacyLocator = join(env.XDG_STATE_HOME, "orchestrate", "active-runs", `${createHash("sha256").update(legacyRoot).digest("hex")}.json`);
writeFileSync(legacyLocator, JSON.stringify({ runId: "legacy", runPath: initCollisionSpecPath, revision: 1 }));
const legacySpec = { ...initCollisionSpec, runId: "legacy-collision", repo: { path: legacyRepo, targetBranch: "main", baseSha: "auto" } };
const legacySpecPath = join(root, "legacy-spec.json");
writeFileSync(legacySpecPath, JSON.stringify(legacySpec, null, 2));
const startOverLegacy = helper(["start", "--dir", join(root, "run-start-over-legacy"), "--spec", legacySpecPath]);
check("start sees a legacy path-hashed locator", startOverLegacy.status !== 0 && startOverLegacy.stderr.includes("active run already exists"), startOverLegacy.stderr || startOverLegacy.stdout);

// a mutation on a run with a dangling legacy locator migrates it away
const staleLegacyLocator = join(env.XDG_STATE_HOME, "orchestrate", "active-runs", `${createHash("sha256").update(git(initRepo, ["rev-parse", "--show-toplevel"])).digest("hex")}.json`);
writeFileSync(staleLegacyLocator, JSON.stringify({ runId: "init-collision", runPath: join(root, "run-init-collision", "run.json"), revision: 0 }));
const migrate = helper(["reconcile", "--run", join(root, "run-init-collision", "run.json"), "--expected-revision", "0", ...asConductor]);
check("mutation migrates a legacy locator for the same run", migrate.status === 0 && !existsSync(staleLegacyLocator), migrate.stderr || migrate.stdout);

// a new run cannot be born with resolved deferred gates
const bornResolvedSpec = { ...JSON.parse(readFileSync(exampleSpec, "utf8")), runId: "born-resolved", repo: { path: join(root, "no-such-repo-2"), targetBranch: "main", baseSha: "x" }, deferredGates: [{ id: "pre-resolved", description: "x", status: "discharged", evidence: ["e"] }] };
const bornResolvedPath = join(root, "born-resolved-spec.json");
writeFileSync(bornResolvedPath, JSON.stringify(bornResolvedSpec, null, 2));
const bornResolved = helper(["init", "--dir", join(root, "run-born-resolved"), "--spec", bornResolvedPath]);
check("new-run deferred gates must begin open", bornResolved.status !== 0 && bornResolved.stderr.includes("must begin open"), bornResolved.stderr);
const nonArrayGates = { ...bornResolvedSpec, runId: "non-array-gates", deferredGates: false };
const nonArrayGatesPath = join(root, "non-array-gates-spec.json");
writeFileSync(nonArrayGatesPath, JSON.stringify(nonArrayGates, null, 2));
const nonArrayGatesInit = helper(["init", "--dir", join(root, "run-non-array-gates"), "--spec", nonArrayGatesPath]);
check("non-array deferredGates fails as validation, not a crash", nonArrayGatesInit.status !== 0 && nonArrayGatesInit.stderr.includes("deferredGates must be an array"), nonArrayGatesInit.stderr);

// a linked worktree of the same repository shares the active-run identity
execFileSync("git", ["-C", seed, "worktree", "add", "--quiet", join(root, "seed-linked"), "-b", "linked-smoke"], { stdio: "ignore" });
const linkedSpec = { ...JSON.parse(readFileSync(exampleSpec, "utf8")), runId: "linked-worktree", repo: { path: join(root, "seed-linked"), targetBranch: "main", baseSha: "auto" } };
const linkedSpecPath = join(root, "linked-spec.json");
writeFileSync(linkedSpecPath, JSON.stringify(linkedSpec, null, 2));
const linkedStart = helper(["start", "--dir", join(root, "run-linked"), "--spec", linkedSpecPath]);
check("a linked worktree cannot mint a second active run", linkedStart.status !== 0 && linkedStart.stderr.includes("active run already exists"), linkedStart.stderr || linkedStart.stdout);

rmSync(root, { recursive: true, force: true });
process.stdout.write(failures ? `\n${failures} failure(s)\n` : "\nall smoke checks passed\n");
process.exit(failures ? 1 : 0);
