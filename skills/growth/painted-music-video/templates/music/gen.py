# gen.py: generate one song take with Google Lyria 3 Pro on Vertex AI (vocals + lyrics, up to ~3 min).
#   python music/gen.py music/take1.mp3 --project <gcp-project> --style "Style: ..." [--rename Andy=Ándi]
# Reads music/prompt.md (genre, tempo, instruments, vocal) and music/lyrics.md (section tags + lines).
# Needs: gcloud auth application-default login (or user login), Vertex AI API enabled, billing on the project.
import argparse, base64, pathlib
from google import genai

ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('--project', required=True); ap.add_argument('--style', default='')
ap.add_argument('--rename', action='append', default=[], help='Name=Spelling pairs that dodge the name filter')
ap.add_argument('--model', default='lyria-3-pro-preview')
a = ap.parse_args()
here = pathlib.Path(__file__).parent
lyrics = (here / 'lyrics.md').read_text()
for pair in a.rename:
    k, v = pair.split('='); lyrics = lyrics.replace(k, v)
prompt = f"{a.style}\n{(here / 'prompt.md').read_text()}\nSing exactly these lyrics, in this order:\n\n{lyrics}"
c = genai.Client(vertexai=True, project=a.project, location='global')          # Lyria only serves global/us/eu
i = c.interactions.create(model=a.model, input=prompt)                          # generate_content 400s for Lyria
d = i.output_audio.data
pathlib.Path(a.out).write_bytes(d if isinstance(d, bytes) else base64.b64decode(d))
print('wrote', a.out, i.output_audio.mime_type)
