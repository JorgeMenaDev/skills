#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";

const LIMITS = { inputBytes: 5_000_000, pages: 50_000, links: 500_000, siteOrigins: 200 };
const DAMPING = 0.85;
const ITERATIONS = 20;

const usage = () => `Usage:
  node link-graph-analyzer.mjs --input <pages-links.json> [--stamp <value>]

Reads one local JSON file and writes a deterministic Markdown report to stdout.
The input object must contain coverage, pages[], and links[]; see
references/internal-linking.md for the complete contract. JSON is the only v1 input.

Options:
  --input   Approved local pages[]/links[] JSON (required).
  --stamp   Optional caller-supplied evidence label, reproduced verbatim.
  --help    Show this help.

Safety and bounds:
  No network calls, package dependencies, directory traversal, or implicit files.
  Maximum input: ${LIMITS.inputBytes} bytes, ${LIMITS.pages} pages, ${LIMITS.links} links.`;

const fail = (message) => {
  process.stderr.write(`link-graph-analyzer: ${message}\n`);
  process.exitCode = 1;
};

const option = (name) => {
  const positions = process.argv.reduce((all, value, index) => value === name ? [...all, index] : all, []);
  if (positions.length > 1) throw new Error(`${name} may be supplied only once.`);
  if (!positions.length) return null;
  const value = process.argv[positions[0] + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${name}.`);
  return value;
};

const normalizeUrl = (value, field) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty absolute URL.`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid absolute URL: ${JSON.stringify(value)}.`);
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
    throw new Error(`${field} must use http or https and contain no credentials.`);
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  const params = [...url.searchParams.entries()].sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
  url.search = "";
  for (const [key, item] of params) url.searchParams.append(key, item);
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
};

const text = (value, field) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${field} must be a string when supplied.`);
  return value;
};

const requiredText = (value, field) => {
  if (typeof value !== "string") throw new Error(`${field} is required and must be a string (empty string allowed for an explicitly empty value).`);
  return value;
};

const boolean = (value, field) => {
  if (typeof value !== "boolean") throw new Error(`${field} must be true or false.`);
  return value;
};

const validate = (input) => {
  if (!input || Array.isArray(input) || typeof input !== "object") throw new Error("Input must be one JSON object.");
  if (!input.coverage || typeof input.coverage !== "object") throw new Error("Input must declare coverage.complete and coverage.note.");
  const coverage = {
    complete: boolean(input.coverage.complete, "coverage.complete"),
    note: text(input.coverage.note, "coverage.note"),
  };
  if (!coverage.complete && !coverage.note.trim()) throw new Error("coverage.note is required when coverage.complete is false.");
  if (!Array.isArray(input.pages) || !Array.isArray(input.links)) throw new Error("Input must contain pages[] and links[] arrays.");
  if (input.pages.length > LIMITS.pages) throw new Error(`pages[] exceeds the ${LIMITS.pages}-record limit; split or narrow the approved export.`);
  if (input.links.length > LIMITS.links) throw new Error(`links[] exceeds the ${LIMITS.links}-record limit; split or narrow the approved export.`);

  const pages = input.pages.map((page, index) => {
    if (!page || Array.isArray(page) || typeof page !== "object") throw new Error(`pages[${index}] must be an object.`);
    const status = Number(page.status);
    if (!Number.isInteger(status) || status < 100 || status > 599) throw new Error(`pages[${index}].status must be an HTTP status integer.`);
    return {
      url: normalizeUrl(page.url, `pages[${index}].url`),
      status,
      finalUrl: page.finalUrl === undefined || page.finalUrl === null ? "" : normalizeUrl(page.finalUrl, `pages[${index}].finalUrl`),
      canonicalUrl: page.canonicalUrl === undefined || page.canonicalUrl === null ? "" : normalizeUrl(page.canonicalUrl, `pages[${index}].canonicalUrl`),
      indexable: boolean(page.indexable, `pages[${index}].indexable`),
      entryPoint: boolean(page.entryPoint, `pages[${index}].entryPoint`),
      moneyPage: boolean(page.moneyPage, `pages[${index}].moneyPage`),
    };
  });
  const urls = new Set();
  for (const page of pages) {
    if (urls.has(page.url)) throw new Error(`Duplicate normalized page URL: ${page.url}.`);
    urls.add(page.url);
  }
  if (input.siteOrigins !== undefined && (!Array.isArray(input.siteOrigins) || input.siteOrigins.some((value) => typeof value !== "string"))) {
    throw new Error("siteOrigins[] must be an array of absolute URL prefixes when supplied.");
  }
  if (input.siteOrigins !== undefined && input.siteOrigins.length > LIMITS.siteOrigins) {
    throw new Error(`siteOrigins[] exceeds the ${LIMITS.siteOrigins}-prefix limit; consolidate prefixes.`);
  }
  const siteOrigins = input.siteOrigins === undefined
    ? [...new Set(pages.map((page) => new URL(page.url).origin))].sort()
    : [...new Set(input.siteOrigins.map((value, index) => normalizeUrl(value, `siteOrigins[${index}]`)))].sort();
  if (!siteOrigins.length) throw new Error("Internal scope requires siteOrigins[] or at least one pages[] origin.");
  const links = input.links.map((link, index) => {
    if (!link || Array.isArray(link) || typeof link !== "object") throw new Error(`links[${index}] must be an object.`);
    const rel = link.rel;
    if (!Array.isArray(rel) || rel.some((item) => typeof item !== "string")) throw new Error(`links[${index}].rel is required and must be an array of strings (empty array allowed).`);
    return {
      id: index + 1,
      source: normalizeUrl(link.source, `links[${index}].source`),
      target: normalizeUrl(link.target, `links[${index}].target`),
      anchor: requiredText(link.anchor, `links[${index}].anchor`),
      placement: requiredText(link.placement, `links[${index}].placement`),
      rel: [...new Set(rel.map((item) => item.trim().toLowerCase()).filter(Boolean))].sort(),
    };
  });
  return { coverage, pages: pages.sort((a, b) => a.url.localeCompare(b.url)), links, siteOrigins };
};

