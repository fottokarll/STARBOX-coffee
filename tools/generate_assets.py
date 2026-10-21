"""Original STARBOX COFFEE pixel art and synthesized audio; no remote assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math, wave, struct, json
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'experience'/'assets'
OUT.mkdir(parents=True,exist_ok=True)
GREEN='#006241'; FOREST='#1E3932'; CREAM='#F2F0E8'; GOLD='#C8A66A'
INK='#142A25'; SKIN='#EFB37D'; LIGHT='#FFDAA1'; COFFEE='#6F4E37'

# Pixel coordinates are deliberately hand drawn; no antialiasing on character.
def barista(frame):
    im=Image.new('RGBA',(32,40)); d=ImageDraw.Draw(im)
    def r(box,c): d.rectangle(box,fill=c)
    bob=1 if frame in (1,3,5) else 0
    def rect(box,c):
        x1,y1,x2,y2=box;r((x1,y1+bob,x2,y2+bob),c)
    # Raised arms distinguish airborne and celebration states.
    air=frame in (6,7,8,9)
    if air:
        for sign in (-1,1):
            x=7 if sign<0 else 24
            rect((x-2,14,x+2,21),INK)
            rect((x-1,14,x+1,19),CREAM)
            rect((x-1,12 if frame in (6,8,9) else 19,x+1,15 if frame in (6,8,9) else 22),SKIN)
    else:
        # Apron sleeves, relaxed hands with alternating run swing.
        swing=2 if frame in (2,4) else 0
        rect((6,18+swing,10,27+swing),INK);rect((7,19+swing,9,24+swing),CREAM)
        rect((7,25+swing,9,27+swing),SKIN)
        rect((22,18,26,27-swing),INK);rect((23,19,25,24-swing),CREAM)
        rect((23,25-swing,25,27-swing),SKIN)
    # Body silhouette and shirt, neck, apron straps.
    rect((10,17,22,31),INK);rect((11,18,21,28),CREAM)
    rect((13,15,19,20),INK);rect((14,16,18,19),SKIN)
    rect((11,19,12,29),GREEN);rect((20,19,21,29),GREEN)
    rect((11,23,21,31),GREEN);rect((12,24,20,30),'#148763')
    rect((14,25,18,28),FOREST);rect((15,25,17,25),GOLD)
    # Legs and leather shoes: alternate stance in run frames.
    ldx,rdx=(0,0)
    if frame in (2,3):ldx,rdx=(-2,2)
    if frame in (4,5):ldx,rdx=(2,-2)
    if frame==6:ldx,rdx=(-1,2)
    if frame==7:ldx,rdx=(-2,1)
    rect((11+ldx,31,15+ldx,36),INK);rect((18+rdx,31,22+rdx,36),INK)
    rect((12+ldx,31,14+ldx,34),'#655347');rect((19+rdx,31,21+rdx,34),'#655347')
    rect((9+ldx,35,15+ldx,37),INK);rect((18+rdx,35,24+rdx,37),INK)
    rect((10+ldx,35,14+ldx,35),GOLD);rect((19+rdx,35,23+rdx,35),GOLD)
    # Face and hair.
    rect((10,6,22,16),INK);rect((11,7,21,14),SKIN);rect((12,7,20,11),LIGHT)
    rect((10,7,11,11),'#67442F');rect((21,7,22,12),'#67442F')
    rect((9,10,10,13),SKIN);rect((22,10,23,13),SKIN)
    rect((13,10,14,11),INK);rect((19,10,20,11),INK)
    if frame in (8,9):
        rect((13,10,14,10),INK);rect((13,11,14,11),SKIN)
        rect((19,10,20,10),INK);rect((19,11,20,11),SKIN)
    rect((16,11,17,12),'#CE895F');rect((15,14,19,14),INK)
    rect((17,14,18,14),CREAM)
    # Distinctive green peaked cap, ORIGINAL small four-point star.
    rect((10,2,21,6),INK);rect((11,2,20,5),GREEN)
    rect((12,1,19,2),GREEN);rect((9,5,23,7),INK);rect((10,5,23,6),'#18825F')
    rect((15,2,15,4),GOLD);rect((14,3,16,3),GOLD)
    if frame in (8,9):
        # Small sparkle pixels on celebration frames.
        sx=3 if frame==8 else 28
        r((sx,3,sx,7),GOLD);r((sx-2,5,sx+2,5),GOLD)
    return im

sheet=Image.new('RGBA',(320,40))
for f in range(10):sheet.paste(barista(f),(32*f,0))
sheet.save(OUT/'barista.png',optimize=True)
preview=Image.new('RGBA',(320,80),'#F2F0E8')
for f in range(10):preview.paste(barista(f),(32*f,20),barista(f))
preview.resize((1280,320),Image.Resampling.NEAREST).save(OUT/'barista-preview.png',optimize=True)
meta={'image':'barista.png','frameWidth':32,'frameHeight':40,'frames':10,
      'animations':{'idle':[0,1],'run':[2,3,4,5],'jump':[6],'fall':[7],'celebrate':[8,9]},
      'fps':{'idle':3,'run':10,'celebrate':6},'filter':'nearest','mipmaps':False}
(OUT/'sprites.json').write_text(json.dumps(meta,indent=2)+'\n')

# Short mono 22.05kHz WAV effects, additive/square synthesis with smooth envelopes.
SR=22050

def effect(name,notes,duration,kind='sine',amp=.22):
    samples=[]
    for i in range(int(SR*duration)):
        t=i/SR; phase=t/duration
        freq=notes[min(int(phase*len(notes)),len(notes)-1)]
        at=(phase*len(notes))%1
        env=min(1,t/.008)*min(1,(duration-t)/.025)
        env*=.7+.3*math.exp(-at*4)
        s=math.sin(2*math.pi*freq*t)
        if kind=='square': s=.8*s+.15*math.sin(2*math.pi*freq*3*t)
        elif kind=='triangle': s=.8*s-.08*math.sin(2*math.pi*freq*3*t)
        samples.append(int(max(-1,min(1,s*env*amp))*32767))
    with wave.open(str(OUT/(name+'.wav')),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR)
        w.writeframes(struct.pack('<'+'h'*len(samples),*samples))

effect('jump',[245,294,349,440],.15,'square',.18)
effect('land',[130,98],.09,'triangle',.14)
effect('collect',[659,880,1047],.17,'sine',.18)
effect('warning',[330,330,247],.3,'square',.16)
effect('perfect',[523,659,784,1047,1319,1568],.8,'sine',.2)
effect('fail',[392,330,262,196,130],.5,'triangle',.2)
effect('start',[392,523,784],.3,'square',.18)

# Original collector card art uses vector-like hand drawn shapes and soft natural colours.
def font(size,bold=False):
    name='/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf'
    try:return ImageFont.truetype(name,size)
    except OSError:return ImageFont.load_default()

def text_center(d,y,text,size,color,bold=False):
    f=font(size,bold);b=d.textbbox((0,0),text,font=f);d.text(((400-b[2])/2,y),text,font=f,fill=color)

def star(d,cx,cy,outer,inner,color):
    pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5;r=outer if i%2==0 else inner
        pts.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
    d.polygon(pts,fill=color)

def card(kind):
    im=Image.new('RGB',(400,560),FOREST);d=ImageDraw.Draw(im)
    d.rounded_rectangle((12,12,387,547),28,fill=CREAM,outline=GOLD,width=3)
    d.rounded_rectangle((24,24,375,535),20,outline=FOREST,width=1)
    # Brand medallion: five-point star above an original squared espresso cup.
    d.ellipse((171,33,229,91),fill=FOREST)
    star(d,200,49,9,4,GOLD)
    d.rounded_rectangle((188,59,210,74),3,fill=CREAM)
    d.arc((204,59,218,72),270,90,fill=CREAM,width=3)
    d.line((186,78,213,78),fill=GOLD,width=2)
    text_center(d,100,'STARBOX',31,FOREST,True)
    text_center(d,137,'C O F F E E',13,GREEN,True)
    text_center(d,166,'C O F F E E   R I S I N G',10,COFFEE)
    d.line((72,193,328,193),fill=GOLD,width=2)
    # Illustration field, detailed but clean at card scale.
    d.ellipse((59,206,341,457),fill='#E2E5D3')
    d.ellipse((82,405,318,447),fill='#CED5BB')
    d.ellipse((91,412,310,432),fill='#B9C6AA')
    # Beans and small plants in foreground.
    for x,y,rot in [(78,413,0),(317,417,0),(97,436,0)]:
        d.ellipse((x-9,y-5,x+9,y+5),fill=COFFEE,outline=FOREST,width=1)
        d.arc((x-5,y-7,x+5,y+7),75,255,fill=GOLD,width=1)
    for side in (-1,1):
        x=200+side*118
        d.line((x,408,x+side*8,353),fill=FOREST,width=2)
        d.ellipse((x-13,365,x+3,383),fill=GREEN)
        d.ellipse((x-2,351,x+14,369),fill='#598E64')
    # Golden halo and bean sparkle motifs.
    for x,y,s in [(90,252,8),(304,275,6),(103,333,5),(292,226,4)]:
        star(d,x,y,s,s*.35,GOLD)
    if kind=='latte':
        # Transparent tall glass with thick cream foam and green sleeve.
        d.polygon([(133,278),(267,278),(250,413),(150,413)],fill='#A8C3AB',outline=FOREST)
        d.polygon([(142,293),(258,293),(243,403),(157,403)],fill='#BE976A')
        d.polygon([(144,305),(256,305),(249,350),(151,350)],fill='#CDA776')
        d.polygon([(146,324),(254,324),(251,345),(149,345)],fill='#DEC399')
        d.ellipse((132,265,268,305),fill='#F5E9CC',outline=FOREST,width=3)
        d.ellipse((146,271,254,296),fill='#AA7646')
        # Rosetta latte art, individually drawn cream leaves.
        d.line((200,291,200,275),fill=CREAM,width=3)
        for yy,ww in [(288,19),(283,14),(278,8)]:
            d.ellipse((200-ww,yy-4,200,yy+1),fill=CREAM)
            d.ellipse((200,yy-4,200+ww,yy+1),fill=CREAM)
        d.polygon([(150,348),(251,348),(245,387),(155,387)],fill=GREEN)
        star(d,200,367,12,5,GOLD)
        d.line((140,292,154,402),fill='#F5E9CC',width=3)
        title='PERFECT LATTE';ident='SC-696-L'
    else:
        # Compact espresso vessel, original green ceramic with gold line.
        d.ellipse((111,390,291,425),fill=CREAM,outline=GOLD,width=3)
        d.ellipse((123,395,279,416),fill='#D4CBB0')
        d.rounded_rectangle((123,307,267,397),18,fill=GREEN,outline=FOREST,width=3)
        d.arc((247,322,298,381),260,100,fill=FOREST,width=14)
        d.arc((250,325,294,378),265,95,fill=GOLD,width=5)
        d.ellipse((121,292,269,327),fill=FOREST)
        d.ellipse((128,298,262,320),fill='#B98445')
        d.ellipse((137,301,253,315),fill='#6E402C')
        d.arc((151,302,231,314),180,350,fill='#D9AB60',width=3)
        d.line((132,334,132,374),fill='#7CA486',width=3)
        star(d,195,357,15,6,GOLD)
        title='PERFECT ESPRESSO';ident='SC-696-E'
    # Soft steam curls.
    for cx,yy in [(178,241),(201,231),(226,243)]:
        d.arc((cx-7,yy-12,cx+7,yy+13),90,270,fill='#94AB95',width=3)
        d.arc((cx-7,yy+6,cx+7,yy+27),270,80,fill='#94AB95',width=3)
    text_center(d,462,title,21,FOREST,True)
    text_center(d,492,'CLIMB. COLLECT. BREW.',11,COFFEE,True)
    text_center(d,516,ident+'  /  LOT 696',10,FOREST)
    im.save(OUT/('card-'+kind+'.png'),optimize=True)

card('latte');card('espresso')

# An economical 800×450 loading cover in the same art direction.
cover=Image.new('RGB',(800,450),FOREST);d=ImageDraw.Draw(cover)
for x in range(25,800,65):
    d.line((x,0,x-100,450),fill='#24463B',width=1)
d.rounded_rectangle((40,35,760,415),24,outline=GOLD,width=2)
d.text((75,72),'STARBOX',font=font(56,True),fill=CREAM)
d.text((79,140),'C O F F E E  R I S I N G',font=font(19,True),fill=GOLD)
d.text((79,229),'CLIMB.',font=font(30,True),fill=CREAM)
d.text((79,270),'COLLECT.',font=font(30,True),fill=CREAM)
d.text((79,311),'BREW.',font=font(30,True),fill=CREAM)
small=Image.open(OUT/'card-latte.png').resize((214,300),Image.Resampling.LANCZOS)
cover.paste(small,(505,75))
cover.save(OUT/'cover.png',optimize=True)
(OUT/'CREDITS.txt').write_text('STARBOX COFFEE original assets\nPixel barista, card illustrations, brand symbol and loading cover: hand-authored procedural art for this project.\nAudio: original additive synthesis generated by tools/generate_assets.py.\nNo external character, brand, image or audio assets used.\nDejaVu Sans used only in rendered card/cover art; DejaVu fonts are freely redistributable under their published licence.\n')
print(json.dumps({p.name:p.stat().st_size for p in OUT.iterdir()},indent=2))
