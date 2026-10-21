"""Rasterise licensed DejaVu fonts for the sandbox's canvas UI (no DOM/font loading)."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
out=root/'experience/assets/v2'
out.mkdir(exist_ok=True,parents=True)
fonts=Path('/usr/share/fonts/truetype/dejavu')
styles={
    'body': ('DejaVuSansCondensed.ttf',40),
    'bold': ('DejaVuSansCondensed-Bold.ttf',56),
    'mono': ('DejaVuSansMono.ttf',32),
    'display': ('DejaVuSerifCondensed-Bold.ttf',72),
}
chars=''.join(chr(i) for i in range(32,127))+'×·’…'
atlas=Image.new('RGBA',(1024,1024))
draw=ImageDraw.Draw(atlas)
metadata={'width':1024,'height':1024,'license':'DejaVu; see ../font-license.txt','styles':{}}
x=y=3
row=0
for name,(file,size) in styles.items():
    font=ImageFont.truetype(str(fonts/file),size)
    metrics={}
    cap_top=font.getbbox('H')[1]
    for char in chars:
        box=font.getbbox(char)
        w,h=box[2]-box[0],box[3]-box[1]
        if x+w+3>1024:
            x=3;y+=row+4;row=0
        if y+h+3>1024:
            raise RuntimeError('Font atlas overflow')
        if char!=' ':
            draw.text((x-box[0],y-box[1]),char,font=font,fill='white')
        metrics[char]={'x':x,'y':y,'w':w,'h':h,'advance':round(font.getlength(char),3),
                       'ox':box[0],'oy':box[1]-cap_top}
        x+=w+5
        row=max(row,h)
    x=3;y+=row+5;row=0
    metadata['styles'][name]={'size':size,'glyphs':metrics}
atlas.save(out/'lettering.png',optimize=True)
(out/'lettering.json').write_text(json.dumps(metadata,indent=2)+'\n')
print('Wrote font atlas; height used:',y)
