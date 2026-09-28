"""Flag single-frame pops: a frame difference >3x both neighbours.  python3 scan.py out/silent.mp4"""
import subprocess, sys, numpy as np
from fractions import Fraction
if len(sys.argv) < 2: print(__doc__); sys.exit(1)
fr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                     "-of", "csv=p=0", sys.argv[1]], capture_output=True, text=True).stdout.strip() or "60/1"
fps = float(Fraction(fr))
w, h = 320, 180
raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", sys.argv[1], "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean((1, 2))
pops = [i for i in range(1, len(d) - 1) if d[i] > 3 * max(d[i - 1], d[i + 1]) and d[i] > 1.0]
print(f"frames {len(f)} at {fps:g} fps")
for i in pops: print(f"POP frame {i + 1}  t={(i + 1) / fps:.3f}s  diff {d[i]:.1f} vs {d[i - 1]:.1f}/{d[i + 1]:.1f}")
print("POPS: none" if not pops else f"POPS: {len(pops)}")
