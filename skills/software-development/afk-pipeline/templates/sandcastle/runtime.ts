import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { vercelSandbox } from "./vercel/provider";

/**
 * Lane switch. The workflow sets SANDCASTLE_SANDBOX per trigger label:
 * - `none`   (`agent:implement` → GitHub-hosted VM, noSandbox — the VM is the
 *   sandbox; ADR 0002)
 * - `docker` (`agent:implement-local` → self-hosted Mac mini runner, agent
 *   isolated in Docker; ADR 0003)
 * - `vercel` (`agent:implement-sandbox` → GitHub-hosted driver, agent isolated
 *   in a Vercel Firecracker microVM via sandcastle's isolated-provider
 *   machinery; ADR 0004). Workspace syncs in/out via git bundle + format-patch
 *   (sandcastle-owned), so push/salvage/artifacts stay host-side like docker.
 */
const LANE = process.env.SANDCASTLE_SANDBOX ?? "none";
const useDocker = LANE === "docker";
const useVercel = LANE === "vercel";
const ENGINE =
  process.env.ENGINE === "codex"
    ? "codex"
    : process.env.ENGINE === "cursor"
      ? "cursor"
      : "claude";
const CODEX_HOST_HOME = "~/.codex-afk";
const CODEX_SANDBOX_HOME = "/home/agent/.codex";
const CODEX_CLOUD_HOME = `${process.env.RUNNER_TEMP ?? "/tmp"}/codex-home`;
const CURSOR_MODEL = process.env.CURSOR_MODEL || "grok-4.5-xhigh";
const CURSOR_LANE_ERROR =
  "engine: cursor is cloud-lane only (v1) — local Docker images and the microVM bootstrap lack the Cursor CLI";

if (ENGINE === "cursor" && (useDocker || useVercel)) {
  throw new Error(CURSOR_LANE_ERROR);
}

/**
 * Secrets the workflow injects for phases that exercise real integrations.
 * A workflow-step env line alone never reaches the agent or the app server it
 * starts: the docker lane needs them on the CONTAINER env, the vercel lane on
 * the MICROVM env, the cloud lane on the agent-provider env. Keys absent from
 * the step's process env are skipped, so exposure is limited to the steps
 * whose workflow env declares them.
 *
 * {{PASSTHROUGH_DOC}}
 */
const PASSTHROUGH_KEYS = {{PASSTHROUGH_KEYS}};

function passthroughEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of PASSTHROUGH_KEYS) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

/**
 * In docker/vercel mode provider auth must ride on the SANDBOX env, not the
 * agent-provider env — the agent reads it inside the sandbox, and sandcastle
 * rejects the same key appearing in both env maps.
 */
export function agentEnv(token?: string): Record<string, string> {
  if (useDocker || useVercel) return {};
  if (ENGINE === "codex") return { CODEX_HOME: CODEX_CLOUD_HOME, ...passthroughEnv() };
  if (!token) throw new Error("CLAUDE_CODE_OAUTH_TOKEN is required for Claude-backed phases");
  return { CLAUDE_CODE_OAUTH_TOKEN: token, ...passthroughEnv() };
}

function cursorAgentEnv(): Record<string, string> {
  if (useDocker || useVercel) throw new Error(CURSOR_LANE_ERROR);
  const cursorApiKey = process.env.CURSOR_API_KEY;
  if (!cursorApiKey) throw new Error("CURSOR_API_KEY is required when ENGINE=cursor");
  return { CURSOR_API_KEY: cursorApiKey, ...passthroughEnv() };
}

function sandboxEnv(token?: string): Record<string, string> {
  const env: Record<string, string> = { ...passthroughEnv() };
  if (useVercel) delete env.CODEX_AUTH_B64;
  if (ENGINE === "codex") {
    env.CODEX_HOME = CODEX_SANDBOX_HOME;
  } else {
    if (!token) throw new Error("CLAUDE_CODE_OAUTH_TOKEN is required for Claude-backed phases");
    env.CLAUDE_CODE_OAUTH_TOKEN = token;
  }
  if (process.env.GH_TOKEN) env.GH_TOKEN = process.env.GH_TOKEN;
  return env;
}

