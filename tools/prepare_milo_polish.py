"""Technical frame extraction, nearest resizing and lossless encoding only."""
from pathlib import Path
from collections import deque
from PIL import Image
import json, shutil

root = Path(__file__).resolve().parents[1]
source = Path('/workspace/generated_images/exec-2efd4f50-d0ba-45c6-a98c-1189f5766c30.png')
preserved = root/'tools/art-source/milo-polish-original.png'
if source.exists(): shutil.copy(source, preserved)
else: source = preserved
image = Image.open(source).convert('RGBA')
alpha = image.getchannel('A')
w, h = image.size
mask = bytearray(1 if a >= 128 else 0 for a in alpha.tobytes())
components = []
for seed in range(w*h):
    if not mask[seed]: continue
    mask[seed] = 0
    queue = deque([seed]); size = 0
    x0 = x1 = seed % w; y0 = y1 = seed // w
    while queue:
        index = queue.popleft(); x = index % w; y = index // w; size += 1
        x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
        for xx, yy in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0 <= xx < w and 0 <= yy < h:
                nxt=yy*w+xx
                if mask[nxt]:mask[nxt]=0;queue.append(nxt)
    if size > 5000: components.append((x0,y0,x1+1,y1+1,size))
assert len(components)==16, components
components.sort(key=lambda b: ((b[1]+b[3])//2//313, (b[0]+b[2])//2))
atlas=Image.new('RGBA',(512,512))
poses=['idle0','idle1','idle2','idle3','run0','run1','run2','run3',
       'run4','run5','jump','apex','fall','land0','land1','victory']
frames=[]
for i,(x0,y0,x1,y1,size) in enumerate(components):
    box=(max(0,x0-3),max(0,y0-3),min(w,x1+3),min(h,y1+3))
    frame=image.crop(box)
    frame=frame.resize((round(frame.width*.25),round(frame.height*.25)),Image.Resampling.NEAREST)
    col=i%4;row=i//4
    px=col*128+64-frame.width//2;py=row*128+112-frame.height
    atlas.paste(frame,(px,py))
    frames.append({'pose':poses[i],'rect':[col*128,row*128,128,128],
                   'anchor':[.5,112/128],'sourceRect':list(box)})
out=root/'experience/assets/polish'
out.mkdir(exist_ok=True)
atlas.save(out/'milo.png',optimize=True)
atlas.save(out/'milo.webp',lossless=True,method=6,exact=True)
assert Image.open(out/'milo.webp').convert('RGBA').tobytes()==atlas.tobytes()
metadata={'image':'assets/polish/milo.webp','imageSize':[512,512],
 'gameplayAtlasSize':512,'nominalBodyHeight':76,
 'animations':{'idle':{'frames':[0,1,2,3],'fps':2},
  'run':{'frames':[4,5,6,7,8,9],'fps':12},'jump':{'frames':[10],'fps':1},
  'apex':{'frames':[11],'fps':1},'fall':{'frames':[12],'fps':1},
  'land':{'frames':[13,14],'fps':11},'victory':{'frames':[15],'fps':1}},
 'characters':{'boy':{'name':'Milo','description':'The original star-cup explorer','frames':frames}},
 'credits':'Original OpenAI-generated Milo explorer animation art; technical nearest frame extraction only. Source in tools/art-source/milo-polish-original.png.'}
(out/'milo.json').write_text(json.dumps(metadata,indent=2)+'\n')
print('Prepared16 frames; lossless WebP bytes:',(out/'milo.webp').stat().st_size)
