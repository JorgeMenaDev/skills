#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const command = args.shift();
const configPath = process.env.PRODUCT_FEEDBACK_REPORT_CONFIG
  ? resolve(expandHome(process.env.PRODUCT_FEEDBACK_REPORT_CONFIG))
  : join(homedir(), ".config", "product-feedback-report", "config.json");

function fail(message, code = 1) {
  console.error(`ERROR: ${message}`);
  process.exit(code);
}

function expandHome(value) {
  if (!value) return value;
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) return join(homedir(), value.slice(2));
  return value;
}

function option(name, required = true) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1]) {
    if (required) fail(`Missing ${name}`);
    return undefined;
  }
  return args[index + 1];
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`Cannot read JSON ${path}: ${error.message}`);
  }
}

function readInput() {
  const input = option("--input");
  if (input !== "-") return readJson(resolve(expandHome(input)));
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch (error) {
    fail(`Cannot read JSON from stdin: ${error.message}`);
  }
}

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}

function loadConfig(required = true) {
  if (!existsSync(configPath)) {
    if (required) fail("Report storage is not configured. Run configure --root <directory>.");
    return undefined;
  }
  const config = readJson(configPath);
  if (!config.root || typeof config.root !== "string") fail(`Invalid config at ${configPath}`);
  config.root = resolve(expandHome(config.root));
  return config;
}

function reportJsonPath(reportValue) {
  const expanded = resolve(expandHome(reportValue));
  return basename(expanded) === "report.json" ? expanded : join(expanded, "report.json");
}

function loadReport(reportValue) {
  const path = reportJsonPath(reportValue);
  if (!existsSync(path)) fail(`Report not found: ${path}`);
  return { path, directory: dirname(path), report: readJson(path) };
}

function now() {
  return new Date().toISOString();
}

function dateOnly() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "report";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphs(value = "") {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function escapeCssString(value = "") {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("<", "\\3c ")
    .replaceAll("\n", " ");
}

function displayDate(value, language) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(language || "es", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return String(value).slice(0, 10);
  }
}

function relativeAsset(value) {
  return String(value || "").replaceAll("\\", "/");
}

function findExecutable(name) {
  const finder = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(finder, [name], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.split(/\r?\n/).find(Boolean) : undefined;
}

function findChrome() {
  const environment = process.env.CHROME_PATH ? [process.env.CHROME_PATH] : [];
  const platformCandidates = process.platform === "darwin"
    ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
      ]
    : process.platform === "win32"
      ? [
          join(process.env.PROGRAMFILES || "", "Google/Chrome/Application/chrome.exe"),
          join(process.env["PROGRAMFILES(X86)"] || "", "Google/Chrome/Application/chrome.exe"),
          join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
        ]
      : [];
  for (const candidate of [...environment, ...platformCandidates]) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"]) {
    const candidate = findExecutable(name);
    if (candidate) return candidate;
  }
  return undefined;
}

function configuredReports() {
  const config = loadConfig(false);
  if (!config || !existsSync(config.root)) return [];
  return readdirSync(config.root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const path = join(config.root, entry.name, "report.json");
      if (!existsSync(path)) return [];
      try {
        const report = JSON.parse(readFileSync(path, "utf8"));
        return [{
          title: report.title,
          status: report.status,
          findings: report.findings?.length || 0,
          updatedAt: report.updatedAt,
          path: dirname(path),
        }];
      } catch {
        return [];
      }
    })
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

function printState() {
  const config = loadConfig(false);
  const chrome = findChrome();
  console.log(`CONFIG: ${config ? "ready" : "missing"}`);
  console.log(`CONFIG_PATH: ${configPath}`);
  console.log(`ROOT: ${config?.root || "unset"}`);
  console.log(`PDF_RENDERER: ${chrome ? "ready" : "missing"}`);
  console.log(`REPORTS_JSON: ${JSON.stringify(configuredReports())}`);
}

