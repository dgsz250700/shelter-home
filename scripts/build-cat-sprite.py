"""Normalize a hand-made cat sprite sheet into an even strip of frames.

Usage: python scripts/build-cat-sprite.py <input> <output.webp> [frames] [numbered] [shift=FIRST-LAST:PX] [use=FIRST-LAST]

Each cat in the source becomes one frame, read row by row, left to right.
Frames share the same cell size, ground line and horizontal anchor so a CSS
steps() animation loops without jumping. Prints the frame metadata as JSON.

- Pass the expected frame count when cats touch each other; they are then
  separated by shrinking the shapes until that many cores appear.
- With `numbered`, the frame numbers drawn under each frame decide which pieces
  belong together (a cat and its box, for example) and where the frame is
  centred, so props keep their place instead of following the cat's paws.
- `shift=1-3:60` says frames 1 to 3 were drawn 60 px right of their number
  (for example a cat with its box beside it), so their column moves with them.
- `use=4-24` keeps only those frames in the output (to skip frames that overlap).
Small blobs such as frame numbers are discarded from the output.
"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
expected = int(sys.argv[3]) if len(sys.argv) > 3 else None
numbered = 'numbered' in sys.argv[4:]
shifts = {}
for arg in sys.argv[4:]:
    if arg.startswith('shift='):
        span, px = arg[6:].split(':')
        first, last = (int(n) for n in span.split('-'))
        shifts.update({n - 1: float(px) for n in range(first, last + 1)})
use = None
for arg in sys.argv[4:]:
    if arg.startswith('use='):
        first, last = (int(n) for n in arg[4:].split('-'))
        use = (first - 1, last)
rgba = np.array(Image.open(src).convert('RGBA'))
alpha = rgba[:, :, 3]


def cores(mask):
    labels, count = ndimage.label(mask)
    sizes = np.bincount(labels.ravel())
    return labels, [i for i in range(1, count + 1) if sizes[i] > 3000]


def by_rows(items, y, x, gap=60):
    items = sorted(items, key=y)
    rows, row = [], []
    for item in items:
        if row and y(item) - y(row[-1]) > gap:
            rows.append(row)
            row = []
        row.append(item)
    rows.append(row)
    return [item for r in rows for item in sorted(r, key=x)]


def bounds(mask):
    ys, xs = np.where(mask)
    return ys.min(), ys.max(), xs.min(), xs.max()


solid = alpha > 128

# Frame numbers: small round blobs, read row by row.
badges = []
if numbered:
    all_labels, _ = ndimage.label(solid)
    all_sizes = np.bincount(all_labels.ravel())
    small = []
    for i, box in enumerate(ndimage.find_objects(all_labels), start=1):
        if all_sizes[i] > 3000:
            continue
        small.append(i)
        h, w = box[0].stop - box[0].start, box[1].stop - box[1].start
        if all_sizes[i] > 200 and w < 70 and 0.7 < h / w < 1.4:
            badges.append({'x': (box[1].start + box[1].stop) / 2, 'y': (box[0].start + box[0].stop) / 2})
    badges = by_rows(badges, lambda b: b['y'], lambda b: b['x'])
    for i, b in enumerate(badges):
        b['x'] += shifts.get(i, 0)
    if expected and len(badges) != expected:
        sys.exit(f'Found {len(badges)} frame numbers, expected {expected}.')
    solid = solid & ~np.isin(all_labels, small)


def badge_for(mask):
    """The numbered frame whose column (between the midpoints to its neighbours) holds most of this piece."""
    _, bottom, _, _ = bounds(mask)
    row_y = min({b['y'] for b in badges if b['y'] > bottom - 20} or {b['y'] for b in badges}, key=lambda y: abs(y - bottom))
    row = [i for i, b in enumerate(badges) if abs(b['y'] - row_y) < 60]
    xs = np.where(mask)[1]
    best, most = row[0], -1
    for k, i in enumerate(row):
        left = (badges[row[k - 1]]['x'] + badges[i]['x']) / 2 if k else -np.inf
        right = (badges[i]['x'] + badges[row[k + 1]]['x']) / 2 if k + 1 < len(row) else np.inf
        inside = int(((xs >= left) & (xs < right)).sum())
        if inside > most:
            best, most = i, inside
    return best


# Shrink the shapes until the pieces separate: one per cat, or at least one per number.
owners = {}
for step in range(0, 41):
    labels, keep = cores(ndimage.binary_erosion(solid, iterations=step) if step else solid)
    if numbered:
        owners = {label: badge_for(labels == label) for label in keep}
        if len(set(owners.values())) == len(badges):
            break
    elif not expected or len(keep) >= expected:
        break
if numbered and len(set(owners.values())) != len(badges):
    sys.exit('Could not separate every numbered frame.')
if expected and not numbered and len(keep) != expected:
    sys.exit(f'Found {len(keep)} cats, expected {expected}.')

# Hand every soft edge pixel to its nearest piece.
core = np.where(np.isin(labels, keep), labels, 0)
_, (iy, ix) = ndimage.distance_transform_edt(core == 0, return_indices=True)
owner = core[iy, ix]

# Clean background-removal residue: drop faint haze, make bodies fully opaque.
clean = alpha.astype(np.int32)
clean[clean < 14] = 0
clean[clean > 236] = 255
# Drop anything not attached to a piece (numbers, labels, specks).
blobs, _ = ndimage.label(clean > 0)
attached = np.unique(blobs[core > 0])
clean[~np.isin(blobs, attached[attached > 0])] = 0

if numbered:
    members = [[] for _ in badges]
    for label, i in owners.items():
        members[i].append(label)
    groups = [{'labels': group, 'anchor': int(round(badge['x']))} for badge, group in zip(badges, members)]
else:
    groups = [{'labels': [label]} for label in keep]

frames = []
for g in groups:
    mine = np.isin(owner, g['labels'])
    top, bottom, left, right = bounds(mine & (clean > 0))
    solid_part = mine & (clean > 128)
    ground = np.where(solid_part.any(axis=1))[0].max()
    anchor = g.get('anchor')
    if anchor is None:
        feet = np.where(solid_part[ground - 30:ground + 1].any(axis=0))[0]
        anchor = int(round(feet.mean()))
    frames.append(dict(labels=g['labels'], top=top, bottom=bottom, left=left, right=right, ground=ground, anchor=anchor))
if not numbered:
    frames = by_rows(frames, lambda f: f['ground'], lambda f: f['left'])
if use:
    frames = frames[use[0]:use[1]]

pad = 8
half = max(max(f['anchor'] - f['left'], f['right'] - f['anchor']) for f in frames) + pad
above = max(f['ground'] - f['top'] for f in frames) + pad
below = max(f['bottom'] - f['ground'] for f in frames) + pad
cell_w, cell_h = 2 * half, above + below

sheet = np.zeros((cell_h, cell_w * len(frames), 4), dtype=np.uint8)
for i, f in enumerate(frames):
    piece = rgba.copy()
    mine = np.where(np.isin(owner, f['labels']), clean, 0)
    # Keep the frame's own pieces, not stray bits of a neighbour's fur near the cut.
    parts, _ = ndimage.label(mine > 0)
    sizes = np.bincount(parts.ravel())
    sizes[0] = 0
    mine[sizes[parts] < sizes.max() * 0.02] = 0
    piece[:, :, 3] = mine.astype(np.uint8)
    crop = piece[f['top']:f['bottom'] + 1, f['left']:f['right'] + 1]
    x = i * cell_w + half - (f['anchor'] - f['left'])
    y = above - (f['ground'] - f['top'])
    region = sheet[y:y + crop.shape[0], x:x + crop.shape[1]]
    visible = crop[:, :, 3] > 0
    region[visible] = crop[visible]

Image.fromarray(sheet).save(out, 'WEBP', quality=88, method=6)
print(json.dumps({'frames': len(frames), 'width': int(cell_w), 'height': int(cell_h), 'ground': int(above)}))
