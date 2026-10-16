import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { getAccessToken } from "../../skills/growth/seo-growth-workspace/scripts/gsc-fetch.mjs";

test("Search Console auth precedence, JWT and OAuth compatibility", async (t) => {
  const envKeys = ["GSC_ACCESS_TOKEN", "GSC_SERVICE_ACCOUNT_JSON", "GSC_CREDENTIALS_DIR", "GSC_CLIENT_ID", "GSC_CLIENT_SECRET", "GSC_REFRESH_TOKEN"];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const dir = await mkdtemp(path.join(tmpdir(), "gsc-auth-"));
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const account = { client_email: "test@example.invalid", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
  const clear = () => envKeys.forEach((key) => delete process.env[key]);
  try {
    clear();
    await t.test("access token wins without touching any credential source", async () => {
      process.env.GSC_ACCESS_TOKEN = "direct";
      process.env.GSC_SERVICE_ACCOUNT_JSON = "invalid";
      globalThis.fetch = () => { throw new Error("unexpected exchange"); };
      assert.equal(await getAccessToken("/absent"), "direct");
      clear();
    });
    const jwtExchange = async (url, options) => {
      assert.equal(url, "https://oauth2.googleapis.com/token");
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
      const [header, claims, signature] = options.body.get("assertion").split(".");
      assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), { alg: "RS256", typ: "JWT" });
      const payload = JSON.parse(Buffer.from(claims, "base64url"));
      assert.equal(payload.iss, account.client_email);
      assert.equal(payload.scope, "https://www.googleapis.com/auth/webmasters.readonly");
      assert.equal(payload.aud, url);
      assert.equal(payload.exp - payload.iat, 3600);
      assert.ok(Math.abs(payload.iat - Date.now() / 1000) < 5);
      assert.ok(verify("RSA-SHA256", Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, "base64url")));
      return Response.json({ access_token: "service" });
    };
    await t.test("full JSON env and credential-directory file sign a valid JWT", async () => {
      globalThis.fetch = jwtExchange;
      process.env.GSC_SERVICE_ACCOUNT_JSON = JSON.stringify(account);
      assert.equal(await getAccessToken("/absent"), "service");
      clear();
      await writeFile(path.join(dir, "service-account.json"), JSON.stringify(account));
      assert.equal(await getAccessToken(dir), "service");
      await rm(path.join(dir, "service-account.json"));
    });
    await t.test("legacy OAuth directory still precedes OAuth env", async () => {
      Object.assign(process.env, { GSC_CLIENT_ID: "env-id", GSC_CLIENT_SECRET: "env-secret", GSC_REFRESH_TOKEN: "env-refresh" });
      await writeFile(path.join(dir, "client_secret.json"), JSON.stringify({ installed: { client_id: "dir-id", client_secret: "dir-secret" } }));
      await writeFile(path.join(dir, "token.json"), JSON.stringify({ refresh_token: "dir-refresh" }));
      globalThis.fetch = async (_url, options) => {
        assert.equal(options.body.get("grant_type"), "refresh_token");
        assert.equal(options.body.get("client_id"), "dir-id");
        assert.equal(options.body.get("client_secret"), "dir-secret");
        assert.equal(options.body.get("refresh_token"), "dir-refresh");
        return Response.json({ access_token: "oauth-dir" });
      };
      assert.equal(await getAccessToken(dir), "oauth-dir");
      globalThis.fetch = async (_url, options) => {
        assert.equal(options.body.get("client_id"), "env-id");
        return Response.json({ access_token: "oauth-env" });
      };
      assert.equal(await getAccessToken(), "oauth-env");
      clear();
    });
    await t.test("errors do not expose service-account JSON or token response", async () => {
      process.env.GSC_SERVICE_ACCOUNT_JSON = "private-invalid-json";
      await assert.rejects(getAccessToken(), { message: "Invalid JSON in GSC_SERVICE_ACCOUNT_JSON" });
      process.env.GSC_SERVICE_ACCOUNT_JSON = JSON.stringify(account);
      globalThis.fetch = async () => new Response("private-server-response", { status: 403 });
      await assert.rejects(getAccessToken(), { message: "GSC service-account exchange failed with status 403" });
      globalThis.fetch = async () => Response.json({});
      await assert.rejects(getAccessToken(), { message: "GSC service-account exchange did not return an access token" });
    });
  } finally {
    clear();
    for (const [key, value] of Object.entries(originalEnv)) if (value !== undefined) process.env[key] = value;
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true });
  }
});
