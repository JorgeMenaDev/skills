// node render.mjs <x|sq> stills 1.5,7,20   → out/<fmt>-still-<t>.jpg
// node render.mjs <x|sq> sheet              → out/<fmt>-sheet.jpg (one frame per second)
// node render.mjs <x|sq> video              → out/andy-ideas-<fmt>.mp4, 30 fps, silent
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(ROOT, 'out');
const TYPES = { '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'content-length': fs.statSync(p).size });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const [fmt = 'x', mode = 'sheet', arg] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
await page.goto(`http://127.0.0.1:${server.address().port}/edit.html?fmt=${fmt}`);
await page.evaluate(() => window.ready);
const meta = await page.evaluate(() => ({ W: window.W, H: window.H, DURATION: window.DURATION }));
await page.setViewportSize({ width: meta.W, height: meta.H });
const shot = async (t, opts) => { await page.evaluate(tt => window.seek(tt), t); return page.screenshot(opts); };

if (mode === 'stills') {
  for (const t of (arg || '0').split(',').map(Number)) {
    const f = path.join(OUT, `${fmt}-still-${t}.jpg`); await shot(t, { path: f, type: 'jpeg', quality: 92 }); console.log(f);
  }
} else if (mode === 'sheet') {
  const dir = path.join(OUT, `${fmt}-sheet`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const n = Math.floor(meta.DURATION);
  for (let i = 0; i <= n; i++) await shot(Math.min(i + 0.5, meta.DURATION - 0.05), { path: path.join(dir, `${String(i).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 80 });
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(dir, '*.jpg'), '-vf', 'scale=480:-1,tile=5x5:padding=4', '-frames:v', '1', path.join(OUT, `${fmt}-sheet.jpg`)], { stdio: 'inherit' });
  console.log(path.join(OUT, `${fmt}-sheet.jpg`), 'duration', meta.DURATION.toFixed(2));
} else {
  const FPS = 30, frames = Math.ceil(meta.DURATION * FPS), outFile = path.join(OUT, `andy-ideas-${fmt}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < frames; f++) {
    const buf = await shot(f / FPS, { type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) { console.error('ffmpeg failed'); process.exitCode = 1; } else console.log(outFile, meta.DURATION.toFixed(2));
}
await browser.close(); server.close();
