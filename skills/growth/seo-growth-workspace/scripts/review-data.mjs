#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAccessToken, queryAll } from "./gsc-fetch.mjs";

const DEFAULT_DAYS = 28;
const DEFAULT_MIN_IMPRESSIONS = 10;
const SHAPES = { totals: [], pages: ["page"], queries: ["query", "page"], countries: ["country"] };
// Heuristic page-one CTR floors by position band; a flag, never a finding.
const CTR_FLOORS = [
  { max: 3, floor: 0.05 },
  { max: 6, floor: 0.02 },
  { max: 10, floor: 0.0075 },
];

function usage() {
  return `Usage:
  GSC_CREDENTIALS_DIR=~/creds/acme-gsc node review-data.mjs --site sc-domain:example.com \\
      --brand "acme,acme app" [--days ${DEFAULT_DAYS} --end YYYY-MM-DD | --month YYYY-MM] \\
      [--min-impressions ${DEFAULT_MIN_IMPRESSIONS}] [--urls https://example.com/,https://example.com/pricing] \\
      [--out reports/data/YYYY-MM-DD]

  node review-data.mjs --from-raw reports/data/YYYY-MM-DD.json --brand "acme"

Builds the data pack a review or scoreboard starts from: the current window against the
previous window of equal length (or a calendar month against the month before).
Sections: totals and brand split, lanes (URL groups), top pages, pages losing clicks,
non-brand queries with demand, countries, and optional live URL checks.

--brand            Comma-separated brand terms (case-insensitive substring). Required
                   for an honest non-brand split; pass "" only when the site has no brand demand.
--end              Last day of the current window. Default: three days ago (UTC), so the
                   window holds settled data.
--month            Calendar month instead of a rolling window (scoreboard).
--min-impressions  Query rows below this are left out of the query table (default ${DEFAULT_MIN_IMPRESSIONS}).
--urls             Comma-separated URLs to live-check: status, redirect target, canonical, robots.
--out              Path prefix: writes <prefix>.json (raw rows) and <prefix>.md (the pack).
--from-raw         Recompute a pack from a saved <prefix>.json without network access.

Search Console withholds anonymized queries, so query-row totals undercount; the pack
prints the coverage share instead of hiding it. Auth: see gsc-fetch.mjs --help.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (value === undefined || (value.startsWith("--") && value !== "")) {
    throw new Error(`Missing value for ${name}\n\n${usage()}`);
  }
  return value;
}

const isoDate = (date) => date.toISOString().slice(0, 10);

function addDays(day, count) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return isoDate(date);
}

export function windowsFor({ end, days, month }) {
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("--month must be YYYY-MM");
    const [year, monthIndex] = month.split("-").map(Number);
    const last = new Date(Date.UTC(year, monthIndex, 0));
    const previousLast = new Date(Date.UTC(year, monthIndex - 1, 0));
    const previousFirst = new Date(Date.UTC(previousLast.getUTCFullYear(), previousLast.getUTCMonth(), 1));
    return {
      label: `month ${month}`,
      days: last.getUTCDate(),
      current: { start: `${month}-01`, end: isoDate(last) },
      previous: { start: isoDate(previousFirst), end: isoDate(previousLast) },
    };
  }
  const start = addDays(end, -(days - 1));
  return {
    label: `${days} days`,
    days,
    current: { start, end },
    previous: { start: addDays(start, -days), end: addDays(start, -1) },
  };
}

async function fetchRaw({ site, windows, credentialsDir }) {
  const token = await getAccessToken(credentialsDir);
  const raw = { site, windows, current: {}, previous: {} };
  for (const period of ["current", "previous"]) {
    for (const [name, dimensions] of Object.entries(SHAPES)) {
      const result = await queryAll({
        site,
        startDate: windows[period].start,
        endDate: windows[period].end,
        dimensions,
        token,
      });
      raw[period][name] = { rows: result.rows, capped: result.capped };
    }
  }
  return raw;
}

const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
const pct = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "n/a");
const num = (value) => (Number.isFinite(value) ? value.toLocaleString("en-US") : "n/a");
const pos = (value) => (Number.isFinite(value) && value > 0 ? value.toFixed(1) : "n/a");
const delta = (now, before) => {
  const diff = now - before;
  return diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${num(diff)}`;
};

