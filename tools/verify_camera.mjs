// Actual Three.js triangle checks, separate from official DevKit playthroughs.
// The original solid room is retained; only the final camera height changes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {makeCourse,PHYSICS} from '../experience/rules.js';
import {createEnvironment} from '../experience/environment.js';
import {cameraFrame,CAMERA_OVERHEAD_CLEARANCE} from '../experience/camera-layout.js';

const gradient={addColorStop(){}};
globalThis.OffscreenCanvas=class {
  constructor(width,height){this.width=width;this.height=height;}
  getContext(){return new Proxy({},{get:(_,key)=>key.startsWith('create')?()=>gradient:()=>{}});}
};
const scale=.24,base=.85,sizes=[[390,844],[320,740],[430,932],[844,390],[640,360],[960,640],[720,900]];
const worldPoint=p=>new THREE.Vector3(p.x*scale,base+p.y*scale,p.z*scale);
const reports=[];
for(const recipe of ['espresso','latte']) {
  const course=makeCourse(recipe),world=new THREE.Group();world.scale.setScalar(scale);world.position.y=base;
  const environment=createEnvironment(world,course);world.updateMatrixWorld(true);
  let room;environment.root.traverse(o=>{if(o.name==='Batched cafe furniture')room=o;});
  assert.ok(room,'Actual rendered room is present');
  // Identify the original oak slab and beams by their authored vertex tints,
  // then cast against their actual transformed triangles in the room batch.
  const wood=[new THREE.Color(0x96734b),new THREE.Color(0x745535)];
  const vertices=room.geometry.attributes.position,colors=room.geometry.attributes.color,positions=[];
  for(let i=0;i<vertices.count;i+=3) {
    if(!wood.some(c=>Math.abs(colors.getX(i)-c.r)<1e-6&&Math.abs(colors.getY(i)-c.g)<1e-6&&Math.abs(colors.getZ(i)-c.b)<1e-6))continue;
    for(let j=0;j<3;j++)positions.push(vertices.getX(i+j),vertices.getY(i+j),vertices.getZ(i+j));
  }
  const roofGeometry=new THREE.BufferGeometry();roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const roof=new THREE.Mesh(roofGeometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));world.add(roof);world.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(roof);
  assert.ok(positions.length>1000,'Real roof triangles were found');
  assert.ok(Math.abs(bounds.min.y-(base+(course.top+3.66)*scale))<1e-6);
  assert.ok(Math.abs(bounds.max.y-(base+(course.top+3.98)*scale))<1e-6);
  let rays=0,nearCorners=0,oldBlocked=0,minClearance=Infinity;
  const ray=new THREE.Raycaster(),camera=new THREE.PerspectiveCamera();camera.near=.025;camera.far=32;
  const maximumPlayerY=course.platforms[course.finishPlatform-1].y+PHYSICS.jumpSpeed**2/(2*PHYSICS.gravity);
  for(const [width,height] of sizes)for(let degrees=0;degrees<360;degrees+=10)
    for(const direction of [-1,0,1])for(const progress of [.85,.90,.95,.97,.99,1,maximumPlayerY/course.top]) {
      const y=Math.min(maximumPlayerY,course.top*progress),theta=degrees*Math.PI/180;
      const frame=cameraFrame({top:course.top,theta,y,direction,width,height});
      camera.aspect=width/height;camera.fov=frame.fov;camera.position.copy(worldPoint(frame.position));
      camera.lookAt(worldPoint(frame.target));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
      const clearance=bounds.min.y-camera.position.y;minClearance=Math.min(minClearance,clearance);
      assert.ok(clearance>=CAMERA_OVERHEAD_CLEARANCE*scale-1e-6);
      // Frustum corners of the final near plane must stay outside the roof too.
      for(const x of [-1,1])for(const z of [-1,1]) {
        const corner=new THREE.Vector3(x,z,-1).unproject(camera);
        assert.ok(corner.y<bounds.min.y);nearCorners++;
      }
      // The complete upper-route view corridor includes both barista edges and
      // upcoming landings across the widest jumps, rather than only the centre.
      for(const offset of [-1.14,-.55,0,.55,1.14])for(const bodyY of [.05,.85,1.7]) {
        const target=worldPoint({x:Math.sin(theta+offset)*5,y:y+bodyY,z:Math.cos(theta+offset)*5});
        const delta=target.clone().sub(camera.position);ray.set(camera.position,delta.clone().normalize());ray.far=delta.length();
        assert.equal(ray.intersectObject(roof,false).length,0,`${recipe}: roof blocks ${width}x${height} ${degrees}deg ${progress}`);rays++;
      }
      if(recipe==='espresso'&&width/height<.8&&progress===.97) {
        const old=worldPoint({...frame.position,y:Math.min((12-base)/scale-.8,y+5.8)});
        const target=worldPoint(frame.target),delta=target.clone().sub(old);ray.set(old,delta.clone().normalize());ray.far=delta.length();
        if(ray.intersectObject(roof,false).length)oldBlocked++;
      }
    }
  if(recipe==='espresso')assert.ok(oldBlocked>100,'Real triangle rays reproduce the old portrait obstruction');
  reports.push({recipe,viewports:sizes,angles:36,directions:3,progress:[.85,.90,.95,.97,.99,1],
    maximumPlayerY,roofTriangles:positions.length/9,roofBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    minimumCameraClearance:minClearance,nearPlaneCorners:nearCorners,viewCorridorRays:rays,
    originalBlockedRaysAt97Percent:oldBlocked,correctedBlockedRays:0});
  roofGeometry.dispose();roof.material.dispose();environment.dispose();
}
const output=process.argv[2]||'verification/2.4.1/camera-geometry.json';
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
