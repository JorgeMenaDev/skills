"""Measure a render: single-frame pops, rest windows and the end hold.  python3 scan.py out/silent.mp4

POP: a frame difference >3x both neighbours (something appears or jumps for one frame).
REST: runs of >=0.25 s where every frame stays within a small difference of the run's FIRST frame (so a
slow drift or a residual ease does not count as still). The run that reaches the final frame is the END HOLD;
a film should close on about 2 s (at least 1.5 s) of still brand frame.
"""
import subprocess, sys, numpy as np
from fractions import Fraction
if len(sys.argv) < 2: print(__doc__); sys.exit(1)
fr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                     "-of", "csv=p=0", sys.argv[1]], capture_output=True, text=True).stdout.strip() or "60/1"
fps = float(Fraction(fr))
w, h = 320, 320  # square thumbnails: fine for difference detection at any aspect
raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", sys.argv[1], "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean((1, 2))
pops = [i for i in range(1, len(d) - 1) if d[i] > 3 * max(d[i - 1], d[i + 1]) and d[i] > 1.0]
print(f"frames {len(f)} at {fps:g} fps ({len(f) / fps:.2f} s)")
for i in pops: print(f"POP frame {i + 1}  t={(i + 1) / fps:.3f}s  diff {d[i]:.1f} vs {d[i - 1]:.1f}/{d[i + 1]:.1f}")
runs, start = [], 0
for i in range(1, len(f) + 1):
    if i == len(f) or np.abs(f[i] - f[start]).mean() > 0.6:   # drifted away from the run's first frame
        if (i - start) / fps >= 0.25: runs.append((start, i))
        start = i
rest = sum(b - a for a, b in runs) / fps
hold = (runs[-1][1] - runs[-1][0]) / fps if runs and runs[-1][1] == len(f) else 0.0
print(f"REST: {rest:.2f} s in {len(runs)} windows" + "".join(f"  [{a / fps:.2f}-{b / fps:.2f}]" for a, b in runs))
print(f"END HOLD: {hold:.2f} s" + ("" if hold >= 1.5 else "  (under 1.5 s: hold the last frame longer)"))
print("POPS: none" if not pops else f"POPS: {len(pops)}")
