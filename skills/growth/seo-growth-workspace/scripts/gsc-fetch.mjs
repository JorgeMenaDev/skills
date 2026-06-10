#!/usr/bin/env bun

import { writeFile } from "node:fs/promises";

function usage() {
  return `Usage:
  GSC_ACCESS_TOKEN=<access-token> bun gsc-fetch.mjs --site https://example.com/ --start 2026-01-01 --end 2026-03-31 [--output gsc.json]

  # Or use refresh-token auth:
  GSC_CLIENT_ID=... GSC_CLIENT_SECRET=... GSC_REFRESH_TOKEN=... bun gsc-fetch.mjs --site https://example.com/ --start 2026-01-01 --end 2026-03-31 [--output gsc.json]

Fetches Google Search Console searchAnalytics.query data for query+page rows.

Auth:
  - Uses GSC_ACCESS_TOKEN first when present.
  - Otherwise exchanges GSC_CLIENT_ID, GSC_CLIENT_SECRET, and GSC_REFRESH_TOKEN for an access token.
  - Required OAuth scope: webmasters.readonly.
  - This script intentionally does not print credentials or token response bodies.
  - For browser-only access, export manually and use gsc-opportunities.mjs instead.`;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
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

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const site = argValue("--site");
  const startDate = argValue("--start");
  const endDate = argValue("--end");
  const output = argValue("--output");

  if (!site || !startDate || !endDate) throw new Error(usage());
  const token = await getAccessToken();
  if (!token) throw new Error(usage());

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    site,
  )}/searchAnalytics/query`;

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
      rowLimit: 25000,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GSC request failed ${response.status}: ${body}`);
  }

  const payload = await response.json();
  const text = `${JSON.stringify(payload, null, 2)}\n`;

  if (output) {
    await writeFile(output, text);
    console.log(`Wrote ${payload.rows?.length ?? 0} rows to ${output}`);
    return;
  }

  process.stdout.write(text);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
