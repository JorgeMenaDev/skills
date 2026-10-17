// Film QA gate. Run against a running server: node qa/verify.mjs [baseURL]
// Scrolls both ways at desktop and mobile, checks clip time follows scroll, measures poster vs video PSNR,
// checks reduced motion fetches no video, and fails on console errors. Prints PASS or FAIL.
// Uses installed Google Chrome: Playwright's bundled Chromium cannot decode H.264.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321/';
const out = 'qa/shots';
const MIN_PSNR = 35;
mkdirSync(out, { recursive: true });
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const failures = [];
const errors = [];

const psnr = (a, b) => {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  return Number(log.match(/average:([\d.]+|inf)/)?.[1].replace('inf', '99') ?? 0);
};
const allReady = (page) =>
  page.waitForFunction(() => [...document.querySelectorAll('[data-film-clip]')].every((v) => v.readyState >= 2), null, { timeout: 180000 });

for (const [name, viewport] of Object.entries(sizes)) {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport, isMobile: name === 'mobile', hasTouch: name === 'mobile' });
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(base, { waitUntil: 'load' });
  await allReady(page);

  const tops = await page.$$eval('[data-film-stop]', (els) => els.map((e) => Math.round(e.getBoundingClientRect().top + scrollY)));
  const go = async (y) => {
    await page.evaluate((y) => (window.lenis ? window.lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y)), y);
    await page.waitForTimeout(700);
  };
  const state = () =>
    page.evaluate(() => {
      const clips = [...document.querySelectorAll('[data-film-clip]')];
      const on = clips.findIndex((v) => v.classList.contains('is-on'));
      return {
        y: Math.round(scrollY),
        mode: document.querySelector('[data-film-stage]').dataset.mode,
        clip: on + 1,
        t: on >= 0 ? +clips[on].currentTime.toFixed(2) : null,
        stop: [...document.querySelectorAll('[data-film-stop]')].findIndex((s) => s.hasAttribute('data-current')),
      };
    });

  // Down through every stop and segment midpoint, then back up through the midpoints.
  const marks = [];
  tops.forEach((y, i) => {
    marks.push({ kind: 'stop', i, y: y + 1 });
    if (i < tops.length - 1) marks.push({ kind: 'mid', i, y: Math.round((y + tops[i + 1]) / 2) });
  });
  const rows = [];
  for (const m of marks) {
    await go(m.y);
    rows.push({ dir: 'down', ...m, ...(await state()) });
    if (m.kind === 'stop') await page.screenshot({ path: `${out}/${name}-stop-${m.i}.png` });
  }
  for (const m of [...marks].reverse().filter((m) => m.kind === 'mid')) {
    await go(m.y);
    rows.push({ dir: 'up', ...m, ...(await state()) });
  }
  console.log(`\n${name}`);
  console.table(rows.map(({ dir, kind, i, mode, clip, t, stop }) => ({ dir, kind, i, mode, clip, t, stop })));
  for (const r of rows) {
    if (r.mode !== 'video') failures.push(`${name} ${r.dir} ${r.kind} ${r.i}: still on posters`);
    if (r.kind === 'mid' && r.clip !== r.i + 1) failures.push(`${name} ${r.dir} mid ${r.i}: clip ${r.clip}, expected ${r.i + 1}`);
    if (r.kind === 'mid' && !(r.t > 0)) failures.push(`${name} ${r.dir} mid ${r.i}: currentTime ${r.t}`);
  }

  // Seams: the same stop with the clip, then with only the poster.
  if (name === 'desktop') {
    for (const i of [1, Math.floor((tops.length - 1) / 2) + 1].filter((i, k, a) => a.indexOf(i) === k && i < tops.length)) {
      await go(tops[i] + 1);
      await page.addStyleTag({ content: '[data-film-stop], .film-rail, header { visibility: hidden !important; }' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/seam-${i}-video.png` });
      await page.evaluate(() => {
        const c = document.querySelector('.film-clips');
        c.style.transition = 'none';
        c.style.opacity = '0';
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/seam-${i}-poster.png` });
      const db = psnr(`${out}/seam-${i}-video.png`, `${out}/seam-${i}-poster.png`);
      console.log(`stop ${i} poster vs video PSNR: ${db.toFixed(1)} dB`);
      if (db < MIN_PSNR) failures.push(`stop ${i}: poster vs video ${db.toFixed(1)} dB < ${MIN_PSNR} (check colour tags and poster source)`);
      await page.reload({ waitUntil: 'load' });
      await allReady(page);
    }
  }
  await browser.close();
}

{
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: sizes.desktop, reducedMotion: 'reduce' });
  let videos = 0;
  page.on('request', (r) => /\.mp4(\?|$)/.test(r.url()) && videos++);
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  console.log(`\nreduced motion: ${videos} video requests`);
  if (videos) failures.push(`reduced motion fetched ${videos} videos`);
  await browser.close();
}

if (errors.length) failures.push(...errors.map((e) => `console: ${e}`));
console.log(failures.length ? `\nFAIL\n- ${failures.join('\n- ')}` : '\nPASS');
process.exit(failures.length ? 1 : 0);
