"""Loudness gate for the final MP4: -14 LUFS integrated, true peak at or under -1 dBTP.  python3 audio/loud.py out/film.mp4

Measures the encoded file, not out/mix.wav: the AAC encode adds true peak. Prints LOUDNESS: OK or FAIL with the fix.
"""
import re, subprocess, sys
if len(sys.argv) < 2: print(__doc__); sys.exit(1)
err = subprocess.run(["ffmpeg", "-nostats", "-i", sys.argv[1], "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
summary = err[err.rfind("Summary:"):]
I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
tp = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
ok = tp <= -1.0 and abs(I + 14) <= 1.0
print(f"integrated {I:.1f} LUFS · true peak {tp:.1f} dBTP")
if ok: print("LOUDNESS: OK")
else:
    print("LOUDNESS: FAIL  " + ("true peak over -1 dBTP: lower TP in audio/mix.py's loudnorm and re-mux" if tp > -1.0 else "integrated loudness off -14 LUFS: check MUSIC.gain and re-mix"))
    sys.exit(1)
