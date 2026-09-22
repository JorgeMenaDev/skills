#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PAGE_SIZE = 25000; // GSC searchAnalytics.query per-request maximum
const DEFAULT_MAX_ROWS = 100000;
export const DIMENSIONS = ["query", "page", "country", "device", "date", "searchAppearance"];
const OPERATORS = ["equals", "notEquals", "contains", "notContains", "includingRegex", "excludingRegex"];

function usage() {
  return `Usage:
  GSC_CREDENTIALS_DIR=~/creds/acme-gsc node gsc-fetch.mjs --site sc-domain:example.com \\
      --start 2026-01-01 --end 2026-03-31 [--dimensions query,page] [--filter page:contains:/blog/] \\
      [--data-state final|all] [--output gsc.json] [--max-rows ${DEFAULT_MAX_ROWS}]

--site accepts both GSC property forms: sc-domain:example.com (domain property) and
https://example.com/ (URL-prefix property). The wrong form for the verified property yields a 403.

--dimensions  Comma list from: ${DIMENSIONS.join(", ")}. Default query,page.
              Pass "none" for one aggregated totals row.
--filter      dimension:operator:expression, repeatable (all filters must match).
              Operators: ${OPERATORS.join(", ")}.
--data-state  final (default, settled data) or all (includes fresh, still-changing days).

Search Console returns top rows, not a guaranteed complete dataset, and withholds
anonymized queries. Pages through results (25,000 rows per request) until complete or
--max-rows is reached; a note is printed to stderr if the cap is hit.

Auth (first match wins):
  - GSC_ACCESS_TOKEN.
  - --credentials-dir / GSC_CREDENTIALS_DIR: a directory holding client_secret.json
    (Google OAuth client, "installed" or "web" shape) and token.json (with refresh_token).
  - GSC_CLIENT_ID + GSC_CLIENT_SECRET + GSC_REFRESH_TOKEN.
  Secrets are read from env vars or credential files, never from CLI flags, and are never
  printed. Required OAuth scope: webmasters.readonly. First-time setup: gsc-oauth.mjs.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}\n\n${usage()}`);
  }
  return value;
}

function argValues(name) {
  const values = [];
  process.argv.forEach((arg, index) => {
    if (arg === name) values.push(process.argv[index + 1]);
  });
  return values;
}

async function readJsonFile(filePath) {
  const text = await readFile(filePath, "utf-8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

async function credentialsFromDir(dir) {
  const clientRaw = await readJsonFile(path.join(dir, "client_secret.json"));
  const cfg = clientRaw.installed ?? clientRaw.web ?? clientRaw;
  const tokenRaw = await readJsonFile(path.join(dir, "token.json"));
  const clientId = cfg.client_id;
  const clientSecret = cfg.client_secret;
  const refreshToken = tokenRaw.refresh_token ?? tokenRaw.refreshToken;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      `credentials dir ${dir} must contain client_secret.json (installed/web with client_id + client_secret) and token.json (with refresh_token)`,
    );
  }
  return { clientId, clientSecret, refreshToken };
}

export async function getAccessToken(credentialsDir = process.env.GSC_CREDENTIALS_DIR) {
  if (process.env.GSC_ACCESS_TOKEN) return process.env.GSC_ACCESS_TOKEN;

  let clientId = process.env.GSC_CLIENT_ID;
  let clientSecret = process.env.GSC_CLIENT_SECRET;
  let refreshToken = process.env.GSC_REFRESH_TOKEN;
  if (credentialsDir) ({ clientId, clientSecret, refreshToken } = await credentialsFromDir(credentialsDir));
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("No Search Console credentials: set GSC_CREDENTIALS_DIR (or GSC_ACCESS_TOKEN / GSC_CLIENT_* env vars).");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`GSC OAuth refresh failed with status ${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error("GSC OAuth refresh did not return an access token");
  return payload.access_token;
}

export function parseDimensions(value) {
  if (!value || value === "none") return [];
  const dimensions = value.split(",").map((item) => item.trim()).filter(Boolean);
  const unknown = dimensions.filter((item) => !DIMENSIONS.includes(item));
  if (unknown.length > 0) throw new Error(`Unknown dimension(s): ${unknown.join(", ")}. Allowed: ${DIMENSIONS.join(", ")}`);
  return dimensions;
}

export function parseFilter(value) {
  const [dimension, operator, ...rest] = value.split(":");
  const expression = rest.join(":");
  if (!DIMENSIONS.includes(dimension) || !OPERATORS.includes(operator) || expression === "") {
    throw new Error(`Invalid --filter "${value}". Shape: dimension:operator:expression`);
  }
  return { dimension, operator, expression };
}

// Fetches every row for one request shape, paging with startRow.
export async function queryAll({ site, startDate, endDate, dimensions = [], filters = [], dataState = "final", token, maxRows = DEFAULT_MAX_ROWS }) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const rows = [];
  let startRow = 0;
  let responseAggregationType = null;
  let capped = false;

  while (rows.length < maxRows) {
    const rowLimit = Math.min(PAGE_SIZE, maxRows - rows.length);
    const body = { startDate, endDate, dimensions, rowLimit, startRow, dataState };
    if (filters.length > 0) body.dimensionFilterGroups = [{ groupType: "and", filters }];
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`GSC request failed ${response.status}: ${await response.text()}`);
    const payload = await response.json();
    const page = Array.isArray(payload.rows) ? payload.rows : [];
    responseAggregationType ??= payload.responseAggregationType ?? null;
    rows.push(...page);
    startRow += page.length;
    if (page.length < rowLimit || dimensions.length === 0) break;
    capped = rows.length >= maxRows;
  }

  return { site, startDate, endDate, dimensions, filters, dataState, responseAggregationType, capped, rows };
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const site = argValue("--site");
  const startDate = argValue("--start");
  const endDate = argValue("--end");
  if (!site || !startDate || !endDate) throw new Error(usage());
  const dimensions = parseDimensions(argValue("--dimensions") ?? "query,page");
  const filters = argValues("--filter").map(parseFilter);
  const dataState = argValue("--data-state") ?? "final";
  if (!["final", "all"].includes(dataState)) throw new Error("--data-state must be final or all");
  const maxRows = Number(argValue("--max-rows") ?? DEFAULT_MAX_ROWS);
  if (!Number.isInteger(maxRows) || maxRows < 1) throw new Error("--max-rows must be a positive integer");

  const token = await getAccessToken(argValue("--credentials-dir") ?? process.env.GSC_CREDENTIALS_DIR);
  const result = await queryAll({ site, startDate, endDate, dimensions, filters, dataState, token, maxRows });
  if (result.capped) {
    console.error(`Note: stopped at --max-rows (${maxRows}); more rows may exist. Narrow the range or raise the cap.`);
  }

  const text = `${JSON.stringify(result, null, 2)}\n`;
  const output = argValue("--output");
  if (output) {
    await writeFile(output, text);
    console.log(`Wrote ${result.rows.length} rows to ${output}`);
    return;
  }
  process.stdout.write(text);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
