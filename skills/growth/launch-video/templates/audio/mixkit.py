"""Find and fetch free Mixkit music and sound effects (Mixkit licence: free for commercial use).

  python3 audio/mixkit.py music <tag>        list tracks:  id  duration  title
  python3 audio/mixkit.py sfx <tag>          list effects: id  duration  title
  python3 audio/mixkit.py get music <id>     → audio/music/<id>.mp3
  python3 audio/mixkit.py get sfx <id>       → audio/sfx/<id>.mp3

Tags are Mixkit URL paths: music `mood/energetic`, `mood/happy`, `mood/uplifting`, `tag/corporate`,
`tag/technology` (~25-36 tracks each); sfx `click`, `pop`, `whoosh`, `swoosh`, `impact`, `notification`,
`sparkle`, `typing`.
Each item's <h2> title comes AFTER its preview URL in the HTML; pairing a URL with the title before it
mislabels every row.
"""
import html, os, re, sys, urllib.error, urllib.request

UA = {"User-Agent": "Mozilla/5.0"}
def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()

def listing(kind, tag):
    base = "https://mixkit.co/free-stock-music/" if kind == "music" else "https://mixkit.co/free-sound-effects/"
    try:
        s = fetch(base + tag.strip("/") + "/").decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        sys.exit(f"{kind} tag '{tag}': HTTP {e.code}. Try one of the tags in this script's docstring.")
    pat = r'preview-url-value="([^"]+)".*?item-grid-card__title">\s*(.*?)\s*</h2>.*?meta-time[^>]*>\s*([\d:]+)'
    seen = set()
    for url, title, dur in re.findall(pat, s, re.S):
        m = re.search(r"/(?:music|sfx)/(\d+)/", url)
        if m and m.group(1) not in seen:
            seen.add(m.group(1)); print(f"{m.group(1):>6}  {dur:>5}  {html.unescape(title)}")
    if len(seen) < 3: print(f"only {len(seen)} items under '{tag}': try another tag")

def get(kind, id_):
    url = (f"https://assets.mixkit.co/music/{id_}/{id_}.mp3" if kind == "music"
           else f"https://assets.mixkit.co/active_storage/sfx/{id_}/{id_}-preview.mp3")
    os.makedirs(f"audio/{kind}", exist_ok=True)
    path = f"audio/{kind}/{id_}.mp3"
    open(path, "wb").write(fetch(url)); print(path)

if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) == 3 and a[0] == "get": get(a[1], a[2])
    elif len(a) == 2 and a[0] in ("music", "sfx"): listing(a[0], a[1])
    else: print(__doc__)
