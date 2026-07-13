#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

const usage = () => `Usage:
  node site-lease.mjs status --workspace <path-to-.seo>
  node site-lease.mjs acquire --workspace <path-to-.seo> --owner <owner> --run-id <id> --ttl-minutes <n>
  node site-lease.mjs renew --workspace <path-to-.seo> --owner <owner> --run-id <id> --ttl-minutes <n>
  node site-lease.mjs release --workspace <path-to-.seo> --owner <owner> --run-id <id>

Coordinates the schema-1 per-site writer lease. The helper never creates cadence,
coverage, obligation, ship-event, or certificate claims.`;

const valueFor = (name) => {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (value === null || value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
};

const requiredIdentity = () => {
  const owner = valueFor("--owner").trim();
  const runId = valueFor("--run-id").trim();
  if (!owner || !runId) throw new Error("--owner and --run-id must be non-empty");
  return { owner, runId };
};

const ttlMinutes = () => {
  const value = Number(valueFor("--ttl-minutes"));
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("--ttl-minutes must be a positive integer");
  return value;
};

const writeJson = async (file, value, flags = "w") => {
  const handle = await open(file, flags, 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
  } finally {
    await handle.close();
  }
};

const readClaim = async (file) => {
  const fileStat = await lstat(file).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!fileStat) return null;
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) throw new Error("lease path must be a real file");
  let payload;
  try {
    payload = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`lease is unreadable: ${error.message}`);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("lease must be a JSON object");
  }
  const strings = ["owner", "runId", "acquiredAt", "renewedAt", "expiresAt"];
  if (payload.schema !== 1 || strings.some((field) => typeof payload[field] !== "string" || !payload[field])) {
    throw new Error("lease must contain schema 1 and non-empty owner, runId, acquiredAt, renewedAt, expiresAt");
  }
  const acquired = Date.parse(payload.acquiredAt);
  const renewed = Date.parse(payload.renewedAt);
  const expires = Date.parse(payload.expiresAt);
  const utcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
  if (
    !utcPattern.test(payload.acquiredAt) ||
    !utcPattern.test(payload.renewedAt) ||
    !utcPattern.test(payload.expiresAt) ||
    [acquired, renewed, expires].some(Number.isNaN) ||
    acquired > renewed ||
    renewed >= expires
  ) {
    throw new Error("lease timestamps must be RFC 3339 with acquiredAt <= renewedAt < expiresAt");
  }
  return { ...payload, acquired, renewed, expires };
};

const inspectWorkspace = async (workspace, { createLoops = false } = {}) => {
  const workspaceStat = await stat(workspace).catch((error) => {
    throw new Error(error.code === "ENOENT" ? "workspace does not exist" : `cannot inspect workspace: ${error.message}`);
  });
  if (!workspaceStat.isDirectory()) throw new Error("workspace must be a directory");
  const loops = path.join(workspace, "loops");
  if (createLoops) await mkdir(loops, { recursive: true });
  const loopsStat = await lstat(loops).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (loopsStat && (!loopsStat.isDirectory() || loopsStat.isSymbolicLink())) {
    throw new Error("workspace loops path must be a real directory");
  }
  return {
    loops,
    lease: path.join(loops, "site-lease.json"),
    transitionLock: path.join(loops, "site-lease.recovery.lock"),
    initialized: Boolean(loopsStat),
  };
};

const status = async (workspace) => {
  const { lease, initialized } = await inspectWorkspace(workspace);
  if (!initialized) return { status: "free", initialized: false };
  try {
    const claim = await readClaim(lease);
    if (!claim) return { status: "free", initialized: true };
    const { acquired, renewed, expires, ...publicClaim } = claim;
    return {
      status: expires <= Date.now() ? "expired_claim" : "live",
      initialized: true,
      lease: publicClaim,
    };
  } catch (error) {
    return { status: "malformed", initialized: true, reason: error.message };
  }
};

const acquire = async (workspace) => {
  const identity = requiredIdentity();
  const ttl = ttlMinutes();
  const { lease } = await inspectWorkspace(workspace, { createLoops: true });
  const now = new Date();
  const claim = {
    schema: 1,
    ...identity,
    acquiredAt: now.toISOString(),
    renewedAt: now.toISOString(),
    expiresAt: new Date(now.valueOf() + ttl * 60_000).toISOString(),
  };
  try {
    await writeJson(lease, claim, "wx");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    return { status: "blocked", current: await status(workspace) };
  }
  return { status: "acquired", lease: claim };
};

const assertOwner = (claim, identity) => {
  if (!claim || claim.owner !== identity.owner || claim.runId !== identity.runId) {
    throw new Error("lease owner/runId mismatch; refusing mutation");
  }
};

const withTransitionLock = async (workspace, identity, operation) => {
  const paths = await inspectWorkspace(workspace);
  const acquiredAt = new Date().toISOString();
  try {
    await writeJson(paths.transitionLock, { schema: 1, ...identity, acquiredAt }, "wx");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    return { status: "blocked", reason: "lease transition/recovery lock exists", current: await status(workspace) };
  }
  try {
    return await operation(paths);
  } finally {
    await unlink(paths.transitionLock);
  }
};

const renew = async (workspace) => {
  const identity = requiredIdentity();
  const ttl = ttlMinutes();
  return withTransitionLock(workspace, identity, async ({ loops, lease }) => {
    const current = await readClaim(lease);
    assertOwner(current, identity);
    if (current.expires <= Date.now()) return { status: "blocked", current: await status(workspace) };
    const now = new Date();
    if (now.valueOf() < current.renewed) {
      return { status: "blocked", reason: "clock precedes the current renewal; refusing replacement" };
    }
    const next = {
      schema: 1,
      ...identity,
      acquiredAt: current.acquiredAt,
      renewedAt: now.toISOString(),
      expiresAt: new Date(now.valueOf() + ttl * 60_000).toISOString(),
    };
    const temporary = path.join(loops, `.site-lease.${randomUUID()}.tmp`);
    try {
      await writeJson(temporary, next, "wx");
      await readClaim(temporary);
      const latest = await readClaim(lease);
      assertOwner(latest, identity);
      if (latest.renewedAt !== current.renewedAt) throw new Error("lease changed during renewal; refusing replacement");
      await rename(temporary, lease);
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    }
    return { status: "renewed", lease: next };
  });
};

const release = async (workspace) => {
  const identity = requiredIdentity();
  return withTransitionLock(workspace, identity, async ({ lease }) => {
    const current = await readClaim(lease);
    assertOwner(current, identity);
    await unlink(lease);
    return { status: "released" };
  });
};

const main = async () => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const command = process.argv[2];
  if (!new Set(["status", "acquire", "renew", "release"]).has(command)) throw new Error(usage());
  const workspace = path.resolve(valueFor("--workspace"));
  const result =
    command === "status"
      ? await status(workspace)
      : command === "acquire"
        ? await acquire(workspace)
        : command === "renew"
          ? await renew(workspace)
          : await release(workspace);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "blocked" || result.status === "malformed" || result.status === "expired_claim") process.exitCode = 2;
};

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ status: "error", reason: error.message }, null, 2)}\n`);
  process.exitCode = 1;
});
