#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const states = new Set(["PLANNED", "ACTIVE", "READY_FOR_ACCEPTANCE", "ACCEPTED", "TERMINAL", "BLOCKED", "UNKNOWN"]);
const lanes = new Set(["dev-subagent", "afk", "read-only", "computer-use", "human-gate"]);
const edgeTypes = new Set(["start", "acceptance", "integration", "resource", "human_gate"]);
const outcomes = new Set(["merged", "accepted_local", "report_accepted", "operation_verified", "cancelled", "deferred"]);
const effectStatuses = new Set(["prepared", "executing", "observed", "unknown", "cancelled"]);
const runtimeStatuses = new Set(["active", "complete"]);
const observationMaxAgeMs = 5 * 60 * 1000;
const effectTypes = new Set(["dispatch", "resume", "resource_acquire", "resource_release", "push", "pr_create", "pr_update", "merge", "issue_close", "external_act"]);
const effectTransitions = new Map([
  ["prepared", new Set(["executing", "cancelled", "unknown"])],
  ["executing", new Set(["observed", "cancelled", "unknown"])],
  ["unknown", new Set(["observed", "cancelled"])],
  ["observed", new Set()],
  ["cancelled", new Set()],
]);
const legalTransitions = new Map([
  ["PLANNED", new Set(["ACTIVE", "BLOCKED", "UNKNOWN", "TERMINAL"])],
  ["ACTIVE", new Set(["READY_FOR_ACCEPTANCE", "BLOCKED", "UNKNOWN", "TERMINAL"])],
  ["READY_FOR_ACCEPTANCE", new Set(["ACTIVE", "ACCEPTED", "BLOCKED", "UNKNOWN", "TERMINAL"])],
  ["ACCEPTED", new Set(["ACTIVE", "TERMINAL", "BLOCKED", "UNKNOWN"])],
  ["BLOCKED", new Set(["PLANNED", "ACTIVE", "READY_FOR_ACCEPTANCE", "ACCEPTED", "UNKNOWN", "TERMINAL"])],
  ["UNKNOWN", new Set(["PLANNED", "ACTIVE", "READY_FOR_ACCEPTANCE", "ACCEPTED", "BLOCKED", "TERMINAL"])],
  ["TERMINAL", new Set()],
]);

const fail = (message, code = 1) => {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(code);
};

process.on("uncaughtException", (error) => fail(error.message));

const parseArgs = (values) => {
  const args = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
};

const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
};

