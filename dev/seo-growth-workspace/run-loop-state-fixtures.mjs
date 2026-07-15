#!/usr/bin/env node

// Fixture suite for scripts/loop-state.mjs — the compiled loop-state protocol.
//
// Three passes:
//   1. Agreement: loop-state verify and cadence-status must agree (valid vs fail
//      closed) on every cadence-status fixture workspace — the two tools may
//      never diverge on what parses.
//   2. Static loop-state fixtures: crash intermediates, staleAsOf annotations,
//      armed autopublish, mirror drift, corrupt ship ledgers.
//   3. Write-path scenarios in temp workspaces: lifecycles, idempotent crash
//      retries, refusal exit codes, cap boundaries, sleep certification.
//
// Field-discovered edge cases land HERE as fixtures or scenarios, never as new
// prose clauses (design rule 4).

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(here, "..", "..", "skills", "growth", "seo-growth-workspace");
const loopState = path.join(skillRoot, "scripts", "loop-state.mjs");
const cadenceStatus = path.join(skillRoot, "scripts", "cadence-status.mjs");
const fixtures = path.join(here, "fixtures");
const NOW = "2026-07-12";
const VERSION = "9.9.9-test";

let passed = 0;
const failures = [];
const tempRoots = [];

function check(condition, label) {
  if (condition) passed += 1;
  else failures.push(label);
}

function run(args) {
  const result = spawnSync(process.execPath, [loopState, ...args], { encoding: "utf-8" });
  let json = null;
  try {
    json = JSON.parse(result.stdout || result.stderr);
  } catch {
    /* non-JSON output stays null */
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

function temp(seedDir) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "loop-state-fixture-"));
  tempRoots.push(dir);
  if (seedDir) cpSync(seedDir, dir, { recursive: true });
  return dir;
}

function hashTree(root) {
  const hash = createHash("sha256");
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) hash.update(entry.name).update(readFileSync(absolute));
    }
  };
  walk(root);
  return hash.digest("hex");
}

// ---------- pass 1: agreement with cadence-status ----------

