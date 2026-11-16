#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";
const FEATURES = ["aiOverview", "answerBox", "knowledgeGraph", "peopleAlsoAsk", "topStories", "videos", "images", "places", "shopping"];
// DataForSEO result types, mapped to the feature names saved files already use.
const FEATURE_TYPES = {
  ai_overview: "aiOverview",
  answer_box: "answerBox",
  featured_snippet: "answerBox",
  knowledge_graph: "knowledgeGraph",
  people_also_ask: "peopleAlsoAsk",
  top_stories: "topStories",
  video: "videos",
  images: "images",
  local_pack: "places",
  map: "places",
  shopping: "shopping",
  popular_products: "shopping",
};
// --gl to DataForSEO location code. Other countries: pass --location (2000 + ISO 3166 numeric code).
const LOCATIONS = { cl: 2152, gb: 2826, uk: 2826, us: 2840, mx: 2484, es: 2724, ar: 2032, co: 2170, pe: 2604, br: 2076 };

function usage() {
  return `Usage:
  DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=... node serp.mjs --q "acreditación pronexo" [--q "..."] \\
      [--queries-file queries.txt] --gl cl --hl es --domain acredix.cl [--num 10] [--out reports/data/serp-YYYY-MM-DD]

  node serp.mjs --from-response reports/data/serp-YYYY-MM-DD.json

Live Google result check through DataForSEO's SERP API. For each query it prints where the
domain ranks among organic results, the top organic results, and which result features
(AI Overview, answer box, People Also Ask, videos, local pack, ...) the page shows.

--q              A query; repeatable. --queries-file reads one query per line.
--gl / --hl      Google country and interface language (for example cl / es, gb / en).
--location       DataForSEO location code, when --gl is not in the built-in list.
--device         desktop (default) or mobile.
--domain         Domain to locate (subdomains count as the same site).
--num            Organic results per page (default 10).
--pages          Result pages per query (default 1). Depth is --num x --pages. Keep it at 30 or
                 less: a deeper sample writes an impression into Search Console at that depth.
--out            Path prefix: writes <prefix>.json (responses) and <prefix>.md.
--from-response  Re-render a saved <prefix>.json without network access (older Serper files too).
--dry-run        Print the request bodies and exit without calling the API.

A result is one sample for one query, market, device and moment. Positions 8 to 12 move
between checks minutes apart; re-run the queries that decide a bet before relying on them.
Credentials come from DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD (Basic auth) and are never printed.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${name}\n\n${usage()}`);
  return value;
}

