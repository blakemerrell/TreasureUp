# Step 4 (a helper): suggests where each land's badge could sit: the spot with
# the most room from its borders, kept clear of the landmarks listed below
# (boxes in picture pixels). Copy the ones you like into labels.json.
#   python3 tools/trace-board/badges.py <work folder> [picture width, 1920]
import json, sys, os
import numpy as np
from shapely.geometry import Polygon, Point, box
WORK = sys.argv[1]; S = 1000 / float(sys.argv[2] if len(sys.argv) > 2 else 1920)
d = json.load(open(os.path.join(WORK, 'rings.json')))
def B(x0, y0, x1, y1): return box(x0 * S, y0 * S, x1 * S, y1 * S)
KEEP_CLEAR = {                                  # the landmarks a badge mustn't cover
  'phoenicia': [B(240, 410, 570, 590)],            # Tyre's harbour
  'syria': [B(690, 510, 910, 650), B(750, 380, 880, 480)],   # the oasis, the fort
  'elam': [B(1420, 660, 1730, 810)],               # Shushan's palace
  'babylonia': [B(920, 280, 1380, 600), B(1140, 650, 1280, 790)],   # Babylon, Ur
  'media': [B(1370, 380, 1590, 550)],              # Ecbatana's walls
  'assyria': [B(1260, 140, 1630, 300)],            # the fortress
  'cilicia': [B(510, 300, 630, 380), B(430, 340, 630, 410)],
  'judah': [B(470, 590, 590, 730), B(420, 760, 570, 860)],   # the temple, the city
  'egypt': [B(220, 800, 480, 950), B(430, 900, 650, 1020)],  # the pyramids, the temple
  'armenia': [B(870, 20, 1110, 210)],              # Ararat and the ark
}
for k, ring in d['lands'].items():
    p = Polygon(ring).buffer(0); edge = p.exterior; x0, y0, x1, y1 = p.bounds; best = None
    for x in np.arange(x0, x1, 2):
        for y in np.arange(y0, y1, 2):
            pt = Point(x, y)
            if not p.contains(pt): continue
            room = edge.distance(pt)
            for z in KEEP_CLEAR.get(k, []): room = min(room, -1 if z.contains(pt) else z.exterior.distance(pt))
            if best is None or room > best[0]: best = (room, round(float(x), 1), round(float(y), 1))
    print(f'{k:11s} [{best[1]}, {best[2]}]  room {best[0]:.1f}  (a badge needs about 21)')
