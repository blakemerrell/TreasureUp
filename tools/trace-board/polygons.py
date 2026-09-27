# Step 2: the land regions (and the seas) as polygons whose shared edges match
# exactly (along pixel edges), as GeoJSON for step 3 to simplify.
#   python3 tools/trace-board/polygons.py <picture> <work folder>
import json, sys, os
import numpy as np
from scipy import ndimage as ndi
import rasterio.features
from PIL import Image

PIC, WORK = sys.argv[1], sys.argv[2]
lab = np.load(os.path.join(WORK, 'labels.npy')); names = json.load(open(os.path.join(WORK, 'names.json')))
LANDS = ['lydia','cappadocia','cilicia','armenia','assyria','media','syria','phoenicia','judah','egypt','arabia','babylonia','elam','persis']
out = np.zeros_like(lab, dtype=np.int32)
for i, n in enumerate(LANDS, 1):
    m = lab == names.index(n) + 1
    pieces, k = ndi.label(m)
    if k > 1:                                                      # keep the biggest piece
        sizes = ndi.sum(np.ones_like(m), pieces, range(1, k + 1)); m = pieces == (1 + int(np.argmax(sizes)))
    m = ndi.binary_fill_holes(m)                                    # lakes, specks inside a land
    out[m & (out == 0)] = i
# seas, from the blue water only (not the dark frame), split by where they lie
im = np.asarray(Image.open(PIC).convert('RGB')).astype(np.float32)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
H, W = lab.shape
blue = (B > R + 25) & (B > G - 10) & (R < 90) & ~((R < 40) & (G < 40) & (B < 60))
from skimage import morphology
blue = morphology.binary_opening(blue, morphology.disk(15)) & (lab == 0)
yy, xx = np.mgrid[:H, :W]
SEAS = {'Mediterranean': blue & (xx < 720) & (yy < 780) & (xx > 60),
        'Red Sea': blue & (xx > 560) & (xx < 760) & (yy > 760) & (yy < 1120),
        'Persian Gulf': blue & (xx > 1500) & (yy > 900) & (xx < 1880),
        'Caspian Sea': blue & (xx > 1580) & (yy < 700) & (xx < 1880)}
seaimg = np.zeros_like(out)
for j, (n, m) in enumerate(SEAS.items(), 101):
    pieces, k = ndi.label(m)
    if k:
        sizes = ndi.sum(np.ones_like(m), pieces, range(1, k + 1)); m = pieces == (1 + int(np.argmax(sizes)))
    seaimg[m] = j
feats = []
for geom, v in rasterio.features.shapes(out, mask=out > 0, connectivity=4):
    feats.append({'type': 'Feature', 'properties': {'id': LANDS[int(v) - 1]}, 'geometry': geom})
for geom, v in rasterio.features.shapes(seaimg, mask=seaimg > 0, connectivity=4):
    feats.append({'type': 'Feature', 'properties': {'sea': list(SEAS)[int(v) - 101]}, 'geometry': geom})
json.dump({'type': 'FeatureCollection', 'features': feats}, open(os.path.join(WORK, 'regions.geojson'), 'w'))
from collections import Counter
print('land polygons per land:', dict(Counter(f['properties'].get('id') for f in feats if 'id' in f['properties'])))
print('sea polygons:', dict(Counter(f['properties'].get('sea') for f in feats if 'sea' in f['properties'])))
print('holes:', [f['properties'].get('id') or f['properties'].get('sea') for f in feats if len(f['geometry']['coordinates']) > 1])
