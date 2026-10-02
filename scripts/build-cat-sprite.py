"""Normalize a hand-made cat sprite sheet into an even strip of frames.

Usage: python scripts/build-cat-sprite.py <input> <output.webp>
Each cat in the source becomes one frame, ordered left to right. Frames share
the same cell size, ground line and horizontal anchor (the paws) so a CSS
steps() animation loops without jumping. Prints the frame metadata as JSON.
"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
rgba = np.array(Image.open(src).convert('RGBA'))
alpha = rgba[:, :, 3]

# One label per cat, then hand every soft edge pixel to its nearest cat.
labels, count = ndimage.label(alpha > 128)
sizes = np.bincount(labels.ravel())
keep = [i for i in range(1, count + 1) if sizes[i] > 3000]
core = np.where(np.isin(labels, keep), labels, 0)
_, (iy, ix) = ndimage.distance_transform_edt(core == 0, return_indices=True)
owner = core[iy, ix]

# Clean background-removal residue: drop faint haze, make bodies fully opaque.
clean = alpha.astype(np.int32)
clean[clean < 14] = 0
clean[clean > 236] = 255

frames = []
for label in keep:
    mask = (owner == label) & (clean > 0)
    ys, xs = np.where(mask)
    top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()
    solid = (owner == label) & (clean > 128)
    ground = np.where(solid.any(axis=1))[0].max()
    feet = np.where(solid[ground - 30:ground + 1].any(axis=0))[0]
    anchor = int(round(feet.mean()))
    frames.append(dict(label=label, top=top, bottom=bottom, left=left, right=right, ground=ground, anchor=anchor))
frames.sort(key=lambda f: f['left'])

pad = 8
half = max(max(f['anchor'] - f['left'], f['right'] - f['anchor']) for f in frames) + pad
above = max(f['ground'] - f['top'] for f in frames) + pad
below = max(f['bottom'] - f['ground'] for f in frames) + pad
cell_w, cell_h = 2 * half, above + below

sheet = np.zeros((cell_h, cell_w * len(frames), 4), dtype=np.uint8)
for i, f in enumerate(frames):
    piece = rgba.copy()
    piece[:, :, 3] = np.where(owner == f['label'], clean, 0).astype(np.uint8)
    crop = piece[f['top']:f['bottom'] + 1, f['left']:f['right'] + 1]
    x = i * cell_w + half - (f['anchor'] - f['left'])
    y = above - (f['ground'] - f['top'])
    region = sheet[y:y + crop.shape[0], x:x + crop.shape[1]]
    visible = crop[:, :, 3] > 0
    region[visible] = crop[visible]

Image.fromarray(sheet).save(out, 'WEBP', quality=88, method=6)
print(json.dumps({'frames': len(frames), 'width': int(cell_w), 'height': int(cell_h), 'ground': int(above)}))
