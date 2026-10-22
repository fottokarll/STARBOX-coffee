// Real Three.js geometry checks. Canvas drawing is stubbed here; official DevKit
// screenshots and playthroughs remain the separate visual/input verification.
import * as THREE from 'three';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {makeCourse} from '../experience/rules.js';
import {createEnvironment} from '../experience/environment.js';

const gradient={addColorStop(){}};
globalThis.OffscreenCanvas=class {
  constructor(width,height){this.width=width;this.height=height;}
  getContext(){return new Proxy({},{get:(_,key)=>key.startsWith('create')?()=>gradient:()=>{}});}
};
const report=[];
for(const recipe of ['espresso','latte']) {
  const course=makeCourse(recipe),world=new THREE.Group();
  world.scale.setScalar(.24);world.position.y=.85;
  const environment=createEnvironment(world,course),find=name=>{
    let object;environment.root.traverse(o=>{if(o.name===name)object=o;});
    assert.ok(object,`Missing ${name}`);return object;
  };
  const architecture=find('Merged textured café architecture'),surface=find('Rippling coffee surface');
  const vertices=architecture.geometry.attributes.position,colors=architecture.geometry.attributes.color;
  const forest=new THREE.Color(0x1e3932);let floorY=-Infinity;
  for(let i=0;i<vertices.count;i++)if(Math.abs(colors.getX(i)-forest.r)<1e-6&&
    Math.abs(colors.getY(i)-forest.g)<1e-6&&Math.abs(colors.getZ(i)-forest.b)<1e-6)
    floorY=Math.max(floorY,vertices.getY(i));
  assert.ok(Number.isFinite(floorY),'Find the actual solid green coaster geometry');
  let samples=0,originalCoasterIntersections=0,minimumClearance=Infinity;
  const heights=[-3,-2.99,-2.96,-2.90,-2.8,0,course.top*.5,course.top-.1];
  for(const coffeeY of heights)for(let frame=0;frame<80;frame++) {
    const time=frame*.25;
    environment.update({coffeeY},time,0,{theta:time*.03});
    const points=surface.geometry.attributes.position;
    for(let i=0;i<points.count;i++) {
      const x=points.getX(i),z=points.getZ(i),y=surface.position.y+points.getY(i)*surface.scale.y;
      assert.ok(Number.isFinite(y),'Liquid coordinates stay finite');
      minimumClearance=Math.min(minimumClearance,y-floorY);
      assert.ok(y>floorY+.009,`${recipe} coffee intersects coaster at t=${time}, height=${coffeeY}`);
      if(coffeeY===-3) {
        const original=-3+(Math.sin(x*1.4+time*1.65)*Math.cos(z*1.2-time*1.3)*.048+
          Math.sin(Math.hypot(x+2.2,z+1.1)*5-time*5)*.019)*surface.scale.y;
        if(original<=floorY)originalCoasterIntersections++;
      }
      samples++;
    }
  }
  assert.ok(originalCoasterIntersections>1000,'The regression fixture reproduces the original green exposure');
  environment.update({coffeeY:-3},2.4,0,{theta:.5});world.updateMatrixWorld(true);
  // Cast through the actual animated triangles, rather than assuming the radial
  // index buffer has no holes. The full inner coffee disk must be present.
  let coverageRays=0;
  for(let x=-5.2;x<=5.2;x+=.52)for(let z=-5.2;z<=5.2;z+=.52)if(Math.hypot(x,z)<5.5) {
    const ray=new THREE.Raycaster(new THREE.Vector3(x*.24,.85,z*.24),new THREE.Vector3(0,-1,0));
    assert.ok(ray.intersectObject(surface,false).length,`Missing liquid triangle at ${x},${z}`);coverageRays++;
  }
  const backdrop=find('Distant warm café windows'),room=find('Batched cafe furniture');
  const roomPoints=room.geometry.attributes.position;let maxRoomRadius=0;
  for(let i=0;i<roomPoints.count;i++)maxRoomRadius=Math.max(maxRoomRadius,Math.hypot(roomPoints.getX(i),roomPoints.getZ(i)));
  const backdropRadius=backdrop.geometry.parameters.radiusTop;
  assert.ok(backdropRadius>maxRoomRadius+.5,'Opaque backdrop must be behind the real 3D room');
  const bounds=new THREE.Box3().setFromObject(environment.root,true);let drawObjects=0,triangles=0;
  environment.root.traverse(o=>{if(o.isMesh){
    drawObjects++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);
  }});
  assert.ok(bounds.min.x>=-6&&bounds.max.x<=6&&bounds.min.z>=-9.5&&bounds.max.z<=9.5);
  assert.ok(bounds.min.y>=0&&bounds.max.y<=12);
  report.push({recipe,coasterTop:floorY,surfaceSamples:samples,heights,originalCoasterIntersections,
    correctedCoasterIntersections:0,minimumClearance,coverageRays,maxRoomRadius,backdropRadius,
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},drawObjects,triangles,stats:environment.stats});
  environment.dispose();
}
const output=process.argv[2]||'verification/2.4/presentation-geometry.json';
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
