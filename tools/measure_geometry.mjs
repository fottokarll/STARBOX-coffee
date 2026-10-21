// Geometry-only inspection. Canvas drawing is stubbed; positions use real Three r186.
// Visual verification is separately performed in the official DevKit.
import * as THREE from 'three';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {makeCourse} from '../experience/rules.js';
import {createEnvironment} from '../experience/environment.js';

const gradient = {addColorStop(){}};
globalThis.OffscreenCanvas = class {
  constructor(width,height) {this.width=width;this.height=height;}
  getContext() {return new Proxy({}, {get:(_,key)=>key.startsWith('create')?()=>gradient:()=>{}});}
};
const report = [];
for (const recipe of ['espresso','latte']) {
  const world = new THREE.Group(); world.scale.setScalar(.24); world.position.y=.85;
  const camera = new THREE.PerspectiveCamera(); camera.position.set(0,1.6,3);
  const environment = createEnvironment(world, makeCourse(recipe), {camera});
  world.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(environment.root);
  let triangles = 0, objects = 0;
  environment.root.traverse(o=>{
    if (!o.isMesh) return;
    objects++;
    triangles += (o.geometry.index?.count || o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);
  });
  assert.ok(box.min.x>=-6 && box.max.x<=6 && box.min.z>=-9.5 && box.max.z<=9.5);
  assert.ok(box.min.y>=0 && box.max.y<=12);
  report.push({recipe,bounds:{min:box.min.toArray(),max:box.max.toArray()},triangles,objects,stats:environment.stats});
  environment.dispose();
}
await fs.writeFile('verification/2.2/geometry.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
