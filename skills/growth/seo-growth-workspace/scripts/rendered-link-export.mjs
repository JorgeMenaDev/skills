#!/usr/bin/env node

import { lstat, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const LIMITS = { files: 50_000, fileBytes: 5_000_000 };
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const LANDMARKS = new Set(["head", "nav", "main", "footer", "aside"]);
const INERT_ELEMENTS = new Set(["script", "style", "template"]);

const usage = () => `Usage:
  node rendered-link-export.mjs --build-dir <path-to-.next> --origin <https://site-origin> [--output <file>] [--stamp <value>]

Exports Next.js App Router prerendered HTML to the pages[]/links[] JSON contract.
Output defaults to stdout. The optional stamp is reproduced verbatim; no date is created.

Options:
  --build-dir  Local Next.js .next directory (required).
  --origin     Production HTTP(S) origin without path, query, or fragment (required).
  --output     Write JSON to this file instead of stdout.
  --stamp      Optional caller-supplied export date/evidence label.
  --help       Show this help.

Safety and bounds:
  Offline, dependency-free, and read-only on the build directory. Symlinks are refused.
  Maximum ${LIMITS.files} HTML files and ${LIMITS.fileBytes} bytes per HTML file.`;

const option = (name) => {
  const positions = process.argv.reduce((all, value, index) => value === name ? [...all, index] : all, []);
  if (positions.length > 1) throw new Error(`${name} may be supplied only once.`);
  if (!positions.length) return null;
  const value = process.argv[positions[0] + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${name}.`);
  return value;
};

const normalizeOrigin = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`--origin must be a valid absolute HTTP(S) origin: ${JSON.stringify(value)}.`);
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("--origin must be an HTTP(S) origin without credentials, path, query, or fragment.");
  }
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  return url.origin;
};

const normalizeUrl = (value) => {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  const params = [...url.searchParams.entries()].sort(([ak, av], [bk, bv]) => byCodePoint(ak, bk) || byCodePoint(av, bv));
  url.search = "";
  for (const [key, item] of params) url.searchParams.append(key, item);
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
};

const readJson = async (file, required = false) => {
  try {
    const info = await lstat(file);
    if (info.isSymbolicLink()) throw new Error(`Refusing symlink: ${file}.`);
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (!required && error.code === "ENOENT") return null;
    throw new Error(`Cannot read manifest ${file}: ${error.message}`);
  }
};

const scanHtml = async (directory) => {
  const found = [];
  const walk = async (current) => {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    entries.sort((a, b) => byCodePoint(a.name, b.name));
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Refusing symlink inside build directory: ${file}.`);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name.endsWith(".html")) {
        found.push(file);
        if (found.length > LIMITS.files) throw new Error(`Build contains more than ${LIMITS.files} HTML files; narrow the build or split the export.`);
      }
    }
  };
  await walk(directory);
  return found;
};

const fileRoute = (appDir, file) => {
  const relative = path.relative(appDir, file).split(path.sep).join("/").replace(/\.html$/, "");
  return relative === "index" ? "/" : `/${relative}`;
};

const routeFile = (appDir, route) => path.join(appDir, route === "/" ? "index.html" : `${route.replace(/^\//, "")}.html`);
const decode = (value) => value
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === "x" ? Number.parseInt(code.slice(1), 16) : Number(code)))
  .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi, (entity) => ({ "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" })[entity.toLowerCase()]);
const attrs = (source) => Object.fromEntries([...source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)].map((match) => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4] ?? "")]));
const visibleText = (html) => decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const parseHtml = (html, source) => {
  const tokens = [...html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>/g)];
  const stack = [];
  const links = [];
  let canonicalUrl;
  let indexable = true;
  for (let index = 0; index < tokens.length; index += 1) {
    const raw = tokens[index][0];
    const closing = /^<\//.test(raw);
    const name = raw.match(/^<\/?\s*([^\s/>]+)/)?.[1].toLowerCase();
    if (!name || raw.startsWith("<!")) continue;
    if (!closing && INERT_ELEMENTS.has(name)) {
      let depth = 1;
      while (depth && index + 1 < tokens.length) {
        index += 1;
        const inertRaw = tokens[index][0];
        const inertName = inertRaw.match(/^<\/?\s*([^\s/>]+)/)?.[1].toLowerCase();
        if (inertName !== name) continue;
        if (/^<\//.test(inertRaw)) depth -= 1;
        else if (!/\/$/.test(inertRaw)) depth += 1;
      }
      continue;
    }
    if (closing) {
      const position = stack.lastIndexOf(name);
      if (position >= 0) stack.splice(position);
      continue;
    }
    const attributes = attrs(raw.slice(raw.indexOf(name) + name.length, -1));
    if (name === "meta" && (attributes.name ?? "").toLowerCase() === "robots" && /(?:^|,)\s*noindex\b/i.test(attributes.content ?? "")) indexable = false;
    if (name === "link" && (attributes.rel ?? "").toLowerCase().split(/\s+/).includes("canonical") && attributes.href) canonicalUrl = normalizeUrl(new URL(attributes.href, source));
    if (name === "a" && attributes.href) {
      const href = attributes.href.trim();
      if (href && !href.startsWith("#") && !/^(?:mailto|tel|javascript):/i.test(href)) {
        let target;
        try {
          target = normalizeUrl(new URL(href, source));
        } catch {
          target = null;
        }
        if (target && /^https?:/.test(target)) {
          const close = tokens.slice(index + 1).find((token) => /^<\/\s*a\b/i.test(token[0]));
          const contentEnd = close ? close.index : tokens[index].index + raw.length;
          links.push({
            source,
            target,
            anchor: visibleText(html.slice(tokens[index].index + raw.length, contentEnd)),
            placement: [...stack].reverse().find((tag) => LANDMARKS.has(tag)) ?? "body",
            rel: [...new Set((attributes.rel ?? "").toLowerCase().split(/\s+/).filter(Boolean))].sort(byCodePoint),
          });
        }
      }
    }
    if (!/\/$/.test(raw) && !new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]).has(name)) stack.push(name);
  }
  return { canonicalUrl, indexable, links };
};

