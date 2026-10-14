#!/usr/bin/env node
// Render check for a published page: opens it in a real browser (agent-browser) on desktop and phone,
// scrolls so lazy images load, and fails on any broken image, failed same-origin request or sideways overflow.
// Saves a full-page screenshot per viewport. The run is not done until a person or agent has LOOKED at them.
//
//   node render-check.mjs --out <dir> [--allow-sideways-scroll] <url> [<url> ...]
//
// A table or code block wider than its box (for example in a sideways-scroll wrapper) fails too, because on a phone the
// reader cannot see it without swiping. Pass --allow-sideways-scroll only after looking and deciding it is fine.
//
// Exit 0: every check passed (screenshots still need a look). Exit 1: a check failed; the message names the fix.
// Needs the agent-browser CLI on PATH (https://github.com/vercel-labs/agent-browser); it runs in its own session.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const USAGE = "Usage: node render-check.mjs --out <dir> [--allow-sideways-scroll] <url> [<url> ...]";
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`${USAGE}\n\nOpens each URL at 1440x900 and 390x844, fails on broken images, failed same-origin requests,\nsideways page overflow, tables or code blocks wider than their box, or not exactly one H1.\nWrites <dir>/render-check.json and one full-page screenshot per URL and viewport. Look at them.`);
  process.exit(0);
}
const outIdx = args.indexOf("--out");
if (outIdx < 0 || !args[outIdx + 1] || args.length < 3) {
  console.error(USAGE);
  process.exit(2);
}
// Absolute: agent-browser runs as a daemon in its own folder, so a relative path saves the screenshot there (14 Oct).
const out = path.resolve(args[outIdx + 1]);
const allowScroll = args.includes("--allow-sideways-scroll");
const urls = args.filter((a, i) => i !== outIdx && i !== outIdx + 1 && a !== "--allow-sideways-scroll");
fs.mkdirSync(out, { recursive: true });

const session = `render-check-${process.pid}`;
const ab = (...a) => execFileSync("agent-browser", ["--session", session, ...a], { encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const evalJs = (js) => {
  const raw = execFileSync("agent-browser", ["--session", session, "eval", "--stdin"], { input: js, encoding: "utf8", maxBuffer: 64 << 20 }).trim();
  try { return JSON.parse(JSON.parse(raw)); } catch { return JSON.parse(raw); }
};

// Scroll the whole page in steps so lazy images load, then report every image and the overflow.
const PROBE = `(async () => {
  const step = Math.max(200, innerHeight * 0.8);
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); }
  scrollTo(0, 0);
  await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 8000); })));
  const images = [...document.images].map(img => {
    const box = img.getBoundingClientRect();
    const shown = getComputedStyle(img).display !== "none" && getComputedStyle(img).visibility !== "hidden" && box.width > 0 && box.height > 0;
    return { src: img.currentSrc || img.src, alt: img.alt, shown, broken: shown && (!img.complete || img.naturalWidth === 0) };
  });
  return JSON.stringify({
    title: document.title,
    h1: [...document.querySelectorAll("h1")].map(h => h.textContent.trim()),
    images,
    overflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    // responseStatus is only exposed for same-origin files (and cross-origin ones that allow it).
    failedRequests: performance.getEntriesByType("resource").filter(r => r.responseStatus >= 400).map(r => r.responseStatus + " " + r.name),
    // Tables and code blocks wider than their box: the reader must swipe to see part of them, or never does.
    // (Carousels that scroll sideways by design are not checked.)
    wide: [...document.querySelectorAll("table, pre")].map(t => {
      let el = t.parentElement;
      while (el && el !== document.body && getComputedStyle(el).overflowX === "visible") el = el.parentElement;
      return el && el !== document.body && el.scrollWidth - el.clientWidth > 1 ? el : null;
    }).filter((el, i, all) => el && all.indexOf(el) === i).map(el => ({ box: el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""),
      hiddenPx: el.scrollWidth - el.clientWidth, text: el.textContent.trim().slice(0, 60) })),
  });
})()`;

const VIEWPORTS = [["desktop", 1440, 900], ["phone", 390, 844]];
const report = [];
const failures = [];
try {
  for (const url of urls) {
    const slug = (new URL(url).pathname.replace(/^\/|\/$/g, "") || "home").replace(/[^a-z0-9-]+/gi, "_").slice(0, 80);
    for (const [name, w, h] of VIEWPORTS) {
      ab("set", "viewport", String(w), String(h));
      ab("open", url);
      ab("wait", "--load", "load");
      const probe = evalJs(PROBE);
      const failedReqs = probe.failedRequests;
      const shot = path.join(out, `${slug}-${name}.png`);
      ab("screenshot", "--full", shot);
      if (!fs.existsSync(shot)) failures.push(`${url} [${name}]: no screenshot at ${shot}. Check the agent-browser output, then rerun.`);
      const broken = probe.images.filter(i => i.broken);
      const entry = { url, viewport: name, title: probe.title, h1: probe.h1, images: probe.images.length,
        brokenImages: broken, failedRequests: failedReqs, overflowPx: probe.overflowPx, wide: probe.wide, screenshot: shot };
      report.push(entry);
      for (const b of broken) failures.push(`${url} [${name}]: broken image "${b.alt}" ${b.src}. Fix the image source (the CMS image field or the site's fallback path), then rerun.`);
      for (const r of failedReqs) failures.push(`${url} [${name}]: request failed ${r}. A file the page loads is missing; fix the path or upload it, then rerun.`);
      if (probe.overflowPx > 1) failures.push(`${url} [${name}]: page is ${probe.overflowPx}px wider than the screen. Find the wide element in the screenshot and fix its CSS, then rerun.`);
      if (!allowScroll) for (const wd of probe.wide) failures.push(`${url} [${name}]: ${wd.box} hides ${wd.hiddenPx}px sideways ("${wd.text}"). Make it fit the screen, or rerun with --allow-sideways-scroll if a swipe is intended.`);
      if (probe.h1.length !== 1) failures.push(`${url} [${name}]: ${probe.h1.length} H1 elements; a page needs exactly one.`);
    }
  }
} finally {
  try { ab("close"); } catch {}
}
fs.writeFileSync(path.join(out, "render-check.json"), JSON.stringify({ checkedAt: new Date().toISOString(), report, failures }, null, 1));
for (const e of report) console.log(`${e.viewport.padEnd(7)} ${e.url} images=${e.images} broken=${e.brokenImages.length} failedRequests=${e.failedRequests.length} overflow=${e.overflowPx}px sideways-boxes=${e.wide.length} -> ${e.screenshot}`);
if (failures.length) {
  console.error(`\nFAIL (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nPASS. Now open every screenshot above and look at it before reporting the page as fine.");
