import os
import glob
from PIL import Image

frame_dir = '/tmp/map_frames'
frames = sorted(glob.glob(os.path.join(frame_dir, 'frame_*.png')))

if not frames:
    print('No frames found in', frame_dir)
    exit(1)

print(f'Found {len(frames)} frames.')

imgs = []
# Resize to a web-friendly display resolution (e.g. width 720)
target_width = 720

for f in frames:
    im = Image.open(f).convert('RGBA')
    w, h = im.size
    target_height = int(h * (target_width / w))
    im_resized = im.resize((target_width, target_height), Image.Resampling.LANCZOS)
    imgs.append(im_resized)

out_dir = '/Users/blakemerrell/.gemini/antigravity/brain/712c72b4-2fe7-4275-a6c2-f8d78eb1924d/game_assets'
os.makedirs(out_dir, exist_ok=True)

# Save as animated WebP (ultra-crisp with alpha / 24-bit color)
webp_path = os.path.join(out_dir, 'world_map_glow_animation.webp')
imgs[0].save(
    webp_path,
    save_all=True,
    append_images=imgs[1:],
    duration=130,
    loop=0,
    quality=85,
    method=6
)
print('Saved animated WebP to:', webp_path)

# Also save as animated GIF
gif_path = os.path.join(out_dir, 'world_map_glow_animation.gif')
# Quantize frames for high quality GIF palette
gif_frames = []
for im in imgs:
    # Convert RGBA to RGB with parchment background
    bg = Image.new('RGB', im.size, (246, 238, 219))
    bg.paste(im, mask=im.split()[3])
    # Quantize with adaptive palette
    p_frame = bg.quantize(colors=128, method=Image.Resampling.LANCZOS)
    gif_frames.append(p_frame)

gif_frames[0].save(
    gif_path,
    save_all=True,
    append_images=gif_frames[1:],
    duration=130,
    loop=0,
    optimize=True
)
print('Saved animated GIF to:', gif_path)
