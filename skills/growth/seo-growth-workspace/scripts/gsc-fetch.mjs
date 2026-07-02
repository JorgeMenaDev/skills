#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const PAGE_SIZE = 25000; // GSC searchAnalytics.query per-request maximum
const DEFAULT_MAX_ROWS = 100000;

function usage() {
  return `Usage:
  GSC_ACCESS_TOKEN=<access-token> node gsc-fetch.mjs --site https://example.com/ --start 2026-01-01 --end 2026-03-31 [--output gsc.json] [--max-rows ${DEFAULT_MAX_ROWS}]

  # Or use refresh-token auth:
  GSC_CLIENT_ID=... GSC_CLIENT_SECRET=... GSC_REFRESH_TOKEN=... node gsc-fetch.mjs --site https://example.com/ --start 2026-01-01 --end 2026-03-31 [--output gsc.json]

Fetches Google Search Console searchAnalytics.query data for query+page rows.
Pages through results with startRow (25,000 rows per request) until the export is
complete or --max-rows (default ${DEFAULT_MAX_ROWS}) is reached; a note is printed
to stderr if the cap is hit.

Auth:
  - Credentials are read from environment variables only, never from CLI flags.
  - Uses GSC_ACCESS_TOKEN first when present.
  - Otherwise exchanges GSC_CLIENT_ID, GSC_CLIENT_SECRET, and GSC_REFRESH_TOKEN for an access token.
  - Required OAuth scope: webmasters.readonly.
  - This script intentionally does not print credentials or token response bodies.
  - For browser-only access, export manually and use gsc-opportunities.mjs instead.`;
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

async function getAccessToken() {
  if (process.env.GSC_ACCESS_TOKEN) return process.env.GSC_ACCESS_TOKEN;

  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;
  const refreshToken = process.env.GSC_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

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

  if (!response.ok) {
    throw new Error(`GSC OAuth refresh failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("GSC OAuth refresh did not return an access token");
  }

  return payload.access_token;
}

async function fetchPage({ endpoint, token, startDate, endDate, rowLimit, startRow }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit,
      startRow,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GSC request failed ${response.status}: ${body}`);
  }

  return response.json();
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const site = argValue("--site");
  const startDate = argValue("--start");
  const endDate = argValue("--end");
  const output = argValue("--output");
  const maxRows = Number(argValue("--max-rows") ?? DEFAULT_MAX_ROWS);
  if (!Number.isInteger(maxRows) || maxRows < 1) {
    throw new Error("--max-rows must be a positive integer");
  }

  if (!site || !startDate || !endDate) throw new Error(usage());
  const token = await getAccessToken();
  if (!token) throw new Error(usage());

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    site,
  )}/searchAnalytics/query`;

  const rows = [];
  let startRow = 0;
  let responseAggregationType = null;
  let lastPageWasFull = false;

  while (rows.length < maxRows) {
    const rowLimit = Math.min(PAGE_SIZE, maxRows - rows.length);
    const payload = await fetchPage({
      endpoint,
      token,
      startDate,
      endDate,
      rowLimit,
      startRow,
    });
    const page = Array.isArray(payload.rows) ? payload.rows : [];
    responseAggregationType ??= payload.responseAggregationType ?? null;
    rows.push(...page);
    startRow += page.length;
    lastPageWasFull = page.length === rowLimit && page.length > 0;
    if (page.length < rowLimit) break;
  }

  if (lastPageWasFull && rows.length >= maxRows) {
    console.error(
      `Note: stopped at --max-rows (${maxRows}); more rows may exist. Re-run with a higher --max-rows or a narrower date range for a complete export.`,
    );
  }

  const result = { responseAggregationType, rows };
  const text = `${JSON.stringify(result, null, 2)}\n`;

  if (output) {
    await writeFile(output, text);
    console.log(`Wrote ${rows.length} rows to ${output}`);
    return;
  }

  process.stdout.write(text);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
