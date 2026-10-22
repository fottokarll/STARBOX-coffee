import {platformThickness} from './collision.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// All surfaces and furniture are original, deliberately small café geometry.
// Gameplay colliders remain in rules.js; every landing surface uses those angles.
const TAU = Math.PI * 2;
const WHITE = 0xffffff;
const C = {
  cream: 0xf2f0e8, green: 0x006241, forest: 0x1e3932,
  gold: 0xc8a66a, brown: 0x6f4e37, amber: 0xffcf7b
};
const TILE = {
  ceramic: 0, wood: 1, biscuit: 2, brick: 3, green: 4, gold: 5,
  awning: 6, edge: 7, coffee: 8, foam: 9, leaf: 10, crack: 11,
  inset: 12, pot: 13, lantern: 14, white: 15
};
const identity = new THREE.Matrix4();
const lightDirection = new THREE.Vector3(-0.35, 0.88, 0.32).normalize();

function transform(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz)
  );
}

function tintGeometry(geometry, tile, color = WHITE, shade = true) {
  const uv = geometry.getAttribute('uv');
  const position = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const outUV = new Float32Array(position.count * 2);
  const colors = new Float32Array(position.count * 3);
  const base = new THREE.Color(color);
  const normal = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    let u = uv ? uv.getX(i) : 0.5;
    let v = uv ? uv.getY(i) : 0.5;
    u = Math.max(0.018, Math.min(0.982, u));
    v = Math.max(0.018, Math.min(0.982, v));
    outUV[i * 2] = ((tile % 4) + u) / 4;
    outUV[i * 2 + 1] = (3 - Math.floor(tile / 4) + v) / 4;
    let amount = 1;
    if (shade && normals) {
      normal.fromBufferAttribute(normals, i);
      amount = 0.59 + Math.max(0, normal.dot(lightDirection)) * 0.41;
    }
    colors[i * 3] = base.r * amount;
    colors[i * 3 + 1] = base.g * amount;
    colors[i * 3 + 2] = base.b * amount;
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(outUV, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function prepared(geometry, matrix, tile, color = WHITE, shade = true) {
  geometry.applyMatrix4(matrix || identity);
  return tintGeometry(geometry, tile, color, shade);
}

function combine(parts) {
  if (!parts.length) return new THREE.BufferGeometry();
  const ready = parts.map(part => {
    const geometry = part.index ? part.toNonIndexed() : part;
    if (geometry !== part) part.dispose();
    const count = geometry.getAttribute('position').count;
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    if (!geometry.getAttribute('color')) {
      const values = new Float32Array(count * 3); values.fill(1);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(values, 3));
    }
    return geometry;
  });
  const geometry = mergeGeometries(ready, false);
  ready.forEach(part => part.dispose());
  if (!geometry) throw new Error('Café geometry could not be merged');
  return geometry;
}

function addBox(parts, x, y, z, w, h, d, tile, color = WHITE, ry = 0) {
  parts.push(prepared(new THREE.BoxGeometry(w, h, d), transform(x, y, z, 0, ry), tile, color));
}

function addSphere(parts, x, y, z, sx, sy, sz, tile, color = WHITE) {
  parts.push(prepared(new THREE.SphereGeometry(1, 8, 5), transform(x, y, z, 0, 0, 0, sx, sy, sz), tile, color));
}

function addCylinder(parts, x, y, z, top, bottom, height, tile, color = WHITE, segments = 10) {
  parts.push(prepared(new THREE.CylinderGeometry(top, bottom, height, segments), transform(x, y, z), tile, color));
}

function addTube(parts, from, to, radius, tile, color = WHITE, segments = 6) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const position = a.clone().add(b).multiplyScalar(0.5);
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const matrix = new THREE.Matrix4().compose(position, rotation, new THREE.Vector3(1, 1, 1));
  parts.push(prepared(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), segments), matrix, tile, color));
}

function addRing(parts, y, radius, thickness, tile, color = WHITE, segments = 48) {
  const geometry = new THREE.TorusGeometry(radius, thickness, 5, segments);
  parts.push(prepared(geometry, transform(0, y, 0, Math.PI / 2), tile, color));
}

