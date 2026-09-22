#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.dataforseo.com/v3/keywords_data/google_ads";
const MODES = {
  volume: { endpoint: `${API}/search_volume/live`, limit: 1000, flag: "--keywords" },
  ideas: { endpoint: `${API}/keywords_for_keywords/live`, limit: 20, flag: "--seeds" },
};

function usage() {
  return `Usage:
  DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=... node demand.mjs --keywords "a,b,c" \\
      --location 2152 --language es [--out reports/data/demand-YYYY-MM-DD]
  node demand.mjs --seeds "chatbot whatsapp" --location 2152 --language es [--min-volume 10]
  node demand.mjs --from-response reports/data/demand-YYYY-MM-DD.json

Search demand estimates from DataForSEO (Google Ads data, pay per request).

--keywords       Exact phrases to size (up to 1000 per request). --keywords-file reads one per line.
--seeds          Up to 20 seed phrases; returns related keyword ideas with volumes.
--location       DataForSEO location code: 2152 Chile, 2826 United Kingdom, 2840 United States,
                 2484 Mexico, 2724 Spain. Other countries: 2000 + ISO 3166 numeric code.
--language       Language code, for example es or en.
--min-volume     Hide ideas below this monthly volume (default 0).
--out            Path prefix: writes <prefix>.json (raw response) and <prefix>.md.
--from-response  Re-render a saved <prefix>.json without network access.
--dry-run        Print the request and exit without calling the API (no cost).

Volumes are monthly averages over the last 12 months and are estimates. Google Ads rounds
low volumes and returns nothing for many long-tail phrases: an empty volume means "below
what the source reports", never zero demand. Credentials come from DATAFORSEO_LOGIN and
DATAFORSEO_PASSWORD (Basic auth) and are never printed. The response reports its cost;
record it in the workspace research log.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${name}\n\n${usage()}`);
  return value;
}

const splitList = (value) => (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);

function trend(monthly) {
  const values = (monthly ?? []).map((month) => month.search_volume).filter(Number.isFinite);
  if (values.length === 0) return "";
  return `${Math.min(...values)} to ${Math.max(...values)}`;
}

export function render(saved) {
  const task = saved.response?.tasks?.[0];
  const rows = Array.isArray(task?.result) ? task.result : [];
  const minVolume = saved.minVolume ?? 0;
  const out = [
    `# Search demand (${saved.mode}): location ${saved.location}, language ${saved.language}`,
    "",
    `Fetched: ${saved.fetchedAt}. Source: DataForSEO Google Ads, monthly average of the last 12 months. Estimates.`,
    `Cost reported: ${saved.response?.cost ?? task?.cost ?? "unknown"} USD. Task status: ${task?.status_code ?? "n/a"} ${task?.status_message ?? ""}`.trim(),
    "",
  ];
  if (saved.response?.status_code && saved.response.status_code !== 20000) {
    out.push(`Request failed: ${saved.response.status_code} ${saved.response.status_message ?? ""}`, "");
  }
  out.push("| Keyword | Monthly searches | CPC (USD) | Competition | 12-month range |");
  out.push("| --- | --- | --- | --- | --- |");
  const sorted = [...rows]
    .filter((row) => saved.mode === "volume" || (row.search_volume ?? 0) >= minVolume)
    .sort((a, b) => (b.search_volume ?? -1) - (a.search_volume ?? -1) || String(a.keyword).localeCompare(String(b.keyword)));
  for (const row of sorted) {
    const volume = Number.isFinite(row.search_volume) ? row.search_volume.toLocaleString("en-US") : "below reported threshold";
    const cpc = Number.isFinite(row.cpc) ? row.cpc.toFixed(2) : "";
    out.push(`| ${String(row.keyword).replaceAll("|", "/")} | ${volume} | ${cpc} | ${row.competition ?? ""} | ${trend(row.monthly_searches)} |`);
  }
  if (saved.mode === "volume") {
    const returned = new Set(rows.map((row) => String(row.keyword).toLowerCase()));
    const missing = (saved.keywords ?? []).filter((keyword) => !returned.has(keyword.toLowerCase()));
    if (missing.length > 0) out.push("", `Not returned by the source (no reported volume): ${missing.join(", ")}`);
  }
  return `${out.join("\n").trim()}\n`;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const fromResponse = argValue("--from-response");
  if (fromResponse) {
    process.stdout.write(render(JSON.parse(await readFile(fromResponse, "utf-8"))));
    return;
  }

  const keywordsFile = argValue("--keywords-file");
  const fileKeywords = keywordsFile ? (await readFile(keywordsFile, "utf-8")).split("\n").map((line) => line.trim()).filter(Boolean) : [];
  const keywords = [...splitList(argValue("--keywords")), ...fileKeywords];
  const seeds = splitList(argValue("--seeds"));
  if ((keywords.length > 0) === (seeds.length > 0)) throw new Error(`Pass exactly one of --keywords or --seeds.\n\n${usage()}`);
  const mode = keywords.length > 0 ? "volume" : "ideas";
  const list = mode === "volume" ? keywords : seeds;
  if (list.length > MODES[mode].limit) throw new Error(`${MODES[mode].flag} accepts at most ${MODES[mode].limit} phrases per request.`);

  const location = Number(argValue("--location") ?? 2840);
  const language = argValue("--language") ?? "en";
  const task = { keywords: list, location_code: location, language_code: language };
  if (mode === "ideas") task.sort_by = "search_volume";
  const request = { endpoint: MODES[mode].endpoint, body: [task] };
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify(request, null, 2));
    return;
  }

  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are not set. Without them, demand stays directional (Search Console rows, live results, autocomplete).");
  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`, "content-type": "application/json" },
    body: JSON.stringify(request.body),
  });
  const payload = response.ok ? await response.json() : { status_code: response.status, status_message: `HTTP ${response.status}` };

  const saved = {
    fetchedAt: new Date().toISOString(),
    mode,
    location,
    language,
    keywords: list,
    minVolume: Number(argValue("--min-volume") ?? 0),
    response: payload,
  };
  const text = render(saved);
  const out = argValue("--out");
  if (out) {
    await writeFile(`${out}.json`, `${JSON.stringify(saved)}\n`);
    await writeFile(`${out}.md`, text);
    console.error(`Wrote ${out}.json and ${out}.md`);
  }
  process.stdout.write(text);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
