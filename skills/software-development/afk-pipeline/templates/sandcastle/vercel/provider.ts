/**
 * Vercel Sandbox provider for the sandbox lane (`agent:implement-sandbox`) —
 * built on sandcastle's OWN isolated-provider machinery (v2.6.0, ADR 0004).
 *
 * Sandcastle ships a native `sandboxes/vercel` provider, and this file stays
 * as close to it as possible: `createIsolatedSandboxProvider` + the SDK. We
 * supply our own create/handle because the stock one (as of 0.12.0) has three
 * gaps that bit our validating runs or would:
 *
 * 1. `exec` ignores `stdin` — agent providers deliver the PROMPT via stdin,
 *    so the stock provider runs every agent with an empty prompt. We redirect
 *    stdin from a file written into the sandbox.
 * 2. No transport hardening — Bun's fetch on GH runners threw
 *    BrotliDecompressionError mid-command and killed a passing verify
 *    (superaseo #88 run 28875762914). We force identity encoding and run
 *    commands detached with restartable log streaming + retryable wait(), so
 *    a dropped stream re-awaits server-side state instead of crashing.
 * 3. No `persistent: false` — v2 sandboxes snapshot on stop by default,
 *    billing 30 days of storage per run for nothing.
 *
 * Sandcastle's run loop owns everything else: workspace sync-in via git
 * bundle, agent execution, sync-out via format-patch back onto the HOST
 * checkout — so push, salvage, artifacts, and step outputs all stay on the
 * runner, exactly like the docker lane. Upstreaming these fixes is tracked;
 * when they land this file collapses back to the stock provider.
 */
import { execSync } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createIsolatedSandboxProvider,
  type ExecResult,
  type IsolatedSandboxHandle,
  type IsolatedSandboxProvider,
} from "@ai-hero/sandcastle";

const WORKTREE_PATH = "/vercel/sandbox/workspace";
const TEAM_ID = "{{SANDBOX_TEAM_ID}}";
const PROJECT_ID = "{{SANDBOX_PROJECT_ID}}";
const VCPUS = Number("{{SANDBOX_VCPUS}}") || 4;
const MAX_TAIL_CHARS = 64 * 1024;
const CODEX_SANDBOX_HOME = "/home/agent/.codex";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let a = 1; a <= attempts; a++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (a === attempts) break;
      console.error(`[vercel-provider] ${label} failed (attempt ${a}/${attempts}): ${e instanceof Error ? e.message : e} — retrying`);
      await sleep(2000 * a);
    }
  }
  throw lastErr;
}

/** Bun's brotli decode of compressed API responses is the crash we saw live — force identity. */
const safeFetch: typeof globalThis.fetch = (input, init) => {
  const headers = new Headers((init as RequestInit | undefined)?.headers);
  headers.set("accept-encoding", "identity");
  return fetch(input, { ...(init as RequestInit), headers });
};

/** Minimal bounded tail (sandcastle's BoundedTail isn't exported). */
class Tail {
  private chunks: string[] = [];
  private size = 0;
  constructor(private sep: string) {}
  push(s: string) {
    this.chunks.push(s);
    this.size += s.length + this.sep.length;
    while (this.size > MAX_TAIL_CHARS && this.chunks.length > 1) {
      const dropped = this.chunks.shift()!;
      this.size -= dropped.length + this.sep.length;
    }
  }
  toString() {
    return this.chunks.join(this.sep);
  }
}