for (const entry of readdirSync(path.join(fixtures, "cadence-status"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const workspace = path.join(fixtures, "cadence-status", entry.name);
  const cs = spawnSync(process.execPath, [cadenceStatus, "--workspace", workspace, "--format", "json", "--now", NOW], { encoding: "utf-8" });
  const csStatus = cs.status === 0 ? JSON.parse(cs.stdout).status : "fail_closed";
  const ls = run(["verify", "--workspace", workspace, "--now", NOW]);
  const agree = (csStatus === "ok") === (ls.status === 0);
  check(agree, `agreement: ${entry.name} (cadence-status ${csStatus}, loop-state exit ${ls.status})`);
}
{
  const missing = run(["verify", "--workspace", path.join(fixtures, "cadence-status", "does-not-exist"), "--now", NOW]);
  check(missing.status === 2, "agreement: missing workspace root fails closed");
}

// ---------- pass 2: static loop-state fixtures ----------

const staticFixture = (name) => path.join(fixtures, "loop-state", name);

{
  const before = hashTree(staticFixture("annotated-coverage"));
  const verify = run(["verify", "--workspace", staticFixture("annotated-coverage"), "--now", NOW]);
  check(verify.status === 0, "annotated-coverage: verify is valid (annotation is advisory)");
  check(verify.json?.notes?.annotatedRungs?.length === 1 && verify.json.notes.annotatedRungs[0].rung === "B", "annotated-coverage: rung B surfaces as annotated");
  check(verify.json?.notes?.staleRungs?.length === 0, "annotated-coverage: fresh observedAt is not age-stale");
  check(hashTree(staticFixture("annotated-coverage")) === before, "annotated-coverage: verify is byte-neutral");
}
{
  const bad = run(["verify", "--workspace", staticFixture("bad-ship-events"), "--now", NOW]);
  check(bad.status === 2, "bad-ship-events: duplicate dedupeKey fails closed");
  check(JSON.stringify(bad.json?.failures ?? []).includes("dedupeKey"), "bad-ship-events: failure names the dedupeKey");
}
{
  const crash = run(["verify", "--workspace", staticFixture("crash-intermediates"), "--now", NOW]);
  check(crash.status === 0, "crash-intermediates: legal intermediates are valid state");
  check(crash.json?.notes?.inFlightObligations?.length === 2, "crash-intermediates: both intermediates surface as in-flight");
}
{
  const drift = run(["verify", "--workspace", staticFixture("mirror-drift"), "--now", NOW]);
  check(drift.status === 0 && drift.json?.notes?.mirrorDrift?.length === 1, "mirror-drift: stale policy mirror surfaces as a note");
  const repairable = temp(staticFixture("mirror-drift"));
  const repaired = run(["verify", "--workspace", repairable, "--now", NOW, "--repair"]);
  check(repaired.status === 0 && repaired.json?.notes?.repairedMirrors?.length === 1, "mirror-drift: --repair corrects the mirror");
  const ledger = JSON.parse(readFileSync(path.join(repairable, "loops", "coverage-ledger.json"), "utf-8"));
  check(ledger.rungs.B.maxAgeDays === 14, "mirror-drift: repaired mirror equals policy");
  const again = run(["verify", "--workspace", repairable, "--now", NOW]);
  check(again.json?.notes?.mirrorDrift?.length === 0, "mirror-drift: no drift after repair");
}

// ---------- pass 3: write-path scenarios ----------

const certPayload = (overrides = {}) => JSON.stringify({
  dedupeKey: "sha256:fixture-sleep",
  fingerprint: {
    target: "fixture.example.com",
    mode: "operate",
    requestedSurface: "full",
    remit: "unattended",
    mutationCeiling: "content-only",
    authorizationClass: "standard@1",
  },
  checkedEvidence: ["loops/frontier-sweep.json", "backlog.md"],
  gateFailures: [],
  earliestNextDue: "2026-07-25",
  wakeOn: [],
  coverage: "partial",
  ...overrides,
});

function certify(workspace, payloadOverrides = {}, extraArgs = []) {
  const payloadPath = path.join(workspace, "cert-payload.json");
  writeFileSync(payloadPath, certPayload(payloadOverrides));
  return run(["sleep", "certify", "--workspace", workspace, "--loop", "frontier-sweep.json", "--payload", payloadPath, "--now", NOW, "--installed", VERSION, ...extraArgs]);
}

// occurrence lifecycle + idempotent retries
{
  const ws = temp();
  const base = ["--workspace", ws, "--loop", "frontier-sweep.json", "--cadence", "weekly-gsc", "--window", "2026-07-06/2026-07-12"];
  check(run(["occurrence", "add", ...base, "--due-at", "2026-07-12", "--fingerprint", "sha256:occ-1", "--priority", "P4", "--area", "reporting"]).status === 0, "occurrence: add");
  check(run(["occurrence", "add", ...base, "--due-at", "2026-07-12", "--fingerprint", "sha256:occ-1"]).json?.status === "noop", "occurrence: add retry is a noop");
  check(run(["occurrence", "add", ...base, "--due-at", "2026-07-12", "--fingerprint", "sha256:other"]).status === 8, "occurrence: add with a different fingerprint is refused");
  check(run(["occurrence", "add", ...base, "--due-at", "2026-07-11", "--fingerprint", "sha256:occ-1"]).status === 8, "occurrence: add with a different dueAt is refused, not a noop");
  check(run(["occurrence", "satisfy", ...base, "--result", "ok"]).status === 8, "occurrence: satisfy from due is refused");
  check(run(["occurrence", "materialize", ...base, "--ticket", "SEO-001"]).status === 0, "occurrence: materialize");
  check(run(["occurrence", "materialize", ...base, "--ticket", "SEO-001"]).json?.status === "noop", "occurrence: materialize retry is a noop");
  const inFlight = run(["verify", "--workspace", ws, "--now", NOW]);
  check(inFlight.json?.notes?.inFlightOccurrences?.length === 1, "occurrence: materialized+open ticket is in-flight");
  run(["stamp", "write", "--workspace", ws, "--installed", VERSION, "--now", NOW]);
  check(certify(ws).status === 4, "occurrence: in-flight occurrence refuses sleep (exit 4)");
  check(run(["occurrence", "attempt", ...base]).status === 0, "occurrence: attempt");
  check(run(["occurrence", "block", ...base, "--next-at", "2026-07-13", "--max-at", "2026-07-16"]).status === 0, "occurrence: block");
  check(run(["occurrence", "block", ...base, "--next-at", "2026-07-13", "--max-at", "2026-07-16"]).json?.status === "noop", "occurrence: block retry with the same backoff is a noop");
  const blocked = JSON.parse(readFileSync(path.join(ws, "loops", "frontier-sweep.json"), "utf-8"));
  const record = Object.values(blocked.occurrences)[0];
  check(record.state === "blockedUntil" && record.attempt === 1 && record.nextAt === "2026-07-13", "occurrence: block records backoff once across retries");
  check(run(["occurrence", "attempt", ...base]).status === 0, "occurrence: retry from blockedUntil reuses the ticket");
  check(run(["occurrence", "satisfy", ...base, "--result", "alerted"]).status === 0, "occurrence: satisfy after retry");
  const done = JSON.parse(readFileSync(path.join(ws, "loops", "frontier-sweep.json"), "utf-8"));
  const final = Object.values(done.occurrences)[0];
  check(final.state === "satisfied" && final.result === "alerted" && final.ticket.status === "closed" && final.nextAt === null, "occurrence: satisfied record is canonical");
  check(run(["verify", "--workspace", ws, "--now", NOW]).status === 0, "occurrence: final state verifies");
}

// cross-file identity dedupe
{
  const ws = temp();
  const idArgs = ["--workspace", ws, "--cadence", "monthly-report", "--window", "2026-07-01/2026-07-31", "--due-at", "2026-07-31"];
  check(run(["occurrence", "add", "--loop", "a.json", ...idArgs, "--fingerprint", "sha256:a"]).status === 0, "cross-file: first add");
  check(run(["occurrence", "add", "--loop", "b.json", ...idArgs, "--fingerprint", "sha256:b"]).status === 8, "cross-file: same identity in another file is refused");
}

// obligation lifecycle: add -> claim -> materialize -> resolve
{
  const ws = temp();
  const id = ["--workspace", ws, "--hypothesis", "Fixture CTR hypothesis", "--cohort", "sha256:cohort-1"];
  const add = ["obligation", "add", ...id, "--baseline-measured-at", "2026-07-01", "--baseline-value", "2.1% CTR", "--baseline-evidence", "reports/gsc.json", "--metric", "non-brand CTR", "--decision", "keep or revert", "--due-at", "2026-07-29"];
  check(run(add).status === 0, "obligation: add");
  check(run(add).json?.status === "noop", "obligation: add retry is a noop");
  check(run(["obligation", "materialize", ...id, "--ticket", "SEO-010"]).status === 8, "obligation: materialize without a claimed fingerprint is refused");
  check(run(["obligation", "claim", ...id, "--fingerprint", "sha256:attempt-1"]).status === 0, "obligation: claim persists the fingerprint");
  check(run(["obligation", "claim", ...id, "--fingerprint", "sha256:attempt-1"]).json?.status === "noop", "obligation: claim retry is a noop");
  check(run(["obligation", "claim", ...id, "--fingerprint", "sha256:conflict"]).status === 8, "obligation: conflicting claim is refused");
  check(run(["obligation", "materialize", ...id, "--ticket", "SEO-010"]).status === 0, "obligation: materialize");
  check(run(["verify", "--workspace", ws, "--now", NOW]).json?.notes?.inFlightObligations?.length === 1, "obligation: materialized row is in-flight");
  check(run(["obligation", "resolve", ...id, "--resolved-at", "2026-07-30", "--note", "CTR +0.4pp; keep treatment"]).status === 0, "obligation: resolve");
  const ledger = JSON.parse(readFileSync(path.join(ws, "loops", "measurement-obligations.json"), "utf-8"));
  const row = Object.values(ledger.obligations)[0];
  check(row.state === "resolved" && row.ticket.status === "closed" && row.calibrationNote.includes("keep"), "obligation: resolved record is canonical");
}

// obligation inconclusive return keeps lineage
{
  const ws = temp();
  const id = ["--workspace", ws, "--hypothesis", "Fixture indexation hypothesis", "--cohort", "sha256:cohort-2"];
  run(["obligation", "add", ...id, "--baseline-measured-at", "2026-07-01", "--baseline-value", "not indexed", "--baseline-evidence", "reports/inspection.md", "--metric", "index status", "--decision", "keep or refile", "--due-at", "2026-07-10"]);
  run(["obligation", "claim", ...id, "--fingerprint", "sha256:attempt-1"]);
  run(["obligation", "materialize", ...id, "--ticket", "SEO-020"]);
  const inconclusive = run(["obligation", "inconclusive", ...id, "--attempted-at", "2026-07-10", "--reason", "GSC lag; no data for the window", "--evidence-note", "gsc-fetch output empty", "--wake-at", "2026-07-24"]);
  check(inconclusive.status === 0, "obligation: inconclusive returns to pending");
  const ledger = JSON.parse(readFileSync(path.join(ws, "loops", "measurement-obligations.json"), "utf-8"));
  const row = Object.values(ledger.obligations)[0];
  check(row.state === "pending" && row.candidateFingerprint === null && row.ticket === null && row.attempts.length === 1 && row.wakeAt === "2026-07-24", "obligation: inconclusive return is one canonical replacement");
  run(["obligation", "claim", ...id, "--fingerprint", "sha256:attempt-2"]);
  check(run(["obligation", "materialize", ...id, "--ticket", "SEO-021"]).status === 0, "obligation: lineage rematerializes with a new attempt fingerprint");
}

// obligation crash reconciliation + supersede
{
  const ws = temp(staticFixture("crash-intermediates"));
  const reconcile = run(["obligation", "materialize", "--workspace", ws, "--hypothesis", "Fixture hypothesis lost ticket", "--cohort", "sha256:crash-null-ticket", "--ticket", "SEO-902"]);
  check(reconcile.status === 0 && reconcile.json?.status === "reconciled", "obligation: null-ticket crash intermediate reconciles by repairing the link");
  const supersede = run(["obligation", "supersede", "--workspace", ws, "--hypothesis", "Fixture hypothesis closed ticket", "--cohort", "sha256:crash-closed-ticket", "--successor-hypothesis", "Successor hypothesis", "--successor-cohort", "sha256:successor", "--successor-evidence", "reports/successor.md"]);
  check(supersede.status === 0, "obligation: supersede retains lineage");
  const ledger = JSON.parse(readFileSync(path.join(ws, "loops", "measurement-obligations.json"), "utf-8"));
  const superseded = ledger.obligations["[\"Fixture hypothesis closed ticket\",\"sha256:crash-closed-ticket\"]"];
  check(superseded.state === "superseded" && superseded.successor.hypothesis === "Successor hypothesis", "obligation: superseded record carries its successor");
}

// ship record + dedupe + cap
{
  const ws = temp();
  mkdirSync(path.join(ws, "loops"), { recursive: true });
  writeFileSync(path.join(ws, "loops", "stage.json"), JSON.stringify({ schema: 1, stageStamp: { stage: "early", evaluated: "2026-07-01", basis: "reports/fixture.md" } }, null, 2));
  const record = (id, key, publishedAt, url) => run(["ship", "record", "--workspace", ws, "--event-id", id, "--dedupe-key", key, "--published-at", publishedAt, "--initiated-by", "fixture-run", "--source", "deploy", "--url", url, "--qualification", "qualified", "--evidence", "deploy log", "--ticket", "SEO-030"]);
  check(record("ship-1", "sha256:ship-1", "2026-07-11T12:00:00Z", "https://example.com/a").status === 0, "ship: record");
  check(record("ship-1", "sha256:ship-1", "2026-07-11T12:00:00Z", "https://example.com/a").json?.status === "noop", "ship: dedupeKey retry is a noop");
  check(record("ship-2", "sha256:ship-1", "2026-07-11T12:00:00Z", "https://example.com/b").status === 8, "ship: same dedupeKey under a new eventId is refused");
  check(record("ship-2", "sha256:ship-2", "2026-07-12T09:00:00Z", "https://example.com/b").status === 0, "ship: second event");
  const atCap = run(["cap", "--workspace", ws, "--now", "2026-07-12T12:00:00Z"]);
  check(atCap.status === 7 && atCap.json?.stage === "early" && atCap.json?.cap === 2 && atCap.json?.counted === 2 && atCap.json?.remaining === 0, "cap: early stage exhausts at two ships (exit 7)");
  check(atCap.json?.stageSource?.includes("stage.json"), "cap: stage resolved from the stageStamp");
  const boundary = run(["cap", "--workspace", ws, "--now", "2026-07-18T11:59:59Z"]);
  check(boundary.status === 7 && boundary.json?.counted === 2, "cap: event just under seven days old still counts");
  const rolledOff = run(["cap", "--workspace", ws, "--now", "2026-07-18T12:00:00Z"]);
  check(rolledOff.status === 0 && rolledOff.json?.counted === 1 && rolledOff.json?.remaining === 1, "cap: an event exactly seven days old has rolled out (window is half-open)");
  const override = run(["cap", "--workspace", ws, "--now", "2026-07-12T12:00:00Z", "--stage", "growth"]);
  check(override.status === 0 && override.json?.cap === 4 && override.json?.remaining === 2, "cap: --stage override wins");
  const ships = JSON.parse(readFileSync(path.join(ws, "loops", "ship-events.json"), "utf-8"));
  ships.capExceptions = [{ dated: "2026-07-12", grantedBy: "Jorge", site: "example.com", urls: ["https://example.com/b"], reason: "fixture exception" }];
  writeFileSync(path.join(ws, "loops", "ship-events.json"), `${JSON.stringify(ships, null, 2)}\n`);
  const excepted = run(["cap", "--workspace", ws, "--now", "2026-07-12T12:00:00Z"]);
  check(excepted.status === 0 && excepted.json?.counted === 1 && excepted.json?.excepted === 1 && excepted.json?.remaining === 1, "cap: exception-covered event does not consume cap");
}

// sleep certification: drift, coverage, autopublish, happy path, heartbeat
{
  const ws = temp();
  check(certify(ws).status === 3, "sleep: absent stamp is drift (exit 3)");
  check(run(["stamp", "check", "--workspace", ws, "--installed", VERSION]).status === 3, "stamp: check reports drift on absent stamp");
  check(run(["stamp", "write", "--workspace", ws, "--installed", VERSION, "--now", NOW, "--report", `reports/${NOW}-upgrade-pass-${VERSION}.md`]).status === 0, "stamp: write");
  check(run(["stamp", "check", "--workspace", ws, "--installed", VERSION]).status === 0, "stamp: check is clean after write");
  check(run(["stamp", "check", "--workspace", ws, "--installed", "10.0.0"]).status === 3, "stamp: version mismatch is drift");
  const ok = certify(ws);
  check(ok.status === 0, "sleep: certify succeeds on a clean reconciled workspace");
  const loop = JSON.parse(readFileSync(path.join(ws, "loops", "frontier-sweep.json"), "utf-8"));
  check(loop.sleepCertificate?.dated === NOW && loop.nextWakeAt === "2026-07-25", "sleep: certificate written and earliestNextDue mirrored to nextWakeAt");
  const heartbeatBefore = loop.sleepCertificate.heartbeatAt;
  const heartbeat = run(["sleep", "heartbeat", "--workspace", ws, "--loop", "frontier-sweep.json", "--now", "2026-07-12T18:00:00Z"]);
  const afterLoop = JSON.parse(readFileSync(path.join(ws, "loops", "frontier-sweep.json"), "utf-8"));
  check(heartbeat.status === 0 && afterLoop.sleepCertificate.heartbeatAt === "2026-07-12T18:00:00.000Z" && afterLoop.sleepCertificate.heartbeatAt !== heartbeatBefore && afterLoop.sleepCertificate.dedupeKey === loop.sleepCertificate.dedupeKey, "sleep: heartbeat updates only heartbeatAt");
  check(certify(ws, { earliestNextDue: null, wakeOn: [] }).status === 1, "sleep: certificate without continuity is rejected");
  check(certify(ws, { earliestNextDue: "2026-07-01" }).status === 1, "sleep: already-due earliestNextDue is rejected");
  check(certify(ws, { earliestNextDue: null, wakeOn: [{ predicate: "backlog Ready is empty", source: "backlog.md", owner: "operate loop", fingerprint: "fixture:wake:v1" }] }).status === 0, "sleep: wakeOn-only continuity is accepted");
  const recert = JSON.parse(readFileSync(path.join(ws, "loops", "frontier-sweep.json"), "utf-8"));
  check(recert.nextWakeAt === null, "sleep: wakeOn-only recertification clears the stale nextWakeAt mirror");
  check(readdirSync(path.join(ws, "loops")).every((name) => !name.endsWith(".tmp")), "sleep: atomic writes leave no temp files behind");
}
{
  const ws = temp(staticFixture("annotated-coverage"));
  check(certify(ws, { coverage: "complete" }).status === 5, "sleep: annotated rung refuses coverage=complete (exit 5)");
  check(certify(ws, { coverage: "partial" }).status === 0, "sleep: partial certificate is allowed beside an annotated rung");
}
{
  const armed = temp(staticFixture("autopublish-armed"));
  check(certify(armed).status === 6, "sleep: armed ungated autopublish refuses certification (exit 6)");
  const gated = temp(staticFixture("autopublish-gated"));
  check(certify(gated).status === 0, "sleep: quality-watch covering the publish window permits certification");
  const lateWatch = temp(staticFixture("autopublish-gated"));
  const loopPath = path.join(lateWatch, "loops", "frontier-sweep.json");
  const loop = JSON.parse(readFileSync(loopPath, "utf-8"));
  const watch = Object.values(loop.occurrences)[0];
  delete loop.occurrences[JSON.stringify([watch.cadenceId, watch.dueWindow])];
  Object.assign(watch, { dueWindow: "2026-07-20/2026-07-21", dueAt: "2026-07-20" });
  loop.occurrences[JSON.stringify([watch.cadenceId, watch.dueWindow])] = watch;
  writeFileSync(loopPath, `${JSON.stringify(loop, null, 2)}\n`);
  check(certify(lateWatch).status === 6, "sleep: a watch window entirely after the publish date does not cover it (exit 6)");
}
{
  const ws = temp(staticFixture("annotated-coverage"));
  const ledgerPath = path.join(ws, "loops", "coverage-ledger.json");
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf-8"));
  ledger.rungs.B.staleAsOf = "2026-08-01";
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  const future = run(["verify", "--workspace", ws, "--now", NOW]);
  check(future.status === 0 && future.json?.notes?.annotatedRungs?.length === 0, "coverage: a future staleAsOf annotation is not yet active");
  check(certify(ws, { coverage: "complete" }).status === 0, "sleep: a future staleAsOf annotation does not refuse coverage=complete");
}
{
  const ws = temp();
  mkdirSync(path.join(ws, "loops"), { recursive: true });
  writeFileSync(path.join(ws, "loops", "stage.json"), JSON.stringify({ schema: 1, stageStamp: { stage: "mature", evaluated: "zzzz" } }, null, 2));
  check(run(["verify", "--workspace", ws, "--now", NOW]).status === 2, "stage: a malformed stageStamp fails verification closed");
  writeFileSync(path.join(ws, "loops", "stage.json"), JSON.stringify({ schema: 1 }, null, 2));
  writeFileSync(path.join(ws, "loops", "ship-events.json"), JSON.stringify({ schema: 1, events: [], capExceptions: [{ urls: ["https://example.com/a"] }] }, null, 2));
  check(run(["verify", "--workspace", ws, "--now", NOW]).status === 2, "cap: an undated approver-less capExceptions grant fails verification closed");
  check(run(["stamp", "report-path", "--workspace", ws, "--installed", "../../evil", "--now", NOW]).status === 1, "stamp: a path-traversal version is rejected");
  const badTs = run(["ship", "record", "--workspace", ws, "--event-id", "e1", "--dedupe-key", "k1", "--published-at", "2026-02-30T12:00:00Z", "--initiated-by", "fixture", "--source", "deploy", "--url", "https://example.com/a", "--qualification", "qualified", "--evidence", "log"]);
  check(badTs.status !== 0, "ship: an impossible calendar timestamp is rejected");
  writeFileSync(path.join(ws, "reconciliation.json"), JSON.stringify({ schema: 1, reconciledSkillVersion: VERSION, reconciledAt: "2026-02-31", report: null }, null, 2));
  const badStamp = run(["stamp", "check", "--workspace", ws, "--installed", VERSION]);
  check(badStamp.status === 3 && badStamp.json?.stampState === "malformed", "stamp: an impossible reconciledAt date is malformed, therefore drift");
}
{
  const ws = temp();
  mkdirSync(path.join(ws, "loops"), { recursive: true });
  writeFileSync(path.join(ws, "loops", "broken.json"), "{not json");
  check(certify(ws).status === 2, "sleep: malformed loop state fails closed (exit 2)");
  check(run(["verify", "--workspace", ws, "--now", NOW]).status === 2, "verify: malformed loop state fails closed (exit 2)");
}

// stamp report-path collision handling + SKILL.md frontmatter resolution
{
  const ws = temp();
  mkdirSync(path.join(ws, "reports"), { recursive: true });
  const first = run(["stamp", "report-path", "--workspace", ws, "--installed", VERSION, "--now", NOW]);
  check(first.json?.path === `reports/${NOW}-upgrade-pass-${VERSION}.md`, "stamp: report-path names the dated report");
  writeFileSync(path.join(ws, first.json.path), "occupied");
  const second = run(["stamp", "report-path", "--workspace", ws, "--installed", VERSION, "--now", NOW]);
  check(second.json?.path === `reports/${NOW}-upgrade-pass-${VERSION}-2.md`, "stamp: report-path appends the first free numeric suffix");
  const frontmatter = /^version:\s*(\S+)\s*$/m.exec(readFileSync(path.join(skillRoot, "SKILL.md"), "utf-8"))[1];
  const resolved = run(["stamp", "check", "--workspace", ws]);
  check(resolved.json?.installed === frontmatter, "stamp: installed version resolves from SKILL.md frontmatter");
}

// ---------- summary ----------

for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} of ${passed + failures.length} checks failed`);
  for (const label of failures) console.error(`  ✗ ${label}`);
  process.exit(1);
}
console.log(`ok: ${passed} checks passed`);