function pathOf(url, host) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname === host ? "" : parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function mainHost(pages) {
  const counts = new Map();
  for (const row of pages) {
    try {
      const host = new URL(row.keys[0]).hostname;
      counts.set(host, (counts.get(host) ?? 0) + row.impressions);
    } catch {
      // non-URL keys are ignored for host detection
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

export function laneOf(url, host) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "other";
  }
  if (parsed.hostname !== host) return parsed.hostname;
  const segments = parsed.pathname.split("/").filter(Boolean);
  const localized = segments.length > 0 && /^[a-z]{2}(-[a-z]{2})?$/i.test(segments[0]);
  const rest = localized ? segments.slice(1) : segments;
  const prefix = localized ? `/${segments[0]}` : "";
  if (rest.length === 0) return "home";
  if (rest.length === 1) return "top-level pages";
  return `${prefix}/${rest[0]}`;
}

function laneStats(pageRows, host, days) {
  const lanes = new Map();
  for (const row of pageRows) {
    const lane = laneOf(row.keys[0], host);
    const entry = lanes.get(lane) ?? { urls: 0, clicks: 0, impressions: 0 };
    entry.urls += 1;
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    lanes.set(lane, entry);
  }
  for (const entry of lanes.values()) entry.clicksPerUrlMonth = (entry.clicks / entry.urls) * (30 / days);
  return lanes;
}

function aggregateQueries(rows, isBrand) {
  const queries = new Map();
  for (const row of rows) {
    const [query, page] = row.keys;
    if (isBrand(query)) continue;
    const entry = queries.get(query) ?? { query, clicks: 0, impressions: 0, weightedPosition: 0, pages: new Map() };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    entry.weightedPosition += row.position * row.impressions;
    entry.pages.set(page, (entry.pages.get(page) ?? 0) + row.impressions);
    queries.set(query, entry);
  }
  for (const entry of queries.values()) {
    entry.position = entry.impressions > 0 ? entry.weightedPosition / entry.impressions : 0;
    entry.ctr = entry.impressions > 0 ? entry.clicks / entry.impressions : 0;
    entry.topPage = [...entry.pages.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }
  return queries;
}

function queryFlags(entry, previous) {
  const flags = [];
  const floor = CTR_FLOORS.find((band) => entry.position <= band.max)?.floor;
  if (floor !== undefined && entry.ctr < floor) flags.push("page 1, low CTR");
  if (entry.position > 10 && entry.position <= 20) flags.push("page 2");
  const shares = [...entry.pages.values()].filter((impressions) => impressions / entry.impressions >= 0.2);
  if (shares.length >= 2) flags.push(`split across ${shares.length} pages`);
  if (!previous.has(entry.query)) flags.push("new");
  return flags.join(", ");
}

function table(headers, rows) {
  if (rows.length === 0) return "_None._\n";
  const line = (cells) => `| ${cells.join(" | ")} |`;
  return `${[line(headers), line(headers.map(() => "---")), ...rows.map(line)].join("\n")}\n`;
}

export function buildPack(raw, { brandTerms, minImpressions, generatedAt, liveChecks = [] }) {
  const brand = brandTerms.map((term) => term.trim().toLowerCase()).filter(Boolean);
  const isBrand = (query) => brand.some((term) => query.toLowerCase().includes(term));
  const { current, previous, windows } = raw;
  const host = mainHost([...current.pages.rows, ...previous.pages.rows]);

  const totals = (period) => period.totals.rows[0] ?? { clicks: 0, impressions: 0, position: 0 };
  const split = (period) => {
    const rows = period.queries.rows;
    const brandRows = rows.filter((row) => isBrand(row.keys[0]));
    const otherRows = rows.filter((row) => !isBrand(row.keys[0]));
    return {
      queryClicks: sum(rows, "clicks"),
      brandClicks: sum(brandRows, "clicks"),
      brandImpressions: sum(brandRows, "impressions"),
      nonBrandClicks: sum(otherRows, "clicks"),
      nonBrandImpressions: sum(otherRows, "impressions"),
    };
  };
  const now = { ...totals(current), ...split(current) };
  const before = { ...totals(previous), ...split(previous) };
  const coverage = (period) => (period.clicks > 0 ? period.queryClicks / period.clicks : NaN);

  const out = [];
  out.push(`# SEO data pack: ${raw.site}`);
  out.push("");
  out.push(`Window: ${windows.current.start} to ${windows.current.end} (${windows.label}) against ${windows.previous.start} to ${windows.previous.end}. Search Console final data.`);
  out.push(`Generated: ${generatedAt}`);
  out.push(`Brand terms: ${brand.length > 0 ? brand.join(", ") : "none given, so every query counts as non-brand"}`);
  const capped = ["current", "previous"].flatMap((period) =>
    Object.entries(raw[period]).filter(([, value]) => value.capped).map(([name]) => `${period} ${name}`),
  );
  if (capped.length > 0) out.push(`Capped exports (more rows exist): ${capped.join(", ")}.`);
  out.push("");

  out.push("## Totals");
  out.push("");
  out.push(
    table(
      ["Metric", "Current", "Previous", "Change"],
      [
        ["Clicks", num(now.clicks), num(before.clicks), delta(now.clicks, before.clicks)],
        ["Impressions", num(now.impressions), num(before.impressions), delta(now.impressions, before.impressions)],
        ["Average position", pos(now.position), pos(before.position), ""],
        ["Clicks visible in query rows", pct(coverage(now)), pct(coverage(before)), ""],
        ["Brand clicks (query rows)", num(now.brandClicks), num(before.brandClicks), delta(now.brandClicks, before.brandClicks)],
        ["Non-brand clicks (query rows)", num(now.nonBrandClicks), num(before.nonBrandClicks), delta(now.nonBrandClicks, before.nonBrandClicks)],
        ["Non-brand impressions (query rows)", num(now.nonBrandImpressions), num(before.nonBrandImpressions), delta(now.nonBrandImpressions, before.nonBrandImpressions)],
      ],
    ),
  );

  const lanesNow = laneStats(current.pages.rows, host, windows.days);
  const lanesBefore = laneStats(previous.pages.rows, host, windows.days);
  out.push("## Lanes");
  out.push("");
  out.push("URLs with at least one impression, grouped by path. Clicks per URL are normalised to 30 days.");
  out.push("");
  out.push(
    table(
      ["Lane", "URLs", "Clicks", "Previous clicks", "Impressions", "Clicks per URL per month"],
      [...lanesNow.entries()]
        .sort((a, b) => b[1].clicks - a[1].clicks || b[1].impressions - a[1].impressions)
        .map(([lane, entry]) => [
          lane,
          num(entry.urls),
          num(entry.clicks),
          num(lanesBefore.get(lane)?.clicks ?? 0),
          num(entry.impressions),
          entry.clicksPerUrlMonth.toFixed(2),
        ]),
    ),
  );

  const previousPages = new Map(previous.pages.rows.map((row) => [row.keys[0], row]));
  const currentPages = new Map(current.pages.rows.map((row) => [row.keys[0], row]));
  out.push("## Top pages");
  out.push("");
  out.push(
    table(
      ["Page", "Clicks", "Previous", "Change", "Impressions", "Position"],
      [...current.pages.rows]
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .slice(0, 15)
        .map((row) => {
          const before = previousPages.get(row.keys[0])?.clicks ?? 0;
          return [pathOf(row.keys[0], host), num(row.clicks), num(before), delta(row.clicks, before), num(row.impressions), pos(row.position)];
        }),
    ),
  );

  out.push("## Pages losing clicks");
  out.push("");
  out.push(
    table(
      ["Page", "Clicks", "Previous", "Impressions", "Previous impressions"],
      previous.pages.rows
        .filter((row) => row.clicks >= 3 && (currentPages.get(row.keys[0])?.clicks ?? 0) <= row.clicks / 2)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)
        .map((row) => {
          const nowRow = currentPages.get(row.keys[0]);
          return [pathOf(row.keys[0], host), num(nowRow?.clicks ?? 0), num(row.clicks), num(nowRow?.impressions ?? 0), num(row.impressions)];
        }),
    ),
  );

  const queriesNow = aggregateQueries(current.queries.rows, isBrand);
  const queriesBefore = aggregateQueries(previous.queries.rows, isBrand);
  out.push("## Non-brand queries with demand");
  out.push("");
  out.push(`Queries with at least ${minImpressions} impressions, aggregated across pages. Flags are heuristics that pick rows to inspect, not findings.`);
  out.push("");
  out.push(
    table(
      ["Query", "Impressions", "Clicks", "CTR", "Position", "Top page", "Flags"],
      [...queriesNow.values()]
        .filter((entry) => entry.impressions >= minImpressions)
        .sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query))
        .slice(0, 30)
        .map((entry) => [
          entry.query.replaceAll("|", "/"),
          num(entry.impressions),
          num(entry.clicks),
          pct(entry.ctr),
          pos(entry.position),
          pathOf(entry.topPage, host),
          queryFlags(entry, queriesBefore),
        ]),
    ),
  );

  const countriesBefore = new Map(previous.countries.rows.map((row) => [row.keys[0], row]));
  out.push("## Countries");
  out.push("");
  out.push(
    table(
      ["Country", "Clicks", "Previous", "Impressions", "Previous impressions", "Position"],
      [...current.countries.rows]
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 8)
        .map((row) => {
          const before = countriesBefore.get(row.keys[0]);
          return [row.keys[0].toUpperCase(), num(row.clicks), num(before?.clicks ?? 0), num(row.impressions), num(before?.impressions ?? 0), pos(row.position)];
        }),
    ),
  );

  if (liveChecks.length > 0) {
    out.push("## Live checks");
    out.push("");
    out.push(
      table(
        ["URL", "Status", "Redirect or canonical", "Robots", "Verdict"],
        liveChecks.map((check) => [check.url, String(check.status), check.target || "", check.robots || "", check.verdict]),
      ),
    );
  }

  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