function localized(report) {
  const spanish = String(report.language || "").toLowerCase().startsWith("es");
  return spanish
    ? {
        statusDraft: "En progreso", statusComplete: "Completo", summary: "Resumen",
        product: "Producto", mission: "Misión de prueba", testedBy: "Probado por", scope: "Alcance",
        date: "Fecha", findings: "Hallazgos", problems: "Problemas", ideas: "Ideas",
        blocking: "Bloqueante", important: "Importante", minor: "Menor", topFinding: "Hallazgo principal",
        problem: "Problema", idea: "Idea", whatIDid: "Qué hice", happened: "Qué ocurrió",
        expected: "Qué debería ocurrir", impact: "Por qué importa", suggestion: "Sugerencia",
        evidence: "Evidencia", video: "Video adjunto", noFindings: "Todavía no hay hallazgos.", footer: "Informe de feedback de producto",
      }
    : {
        statusDraft: "In progress", statusComplete: "Complete", summary: "Summary",
        product: "Product", mission: "Testing mission", testedBy: "Tested by", scope: "Scope",
        date: "Date", findings: "Findings", problems: "Problems", ideas: "Ideas",
        blocking: "Blocking", important: "Important", minor: "Minor", topFinding: "Top finding",
        problem: "Problem", idea: "Idea", whatIDid: "What I did", happened: "What happened",
        expected: "What should happen", impact: "Why it matters", suggestion: "Suggestion",
        evidence: "Evidence", video: "Attached video", noFindings: "There are no findings yet.", footer: "Product feedback report",
      };
}

function priorityLabel(labels, priority) {
  return labels[priority] || priority;
}

