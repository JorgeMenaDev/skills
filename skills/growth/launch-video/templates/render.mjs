// node render.mjs stills 0,4.5,12.2   → out/stills/<n>_b<beat>.jpg (beats, not seconds)
// node render.mjs beats               → out/beats.jpg, one frame per beat on one sheet
// node render.mjs video [subframes]   → out/silent.mp4, 60 fps, subframes blended for motion blur (default 8)
// Every run also writes out/timeline.json (SFX, MUSIC, DURATION) for audio/mix.py.
// The frame size comes from the page's W and H (1920x1080, 1080x1920, 1440x1440...).
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
// Static server on a random free port: fonts need HTTP, and a fixed port can collide with a dev server.
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const [mode = 'stills', arg] = process.argv.slice(2);
if (!['stills', 'beats', 'video'].includes(mode)) { console.error(`unknown mode ${mode}: stills | beats | video`); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
// System Chrome: no Chromium download. Set CHROME_CHANNEL=chromium after `npx playwright install chromium` if there is none.
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.evaluate(() => window.ready);
const size = await page.evaluate(() => ({ width: window.W, height: window.H }));
await page.setViewportSize(size);
const meta = await page.evaluate(() => ({ SFX: window.SFX, MUSIC: window.MUSIC, DURATION: window.DURATION, P: window.P, W: window.W, H: window.H }));
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(meta, null, 1));

async function still(beat, file, label = false) {
  await page.evaluate(t => window.seek(t), beat * meta.P);
  // beats mode stamps the beat number on each cell (a DOM overlay: many ffmpeg builds lack drawtext)
  if (label) await page.evaluate(b => { const d = document.createElement('div'); d.id = '__beat'; d.textContent = 'b' + b;
    d.style.cssText = 'position:fixed;left:16px;top:16px;z-index:99999;font:700 64px sans-serif;color:#fff;background:#e0245e;padding:4px 18px;border-radius:12px';
    document.body.appendChild(d); }, beat);
  await page.screenshot({ path: file, type: 'jpeg', quality: 85 });
  if (label) await page.evaluate(() => document.getElementById('__beat').remove());
}

if (mode === 'stills' || mode === 'beats') {
  const dir = path.join(OUT, mode === 'beats' ? 'beats' : 'stills');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = Math.floor(meta.DURATION / meta.P);
  const beats = mode === 'beats' ? [...Array(n + 1).keys()] : (arg || '0').split(',').map(Number);
  for (const [i, b] of beats.entries()) await still(b, path.join(dir, `${String(i).padStart(3, '0')}_b${b}.jpg`), mode === 'beats');
  if (mode === 'beats') {
    const cols = 6, rows = Math.ceil(beats.length / cols);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(dir, '*.jpg'), '-vf', `scale=480:-1,tile=${cols}x${rows}:padding=4`, '-frames:v', '1', path.join(OUT, 'beats.jpg')], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('ffmpeg failed building out/beats.jpg'); process.exitCode = 1; }
    console.log(path.join(OUT, 'beats.jpg'));
  } else console.log(dir);
} else if (mode === 'video') {
  const S = Number(arg || 8), FPS = 60, SHUTTER = 0.5; // 180° shutter
  const frames = Math.ceil(meta.DURATION * FPS);
  const outFile = path.join(OUT, 'silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS * S), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `tmix=frames=${S},select='eq(mod(n\\,${S})\\,${S - 1})',setpts=N/(${FPS}*TB)`,
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < S; s++) {
      const t = (f + (S === 1 ? 0 : ((s + 0.5) / S - 0.5) * SHUTTER)) / FPS;
      await page.evaluate(tt => window.seek(tt), Math.max(0, t));
      const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    if (f % 120 === 0) console.log(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) { console.error(`ffmpeg exited ${code}: ${outFile} is not valid`); process.exitCode = 1; }
  else console.log(outFile);
}
await browser.close();
server.close();