const buildScope = (siteOrigins) => {
  const prefixesByOrigin = new Map();
  for (const prefix of siteOrigins) {
    const prefixUrl = new URL(prefix);
    const list = prefixesByOrigin.get(prefixUrl.origin) ?? [];
    list.push(prefixUrl.pathname);
    prefixesByOrigin.set(prefixUrl.origin, list);
  }
  const internalCache = new Map();
  return (target) => {
    const cached = internalCache.get(target);
    if (cached !== undefined) return cached;
    const targetUrl = new URL(target);
    const list = prefixesByOrigin.get(targetUrl.origin);
    const result = Boolean(list && list.some((pathname) => pathname === "/" || targetUrl.pathname === pathname || targetUrl.pathname.startsWith(`${pathname.replace(/\/$/, "")}/`)));
    internalCache.set(target, result);
    return result;
  };
};

const classify = ({ pages, links, siteOrigins }) => {
  const byUrl = new Map(pages.map((page) => [page.url, page]));
  const eligible = (page) => page && page.status >= 200 && page.status < 300 && page.indexable && (!page.canonicalUrl || page.canonicalUrl === page.url);
  const internal = buildScope(siteOrigins);
  return links.map((link) => {
    const sourcePage = byUrl.get(link.source);
    const suppliedTarget = byUrl.get(link.target);
    const external = !internal(link.target);
    const externalSource = !internal(link.source);
    const selfLink = link.source === link.target;
    let resolvedTarget = link.target;
    const reasons = [];
    if (!sourcePage) reasons.push("source absent from pages[]");
    if (externalSource) reasons.push("external source");
    if (external) reasons.push("external");
    else if (!externalSource && !suppliedTarget) reasons.push("broken target: internal target absent from pages[]");
    if (selfLink) reasons.push("self-link");
    if (suppliedTarget?.status >= 300 && suppliedTarget.status < 400) {
      reasons.push(`redirected target (${suppliedTarget.status})`);
      if (suppliedTarget.finalUrl) resolvedTarget = suppliedTarget.finalUrl;
    }
    const resolvedPage = byUrl.get(resolvedTarget);
    if (resolvedPage?.canonicalUrl && resolvedPage.canonicalUrl !== resolvedPage.url) {
      reasons.push("canonicalized target");
      resolvedTarget = resolvedPage.canonicalUrl;
    }
    const finalPage = byUrl.get(resolvedTarget);
    const resolvedExternal = !internal(resolvedTarget);
    if (resolvedExternal && !external) reasons.push("resolved target outside internal scope");
    if (finalPage && finalPage.status >= 400) reasons.push(`broken target: HTTP ${finalPage.status}`);
    if (suppliedTarget && !suppliedTarget.indexable) reasons.push("noindex target");
    if (link.rel.includes("nofollow")) reasons.push("nofollow edge");
    if (sourcePage && !eligible(sourcePage)) reasons.push("ineligible source");
    if (finalPage && !eligible(finalPage)) reasons.push("ineligible resolved target");
    if (resolvedTarget !== link.target && !finalPage) reasons.push("resolved target absent from pages[]");
    const traversable = Boolean(!external && !externalSource && !resolvedExternal && !selfLink && eligible(sourcePage) && eligible(finalPage) && !link.rel.includes("nofollow"));
    return { ...link, resolvedTarget, traversable, classification: selfLink ? "self-link" : external || externalSource || resolvedExternal ? "external" : "internal", handling: reasons.length ? reasons.join("; ") : "included unchanged" };
  });
};

