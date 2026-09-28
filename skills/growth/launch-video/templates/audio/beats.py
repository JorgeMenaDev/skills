"""Beat grid for a song, fitted to its kick drums.  python3 audio/beats.py audio/music/<id>.mp3 [film_beats]

Prints the exact BPM and first-beat offset, per-beat energy, the breakdown/drop candidates, and the MUSIC
offset that puts the drop on film beat 12 (the default template: 12 beats of build, then the drop).
Tempo from onset autocorrelation alone lands the phase ~0.15 s late: always refit to the kicks.
"""
import subprocess, sys, numpy as np
from scipy.signal import butter, sosfilt

SR = 22050
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)

def rough_tempo(y):
    hop, n = 512, 2048
    fr = np.lib.stride_tricks.sliding_window_view(y, n)[::hop] * np.hanning(n)
    S = np.log1p(100 * np.abs(np.fft.rfft(fr, axis=1)))
    flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
    flux = np.maximum(flux - np.convolve(flux, np.ones(16) / 16, "same"), 0)
    fps = SR / hop
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lags = np.arange(len(ac)); bpm = 60 * fps / np.maximum(lags, 1)
    m = (bpm >= 90) & (bpm <= 160)
    return float(bpm[m][np.argmax(ac[m])])

def main(path, film_beats=32):
    y = load(path)
    lo = sosfilt(butter(4, 150, "low", fs=SR, output="sos"), y)
    env = np.convolve(np.abs(lo), np.ones(int(0.003 * SR)) / int(0.003 * SR), "same")
    # fine search: tempo ±2 BPM (autocorrelation lags are coarse) and phase, scored on the kick envelope
    dur, best = len(y) / SR - 0.1, (-1, 0, 0)
    for bpm in np.arange(rough_tempo(y) - 2, rough_tempo(y) + 2, 0.01):
        P = 60 / bpm
        for o in np.linspace(0, P, 48, endpoint=False):
            sc = env[(np.arange(o, dur, P) * SR).astype(int)].mean()
            if sc > best[0]: best = (sc, P, o)
    _, P, O = best
    # refit period+offset to per-beat kick onsets (first crossing of 50% of the local max), twice
    for _ in range(2):
        bs, ts = [], []
        for b in range(1, int((dur - O) / P) - 1):
            c = O + b * P; a, z = int((c - 0.3 * P) * SR), int((c + 0.3 * P) * SR)
            seg = env[max(a, 0):z]
            if len(seg) == 0 or seg.max() < 0.2 * env.max(): continue
            bs.append(b); ts.append((max(a, 0) + np.argmax(seg > 0.5 * seg.max())) / SR)
        bs, ts = np.array(bs), np.array(ts)
        (P, O), *_ = np.linalg.lstsq(np.vstack([bs, np.ones_like(bs)]).T, ts, rcond=None)
    O = O % P
    resid = np.std(ts - (bs * P + O)) if len(bs) else float("nan")
    print(f"BPM {60 / P:.4f}  period {P:.6f}s  offset {O:.4f}s  kicks {len(bs)}  residual {resid * 1000:.1f} ms")
    n = int((len(y) / SR - O) / P)
    energy = np.array([np.sqrt(np.mean(lo[int((O + b * P) * SR):int((O + (b + 1) * P) * SR)] ** 2)) for b in range(n)])
    energy /= energy.max()
    # drop: first strong beat after >=2 quiet beats, scored by the jump
    drops = []
    for b in range(10, n - 4):
        quiet = energy[b - 2:b].max()
        if quiet < 0.35 * energy[b:b + 4].mean():
            drops.append((energy[b:b + 4].mean() / (energy[b - 4:b].mean() + 1e-9), b))
    # one candidate per cluster of adjacent beats (the strongest), then in song order
    clusters = []
    for score, b in drops:
        if clusters and b - clusters[-1][-1][1] <= 2: clusters[-1].append((score, b))
        else: clusters.append([(score, b)])
    drops = [max(c) for c in clusters]
    print("song beat : time  : low-band energy")
    for b in range(min(n, 64)): print(f"  {b:3d} {O + b * P:7.3f}  {'#' * int(energy[b] * 30)}")
    for score, b in drops[:4]:
        start = b - 12
        print(f"DROP beat {b} at {O + b * P:.3f}s (jump x{score:.1f}) → MUSIC.offset {O + start * P:.4f} puts it on film beat 12"
              + ("" if start >= 0 else "  (drop too early for 12 beats of build)"))
    if not drops: print("DROP none found: pick a track with a breakdown, or place the hero moment on a downbeat")

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    main(sys.argv[1])
