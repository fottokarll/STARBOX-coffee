"""Author the three original STARBOX COFFEE street-view levels of detail.
Run: blender -b --factory-startup --python tools/build_exterior.py
All geometry, signs, palette and animations are original procedural work.
"""
import bpy, math, json, pathlib, struct
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'build'; OUT.mkdir(exist_ok=True)
GREEN=(0.0,.384,.255,1); FOREST=(.118,.224,.196,1); CREAM=(.949,.941,.910,1)
BROWN=(.435,.306,.216,1); GOLD=(.784,.651,.416,1); LIGHT=(1,.79,.44,1)
WHITE=(1,1,1,1); DARK=(.035,.070,.056,1)
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=bpy.data.fonts.load(font_path)
bold=bpy.data.fonts.load('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')

def reset():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
 for data in list(bpy.data.materials): bpy.data.materials.remove(data)

def mat(name,glass=False,emissive=False,texture=None):
 m=bpy.data.materials.new(name); m.use_nodes=True
 n=m.node_tree.nodes; p=n.get('Principled BSDF'); p.inputs['Roughness'].default_value=.32 if name=='Coffee' else (.64 if name=='Architecture' else .58)
 if glass:
  p.inputs['Base Color'].default_value=(.7,.94,.89,1)
  p.inputs['Alpha'].default_value=.13
  p.inputs['Metallic'].default_value=.08
  m.surface_render_method='DITHERED'
  m.use_transparency_overlap=False
  m.diffuse_color=(.7,.94,.89,.13)
 else:
  c=n.new('ShaderNodeVertexColor'); c.layer_name='Color'
  m.node_tree.links.new(c.outputs['Color'],p.inputs['Base Color'])
  if emissive:
   m.node_tree.links.new(c.outputs['Color'],p.inputs['Emission Color'])
   p.inputs['Emission Strength'].default_value=.34
  if texture:
   tex=n.new('ShaderNodeTexImage'); tex.image=texture
   mul=n.new('ShaderNodeMixRGB'); mul.blend_type='MULTIPLY'; mul.inputs[0].default_value=1
   m.node_tree.links.new(c.outputs['Color'],mul.inputs[1]); m.node_tree.links.new(tex.outputs['Color'],mul.inputs[2])
   m.node_tree.links.new(mul.outputs[0],p.inputs['Base Color'])
 return m

def color(obj,col,material):
 obj.data.materials.clear(); obj.data.materials.append(material)
 a=obj.data.color_attributes.get('Color') or obj.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
 for d in a.data: d.color_srgb=col
 return obj

def box(name,loc,size,col,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Soft crafted corners','BEVEL');m.width=bevel;m.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 return color(o,col,material)

def cyl(name,loc,r,depth,col,material,n=48,r2=None):
 if r2 is None:
  bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=depth,location=loc)
 else:
  bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r2,depth=depth,location=loc)
 o=bpy.context.object;o.name=name
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return color(o,col,material)

def torus(name,loc,major,minor,col,material,n=64):
 bpy.ops.mesh.primitive_torus_add(major_segments=n,minor_segments=8,location=loc,major_radius=major,minor_radius=minor)
 o=bpy.context.object;o.name=name
 for p in o.data.polygons:p.use_smooth=True
 return color(o,col,material)

def sphere(name,loc,scale,col,material,n=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=n,ring_count=8,radius=1,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 return color(o,col,material)

def tube(name,a,b,r,col,material,n=12):
 a,b=Vector(a),Vector(b);mid=(a+b)*.5
 o=cyl(name,mid,r,(b-a).length,col,material,n)
 o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
 return o

def mesh(name,verts,faces,col,material):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update()
 o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o)
 return color(o,col,material)

def text(name,body,loc,size,col,material,rot=(math.pi/2,0,0),isbold=False,extrude=.006):
 cu=bpy.data.curves.new(name,'FONT');cu.body=body;cu.align_x='CENTER';cu.align_y='CENTER';cu.size=size
 cu.font=bold if isbold else font;cu.extrude=extrude;cu.resolution_u=2
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=rot
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
 return color(o,col,material)

