"""Stylised map layers from the product's own terrain data (read-only), plus fells.json.
python3 tools/gen_map.py  → assets/map_overview.jpg, assets/map_detail.jpg, assets/fells.json"""
import csv, json, re, numpy as np
from scipy import ndimage
from PIL import Image
REPO = '/Users/jorge/dev/code/wainwright-tracker'
T = REPO + '/apps/web/public/terrain/v2/'

def decode(buf, n):
    r = np.frombuffer(buf[:n * n * 2], '<i2').astype(np.int64).reshape(n, n)
    return np.cumsum(np.cumsum(r, 0), 1) / 4.0, buf[n * n * 2:]

def district():
    h, rest = decode(open(T + 'district.bin', 'rb').read(), 1001)
    water = np.frombuffer(rest, np.uint8).reshape(2000, 2000) / 200.0
    return h, water  # h: 100 m, row0 = N 570000, col0 = E 280000; water: 50 m cells

def tile(e, n):
    h, rest = decode(open(T + f'tiles/{e}_{n}.bin', 'rb').read(), 501)
    s = np.frombuffer(rest, np.uint8).reshape(500, 500)
    return h, s

LAND = np.array([226, 234, 214]); VALLEY = np.array([206, 224, 196]); TOP = np.array([236, 236, 224])
WOOD = np.array([196, 218, 184]); WATER = np.array([178, 214, 232]); CONT = np.array([138, 110, 75])

def paint(h, water, wood, mpp, iv, idx, lw):
    # h, water, wood on the output grid; mpp metres per pixel
    gy, gx = np.gradient(h, mpp)
    az = np.radians(315); alt = np.radians(45)
    slope = np.arctan(np.hypot(gx, gy) * 1.6); aspect = np.arctan2(-gx, gy)
    shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    shade = np.clip(shade, 0, 1)
    t = np.clip((h - 80) / 700, 0, 1)[..., None]
    base = VALLEY * (1 - t) + TOP * t
    base = base * (0.80 + 0.28 * shade[..., None])
    base = base * (1 - wood[..., None] * 0.55) + WOOD * wood[..., None] * 0.55
    # anti-aliased contours: distance to nearest iso line in pixels
    g = np.hypot(gx, gy) * mpp + 1e-6
    for step, alpha, w in ((iv, 0.22, lw), (idx, 0.38, lw * 1.5)):
        f = h / step; d = np.abs(f - np.round(f)) * step / g
        a = np.clip(1 - (d - w / 2) / 1.0, 0, 1) * alpha * (h > 20)
        base = base * (1 - a[..., None]) + CONT * a[..., None]
    wv = np.clip(water, 0, 1)[..., None]
    base = base * (1 - wv) + WATER * wv
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))

def overview(E0, E1, N0, N1, mpp):
    h, water = district()
    W = int((E1 - E0) / mpp); H = int((N1 - N0) / mpp)
    xs = (E0 + (np.arange(W) + .5) * mpp - 280000) / 100; ys = (570000 - (N1 - (np.arange(H) + .5) * mpp)) / 100
    X, Y = np.meshgrid(xs, ys)
    hh = ndimage.map_coordinates(h, [Y, X], order=3)
    ww = ndimage.map_coordinates(water, [Y * 2 - .5, X * 2 - .5], order=1)
    return paint(hh, ww, np.zeros_like(hh), mpp, 50, 250, 0.9)

def detail(E0, E1, N0, N1, mpp):
    ek = range((E0 // 5000) * 5, (E1 - 1) // 5000 * 5 + 1, 5); nk = range((N0 // 5000) * 5, (N1 - 1) // 5000 * 5 + 1, 5)
    ne, nn = len(ek), len(nk)
    H = np.zeros((nn * 500 + 1, ne * 500 + 1)); S = np.zeros((nn * 500, ne * 500), np.uint8)
    for i, n in enumerate(reversed(list(nk))):
        for j, e in enumerate(ek):
            h, s = tile(e, n)
            H[i * 500:i * 500 + 501, j * 500:j * 500 + 501] = h; S[i * 500:(i + 1) * 500, j * 500:(j + 1) * 500] = s
    Etop, Ntop = ek[0] * 1000, (nk[-1] + 5) * 1000
    W = int((E1 - E0) / mpp); Hh = int((N1 - N0) / mpp)
    xs = (E0 + (np.arange(W) + .5) * mpp - Etop) / 10; ys = (Ntop - (N1 - (np.arange(Hh) + .5) * mpp)) / 10
    X, Y = np.meshgrid(xs, ys)
    hh = ndimage.map_coordinates(ndimage.gaussian_filter(H, 1.0), [Y, X], order=3)
    water = np.where(S <= 200, S / 200.0, 0); wood = (S >= 254).astype(float)
    ww = ndimage.map_coordinates(water, [Y - .5, X - .5], order=1)
    wd = ndimage.map_coordinates(ndimage.gaussian_filter(wood, 1), [Y - .5, X - .5], order=1)
    return paint(hh, ww, wd, mpp, 10, 50, 1.1)

OV = dict(E0=280000, E1=380000, N0=470000, N1=570000, mpp=35)
DT = dict(E0=315000, E1=327000, N0=504000, N1=517000, mpp=4)
if __name__ == '__main__':
    overview(**OV).save('assets/map_overview.jpg', quality=90)
    detail(**DT).save('assets/map_detail.jpg', quality=90)
    ts = open(REPO + '/packages/catalog/src/wainwrights.ts').read()
    meta = {}
    for blk in re.findall(r'\{([^{}]*?id: "[^"]+"[^{}]*)\}', ts):
        g = lambda k: re.search(k + r': ("?)([^",\n]+)\1', blk).group(2)
        meta[g('id')] = dict(name=g('name'), m=float(g('heightMetres')), ft=int(g('heightFt')), area=g('area'), book=int(g('bookNumber')))
    fells = []
    for r in csv.DictReader(open(REPO + '/packages/catalog/data/dobih-v18.3-wainwrights.csv')):
        m = meta[r['id']]; fells.append(dict(id=r['id'], **m, e=int(r['Xcoord']), n=int(r['Ycoord'])))
    assert len(fells) == 214
    json.dump(dict(OV=OV, DT=DT, fells=fells), open('assets/fells.json', 'w'))
    print('ok', len(fells))
