# analyze.py: beat grid (librosa) + word timestamps (whisper) for one take → music/<take>.analysis.json
#   python music/analyze.py music/take1.mp3 --lang es
# Prints duration, tempo and the transcript per segment: compare it with lyrics.md to judge diction.
import argparse, json, librosa, numpy as np, mlx_whisper
ap = argparse.ArgumentParser(); ap.add_argument('take'); ap.add_argument('--lang', default='es')
ap.add_argument('--model', default='mlx-community/whisper-small-mlx'); a = ap.parse_args()
y, sr = librosa.load(a.take, sr=22050, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
tempo = float(np.atleast_1d(tempo)[0])
print('duration %.1fs tempo %.1f beats %d' % (len(y) / sr, tempo, len(beats)))
r = mlx_whisper.transcribe(a.take, path_or_hf_repo=a.model, language=a.lang, word_timestamps=True)
for s in r['segments']: print('%6.2f-%6.2f %s' % (s['start'], s['end'], s['text'].strip()))
json.dump({'duration': len(y) / sr, 'tempo': tempo, 'beats': [float(b) for b in beats], 'segments': r['segments']},
          open(a.take.rsplit('.', 1)[0] + '.analysis.json', 'w'), ensure_ascii=False)