const graph = (pages, edges, internal) => {
  const eligiblePages = pages.filter((page) => internal(page.url) && page.status >= 200 && page.status < 300 && page.indexable && (!page.canonicalUrl || page.canonicalUrl === page.url));
  const urls = eligiblePages.map((page) => page.url);
  const outgoing = new Map(urls.map((url) => [url, []]));
  const incoming = new Map(urls.map((url) => [url, []]));
  for (const edge of edges.filter((item) => item.traversable)) {
    outgoing.get(edge.source)?.push(edge);
    incoming.get(edge.resolvedTarget)?.push(edge);
  }
  const depthsFrom = (starts) => {
    const depths = new Map(starts.filter((url) => outgoing.has(url)).map((url) => [url, 0]));
    const queue = [...depths.keys()];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const source = queue[cursor];
      for (const edge of outgoing.get(source)) {
        if (depths.has(edge.resolvedTarget)) continue;
        depths.set(edge.resolvedTarget, depths.get(source) + 1);
        queue.push(edge.resolvedTarget);
      }
    }
    return depths;
  };
  const entryPoints = eligiblePages.filter((page) => page.entryPoint).map((page) => page.url).sort();
  const moneyPages = eligiblePages.filter((page) => page.moneyPage).map((page) => page.url).sort();
  const clickDepth = depthsFrom(entryPoints);
  const moneyDepth = depthsFrom(moneyPages);
  let authority = new Map(urls.map((url) => [url, urls.length ? 1 / urls.length : 0]));
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const sink = urls.filter((url) => outgoing.get(url).length === 0).reduce((sum, url) => sum + authority.get(url), 0);
    const next = new Map(urls.map((url) => [url, urls.length ? (1 - DAMPING) / urls.length + DAMPING * sink / urls.length : 0]));
    for (const source of urls) {
      const links = outgoing.get(source);
      if (!links.length) continue;
      const share = DAMPING * authority.get(source) / links.length;
      for (const edge of links) next.set(edge.resolvedTarget, next.get(edge.resolvedTarget) + share);
    }
    authority = next;
  }
  return { eligiblePages, outgoing, incoming, clickDepth, moneyDepth, entryPoints, moneyPages, authority };
};

const neutralize = (value) => {
  let output = String(value ?? "").replace(/\r\n?|\n/g, " ").replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "\uFFFD");
  if (/^\s*[=+\-@]/.test(output)) output = `'${output}`;
  return output.replace(/\\/g, "\\\\").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\[\]()])/g, "\\$1").replace(/\|/g, "\\|");
};

const table = (headers, rows, empty = "_None._") => rows.length ? [
  `| ${headers.map(neutralize).join(" | ")} |`,
  `| ${headers.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.map(neutralize).join(" | ")} |`),
].join("\n") : empty;

