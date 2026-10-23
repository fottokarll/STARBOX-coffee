"""Register supplied-reference sprite poses; nearest resampling/encoding only.

Image generation performs the background extraction. This importer never paints
pixels: it crops the sixteen complete alpha components and registers their feet.
"""
from collections import deque
from pathlib import Path
from PIL import Image
import argparse
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]


def prepare(source, output, identity):
    image = Image.open(source).convert('RGBA')
    w, h = image.size
    mask = bytearray(a >= 128 for a in image.getchannel('A').tobytes())
    components = []
    for seed in range(w * h):
        if not mask[seed]:
            continue
        mask[seed] = 0
        queue = deque([seed])
        x0 = x1 = seed % w
        y0 = y1 = seed // w
        count = 0
        while queue:
            index = queue.popleft()
            x, y = index % w, index // w
            count += 1
            x0, x1 = min(x0, x), max(x1, x)
            y0, y1 = min(y0, y), max(y1, y)
            for xx, yy in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                if 0 <= xx < w and 0 <= yy < h:
                    nxt = yy * w + xx
                    if mask[nxt]:
                        mask[nxt] = 0
                        queue.append(nxt)
        if count > 2000:
            assert 2 < x0 < x1 < w-2 and 2 < y0 < y1 < h-2, 'Cropped source pose'
            components.append((x0, y0, x1+1, y1+1, count))
    assert len(components) == 16, components
    components.sort(key=lambda b: (round(((b[1]+b[3])/2-h/8)/(h/4)), b[0]))
    poses = ['idle0', 'idle1', 'idle2', 'idle3', 'run0', 'run1', 'run2', 'run3',
             'run4', 'run5', 'jump', 'apex', 'fall', 'land0', 'land1', 'victory']
    atlas = Image.new('RGBA', (1024, 1024))
    frames = []
    for index, (x0, y0, x1, y1, _) in enumerate(components):
        # Four source pixels retain antialias fringes. Empty decorative steam or
        # celebration sparkles are intentionally outside the body component.
        box = (x0-4, y0-4, x1+4, y1+4)
        frame = image.crop(box)
        frame = frame.resize((round(frame.width/2), round(frame.height/2)), Image.Resampling.NEAREST)
        col, row = index % 4, index // 4
        px, py = col*256+128-frame.width//2, row*256+232-frame.height
        atlas.paste(frame, (px, py))
        frames.append({'pose': poses[index], 'rect': [col*256, row*256, 256, 256],
                       'anchor': [.5, 230/256], 'sourceRect': list(box)})
    nominal = round(sum((b[3]-b[1])/2 for b in components[:4])/4)
    output.mkdir(parents=True, exist_ok=True)
    atlas.save(output/'milo.png', optimize=True)
    atlas.save(output/'milo.webp', lossless=True, method=6, exact=True)
    assert Image.open(output/'milo.webp').convert('RGBA').tobytes() == atlas.tobytes()
    metadata = {'image': 'assets/polish/milo.webp', 'imageSize': [1024, 1024],
        'gameplayAtlasSize': 1024, 'nominalBodyHeight': nominal,
        'animations': {'idle': {'frames': [0, 1, 2, 3], 'fps': 2},
            'run': {'frames': [4, 5, 6, 7, 8, 9], 'fps': 12},
            'jump': {'frames': [10], 'fps': 1}, 'apex': {'frames': [11], 'fps': 1},
            'fall': {'frames': [12], 'fps': 1}, 'land': {'frames': [13, 14], 'fps': 11},
            'victory': {'frames': [15], 'fps': 1}},
        'characters': {'boy': {'name': identity, 'frames': frames}},
        'credits': 'OpenAI image generation from the owner-supplied 2026-10-23 reference; technical frame registration and nearest resampling only. Source and prompts preserved outside runtime.'}
    (output/'milo.json').write_text(json.dumps(metadata, indent=2)+'\n')
    return {'identity': identity, 'frames': len(frames), 'bodyPixels': nominal,
            'atlas': [1024, 1024], 'losslessBytes': (output/'milo.webp').stat().st_size}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--milo', type=Path, required=True)
    parser.add_argument('--tester', type=Path, required=True)
    args = parser.parse_args()
    archive = ROOT/'tools/art-source/2.4.1'
    archive.mkdir(exist_ok=True)
    for name, source in [('milo', args.milo), ('developer-tester', args.tester)]:
        shutil.copyfile(source, archive/f'{name}-transparent-source.png')
    print(json.dumps([
        prepare(args.milo, ROOT/'experience/assets/polish', 'Milo'),
        prepare(args.tester, ROOT/'tools/developer/assets', 'STARBOX DEV TESTER')
    ], indent=2))
