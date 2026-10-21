"""Original 512px hand-crafted procedural café surface atlas for Coffee Rising V2."""
from PIL import Image, ImageDraw
import random, math, pathlib
rng=random.Random(696)
N=512; T=128
im=Image.new('RGB',(N,N),'white')
def cell(idx,base):
 tile=Image.new('RGB',(T,T),base);return tile,ImageDraw.Draw(tile)
def noise(draw,base,count=500,amount=8):
 for i in range(count):
  x=rng.randrange(T);y=rng.randrange(T);v=rng.randint(-amount,amount)
  c=tuple(max(0,min(255,b+v)) for b in base)
  draw.point((x,y),fill=c)
def put(idx,tile):im.paste(tile,((idx%4)*T,(idx//4)*T))
# Cream ceramic: glazed speckles and intentional tiny warm flecks.
t,d=cell(0,(235,228,207));noise(d,(235,228,207),1700,10)
for y in (3,124):d.line((0,y,127,y),fill=(255,247,226),width=2)
for i in range(25):
 x,y=rng.randrange(T),rng.randrange(T);d.ellipse((x,y,x+1,y+1),fill=(198,179,143))
put(0,t)
# Oak: distinct fine grain and softly highlighted planks.
t,d=cell(1,(117,75,44));noise(d,(117,75,44),1900,10)
for y in (1,32,64,96,126):
 d.line((0,y,127,y),fill=(60,43,31),width=2);d.line((0,y+2,127,y+2),fill=(168,113,63),width=1)
for k in range(70):
 y=rng.randrange(T);x=rng.randrange(T);length=rng.randrange(16,91)
 d.line((x,y,min(127,x+length),y+rng.choice((-1,0,1))),fill=rng.choice(((151,98,54),(96,59,36),(173,118,65))),width=1)
for x,y in ((29,18),(87,81)):
 d.ellipse((x-10,y-3,x+10,y+3),outline=(70,43,30));d.ellipse((x-5,y-1,x+5,y+1),outline=(73,46,30))
put(1,t)
# Waffle biscuit: baked crisscross grid, browned edge and salt freckles.
t,d=cell(2,(208,154,75));noise(d,(208,154,75),1100,14)
for p in range(-128,256,19):
 d.line((p,0,p+128,128),fill=(164,105,45),width=3)
 d.line((p+3,0,p+131,128),fill=(233,188,105),width=1)
 d.line((p,128,p+128,0),fill=(172,113,48),width=3)
 d.line((p+3,128,p+131,0),fill=(233,188,105),width=1)
for k in range(75):
 x,y=rng.randrange(T),rng.randrange(T);d.rectangle((x,y,x+1,y+1),fill=(247,211,137))
put(2,t)
# Warm stone / brick cafe trim.
t,d=cell(3,(153,138,108));noise(d,(153,138,108),1400,12)
for row in range(4):
 y=row*32;d.line((0,y,127,y),fill=(85,80,64),width=3)
 for x in range(-32,160,64):
  x+=32*(row%2);d.line((x,y,x,y+31),fill=(90,82,64),width=3)
  d.line((x+4,y+4,min(x+59,127),y+4),fill=(189,171,132),width=2)
put(3,t)
# Deep forest painted timber.
t,d=cell(4,(17,69,49));noise(d,(17,69,49),1600,7)
for y in range(0,128,24):d.line((0,y,127,y),fill=(7,39,29),width=2);d.line((0,y+2,127,y+2),fill=(36,91,62))
for k in range(40):
 x,y=rng.randrange(T),rng.randrange(T);d.line((x,y,min(127,x+rng.randrange(10,60)),y),fill=(30,82,56))
put(4,t)
# Muted brushed brass.
t,d=cell(5,(190,150,83));noise(d,(190,150,83),1400,6)
for y in range(0,128,3):
 c=185+rng.randrange(-15,16);d.line((0,y,127,y),fill=(c,max(0,c-40),max(0,c-100)))
d.rectangle((3,3,124,124),outline=(225,194,125),width=2);put(5,t)
# Ceramic green-and-cream striped awning cloth.
t,d=cell(6,(237,231,210))
for x in range(0,128,32):
 d.rectangle((x,0,x+16,127),fill=(8,91,58));d.line((x+2,0,x+2,127),fill=(48,121,78),width=2)
for y in range(0,128,4):d.line((0,y,127,y),fill=(198,198,170),width=1)
# Avoid strong contrast from the fabric weft: blend it lightly.
t=Image.blend(t,Image.new('RGB',(128,128),(218,215,187)),.12);put(6,t)
# Artisanal dark ceramic edge.
t,d=cell(7,(29,57,46));noise(d,(29,57,46),1300,7)
for y in (8,119):d.line((0,y,127,y),fill=(188,154,94),width=3)
put(7,t)
# Coffee, warm marbling instead of a static flat brown plane.
t,d=cell(8,(79,43,25));noise(d,(79,43,25),1800,11)
for k in range(17):
 x,y=rng.randrange(-35,100),rng.randrange(-35,100)
 d.arc((x,y,x+rng.randrange(25,100),y+rng.randrange(20,70)),10,240,fill=(105,59,30),width=2)
put(8,t)
# Foam / latte cream.
t,d=cell(9,(232,210,163));noise(d,(232,210,163),900,7)
for k in range(45):
 x,y=rng.randrange(T),rng.randrange(T);r=rng.randrange(1,6)
 d.ellipse((x-r,y-r,x+r,y+r),outline=(201,171,117),width=1)
put(9,t)
# Leaf surface and vein detail.
t,d=cell(10,(42,103,46));noise(d,(42,103,46),1300,8)
d.line((64,0,64,127),fill=(115,152,66),width=3)
for y in range(12,128,19):
 d.line((64,y,14,y-22),fill=(69,130,53),width=2);d.line((64,y,116,y-22),fill=(69,130,53),width=2)
put(10,t)
# Biscuit cracks opaque dark brown; used on slender jagged 3D wedges.
t,d=cell(11,(77,39,21));noise(d,(77,39,21),700,8);put(11,t)
# Cream tile inset with refined thin green/gold border.
t,d=cell(12,(239,231,210));noise(d,(239,231,210),800,6)
d.rectangle((5,5,122,122),outline=(13,91,61),width=3);d.rectangle((10,10,117,117),outline=(193,161,101),width=2)
put(12,t)
# Glazed terracotta pots.
t,d=cell(13,(149,76,41));noise(d,(149,76,41),1200,10)
for y in (10,18,108):d.line((0,y,127,y),fill=(187,110,56),width=2)
put(13,t)
# Lantern warm glass.
t,d=cell(14,(255,191,85))
for x in range(128):
 amount=1-abs(x-63.5)/64
 d.line((x,0,x,127),fill=(255,int(157+76*amount),int(40+91*amount)))
put(14,t)
# Tiny white patch for arbitrary vertex-colour surfaces.
t,d=cell(15,(255,255,255));put(15,t)
out=pathlib.Path('/workspace/STARBOX-coffee/experience/assets/v2/cafe-atlas.png');im.save(out,optimize=True)
print(out,out.stat().st_size)
