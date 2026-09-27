#!/usr/bin/env bun
import { withProviders, type Provider } from "./t3-provider-client.ts";

class SelectionError extends Error {}

export function selectModel(providers: Provider[], instance: string, model: string, effort: string) {
  const provider = providers.find(p => p.instanceId === instance);
  if (!provider?.enabled || !provider.installed) throw new SelectionError(`instance ${instance} is missing, disabled or not installed`);
  const selected = provider.models.find(m => m.slug === model);
  if (!selected) throw new SelectionError(`model ${model} is absent from instance ${instance}'s catalog; use an exact model slug from T3 Settings > Providers`);
  const descriptors = selected.capabilities?.optionDescriptors ?? [];
  const options: { id: string; value: string }[] = [];
  if (effort) {
    const choices = descriptors.filter(d => ["reasoningEffort", "effort", "variant", "reasoning"].includes(d.id));
    const descriptor = choices.length === 1 ? choices[0] : undefined;
    if (descriptor?.type !== "select" || !descriptor.options?.some(o => o.id === effort)) {
      throw new SelectionError(`effort ${effort} is not advertised for ${instance}/${model}; available: ${descriptor?.options?.map(o => o.id).join(", ") || "unknown or unsupported"}`);
    }
    options.push({ id: descriptor.id, value: effort });
  }
  if (provider.driver === "opencode") {
    const agent = descriptors.find(d => d.id === "agent" && d.type === "select");
    if (!agent?.options?.some(o => o.id === "build")) throw new SelectionError(`build agent is not advertised for ${instance}/${model}`);
    options.push({ id: "agent", value: "build" });
  }
  return { instanceId: instance, model, options };
}

export async function validateModel(instance: string, model: string, effort: string) {
  return withProviders(async rpc => {
    const config = await rpc("server.getConfig", {});
    try { return selectModel(config.providers, instance, model, effort); }
    catch {
      // A newly installed model can be absent from the cached picker inventory.
      const refreshed = await rpc("server.refreshProviders", { instanceId: instance, refreshModels: true });
      return selectModel(refreshed.providers, instance, model, effort);
    }
  });
}

if (import.meta.main) {
  const [instance, model, effort = ""] = process.argv.slice(2);
  if (instance === "--catalog") {
    try {
      const catalog = await withProviders(async rpc => (await rpc("server.getConfig", {})).providers
        .filter(p => p.enabled && p.installed)
        .map(p => ({ instanceId: p.instanceId, driver: p.driver,
          models: p.models.map(m => ({ slug: m.slug, options: m.capabilities?.optionDescriptors ?? [] })) })));
      console.log(JSON.stringify(catalog, null, 2));
    } catch { console.error("t3-dispatch: catalog unavailable; check T3 is running"); process.exitCode = 1; }
  } else {
  if (!instance || !model || process.argv.length > 5) {
    console.error("usage: t3-model-selection.ts --catalog | <instance> <model> [effort]");
    process.exit(64);
  }
  try { console.log(JSON.stringify(await validateModel(instance, model, effort))); }
  catch (error) {
    console.error(`t3-dispatch: model selection refused: ${error instanceof SelectionError ? error.message : "T3 catalog unavailable; check T3 is running and refresh its provider catalog"}`);
    process.exitCode = 1;
  }
}
}
