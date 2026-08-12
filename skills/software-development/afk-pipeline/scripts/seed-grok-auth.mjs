#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const args = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!flag?.startsWith("--") || !value) {
    console.error("GROK_SEED: expected --repo <owner/repo> [--auth <path>] [--canonical <path>]");
    process.exit(1);
  }
  args[flag.slice(2)] = value;
}

const repo = args.repo;
const configuredHome = resolve(process.env.GROK_HOME ?? `${process.env.HOME}/.grok`);
const source = resolve(args.auth ?? join(configuredHome, "auth.json"));
const canonical = args.canonical ? resolve(args.canonical) : undefined;
const grok = process.env.GROK_BIN ?? "grok";
const { XAI_API_KEY: ignoredApiKey, ...probeEnvironment } = process.env;

const stop = (message) => {
  console.error(`GROK_SEED: ${message}`);
  process.exitCode = 1;
};

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, { encoding: "utf8", ...options });
  if (result.error) throw new Error(`${command} could not start: ${result.error.message}`);
  return result;
};

const atomicWrite = async (destination, bytes) => {
  await mkdir(dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}`;
  await writeFile(temporary, bytes, { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, destination);
};

if (!repo) {
  stop("missing --repo <owner/repo>");
} else {
  let temporaryHome;
  try {
    const original = await readFile(source);
    temporaryHome = await mkdtemp(join(tmpdir(), "grok-seed-"));
    const temporaryAuth = join(temporaryHome, "auth.json");
    await writeFile(temporaryAuth, original, { mode: 0o600 });

    let response;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const probe = run(
        grok,
        ["-p", "Reply only OK", "-m", "grok-4.6", "--effort", "low", "--output-format", "json"],
        {
          env: { ...probeEnvironment, GROK_HOME: temporaryHome },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      try {
        response = JSON.parse(probe.stdout);
      } catch {
        response = undefined;
      }
      const finished = response?.stopReason === "end_turn" || response?.stopReason === "EndTurn";
      if (probe.status === 0 && finished && response.text?.trim() === "OK") break;
      const permissionDenied = `${probe.stdout}\n${probe.stderr}`.includes("403");
      response = undefined;
      if (!permissionDenied || attempt === 3) {
        throw new Error(permissionDenied
          ? "real-chat probe was rejected with 403 three times; preserved existing source and repo secret"
          : `real-chat probe failed with exit ${probe.status}; preserved existing source and repo secret`);
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 5000));
    }

    const refreshed = await readFile(temporaryAuth);
    await atomicWrite(source, refreshed);
    if (canonical) await atomicWrite(canonical, refreshed);

    const seeded = run("gh", ["secret", "set", "GROK_AUTH_B64", "-R", repo], {
      input: refreshed.toString("base64"),
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (seeded.status !== 0) throw new Error("gh secret set failed; auth copies are current but the existing repo secret was preserved");

    const listed = run(
      "gh",
      ["secret", "list", "-R", repo, "--json", "name,updatedAt", "--jq", '.[] | select(.name == "GROK_AUTH_B64") | .updatedAt'],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    if (listed.status !== 0 || !listed.stdout.trim()) throw new Error("repo secret was set but updatedAt could not be confirmed");

    const fingerprint = createHash("sha256").update(refreshed).digest("hex").slice(0, 12);
    console.log(`GROK_SEED: probe=OK repo=${repo} updatedAt=${listed.stdout.trim()} sha256=${fingerprint}`);
  } catch (error) {
    stop(error.message);
  } finally {
    if (temporaryHome) await rm(temporaryHome, { recursive: true, force: true });
  }
}