async function liveCheck(url) {
  try {
    const response = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; seo-growth-workspace)" } });
    const location = response.headers.get("location") ?? "";
    const headerRobots = response.headers.get("x-robots-tag") ?? "";
    if (response.status !== 200) {
      return { url, status: response.status, target: location, robots: headerRobots, verdict: [301, 308].includes(response.status) ? "permanent redirect" : [302, 303, 307].includes(response.status) ? "temporary redirect" : "check" };
    }
    const html = await response.text();
    const canonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.exec(html)?.[0];
    const canonicalHref = canonical ? /href=["']([^"']+)["']/i.exec(canonical)?.[1] ?? "" : "";
    const metaRobots = /<meta[^>]+name=["']robots["'][^>]*>/i.exec(html)?.[0];
    const robots = [headerRobots, metaRobots ? /content=["']([^"']+)["']/i.exec(metaRobots)?.[1] ?? "" : ""].filter(Boolean).join("; ");
    const noindex = /noindex/i.test(robots);
    const selfCanonical = canonicalHref === "" || canonicalHref.replace(/\/$/, "") === url.replace(/\/$/, "");
    const plainText = !/html/i.test(response.headers.get("content-type") ?? "html");
    return { url, status: 200, target: canonicalHref, robots, verdict: noindex || (!selfCanonical && !plainText) ? "check" : "ok" };
  } catch (error) {
    return { url, status: "error", target: "", robots: "", verdict: `fetch failed: ${error.message}` };
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const brandArg = argValue("--brand");
  if (brandArg === null) throw new Error(`--brand is required.\n\n${usage()}`);
  const brandTerms = brandArg.split(",");
  const minImpressions = Number(argValue("--min-impressions") ?? DEFAULT_MIN_IMPRESSIONS);
  const fromRaw = argValue("--from-raw");
  const out = argValue("--out");

  let raw;
  if (fromRaw) {
    raw = JSON.parse(await readFile(fromRaw, "utf-8"));
  } else {
    const site = argValue("--site");
    if (!site) throw new Error(usage());
    const days = Number(argValue("--days") ?? DEFAULT_DAYS);
    const end = argValue("--end") ?? addDays(isoDate(new Date()), -3);
    const windows = windowsFor({ end, days, month: argValue("--month") });
    raw = await fetchRaw({ site, windows, credentialsDir: argValue("--credentials-dir") ?? process.env.GSC_CREDENTIALS_DIR });
  }

  const urls = (argValue("--urls") ?? "").split(",").map((url) => url.trim()).filter(Boolean);
  const liveChecks = [];
  for (const url of urls) liveChecks.push(await liveCheck(url));

  const pack = buildPack(raw, { brandTerms, minImpressions, generatedAt: new Date().toISOString(), liveChecks });
  if (out) {
    await writeFile(`${out}.json`, `${JSON.stringify(raw)}\n`);
    await writeFile(`${out}.md`, pack);
    console.error(`Wrote ${out}.json and ${out}.md`);
  }
  process.stdout.write(pack);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
