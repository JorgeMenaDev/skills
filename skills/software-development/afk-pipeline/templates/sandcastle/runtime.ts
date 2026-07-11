import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { vercelSandbox } from "./vercel/provider";

/**
 * Lane switch. The workflow sets SANDCASTLE_SANDBOX per trigger label:
 * - `docker-cloud` (`agent:implement` → GitHub/Blacksmith-hosted VM, agent
 *   isolated in a per-phase Docker container; ADR 0002 hardening)
 * - `docker` (`agent:implement-local` → self-hosted Mac mini runner, agent
 *   isolated in Docker; ADR 0003)
 * - `vercel` (`agent:implement-sandbox` → GitHub-hosted driver, agent isolated
 *   in a Vercel Firecracker microVM via sandcastle's isolated-provider
 *   machinery; ADR 0004). Workspace syncs in/out via git bundle + format-patch
 *   (sandcastle-owned), so push/salvage/artifacts stay host-side like docker.
 */
const LANE = process.env.SANDCASTLE_SANDBOX ?? "none";
const useHostedDocker = LANE === "docker-cloud";
const useDocker = LANE === "docker" || useHostedDocker;
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
const CODEX_DOCKER_HOST_HOME = useHostedDocker ? CODEX_CLOUD_HOME : CODEX_HOST_HOME;
const CURSOR_MODEL = process.env.CURSOR_MODEL || "grok-4.5-xhigh";
const CURSOR_LANE_ERROR =
  "engine: cursor is cloud-lane only (v1) — use agent:implement; local Docker and Vercel Sandbox are unsupported";

if (ENGINE === "cursor" && (!useHostedDocker || useVercel)) {
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
  if (useDocker || useVercel) return {};
  const cursorApiKey = process.env.CURSOR_API_KEY;
  if (!cursorApiKey) throw new Error("CURSOR_API_KEY is required when ENGINE=cursor");
  return { CURSOR_API_KEY: cursorApiKey, ...passthroughEnv() };
}

function sandboxEnv(token?: string): Record<string, string> {
  const env: Record<string, string> = { ...passthroughEnv() };
  if (useVercel) delete env.CODEX_AUTH_B64;
  if (ENGINE === "codex") {
    env.CODEX_HOME = CODEX_SANDBOX_HOME;
  } else if (ENGINE === "cursor") {
    const cursorApiKey = process.env.CURSOR_API_KEY;
    if (!cursorApiKey) throw new Error("CURSOR_API_KEY is required when ENGINE=cursor");
    env.CURSOR_API_KEY = cursorApiKey;
  } else {
    if (!token) throw new Error("CLAUDE_CODE_OAUTH_TOKEN is required for Claude-backed phases");
    env.CLAUDE_CODE_OAUTH_TOKEN = token;
  }
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
        hostSessionsDir: `${CODEX_DOCKER_HOST_HOME}/sessions`,
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
  if (!useDocker) {
    // `noSandbox` runs the agent as a child process on the hosted VM and may
    // inherit the parent environment. Keep deterministic workflow credentials
    // and recap-publisher secrets out of that tool-enabled child; phase code
    // captures any values it needs before sandbox construction.
    for (const key of [
      "GH_TOKEN",
      "GITHUB_TOKEN",
      "VERCEL_SANDBOX_TOKEN",
      "PLAN_RECAP_TOKEN",
      "PLAN_RECAP_APP_URL",
      "CODEX_AUTH_B64",
    ]) {
      delete process.env[key];
    }
    if (ENGINE === "codex") {
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
      delete process.env.CURSOR_API_KEY;
    } else if (ENGINE === "cursor") {
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
      delete process.env.CODEX_API_KEY;
      delete process.env.OPENAI_API_KEY;
    } else {
      delete process.env.CURSOR_API_KEY;
      delete process.env.CODEX_API_KEY;
      delete process.env.OPENAI_API_KEY;
    }
    return noSandbox();
  }
  const options = {
    imageName: "{{IMAGE_NAME}}",
    // Match the runner identity so bind-mounted workspace and hosted Codex auth
    // remain readable/writable across GitHub, Blacksmith, and the Mac mini. The
    // image makes /home/agent writable for arbitrary runner UIDs.
    containerUid: process.getuid?.() ?? 1000,
    containerGid: process.getgid?.() ?? 1000,
    // Cap each phase container's CPUs so concurrent local-lane runs can't
    // starve the runner host (v2.7.0 — the mini crawled under 3-4 parallel
    // jobs). RAM stays the harder ceiling: the cap curbs thrash, it doesn't
    // make 4 simultaneous Next builds fit in 16 GB — route overflow to the
    // cloud/sandbox lanes instead. Per-repo: dockerCpus in pipeline.json.
    cpus: {{DOCKER_CPUS}},
    env: sandboxEnv(token),
  };
  return ENGINE === "codex"
    ? docker({ ...options, mounts: [{ hostPath: CODEX_DOCKER_HOST_HOME, sandboxPath: CODEX_SANDBOX_HOME }] })
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