function copyAsset(sourceValue, directory, targetName) {
  if (!sourceValue) return undefined;
  const source = resolve(expandHome(sourceValue));
  if (!existsSync(source) || !statSync(source).isFile()) fail(`Evidence file not found: ${source}`);
  const extension = extname(source).toLowerCase() || ".bin";
  const target = join(directory, "evidence", `${targetName}-${randomUUID().slice(0, 8)}${extension}`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  return relativeAsset(join("evidence", basename(target)));
}

function prepareBrand(brand, directory, existing = {}) {
  if (!brand) return existing;
  const next = { ...existing };
  if (brand.primaryColor) next.primaryColor = brand.primaryColor;
  if (brand.logo) next.logo = copyAsset(brand.logo, directory, "brand-logo");
  return next;
}

function prepareEvidence(items, directory, findingId) {
  if (!items) return undefined;
  return items.map((item, index) => {
    if (!item.original) fail("Evidence original is required.");
    if (!["image", "video"].includes(item.kind)) fail("Evidence kind must be image or video.");
    if (!item.display) fail("Evidence requires a separate shareable image in display.");
    if (resolve(expandHome(item.display)) === resolve(expandHome(item.original))) {
      fail("Evidence display must be a separate shareable copy, not the original file.");
    }
    const visibleSource = item.display;
    if (!/\.(png|jpe?g|webp|gif)$/i.test(visibleSource)) {
      fail("PDF evidence must use PNG, JPEG, WebP, or GIF.");
    }
    const suffix = items.length > 1 ? `-${index + 1}` : "";
    const original = copyAsset(item.original, directory, `${findingId}-original${suffix}`);
    const display = copyAsset(item.display, directory, `${findingId}-display${suffix}`);
    return {
      kind: item.kind === "video" ? "video" : "image",
      original,
      display,
      caption: item.caption || "",
    };
  });
}

function validateFinding(input, partial = false) {
  const next = { ...input };
  delete next.id;
  if (!partial || "kind" in next) {
    if (!["problem", "idea"].includes(next.kind)) fail("Finding kind must be problem or idea.");
  }
  if (!partial || "priority" in next) {
    if (!["blocking", "important", "minor"].includes(next.priority)) fail("Priority must be blocking, important, or minor.");
  }
  if (!partial && !next.title) fail("Finding title is required.");
  if (!partial && !next.expected) fail("Expected behaviour or desired change is required.");
  if (!partial && !next.impact) fail("Impact is required.");
  if (!partial && next.kind === "problem" && !next.happened) fail("What happened is required for a problem.");
  if (next.whatIDid && !Array.isArray(next.whatIDid)) fail("whatIDid must be an array.");
  if (next.evidence && !Array.isArray(next.evidence)) fail("evidence must be an array.");
  return next;
}

function validateReport(report) {
  if (typeof report.product !== "string" || !report.product.trim()) fail("Report product is required.");
  if (typeof report.mission !== "string" || !report.mission.trim()) fail("Report mission is required.");
  for (const key of ["title", "language", "testedBy", "scope"]) {
    if (key in report && typeof report[key] !== "string") fail(`Report ${key} must be a string.`);
  }
  if (!["draft", "complete"].includes(report.status)) fail("status must be draft or complete.");
}

function reportHtml(report) {
  const labels = localized(report);
  const findings = report.findings || [];
  const counts = {
    problems: findings.filter((finding) => finding.kind === "problem").length,
    ideas: findings.filter((finding) => finding.kind === "idea").length,
    blocking: findings.filter((finding) => finding.priority === "blocking").length,
    important: findings.filter((finding) => finding.priority === "important").length,
    minor: findings.filter((finding) => finding.priority === "minor").length,
  };
  const rank = { blocking: 0, important: 1, minor: 2 };
  const topFinding = [...findings].sort((a, b) => rank[a.priority] - rank[b.priority])[0];
  const color = /^#[0-9a-f]{6}$/i.test(report.brand?.primaryColor || "") ? report.brand.primaryColor : "#24577a";
  const status = report.status === "complete" ? labels.statusComplete : labels.statusDraft;
  const logo = report.brand?.logo ? `<img class="logo" src="${escapeHtml(relativeAsset(report.brand.logo))}" alt="">` : "";
  const metadata = [
    [labels.product, report.product], [labels.mission, report.mission], [labels.testedBy, report.testedBy],
    [labels.scope, report.scope], [labels.date, displayDate(report.createdAt, report.language)],
  ].filter(([, value]) => value);
  const findingSections = findings.map((finding) => {
    const steps = finding.whatIDid?.length
      ? `<section><h4>${labels.whatIDid}</h4><ol>${finding.whatIDid.map((step) => `<li>${paragraphs(step)}</li>`).join("")}</ol></section>`
      : "";
    const happened = finding.happened ? `<section><h4>${labels.happened}</h4><p>${paragraphs(finding.happened)}</p></section>` : "";
    const suggestion = finding.suggestion ? `<section><h4>${labels.suggestion}</h4><p>${paragraphs(finding.suggestion)}</p></section>` : "";
    const evidence = (finding.evidence || []).map((item) => {
      const image = item.display && /\.(png|jpe?g|webp|gif)$/i.test(item.display)
        ? `<img class="evidence" src="${escapeHtml(relativeAsset(item.display))}" alt="">`
        : "";
      const attachment = item.kind === "video" ? `<p class="attachment">${labels.video}: ${escapeHtml(basename(item.original || ""))}</p>` : "";
      return `<figure>${image}${attachment}${item.caption ? `<figcaption>${paragraphs(item.caption)}</figcaption>` : ""}</figure>`;
    }).join("");
    return `<article class="finding">
      <div class="finding-head"><div><span class="id">${escapeHtml(finding.id)}</span><h2>${escapeHtml(finding.title)}</h2></div><div class="badges"><span>${labels[finding.kind]}</span><span class="priority ${finding.priority}">${priorityLabel(labels, finding.priority)}</span></div></div>
      ${steps}${happened}
      <section><h4>${labels.expected}</h4><p>${paragraphs(finding.expected)}</p></section>
      <section><h4>${labels.impact}</h4><p>${paragraphs(finding.impact)}</p></section>
      ${suggestion}${evidence ? `<section><h4>${labels.evidence}</h4>${evidence}</section>` : ""}
    </article>`;
  }).join("");
  return `<!doctype html><html lang="${escapeHtml(report.language || "es")}"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>
    @page { size: A4; margin: 16mm 15mm 18mm;
      @bottom-left { content: "${escapeCssString(report.product)} | ${escapeCssString(labels.footer)}"; color: #6b7280; font-size: 9px; }
      @bottom-right { content: counter(page); color: #6b7280; font-size: 9px; }
    }
    :root { --brand: ${color}; --ink: #17212b; --muted: #5c6873; --line: #d8dee4; --soft: #f3f6f8; }
    * { box-sizing: border-box; } body { margin: 0; color: var(--ink); font: 14px/1.48 -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
    h1,h2,h3,h4,p { margin-top: 0; } h1 { color: var(--brand); font-size: 31px; line-height: 1.12; margin-bottom: 12px; }
    h2 { color: var(--brand); font-size: 22px; line-height: 1.2; margin: 4px 0 0; } h3 { color: var(--brand); font-size: 20px; }
    h4 { font-size: 13px; margin-bottom: 5px; color: #33424f; } p { margin-bottom: 11px; }
    .cover { min-height: 250mm; page-break-after: always; position: relative; } .cover-top { border-top: 8px solid var(--brand); padding-top: 20px; }
    .logo { display: block; max-height: 44px; max-width: 180px; object-fit: contain; margin-bottom: 24px; }
    .status { display: inline-block; background: var(--soft); color: var(--brand); font-weight: 700; padding: 6px 10px; border-radius: 999px; margin-bottom: 28px; }
    .meta { display: grid; grid-template-columns: 145px 1fr; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; margin: 28px 0; }
    .meta dt,.meta dd { margin: 0; padding: 9px 11px; border-bottom: 1px solid var(--line); } .meta dt { background: var(--brand); color: white; font-weight: 700; }
    .meta dt:last-of-type,.meta dd:last-of-type { border-bottom: 0; }
    .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 22px 0; } .stat { background: var(--soft); padding: 12px 8px; border-radius: 8px; text-align: center; }
    .stat strong { display: block; color: var(--brand); font-size: 22px; } .top { border-left: 4px solid var(--brand); background: var(--soft); padding: 13px 15px; margin-top: 22px; }
    .finding { page-break-before: always; } .finding:first-child { page-break-before: auto; } .finding-head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid var(--brand); padding-bottom: 12px; margin-bottom: 20px; }
    .id { color: var(--muted); font-size: 12px; font-weight: 700; } .badges { display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: flex-end; gap: 6px; }
    .badges span { white-space: nowrap; background: var(--soft); padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .priority.blocking { background: #fee2e2; color: #991b1b; } .priority.important { background: #fff1cc; color: #7c5200; } .priority.minor { background: #e6f3ff; color: #174c75; }
    section { break-inside: avoid; margin-bottom: 16px; } ol { margin-top: 4px; padding-left: 22px; } li { margin-bottom: 4px; }
    figure { margin: 12px 0 20px; break-inside: avoid; } .evidence { display: block; width: auto; max-width: 100%; max-height: 125mm; margin: 0 auto; object-fit: contain; border: 1px solid var(--line); border-radius: 6px; }
    figcaption,.attachment { color: var(--muted); font-size: 12px; text-align: center; margin-top: 7px; }
  </style></head><body>
    <section class="cover"><div class="cover-top">${logo}<span class="status">${escapeHtml(status)}</span><h1>${escapeHtml(report.title)}</h1></div>
      <dl class="meta">${metadata.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${paragraphs(value)}</dd>`).join("")}</dl>
      <h3>${labels.summary}</h3><div class="stats">
        <div class="stat"><strong>${findings.length}</strong>${labels.findings}</div><div class="stat"><strong>${counts.problems}</strong>${labels.problems}</div><div class="stat"><strong>${counts.ideas}</strong>${labels.ideas}</div><div class="stat"><strong>${counts.blocking}</strong>${labels.blocking}</div><div class="stat"><strong>${counts.important}</strong>${labels.important}</div>
      </div>${topFinding ? `<div class="top"><h4>${labels.topFinding}</h4><strong>${escapeHtml(topFinding.id)} - ${escapeHtml(topFinding.title)}</strong><p>${paragraphs(topFinding.impact)}</p></div>` : `<p>${labels.noFindings}</p>`}
    </section><main>${findingSections}</main></body></html>`;
}

function stopChrome(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try { child.kill("SIGTERM"); } catch {}
  }
}

function completePdf(path) {
  if (!existsSync(path) || statSync(path).size < 1000) return false;
  const content = readFileSync(path);
  return content.subarray(0, 5).toString() === "%PDF-" && /%%EOF\s*$/.test(content.subarray(-4096).toString());
}

function runChrome(chrome, args, pdfPath) {
  return new Promise((resolveRun) => {
    const child = spawn(chrome, args, {
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let lastSize = -1;
    let stableChecks = 0;
    let interval;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (interval) clearInterval(interval);
      stopChrome(child);
      resolveRun({ ...result, stdout, stderr });
    };
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => finish({ ok: false, detail: error.message }));
    child.on("exit", (code) => {
      const ok = completePdf(pdfPath);
      finish({ ok, detail: ok ? "" : `Chrome exited ${code}` });
    });
    const startedAt = Date.now();
    interval = setInterval(() => {
      if (existsSync(pdfPath)) {
        const size = statSync(pdfPath).size;
        stableChecks = size > 1000 && size === lastSize ? stableChecks + 1 : 0;
        lastSize = size;
        if (stableChecks >= 5 && completePdf(pdfPath)) finish({ ok: true, detail: "" });
      }
      if (Date.now() - startedAt > 15_000) finish({ ok: false, detail: "Chrome PDF render timed out" });
    }, 200);
  });
}

async function render(directory, report, discardOld = false) {
  const htmlPath = join(directory, "REPORT.html");
  const pdfPath = join(directory, "REPORT.pdf");
  writeFileSync(htmlPath, reportHtml(report));
  if (discardOld) rmSync(pdfPath, { force: true });
  const chrome = findChrome();
  if (!chrome) {
    return { htmlPath, pdfPath, status: "missing", detail: "Chrome/Chromium not found" };
  }
  const profile = mkdtempSync(join(tmpdir(), "product-feedback-report-"));
  const temporaryPdf = `${pdfPath}.${process.pid}.tmp.pdf`;
  rmSync(temporaryPdf, { force: true });
  const shared = [
    "--disable-gpu", "--allow-file-access-from-files", "--no-pdf-header-footer",
    `--user-data-dir=${profile}`, `--print-to-pdf=${temporaryPdf}`, pathToFileURL(htmlPath).href,
  ];
  let result = await runChrome(chrome, ["--headless=new", ...shared], temporaryPdf);
  if (!result.ok) {
    rmSync(temporaryPdf, { force: true });
    result = await runChrome(chrome, ["--headless", ...shared], temporaryPdf);
  }
  rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  if (result.ok) {
    rmSync(pdfPath, { force: true });
    renameSync(temporaryPdf, pdfPath);
  }
  else rmSync(temporaryPdf, { force: true });
  const current = result.ok && completePdf(pdfPath);
  return { htmlPath, pdfPath, status: current ? "current" : "failed", detail: result.detail || result.stderr?.trim() || result.stdout?.trim() || "Chrome did not create a PDF" };
}

async function saveAndRender(path, directory, report, extra = []) {
  report.updatedAt = now();
  writeJsonAtomic(path, report);
  const output = await render(directory, report, true);
  for (const [key, value] of extra) console.log(`${key}: ${value}`);
  console.log(`REPORT: ${directory}`);
  console.log(`HTML: ${output.htmlPath}`);
  console.log(`PDF: ${output.pdfPath}`);
  console.log(`PDF_STATUS: ${output.status}`);
  if (output.status !== "current") {
    console.error(`PDF_DETAIL: ${output.detail}`);
    process.exitCode = 2;
  }
}

async function createReport(input) {
  const config = loadConfig();
  if (!input.product || !input.mission) fail("product and mission are required.");
  mkdirSync(config.root, { recursive: true });
  const reportDate = dateOnly();
  const base = `${reportDate}-${slug(input.product)}-${slug(input.mission)}`;
  let directory = join(config.root, base);
  let suffix = 2;
  while (existsSync(directory)) directory = join(config.root, `${base}-${suffix++}`);
  mkdirSync(join(directory, "evidence"), { recursive: true });
  const createdAt = now();
  const report = {
    version: 1,
    title: input.title || `${input.product} - ${input.mission} - ${reportDate}`,
    product: input.product,
    mission: input.mission,
    language: input.language || "es",
    testedBy: input.testedBy || "",
    scope: input.scope || "",
    status: "draft",
    brand: prepareBrand(input.brand, directory, { primaryColor: "#24577a" }),
    createdAt,
    updatedAt: createdAt,
    findings: [],
  };
  validateReport(report);
  await saveAndRender(join(directory, "report.json"), directory, report);
}

async function mutateFinding(mode) {
  const { path, directory, report } = loadReport(option("--report"));
  const input = validateFinding(readInput(), mode === "update");
  if (mode === "add") {
    const nextNumber = Math.max(0, ...(report.findings || []).map((finding) => Number(finding.id?.slice(2)) || 0)) + 1;
    const id = `F-${String(nextNumber).padStart(3, "0")}`;
    const evidence = prepareEvidence(input.evidence, directory, id);
    delete input.evidence;
    report.findings.push({ id, ...input, ...(evidence ? { evidence } : {}) });
    await saveAndRender(path, directory, report, [["FINDING_ID", id]]);
    return;
  }
  const id = option("--id");
  const index = report.findings.findIndex((finding) => finding.id === id);
  if (index === -1) fail(`Finding not found: ${id}`);
  let evidence;
  if (input.evidence) {
    evidence = prepareEvidence(input.evidence, directory, id);
    delete input.evidence;
  }
  report.findings[index] = { ...report.findings[index], ...input, ...(evidence ? { evidence } : {}) };
  validateFinding(report.findings[index]);
  await saveAndRender(path, directory, report, [["FINDING_ID", id]]);
}

async function updateReport() {
  const { path, directory, report } = loadReport(option("--report"));
  const input = readInput();
  const allowed = ["title", "product", "mission", "language", "testedBy", "scope", "status"];
  for (const key of allowed) if (key in input) report[key] = input[key];
  if (input.brand) report.brand = prepareBrand(input.brand, directory, report.brand);
  validateReport(report);
  await saveAndRender(path, directory, report);
}

async function setStatus(status) {
  const { path, directory, report } = loadReport(option("--report"));
  report.status = status;
  await saveAndRender(path, directory, report);
}

function help() {
  console.log(`Usage:
  report-workspace.mjs state
  report-workspace.mjs configure --root <directory>
  report-workspace.mjs create --input <json|->
  report-workspace.mjs show --report <directory|report.json>
  report-workspace.mjs add --report <directory> --input <json|->
  report-workspace.mjs update --report <directory> --id F-001 --input <json|->
  report-workspace.mjs update-report --report <directory> --input <json|->
  report-workspace.mjs complete|reopen|render --report <directory>`);
}

switch (command) {
  case "state": printState(); break;
  case "configure": {
    const root = resolve(expandHome(option("--root")));
    mkdirSync(root, { recursive: true });
    writeJsonAtomic(configPath, { version: 1, root });
    printState();
    break;
  }
  case "create": await createReport(readInput()); break;
  case "show": {
    const { directory, report } = loadReport(option("--report"));
    console.log(`REPORT: ${directory}`);
    console.log(JSON.stringify(report, null, 2));
    break;
  }
  case "add": await mutateFinding("add"); break;
  case "update": await mutateFinding("update"); break;
  case "update-report": await updateReport(); break;
  case "complete": await setStatus("complete"); break;
  case "reopen": await setStatus("draft"); break;
  case "render": {
    const { directory, report } = loadReport(option("--report"));
    const output = await render(directory, report);
    console.log(`REPORT: ${directory}`);
    console.log(`HTML: ${output.htmlPath}`);
    console.log(`PDF: ${output.pdfPath}`);
    console.log(`PDF_STATUS: ${output.status}`);
    if (output.status !== "current") {
      console.error(`PDF_DETAIL: ${output.detail}`);
      process.exitCode = 2;
    }
    break;
  }
  case "help":
  case "--help":
  case "-h":
  case undefined: help(); break;
  default: fail(`Unknown command: ${command}`);
}
