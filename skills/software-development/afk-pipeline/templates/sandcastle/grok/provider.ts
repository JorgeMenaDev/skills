import type { AgentProvider } from "@ai-hero/sandcastle";

/**
 * Grok Build CLI agent provider (v2.12.0) — sandcastle 0.12.0 ships no grok
 * provider, so this implements the exported AgentProvider interface directly
 * (same stand-in pattern as vercel/provider.ts; collapse when upstream adds
 * one).
 *
 * Mechanics proven live 2026-07-12 on grok CLI 0.2.93:
 * - prompt via `--prompt-file /dev/stdin` + PrintCommand.stdin (avoids the
 *   128 KB argv limit without shell-escaping the prompt);
 * - `--output-format streaming-json` emits NDJSON events:
 *   {"type":"thought","data":<chunk>} | {"type":"text","data":<chunk>} |
 *   {"type":"end","stopReason":...,"sessionId":...}. Tool calls execute but
 *   emit NO stream event — job logs show text/thought only, by CLI design.
 * - auth = ~/.grok/auth.json (materialized from the GROK_AUTH_B64 seed and
 *   bind-mounted by runtime.ts). No global XAI_API_KEY is passed; current CLI
 *   prefers an active session token over the global key.
 *
 * Grok headless sessions ARE resumable (`-r <id>`), but v1 keeps
 * captureSessions: false and ignores resumeSession — implement is the only
 * grok phase, and sandcastle's capture/transfer machinery is Claude/Codex
 * specific. Wire sessionStorage before expanding grok past implement.
 */
type ParsedStreamEvents = ReturnType<AgentProvider["parseStreamLine"]>;

export interface GrokOptions {
  readonly effort?: "low" | "medium" | "high";
  readonly env?: Record<string, string>;
}

export const grok = (model: string, options?: GrokOptions): AgentProvider => {
  let finalText = "";
  return {
    name: "grok",
    env: options?.env ?? {},
    captureSessions: false,
    buildPrintCommand({ prompt, dangerouslySkipPermissions }) {
      const effort = options?.effort ?? "high";
      const approveFlag = dangerouslySkipPermissions ? " --always-approve" : "";
      return {
        command: `grok --prompt-file /dev/stdin --model ${model} --effort ${effort} --output-format streaming-json${approveFlag}`,
        stdin: prompt,
      };
    },
    buildInteractiveArgs({ prompt, dangerouslySkipPermissions }) {
      const args = ["grok", "--model", model];
      if (dangerouslySkipPermissions) args.push("--always-approve");
      if (prompt) args.push(prompt);
      return args;
    },
    parseStreamLine(line): ParsedStreamEvents {
      if (!line.startsWith("{")) return [];
      try {
        const obj = JSON.parse(line) as {
          type?: string;
          data?: string;
          sessionId?: string;
          stopReason?: string;
          message?: string;
        };
        if (obj.type === "text" && typeof obj.data === "string") {
          finalText += obj.data;
          return [{ type: "text", text: obj.data }];
        }
        if (obj.type === "thought") return [];
        if (obj.type === "end") {
          const events: ParsedStreamEvents = [];
          if (typeof obj.sessionId === "string") {
            events.push({ type: "session_id", sessionId: obj.sessionId });
          }
          events.push({
            type: "result",
            result: finalText || `stopReason: ${obj.stopReason ?? "unknown"}`,
          });
          return events;
        }
        if (obj.type === "error") {
          return [{ type: "result", result: obj.message ?? line }];
        }
      } catch {
        // fall through to ignore non-JSON noise
      }
      return [];
    },
  };
};