def emblem(loc,s,arch,light,detail=1):
 x,y,z=loc
 # Original cup with rising star, deliberately no circular siren or borrowed mark.
 cup=[(x-.47*s,y,z-.15*s),(x+.47*s,y,z-.15*s),(x+.34*s,y,z-.70*s),(x-.34*s,y,z-.70*s)]
 mesh('Original cup icon',cup,[(0,1,2,3)],CREAM,light)
 tube('Cup handle upper',(x+.46*s,y,z-.21*s),(x+.66*s,y,z-.24*s),.045*s,GOLD,arch,n=6)
 tube('Cup handle outer',(x+.66*s,y,z-.24*s),(x+.62*s,y,z-.50*s),.045*s,GOLD,arch,n=6)
 tube('Cup handle lower',(x+.62*s,y,z-.50*s),(x+.38*s,y,z-.53*s),.045*s,GOLD,arch,n=6)
 verts=[]
 for i in range(10):
  a=math.pi/2+i*math.pi/5;r=(.38 if i%2==0 else .165)*s
  verts.append((x+math.cos(a)*r,y-.006,z+.27*s+math.sin(a)*r))
 mesh('Rising star',verts,[tuple(range(10))],GOLD,light)


def cup_shell(n,matglass,arch,detail):
 z0,z1=2.0,9.9;rb,rt=2.90,3.65;cy=.72
 verts=[]
 for z,r in ((z0,rb),(z1,rt)):
  for i in range(n):
   a=i*2*math.pi/n;verts.append((r*math.cos(a),cy+r*math.sin(a),z))
 faces=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh('Transparent cup tower',verts,faces,WHITE,matglass)
 if detail:
  for a in (.2,1.55,2.85,4.2,5.55):
   tube('Glass seam',(rb*math.cos(a),cy+rb*math.sin(a),z0),(rt*math.cos(a),cy+rt*math.sin(a),z1),.018,CREAM,arch,n=8)


def join_group(objs,name):
 if not objs:return None
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join()
 o=bpy.context.object;o.name=name
 return o