function argValues(name) {
  const values = [];
  process.argv.forEach((arg, index) => {
    if (arg === name) values.push(process.argv[index + 1]);
  });
  return values;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Google results can arrive as opaque google.com/goto links, so the site's host
// survives only in displayedLink ("https://acredix.cl › Acreditación").
function resultHost(result) {
  const host = hostOf(result.link);
  if (host !== "google.com" || !result.displayedLink) return host;
  const shown = result.displayedLink.split(" ")[0];
  return hostOf(shown.includes("://") ? shown : `https://${shown}`) || host;
}

function matchesDomain(result, domain) {
  const host = resultHost(result);
  const target = domain.replace(/^www\./, "");
  return host === target || host.endsWith(`.${target}`);
}

// Reshapes DataForSEO items into the saved-file shape render() reads (organic, peopleAlsoAsk, one key per feature).
// An organic `url` can be an opaque google.com/goto link; `breadcrumb` keeps the site, so it goes in displayedLink.
function toResults(items) {
  const out = { organic: [] };
  for (const item of items) {
    if (item.type === "organic") {
      out.organic.push({ position: item.rank_group, link: item.url, title: item.title, displayedLink: item.breadcrumb });
    } else if (item.type === "people_also_ask") {
      out.peopleAlsoAsk = (item.items ?? []).map((entry) => ({ question: entry.title }));
    } else if (FEATURE_TYPES[item.type]) {
      out[FEATURE_TYPES[item.type]] = true;
    }
  }
  return out;
}

export function render(saved) {
  const out = [`# Live results: ${saved.domain || "no domain"} (${saved.gl}/${saved.hl})`, "", `Fetched: ${saved.fetchedAt}. One sample per query; not a baseline.`, ""];
  out.push("| Query | Domain position | Domain URL | Features | Top 3 |");
  out.push("| --- | --- | --- | --- | --- |");
  for (const { q, response } of saved.results) {
    const organic = Array.isArray(response?.organic) ? [...response.organic].sort((a, b) => a.position - b.position) : [];
    const hit = saved.domain ? organic.find((result) => matchesDomain(result, saved.domain)) : undefined;
    const position = hit ? `#${hit.position} (page ${Math.ceil(hit.position / 10)})` : `not in first ${organic.length}`;
    const features = FEATURES.filter((feature) => response?.[feature]).join(", ");
    const top = organic.slice(0, 3).map(resultHost).join(", ");
    out.push(`| ${q.replaceAll("|", "/")} | ${response?.error ? "lookup failed" : position} | ${hit && hostOf(hit.link) === "google.com" ? (hit.displayedLink ?? "") : (hit?.link ?? "")} | ${features} | ${top} |`);
  }
  out.push("");
  for (const { q, response } of saved.results) {
    const organic = Array.isArray(response?.organic) ? [...response.organic].sort((a, b) => a.position - b.position) : [];
    out.push(`## ${q}`, "");
    if (response?.error) out.push(`Lookup failed: ${response.error}`);
    for (const result of organic.slice(0, 10)) out.push(`${result.position}. ${resultHost(result)} ${result.title ?? ""}`.trim());
    const questions = (response?.peopleAlsoAsk ?? []).map((item) => item.question).filter(Boolean);
    if (questions.length > 0) out.push("", `People also ask: ${questions.join(" · ")}`);
    out.push("");
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

  const queriesFile = argValue("--queries-file");
  const fileQueries = queriesFile ? (await readFile(queriesFile, "utf-8")).split("\n").map((line) => line.trim()).filter(Boolean) : [];
  const queries = [...argValues("--q"), ...fileQueries];
  const gl = argValue("--gl") ?? "us";
  const hl = argValue("--hl") ?? "en";
  const domain = argValue("--domain") ?? "";
  const num = Number(argValue("--num") ?? 10);
  const pages = Math.max(1, Number(argValue("--pages") ?? 1));
  if (queries.length === 0) throw new Error(`At least one --q is required.\n\n${usage()}`);

  const location = Number(argValue("--location") ?? LOCATIONS[gl.toLowerCase()]);
  if (!location) throw new Error(`No location code for --gl ${gl}; pass --location.\n\n${usage()}`);
  const device = argValue("--device") ?? "desktop";
  const bodies = queries.map((q) => ({ keyword: q, location_code: location, language_code: hl, device, depth: num * pages }));
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ endpoint: ENDPOINT, bodies }, null, 2));
    return;
  }
  const { DATAFORSEO_LOGIN: login, DATAFORSEO_PASSWORD: password } = process.env;
  if (!login || !password) throw new Error("Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.");
  const auth = `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;

  const results = [];
  for (const body of bodies) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/json" },
      body: JSON.stringify([body]),
    });
    const payload = await response.json().catch(() => ({}));
    const task = payload.tasks?.[0];
    const failed = !response.ok ? `HTTP ${response.status}${payload.status_message ? `: ${payload.status_message}` : ""}`
      : task?.status_code !== 20000 ? `${task?.status_code}: ${task?.status_message}` : null;
    results.push({ q: body.keyword, response: failed ? { error: failed } : toResults(task.result?.[0]?.items ?? []) });
  }

  const saved = { fetchedAt: new Date().toISOString(), source: "dataforseo", domain, gl, hl, device, num, pages, results };
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