const serialize = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const digest = (value) => createHash("sha256").update(serialize(value)).digest("hex");
const now = () => new Date().toISOString();
const freshTimestamp = (value) => Number.isFinite(Date.parse(value)) && Math.abs(Date.now() - Date.parse(value)) <= observationMaxAgeMs;
const reconciliationFresh = (run) => run.reconciliation?.status === "clean" && freshTimestamp(run.reconciliation?.at);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const runPath = (args) => resolve(args.run || (args.dir && join(args.dir, "run.json")) || fail("pass --run or --dir"));
const git = (repo, values) => execFileSync("git", ["-C", repo, ...values], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const pidAlive = (pid) => {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const caller = (args) => ({
  id: args["conductor-id"] || process.env.ORCHESTRATE_CONDUCTOR_ID || fail("pass --conductor-id or ORCHESTRATE_CONDUCTOR_ID"),
  epoch: Number(args["conductor-epoch"] || process.env.ORCHESTRATE_CONDUCTOR_EPOCH || fail("pass --conductor-epoch or ORCHESTRATE_CONDUCTOR_EPOCH")),
});

const lock = (root, owner) => {
  const path = join(root, ".run.lock");
  try {
    mkdirSync(path);
    writeFileSync(join(path, "owner.json"), serialize({ ...owner, pid: process.pid, acquiredAt: now() }), { flag: "wx" });
  } catch {
    const existing = existsSync(join(path, "owner.json")) ? readFileSync(join(path, "owner.json"), "utf8").trim() : "unknown owner";
    fail(`run lock is held: ${existing}`);
  }
  return () => rmSync(path, { recursive: true, force: true });
};

const atomicWrite = (path, value) => {
  const temp = `${path}.tmp-${process.pid}`;
  const descriptor = openSync(temp, "w", 0o600);
  writeFileSync(descriptor, serialize(value));
  fsyncSync(descriptor);
  closeSync(descriptor);
  renameSync(temp, path);
  try {
    const directory = openSync(dirname(path), "r");
    fsyncSync(directory);
    closeSync(directory);
  } catch {}
};

const mergePatch = (target, patch) => {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch;
  const result = target && typeof target === "object" && !Array.isArray(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete result[key];
    else result[key] = mergePatch(result[key], value);
  }
  return result;
};

const sliceMap = (run) => new Map(run.slices.map((slice) => [slice.id, slice]));
const resourceMap = (run) => new Map(run.resources.map((resource) => [resource.id, resource]));
const evidencePassed = (criterion) => criterion.status === "passed" && Array.isArray(criterion.evidence) && criterion.evidence.length > 0;
const criterionAccounted = (criterion) => ["passed", "cancelled", "deferred"].includes(criterion.status) && Array.isArray(criterion.evidence) && criterion.evidence.length > 0;
const successOutcome = (slice) => slice.state === "TERMINAL" && !["cancelled", "deferred"].includes(slice.outcome);

const requiredExecutorSatisfied = (slice) => {
  const verified = slice.executor?.verified || {};
  return (slice.executor?.constraints || [])
    .filter(({ strength }) => strength === "required")
    .every(({ field, value }) => verified[field] !== undefined && verified[field] !== "unknown" && verified[field] === value);
};

const edgeCleared = (run, edge) => {
  const source = sliceMap(run).get(edge.source);
  if (["start", "acceptance", "integration"].includes(edge.type)) return Boolean(source && successOutcome(source));
  if (edge.type === "resource") {
    const resource = resourceMap(run).get(edge.resource);
    if (resource?.status === "acquired" && resource.ownerSlice === edge.target) return true;
    const target = sliceMap(run).get(edge.target);
    return target?.state === "TERMINAL" && run.effects.some(({ type, sliceId, status, reconcile }) => type === "resource_acquire" && sliceId === edge.target && status === "observed" && reconcile?.locator === mutexPath(edge.resource));
  }
  if (edge.type === "human_gate") return edge.cleared === true && Array.isArray(edge.evidence) && edge.evidence.length > 0;
  return false;
};

const validateStartDag = (run, errors) => {
  const graph = new Map(run.slices.map(({ id }) => [id, []]));
  for (const edge of run.edges.filter(({ type }) => type === "start")) graph.get(edge.source)?.push(edge.target);
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const target of graph.get(id) || []) if (!visit(target)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  for (const id of graph.keys()) if (!visit(id)) errors.push("start edges contain a cycle");
};

const validate = (run, previous = null) => {
  const errors = [];
  if (run.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!run.runId || !run.conductor?.id || !Number.isInteger(run.conductor?.epoch)) errors.push("runId and conductor id/epoch are required");
  if (!Number.isInteger(run.revision) || run.revision < 0) errors.push("revision must be a non-negative integer");
  if (!run.repo?.path || !run.repo?.targetBranch || !run.repo?.baseSha) errors.push("repo path, targetBranch, and baseSha are required");
  if (!Array.isArray(run.slices) || !run.slices.length) errors.push("at least one slice is required");
  for (const field of ["parentCriteria", "edges", "resources", "effects", "runtimeObservations", "knownLessons"]) if (!Array.isArray(run[field])) errors.push(`${field} must be an array`);
  if (errors.length) return errors;

  const ids = new Set();
  const attempts = new Set();
  for (const slice of run.slices) {
    if (!slice.id || ids.has(slice.id)) errors.push(`duplicate or missing slice id: ${slice.id || "<empty>"}`);
    ids.add(slice.id);
    if (!states.has(slice.state)) errors.push(`${slice.id}: invalid state ${slice.state}`);
    if (!lanes.has(slice.lane)) errors.push(`${slice.id}: invalid lane ${slice.lane}`);
    if (!Number.isInteger(slice.attempt) || slice.attempt < 1) errors.push(`${slice.id}: invalid attempt`);
    const attemptKey = `${run.runId}:${slice.id}:${slice.attempt}`;
    if (attempts.has(attemptKey)) errors.push(`${slice.id}: duplicate attempt key`);
    attempts.add(attemptKey);
    for (const constraint of slice.executor?.constraints || []) {
      if (!["executor", "vendor", "model", "effort"].includes(constraint.field) || !["required", "preferred"].includes(constraint.strength)) errors.push(`${slice.id}: invalid executor constraint`);
    }
    const cessation = ["cancelled", "deferred"].includes(slice.outcome);
    if (["ACTIVE", "READY_FOR_ACCEPTANCE", "ACCEPTED", "TERMINAL"].includes(slice.state) && !cessation) {
      if (!requiredExecutorSatisfied(slice)) errors.push(`${slice.id}: required executor constraints are not verified`);
      const dispatches = run.effects.filter(({ type, sliceId, attemptKey: key, status }) => type === "dispatch" && sliceId === slice.id && key === attemptKey && status === "observed");
      if (dispatches.length !== 1) errors.push(`${slice.id}: progressed state requires exactly one observed dispatch for ${attemptKey}`);
      const dispatchEdges = run.edges.filter((edge) => edge.target === slice.id && ["start", "resource", "human_gate"].includes(edge.type));
      if (!dispatchEdges.every((edge) => edgeCleared(run, edge))) errors.push(`${slice.id}: progressed state has an uncleared dispatch edge`);
    }
    if (["READY_FOR_ACCEPTANCE", "ACCEPTED", "TERMINAL"].includes(slice.state) && !cessation) {
      if (!slice.criteria?.length || !slice.criteria.every(evidencePassed)) errors.push(`${slice.id}: acceptance requires passed criteria with evidence`);
      if (!slice.handoff) errors.push(`${slice.id}: acceptance-ready state requires a handoff`);
    }
    if (["ACCEPTED", "TERMINAL"].includes(slice.state) && !cessation) {
      const acceptanceEdges = run.edges.filter((edge) => edge.target === slice.id && edge.type === "acceptance");
      if (!acceptanceEdges.every((edge) => edgeCleared(run, edge))) errors.push(`${slice.id}: acceptance edge is uncleared`);
      if (slice.lane === "dev-subagent" && (slice.reviews?.conductor?.verdict !== "pass" || slice.reviews?.independent?.verdict !== "pass")) errors.push(`${slice.id}: dev acceptance requires passing conductor and independent reviews`);
    }
    if (slice.state === "TERMINAL") {
      if (!outcomes.has(slice.outcome) || !slice.terminalProof) errors.push(`${slice.id}: terminal outcome and proof are required`);
      if (slice.lane === "dev-subagent" && !["merged", "accepted_local", "cancelled", "deferred"].includes(slice.outcome)) errors.push(`${slice.id}: invalid dev outcome`);
      if (slice.lane === "afk" && !["merged", "cancelled", "deferred"].includes(slice.outcome)) errors.push(`${slice.id}: invalid AFK outcome`);
      if (slice.lane === "read-only" && !["report_accepted", "cancelled", "deferred"].includes(slice.outcome)) errors.push(`${slice.id}: invalid read-only outcome`);
      if (slice.lane === "computer-use" && !["operation_verified", "cancelled", "deferred"].includes(slice.outcome)) errors.push(`${slice.id}: invalid computer-use outcome`);
      if (slice.lane === "human-gate" && !["operation_verified", "cancelled", "deferred"].includes(slice.outcome)) errors.push(`${slice.id}: invalid human-gate outcome`);
      const integrationEdges = run.edges.filter((edge) => edge.target === slice.id && edge.type === "integration");
      if (!cessation && !integrationEdges.every((edge) => edgeCleared(run, edge))) errors.push(`${slice.id}: terminal state has an uncleared integration edge`);
      if (slice.outcome === "merged" && !run.effects.some(({ type, sliceId, status }) => type === "merge" && sliceId === slice.id && status === "observed")) errors.push(`${slice.id}: merged outcome requires an observed merge effect`);
      if (cessation && !run.authorization?.cessations?.some(({ sliceId, outcome, approvedBy, evidence }) => sliceId === slice.id && outcome === slice.outcome && approvedBy && evidence)) errors.push(`${slice.id}: ${slice.outcome} requires separate recorded authorization`);
    } else if (slice.outcome) errors.push(`${slice.id}: non-terminal slice cannot have an outcome`);
    if (["BLOCKED", "UNKNOWN"].includes(slice.state) && (!slice.blocker || !slice.resumeState)) errors.push(`${slice.id}: ${slice.state} requires blocker and resumeState`);
  }

  const resources = new Set(run.resources.map(({ id }) => id));
  const edgeIds = new Set();
  for (const edge of run.edges) {
    if (!edge.id || edgeIds.has(edge.id)) errors.push(`duplicate or missing edge id: ${edge.id || "<empty>"}`);
    edgeIds.add(edge.id);
    if (!edgeTypes.has(edge.type) || !ids.has(edge.target) || !edge.reason || !edge.gatedTransition) errors.push(`${edge.id}: invalid edge`);
    if (["start", "acceptance", "integration"].includes(edge.type) && (!ids.has(edge.source) || edge.source === edge.target)) errors.push(`${edge.id}: invalid slice source`);
    if (edge.type === "resource" && (!edge.resource || !resources.has(edge.resource))) errors.push(`${edge.id}: invalid resource`);
    if (edge.cleared === true && (!Array.isArray(edge.evidence) || !edge.evidence.length)) errors.push(`${edge.id}: an explicitly cleared edge requires evidence`);
  }
  validateStartDag(run, errors);

  const effectIds = new Set();
  const mergeSources = new Set();
  for (const effect of run.effects) {
    if (!effect.id || effectIds.has(effect.id) || !effectStatuses.has(effect.status) || !effectTypes.has(effect.type)) errors.push(`invalid or duplicate effect ${effect.id || "<empty>"}`);
    effectIds.add(effect.id);
    if (effect.ownerEpoch !== run.conductor.epoch && ["prepared", "executing"].includes(effect.status)) errors.push(`${effect.id}: unresolved effect belongs to stale conductor epoch`);
    if (!effect.attemptKey || !effect.reconcile?.kind || !effect.reconcile?.locator || effect.reconcile?.expected === undefined || effect.reconcile?.expected === null || effect.reconcile?.expected === "") errors.push(`${effect.id}: attempt key and complete reconciliation probe are required`);
    const effectSlice = sliceMap(run).get(effect.sliceId);
    if (!effectSlice) errors.push(`${effect.id}: unknown slice ${effect.sliceId}`);
    if (effect.type === "dispatch" && ["prepared", "executing"].includes(effect.status) && effectSlice) {
      if (!requiredExecutorSatisfied(effectSlice)) errors.push(`${effect.id}: required executor constraints are not verified`);
      const blockers = run.edges.filter((edge) => edge.target === effectSlice.id && ["start", "resource", "human_gate"].includes(edge.type) && !edgeCleared(run, edge));
      if (blockers.length) errors.push(`${effect.id}: dispatch is gated by ${blockers.map(({ id }) => id).join(", ")}`);
    }
    if (effect.type === "merge" && ["prepared", "executing"].includes(effect.status) && effectSlice) {
      if (effectSlice.state !== "ACCEPTED") errors.push(`${effect.id}: merge intent requires ACCEPTED slice`);
      const blockers = run.edges.filter((edge) => edge.target === effectSlice.id && edge.type === "integration" && !edgeCleared(run, edge));
      if (blockers.length) errors.push(`${effect.id}: merge is gated by ${blockers.map(({ id }) => id).join(", ")}`);
    }
    if (effect.type === "merge") {
      if (!["git_ancestor", "provider_pr_head"].includes(effect.reconcile.sourceKind) || !/^[0-9a-f]{40}$/i.test(effect.reconcile.expected)) errors.push(`${effect.id}: merge requires a 40-hex source identity and sourceKind`);
      if (mergeSources.has(effect.reconcile.expected)) errors.push(`${effect.id}: merge source identity must be unique`);
      mergeSources.add(effect.reconcile.expected);
    }
    if (["resource_acquire", "resource_release"].includes(effect.type) && (!effect.resourceId || !resources.has(effect.resourceId))) errors.push(`${effect.id}: resource effect requires exact resourceId`);
  }
  const dispatchKeys = run.effects.filter(({ type, status }) => type === "dispatch" && status !== "cancelled").map(({ attemptKey }) => attemptKey);
  for (const key of new Set(dispatchKeys)) if (dispatchKeys.filter((candidate) => candidate === key).length > 1) errors.push(`duplicate dispatch effect for ${key}`);
  for (const resource of run.resources) {
    if (!resource.id || !["free", "prepared", "acquired", "released", "unknown"].includes(resource.status)) errors.push(`invalid resource ${resource.id || "<empty>"}`);
    if (resource.status === "acquired" && (!resource.ownerSlice || !resource.externalIdentity)) errors.push(`${resource.id}: acquired resource requires owner and identity`);
  }
  for (const preparation of run.preparations) {
    if (!preparation.sliceId || !ids.has(preparation.sliceId) || !preparation.sourceSha || !Array.isArray(preparation.paths) || typeof preparation.valid !== "boolean") errors.push(`invalid preparation for ${preparation.sliceId || "<empty>"}`);
  }
  for (const field of ["deferredGates", "checkpoints"]) if (run[field] !== undefined && !Array.isArray(run[field])) errors.push(`${field} must be an array`);
  for (const checkpoint of Array.isArray(run.checkpoints) ? run.checkpoints : []) {
    if (!checkpoint?.at || !checkpoint?.conductor) errors.push("checkpoint records require at and conductor");
  }
  const gateStatuses = new Set(["open", "discharged", "authorized"]);
  const gateIds = new Set();
  for (const gate of Array.isArray(run.deferredGates) ? run.deferredGates : []) {
    if (!gate.id || gateIds.has(gate.id) || !gateStatuses.has(gate.status) || !gate.description) errors.push(`invalid or duplicate deferred gate ${gate.id || "<empty>"}`);
    gateIds.add(gate.id);
    if (gate.sliceId && !ids.has(gate.sliceId)) errors.push(`${gate.id}: unknown slice ${gate.sliceId}`);
    if (["discharged", "authorized"].includes(gate.status) && (!Array.isArray(gate.evidence) || !gate.evidence.length)) errors.push(`${gate.id}: ${gate.status} requires evidence`);
    if (gate.status === "authorized" && !gate.approvedBy) errors.push(`${gate.id}: authorized requires an approver`);
  }

  if (previous) {
    if (run.revision !== previous.revision + 1) errors.push("revision must increment by one");
    if (run.conductor.epoch < previous.conductor.epoch) errors.push("conductor epoch cannot decrease");
    if (run.authorization?.mode !== previous.authorization?.mode) errors.push("authorization mode is immutable for a run");
    if (run.conductor.id !== previous.conductor.id) {
      if (run.conductor.epoch !== previous.conductor.epoch + 1 || !reconciliationFresh(previous)) errors.push("ownership change requires fresh clean reconciliation and epoch +1");
      if (previous.effects.some(({ status }) => status === "executing")) errors.push("ownership cannot change with an executing effect");
      if (previous.resources.some(({ status }) => status === "acquired")) errors.push("ownership cannot change while a resource is acquired");
    } else if (run.conductor.epoch !== previous.conductor.epoch) errors.push("conductor epoch changes only with a new conductor id");
    const oldSlices = sliceMap(previous);
    for (const slice of run.slices) {
      const old = oldSlices.get(slice.id);
      if (old && old.state !== slice.state && !legalTransitions.get(old.state)?.has(slice.state)) errors.push(`${slice.id}: illegal transition ${old.state} -> ${slice.state}`);
    }
    const oldEffects = new Map(previous.effects.map((effect) => [effect.id, effect]));
    for (const effect of run.effects) {
      const old = oldEffects.get(effect.id);
      if (!old && effect.status !== "prepared") errors.push(`${effect.id}: a new effect must begin prepared`);
      if (!old && ["dispatch", "merge", "push", "pr_create", "pr_update", "issue_close", "external_act", "resume"].includes(effect.type) && !reconciliationFresh(previous)) errors.push(`${effect.id}: new external intent requires fresh clean reconciliation`);
      if (!old && previous.effects.some(({ status }) => ["prepared", "executing", "unknown"].includes(status))) errors.push(`${effect.id}: a prior effect is unresolved`);
      if (old && old.status !== effect.status && !effectTransitions.get(old.status)?.has(effect.status)) errors.push(`${effect.id}: illegal effect transition ${old.status} -> ${effect.status}`);
      if (old && effect.status === "cancelled" && old.status !== "cancelled") {
        const definite = effect.observation?.definiteNonExecution === true;
        const ruled = run.authorization?.effectRulings?.some(({ effectId, outcome, approvedBy, evidence }) => effectId === effect.id && outcome === "cancelled" && approvedBy && evidence);
        if (!definite && (["executing", "unknown"].includes(old.status) || effect.type === "external_act") && !ruled) errors.push(`${effect.id}: cancellation requires definite non-execution or an explicit ruling`);
      }
    }
    for (const effect of previous.effects) if (!run.effects.some(({ id }) => id === effect.id) && !["observed", "cancelled"].includes(effect.status)) errors.push(`${effect.id}: unresolved effect cannot be removed`);
    const previousGates = new Map((Array.isArray(previous.deferredGates) ? previous.deferredGates : []).map((gate) => [gate.id, gate]));
    const currentGates = new Map((Array.isArray(run.deferredGates) ? run.deferredGates : []).map((gate) => [gate.id, gate]));
    for (const [id, oldGate] of previousGates) {
      const gate = currentGates.get(id);
      if (!gate) {
        errors.push(`${id}: a deferred gate cannot be removed`);
        continue;
      }
      if (oldGate.status !== gate.status && !(oldGate.status === "open" && ["discharged", "authorized"].includes(gate.status))) errors.push(`${id}: illegal deferred gate transition ${oldGate.status} -> ${gate.status}`);
    }
    for (const [id, gate] of currentGates) if (!previousGates.has(id) && gate.status !== "open") errors.push(`${id}: a new deferred gate must begin open`);
    const previousCheckpoints = Array.isArray(previous.checkpoints) ? previous.checkpoints : [];
    const currentCheckpoints = Array.isArray(run.checkpoints) ? run.checkpoints : [];
    if (currentCheckpoints.length < previousCheckpoints.length) errors.push("checkpoint history is append-only");
    else for (let index = 0; index < previousCheckpoints.length; index += 1) {
      if (serialize(previousCheckpoints[index]) !== serialize(currentCheckpoints[index])) {
        errors.push("checkpoint records are immutable");
        break;
      }
    }
  }
  return [...new Set(errors)];
};

const derived = (run) => {
  const incoming = (id, type) => run.edges.filter((edge) => edge.target === id && (!type || edge.type === type));
  const unresolvedEffectSlices = new Set(run.effects.filter(({ status }) => ["prepared", "executing", "unknown"].includes(status)).map(({ sliceId }) => sliceId));
  const write = reconciliationFresh(run) ? run.slices.filter((slice) => slice.state === "PLANNED" && requiredExecutorSatisfied(slice) && !unresolvedEffectSlices.has(slice.id) && incoming(slice.id).filter(({ type }) => ["start", "resource", "human_gate"].includes(type)).every((edge) => edgeCleared(run, edge))).map(({ id }) => id) : [];
  const preparation = run.slices.filter((slice) => !["TERMINAL", "UNKNOWN"].includes(slice.state) && !write.includes(slice.id)).map(({ id }) => id);
  const ready = run.slices.filter(({ state }) => state === "READY_FOR_ACCEPTANCE").map(({ id }) => id);
  const integration = run.slices.filter((slice) => slice.state === "ACCEPTED" && incoming(slice.id, "integration").every((edge) => edgeCleared(run, edge))).map(({ id }) => id);
  const blocked = run.slices.filter(({ state }) => state === "BLOCKED").map(({ id }) => id);
  const unknown = run.slices.filter(({ state }) => state === "UNKNOWN").map(({ id }) => id);
  const incompleteCriteria = [...run.parentCriteria, ...run.slices.flatMap(({ criteria }) => criteria || [])].filter((criterion) => !criterionAccounted(criterion));
  const unresolvedEffects = run.effects.filter(({ status }) => !["observed", "cancelled"].includes(status));
  const heldResources = run.resources.filter(({ status }) => !["free", "released"].includes(status));
  const openDeferredGates = (Array.isArray(run.deferredGates) ? run.deferredGates : []).filter(({ status }) => status === "open");
  const complete = run.slices.every(({ state }) => state === "TERMINAL") && !incompleteCriteria.length && !unresolvedEffects.length && !heldResources.length && !openDeferredGates.length && reconciliationFresh(run);
  const waves = {};
  const waveOf = (id, stack = new Set()) => {
    if (waves[id]) return waves[id];
    if (stack.has(id)) return null;
    const parents = run.edges.filter((edge) => edge.type === "start" && edge.target === id).map(({ source }) => source);
    const parentWaves = parents.map((parent) => waveOf(parent, new Set([...stack, id]))).filter(Boolean);
    waves[id] = parentWaves.length ? Math.max(...parentWaves) + 1 : 1;
    return waves[id];
  };
  for (const { id } of run.slices) waveOf(id);
  return { write, preparation, ready, integration, blocked, unknown, incompleteCriteria, unresolvedEffects, heldResources, openDeferredGates, complete, waves };
};

const inspect = (run, shouldFail = true) => {
  const errors = validate(run);
  const state = derived(run);
  process.stdout.write(`RUN_VALID: ${errors.length ? "no" : "yes"}\n`);
  process.stdout.write(`REVISION: ${run.revision}\n`);
  process.stdout.write(`OWNER: ${run.conductor.id}@${run.conductor.epoch}\n`);
  process.stdout.write(`RECONCILIATION: ${run.reconciliation?.status === "clean" && !reconciliationFresh(run) ? "stale" : run.reconciliation?.status || "unknown"}\n`);
  process.stdout.write(`WAVES: ${JSON.stringify(state.waves)}\n`);
  process.stdout.write(`WRITE_FRONTIER: ${JSON.stringify(state.write)}\n`);
  process.stdout.write(`PREPARATION_FRONTIER: ${JSON.stringify(state.preparation)}\n`);
  process.stdout.write(`READY_FOR_ACCEPTANCE: ${JSON.stringify(state.ready)}\n`);
  process.stdout.write(`INTEGRATION_FRONTIER: ${JSON.stringify(state.integration)}\n`);
  process.stdout.write(`BLOCKED: ${JSON.stringify(state.blocked)}\n`);
  process.stdout.write(`UNKNOWN: ${JSON.stringify(state.unknown)}\n`);
  process.stdout.write(`DEFERRED_GATES_OPEN: ${JSON.stringify(state.openDeferredGates.map(({ id }) => id))}\n`);
  process.stdout.write(`COMPLETE: ${state.complete && !errors.length ? "yes" : "no"}\n`);
  for (const error of errors) process.stdout.write(`INVALID: ${error}\n`);
  if (errors.length && shouldFail) process.exit(1);
  return state;
};

const mutate = (path, expectedRevision, conductor, operation, options = {}) => {
  const root = dirname(path);
  const initial = readJson(path);
  const release = lock(root, initial.conductor);
  try {
    const current = readJson(path);
    if (current.revision !== Number(expectedRevision)) throw new Error(`stale revision: expected ${expectedRevision}, found ${current.revision}`);
    if (current.conductor.id !== conductor.id || current.conductor.epoch !== conductor.epoch) throw new Error(`stale conductor: expected ${current.conductor.id}@${current.conductor.epoch}, got ${conductor.id}@${conductor.epoch}`);
    const candidate = operation(structuredClone(current));
    const reconciliationChanged = serialize(candidate.reconciliation) !== serialize(current.reconciliation);
    if (reconciliationChanged && !options.allowReconciliation) throw new Error("reconciliation state changes only through reconcile");
    const effectResolved = candidate.effects.some((effect) => {
      const old = current.effects.find(({ id }) => id === effect.id);
      return old && old.status !== effect.status && ["observed", "cancelled", "unknown"].includes(effect.status);
    });
    const resourcesChanged = serialize(candidate.resources) !== serialize(current.resources);
    if (!options.allowReconciliation && (effectResolved || resourcesChanged)) candidate.reconciliation = { status: "unknown", at: now(), notes: ["effect/resource state changed; reconcile before the next external intent"] };
    candidate.revision = current.revision + 1;
    candidate.updatedAt = now();
    const errors = validate(candidate, current);
    if (errors.length) throw new Error(errors.join("; "));
    atomicWrite(path, candidate);
    const locator = locatorPath(candidate);
    mkdirSync(dirname(locator), { recursive: true });
    atomicWrite(locator, { runId: candidate.runId, runPath: path, revision: candidate.revision, updatedAt: candidate.updatedAt });
    if (options.afterWrite) options.afterWrite(candidate);
    return candidate;
  } finally {
    release();
  }
};

const writeDoc = (path, content) => {
  const temp = `${path}.tmp-${process.pid}`;
  const descriptor = openSync(temp, "w", 0o600);
  writeFileSync(descriptor, content);
  fsyncSync(descriptor);
  closeSync(descriptor);
  renameSync(temp, path);
};

const render = (run, path) => {
  const state = derived(run);
  const hash = digest(run);
  const rows = run.slices.map((slice) => `| ${slice.id} | ${state.waves[slice.id]} | ${slice.lane} | ${slice.state} | ${slice.outcome || "—"} |`).join("\n");
  const blockers = run.slices.filter(({ blocker }) => blocker).map(({ id, blocker }) => `- ${id}: ${blocker}`).join("\n") || "- None";
  const gates = state.openDeferredGates.map(({ id, description }) => `- ${id}: ${description}`).join("\n") || "- None";
  const content = `# ${run.title}\n\nGenerated from \`run.json\`. Do not edit this view.\n\n- Run: \`${run.runId}\`\n- Revision: ${run.revision}\n- SHA-256: \`${hash}\`\n- Owner: \`${run.conductor.id}@${run.conductor.epoch}\`\n- Reconciliation: \`${run.reconciliation?.status || "unknown"}\`\n\n| Slice | Wave | Lane | State | Outcome |\n|---|---:|---|---|---|\n${rows}\n\n## Frontiers\n\n- Write: ${JSON.stringify(state.write)}\n- Preparation: ${JSON.stringify(state.preparation)}\n- Acceptance: ${JSON.stringify(state.ready)}\n- Integration: ${JSON.stringify(state.integration)}\n\n## Open deferred gates\n\n${gates}\n\n## Blockers\n\n${blockers}\n`;
  writeDoc(path, content);
  process.stdout.write(`RENDERED: ${path}\nSOURCE_REVISION: ${run.revision}\nSOURCE_DIGEST: ${hash}\n`);
};

const stateRoot = () => resolve(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "orchestrate");
const locatorPath = (run) => join(stateRoot(), "active-runs", `${createHash("sha256").update(resolve(run.repo.path)).digest("hex")}.json`);
const mutexPath = (resourceId) => join(stateRoot(), "mutexes", `${createHash("sha256").update(resourceId).digest("hex")}.lock`);

const normalize = (spec) => {
  const createdAt = now();
  return {
    schemaVersion: 1,
    runId: spec.runId,
    title: spec.title || spec.runId,
    revision: 0,
    createdAt,
    updatedAt: createdAt,
    conductor: spec.conductor,
    authorization: { mode: spec.authorization?.mode || spec.mode || "default", recordedDecisions: spec.authorization?.recordedDecisions || [], cessations: spec.authorization?.cessations || [], effectRulings: spec.authorization?.effectRulings || [] },
    repo: { ...spec.repo, path: (() => { try { return execFileSync("git", ["-C", spec.repo.path, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(); } catch { return resolve(spec.repo.path); } })(), expectedHead: spec.repo.expectedHead || spec.repo.baseSha },
    parentCriteria: spec.parentCriteria || [],
    slices: (spec.slices || []).map((slice) => ({
      ...slice,
      executor: slice.executor || { constraints: [], verified: {}, fallback: [] },
      criteria: slice.criteria || [],
      reviews: slice.reviews || { conductor: null, independent: null, correctionCount: 0, interventions: { scope: 0, defect: 0, safety: 0, decision: 0 } },
      blocker: slice.blocker || null,
      resumeState: slice.resumeState || null,
    })),
    edges: spec.edges || [],
    resources: spec.resources || [],
    effects: spec.effects || [],
    runtimeObservations: spec.runtimeObservations || [],
    preparations: spec.preparations || [],
    knownLessons: spec.knownLessons || [],
    deferredGates: spec.deferredGates || [],
    checkpoints: spec.checkpoints || [],
    reconciliation: spec.reconciliation || { status: "unknown", at: null, notes: [] },
  };
};

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

if (!command || ["help", "--help", "-h"].includes(command)) {
  process.stdout.write(`orchestrate-run.mjs commands:\n  preflight --repo DIR\n  classify --slices N --dependencies yes|no --integration-branch yes|no --shared-resource yes|no [--one-liner yes]\n  start --dir DIR --spec FILE            (preflight + init + locator + reconcile + first frontier)\n  adopt --dir DIR --spec FILE            (conservative import of an in-flight prose run; unproved state -> UNKNOWN)\n  checkpoint --run FILE --expected-revision N [--reason TEXT] [--observations FILE] --conductor-id ID --conductor-epoch N\n  init --dir DIR --spec FILE\n  update --run FILE --expected-revision N --patch FILE --conductor-id ID --conductor-epoch N\n  probe --run FILE --expected-revision N --resource ID --slice ID --action acquire|release --conductor-id ID --conductor-epoch N\n  reconcile --run FILE --expected-revision N [--observations FILE] --conductor-id ID --conductor-epoch N\n  takeover --run FILE --expected-revision N --conductor-id OLD --conductor-epoch N --new-conductor-id NEW\n  recover-lock --run FILE --conductor-id ID --conductor-epoch N --confirm-stale\n  recover-mutex --run FILE --expected-revision N --resource ID --conductor-id ID --conductor-epoch N --confirm-stale\n  inspect --run FILE\n  render --run FILE\n  assert-complete --run FILE\n  archive --run FILE --conductor-id ID --conductor-epoch N\n`);
  process.exit(0);
}

if (command === "preflight") {
  const repo = resolve(args.repo || process.cwd());
  let root = repo;
  let branch = "unknown";
  let head = "unknown";
  let dirty = "unknown";
  try {
    root = execFileSync("git", ["-C", repo, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    branch = execFileSync("git", ["-C", root, "branch", "--show-current"], { encoding: "utf8" }).trim() || "detached";
    head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    dirty = execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" }).trim() ? "yes" : "no";
  } catch {}
  const overridePath = join(root, ".agents", "engine-override.json");
  let override = "absent";
  if (existsSync(overridePath)) {
    try {
      readJson(overridePath);
      override = "valid";
    } catch {
      override = "malformed";
    }
  }
  const activeLocator = join(stateRoot(), "active-runs", `${createHash("sha256").update(root).digest("hex")}.json`);
  const skillRoots = [join(root, ".agents", "skills"), join(homedir(), ".agents", "skills"), join(homedir(), ".claude", "skills")];
  const adapters = ["codex-cli-runtime", "claude-cli-runtime", "cursor-subagent", "opencode-subagent"].filter((name) => skillRoots.some((skillRoot) => existsSync(join(skillRoot, name, "SKILL.md"))));
  process.stdout.write(`REPO: ${root}\nBRANCH: ${branch}\nDIRTY: ${dirty}\nBASE_SHA: ${head}\nACTIVE_RUN: ${existsSync(activeLocator) ? activeLocator : "none"}\nHELPER_SCHEMA: 1\nENGINE_OVERRIDE: ${override}\nNATIVE_EXECUTOR: runtime-owned\nNON_NATIVE_ADAPTERS: ${JSON.stringify(adapters)}\n`);
  process.exit(0);
}

if (command === "classify") {
  const count = Number(args.slices || 1);
  const orchestrated = count > 1 || [args.dependencies, args["integration-branch"], args["shared-resource"]].includes("yes");
  const oneLiner = args["one-liner"] === "yes" && count === 1 && !orchestrated;
  process.stdout.write(`PATH: ${oneLiner ? "one-liner" : orchestrated ? "orchestrated" : "simple"}\n`);
  if (!oneLiner && orchestrated) process.stdout.write("REQUIRES_INIT: mutating dispatch is fail-closed until a ledger exists; next: orchestrate-run.mjs start --dir <scratchpad>/orchestrate/<run-id> --spec <spec.json>\n");
  process.exit(0);
}

if (command === "init") {
  if (!args.dir || !args.spec) fail("init requires --dir and --spec");
  const root = resolve(args.dir);
  mkdirSync(root, { recursive: true });
  const path = join(root, "run.json");
  if (existsSync(path)) fail(`${path} already exists`);
  const run = normalize(readJson(resolve(args.spec)));
  const errors = validate(run);
  if (errors.length) fail(errors.join("; "));
  atomicWrite(path, run);
  const locator = locatorPath(run);
  mkdirSync(dirname(locator), { recursive: true });
  atomicWrite(locator, { runId: run.runId, runPath: path, revision: run.revision, updatedAt: run.updatedAt });
  process.stdout.write(`RUN: ${path}\nLOCATOR: ${locator}\n`);
  process.exit(0);
}

if (command === "update") {
  if (args["expected-revision"] === undefined || !args.patch) fail("update requires --expected-revision and --patch");
  const path = runPath(args);
  const patch = readJson(resolve(args.patch));
  const run = mutate(path, args["expected-revision"], caller(args), (current) => mergePatch(current, patch));
  process.stdout.write(`UPDATED: ${path}\nREVISION: ${run.revision}\n`);
  process.exit(0);
}

if (command === "takeover") {
  if (args["expected-revision"] === undefined || !args["new-conductor-id"]) fail("takeover requires --expected-revision and --new-conductor-id");
  const path = runPath(args);
  const currentCaller = caller(args);
  const run = mutate(path, args["expected-revision"], currentCaller, (current) => ({
    ...current,
    conductor: { id: args["new-conductor-id"], epoch: current.conductor.epoch + 1 },
  }));
  process.stdout.write(`TAKEOVER: ${run.conductor.id}@${run.conductor.epoch}\nREVISION: ${run.revision}\n`);
  process.exit(0);
}

if (command === "recover-lock") {
  if (args["confirm-stale"] !== true) fail("recover-lock requires --confirm-stale");
  const path = runPath(args);
  const run = readJson(path);
  const currentCaller = caller(args);
  if (run.conductor.id !== currentCaller.id || run.conductor.epoch !== currentCaller.epoch) fail("stale conductor cannot recover the run lock");
  const lockPath = join(dirname(path), ".run.lock");
  const ownerPath = join(lockPath, "owner.json");
  if (!existsSync(ownerPath)) fail("run lock owner record is absent");
  const owner = readJson(ownerPath);
  if (owner.id !== run.conductor.id || owner.epoch !== run.conductor.epoch) fail("run lock owner does not match ledger owner");
  if (pidAlive(owner.pid)) fail(`run lock process is alive: ${owner.pid}`);
  rmSync(lockPath, { recursive: true, force: true });
  process.stdout.write(`RECOVERED_LOCK: ${lockPath}\n`);
  process.exit(0);
}

if (command === "recover-mutex") {
  if (args["confirm-stale"] !== true || !args.resource || args["expected-revision"] === undefined) fail("recover-mutex requires --expected-revision, --resource, and --confirm-stale");
  const path = runPath(args);
  const run = readJson(path);
  const currentCaller = caller(args);
  const resource = resourceMap(run).get(args.resource) || fail(`unknown resource ${args.resource}`);
  if (run.conductor.id !== currentCaller.id || run.conductor.epoch !== currentCaller.epoch) fail("stale conductor cannot recover a mutex");
  if (resource.status !== "unknown" || run.reconciliation?.status !== "unknown") fail("mutex recovery requires UNKNOWN resource and reconciliation state");
  const mutex = mutexPath(args.resource);
  const ownerPath = join(mutex, "owner.json");
  if (!existsSync(ownerPath)) fail("mutex owner record is absent");
  const owner = readJson(ownerPath);
  if (pidAlive(owner.pid)) fail(`mutex process is alive: ${owner.pid}`);
  const quarantine = `${mutex}.recovered-${process.pid}`;
  renameSync(mutex, quarantine);
  try {
    const updated = mutate(path, args["expected-revision"], currentCaller, (current) => ({
      ...current,
      resources: current.resources.map((item) => item.id === args.resource ? { ...item, status: "released", ownerSlice: null, externalIdentity: null, probe: { observedAt: now(), result: "recovered-stale", details: owner } } : item),
      effects: current.effects.map((effect) => effect.type.startsWith("resource_") && effect.reconcile?.locator === mutex && effect.status === "executing" ? { ...effect, status: "unknown", resolvedAt: now(), reason: "stale mutex recovered; effect outcome needs ruling" } : effect),
    }));
    process.stdout.write(`RECOVERED_MUTEX: ${args.resource}\nREVISION: ${updated.revision}\n`);
  } finally {
    rmSync(quarantine, { recursive: true, force: true });
  }
  process.exit(0);
}

if (command === "probe") {
  if (args["expected-revision"] === undefined || !args.resource || !args.action) fail("probe requires --expected-revision, --resource, and --action");
  const path = runPath(args);
  const initial = readJson(path);
  const conductor = caller(args);
  const resource = resourceMap(initial).get(args.resource) || fail(`unknown resource ${args.resource}`);
  if (resource.authority !== "host_mutex") fail(`helper only acquires host_mutex resources; ${args.resource} uses ${resource.authority}`);
  const slice = sliceMap(initial).get(args.slice) || fail(`unknown slice ${args.slice}`);
  const attemptKey = `${initial.runId}:${slice.id}:${slice.attempt}`;
  const mutex = mutexPath(args.resource);
  if (args.action === "acquire") {
    if (!["free", "released"].includes(resource.status)) fail(`resource ${args.resource} is ${resource.status}`, 2);
    if (!reconciliationFresh(initial)) fail(`resource acquisition requires fresh clean reconciliation; found ${initial.reconciliation?.status}`);
    if (!requiredExecutorSatisfied(slice)) fail(`${slice.id}: required executor constraints are not verified`);
    const uncleared = initial.edges.filter((edge) => edge.target === slice.id && ["start", "human_gate"].includes(edge.type) && !edgeCleared(initial, edge));
    if (uncleared.length) fail(`${slice.id}: uncleared dispatch edges: ${uncleared.map(({ id }) => id).join(", ")}`);
    const effectId = `resource-acquire:${args.resource}:${attemptKey}`;
    if (initial.effects.some(({ id }) => id === effectId)) fail(`effect already exists: ${effectId}`);
    const prepared = mutate(path, args["expected-revision"], conductor, (current) => ({
      ...current,
      effects: [...current.effects, {
        id: effectId,
        type: "resource_acquire",
        resourceId: args.resource,
        sliceId: slice.id,
        status: "prepared",
        ownerEpoch: current.conductor.epoch,
        attemptKey,
        idempotencyKey: effectId,
        preparedAt: now(),
        executingAt: null,
        resolvedAt: null,
        reconcile: { kind: "mutex", locator: mutex, expected: current.runId },
        observation: null,
        reason: null,
      }],
    }));
    const executing = mutate(path, prepared.revision, conductor, (current) => ({
      ...current,
      effects: current.effects.map((effect) => effect.id === effectId ? { ...effect, status: "executing", executingAt: now() } : effect),
    }));
    mkdirSync(dirname(mutex), { recursive: true });
    try {
      mkdirSync(mutex);
      atomicWrite(join(mutex, "owner.json"), { resource: args.resource, runId: initial.runId, conductor: initial.conductor, sliceId: args.slice, pid: process.pid, acquiredAt: now() });
    } catch {
      const owner = existsSync(join(mutex, "owner.json")) ? readFileSync(join(mutex, "owner.json"), "utf8").trim() : "unknown";
      const cancelled = mutate(path, executing.revision, conductor, (current) => ({
        ...current,
        effects: current.effects.map((effect) => effect.id === effectId ? { ...effect, status: "cancelled", resolvedAt: now(), reason: `mutex conflict: ${owner}`, observation: { definiteNonExecution: true } } : effect),
      }));
      process.stderr.write(`RESOURCE_CONFLICT: ${args.resource}\nOWNER: ${owner}\n`);
      process.stderr.write(`REVISION: ${cancelled.revision}\n`);
      process.exit(2);
    }
    try {
      const run = mutate(path, executing.revision, conductor, (current) => ({
        ...current,
        resources: current.resources.map((item) => item.id === args.resource ? { ...item, status: "acquired", ownerSlice: args.slice, externalIdentity: mutex, probe: { observedAt: now(), result: "acquired", details: mutex } } : item),
        effects: current.effects.map((effect) => effect.id === effectId ? { ...effect, status: "observed", resolvedAt: now(), observation: { identity: mutex } } : effect),
      }));
      process.stdout.write(`RESOURCE_ACQUIRED: ${args.resource}\nIDENTITY: ${mutex}\nREVISION: ${run.revision}\n`);
    } catch (error) {
      rmSync(mutex, { recursive: true, force: true });
      throw error;
    }
  } else if (args.action === "release") {
    if (resource.status !== "acquired") fail(`resource ${args.resource} is ${resource.status}`);
    if (!reconciliationFresh(initial)) fail(`resource release requires fresh clean reconciliation; found ${initial.reconciliation?.status}`);
    if (!existsSync(join(mutex, "owner.json"))) fail(`resource mutex is absent: ${args.resource}`);
    const owner = readJson(join(mutex, "owner.json"));
    if (owner.runId !== initial.runId || owner.conductor.id !== initial.conductor.id || owner.conductor.epoch !== initial.conductor.epoch || owner.sliceId !== args.slice || resource.ownerSlice !== args.slice) fail(`resource owner mismatch for ${args.resource}`);
    if (slice.state !== "TERMINAL") fail(`resource ${args.resource} remains held until owning slice ${args.slice} is terminal`);
    const effectId = `resource-release:${args.resource}:${attemptKey}`;
    if (initial.effects.some(({ id }) => id === effectId)) fail(`effect already exists: ${effectId}`);
    const prepared = mutate(path, args["expected-revision"], conductor, (current) => ({
      ...current,
      effects: [...current.effects, {
        id: effectId,
        type: "resource_release",
        resourceId: args.resource,
        sliceId: slice.id,
        status: "prepared",
        ownerEpoch: current.conductor.epoch,
        attemptKey,
        idempotencyKey: effectId,
        preparedAt: now(),
        executingAt: null,
        resolvedAt: null,
        reconcile: { kind: "mutex", locator: mutex, expected: "absent" },
        observation: null,
        reason: null,
      }],
    }));
    const executing = mutate(path, prepared.revision, conductor, (current) => ({
      ...current,
      effects: current.effects.map((effect) => effect.id === effectId ? { ...effect, status: "executing", executingAt: now() } : effect),
    }));
    rmSync(mutex, { recursive: true, force: true });
    const run = mutate(path, executing.revision, conductor, (current) => ({
      ...current,
      resources: current.resources.map((item) => item.id === args.resource ? { ...item, status: "released", ownerSlice: null, externalIdentity: null, probe: { observedAt: now(), result: "released", details: null } } : item),
      effects: current.effects.map((effect) => effect.id === effectId ? { ...effect, status: "observed", resolvedAt: now(), observation: { identity: "released" } } : effect),
    }));
    process.stdout.write(`RESOURCE_RELEASED: ${args.resource}\nREVISION: ${run.revision}\n`);
  } else fail("probe --action must be acquire or release");
  process.exit(0);
}

const reconcileOperation = (observations) => (current) => {
    const notes = [];
    const unknownSlices = new Set();
    let status = "clean";
    let targetHead = null;
    let remoteTargetHead = null;
    if (!existsSync(current.repo.path)) {
      status = "offline";
      notes.push(`repo unavailable: ${current.repo.path}`);
    } else {
      try {
        const root = git(current.repo.path, ["rev-parse", "--show-toplevel"]);
        if (resolve(root) !== resolve(current.repo.path)) throw new Error(`repo root drift: ${root}`);
        targetHead = git(current.repo.path, ["rev-parse", `refs/heads/${current.repo.targetBranch}`]);
        const remoteLine = git(current.repo.path, ["ls-remote", "origin", `refs/heads/${current.repo.targetBranch}`]);
        remoteTargetHead = remoteLine.split(/\s+/)[0] || null;
        if (!remoteTargetHead || targetHead !== remoteTargetHead || remoteTargetHead !== current.repo.expectedHead) throw new Error("local, remote, and recorded target heads differ");
      } catch {
        status = "unknown";
        notes.push("repo root or exact local/remote target head does not match recorded authority");
      }
    }
    const observationEnvelopeValid = observations && observations.runId === current.runId && observations.conductor?.id === current.conductor.id && observations.conductor?.epoch === current.conductor.epoch && observations.observedForRevision === current.revision && freshTimestamp(observations.observedAt);
    if (observations && !observationEnvelopeValid) {
      status = "unknown";
      notes.push("observation envelope is stale or not bound to this run/revision/conductor");
    }
    for (const slice of current.slices.filter(({ worktree, branch }) => worktree || branch)) {
      try {
        if (!slice.worktree || !existsSync(slice.worktree)) throw new Error("worktree absent");
        const branch = git(slice.worktree, ["branch", "--show-current"]);
        const head = git(slice.worktree, ["rev-parse", "HEAD"]);
        if (slice.branch && branch !== slice.branch) throw new Error(`branch ${branch} != ${slice.branch}`);
        if (slice.baseSha) git(slice.worktree, ["merge-base", "--is-ancestor", slice.baseSha, head]);
      } catch {
        status = "unknown";
        notes.push(`worktree/branch drift: ${slice.id}`);
        unknownSlices.add(slice.id);
      }
    }
    const active = current.slices.filter(({ state }) => ["ACTIVE", "READY_FOR_ACCEPTANCE"].includes(state));
    if (active.length && !observationEnvelopeValid) {
      status = status === "offline" ? "offline" : "unknown";
      notes.push("active slices require a current bound runtime observation envelope");
    }
    const runtimeObservations = observationEnvelopeValid ? observations.runtimeObservations || [] : current.runtimeObservations;
    for (const slice of active) {
      const key = `${current.runId}:${slice.id}:${slice.attempt}`;
      const observation = observationEnvelopeValid ? runtimeObservations.find(({ attemptKey }) => attemptKey === key) : null;
      const executorMatches = observation && observation.executor === slice.executor.verified.executor && (slice.executor.verified.vendor === "unknown" || observation.vendor === slice.executor.verified.vendor);
      if (!observation || !runtimeStatuses.has(observation.status) || !observation.sessionId || !executorMatches || !freshTimestamp(observation.observedAt)) {
        status = "unknown";
        notes.push(`runtime state unresolved: ${key}`);
        unknownSlices.add(slice.id);
      }
    }
    let resources = current.resources.map((resource) => {
      if (resource.status !== "acquired") return resource;
      if (resource.authority === "host_mutex") {
        try {
          const owner = readJson(join(resource.externalIdentity, "owner.json"));
          if (owner.runId !== current.runId || owner.conductor.id !== current.conductor.id || owner.conductor.epoch !== current.conductor.epoch || owner.sliceId !== resource.ownerSlice) throw new Error("owner mismatch");
        } catch {
          const releaseInFlight = current.effects.some((effect) => effect.type === "resource_release" && effect.status === "executing" && effect.reconcile?.locator === resource.externalIdentity);
          if (releaseInFlight && !existsSync(resource.externalIdentity)) return resource;
          status = "unknown";
          notes.push(`resource mutex missing or mismatched: ${resource.id}`);
          if (resource.ownerSlice) unknownSlices.add(resource.ownerSlice);
          return { ...resource, status: "unknown" };
        }
      }
      return resource;
    });
    const effects = current.effects.map((effect) => {
      if (effect.status !== "executing" || !["resource_acquire", "resource_release"].includes(effect.type)) return effect;
      const mutexExists = existsSync(effect.reconcile.locator);
      if (effect.type === "resource_release" && !mutexExists) {
        resources = resources.map((resource) => resource.id === effect.resourceId ? { ...resource, status: "released", ownerSlice: null, externalIdentity: null, probe: { observedAt: now(), result: "reconciled-release", details: null } } : resource);
        notes.push(`resource release reconciled: ${effect.id}`);
        return { ...effect, status: "observed", resolvedAt: now(), observation: { identity: "released" } };
      }
      if (effect.type === "resource_acquire" && mutexExists) {
        try {
          const owner = readJson(join(effect.reconcile.locator, "owner.json"));
          if (owner.runId !== current.runId || owner.conductor.id !== current.conductor.id || owner.conductor.epoch !== current.conductor.epoch || owner.sliceId !== effect.sliceId) throw new Error("owner mismatch");
          resources = resources.map((resource) => resource.id === effect.resourceId ? { ...resource, status: "acquired", ownerSlice: effect.sliceId, externalIdentity: effect.reconcile.locator, probe: { observedAt: now(), result: "reconciled-acquire", details: effect.reconcile.locator } } : resource);
          notes.push(`resource acquisition reconciled: ${effect.id}`);
          return { ...effect, status: "observed", resolvedAt: now(), observation: { identity: effect.reconcile.locator } };
        } catch {}
      }
      return effect;
    });
    if (effects.some(({ status: effectStatus }) => ["executing", "unknown"].includes(effectStatus))) {
      status = "unknown";
      notes.push("unresolved external effect exists");
      for (const effect of effects.filter(({ status: effectStatus }) => ["executing", "unknown"].includes(effectStatus))) unknownSlices.add(effect.sliceId);
    }
    const effectObservations = observationEnvelopeValid ? observations.effectObservations || [] : [];
    for (const effect of effects.filter(({ status: effectStatus }) => effectStatus === "observed")) {
      if (effect.type === "merge") {
        const observed = effectObservations.find(({ effectId }) => effectId === effect.id);
        let sourceVerified = false;
        if (observed && effect.reconcile.sourceKind === "provider_pr_head") sourceVerified = observed.providerAttested === true && Boolean(observed.provider) && observed.sourceHead === effect.reconcile.expected;
        if (observed && effect.reconcile.sourceKind === "git_ancestor") {
          try {
            git(current.repo.path, ["cat-file", "-e", `${effect.reconcile.expected}^{commit}`]);
            git(current.repo.path, ["cat-file", "-e", `${observed.identity}^{commit}`]);
            git(current.repo.path, ["merge-base", "--is-ancestor", effect.reconcile.expected, observed.identity]);
            git(current.repo.path, ["merge-base", "--is-ancestor", observed.identity, remoteTargetHead]);
            sourceVerified = true;
          } catch {}
        }
        if (!observationEnvelopeValid || !observed || observed.status !== "observed" || observed.identity !== effect.observation?.identity || observed.locator !== effect.reconcile.locator || observed.expected !== effect.reconcile.expected || observed.targetHead !== remoteTargetHead || !sourceVerified || !freshTimestamp(observed.observedAt)) {
          status = "unknown";
          notes.push(`merge observation unresolved: ${effect.id}`);
        }
      }
      if (["push", "pr_create", "pr_update", "issue_close", "external_act", "resume"].includes(effect.type)) {
        const observed = effectObservations.find(({ effectId }) => effectId === effect.id);
        if (!observationEnvelopeValid || !observed || observed.status !== "observed" || observed.identity !== effect.observation?.identity || observed.locator !== effect.reconcile.locator || observed.expected !== effect.reconcile.expected || !freshTimestamp(observed.observedAt)) {
          status = "unknown";
          notes.push(`external observation unresolved: ${effect.id}`);
        }
      }
    }
    const preparations = current.preparations.map((preparation) => {
      if (targetHead && preparation.valid !== false && preparation.sourceSha !== targetHead) {
        notes.push(`preparation invalidated: ${preparation.sliceId}`);
        return { ...preparation, valid: false, invalidatedAt: now(), invalidatedBy: targetHead };
      }
      return preparation;
    });
    const slices = current.slices.map((slice) => unknownSlices.has(slice.id) && slice.state !== "TERMINAL" ? { ...slice, resumeState: slice.state === "UNKNOWN" ? slice.resumeState : slice.state, state: "UNKNOWN", blocker: "reconciliation could not prove recorded runtime/resource/effect state" } : slice);
    return { ...current, runtimeObservations, preparations, resources, effects, slices, reconciliation: { status, at: now(), notes } };
};

if (command === "reconcile") {
  if (args["expected-revision"] === undefined) fail("reconcile requires --expected-revision");
  const path = runPath(args);
  const observations = args.observations ? readJson(resolve(args.observations)) : null;
  const run = mutate(path, args["expected-revision"], caller(args), reconcileOperation(observations), { allowReconciliation: true });
  process.stdout.write(`RECONCILIATION: ${run.reconciliation.status}\nREVISION: ${run.revision}\n`);
  for (const note of run.reconciliation.notes) process.stdout.write(`NOTE: ${note}\n`);
  process.exit(0);
}

const exclusiveWrite = (path, value) => {
  const descriptor = openSync(path, "wx", 0o600);
  writeFileSync(descriptor, serialize(value));
  fsyncSync(descriptor);
  closeSync(descriptor);
};

const initializeRun = (run, path) => {
  const errors = validate(run);
  if (errors.length) fail(errors.join("; "));
  try {
    exclusiveWrite(path, run);
  } catch {
    fail(`${path} already exists; use reconcile + inspect to resume`);
  }
  const locator = locatorPath(run);
  mkdirSync(dirname(locator), { recursive: true });
  const record = { runId: run.runId, runPath: path, revision: run.revision, updatedAt: run.updatedAt };
  try {
    exclusiveWrite(locator, record);
  } catch {
    const active = existsSync(locator) ? readJson(locator) : null;
    if (active?.runPath && active.runPath !== path && existsSync(active.runPath)) {
      rmSync(path, { force: true });
      fail(`an active run already claimed ${run.repo.path}: ${active.runPath}`);
    }
    atomicWrite(locator, record);
  }
  return locator;
};

if (command === "start") {
  if (!args.dir || !args.spec) fail("start requires --dir and --spec");
  const spec = readJson(resolve(args.spec));
  if (!spec.repo?.path || !spec.repo?.targetBranch) fail("spec.repo.path and spec.repo.targetBranch are required");
  let repoRoot;
  try {
    repoRoot = git(resolve(spec.repo.path), ["rev-parse", "--show-toplevel"]);
  } catch {
    fail(`spec.repo.path is not a git repository: ${spec.repo.path}`);
  }
  const activeLocator = join(stateRoot(), "active-runs", `${createHash("sha256").update(repoRoot).digest("hex")}.json`);
  if (existsSync(activeLocator)) {
    const active = readJson(activeLocator);
    if (active.runPath && existsSync(active.runPath)) fail(`an active run already exists for ${repoRoot}: ${active.runPath}; resume it (reconcile + inspect) or archive it first`);
  }
  let liveHead;
  try {
    liveHead = git(repoRoot, ["rev-parse", `refs/heads/${spec.repo.targetBranch}`]);
  } catch {
    fail(`target branch not found in ${repoRoot}: ${spec.repo.targetBranch}`);
  }
  spec.repo.path = repoRoot;
  if (!spec.repo.baseSha || spec.repo.baseSha === "auto") spec.repo.baseSha = liveHead;
  if (!spec.repo.expectedHead || spec.repo.expectedHead === "auto") spec.repo.expectedHead = liveHead;
  const root = resolve(args.dir);
  mkdirSync(root, { recursive: true });
  const path = join(root, "run.json");
  if (existsSync(path)) fail(`${path} already exists; use reconcile + inspect to resume`);
  const run = normalize(spec);
  const locator = initializeRun(run, path);
  const reconciled = mutate(path, run.revision, run.conductor, reconcileOperation(null), { allowReconciliation: true });
  process.stdout.write(`RUN: ${path}\nLOCATOR: ${locator}\nRECONCILIATION: ${reconciled.reconciliation.status}\n`);
  for (const note of reconciled.reconciliation.notes) process.stdout.write(`NOTE: ${note}\n`);
  inspect(reconciled);
  process.exit(0);
}

if (command === "adopt") {
  if (!args.dir || !args.spec) fail("adopt requires --dir and --spec");
  const root = resolve(args.dir);
  mkdirSync(root, { recursive: true });
  const path = join(root, "run.json");
  if (existsSync(path)) fail(`${path} already exists`);
  const run = normalize(readJson(resolve(args.spec)));
  try {
    run.repo.path = git(resolve(run.repo.path), ["rev-parse", "--show-toplevel"]);
  } catch {
    fail(`spec.repo.path is not a git repository: ${run.repo.path}; adoption requires the live repo for canonical active-run detection`);
  }
  const activeLocator = locatorPath(run);
  if (existsSync(activeLocator)) {
    const active = readJson(activeLocator);
    if (active.runPath && existsSync(active.runPath)) fail(`an active run already exists for ${run.repo.path}: ${active.runPath}; resume it instead of adopting`);
  }
  run.reconciliation = { status: "unknown", at: now(), notes: ["adopted from a prose run; reconcile before any external intent"] };
  run.effects = run.effects.map((effect) => ["observed", "cancelled"].includes(effect.status) ? effect : { ...effect, status: "unknown", reason: `adopted with unproved status ${effect.status}; outcome needs a ruling` });
  run.resources = run.resources.map((resource) => resource.status === "acquired" && (!resource.ownerSlice || !resource.externalIdentity) ? { ...resource, status: "unknown" } : resource);
  const downgraded = new Set();
  for (let pass = 0; pass <= run.slices.length; pass += 1) {
    const errors = validate(run);
    let changed = false;
    for (const slice of run.slices) {
      const reason = errors.find((error) => error.startsWith(`${slice.id}: `));
      if (slice.state === "UNKNOWN" || !reason) continue;
      slice.resumeState = ["BLOCKED", "UNKNOWN"].includes(slice.state) ? slice.resumeState || "PLANNED" : slice.state;
      slice.blocker = `adopted without ledger proof (declared ${slice.state}${slice.outcome ? `/${slice.outcome}` : ""}): ${reason.slice(slice.id.length + 2)}`;
      slice.state = "UNKNOWN";
      slice.outcome = null;
      downgraded.add(slice.id);
      changed = true;
    }
    if (!changed) break;
  }
  const errors = validate(run);
  if (errors.length) fail(`adopt could not conservatively import the spec: ${errors.join("; ")}`);
  const locator = initializeRun(run, path);
  process.stdout.write(`RUN: ${path}\nLOCATOR: ${locator}\nADOPTED_UNKNOWN: ${JSON.stringify([...downgraded])}\nNEXT: reconcile, then rule on every UNKNOWN slice and unresolved effect before any write\n`);
  process.exit(0);
}

const renderResume = (run, path, resumePath) => {
  const state = derived(run);
  const hash = digest(run);
  const rows = run.slices.map((slice) => `| ${slice.id} | ${state.waves[slice.id]} | ${slice.lane} | ${slice.state} | ${slice.outcome || "—"} | ${slice.attempt} | ${slice.branch || "—"} | ${slice.baseSha || "—"} | ${slice.reviews?.correctionCount ?? 0} |`).join("\n");
  const active = run.slices.filter(({ state: sliceState }) => ["ACTIVE", "READY_FOR_ACCEPTANCE"].includes(sliceState)).map((slice) => {
    const key = `${run.runId}:${slice.id}:${slice.attempt}`;
    const observation = run.runtimeObservations.find(({ attemptKey }) => attemptKey === key);
    return `- ${key}: executor=${observation?.executor || "unobserved"} session=${observation?.sessionId || "unobserved"} status=${observation?.status || "unobserved"} at=${observation?.observedAt || "—"}`;
  }).join("\n") || "- None";
  const held = state.heldResources.map(({ id, status, ownerSlice, externalIdentity }) => `- ${id}: ${status} owner=${ownerSlice || "—"} identity=${externalIdentity || "—"}`).join("\n") || "- None";
  const unresolved = state.unresolvedEffects.map(({ id, type, status, sliceId }) => `- ${id}: ${type} ${status} slice=${sliceId}`).join("\n") || "- None";
  const gates = state.openDeferredGates.map(({ id, description, sliceId }) => `- ${id}: ${description}${sliceId ? ` (slice ${sliceId})` : ""}`).join("\n") || "- None";
  const blockers = run.slices.filter(({ blocker }) => blocker).map(({ id, blocker }) => `- ${id}: ${blocker}`).join("\n") || "- None";
  const history = (Array.isArray(run.checkpoints) ? run.checkpoints : []).slice(-5).map(({ at, conductor: by, reason }) => `- ${at} by ${by}${reason ? `: ${reason}` : ""}`).join("\n");
  const content = `# Resume: ${run.title}\n\nGenerated from \`run.json\` at checkpoint. Do not edit; regenerate with \`checkpoint\`.\n\n- Run: \`${run.runId}\` at \`${path}\`\n- Revision: ${run.revision}\n- SHA-256: \`${hash}\`\n- Owner: \`${run.conductor.id}@${run.conductor.epoch}\`\n- Repo: \`${run.repo.path}\` target \`${run.repo.targetBranch}\` expected head \`${run.repo.expectedHead}\`\n- Reconciliation: \`${run.reconciliation.status}\`${run.reconciliation.notes.length ? `\n${run.reconciliation.notes.map((note) => `  - ${note}`).join("\n")}` : ""}\n\n## Frontiers\n\n- Write: ${JSON.stringify(state.write)}\n- Preparation: ${JSON.stringify(state.preparation)}\n- Acceptance: ${JSON.stringify(state.ready)}\n- Integration: ${JSON.stringify(state.integration)}\n\n| Slice | Wave | Lane | State | Outcome | Attempt | Branch | Base | Corrections |\n|---|---:|---|---|---|---:|---|---|---:|\n${rows}\n\n## Active attempts\n\n${active}\n\n## Held resources\n\n${held}\n\n## Unresolved effects\n\n${unresolved}\n\n## Open deferred gates\n\n${gates}\n\n## Blockers\n\n${blockers}\n\n## Checkpoint history\n\n${history}\n\n## Next safe act\n\n1. A new conductor runs \`takeover\` first; the same conductor continues with its recorded id/epoch.\n2. \`reconcile\` against live state; a stale checkpoint is never dispatch authority.\n3. \`inspect\` and dispatch only from the emitted write frontier.\n4. Rule on every UNKNOWN slice and unresolved effect before new external intent.\n`;
  writeDoc(resumePath, content);
  return state;
};

if (command === "checkpoint") {
  if (args["expected-revision"] === undefined) fail("checkpoint requires --expected-revision");
  const path = runPath(args);
  const conductor = caller(args);
  const observations = args.observations ? readJson(resolve(args.observations)) : null;
  const resumePath = join(dirname(path), "RESUME.md");
  const run = mutate(path, args["expected-revision"], conductor, (current) => {
    const reconciled = reconcileOperation(observations)(current);
    return { ...reconciled, checkpoints: [...(Array.isArray(reconciled.checkpoints) ? reconciled.checkpoints : []), { at: now(), reason: args.reason || null, conductor: `${conductor.id}@${conductor.epoch}`, revisionBefore: current.revision }] };
  }, { allowReconciliation: true, afterWrite: (candidate) => renderResume(candidate, path, resumePath) });
  const state = derived(run);
  process.stdout.write(`CHECKPOINT: ${resumePath}\nRECONCILIATION: ${run.reconciliation.status}\nREVISION: ${run.revision}\nWRITE_FRONTIER: ${JSON.stringify(state.write)}\n`);
  process.exit(0);
}

if (command === "inspect") {
  inspect(readJson(runPath(args)));
  process.exit(0);
}

if (command === "render") {
  const path = runPath(args);
  render(readJson(path), join(dirname(path), "RUN.md"));
  process.exit(0);
}

if (command === "assert-complete") {
  const run = readJson(runPath(args));
  const errors = validate(run);
  const state = derived(run);
  if (!errors.length && state.complete) {
    process.stdout.write("COMPLETE: yes\n");
    process.exit(0);
  }
  process.stdout.write("COMPLETE: no\n");
  for (const slice of run.slices.filter(({ state: sliceState }) => sliceState !== "TERMINAL")) process.stdout.write(`MISSING_SLICE: ${slice.id}:${slice.state}\n`);
  for (const criterion of state.incompleteCriteria) process.stdout.write(`MISSING_CRITERION: ${criterion.id}\n`);
  for (const effect of state.unresolvedEffects) process.stdout.write(`UNRESOLVED_EFFECT: ${effect.id}:${effect.status}\n`);
  for (const resource of state.heldResources) process.stdout.write(`HELD_RESOURCE: ${resource.id}:${resource.status}\n`);
  for (const gate of state.openDeferredGates) process.stdout.write(`OPEN_DEFERRED_GATE: ${gate.id}\n`);
  for (const error of errors) process.stdout.write(`INVALID: ${error}\n`);
  process.exit(1);
}

if (command === "archive") {
  const run = readJson(runPath(args));
  const currentCaller = caller(args);
  if (run.conductor.id !== currentCaller.id || run.conductor.epoch !== currentCaller.epoch) fail("stale conductor cannot archive a run");
  const errors = validate(run);
  const state = derived(run);
  if (errors.length || !state.complete) fail("archive requires a valid complete run");
  const locator = locatorPath(run);
  rmSync(locator, { force: true });
  process.stdout.write(`ARCHIVED_LOCATOR: ${locator}\nRUN_RETAINED: ${runPath(args)}\n`);
  process.exit(0);
}

fail(`unknown command: ${command}`);
