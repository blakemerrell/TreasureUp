#!/usr/bin/env python3
"""Title of Liberty's pictures as WebP: run after adding or changing any PNG or JPG in liberty/assets/.

The game shows the WebP beside each picture (about a quarter of the size, the same to the eye) and the PNG or JPG only
where a browser can't show WebP. So a WebP must always be made from its picture as it is now: this writes one for every
picture that has none or whose picture has changed since, and notes in liberty/assets/webp.json which picture (by its
SHA-256) each WebP was made from. node tools/test-liberty.mjs fails if a WebP is missing or out of date.

  python3 tools/liberty-webp.py          make what's missing or stale
  python3 tools/liberty-webp.py --all    make them all again
Needs Pillow (pip install pillow)."""
import hashlib, json, os, sys
from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'liberty', 'assets')
MANIFEST = os.path.join(ASSETS, 'webp.json')

def sha(path):
    with open(path, 'rb') as f: return hashlib.sha256(f.read()).hexdigest()

def make(src, out):
    im = Image.open(src)
    if src.endswith('.png'):
        im = im.convert('RGBA') if im.mode in ('P', 'LA', 'RGBA', 'PA') or 'transparency' in im.info else im.convert('RGB')
        im.save(out, 'WEBP', quality=88, alpha_quality=95, method=6)    # sprites: their edges and shading kept
    else:
        im.convert('RGB').save(out, 'WEBP', quality=84, method=6)       # the paintings

def main():
    every = '--all' in sys.argv
    try: done = json.load(open(MANIFEST))
    except FileNotFoundError: done = {}
    made, before, after = [], 0, 0
    for name in sorted(os.listdir(ASSETS)):
        if not name.endswith(('.png', '.jpg')): continue
        src = os.path.join(ASSETS, name); out = os.path.join(ASSETS, name.rsplit('.', 1)[0] + '.webp'); h = sha(src)
        if every or done.get(name) != h or not os.path.exists(out):
            make(src, out); done[name] = h; made.append(name)
        before += os.path.getsize(src); after += os.path.getsize(out)
    for name in [n for n in done if not os.path.exists(os.path.join(ASSETS, n))]: del done[name]     # pictures since removed
    with open(MANIFEST, 'w') as f: json.dump(done, f, indent=1, sort_keys=True); f.write('\n')
    print(f'{len(made)} made{": " + ", ".join(made[:8]) + ("…" if len(made) > 8 else "") if made else ""}. '
          f'All pictures: {before / 1048576:.1f} MB as PNG and JPG, {after / 1048576:.1f} MB as WebP.')

main()
