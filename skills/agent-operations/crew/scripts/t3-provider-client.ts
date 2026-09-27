// Authenticated T3 provider catalog and quota RPCs. Never print account details.
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export type Provider = {
  instanceId: string;
  driver: string;
  enabled: boolean;
  installed: boolean;
  auth: { status: string };
  checkedAt: string;
  models: {
    slug: string;
    capabilities: {
      optionDescriptors?: { id: string; type: string; options?: { id: string }[] }[];
    } | null;
  }[];
  usageLimits?: {
    checkedAt: string;
    unavailable?: { reason: string };
    windows: { id: string; kind: string; usedPercent: number; resetsAt?: string }[];
  };
};

const base = process.env.T3_DISPATCH_BASE_DIR ?? join(homedir(), ".t3");
const runAuth = (args: string[]) => execFileSync("t3", ["auth", "session", ...args, "--base-dir", base], {
  timeout: 5000, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8",
});

export async function withProviders<T>(read: (rpc: (tag: string, payload: object) => Promise<{ providers: Provider[] }>) => Promise<T>, timeoutMs = 20_000) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw Error("invalid-timeout");
  const runtime = await Bun.file(join(base, "userdata/server-runtime.json")).json();
  process.kill(runtime.pid, 0);
  const session = JSON.parse(runAuth(["issue", "--ttl", "5m", "--json"]));
  let socket: WebSocket | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      const ws = socket = new WebSocket(runtime.origin.replace(/^http/, "ws") + "/ws", {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const pending = new Map<string, { resolve: (value: { providers: Provider[] }) => void; reject: (error: Error) => void }>();
      let sequence = 0;
      const stop = (reason: string) => {
        clearTimeout(timer);
        for (const request of pending.values()) request.reject(Error(reason));
        pending.clear();
        reject(Error(reason));
        ws.close();
      };
      const timer = setTimeout(() => stop("timeout"), timeoutMs);
      const rpc = (tag: string, payload: object) => new Promise<{ providers: Provider[] }>((resolve, reject) => {
        const id = String(++sequence);
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ _tag: "Request", id, tag, payload, headers: [] }));
      });
      ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data.toString());
          const request = pending.get(message.requestId);
          if (message._tag !== "Exit" || !request) return;
          pending.delete(message.requestId);
          if (message.exit?._tag !== "Success" || !Array.isArray(message.exit.value?.providers)) request.reject(Error("rpc-failed"));
          else request.resolve(message.exit.value);
        } catch { stop("malformed-response"); }
      };
      ws.onerror = () => stop("transport-failed");
      ws.onclose = () => stop("connection-closed");
      ws.onopen = async () => {
        try {
          const result = await read(rpc);
          clearTimeout(timer);
          resolve(result);
        } catch (error) {
          clearTimeout(timer);
          reject(error);
          ws.close();
        }
      };
    });
  } finally {
    socket?.close();
    try { runAuth(["revoke", session.sessionId]); }
    catch { console.error("t3-provider-client: temporary T3 session revocation failed; expires within five minutes"); }
  }
}

