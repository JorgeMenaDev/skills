"""Mix MUSIC + SFX from out/timeline.json into out/mix.wav at -14 LUFS, -3.5 dBTP.  python3 audio/mix.py

The headroom below the -1 dBTP target is for the AAC encode. Keystroke hits are near-full-scale transients: a
film with ~100 of them encoded to +5 dBTP from a -2.2 dBTP mix (2026-10-07). The 15 kHz low-pass (AAC drops
that band anyway) plus -3.5 dBTP brought it to -1.9. audio/loud.py checks the MP4.

Reads what the film declares (render.mjs writes timeline.json): MUSIC {file, offset, gain}, SFX [{f, t, v, peak}].
peak:true aligns the file's loudest point to t; otherwise the file starts at t.
"""
import json, os, subprocess, numpy as np
SR = 48000
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", p, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

m = json.load(open("out/timeline.json"))
N = int((m["DURATION"] + 0.1) * SR); out = np.zeros((N, 2)); missing = []
mu = m.get("MUSIC") or {}
if mu.get("offset", 0) < 0: raise SystemExit("MUSIC.offset is negative: pick a later drop from beats.py")
if mu.get("file") and os.path.exists(mu["file"]):
    a = int(mu.get("offset", 0) * SR); s = load(mu["file"])[a:a + N] * mu.get("gain", 0.75)
    s[:960] *= np.linspace(0, 1, 960)[:, None]
    fo = min(len(s), int(0.9 * SR)); s[-fo:] *= (np.linspace(1, 0, fo) ** 1.5)[:, None]
    out[:len(s)] += s
else: missing.append(mu.get("file", "MUSIC"))
cache = {}
for ev in m["SFX"]:
    p = os.path.join("audio/sfx", ev["f"])
    if not os.path.exists(p): missing.append(p); continue
    y = cache.setdefault(p, load(p))
    off = int(np.argmax(np.convolve(np.abs(y).mean(1), np.ones(240) / 240, "same"))) if ev.get("peak") else 0
    st = int(ev["t"] * SR) - off
    if st < 0: y, st = y[-st:], 0
    e = min(N, st + len(y)); out[st:e] += y[:e - st] * ev["v"]
out /= max(1.0, np.abs(out).max() / 0.95)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f64le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-af", "lowpass=f=15000,loudnorm=I=-14:TP=-3.5:LRA=11", "-ar", str(SR), "out/mix.wav"], input=out.tobytes(), check=True)
print(f"out/mix.wav  {N / SR:.2f}s  {len(m['SFX'])} events")
for p in sorted(set(missing)): print("MISSING", p)