export const vercelSandbox = (options: { env?: Record<string, string> } = {}): IsolatedSandboxProvider =>
  createIsolatedSandboxProvider({
    name: "vercel",
    env: options.env,
    create: async (createOptions): Promise<IsolatedSandboxHandle> => {
      const { Sandbox } = await import("@vercel/sandbox");
      const token = process.env.VERCEL_SANDBOX_TOKEN;
      if (!token) throw new Error("VERCEL_SANDBOX_TOKEN is not set — the sandbox lane needs the team-scoped token as a repo secret.");
      if (!TEAM_ID || !PROJECT_ID) throw new Error("sandbox.teamId / sandbox.projectId missing from .sandcastle/config/pipeline.json — sandbox lane not provisioned (see reference/installation.md).");

      const timeoutMinutes = Number(process.env.VERCEL_SANDBOX_TIMEOUT_MINUTES ?? "115");
      const name = `afk-i${process.env.ISSUE_NUMBER ?? "0"}-r${process.env.GITHUB_RUN_ID ?? process.pid}-${Math.random().toString(36).slice(2, 6)}`;
      const sandbox = await withRetry(
        () =>
          Sandbox.create({
            token,
            teamId: TEAM_ID,
            projectId: PROJECT_ID,
            fetch: safeFetch,
            name,
            runtime: "node22",
            timeout: timeoutMinutes * 60_000,
            resources: { vcpus: VCPUS },
            // Per-phase throwaway: default persistence would snapshot every
            // stopped sandbox for 30 days of billed storage, for no benefit.
            persistent: false,
            tags: { purpose: "afk-pipeline", issue: process.env.ISSUE_NUMBER ?? "unknown" },
            env: createOptions.env,
          }),
        "Sandbox.create"
      );
      console.log(`[vercel-provider] sandbox "${name}" up (${VCPUS} vCPU, ${timeoutMinutes}m timeout)`);
      await withRetry(() => sandbox.mkDir(WORKTREE_PATH), "mkDir worktree");

      const codexAuthB64 = process.env.ENGINE === "codex" ? process.env.CODEX_AUTH_B64 : undefined;
      if (codexAuthB64) {
        const seedAuth = await withRetry(
          () =>
            sandbox.runCommand({
              cmd: "bash",
              args: [
                "-lc",
                'mkdir -p "$CODEX_HOME" && printf "%s" "$CODEX_AUTH_B64" | base64 -d > "$CODEX_HOME/auth.json" && chmod 600 "$CODEX_HOME/auth.json"',
              ],
              env: { CODEX_AUTH_B64: codexAuthB64, CODEX_HOME: CODEX_SANDBOX_HOME },
            }),
          "seed Codex auth"
        );
        if (seedAuth.exitCode !== 0) {
          // stderr is an async method in @vercel/sandbox 2.x; tolerate both shapes.
          const seedErr =
            typeof (seedAuth as any).stderr === "function"
              ? await (seedAuth as any).stderr().catch(() => "")
              : String((seedAuth as any).stderr ?? "");
          throw new Error(
            `Codex auth seed failed inside Vercel sandbox (exit ${seedAuth.exitCode}). stderr: ${seedErr || "(empty)"}`
          );
        }
      }

      let stdinSeq = 0;

      // NO retry on the launch: a response-side fault after the server started
      // the command would relaunch it — two concurrent agents in one worktree.
      // Only idempotent calls (wait/logs/reads/writes) are retried.
      const runDetached = async (fullCommand: string, opts?: { cwd?: string; sudo?: boolean }) =>
        sandbox.runCommand({
          cmd: "sh",
          args: ["-c", fullCommand],
          cwd: opts?.cwd ?? WORKTREE_PATH,
          detached: true,
          ...(opts?.sudo ? { sudo: true } : {}),
        });

      const handle: IsolatedSandboxHandle = {
        worktreePath: WORKTREE_PATH,

        exec: async (
          command: string,
          opts?: { onLine?: (line: string) => void; cwd?: string; sudo?: boolean; stdin?: string }
        ): Promise<ExecResult> => {
          // stdin contract: agent providers ship the prompt this way (avoids
          // the 128KB argv limit). Write it into the sandbox and redirect.
          let fullCommand = command;
          let stdinPath: string | null = null;
          if (opts?.stdin !== undefined) {
            stdinPath = `/tmp/sc-stdin-${process.pid}-${++stdinSeq}`;
            await withRetry(
              () => sandbox.writeFiles([{ path: stdinPath!, content: Buffer.from(opts.stdin!, "utf8") }]),
              "write stdin"
            );
            fullCommand = `exec < ${JSON.stringify(stdinPath)}; ${command}`;
          }

          const cmd = await runDetached(fullCommand, opts);

          let result: ExecResult;
          if (!opts?.onLine) {
            // No streaming consumer → return FULL output, unbounded. sandcastle
            // parses these (syncIn `mktemp`/`rev-parse`, syncOut `git diff HEAD`
            // → applied as a patch) — a bounded/line-normalized tail here
            // silently truncates large diffs. Matches stock provider semantics.
            const finished = await withRetry(() => cmd.wait(), "command wait", 6);
            const stdout = await withRetry(() => finished.stdout(), "read stdout");
            const stderr = await withRetry(() => finished.stderr(), "read stderr");
            result = { stdout, stderr, exitCode: finished.exitCode ?? 1 };
          } else {
            const onLine = opts.onLine;
            let stdoutTail = new Tail("\n");
            let stderrTail = new Tail("");
            let partial = "";
            const consume = (streamName: string, data: string) => {
              if (streamName === "stdout") {
                const text = partial + data;
                const lines = text.split("\n");
                partial = lines.pop() ?? "";
                for (const line of lines) {
                  stdoutTail.push(line);
                  onLine(line);
                }
              } else {
                stderrTail.push(data);
              }
            };
            // Live streaming, restartable. logs() REPLAYS from the beginning on
            // re-open, so a restart resets consumer state and reconsumes — the
            // final tails stay correct; onLine sees some lines twice (display +
            // idle-timeout feed, harmless). Never allowed to kill the run.
            const stream = (attempt: number): Promise<void> =>
              (async () => {
                for await (const log of cmd.logs()) consume(log.stream, log.data.toString());
              })().catch(async (e: unknown) => {
                if (attempt >= 3) {
                  console.error(`[vercel-provider] log stream lost (${e instanceof Error ? e.message : e}) — command continues`);
                  return;
                }
                await sleep(1500 * attempt);
                stdoutTail = new Tail("\n");
                stderrTail = new Tail("");
                partial = "";
                return stream(attempt + 1);
              });
            const logsDone = stream(1);

            const finished = await withRetry(() => cmd.wait(), "command wait", 6);
            // Drain the stream fully before returning — racing with a short
            // timer returned truncated output for large late bursts. The
            // stream self-terminates (iterator ends on command exit; retry
            // chain gives up at 3); the cap only guards a hung iterator.
            await Promise.race([logsDone, sleep(60_000)]);
            if (partial) {
              stdoutTail.push(partial);
              onLine(partial);
              partial = "";
            }
            result = { stdout: stdoutTail.toString(), stderr: stderrTail.toString(), exitCode: finished.exitCode ?? 1 };
          }
          if (stdinPath) {
            await sandbox.runCommand({ cmd: "rm", args: ["-f", stdinPath], detached: true }).catch(() => {});
          }
          return result;
        },

        copyIn: async (hostPath: string, sandboxPath: string): Promise<void> => {
          const { stat } = await import("node:fs/promises");
          const info = await stat(hostPath);
          if (info.isDirectory()) {
            const tarPath = join(tmpdir(), `sandcastle-copyin-${process.pid}-${Date.now()}.tar.gz`);
            execSync(`tar -czf "${tarPath}" -C "${hostPath}" .`);
            try {
              const tarContent = await readFile(tarPath);
              const sandboxTarPath = `/tmp/sandcastle-copyin-${Date.now()}.tar.gz`;
              await withRetry(() => sandbox.writeFiles([{ path: sandboxTarPath, content: tarContent }]), "copyIn write");
              const res = await withRetry(
                () =>
                  sandbox.runCommand({
                    cmd: "sh",
                    args: ["-c", `mkdir -p "${sandboxPath}" && tar -xzf "${sandboxTarPath}" -C "${sandboxPath}" && rm -f "${sandboxTarPath}"`],
                  }),
                "copyIn extract"
              );
              if (res.exitCode !== 0) throw new Error(`copyIn extract failed (exit ${res.exitCode})`);
            } finally {
              await unlink(tarPath).catch(() => {});
            }
          } else {
            const content = await readFile(hostPath);
            await withRetry(() => sandbox.writeFiles([{ path: sandboxPath, content }]), "copyIn file");
          }
        },

        copyFileOut: async (sandboxPath: string, hostPath: string): Promise<void> => {
          const buffer = await withRetry(() => sandbox.readFileToBuffer({ path: sandboxPath }), `copyFileOut ${sandboxPath}`);
          if (!buffer) throw new Error(`File not found in Vercel sandbox: ${sandboxPath}`);
          await mkdir(dirname(hostPath), { recursive: true });
          await writeFile(hostPath, buffer);
        },

        close: async (): Promise<void> => {
          let recordingError: unknown;
          if (process.env.RECORDING_MODE === "on") {
            const issue = process.env.ISSUE_NUMBER ?? "unknown";
            const sandboxPath = `${WORKTREE_PATH}/.sandcastle/.sandcastle-artifacts/issue-${issue}/interaction.webm`;
            const hostPath = join(process.env.OUTPUT_DIR ?? tmpdir(), "recording", `issue-${issue}.webm`);
            try {
              const buffer = await withRetry(
                () => sandbox.readFileToBuffer({ path: sandboxPath }),
                `export recorded verification ${sandboxPath}`
              );
              if (!buffer?.length) throw new Error(`recording is missing or empty: ${sandboxPath}`);
              await mkdir(dirname(hostPath), { recursive: true });
              await writeFile(hostPath, buffer);
              console.log(`[vercel-provider] exported recorded verification to ${hostPath}`);
            } catch (error) {
              recordingError = error;
            }
          }
          // persistent:false → stop leaves no snapshot; delete drops the record.
          await sandbox.stop().catch((e: unknown) => console.error(`[vercel-provider] stop failed: ${e instanceof Error ? e.message : e}`));
          await sandbox.delete().catch(() => {});
          if (recordingError) throw recordingError;
        },
      };

      return handle;
    },
  });
