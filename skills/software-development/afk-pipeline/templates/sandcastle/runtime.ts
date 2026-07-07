import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

/**
 * Lane switch. The workflow sets SANDCASTLE_SANDBOX=docker on the local lane
 * (`agent:implement-local` → self-hosted Mac mini runner, agent isolated in
 * Docker) and =none on the cloud lane (`agent:implement` → GitHub-hosted VM,
 * noSandbox — the VM is the sandbox). See matias docs/adr/0003.
 *
 * The sandbox lane (`agent:implement-sandbox`, SANDCASTLE_SANDBOX=vercel on
 * the DRIVER) never reaches this file with `vercel`: lane-exec re-runs each
 * phase INSIDE the Vercel microVM with SANDCASTLE_SANDBOX=none, so the
 * noSandbox path below is the correct one there — the microVM is the sandbox
 * (matias docs/adr/0004).
 */
const useDocker = process.env.SANDCASTLE_SANDBOX === "docker";

/**
 * Secrets the workflow injects for phases that exercise real integrations.
 * A workflow-step env line alone never reaches the agent or the app server it
 * starts: the docker lane needs them on the CONTAINER env, the cloud lane on
 * the agent-provider env. Keys absent from the step's process env are skipped,
 * so exposure is limited to the steps whose workflow env declares them.
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
 * In docker mode the OAuth token must ride on the CONTAINER env, not the
 * agent-provider env — Claude Code reads it at login inside the container,
 * and sandcastle rejects the same key appearing in both env maps.
 */
export function agentEnv(token: string): Record<string, string> {
  return useDocker ? {} : { CLAUDE_CODE_OAUTH_TOKEN: token, ...passthroughEnv() };
}

export function chooseSandbox(token: string) {
  if (!useDocker) return noSandbox();
  const env: Record<string, string> = {
    CLAUDE_CODE_OAUTH_TOKEN: token,
    ...passthroughEnv(),
  };
  if (process.env.GH_TOKEN) env.GH_TOKEN = process.env.GH_TOKEN;
  return docker({
    imageName: "{{IMAGE_NAME}}",
    // Image agent user is UID/GID 1000; the macOS host user is not. Docker
    // Desktop's VM handles bind-mount ownership, so pin the container user.
    containerUid: 1000,
    containerGid: 1000,
    env,
  });
}

/** Fresh bind-mounted worktrees have no node_modules — install before the agent starts. */
export function sandboxHooks() {
  return useDocker
    ? {
        sandbox: {
          onSandboxReady: [{ command: "bun install", timeoutMs: 300_000 }],
        },
      }
    : undefined;
}
