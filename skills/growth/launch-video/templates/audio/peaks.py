"""Measure SFX onsets and peaks, or cut isolated hits out of a long take.

  python3 audio/peaks.py audio/sfx/*.mp3                 onset and peak time per file
  python3 audio/peaks.py --hits audio/sfx/<typing>.mp3 4 → audio/sfx/hit0..3.wav (single keystrokes, taps)
"""
import subprocess, sys, numpy as np
SR = 44100
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)
def env(y, ms=5):
    w = int(ms / 1000 * SR); return np.convolve(np.abs(y), np.ones(w) / w, "same")

def hits(path, n):
    y = load(path); e = env(y, 3); thr = 0.35 * np.percentile(e, 99.5)
    ons, i = [], 0
    while i < len(e):
        if e[i] > thr: ons.append(i); i += int(0.15 * SR)
        else: i += 1
    good = sorted(((e[o:o + int(0.12 * SR)].max(), o) for o in ons if o > int(0.06 * SR)
                   and e[o - int(0.06 * SR):o - int(0.01 * SR)].max() < 0.25 * thr), reverse=True)
    if len(good) < n: print(f"only {len(good)} isolated hits found (asked for {n}): try a slower typing take")
    for k, (_, o) in enumerate(good[:n]):
        st = max(0, o - int(0.005 * SR)) / SR
        subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-ss", f"{st:.4f}", "-t", "0.13", "-i", path,
                        "-af", "afade=t=out:st=0.09:d=0.04", "-ac", "2", "-ar", "48000", f"audio/sfx/hit{k}.wav"])
        print(f"audio/sfx/hit{k}.wav  from {st:.3f}s")

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(1)
    if a[0] == "--hits": hits(a[1], int(a[2]) if len(a) > 2 else 4); sys.exit()
    for p in a:
        y = load(p); e = env(y)
        print(f"{p:32s} dur {len(y) / SR:5.2f}s  onset {np.argmax(e > 0.1 * e.max()) / SR:.3f}s  peak {np.argmax(e) / SR:.3f}s")
