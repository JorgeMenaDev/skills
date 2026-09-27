#!/usr/bin/env bun
// Read only T3's authenticated provider snapshots, never provider credential files.
import { withProviders, type Provider } from "./t3-provider-client.ts";

const maxAgeMs = 5 * 60_000;
const fresh = (at: string) => Number.isFinite(Date.parse(at)) && Date.now() - Date.parse(at) >= 0 && Date.now() - Date.parse(at) <= maxAgeMs;
const unknown = (instanceId: string, reason: string) => ({ instanceId, verdict: "no-data", reason, effectiveRemainingPercent: null });

function capacity(provider: Provider) {
  const limits = provider.usageLimits;
  if (!provider.enabled || !provider.installed || provider.auth?.status !== "authenticated") return unknown(provider.instanceId, "instance-unavailable");
  if (!limits || limits.unavailable) return unknown(provider.instanceId, "usage-unavailable");
  if (!fresh(provider.checkedAt) || !fresh(limits.checkedAt) || Date.parse(limits.checkedAt) < Date.parse(provider.checkedAt)) return unknown(provider.instanceId, "stale-snapshot");
  const windows = limits.windows;
  if (!windows?.length || windows.some(w => !Number.isFinite(w.usedPercent) || w.usedPercent < 0 || w.usedPercent > 100 ||
    (w.resetsAt !== undefined && (!Number.isFinite(Date.parse(w.resetsAt)) || Date.parse(w.resetsAt) <= Date.now())))) return unknown(provider.instanceId, "invalid-or-expired-windows");
  const remaining = 100 - Math.max(...windows.map(w => w.usedPercent));
  return { instanceId: provider.instanceId, verdict: remaining <= 0 ? "skip" : remaining < 20 ? "avoid" : "prefer",
    reason: "t3-reported-windows", effectiveRemainingPercent: remaining };
}

if (import.meta.main) {
  let json = false;
  let requested: string[] | undefined;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") json = true;
    else if (args[i] === "--providers" && args[i + 1]) requested = args[++i].split(",");
    else { console.error("usage: provider-usage.ts [--json] [--providers instance,instance]"); process.exit(64); }
  }
  try {
    const providers = await withProviders(async rpc => {
      const config = await rpc("server.getConfig", {});
      const instances = requested ?? config.providers.filter(p => p.enabled && p.installed).map(p => p.instanceId);
      return Promise.all(instances.map(async instance => {
        let provider = config.providers.find(p => p.instanceId === instance);
        if (!provider) return unknown(instance, "instance-missing");
        if (capacity(provider).verdict === "no-data" && provider.enabled && provider.installed) {
          try {
            provider = (await rpc("server.refreshProviders", { instanceId: instance })).providers.find(p => p.instanceId === instance);
          } catch { return unknown(instance, "refresh-failed"); }
        }
        return provider ? capacity(provider) : unknown(instance, "instance-missing");
      }));
    });
    if (json) console.log(JSON.stringify({ checkedAt: new Date().toISOString(), providers }));
    else for (const p of providers) console.log(`${p.instanceId}: ${p.verdict}, remaining=${p.effectiveRemainingPercent ?? "unknown"}, ${p.reason}`);
  } catch { console.error("provider-usage: T3 unavailable"); process.exitCode = 1; }
}
