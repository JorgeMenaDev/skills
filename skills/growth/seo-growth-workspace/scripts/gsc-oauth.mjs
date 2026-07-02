#!/usr/bin/env node

import { chmod, writeFile } from "node:fs/promises";

const scope = "https://www.googleapis.com/auth/webmasters.readonly";

function usage() {
  return `Usage:
  # 1. Generate a Google OAuth consent URL.
  GSC_CLIENT_ID=... node gsc-oauth.mjs --print-auth-url [--redirect-uri http://localhost:8080/oauth2callback]

  # 2. Exchange the returned code into a local env file.
  GSC_CLIENT_ID=... GSC_CLIENT_SECRET=... node gsc-oauth.mjs --code <returned-code> --output .env.local [--redirect-uri http://localhost:8080/oauth2callback] [--force]

The client secret is read only from the GSC_CLIENT_SECRET environment variable (never from a CLI
flag, so it cannot leak into shell history or process lists). The output file is written with
0600 permissions and is never overwritten unless --force is passed.

This helper never prints credential values or token response bodies. Use the output file with gsc-fetch.mjs.`;
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

function envLine(name, value) {
  return `${name}=${JSON.stringify(value)}\n`;
}

function authUrl({ clientId, redirectUri }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeCode({ clientId, clientSecret, code, redirectUri }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `GSC OAuth code exchange failed with status ${response.status}`,
    );
  }

  const payload = await response.json();
  if (!payload.refresh_token) {
    throw new Error(
      "GSC OAuth exchange did not return a refresh token. Re-run the auth URL with prompt=consent or revoke the prior grant, then try again.",
    );
  }

  return payload.refresh_token;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const clientId = argValue("--client-id") ?? process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;
  const redirectUri =
    argValue("--redirect-uri") ?? "http://localhost:8080/oauth2callback";
  const code = argValue("--code");
  const output = argValue("--output");
  const force = process.argv.includes("--force");

  if (process.argv.includes("--print-auth-url")) {
    if (!clientId) throw new Error("Missing GSC_CLIENT_ID");
    console.log(authUrl({ clientId, redirectUri }));
    return;
  }

  if (!clientId || !clientSecret || !code || !output) throw new Error(usage());

  const refreshToken = await exchangeCode({
    clientId,
    clientSecret,
    code,
    redirectUri,
  });
  const content = [
    envLine("GSC_CLIENT_ID", clientId),
    envLine("GSC_CLIENT_SECRET", clientSecret),
    envLine("GSC_REFRESH_TOKEN", refreshToken),
  ].join("");

  await writeFile(output, content, { flag: force ? "w" : "wx", mode: 0o600 });
  // mode above only applies on creation; enforce it on --force overwrites too.
  await chmod(output, 0o600);
  console.log(`Wrote GSC OAuth env values to ${output} (mode 0600)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
