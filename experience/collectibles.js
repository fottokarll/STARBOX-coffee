import * as THREE from 'three';
import {RADIUS} from './rules.js';

function shade(geometry) {
  const n=geometry.getAttribute('normal'),c=[];
  for(let i=0;i<n.count;i++) {
    const dot=n.getY(i)*.72+n.getZ(i)*.51-n.getX(i)*.3;
    const light=dot>.55?1.12:dot>-.1?.88:.60;
    c.push(light,light,light);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
  return geometry;
}
function starGeometry() {
  const shape=new THREE.Shape();
  for(let i=0;i<10;i++) {
    const a=i*Math.PI/5+Math.PI/2,r=i%2?.16:.35,x=Math.cos(a)*r,y=Math.sin(a)*r;
    if(i)shape.lineTo(x,y);else shape.moveTo(x,y);
  }
  shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1});
  geometry.translate(0,0,-.05);return shade(geometry);
}

export function createCollectibles(world,course,assets={}) {
  const root=new THREE.Group();world.add(root);
  const material=new THREE.MeshBasicMaterial({vertexColors:true});
  const glowCanvas=new OffscreenCanvas(64,64),ctx=glowCanvas.getContext('2d');
  const gradient=ctx.createRadialGradient(32,32,3,32,32,31);
  gradient.addColorStop(0,'rgba(255,255,255,0.65)');gradient.addColorStop(.5,'rgba(255,255,255,0.14)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.generateMipmaps=false;
  const haloMaterial=new THREE.MeshBasicMaterial({map:glowTexture,color:0xf2cc86,transparent:true,opacity:.38,depthWrite:false});
  const shadowMaterial=new THREE.MeshBasicMaterial({map:glowTexture,color:0x20140d,transparent:true,opacity:.48,depthWrite:false});
  const sphere=shade(new THREE.SphereGeometry(1,16,10));
  const profile=[[0,-.33],[.13,-.29],[.22,-.16],[.23,-.02],[.18,.14],[.08,.32],[0,.47]];
  const drop=shade(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),16));
  const crease=new THREE.CatmullRomCurve3([new THREE.Vector3(-.02,-.23,.145),
    new THREE.Vector3(-.065,-.06,.18),new THREE.Vector3(.045,.08,.18),new THREE.Vector3(.025,.23,.13)]);
  const star=starGeometry(),seam=shade(new THREE.TubeGeometry(crease,12,.022,5,false));
  const haloGeometry=new THREE.PlaneGeometry(1.25,1.25);
  const shadowGeometry=new THREE.PlaneGeometry(.72,.53);shadowGeometry.rotateX(-Math.PI/2);
  const types={bean:[],milk:[],star:[]};
  for(const item of course.ingredients)types[item.kind]?.push(item);
  const batches={},all=[];
  for(const [kind,list] of Object.entries(types)) {
    if(!list.length)continue;
    const geo=kind==='bean'?sphere:kind==='milk'?drop:star;
    const batch=new THREE.InstancedMesh(geo,material,list.length);
    batch.frustumCulled=false;root.add(batch);batches[kind]=batch;
    list.forEach((item,index)=>{
      batch.setColorAt(index,new THREE.Color(kind==='bean'?0xaf6637:kind==='milk'?0xfff1d0:0xf7bb54));
      all.push({...item,index,batch,phase:index*1.7});
    });
  }
  const beans=types.bean;
  const seams=beans.length?new THREE.InstancedMesh(seam,material,beans.length):null;
  if(seams) {
    seams.frustumCulled=false;root.add(seams);
    beans.forEach((_,i)=>seams.setColorAt(i,new THREE.Color(0x40281b)));
  }
  const halos=new THREE.InstancedMesh(haloGeometry,haloMaterial,all.length);
  halos.frustumCulled=false;root.add(halos);
  const shadows=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,all.length);
  shadows.frustumCulled=false;root.add(shadows);
  const highlights=new THREE.InstancedMesh(sphere,material,all.length);
  highlights.frustumCulled=false;root.add(highlights);
  all.forEach((item,i)=>highlights.setColorAt(i,new THREE.Color(item.kind==='bean'?0xe5b17b:0xfff9da)));
  const sparkGeometry=shade(new THREE.BoxGeometry(.08,.08,.08));
  const sparkMaterial=new THREE.MeshBasicMaterial({color:0xffd68a,vertexColors:true});
  const sparks=new THREE.InstancedMesh(sparkGeometry,sparkMaterial,24);
  sparks.frustumCulled=false;root.add(sparks);
  const transform=new THREE.Object3D(),burst=[];
  function collect(id,time) {
    const item=all.find(i=>i.id===id);if(!item)return;
    burst.push({time,x:Math.sin(item.angle)*RADIUS,y:item.y,z:Math.cos(item.angle)*RADIUS});
    if(burst.length>3)burst.shift();
  }
  function update(run,time) {
    const states=new Map(run.ingredients.map(item=>[item.id,item]));
    all.forEach((item,haloIndex)=>{
      const taken=states.get(item.id)?.collected;
      const y=item.y+Math.sin(time*3.3+item.phase)*.065;
      transform.position.set(Math.sin(item.angle)*RADIUS,y,Math.cos(item.angle)*RADIUS);
      transform.rotation.set(0,item.angle+Math.sin(time*1.4+item.phase)*.3,item.kind==='bean'?.35:0);
      if(item.kind==='bean')transform.scale.set(.25,.36,.18);else transform.scale.setScalar(1);
      if(taken)transform.scale.setScalar(0);
      transform.updateMatrix();item.batch.setMatrixAt(item.index,transform.matrix);
      if(item.kind==='bean'&&seams) {
        transform.scale.setScalar(taken?0:1);transform.updateMatrix();seams.setMatrixAt(item.index,transform.matrix);
      }
      // A small cream highlight sits on the dimensional front of every icon.
      const radial=.17;
      transform.position.set(Math.sin(item.angle)*(RADIUS+radial)-Math.cos(item.angle)*.055,y+.12,
        Math.cos(item.angle)*(RADIUS+radial)+Math.sin(item.angle)*.055);
      transform.scale.set(taken?0:.045,taken?0:.082,taken?0:.022);transform.rotation.set(0,item.angle,0);
      transform.updateMatrix();highlights.setMatrixAt(haloIndex,transform.matrix);
      transform.position.set(Math.sin(item.angle)*RADIUS,y,Math.cos(item.angle)*RADIUS);
      if(assets.camera)transform.quaternion.copy(assets.camera.quaternion);
      else transform.rotation.set(0,item.angle,0);
      transform.scale.setScalar(taken?0:1+Math.sin(time*3+item.phase)*.06);transform.updateMatrix();
      halos.setMatrixAt(haloIndex,transform.matrix);
      const platform=run.platforms[item.platform];
      transform.position.y=platform.y+.024;transform.rotation.set(0,0,0);
      transform.scale.setScalar(taken||platform.collapsed?0:1);transform.updateMatrix();
      shadows.setMatrixAt(haloIndex,transform.matrix);
    });
    for(const batch of Object.values(batches))batch.instanceMatrix.needsUpdate=true;
    if(seams)seams.instanceMatrix.needsUpdate=true;
    halos.instanceMatrix.needsUpdate=true;
    highlights.instanceMatrix.needsUpdate=true;shadows.instanceMatrix.needsUpdate=true;
    const last=burst[burst.length-1],age=last?time-last.time:10;
    for(let i=0;i<24;i++) {
      if(age<.6) {
        const a=i*2.39996,speed=.55+(i%5)*.18;
        transform.position.set(last.x+Math.cos(a)*age*speed,last.y+.2+age*(1.8+i%3*.25)-age*age*2.5,last.z+Math.sin(a)*age*speed);
        transform.scale.setScalar((1-age/.6)*(.65+i%3*.22));transform.rotation.set(age*4,a,age*3);
      } else transform.scale.setScalar(0);
      transform.updateMatrix();sparks.setMatrixAt(i,transform.matrix);
    }
    sparks.instanceMatrix.needsUpdate=true;
  }
  return {root,update,collect,dispose(){
    world.remove(root);
    for(const b of [...Object.values(batches),halos,seams,sparks,highlights,shadows])b?.dispose();
    for(const geometry of [sphere,drop,star,seam,haloGeometry,shadowGeometry,sparkGeometry])geometry.dispose();
    material.dispose();haloMaterial.dispose();sparkMaterial.dispose();shadowMaterial.dispose();glowTexture.dispose();
  }};
}
