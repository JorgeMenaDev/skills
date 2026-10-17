// Screenshots of every section below the film, at 1440x900 and 390x844: node qa/sections.mjs <url>
// Captures each element matching SECTIONS, fails on console errors or broken images. Reduced motion keeps
// Lenis and the clips out of the way. Images are forced eager and decoded (lazy ones shoot grey), and the
// fixed header is hidden (tall element shots are stitched and would repeat it).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2];
if (!base) {
  console.log('usage: node qa/sections.mjs <url printed by pnpm preview>');
  process.exit(2);
}
const SECTIONS = 'main section[id], footer';
const HEADER = 'body > header';
const out = 'qa/shots';
mkdirSync(out, { recursive: true });
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const problems = [];

for (const [name, viewport] of Object.entries(sizes)) {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce', isMobile: name === 'mobile', hasTouch: name === 'mobile' });
  page.on('console', (m) => m.type() === 'error' && problems.push(`${name} console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`${name} pageerror: ${e.message}`));
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    imgs.forEach((i) => (i.loading = 'eager'));
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
  });
  await page.addStyleTag({ content: `${HEADER} { visibility: hidden !important; }` });
  const ids = await page.$$eval(SECTIONS, (els) => els.map((e, i) => e.id || `${e.tagName.toLowerCase()}-${i}`));
  const els = await page.$$(SECTIONS);
  for (let i = 0; i < els.length; i++) {
    await els[i].scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await els[i].screenshot({ path: `${out}/${name}-section-${ids[i]}.png` });
  }
  console.log(`${name}: ${els.length} sections`);
  const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  broken.forEach((src) => problems.push(`${name} broken image: ${src}`));
  await browser.close();
}
console.log(problems.length ? `FAIL\n- ${problems.join('\n- ')}` : 'PASS');
process.exit(problems.length ? 1 : 0);
