#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT = "https://google.serper.dev/search";
const FEATURES = ["answerBox", "knowledgeGraph", "peopleAlsoAsk", "topStories", "videos", "images", "places", "shopping"];

function usage() {
  return `Usage:
  SERPER_API_KEY=... node serp.mjs --q "acreditación pronexo" [--q "..."] [--queries-file queries.txt] \\
      --gl cl --hl es --domain acredix.cl [--num 20] [--out reports/data/serp-YYYY-MM-DD]

  node serp.mjs --from-response reports/data/serp-YYYY-MM-DD.json

Live Google result check through Serper (serper.dev). For each query it prints where the
domain ranks among organic results, the top organic results, and which result features
(answer box, People Also Ask, videos, local pack, ...) the page shows.

--q              A query; repeatable. --queries-file reads one query per line.
--gl / --hl      Google country and interface language (for example cl / es, gb / en).
--domain         Domain to locate (subdomains count as the same site).
--num            Organic results requested per query (default 10). Serper free accounts reject
                 quoted and site: queries above 10 ("Query pattern not allowed for free accounts").
--out            Path prefix: writes <prefix>.json (responses) and <prefix>.md.
--from-response  Re-render a saved <prefix>.json without network access.
--dry-run        Print the request bodies and exit without calling the API.

A result is one sample for one query, market, device and moment. Positions 8 to 12 move
between checks minutes apart; re-run the queries that decide a bet before relying on them.
The key is read from SERPER_API_KEY and never printed.`;
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

function matchesDomain(url, domain) {
  const host = hostOf(url);
  const target = domain.replace(/^www\./, "");
  return host === target || host.endsWith(`.${target}`);
}

export function render(saved) {
  const out = [`# Live results: ${saved.domain || "no domain"} (${saved.gl}/${saved.hl})`, "", `Fetched: ${saved.fetchedAt}. One sample per query; not a baseline.`, ""];
  out.push("| Query | Domain position | Domain URL | Features | Top 3 |");
  out.push("| --- | --- | --- | --- | --- |");
  for (const { q, response } of saved.results) {
    const organic = Array.isArray(response?.organic) ? [...response.organic].sort((a, b) => a.position - b.position) : [];
    const hit = saved.domain ? organic.find((result) => matchesDomain(result.link, saved.domain)) : undefined;
    const position = hit ? `#${hit.position} (page ${Math.ceil(hit.position / 10)})` : `not in first ${organic.length}`;
    const features = FEATURES.filter((feature) => response?.[feature]).join(", ");
    const top = organic.slice(0, 3).map((result) => hostOf(result.link)).join(", ");
    out.push(`| ${q.replaceAll("|", "/")} | ${response?.error ? "lookup failed" : position} | ${hit?.link ?? ""} | ${features} | ${top} |`);
  }
  out.push("");
  for (const { q, response } of saved.results) {
    const organic = Array.isArray(response?.organic) ? [...response.organic].sort((a, b) => a.position - b.position) : [];
    out.push(`## ${q}`, "");
    if (response?.error) out.push(`Lookup failed: ${response.error}`);
    for (const result of organic.slice(0, 10)) out.push(`${result.position}. ${hostOf(result.link)} ${result.title ?? ""}`.trim());
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
  if (queries.length === 0) throw new Error(`At least one --q is required.\n\n${usage()}`);

  const bodies = queries.map((q) => ({ q, gl, hl, num }));
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ endpoint: ENDPOINT, bodies }, null, 2));
    return;
  }
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY is not set.");

  const results = [];
  for (const body of bodies) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "X-API-KEY": key, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    results.push({ q: body.q, response: response.ok ? payload : { error: `HTTP ${response.status}${payload.message ? `: ${payload.message}` : ""}` } });
  }

  const saved = { fetchedAt: new Date().toISOString(), domain, gl, hl, num, results };
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