def geometry(lod):
 detail=lod==0; medium=lod==1
 mats={}
 if lod==0:
  mats['arch']=mat('Architecture');mats['glass']=mat('Glass',glass=True)
  mats['coffee']=mat('Coffee');mats['light']=mat('WarmSigns',emissive=True)
 elif lod==1:
  mats['arch']=mat('Architecture');mats['glass']=mat('Glass',glass=True)
  mats['coffee']=mats['arch'];mats['light']=mats['arch']
 else:
  mats['arch']=mat('Architecture');mats['glass']=mats['arch'];mats['coffee']=mats['arch'];mats['light']=mats['arch']
 a,g,c,l=mats['arch'],mats['glass'],mats['coffee'],mats['light']
 n=72 if detail else (36 if medium else 8)
 # The cafe's podium lifts from city paving to avoid distant z fighting.
 box('Floating cream podium',(0,0,.35),(11.4,11.4,.70),CREAM,a,.12 if detail else 0)
 box('Forest foundation',(0,.05,.76),(10.9,10.9,.18),FOREST,a)
 box('Cafe volume',(0,.9,1.34),(9.1,7.8,.98),CREAM,a,.12 if detail else 0)
 box('Front espresso counter',(0,-3.12,1.25),(8.7,.38,.76),FOREST,a)
 box('Counter brass edge',(0,-3.36,1.68),(8.9,.13,.12),GOLD,a)
 box('Entrance step',(0,-4.4,.82),(4.1,2.1,.15),BROWN,a)
 box('Main portal backdrop',(0,-3.56,1.86),(3.15,.22,2.06),FOREST,a)
 box('Open invitation doorway',(0,-3.72,1.65),(2.05,.1,1.60),DARK,a)
 box('Welcome threshold',(0,-4.40,.93),(2.4,1.4,.12),GOLD,a)
 for x in (-1.17,1.17):box('Warm portal column',(x,-3.90,1.66),(.13,.22,1.65),GOLD,l)
 box('Warm portal lintel',(0,-3.90,2.53),(2.47,.22,.14),GOLD,l)
 # Street-facing terrace extends into the hall lot's nineteen-metre depth.
 box('Cream terrace',(0,-6.87,.18),(10.7,5.05,.36),CREAM,a,.10 if detail else 0)
 box('Green terrace border',(0,-9.35,.38),(10.5,.10,.09),FOREST,a)
 box('Entry runway',(0,-6.70,.40),(2.7,4.6,.09),FOREST,a)
 for side in (-1,1):
  x=side*3.9
  cyl('Cafe table top',(x,-6.64,1.50),.68,.10,BROWN,a,24 if detail else 10)
  cyl('Cafe table stem',(x,-6.64,.94),.065,1.04,GOLD,a,10 if detail else 6)
  cyl('Cafe table foot',(x,-6.64,.44),.34,.06,FOREST,a,16 if detail else 8)
  if lod<2:
   for dy in (-.92,.92):
    cyl('Cafe stool',(x,-6.64+dy,.98),.29,.14,GREEN,a,16 if detail else 8)
    cyl('Cafe stool stem',(x,-6.64+dy,.7),.05,.50,GOLD,a,8)
   if detail:
    cyl('Cream coffee cup',(x,-6.64,1.68),.105,.25,CREAM,a,16,r2=.13)
    torus('Coffee cup rim',(x,-6.64,1.815),.118,.014,GOLD,a,16)
    cyl('Coffee in terrace cup',(x,-6.64,1.815),.10,.01,BROWN,a,16)
    tube('Parasol pole',(x,-6.64,.47),(x,-6.64,3.42),.04,GOLD,a,8)
    cyl('Forest terrace parasol',(x,-6.64,3.23),1.08,.30,GREEN,a,16,r2=.04)
    cyl('Cream parasol tip',(x,-6.64,3.44),.085,.12,CREAM,a,10)
 if lod<2:
  for zz in (-7.8,-6.65,-5.5):
   mesh('Follow the brew arrow',[(-.32,zz,.455),(.32,zz,.455),(0,zz+.42,.455)],[(0,1,2)],GOLD,a)
 # Glazed cup and strong green lid form an unmistakable silhouette.
 cyl('Cup bottom collar',(0,.72,1.98),2.95,.35,FOREST,a,n)
 if lod<2:
  cup_shell(n,g,a,detail)
  cyl('CoffeeLevel',(0,.72,2.15),2.91,.20,BROWN,c,n)
  cyl('Coffee base',(0,.72,1.99),2.89,.2,BROWN,a,n)
 else:
  # Far view uses a designed open silhouette rather than an opaque glass wall.
  for i in range(6):
   th=i*math.tau/6
   tube('Far cup ribs',(2.9*math.cos(th),.72+2.9*math.sin(th),2),(3.65*math.cos(th),.72+3.65*math.sin(th),9.9),.045,CREAM,a,6)
  cyl('Far coffee',(0,.72,2.3),2.93,.5,BROWN,a,12)
 cyl('Takeaway lid rim',(0,.72,9.91),3.83,.28,GREEN,a,n)
 cyl('Takeaway lid',(0,.72,10.15),3.61,.25,FOREST,a,n,r2=3.45)
 cyl('Cream lid highlight',(0,.72,10.29),3.45,.09,CREAM,a,n)
 cyl('Green crown',(0,.72,10.40),3.20,.14,GREEN,a,n)
 cyl('Lid golden seal',(0,.72,10.52),2.95,.06,GOLD,a,n)
 # An eccentric pour spout, integrated inside the permitted envelope.
 tube('Brass pour pipe',(2.30,1.0,10.58),(2.30,1.0,11.47),.22,GOLD,a,12 if lod<2 else 6)
 tube('Brass pour elbow',(2.30,1.0,11.47),(1.55,.72,11.47),.22,GOLD,a,12 if lod<2 else 6)
 tube('Downward spout',(1.55,.72,11.47),(1.55,.72,10.83),.24,FOREST,a,12 if lod<2 else 6)
 if lod<2:
  tube('CoffeePour',(1.55,.72,10.82),(1.55,.72,2.18),.10,BROWN,c,12)
 # The actual attraction is visible in the street window: a full miniature climb.
 stepcount=27 if detail else (17 if medium else 7)
 for i in range(stepcount):
  t=i*.58;z=2.45+i*(7.0/(stepcount-1));r=2.18+.07*z
  px=r*math.cos(t);py=.72+r*math.sin(t)
  o=box('Spiral stepping platform',(px,py,z),(1.15,.72,.16),CREAM if i%3 else GOLD,a,.045 if detail else 0)
  o.rotation_euler.z=t+math.pi/2
  if detail:
   o=box('Platform green cap',(px,py,z+.10),(1.03,.67,.065),GREEN,a,.025)
   o.rotation_euler.z=t+math.pi/2
   # Floating bean or milk drop communicates the collect-and-brew goal.
   if i%3==0:
    sphere('Floating coffee bean',(px,py,z+.54),(.12,.20,.13),BROWN,a,10)
   elif i%5==0:
    sphere('Floating milk pearl',(px,py,z+.52),(.13,.13,.19),CREAM,l,10)
 # Large front fascia with custom, original lettering.
 box('STARBOX sign',(0,-4.19,3.04),(9.5,.46,.80),FOREST,a,.10 if detail else 0)
 box('Gold sign edge',(0,-4.44,2.65),(9.30,.08,.045),GOLD,l)
 if lod<2:
  text('STARBOX COFFEE letters','STARBOX COFFEE',(0,-4.445,3.08),.68,CREAM,l,isbold=True)
  text('Climb collect brew','CLIMB. COLLECT. BREW.',(0,-4.44,2.33),.255,GOLD,l)
  text('Coffee Rising sign','COFFEE RISING',(0,-3.87,1.95),.19,CREAM,l)
  emblem((0,-3.01,8.35),1.06,a,l)
  text('Upper cup label','STARBOX',(0,-3.03,7.15),.56,CREAM,l,isbold=True)
 if detail:
  # Vertical supports and crafted details under the canopy.
  for x in (-4.39,4.39):
   box('Canopy column',(x,-4.0,1.86),(.19,.19,2.0),FOREST,a,.035)
   cyl('Column foot',(x,-4,1.02),.17,.15,GOLD,a,16)
  # Alternating wooden louvers give the warm cafe base a deliberate rhythm.
  for x in [i*.26 for i in range(-16,17) if abs(i)>5]:
   box('Front oak louver',(x,-3.385,1.31),(.11,.05,.55),(BROWN[0]*1.1,BROWN[1]*1.1,BROWN[2]*1.1,1),a,.016)
  for s in (-1,1):
   for z in (.9,1.17,1.44):box('Side oak reveal',(s*4.59,.8,z),(.045,6.7,.08),BROWN,a)
   # side brand signs readable from the streets at either end
   rot=(math.pi/2,0,s*math.pi/2)
   text('Side brand','STARBOX',(s*4.64,.6,1.57),.30,FOREST,a,rot=rot,isbold=True)
  # rear cafe window band
  box('Rear cafe glass',(0,4.82,1.31),(7.6,.06,.55),(0.3,.47,.4,1),a)
  text('Rear brand','COFFEE RISING',(0,4.865,1.34),.36,CREAM,l,rot=(math.pi/2,0,math.pi),isbold=True)
  for x in (-3.8,-1.9,0,1.9,3.8):box('Rear window mullion',(x,4.87,1.3),(.05,.07,.64),GOLD,a)
  # Planters with individually authored leaves.
  for x,y in ((-4.8,-4.6),(4.8,-4.6),(-4.75,4.5),(4.75,4.5)):
   cyl('Terrazzo planter',(x,y,1.05),.37,.42,CREAM,a,20,r2=.44)
   cyl('Planter soil',(x,y,1.26),.39,.035,BROWN,a,20)
   for k in range(7):
    th=k*math.tau/7
    tip=(x+.3*math.cos(th),y+.3*math.sin(th),1.7+.12*(k%2))
    tube('Plant stem',(x,y,1.28),tip,.018,FOREST,a,6)
    leaf=sphere('Coffeehouse greenery',tip,(.10,.24,.09),GREEN if k%2 else FOREST,a,8)
    leaf.rotation_euler=(.4,th,.2+th)
  # Coffee beans on cream terrace, both decorative and recognisable in silhouette.
  for x,y,th in ((-4.8,-2.5,.4),(4.8,-2.3,-.4),(-4.8,2.0,-.2),(4.8,2.0,.4)):
   bean=sphere('Sculptural coffee bean',(x,y,1.23),(.30,.48,.23),BROWN,a,16);bean.rotation_euler.z=th
   groove=tube('Bean groove',(x-.05,y-.3,1.44),(x+.05,y+.3,1.44),.022,FOREST,a,8)
  # Warm strips, portholes and top steam in restrained geometry.
  for th in (0,math.pi/2,math.pi,3*math.pi/2):
   px=3.34*math.cos(th);py=.72+3.34*math.sin(th)
   tube('Crown warm marker',(px,py,10.33),(px,py,10.39),.10,GOLD,l,10)
  for i in range(10):
   th=i*2.4;rr=1.1+(i%3)*.55
   sphere('CoffeeBubbles',(rr*math.cos(th),.72+rr*math.sin(th),2.29),(.10,.10,.08),GOLD,c,10)
  for i in range(3):
   sphere('Steam sculpt',(1.2+i*.12,.72,10.7+i*.22),(.13+i*.05,.11+i*.05,.17),(0.8,.87,.8,1),g,12)
 if medium:
  for x,y in ((-4.8,-4.5),(4.8,-4.5),(-4.8,4.5),(4.8,4.5)):
   cyl('Planter',(x,y,1.05),.35,.4,CREAM,a,10)
   sphere('Greenery',(x,y,1.5),(.35,.35,.4),GREEN,a,8)
 if lod==2:
  # Minimal identity readable from afar without tiny text geometry.
  emblem((0,-4.445,3.65),.70,a,a)
 return mats


