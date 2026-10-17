# paste.py AI.png BAND.png OUT.png [x,y,w,h ...]
# Puts the real photo back into an AI-widened 16:9 frame. Aligns the band (from canvas.sh) to the AI
# frame with SIFT + RANSAC, matches colour (Lab mean/std, then a luminance-only local gain, because
# phone photos vignette and edit models re-grade), and joins each side on a minimum-difference seam
# inside a 200 px overlap. Boxes (band coordinates) are left to the AI, e.g. a removed logo.
# Prints alignment error and how much of the frame is real pixels.
# Run: uv run --with opencv-python-headless --with numpy scripts/reframe/paste.py ...
import sys, cv2, numpy as np
ai = cv2.imread(sys.argv[1]); band = cv2.imread(sys.argv[2]); out = sys.argv[3]
boxes = [tuple(int(v) for v in b.split(',')) for b in sys.argv[4:]]
W, H = 1920, 1080
ai = cv2.resize(ai, (W, H), interpolation=cv2.INTER_AREA)
sift = cv2.SIFT_create(6000)
k1, d1 = sift.detectAndCompute(cv2.cvtColor(band, cv2.COLOR_BGR2GRAY), None)
k2, d2 = sift.detectAndCompute(cv2.cvtColor(ai, cv2.COLOR_BGR2GRAY), None)
good = [a for a, b in cv2.BFMatcher().knnMatch(d1, d2, k=2) if a.distance < 0.7 * b.distance]
src = np.float32([k1[g.queryIdx].pt for g in good]); dst = np.float32([k2[g.trainIdx].pt for g in good])
Hm, inl = cv2.findHomography(src, dst, cv2.RANSAC, 3.0)
sel = inl.ravel() == 1
err = np.linalg.norm(cv2.perspectiveTransform(src[sel][None], Hm)[0] - dst[sel], axis=1)
real = cv2.warpPerspective(band, Hm, (W, H), flags=cv2.INTER_LANCZOS4).astype(np.float32)
cover = cv2.warpPerspective(np.ones(band.shape[:2], np.float32), Hm, (W, H)) > 0.999
cover = cv2.erode(cover.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
cols = np.where(cover.mean(0) > 0.98)[0]; x0, x1 = int(cols.min()), int(cols.max())
aif = ai.astype(np.float32)
# Colour: global Lab mean/std match over the shared area, then a luminance-only local gain
# (wide blur, tight clip) so the join matches without per-channel tints.
la = cv2.cvtColor(ai, cv2.COLOR_BGR2LAB).astype(np.float32); lr = cv2.cvtColor(real.astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
for c in range(3):
    a, r = la[..., c][cover], lr[..., c][cover]
    la[..., c] = (la[..., c] - a.mean()) / (a.std() + 1e-6) * r.std() + r.mean()
s = 45
L_ai, L_re = la[..., 0], lr[..., 0]
wgt = cv2.GaussianBlur(cover.astype(np.float32), (0, 0), s)
num = cv2.GaussianBlur(L_re * cover, (0, 0), s) / np.maximum(wgt, 1e-3)
den = cv2.GaussianBlur(L_ai * cover, (0, 0), s) / np.maximum(wgt, 1e-3)
gain = np.clip((num + 5) / (den + 5), 0.8, 1.25)
xs = np.arange(W)[None, :]
edgeL = gain[:, x0 + 60:x0 + 61]; edgeR = gain[:, x1 - 61:x1 - 60]
fadeL = np.clip((x0 + 60 - xs) / 500.0, 0, 1); fadeR = np.clip((xs - (x1 - 60)) / 500.0, 0, 1)
g = np.where(xs < x0 + 60, edgeL * (1 - fadeL) + fadeL, gain)
g = np.where(xs > x1 - 60, edgeR * (1 - fadeR) + fadeR, g)
la[..., 0] = np.clip(L_ai * g, 0, 255)
aig = cv2.cvtColor(np.clip(la, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
# Minimum-difference seams inside the overlaps.
diff = cv2.GaussianBlur(np.abs(aig - real).sum(2), (0, 0), 2)
def seam(lo, hi):
    c = diff[:, lo:hi].copy(); n = c.shape[1]; back = np.zeros(c.shape, np.int32)
    for y in range(1, H):
        prev = c[y - 1]; cand = np.stack([np.r_[np.inf, prev[:-1]], prev, np.r_[prev[1:], np.inf]])
        k = cand.argmin(0); back[y] = k - 1; c[y] += cand[k, np.arange(n)]
    path = np.zeros(H, np.int32); path[-1] = int(c[-1].argmin())
    for y in range(H - 1, 0, -1): path[y - 1] = np.clip(path[y] + back[y, path[y]], 0, n - 1)
    return path + lo
ov = 200
sl = seam(x0 + 4, x0 + ov); sr = seam(x1 - ov, x1 - 4)
m = np.zeros((H, W), np.float32)
for y in range(H): m[y, sl[y]:sr[y]] = 1
m *= cover
bm = np.ones(band.shape[:2], np.float32)
for x, y, w, h in boxes: bm[y:y + h, x:x + w] = 0
m *= cv2.warpPerspective(cv2.erode(bm, np.ones((9, 9), np.uint8)), Hm, (W, H))
m = cv2.GaussianBlur(m, (0, 0), 3)[..., None]
res = (real * m + aig * (1 - m)).astype(np.uint8)
cv2.imwrite(out, res)
print(f"inliers={int(sel.sum())}/{len(good)} reproj_med={np.median(err):.2f}px band_x={x0}..{x1} "
      f"seamL={sl.min()}..{sl.max()} seamR={sr.min()}..{sr.max()} real_pixels={float((m[..., 0] > 0.5).mean()) * 100:.0f}%")
