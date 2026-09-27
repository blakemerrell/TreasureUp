# Step 1 of tracing a painted board: finds the painted regions.
#   python3 tools/trace-board/regions.py <picture.png|jpg> <work folder>
# Sea = the deep blue (rivers, being thin, stay land). Land is split by
# flooding outward from seed points (a watershed) over a cost map that is
# high on painted border lines and on hand-drawn cut lines.
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage import filters, morphology, segmentation, color

PIC, WORK = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(WORK, exist_ok=True)
im = np.asarray(Image.open(PIC).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
R, G, B = im[..., 0], im[..., 1], im[..., 2]

# --- sea and the dark frame
blue = (B > R + 25) & (B > G - 10) & (R < 90)
dark = (R < 40) & (G < 40) & (B < 60)
water = blue | dark
water = morphology.binary_opening(water, morphology.disk(15))       # rivers (thin) drop out
water = morphology.remove_small_objects(water, 4000)
land = ~water
land = morphology.remove_small_holes(land, 3000)                   # lakes inside a land stay land
land = morphology.remove_small_objects(land, 3000)                  # boats, specks

# --- cost: edges of a smoothed picture (textures wash out) + the painted cream/ink lines
lab = color.rgb2lab(im / 255.0)
sm = np.stack([ndi.median_filter(lab[..., k], size=9) for k in range(3)], -1)
grad = sum(filters.sobel(sm[..., k]) for k in range(3))
grad = grad / np.percentile(grad[land], 99)
cream = (R > 225) & (G > 205) & (B > 140) & (B < 215) & (R - B > 30)   # the light edge of a border line
cost = np.clip(grad, 0, 1) + 0.6 * ndi.uniform_filter(cream.astype(np.float32), 5)
# Rivers are land, but a flood mustn't run along one into the next land:
# each land fills its own ground before any river water is claimed.
river = ndi.binary_dilation(blue & land, iterations=2)
cost = cost + 0.9 * river

seeds = json.load(open(os.path.join(HERE, 'seeds.json')))
cuts = json.load(open(os.path.join(HERE, 'cuts.json')))
# hand cut lines: a wall the flood can't cross
wall = Image.new('L', (W, H), 0); d = ImageDraw.Draw(wall)
for c in cuts: d.line([tuple(p) for p in c['line']], fill=255, width=c.get('w', 7))
wall = np.asarray(wall) > 0
cost = cost + wall * 50.0

markers = np.zeros((H, W), np.int32)
names = list(seeds.keys())
for i, n in enumerate(names, start=1):
    for (x, y) in seeds[n]:
        yy, xx = np.ogrid[:H, :W]
        markers[(xx - x) ** 2 + (yy - y) ** 2 <= 36] = i
markers[~land] = 0
lab_img = segmentation.watershed(cost, markers, mask=land)
np.save(os.path.join(WORK, 'labels.npy'), lab_img)
json.dump(names, open(os.path.join(WORK, 'names.json'), 'w'))

# overlay: region edges in magenta, cut lines in cyan, seeds as dots
base = Image.open(PIC).convert('RGB')
edges = segmentation.find_boundaries(lab_img, mode='inner')
arr = np.asarray(base).copy()
arr[morphology.binary_dilation(edges, morphology.disk(1))] = [255, 0, 255]
arr[wall] = (arr[wall] * 0.3 + np.array([0, 255, 255]) * 0.7).astype(np.uint8)
ov = Image.fromarray(arr); dd = ImageDraw.Draw(ov)
for i, n in enumerate(names, start=1):
    ys, xs = np.nonzero(lab_img == i)
    if len(xs): dd.text((int(xs.mean()) - 20, int(ys.mean())), n, fill=(255, 255, 0))
    for (x, y) in seeds[n]: dd.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(255, 255, 0))
ov.resize((1600, round(1600 * H / W))).save(os.path.join(WORK, 'regions.png'))       # look at this
counts = {n: int((lab_img == i).sum()) for i, n in enumerate(names, start=1)}
print(json.dumps(counts))