def export(lod):
 reset();mats=geometry(lod)
 # Keep just three animated transform nodes; all static parts share one primitive per material.
 named={}
 if lod==0:
  for o in list(bpy.context.scene.objects):
   if o.name=='CoffeeLevel' or o.name=='CoffeePour' or o.name.startswith('CoffeeBubbles'):
    key='CoffeeBubbles' if o.name.startswith('CoffeeBubbles') else o.name
    named.setdefault(key,[]).append(o)
  for key,objs in named.items():join_group(objs,key)
 reserved=set(named.keys())
 for material in set(mats.values()):
  objs=[o for o in list(bpy.context.scene.objects) if o.type=='MESH' and o.name not in reserved and o.data.materials and o.data.materials[0]==material]
  join_group(objs,material.name+'Merged')
 # World-space bounds are checked before export as well as by the platform.
 pts=[o.matrix_world @ v.co for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices]
 mins=[min(p[i] for p in pts) for i in range(3)];maxs=[max(p[i] for p in pts) for i in range(3)]
 assert mins[0]>=-6 and maxs[0]<=6 and mins[1]>=-9.5 and maxs[1]<=9.5 and mins[2]>=0 and maxs[2]<=12,(mins,maxs)
 print('STARBOX_BOUNDS',lod,mins,maxs)
 if lod==0:
  bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source.blend'))
 # Texture-free vertex colours retain fidelity after GLB optimisation.
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'lod{lod}.glb'),export_format='GLB',use_selection=True,
  export_yup=True,export_extras=False,export_cameras=False,export_lights=False,
  export_animations=False,export_materials='EXPORT',export_normals=True)
 # Read exact GLB headers as a reproducible budget check.
 b=(OUT/f'lod{lod}.glb').read_bytes();j=json.loads(b[20:20+struct.unpack('<I',b[12:16])[0]])
 triangles=sum(j['accessors'][p['indices']]['count']//3 for m in j['meshes'] for p in m['primitives'])
 primitive_count=sum(len(m['primitives']) for m in j['meshes'])
 print('STARBOX_STATS',json.dumps({'lod':lod,'bytes':len(b),'triangles':triangles,'primitives':primitive_count,'materials':len(j.get('materials',[])), 'nodes':[x.get('name') for x in j['nodes']]}))
for lod in (0,1,2):export(lod)
