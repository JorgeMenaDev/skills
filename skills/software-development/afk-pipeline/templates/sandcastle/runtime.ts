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
 * In docker/vercel mode the OAuth token must ride on the SANDBOX env, not the
 * agent-provider env — Claude Code reads it at login inside the sandbox, and
 * sandcastle rejects the same key appearing in both env maps.
 */
export function agentEnv(token: string): Record<string, string> {
  return useDocker || useVercel ? {} : { CLAUDE_CODE_OAUTH_TOKEN: token, ...passthroughEnv() };
}

function sandboxEnv(token: string): Record<string, string> {
  const env: Record<string, string> = {
    CLAUDE_CODE_OAUTH_TOKEN: token,
    ...passthroughEnv(),
  };
  if (process.env.GH_TOKEN) env.GH_TOKEN = process.env.GH_TOKEN;
  return env;
}

export function chooseSandbox(token: string) {
  if (useVercel) return vercelSandbox({ env: { CI: "true", ...sandboxEnv(token) } });
  if (!useDocker) return noSandbox();
  return docker({
    imageName: "{{IMAGE_NAME}}",
    // Image agent user is UID/GID 1000; the macOS host user is not. Docker
    // Desktop's VM handles bind-mount ownership, so pin the container user.
    containerUid: 1000,
    containerGid: 1000,
    env: sandboxEnv(token),
  });
}

/**
 * Sandbox-side setup before the agent starts.
 * - docker: fresh bind-mounted worktrees have no node_modules.
 * - vercel: stock node22 microVM — install the toolchain (bun, Claude Code,
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
      'npm i -g @anthropic-ai/claude-code agent-browser --silent && sudo ln -sf "$(command -v claude)" /usr/local/bin/claude && sudo ln -sf "$(command -v agent-browser)" /usr/local/bin/agent-browser',
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