const report = (input, stamp) => {
  const edges = classify(input);
  const state = graph(input.pages, edges, buildScope(input.siteOrigins));
  const orphanStatus = input.coverage.complete ? "evaluated" : "insufficient input coverage";
  const pageRows = state.eligiblePages.map((page) => {
    const inlinks = new Set(state.incoming.get(page.url).map((edge) => edge.source)).size;
    const outlinks = new Set(state.outgoing.get(page.url).map((edge) => edge.resolvedTarget)).size;
    const depth = state.clickDepth.get(page.url);
    const flags = [];
    if (input.coverage.complete && inlinks === 0 && !page.entryPoint) flags.push("orphan");
    if (input.coverage.complete && inlinks === 1 && !page.entryPoint) flags.push("near-orphan");
    if (page.moneyPage && (inlinks <= 1 || depth === undefined || depth > 3)) flags.push("weak declared money page");
    return [page.url, depth ?? "unreachable", state.moneyDepth.get(page.url) ?? "unreachable", inlinks, outlinks, page.moneyPage, flags.join(", ") || "—", state.authority.get(page.url).toFixed(8)];
  });
  const anchorCounts = new Map();
  for (const edge of edges) {
    const key = JSON.stringify([edge.source, edge.target, edge.anchor, edge.placement, edge.rel.join(" "), edge.classification]);
    anchorCounts.set(key, (anchorCounts.get(key) ?? 0) + 1);
  }
  const anchors = [...anchorCounts].map(([key, count]) => [...JSON.parse(key), count]).sort((a, b) => a.slice(0, 6).join("\0").localeCompare(b.slice(0, 6).join("\0")));
  const lines = [
    "# Offline internal-link graph report",
    "",
    ...(stamp === null ? [] : [`Evidence stamp: ${neutralize(stamp)}`, ""]),
    "## Contract and coverage",
    "",
    `- Coverage: ${input.coverage.complete ? "complete" : "incomplete"}`,
    `- Coverage note: ${neutralize(input.coverage.note || "—")}`,
    `- Orphan result: ${orphanStatus}`,
    `- Records: ${input.pages.length} pages; ${input.links.length} link edges (duplicates preserved)` ,
    `- Internal scope prefixes: ${input.siteOrigins.map(neutralize).join(", ")}`,
    `- Entry points: ${state.entryPoints.length ? state.entryPoints.map(neutralize).join(", ") : "none declared"}`,
    `- Declared money pages: ${state.moneyPages.length ? state.moneyPages.map(neutralize).join(", ") : "none declared"}`,
    "- Policy: click depth and authority use followed non-self edges between supplied, indexable 2xx self-canonical pages; self-links and external links remain inventoried but are excluded; redirects resolve only through declared finalUrl; canonicalized targets resolve only through declared canonicalUrl; nofollow edges remain inventoried but are excluded; noindex pages remain reported as edge cases but are excluded from the graph.",
    `- heuristic internal authority: damping ${DAMPING}; fixed iterations ${ITERATIONS} (minimum ${ITERATIONS}, maximum ${ITERATIONS}); duplicate followed edges retain weight; not Google PageRank and not a ranking prediction.`,
    "",
    "## Page evidence",
    "",
    table(["URL", "Click depth from roots", "Depth from declared money pages", "Distinct followed inlinks", "Distinct followed outlinks", "Declared money page", "Finding", "Heuristic internal authority"], pageRows),
    "",
    "## Edge handling",
    "",
    table(["Edge", "Source", "Supplied target", "Resolved target", "Anchor", "Placement", "Rel", "Graph handling"], edges.map((edge) => [edge.id, edge.source, edge.target, edge.resolvedTarget, edge.anchor, edge.placement, edge.rel.join(" ") || "—", edge.traversable ? `included; ${edge.handling}` : `excluded; ${edge.handling}`])),
    "",
    "## Anchor inventory",
    "",
    table(["Source", "Target", "Anchor", "Placement", "Rel", "Classification", "Occurrences"], anchors),
    "",
    "## Audit-matrix evidence mapping",
    "",
    "- Source URL, target URL, anchor text, and placement: Edge handling and Anchor inventory.",
    "- Click depth, current crawl state, orphan/near-orphan status, and weak money-page support: Page evidence.",
    "- Broken, redirected, canonicalized, noindex, and nofollow observations: Edge handling.",
    "- Priority, desired state, intent, and fix remain reviewer decisions in the audit matrix.",
    "",
  ];
  return lines.join("\n");
};

try {
  if (process.argv.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
  } else {
    const allowed = new Set(["--input", "--stamp"]);
    const flags = process.argv.slice(2).filter((value) => value.startsWith("--"));
    const unknown = flags.find((value) => !allowed.has(value));
    if (unknown) throw new Error(`Unknown option ${unknown}.\n\n${usage()}`);
    const inputPath = option("--input");
    const stamp = option("--stamp");
    if (!inputPath) throw new Error(`--input is required.\n\n${usage()}`);
    const file = await stat(inputPath);
    if (file.size > LIMITS.inputBytes) throw new Error(`Input is ${file.size} bytes, above the ${LIMITS.inputBytes}-byte limit; split or narrow the approved export.`);
    const bytes = await readFile(inputPath);
    let parsed;
    try {
      parsed = JSON.parse(bytes.toString("utf-8"));
    } catch (error) {
      throw new Error(`Invalid JSON in ${inputPath}: ${error.message}`);
    }
    process.stdout.write(report(validate(parsed), stamp));
  }
} catch (error) {
  fail(error.message);
}