const main = async () => {
  if (process.argv.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const allowed = new Set(["--build-dir", "--origin", "--output", "--stamp"]);
  const unknown = process.argv.slice(2).filter((value) => value.startsWith("--") && !allowed.has(value));
  if (unknown.length) throw new Error(`Unknown option ${unknown[0]}. Run with --help for usage.`);
  const buildDir = option("--build-dir");
  const origin = normalizeOrigin(option("--origin"));
  const output = option("--output");
  const stamp = option("--stamp");
  if (!buildDir) throw new Error("--build-dir is required. Run with --help for usage.");
  const buildInfo = await lstat(buildDir).catch((error) => { throw new Error(`Cannot inspect --build-dir ${buildDir}: ${error.message}`); });
  if (buildInfo.isSymbolicLink() || !buildInfo.isDirectory()) throw new Error("--build-dir must be a real directory, not a file or symlink.");
  const absoluteBuildDir = path.resolve(buildDir);
  const appDir = path.join(absoluteBuildDir, "server", "app");
  const prerender = await readJson(path.join(absoluteBuildDir, "prerender-manifest.json"), true);
  const appRoutes = await readJson(path.join(absoluteBuildDir, "app-path-routes-manifest.json"), true);
  const scanned = await scanHtml(appDir);
  const scannedSet = new Set(scanned);
  const declaredRoutes = Object.keys(prerender?.routes ?? {}).filter((route) => !/\.[^/]+$/.test(route)).sort(byCodePoint);
  const manifested = declaredRoutes.map((route) => ({ route, file: routeFile(appDir, route) }));
  const discovered = manifested.filter(({ file }) => scannedSet.has(file));
  const represented = new Set(discovered.map(({ file }) => file));
  for (const file of scanned) if (!represented.has(file) && !file.endsWith(`${path.sep}_not-found.html`)) discovered.push({ route: fileRoute(appDir, file), file });
  discovered.sort((a, b) => byCodePoint(a.route, b.route));

  const missingHtml = manifested.filter(({ file }) => !scannedSet.has(file)).map(({ route }) => route);
  const pagePatterns = [...new Set(Object.entries(appRoutes ?? {}).filter(([key]) => key.endsWith("/page")).map(([, route]) => route).filter((route) => route !== "/_not-found"))].sort(byCodePoint);
  const capturedPatterns = new Set(discovered.flatMap(({ route }) => {
    const manifestRoute = prerender?.routes?.[route];
    return [route, manifestRoute?.srcRoute].filter(Boolean);
  }));
  const missingRoutes = pagePatterns.filter((route) => !capturedPatterns.has(route));
  const pages = [];
  const links = [];
  const unparseableHtml = [];
  for (const { route, file } of discovered) {
    const info = await stat(file);
    if (info.size > LIMITS.fileBytes) throw new Error(`HTML file ${file} is ${info.size} bytes, over the ${LIMITS.fileBytes}-byte limit; reduce or exclude it before export.`);
    const source = normalizeUrl(new URL(route, `${origin}/`));
    let parsed;
    try {
      parsed = parseHtml(await readFile(file, "utf8"), source);
    } catch (error) {
      unparseableHtml.push(`${route} (${error.message})`);
      continue;
    }
    pages.push({ url: source, status: 200, indexable: parsed.indexable, entryPoint: route === "/", moneyPage: false, ...(parsed.canonicalUrl ? { canonicalUrl: parsed.canonicalUrl } : {}) });
    links.push(...parsed.links);
  }
  pages.sort((a, b) => byCodePoint(a.url, b.url));
  links.sort((a, b) => byCodePoint(a.source, b.source) || byCodePoint(a.target, b.target) || byCodePoint(a.anchor, b.anchor) || byCodePoint(a.placement, b.placement) || byCodePoint(a.rel.join(" "), b.rel.join(" ")));
  const gaps = [];
  if (missingRoutes.length) gaps.push(`${missingRoutes.length} dynamic/server-rendered routes missing prerendered HTML: ${missingRoutes.join(", ")}`);
  if (missingHtml.length) gaps.push(`${missingHtml.length} declared prerender routes had missing HTML: ${missingHtml.join(", ")}`);
  if (unparseableHtml.length) gaps.push(`${unparseableHtml.length} HTML files could not be parsed: ${unparseableHtml.join(", ")}`);
  const coverage = { complete: gaps.length === 0, note: gaps.length ? gaps.join("; ") : `All ${pages.length} page routes were present as prerendered HTML.` };
  const routeCount = new Set([...discovered.map(({ route }) => route), ...missingRoutes, ...missingHtml]).size;
  const provenance = { buildDir: absoluteBuildDir, framework: "next-app-router", ...(stamp === null ? {} : { exportDate: stamp }), fileCount: pages.length, routeCount };
  const json = `${JSON.stringify({ coverage, provenance, siteOrigins: [`${origin}/`], pages, links }, null, 2)}\n`;
  if (output) await writeFile(output, json);
  else process.stdout.write(json);
};

main().catch((error) => {
  process.stderr.write(`rendered-link-export: ${error.message}\n`);
  process.exitCode = 1;
});