function sectorGeometry(halfWidth, inner, outer, top, bottom, count = 18) {
  const positions = [], uv = [];
  function point(radius, angle, y) {
    return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
  }
  function face(a, b, c, uva, uvb, uvc) {
    positions.push(...a, ...b, ...c);
    uv.push(...uva, ...uvb, ...uvc);
  }
  for (let i = 0; i < count; i++) {
    const u = i / count, v = (i + 1) / count;
    const a = -halfWidth + u * halfWidth * 2, b = -halfWidth + v * halfWidth * 2;
    face(point(inner, a, top), point(outer, a, top), point(outer, b, top), [u, 0], [u, 1], [v, 1]);
    face(point(inner, a, top), point(outer, b, top), point(inner, b, top), [u, 0], [v, 1], [v, 0]);
    if (bottom === top) continue;
    for (const radius of [inner, outer]) {
      face(point(radius, a, bottom), point(radius, b, top), point(radius, a, top), [u, 0], [v, 1], [u, 1]);
      face(point(radius, a, bottom), point(radius, b, bottom), point(radius, b, top), [u, 0], [v, 0], [v, 1]);
    }
    face(point(inner, a, bottom), point(outer, b, bottom), point(outer, a, bottom), [u, 0], [v, 1], [u, 1]);
    face(point(inner, a, bottom), point(inner, b, bottom), point(outer, b, bottom), [u, 0], [v, 0], [v, 1]);
  }
  if (top !== bottom) {
    for (const angle of [-halfWidth, halfWidth]) {
      face(point(inner, angle, top), point(outer, angle, top), point(outer, angle, bottom), [0, 1], [1, 1], [1, 0]);
      face(point(inner, angle, top), point(outer, angle, bottom), point(inner, angle, bottom), [0, 1], [1, 0], [0, 0]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function bevelledLedge(halfWidth, inner, outer, thickness) {
  const positions=[],uv=[],steps=18,bevel=Math.min(.065,thickness*.25);
  const levels=[{y:0,i:inner+bevel,o:outer-bevel,a:halfWidth-.007},
    {y:-bevel,i:inner,o:outer,a:halfWidth},
    {y:-thickness+bevel,i:inner,o:outer,a:halfWidth},
    {y:-thickness,i:inner+bevel,o:outer-bevel,a:halfWidth-.007}];
  const point=(level,outerSide,t)=>{
    const a=(t*2-1)*level.a,r=outerSide?level.o:level.i;
    return [Math.sin(a)*r,level.y,Math.cos(a)*r];
  };
  function triangle(a,b,c,ua,ub,uc){positions.push(...a,...b,...c);uv.push(...ua,...ub,...uc);}
  function quad(a,b,c,d,u=0,v=1){
    triangle(a,b,c,[u,0],[v,0],[v,1]);triangle(a,c,d,[u,0],[v,1],[u,1]);
  }
  for(let k=0;k<steps;k++) {
    const a=k/steps,b=(k+1)/steps;
    quad(point(levels[0],false,a),point(levels[0],false,b),point(levels[0],true,b),point(levels[0],true,a),a,b);
    const bottom=levels.at(-1);
    quad(point(bottom,false,a),point(bottom,true,a),point(bottom,true,b),point(bottom,false,b),a,b);
    for(let j=0;j<levels.length-1;j++)for(const outside of [false,true])
      quad(point(levels[j],outside,a),point(levels[j+1],outside,a),point(levels[j+1],outside,b),point(levels[j],outside,b),a,b);
  }
  for(const t of [0,1])for(let j=0;j<levels.length-1;j++)
    quad(point(levels[j],false,t),point(levels[j],true,t),point(levels[j+1],true,t),point(levels[j+1],false,t));
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.computeVertexNormals();return geometry;
}

function liquidSurface(radius) {
  const positions=[],uv=[],indices=[],segments=48,rings=6;
  for(let j=0;j<=rings;j++)for(let k=0;k<=segments;k++) {
    const a=k/segments*TAU,r=radius*j/rings,x=Math.sin(a)*r,z=Math.cos(a)*r;
    positions.push(x,0,z);uv.push(x/radius*.5+.5,z/radius*.5+.5);
    if(j&&k){const n=j*(segments+1)+k;indices.push(n,n-1,n-segments-2,n,n-segments-2,n-segments-1);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  geometry.computeVertexNormals();return geometry;
}

function makePlatform(platform) {
  const kind = platform.kind || 'solid';
  const biscuit = kind === 'biscuit';
  const wood = platform.surface === 'wood';
  const pieces = [];
  const baseTile = biscuit ? TILE.biscuit : wood ? TILE.wood : TILE.edge;
  const topTile = biscuit ? TILE.biscuit : wood ? TILE.wood : TILE.ceramic;
  const thickness = platformThickness(platform);
  pieces.push(prepared(bevelledLedge(platform.halfWidth,4.35,5.65,thickness),identity,baseTile));
  pieces.push(prepared(sectorGeometry(platform.halfWidth-.007,4.415,5.585,.003,.003),identity,topTile));
  if (platform.surface === 'ceramic') {
    // Cool glaze lines distinguish sliding surfaces, including precision landings.
    for (const radius of [4.63, 4.77]) pieces.push(prepared(
      sectorGeometry(platform.halfWidth*.7,radius,radius+.025,.008,.008,12),identity,TILE.ceramic,0xb0d8dc));
  }
  if (!biscuit) {
    // An outer brass bead and dark inner edge give the ledge an actual crafted profile.
    pieces.push(prepared(sectorGeometry(platform.halfWidth-.004, 5.57, 5.63, -0.005, -0.08), identity, TILE.gold));
    pieces.push(prepared(sectorGeometry(platform.halfWidth-.004, 4.35, 4.40, -0.07, -0.21), identity, TILE.green));
    // Small supporting corbels stop the platforms feeling like flat floating rectangles.
    for (const sign of [-1, 1]) {
      const angle = sign * platform.halfWidth * 0.64;
      addTube(pieces, [Math.sin(angle) * 5.55, -thickness+.02, Math.cos(angle) * 5.55],
        [Math.sin(angle) * 6.08, -0.89, Math.cos(angle) * 6.08], 0.065, TILE.wood);
    }
  }
  return combine(pieces);
}

function icon(parts, centerX, centerY, z, size) {
  const vertices = [], uv = [];
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const r = (i % 2 ? 0.17 : 0.39) * size;
    points.push([centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, z]);
  }
  for (let i = 0; i < 10; i++) {
    vertices.push(centerX, centerY, z, ...points[i], ...points[(i + 1) % 10]);
    uv.push(0.5, 0.5, 0.1, 0.1, 0.9, 0.9);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  parts.push(prepared(geometry, identity, TILE.gold, WHITE, false));
  addBox(parts, centerX, centerY - size * 0.62, z, size * 0.55, size * 0.38, 0.045, TILE.ceramic);
  addTube(parts, [centerX + size * 0.28, centerY - size * 0.50, z],
    [centerX + size * 0.43, centerY - size * 0.57, z], size * 0.045, TILE.gold);
}

function glowTexture() {
  const canvas = new OffscreenCanvas(64, 64);
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.38)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.10)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// A low-cost wall of original painted café windows behind the real 3D mug.
// It supplies warm depth and distant bokeh without lights, shadows or post effects.
function cafeBackdropTexture(blur = 0) {
  const canvas = new OffscreenCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  const wall = ctx.createLinearGradient(0, 0, 0, 512);
  wall.addColorStop(0, '#263c2e');
  wall.addColorStop(0.44, '#57402a');
  wall.addColorStop(1, '#302b20');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, 512, 512);
  // Oak wall panels anchor the windows in a recognizable coffeehouse room.
  for (let y = 404; y < 512; y += 27) {
    ctx.fillStyle = y % 2 ? '#563b25' : '#61432a'; ctx.fillRect(0, y, 512, 26);
    ctx.fillStyle = '#84603b'; ctx.fillRect(0, y, 512, 2);
    for (let k = 0; k < 15; k++) {
      const x = (k * 43 + y * 7) % 512;
      ctx.fillStyle = 'rgba(166,118,63,0.12)'; ctx.fillRect(x, y + 7 + k % 10, 29, 1);
    }
  }
  for (let i = 0; i < 3; i++) {
    const x = 16 + i * 170;
    const halo = ctx.createRadialGradient(x + 70, 220, 12, x + 70, 220, 153);
    halo.addColorStop(0, 'rgba(249,181,78,0.23)');
    halo.addColorStop(1, 'rgba(249,181,78,0)');
    ctx.fillStyle = halo; ctx.fillRect(x - 75, 40, 300, 370);
    ctx.fillStyle = '#352b20'; ctx.fillRect(x - 7, 62, 151, 348);
    ctx.fillStyle = '#a27a45'; ctx.fillRect(x - 3, 66, 143, 340);
    const window = ctx.createLinearGradient(x, 0, x + 132, 0);
    window.addColorStop(0, '#98622e');
    window.addColorStop(0.26, '#c58e49');
    window.addColorStop(0.55, '#e2b86e');
    window.addColorStop(1, '#aa7034');
    ctx.fillStyle = window; ctx.fillRect(x + 3, 73, 131, 326);
    // Broad subtle interior silhouettes read as a distant café, not another level.
    ctx.fillStyle = 'rgba(86,56,31,0.25)';
    ctx.fillRect(x + 8, 331, 123, 48);
    ctx.fillRect(x + 19, 313, 14, 19); ctx.fillRect(x + 92, 309, 19, 23);
    ctx.fillStyle = '#4d3924';
    ctx.fillRect(x + 64, 70, 7, 333); ctx.fillRect(x + 1, 205, 134, 7);
    ctx.fillStyle = '#bd975a'; ctx.fillRect(x - 9, 401, 154, 8);
    ctx.fillStyle = '#795835'; ctx.fillRect(x - 9, 409, 154, 7);
    // Framed deep-green lintel and a soft hanging light above each window.
    ctx.fillStyle = '#1d3c2b'; ctx.fillRect(x - 10, 44, 155, 24);
    ctx.fillStyle = '#a77d45'; ctx.fillRect(x - 10, 44, 155, 2);
    ctx.fillStyle = '#312b20'; ctx.fillRect(x + 66, 0, 3, 105);
    const light = ctx.createRadialGradient(x + 68, 107, 1, x + 68, 107, 38);
    light.addColorStop(0, 'rgba(255,224,143,0.70)');
    light.addColorStop(0.24, 'rgba(255,178,63,0.26)');
    light.addColorStop(1, 'rgba(255,178,63,0)');
    ctx.fillStyle = light; ctx.fillRect(x + 28, 67, 80, 80);
    ctx.fillStyle = '#ddad58';ctx.fillRect(x + 56, 100, 25, 7);
    ctx.fillStyle = '#f8d68a';ctx.fillRect(x + 61, 107, 16, 12);
  }
  // Restrained bokeh and greenery keep the distant wall alive and welcoming.
  for (let i = 0; i < 24; i++) {
    const x = (i * 157 + 29) % 512, y = (i * 89 + 34) % 430;
    const r = 2 + i % 4;
    ctx.fillStyle = 'rgba(239,185,96,0.12)';ctx.beginPath();ctx.arc(x, y, r, 0, TAU);ctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    const x = (i * 89 + 11) % 512, y = 18 + (i * 37) % 50;
    ctx.fillStyle = i % 3 ? '#304f31' : '#49613a';
    ctx.beginPath();ctx.ellipse(x, y, 4, 8, i * 0.9, 0, TAU);ctx.fill();
  }
  let output=canvas;
  if(blur) {
    output=new OffscreenCanvas(512,512);const soft=output.getContext('2d');
    soft.filter=`blur(${blur}px)`;soft.drawImage(canvas,-3,-3,518,518);
  }
  const texture = new THREE.CanvasTexture(output);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function leafGeometry() {
  const positions = [0, 0, 0.035, -0.15, 0.22, 0, -0.11, 0.47, 0, 0, 0.66, 0, 0.14, 0.44, 0, 0.16, 0.20, 0];
  const uv = [0.5, 0, 0.02, 0.30, 0.15, 0.72, 0.5, 1, 0.88, 0.70, 0.98, 0.30];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
  geometry.computeVertexNormals();
  return tintGeometry(geometry, TILE.leaf, WHITE, false);
}

/**
 * world is the caller's scaled lot-local Group. Atlas is a loaded THREE.Texture.
 * The optional camera lets lantern/steam billboards follow the actual view.
 * This module owns and disposes its geometry/materials, but not the caller's atlas.
 */
export function createEnvironment(world, courseData, assets = {}) {
  const root = new THREE.Group(); root.name = 'STARBOX V2 handcrafted café'; world.add(root);
  const staticParts = [], lanternLightParts = [], glassParts = [], glintParts = [];
  const roomParts = [], roomLights = [];
  const disposable = new Set();
  const atlas = assets.atlas || null;
  if (atlas) {
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.magFilter = THREE.LinearFilter;
    atlas.minFilter = THREE.LinearMipmapLinearFilter;
    atlas.generateMipmaps = true;
    atlas.needsUpdate = true;
  }
  const opaque = new THREE.MeshBasicMaterial({map: atlas, vertexColors: true, side: THREE.DoubleSide});
  const lanternMaterial = new THREE.MeshBasicMaterial({map: atlas, vertexColors: true, side: THREE.DoubleSide});
  const glassMaterial = new THREE.MeshBasicMaterial({color: 0xb5dfd3, transparent: true, opacity: 0.04,
    side: THREE.BackSide, depthWrite: false});
  const glintMaterial = new THREE.MeshBasicMaterial({color: 0xe9fff5, transparent: true, opacity: 0.12,
    side: THREE.DoubleSide, depthWrite: false});
  const foamMaterial = new THREE.MeshBasicMaterial({color: 0xe6cb9c});
  const coffeeMaterial = new THREE.MeshBasicMaterial({map: atlas, vertexColors: true, side: THREE.DoubleSide});
  const glow = glowTexture();
  const glowMaterial = new THREE.MeshBasicMaterial({map: glow, color: 0xffae46, transparent: true,
    opacity: 0.66, depthWrite: false, depthTest: true, side: THREE.DoubleSide});
  const steamMaterial = new THREE.MeshBasicMaterial({map: glow, color: 0xe8e0c8, transparent: true,
    opacity: 0.12, depthWrite: false, side: THREE.DoubleSide});
  const ghostMaterial=opaque.clone();ghostMaterial.transparent=true;ghostMaterial.opacity=.27;ghostMaterial.depthWrite=false;
  ghostMaterial.color.set(0xe8d8a8);
  const bubbleMaterial=new THREE.MeshBasicMaterial({color:0xefbd74,transparent:true,opacity:.64,depthWrite:false});
  for (const material of [opaque, lanternMaterial, glassMaterial, glintMaterial, foamMaterial,
    coffeeMaterial, glowMaterial, steamMaterial,ghostMaterial,bubbleMaterial]) disposable.add(material);
  disposable.add(glow);
  const top = courseData.top;
  const biscuits = [], lanterns = [], leaves = [];
  const platforms = courseData.platforms;
  const lookup = new Map(platforms.map(p => [p.id, p]));
  const holder = new THREE.Object3D();

  function mesh(geometry, material, name, parent = root) {
    const object = new THREE.Mesh(geometry, material); object.name = name;
    disposable.add(geometry); parent.add(object); return object;
  }
  function instances(geometry, material, count, name) {
    const object = new THREE.InstancedMesh(geometry, material, count); object.name = name;
    object.frustumCulled = false;
    disposable.add(geometry); disposable.add(object); root.add(object); return object;
  }

  for (const platform of platforms) {
    const geometry = makePlatform(platform);
    if (platform.kind === 'biscuit') {
      const biscuitMaterial=opaque.clone();disposable.add(biscuitMaterial);
      const object = mesh(geometry, biscuitMaterial, 'Biscuit ' + platform.id);
      object.position.y = platform.y; object.rotation.y = platform.angle;
      const ghost=new THREE.Mesh(geometry,ghostMaterial);root.add(ghost);ghost.visible=false;
      ghost.position.copy(object.position);ghost.rotation.copy(object.rotation);
      biscuits.push({id: platform.id, object, ghost, x: 0, y: platform.y, z: 0, collapseAt: null});
    } else {
      geometry.applyMatrix4(transform(0, platform.y, 0, 0, platform.angle));
      staticParts.push(geometry);
    }
  }

  // A real oak counter supports the glass. Its quiet horizontal grain is world-fixed.
  addBox(staticParts,0,-3.24,0,44,.38,58,TILE.wood,0xd3b181);
  addBox(staticParts,0,-3.43,0,44.15,.10,58.15,TILE.green);
  for(let x=-20;x<=20;x+=4) addBox(staticParts,x,-3.043,0,.018,.008,58,TILE.wood,0x806343);
  addRing(staticParts,-3.025,6.12,.06,TILE.gold);
  addCylinder(staticParts,0,-3.06,0,6.05,6.05,.08,TILE.white,C.forest,64);

  // The room is a restrained theatrical depth layer; none of this furniture is a
  // gameplay collider. Everything is geometry, sharing two batched atlas materials.
  function furnitureCup(parts,x,y,z,size=1) {
    addCylinder(parts,x,y+size*.36,z,size*.34,size*.26,size*.70,TILE.ceramic);
    addCylinder(parts,x,y+size*.72,z,size*.30,size*.30,.025,TILE.coffee,WHITE,12);
    addCylinder(parts,x,y+.04,z,size*.5,size*.5,.06,TILE.ceramic,WHITE,12);
    parts.push(prepared(new THREE.TorusGeometry(size*.25,size*.065,4,10),transform(x+size*.36,y+size*.39,z),TILE.ceramic));
  }
  function espressoMachine(x,z,ry=0) {
    const parts=[];
    addBox(parts,0,-1.55,0,5.4,2.4,2.5,TILE.ceramic,0xd4d7d0);
    addBox(parts,0,-1.1,-1.30,5.15,1.1,.14,TILE.green,0x9ebda5);
    addBox(parts,0,-.22,0,5.7,.18,2.8,TILE.gold);
    addBox(parts,0,-2.62,-.65,5.8,.22,3.9,TILE.green);
    addBox(parts,0,-2.46,-1.4,4.8,.06,1.7,TILE.ceramic,0x9baaa5);
    for(const xx of [-1.55,0,1.55]) {
      addTube(parts,[xx,-1.1,-1.4],[xx,-1.8,-1.4],.16,TILE.ceramic);
      addTube(parts,[xx,-1.65,-1.4],[xx+.6,-1.65,-1.9],.10,TILE.green);
      parts.push(prepared(new THREE.CylinderGeometry(.27,.27,.10,16),transform(xx,-.86,-1.42,Math.PI/2),TILE.gold));
      parts.push(prepared(new THREE.CylinderGeometry(.20,.20,.11,16),transform(xx,-.86,-1.48,Math.PI/2),TILE.ceramic));
      furnitureCup(parts,xx,-2.43,-1.65,.6);furnitureCup(parts,xx,-.10,.1,.65);
    }
    addTube(parts,[2.5,-1,-1],[3.0,-1.2,-1.1],.07,TILE.gold);
    addTube(parts,[3,-1.2,-1.1],[3,-2.05,-1.1],.07,TILE.gold);
    // Grinder hopper, base, adjustment collar and dosing spout.
    addBox(parts,-4,-2.24,0,1.5,1.1,1.6,TILE.green);
    addCylinder(parts,-4,-1.25,0,.48,.62,1.1,TILE.ceramic,0xa3a99c);
    addCylinder(parts,-4,-.30,0,.69,.40,.9,TILE.coffee,0xb38c63,12);
    addCylinder(parts,-4,.20,0,.73,.73,.12,TILE.gold,WHITE,12);
    addBox(parts,-4,-1.7,-.8,.45,.3,.8,TILE.gold);
    const matrix=transform(x,0,z,0,ry);
    for(const g of parts){g.applyMatrix4(matrix);roomParts.push(g);}
  }
  // Equipment faces inward from a curved service counter, with generous silhouettes.
  for(const side of [-1,1]) {
    const a=Math.PI+side*.67, r=18;
    const x=Math.sin(a)*r,z=Math.cos(a)*r;
    addBox(roomParts,x,-2.91,z,10,.25,5,TILE.wood,0xd9b587,a);
    espressoMachine(x,z,a);
  }
  for(const [x,z] of [[-11,4],[12,3],[-7,-14]])furnitureCup(roomParts,x,-3.04,z,1.4);
  const roomHeight=top+6.6, roomCenter=(top-.1)/2;
  for(let i=0;i<8;i++) {
    const a=i*TAU/8,r=21.7,x=Math.sin(a)*r,z=Math.cos(a)*r;
    const parts=[],lit=[];
    // Tall windows, oak mullions, a forest-green lower wall and a golden lintel.
    addBox(parts,0,roomCenter,0,14,roomHeight,.28,TILE.white,0x6d7058);
    addBox(lit,0,roomCenter+1,-.18,11.5,roomHeight-4,.10,TILE.lantern,0x9f9677);
    for(const xx of [-6,-2,2,6])addBox(parts,xx,roomCenter,-.30,.18,roomHeight,.25,TILE.wood,0x8a6945);
    for(const yy of [-.8,top*.47,top+2.9])addBox(parts,0,yy,-.35,12.5,.20,.32,TILE.gold,0xc0a272);
    addBox(parts,0,-1.7,-.55,13.8,2.2,.5,TILE.green,0x65836d);
    // Deep shelves with cream cups and bags give the room a recognisable scale.
    if(i%2===0)for(const yy of [4.0,8.2]) {
      addBox(parts,0,yy,-.9,10,.20,1.6,TILE.wood);
      for(let k=0;k<6;k++) {
        if(k%2)furnitureCup(parts,-4+k*1.6,yy+.1,-.95,.9);
        else addBox(parts,-4+k*1.6,yy+.7,-.6,.8,1.2,.65,TILE.wood,0xd3b992);
      }
    }
    const matrix=transform(x,0,z,0,a);
    for(const g of parts){g.applyMatrix4(matrix);roomParts.push(g);}
    for(const g of lit){g.applyMatrix4(matrix);roomLights.push(g);}
  }
  // An oak ceiling and quiet beams close the room above the finish; the upper
  // camera sees cafe architecture rather than an empty band beyond the windows.
  addCylinder(roomParts,0,top+3.94,0,22,22,.08,TILE.wood,0x96734b,48);
  roomParts.push(prepared(new THREE.CylinderGeometry(21.8,21.8,.75,48,1,true),
    transform(0,top+3.53,0),TILE.green,0x84947b));
  for(const z of [-12,0,12])addBox(roomParts,0,top+3.78,z,36,.24,.35,TILE.wood,0x745535);
  // Long warm pendants and tapered shades; no realtime light/shadow pass is needed.
  for(let i=0;i<6;i++) {
    const a=i*TAU/6+.35,r=19,x=Math.sin(a)*r,z=Math.cos(a)*r;
    const y=top*.62+(i%2)*2;
    addTube(roomParts,[x,top+3.0,z],[x,y+1.2,z],.035,TILE.green);
    addCylinder(roomParts,x,y+.55,z,.28,1.15,1.15,TILE.green,WHITE,16);
    addCylinder(roomParts,x,y,z,1.18,1.18,.10,TILE.gold,WHITE,16);
    addCylinder(roomLights,x,y-.06,z,1.05,1.05,.04,TILE.lantern,0xffd393,16);
    // Broad plants stay outside the running lane.
    addCylinder(roomParts,x,-2.0,z,.80,.55,2.0,TILE.pot);
    for(let k=0;k<9;k++) {
      const xx=x+Math.sin(k*2.4)*1.1,zz=z+Math.cos(k*2.4)*1.1,yy=-.3+k%3*.5;
      addTube(roomParts,[x,-1,z],[xx,yy,zz],.035,TILE.leaf);
      addSphere(roomParts,xx,yy,zz,.55,.85,.28,TILE.leaf,k%2?0xa0b67d:0x79935d);
    }
  }
  // Slightly tapered open glass with a broad lip, fine reflections and mug handle.
  const cupHeight = top + 7;
  const cupRadius=y=>5.92+(y+3)/cupHeight*1.18;
  glassParts.push(new THREE.CylinderGeometry(7.10, 5.92, cupHeight, 64, 1, true)
    .translate(0, (top + 1) / 2, 0));
  addRing(staticParts, -2.94, 5.98, 0.12, TILE.gold);
  addRing(staticParts, -2.76, 6.00, 0.15, TILE.green);
  addRing(staticParts, top + 3.80, 7.10, 0.14, TILE.ceramic);
  addRing(staticParts, top + 3.70, 7.08, 0.065, TILE.gold);
  addRing(staticParts, top + 3.90, 7.10, 0.035, TILE.gold);
  for (let i = 0; i < 5; i++) {
    const angle = i * TAU / 5 + 0.21;
    const a = -3, b = top + 3.85;
    const vertices = [];
    const width = i % 2 ? 0.004 : 0.009;
    for (const [y, r] of [[a, 5.92], [b, 7.10]]) {
      for (const offset of [-width, width]) vertices.push(Math.sin(angle + offset) * r, y, Math.cos(angle + offset) * r);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 3, 0, 3, 2]);geometry.computeVertexNormals();glintParts.push(geometry);
  }
  const handleY = top * 0.53;
  const handlePoints = [];
  for (let i = 0; i <= 32; i++) {
    const a = -Math.PI / 2 + i / 32 * Math.PI;
    handlePoints.push(new THREE.Vector3(6.51 + Math.cos(a) * 1.25, handleY + Math.sin(a) * 3.8, -0.25));
  }
  const handleCurve = new THREE.CatmullRomCurve3(handlePoints);
  const handle = new THREE.TubeGeometry(handleCurve, 32, 0.17, 6, false);
  glintParts.push(handle);
  for (const y of [handleY - 3.8, handleY + 3.8]) {
    addTube(staticParts, [6.34, y, -0.25], [6.65, y, -0.25], 0.16, TILE.gold);
  }

  function localCafe(angle, y, variation) {
    const pieces = [], lights = [], ivyLocal = [];
    // Walls and frames sit beyond the running lane; awning/tables never alter collisions.
    addBox(pieces, 0, 1.06, 0.18, 3.0, 2.12, 0.3, TILE.brick);
    addBox(pieces, 0, 1.12, -0.02, 2.54, 1.61, 0.12, TILE.green);
    addBox(lights, 0, 1.30, -0.10, 2.12, 1.13, 0.05, TILE.lantern, 0xb69662);
    for (const x of [-1.12, 0, 1.12]) addBox(pieces, x, 1.30, -0.17, 0.055, 1.25, 0.07, TILE.gold);
    for (const yy of [0.73, 1.90]) addBox(pieces, 0, yy, -0.17, 2.40, 0.07, 0.08, TILE.wood);
    addBox(pieces, 0, 0.58, -0.41, 2.82, 0.14, 0.86, TILE.wood);
    addBox(pieces, 0, 0.47, -0.79, 2.75, 0.095, 0.075, TILE.gold);
    const awning = new THREE.BufferGeometry();
    awning.setAttribute('position', new THREE.Float32BufferAttribute([
      -1.66, 2.28, 0.34, 1.66, 2.28, 0.34, 1.66, 2.02, -0.88,
      -1.66, 2.28, 0.34, 1.66, 2.02, -0.88, -1.66, 2.02, -0.88
    ], 3));
    awning.setAttribute('uv', new THREE.Float32BufferAttribute([0,1,1,1,1,0,0,1,1,0,0,0],2));
    awning.computeVertexNormals();pieces.push(prepared(awning, identity, TILE.awning));
    addBox(pieces, 0, 1.94, -0.90, 3.34, 0.18, 0.06, TILE.awning);
    for (const x of [-1.52, 1.52]) {
      addBox(pieces, x, 1.02, -0.03, 0.12, 2.18, 0.14, TILE.wood);
      addTube(pieces, [x, 1.60, -0.04], [x, 2.05, -0.86], 0.04, TILE.gold);
      addCylinder(pieces, x, 0.13, -0.48, 0.19, 0.15, 0.28, TILE.pot);
      for (let k=0;k<5;k++) ivyLocal.push({x:x + Math.sin(k*2.4)*0.16,y:0.36+Math.cos(k)*0.08,z:-0.49,k:k+variation});
    }
    // An original star rising above a coffee cup replaces copied brand assets.
    icon(pieces, 0, 1.42, -0.205, 0.61);
    for (const x of [-0.72, 0.74]) {
      addCylinder(pieces, x, 0.79, -0.50, 0.12, 0.09, 0.31, TILE.ceramic);
      pieces.push(prepared(new THREE.TorusGeometry(0.12,0.015,4,10),transform(x,0.96,-0.50,Math.PI/2),TILE.gold));
    }
    for (const side of [-1, 1]) {
      for (let k=0;k<12;k++) {
        const yy=2.36-k*0.18;
        const xx=side*(1.68+Math.sin(k*0.78)*0.11);
        ivyLocal.push({x:xx,y:yy,z:0.10,k:k+side*9});
        if(k) addTube(pieces,[xx,yy,0.12],[side*(1.68+Math.sin((k-1)*0.78)*0.11),yy+0.18,0.12],0.018,TILE.leaf);
      }
    }
    const matrix = transform(Math.sin(angle)*6.72, y, Math.cos(angle)*6.72, 0, angle);
    for(const geometry of pieces) { geometry.applyMatrix4(matrix);staticParts.push(geometry); }
    for(const geometry of lights) { geometry.applyMatrix4(matrix);lanternLightParts.push(geometry); }
    for(const leaf of ivyLocal) {
      const position=new THREE.Vector3(leaf.x,leaf.y,leaf.z).applyMatrix4(matrix);
      leaves.push({position,angle:angle+Math.sin(leaf.k*2.4)*0.8,size:0.52+(leaf.k%3)*0.08,spin:leaf.k*1.1});
    }
  }
  const mainLength=courseData.mainPath.length;
  const cafeIndices = [0]; // One welcome alcove; the surrounding cafe supplies the architecture.
  cafeIndices.forEach((index,i)=>{
    const p=platforms[index];
    // The first alcove welcomes players immediately from behind the starting ledge.
    const angle=i===0?Math.PI+0.48:p.angle+(i%2?-0.85:0.85);
    const y=i===0?-0.30:Math.max(0,p.y-0.6);
    localCafe(angle,y,i);
  });

  function lantern(angle,y,index) {
    const r=6.04,x=Math.sin(angle)*r,z=Math.cos(angle)*r;
    const sx=Math.sin(angle),sz=Math.cos(angle);
    addTube(staticParts,[sx*6.32,y+1.45,sz*6.32],[sx*5.94,y+1.45,sz*5.94],0.045,TILE.gold);
    addTube(staticParts,[x,y+1.45,z],[x,y+1.12,z],0.025,TILE.gold);
    addCylinder(staticParts,x,y+0.45,z,0.28,0.30,0.12,TILE.green,WHITE,6);
    addCylinder(staticParts,x,y+1.07,z,0.30,0.22,0.15,TILE.gold,WHITE,6);
    addCylinder(lanternLightParts,x,y+0.77,z,0.22,0.22,0.55,TILE.lantern,WHITE,6);
    for(let k=0;k<4;k++) {
      const a=k*Math.PI/2;
      addTube(staticParts,[x+Math.sin(a)*0.23,y+0.49,z+Math.cos(a)*0.23],
        [x+Math.sin(a)*0.23,y+1.02,z+Math.cos(a)*0.23],0.023,TILE.green);
    }
    lanterns.push(new THREE.Vector3(x,y+0.78,z));
    if(index%2===0) {
      addCylinder(staticParts,sx*6.16,y-0.12,sz*6.16,0.22,0.17,0.27,TILE.pot);
      for(let k=0;k<6;k++) leaves.push({position:new THREE.Vector3(sx*6.12+Math.cos(k*2.4)*0.13,
        y+0.14+Math.sin(k)*0.08,sz*6.12+Math.sin(k*2.4)*0.13),angle:angle+k,size:0.45,spin:k});
    }
  }
  lantern(Math.PI-0.73,0.42,0);
  lantern(Math.PI+0.73,0.42,1);
  for(let i=3;i<mainLength-1;i+=4) {
    const p=platforms[i];lantern(p.angle-p.direction*(p.halfWidth+.23),p.y+.12,i);
  }
  for(const route of courseData.biscuitAlternates||[]) {
    const p=platforms[route.pads[0]];lantern(p.angle-p.direction*(p.halfWidth+.18),p.y-.2,p.id);
    // A green inset and two brass studs distinguish the permanent timber detour.
    const mark=prepared(sectorGeometry(p.halfWidth*.7,4.48,4.56,.018,.005),
      transform(0,p.y,0,0,p.angle),TILE.green,0x9dcaa2);
    staticParts.push(mark);
  }

  // A wide café arch signals the actual finish without making a decorative collider.
  const goal=platforms.find(p=>p.finish)||lookup.get(courseData.finishPlatform)||platforms[platforms.length-1];
  const exitParts=[];
  const arch=new THREE.TorusGeometry(0.89,0.12,5,20,Math.PI);
  exitParts.push(prepared(arch,transform(0,1.0,0),TILE.gold));
  addBox(exitParts,-0.89,0.50,0,0.17,1.0,0.19,TILE.green);
  addBox(exitParts,0.89,0.50,0,0.17,1.0,0.19,TILE.green);
  icon(exitParts,0,2.10,0,0.72);
  addBox(exitParts,0,2.65,0,2.7,.36,.15,TILE.green);
  for (const x of [-1.34,1.34]) {
    addBox(exitParts,x,1.25,0,.10,2.8,.10,TILE.gold);
    icon(exitParts,x,2.77,0,.24);
  }
  staticParts.push(prepared(sectorGeometry(goal.halfWidth,4.38,5.62,.015,.015),
    transform(0,goal.y,0,0,goal.angle),TILE.gold));
  const exitMatrix=transform(Math.sin(goal.angle)*5,goal.y,Math.cos(goal.angle)*5,0,goal.angle);
  for(const geometry of exitParts){geometry.applyMatrix4(exitMatrix);staticParts.push(geometry);}

  // A small brass pour spout and rich continuously moving stream are visible above.
  addTube(staticParts,[-2.2,top+3.45,-5.8],[-2.2,top+3.45,-1.1],0.14,TILE.gold);
  addTube(staticParts,[-2.2,top+3.45,-1.1],[-2.2,top+2.83,-1.1],0.17,TILE.green);
  const streamGeometry=prepared(new THREE.CylinderGeometry(0.12,0.17,1,8),identity,TILE.coffee);
  const stream=mesh(streamGeometry,coffeeMaterial,'Continuous coffee pour');stream.position.set(-2.2,top/2,-1.1);
  const backgroundTexture=cafeBackdropTexture(0);
  backgroundTexture.repeat.set(4,(top+7.05)/12);
  const backgroundMaterial=new THREE.MeshBasicMaterial({map:backgroundTexture,
    side:THREE.BackSide,fog:false,depthWrite:true,toneMapped:false});
  disposable.add(backgroundTexture);disposable.add(backgroundMaterial);
  const backgroundGeometry=new THREE.CylinderGeometry(16.8,16.8,top+7.05,48,1,true);
  backgroundGeometry.translate(0,(top+.75)/2,0);
  const background=mesh(backgroundGeometry,backgroundMaterial,'Distant warm café windows');
  background.renderOrder=-30;
  // Distinct distant layers retain only a small fraction of the camera orbit.
  // Their continuous presentation angle is updated below; the counter stays fixed.
  const middleTexture=cafeBackdropTexture(0);disposable.add(middleTexture);
  middleTexture.repeat.set(2,(top+8)/11);
  const middleMaterial=new THREE.MeshBasicMaterial({map:middleTexture,color:0xe6c997,
    side:THREE.BackSide,transparent:true,opacity:.12,depthWrite:false,fog:false});disposable.add(middleMaterial);
  const middleGeometry=new THREE.CylinderGeometry(10.5,10.5,top+7.2,36,1,true,0,Math.PI*1.15);
  middleGeometry.translate(0,(top+.6)/2,0);
  const middle=mesh(middleGeometry,middleMaterial,'Quiet middle-distance café parallax');
  const room=new THREE.Group();room.name='Cafe service counters, windows and pendants';root.add(room);
  mesh(combine(roomParts),opaque,'Batched cafe furniture',room);
  mesh(combine(roomLights),lanternMaterial,'Warm cafe windows and pendant light',room);
  const signCanvas=new OffscreenCanvas(1024,256),signContext=signCanvas.getContext('2d');
  signContext.fillStyle='#173c30';signContext.fillRect(0,0,1024,256);
  signContext.strokeStyle='#c8a66a';signContext.lineWidth=5;signContext.strokeRect(12,12,1000,232);
  signContext.fillStyle='#f2f0e8';signContext.textAlign='center';signContext.font='bold 74px serif';
  signContext.fillText('STARBOX COFFEE',512,126);signContext.font='25px serif';signContext.fillStyle='#c8a66a';
  signContext.fillText('FRESHLY ROASTED  ·  BEAUTIFULLY BREWED',512,184);
  const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;disposable.add(signTexture);
  const signMaterial=new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide});disposable.add(signMaterial);
  const sign=mesh(new THREE.PlaneGeometry(12,3),signMaterial,'STARBOX COFFEE cafe sign',room);
  sign.position.set(0,top*.40,-20.5);
  const staticMesh=mesh(combine(staticParts),opaque,'Merged textured café architecture');
  const lamps=mesh(combine(lanternLightParts),lanternMaterial,'Warm lantern glass');
  const cup=mesh(combine(glassParts),glassMaterial,'Transparent tapered mug');cup.renderOrder=-20;
  const reflections=mesh(combine(glintParts),glintMaterial,'Glass reflections and handle');reflections.renderOrder=5;

  const leafMesh=instances(leafGeometry(),opaque,leaves.length,'Instanced trailing ivy');
  for(let i=0;i<leaves.length;i++) {
    const leaf=leaves[i];holder.position.copy(leaf.position);
    holder.rotation.set(0.2,leaf.angle,Math.sin(leaf.spin)*0.6);
    holder.scale.setScalar(leaf.size);holder.updateMatrix();leafMesh.setMatrixAt(i,holder.matrix);
  }
  leafMesh.instanceMatrix.needsUpdate=true;
  const planeGeometry=new THREE.PlaneGeometry(1,1);
  const halos=instances(planeGeometry,glowMaterial,lanterns.length,'Soft lantern halos');

  // Dense geometry is reserved for the gameplay silhouettes, not the liquid effects.
  const surfaceGeometry=liquidSurface(5.94);
  prepared(surfaceGeometry,identity,TILE.coffee);
  const surface=mesh(surfaceGeometry,coffeeMaterial,'Rippling coffee surface');
  const surfacePosition=surfaceGeometry.getAttribute('position');
  const surfaceBase=new Float32Array(surfacePosition.array);
  const volumeGeometry=prepared(new THREE.CylinderGeometry(5.93,5.93,1,40,1,true),identity,TILE.coffee,0xd4b38d);
  const volume=mesh(volumeGeometry,coffeeMaterial,'Rising coffee volume');
  const foamGeometry=new THREE.SphereGeometry(1,7,4);
  const foam=instances(foamGeometry,foamMaterial,26,'Cream foam bubbles');
  const steam=instances(new THREE.PlaneGeometry(1,1),steamMaterial,9,'Slow coffee steam');
  const bubbles=instances(new THREE.SphereGeometry(1,8,5),bubbleMaterial,18,'Rising coffee bubbles and splashes');
  const topGlowMaterial=new THREE.MeshBasicMaterial({map:glow,color:0xffdb92,transparent:true,
    opacity:.16,depthWrite:false,side:THREE.DoubleSide});disposable.add(topGlowMaterial);
  const topGlow=mesh(new THREE.PlaneGeometry(13,13),topGlowMaterial,'Warm overhead cup glow');
  topGlow.rotation.x=Math.PI/2;topGlow.position.y=top+3.8;
  const crackPieces=[];
  for(let i=0;i<4;i++) {
    const t=i/3;
    addBox(crackPieces,(i%2?0.08:-0.08),0.022,4.53+t*0.98,0.075,0.025,0.39,TILE.crack,0x714b25,(i%2?0.27:-0.29));
    if(i<3)addBox(crackPieces,.18+i*.17,.023,4.65+t*.8,.065,.025,.34,TILE.crack,0x714b25,-.9);
  }
  const crackGeometry=combine(crackPieces);
  const cracks=instances(crackGeometry,opaque,biscuits.length,'Progressive biscuit cracks');
  const crumbGeometry=tintGeometry(new THREE.BoxGeometry(0.10,0.10,0.10),TILE.biscuit);
  const crumbs=instances(crumbGeometry,opaque,biscuits.length*10,'Falling biscuit crumbs');
  const edgeMaterial=new THREE.MeshBasicMaterial({color:0xffbd65,transparent:true,opacity:.85,depthWrite:false});
  disposable.add(edgeMaterial);
  const warningEdges=instances(sectorGeometry(.27,4.32,4.41,.025,.009),edgeMaterial,biscuits.length,'Biscuit warning and recovery edge');
  const foregroundScene=new THREE.Scene(),foregroundRoot=new THREE.Group();
  foregroundRoot.scale.setScalar(.24);foregroundRoot.position.y=.85;foregroundScene.add(foregroundRoot);
  // Edge-biased soft glints simulate condensation without expensive refraction/post effects.
  const lensMaterial=new THREE.MeshBasicMaterial({map:glow,color:0xe3f4de,transparent:true,
    opacity:.10,depthWrite:false,depthTest:false});disposable.add(lensMaterial);
  const lensGeometry=new THREE.PlaneGeometry(1,1);disposable.add(lensGeometry);
  const condensation=new THREE.InstancedMesh(lensGeometry,lensMaterial,10);condensation.frustumCulled=false;
  foregroundRoot.add(condensation);disposable.add(condensation);
  const invisibleScale=new THREE.Vector3(0,0,0);
  const normalScale=new THREE.Vector3(1,1,1);
    const rotation=new THREE.Quaternion();
  const billboard=new THREE.Quaternion();

  function update(run,time,dt=0,view={theta:0}) {
    // Near counter/cup stay physically anchored. Distant theatrical scenery follows
    // most of the orbit, retaining only 8/12/16% of its apparent angular motion.
    // Use the continuous camera angle so a full revolution never snaps the layers.
    background.rotation.y=view.theta*.92;middle.rotation.y=view.theta*.88;room.rotation.y=view.theta*.84;
    const coffeeY=Number.isFinite(run?.coffeeY)?run.coffeeY:-2.8;
    surface.position.y=coffeeY;
    surface.scale.setScalar((cupRadius(coffeeY)-.08)/5.94);
    surface.rotation.y=time*0.035;
    for(let i=0;i<surfacePosition.count;i++) {
      const x=surfaceBase[i*3],z=surfaceBase[i*3+2];
      const wave=Math.sin(x*1.4+time*1.65)*Math.cos(z*1.2-time*1.3)*.048+
        Math.sin(Math.hypot(x+2.2,z+1.1)*5-time*5)*.019;
      surfacePosition.setY(i,surfaceBase[i*3+1]+wave);
    }
    surfacePosition.needsUpdate=true;
    const height=Math.max(0.01,coffeeY+3.05);
    volume.scale.set((cupRadius(coffeeY)-.1)/5.93,height,(cupRadius(coffeeY)-.1)/5.93);
    volume.position.y=-3.05+height/2;
    const pourLength=Math.max(0.01,top+2.85-coffeeY);
    stream.scale.set(1+Math.sin(time*9)*0.045,pourLength,1);
    stream.position.y=coffeeY+pourLength/2;
    if(assets.camera)billboard.copy(assets.camera.quaternion);
    for(let i=0;i<lanterns.length;i++) {
      holder.position.copy(lanterns[i]);holder.quaternion.copy(billboard);
      holder.scale.setScalar(1.44+Math.sin(time*1.4+i)*0.06);holder.updateMatrix();halos.setMatrixAt(i,holder.matrix);
    }
    halos.instanceMatrix.needsUpdate=true;
    for(let i=0;i<26;i++) {
      const angle=i*2.39996+time*0.055,radius=0.55+(i%7)*0.75;
      const size=0.14+0.045*(i%4)+Math.sin(time*1.7+i)*0.025;
      holder.position.set(Math.sin(angle)*radius,coffeeY+0.07+Math.sin(time*2.1+i)*0.04,Math.cos(angle)*radius);
      holder.quaternion.identity();holder.scale.set(size*1.4,size*0.24,size);holder.updateMatrix();foam.setMatrixAt(i,holder.matrix);
    }
    foam.instanceMatrix.needsUpdate=true;
    for(let i=0;i<9;i++) {
      const phase=(time*0.12+i/9)%1;
      holder.position.set(Math.sin(i*2.4+time*0.08)*(1.5+phase),coffeeY+0.35+phase*3.4,Math.cos(i*2.4)*(1.2+phase));
      holder.quaternion.copy(billboard);holder.scale.setScalar(0.75+phase*1.8);
      holder.updateMatrix();steam.setMatrixAt(i,holder.matrix);
    }
    steam.instanceMatrix.needsUpdate=true;
    for(let i=0;i<18;i++) {
      const phase=(time*(i<10?.53:.88)+i*.137)%1;
      const angle=i*2.39996,radius=i<10?1.2+i%5*.83:.38+i%3*.1;
      const baseX=i<10?Math.sin(angle)*radius:-2.2;
      const baseZ=i<10?Math.cos(angle)*radius:-1.1;
      const height=i<10?Math.sin(phase*Math.PI)*.32:Math.sin(phase*Math.PI)*.85;
      holder.position.set(baseX+Math.cos(angle)*phase*.27,coffeeY+.035+height,baseZ+Math.sin(angle)*phase*.27);
      const size=(i<10?.09:.055)*(1-Math.pow(phase,4));
      holder.scale.set(size,size*(i<10?.7:1.4),size);holder.rotation.set(0,0,0);
      holder.updateMatrix();bubbles.setMatrixAt(i,holder.matrix);
    }
    bubbles.instanceMatrix.needsUpdate=true;
    if(assets.camera) {
      const viewTheta=Math.atan2(assets.camera.position.x,assets.camera.position.z);
      const viewY=(assets.camera.position.y-.85)/.24-3.4;
      for(let i=0;i<10;i++) {
        const y=Math.max(-2.5,Math.min(top+2.9,viewY+(i/10-.5)*10+Math.sin(time*.08+i)*.12));
        const a=viewTheta+(i%2?1:-1)*(.57+(i%3)*.12)+Math.sin(viewTheta*.8+i)*.035;
        const r=cupRadius(Math.max(-3,Math.min(top+4,y)))-.025;
        holder.position.set(Math.sin(a)*r,y,Math.cos(a)*r);
        holder.quaternion.copy(billboard);
        const size=.38+(i%3)*.19;
        holder.scale.set(size*.58,size*1.5,1);holder.updateMatrix();condensation.setMatrixAt(i,holder.matrix);
      }
      condensation.instanceMatrix.needsUpdate=true;
    }
    const active=run?.platforms?new Map(run.platforms.map(p=>[p.id,p])):lookup;
    for(let i=0;i<biscuits.length;i++) {
      const biscuit=biscuits[i],state=active.get(biscuit.id)||lookup.get(biscuit.id);
      const progress=state?.crumbleProgress||0;
      if(!state?.collapsed)biscuit.collapseAt=null;
      if(state?.collapsed&&biscuit.collapseAt===null)biscuit.collapseAt=time;
      const fall=biscuit.collapseAt===null?0:Math.max(0,time-biscuit.collapseAt);
      const shake=progress>0&&!state?.collapsed?Math.sin(time*80+i)*0.024*progress:0;
      biscuit.object.visible=!state?.collapsed||fall<0.55;
      biscuit.object.position.set(shake,biscuit.y-fall*fall*12,0);
      biscuit.object.rotation.set(fall*0.6,lookup.get(biscuit.id).angle,shake*0.7);
      const pulse=progress>.60?(Math.sin(time*19)>0?.10:0):0;
      biscuit.object.material.color.setRGB(1,1-progress*.22+pulse,1-progress*.42+pulse);
      const rebuilding=state?.collapsed&&(state.regenerateProgress||0)>0;
      biscuit.ghost.visible=Boolean(rebuilding);
      biscuit.ghost.position.y=biscuit.y-.13*(1-(state?.regenerateProgress||0));
      biscuit.ghost.scale.setScalar(.92+.08*(state?.regenerateProgress||0));
      const original=lookup.get(biscuit.id);
      rotation.setFromEuler(new THREE.Euler(0,original.angle,0));
      const crackScale=progress>0.24&&!state?.collapsed?normalScale:invisibleScale;
      cracks.setMatrixAt(i,new THREE.Matrix4().compose(new THREE.Vector3(shake,biscuit.y,0),rotation,crackScale));
      holder.position.set(0,biscuit.y,0);holder.quaternion.copy(rotation);
      holder.scale.setScalar((progress>.05&&!state?.collapsed)||rebuilding?1:0);holder.updateMatrix();
      warningEdges.setMatrixAt(i,holder.matrix);
      warningEdges.setColorAt(i,new THREE.Color(rebuilding?0xb8ebc8:progress>.6?0xffb54a:0xf0d8aa));
      for(let k=0;k<10;k++) {
        const age=(time*1.7+k/10)%1;
        const visible=progress>0.12&&(!state?.collapsed||fall<0.65);
        const angle=original.angle+(k-4.5)*original.halfWidth/5;
        const r=4.55+(k%3)*.42+age*(k%2?.18:-.18);
        holder.position.set(Math.sin(angle)*r,biscuit.y+age*.55-age*age*(1.1+progress*1.8),Math.cos(angle)*r);
        holder.rotation.set(time+k,time*1.2+k,k);
        holder.scale.copy(visible?normalScale:invisibleScale);holder.updateMatrix();crumbs.setMatrixAt(i*10+k,holder.matrix);
      }
    }
    cracks.instanceMatrix.needsUpdate=true;crumbs.instanceMatrix.needsUpdate=true;
    warningEdges.instanceMatrix.needsUpdate=true;
    if(warningEdges.instanceColor)warningEdges.instanceColor.needsUpdate=true;
  }
  function dispose() {
    world.remove(root);
    for(const item of disposable)item.dispose?.();
  }
  update(null,0,0);
  return {root,platformRoot:staticMesh,cupRoot:cup,foregroundScene,update,dispose,
    lightAt(theta,y){
      const position=new THREE.Vector3(Math.sin(theta)*5,y+.9,Math.cos(theta)*5);
      let amount=.12;
      for(const lamp of lanterns)amount=Math.max(amount,Math.max(0,1-position.distanceTo(lamp)/3.2));
      return amount;
    },
    stats:{staticTriangles:staticMesh.geometry.getAttribute('position').count/3,biscuits:biscuits.length,
      lanterns:lanterns.length,ivyLeaves:leaves.length,parallaxRates:[.08,.12,.16]}};
}