function claudeAgent(token?: string, claudeOptions: { effort?: "medium" | "high" } = { effort: "high" }) {
  return sandcastle.claudeCode("claude-opus-4-8", {
    ...claudeOptions,
    env: agentEnv(token),
  });
}

export function chooseAgent(token?: string, claudeOptions: { effort?: "medium" | "high" } = { effort: "high" }) {
  if (ENGINE === "codex") {
    return sandcastle.codex("gpt-5.6-luna", {
      effort: "high",
      env: agentEnv(token),
      sessionStorage: {
        hostSessionsDir: `${CODEX_HOST_HOME}/sessions`,
        sandboxSessionsDir: `${CODEX_SANDBOX_HOME}/sessions`,
      },
    });
  }
  return claudeAgent(token, claudeOptions);
}

export function chooseImplementAgent(token?: string, claudeOptions: { effort?: "medium" | "high" } = { effort: "high" }) {
  if (ENGINE === "cursor") {
    return sandcastle.cursor(CURSOR_MODEL, {
      env: cursorAgentEnv(),
    });
  }
  return chooseAgent(token, claudeOptions);
}

export function chooseSandbox(token?: string) {
  if (useVercel) return vercelSandbox({ env: { CI: "true", ...sandboxEnv(token) } });
  if (!useDocker) return noSandbox();
  const options = {
    imageName: "{{IMAGE_NAME}}",
    // Image agent user is UID/GID 1000; the macOS host user is not. Docker
    // Desktop's VM handles bind-mount ownership, so pin the container user.
    containerUid: 1000,
    containerGid: 1000,
    // Cap each phase container's CPUs so concurrent local-lane runs can't
    // starve the runner host (v2.7.0 — the mini crawled under 3-4 parallel
    // jobs). RAM stays the harder ceiling: the cap curbs thrash, it doesn't
    // make 4 simultaneous Next builds fit in 16 GB — route overflow to the
    // cloud/sandbox lanes instead. Per-repo: dockerCpus in pipeline.json.
    cpus: {{DOCKER_CPUS}},
    env: sandboxEnv(token),
  };
  return ENGINE === "codex"
    ? docker({ ...options, mounts: [{ hostPath: CODEX_HOST_HOME, sandboxPath: CODEX_SANDBOX_HOME }] })
    : docker(options);
}

/**
 * Sandbox-side setup before the agent starts.
 * - docker: fresh bind-mounted worktrees have no node_modules.
 * - vercel: stock node22 microVM — install the toolchain (bun, agent CLIs,
 *   agent-browser + Chromium deps; symlinked into /usr/local/bin so every
 *   later `sh -c` exec finds them), then install deps. Runs once per phase
 *   sandbox (~60-90s); snapshot/image reuse is a later optimization.
 */
export function sandboxHooks() {
  if (useVercel) {
    // ONE chained command: sandbox-side hooks execute concurrently, so split
    // steps race each other (bun install hit exit 127 before bun existed).
    const bootstrap = [
      'curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1 && sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun && sudo ln -sf "$HOME/.bun/bin/bunx" /usr/local/bin/bunx',
      'npm i -g @anthropic-ai/claude-code @openai/codex --silent && bun add -g agent-browser@{{AGENT_BROWSER_VERSION}} --silent && sudo ln -sf "$(command -v claude)" /usr/local/bin/claude && sudo ln -sf "$(command -v codex)" /usr/local/bin/codex && sudo ln -sf "$HOME/.bun/bin/agent-browser" /usr/local/bin/agent-browser',
      "sudo dnf install -y -q nss nspr atk at-spi2-atk cups-libs libdrm libXcomposite libXdamage libXrandr mesa-libgbm alsa-lib pango cairo at-spi2-core libXcursor libXext libXi libXtst libxkbcommon >/dev/null 2>&1",
      "agent-browser install >/dev/null 2>&1",
      "bun install --frozen-lockfile",
    ].join(" && ");
    return {
      sandbox: {
        onSandboxReady: [{ command: bootstrap, timeoutMs: 900_000 }],
      },
    };
  }
  return useDocker
    ? {
        sandbox: {
          onSandboxReady: [{ command: "bun install", timeoutMs: 300_000 }],
        },
      }
    : undefined;
}
