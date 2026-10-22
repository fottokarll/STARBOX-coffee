import * as THREE from 'three';
const UP=new THREE.Vector3(0,1,0);
function windowUniform(material) {
  const direction={value:new THREE.Vector3(-.52,.78,.35).normalize()};
  material.userData.setWindowAngle=angle=>direction.value.set(-.52,.78,.35).normalize().applyAxisAngle(UP,angle);
  return direction;
}

// A single inexpensive material supplies coherent window light, enamel highlights
// and the local lantern falloff. It needs no scene lights or extra shadow pass.
export function createCafeMaterial(atlas, {distant = false, luminous = false, polished = false} = {}) {
  const lamps = {value: Array.from({length:16}, () => new THREE.Vector4(0, -100, 0, 0))};
  const material = new THREE.MeshBasicMaterial({map:atlas,vertexColors:true,side:THREE.DoubleSide});
  const windowDirection=windowUniform(material);
  material.customProgramCacheKey = () => `starbox-cafe-24-${Boolean(atlas)}-${distant}-${luminous}-${polished}`;
  material.userData.setLanterns = (positions, root) => {
    root.updateWorldMatrix(true,false);
    positions.slice(0,16).forEach((p,i) => {
      const world=root.localToWorld(p.clone());
      lamps.value[i].set(world.x,world.y,world.z,.78);
    });
  };
  material.onBeforeCompile = shader => {
    shader.uniforms.cafeLamps=lamps;
    shader.uniforms.cafeWindowDirection=windowDirection;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      uniform vec4 cafeLamps[16];
      varying vec3 cafePosition;
      varying vec3 cafeNormal;
      varying vec2 cafeTileUV;
      varying float cafeLamp;
    `).replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 cafeLocal=vec4(position,1.0);
      vec3 cafeN=normal;
      #ifdef USE_INSTANCING
        cafeLocal=instanceMatrix*cafeLocal;
        cafeN=mat3(instanceMatrix)*cafeN;
      #endif
      cafePosition=(modelMatrix*cafeLocal).xyz;
      cafeNormal=normalize(mat3(modelMatrix)*cafeN);
      cafeTileUV=uv;
      cafeLamp=0.0;
      ${distant || luminous ? '' : `for(int i=0;i<16;i++) {
        vec3 d=cafePosition-cafeLamps[i].xyz;
        float pool=max(0.0,1.0-dot(d,d)/max(.001,cafeLamps[i].w*cafeLamps[i].w));
        cafeLamp+=pool*pool;
      }`}
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 cafePosition;
      varying vec3 cafeNormal;
      varying vec2 cafeTileUV;
      varying float cafeLamp;
      uniform vec3 cafeWindowDirection;
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec3 n=normalize(cafeNormal);
      if(!gl_FrontFacing)n=-n;
      vec3 windowDirection=normalize(cafeWindowDirection);
      float sun=max(0.0,dot(n,windowDirection));
      float sky=smoothstep(-.7,.9,n.y);
      vec3 illumination=vec3(.32,.34,.30)+sky*vec3(.12,.105,.075)+sun*vec3(.64,.51,.35);
      illumination+=min(cafeLamp,1.3)*vec3(.45,.225,.065);
      float tile=${atlas ? 'floor(cafeTileUV.x*4.0)+(3.0-floor(cafeTileUV.y*4.0))*4.0' : '-1.0'};
      vec2 tileUV=fract(cafeTileUV*4.0);
      float ceramic=1.0-step(.2,abs(tile));
      float brass=1.0-step(.2,abs(tile-5.0));
      float timber=1.0-step(.2,abs(tile-1.0));
      // A clear coat catches the same broad window on every white landing.
      vec3 eye=normalize(cameraPosition-cafePosition);
      vec3 halfLight=normalize(eye+windowDirection);
      float reflection=pow(max(0.0,dot(n,halfLight)),48.0);
      float broadReflection=pow(max(0.0,dot(n,halfLight)),7.0);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.91,.91,.84),ceramic*.25);
      float grain=sin(tileUV.y*103.0+sin(tileUV.x*13.0)*.8)*.025;
      grain*=1.0-smoothstep(1.6,4.0,fwidth(tileUV.y*103.0));
      diffuseColor.rgb*=1.0+timber*grain;
      ${luminous ? `diffuseColor.rgb*=vec3(1.0,.84,.57)*.95;` : `
      diffuseColor.rgb*=illumination*${distant ? '.58' : '1.0'};
      diffuseColor.rgb+=(ceramic*.27+brass*.18)*reflection*vec3(1.0,.89,.66);
      diffuseColor.rgb+=ceramic*broadReflection*vec3(.055,.052,.04);
      diffuseColor.rgb+=brass*pow(max(0.0,dot(n,halfLight)),11.0)*vec3(.08,.052,.014);
      ${polished ? 'diffuseColor.rgb+=pow(max(0.0,dot(n,halfLight)),22.0)*vec3(.12,.081,.034);' : ''}
      `}
    `);
    if(atlas)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        // Explicit LOD and a guard for its CEILING mip keep both trilinear
        // samples inside this cell. At level7 each 128px tile is one texel;
        // sampling its centre retains filtered detail without neighbour colours.
        vec2 cafeDx=dFdx(vMapUv)*512.0,cafeDy=dFdy(vMapUv)*512.0;
        float cafeLod=clamp(log2(max(1.0,max(length(cafeDx),length(cafeDy)))),0.0,7.0);
        float cafeGuard=exp2(ceil(cafeLod))/1024.0;
        vec2 cafeCell=floor(vMapUv*4.0)*.25;
        vec2 cafeSampleUV=clamp(vMapUv,cafeCell+vec2(cafeGuard),cafeCell+vec2(.25-cafeGuard));
        diffuseColor*=textureLod(map,cafeSampleUV,cafeLod);
      #endif
    `);
  };
  return material;
}

// Coffee deliberately has no atlas sampler: downsampled neighbouring green tiles
// cannot contaminate the liquid, and its reflections stay warm and restrained.
export function createCoffeeMaterial({volume = false} = {}) {
  const time={value:0};
  const material=new THREE.ShaderMaterial({
    side:THREE.DoubleSide,
    uniforms:{time},
    vertexShader:`
      varying vec3 coffeePoint;
      varying vec3 coffeeWorld;
      void main(){
        coffeePoint=position;
        coffeeWorld=(modelMatrix*vec4(position,1.0)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform float time;
      uniform vec3 cafeWindowDirection;
      varying vec3 coffeePoint;
      varying vec3 coffeeWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      void main(){
        vec2 p=coffeePoint.xz;
        float radius=length(p)/5.94;
        float angle=atan(p.y,p.x);
        float marbling=noise(p*.82+vec2(time*.018,-time*.012));
        float fine=noise(p*4.0+marbling*.7);
        vec3 coffee=mix(vec3(.041,.012,.004),vec3(.135,.047,.012),marbling*.72+fine*.10);
        ${volume ? `
          coffee*=.63+.22*smoothstep(-.5,.5,coffeePoint.y);
          coffee+=vec3(.028,.012,.003)*pow(max(0.0,cos(atan(coffeePoint.z,coffeePoint.x)+1.0)),12.0);
        ` : `
          // Irregular crema gathers at the meniscus, never a flat yellow disk.
          float cream=smoothstep(.77,.985,radius+(marbling-.5)*.16);
          float streak=sin(angle*8.0+radius*25.0+marbling*6.0-time*.08)*.5+.5;
          cream*=.48+.52*noise(p*2.6);
          cream+=smoothstep(.80,.97,streak)*smoothstep(.5,.95,radius)*.12;
          coffee=mix(coffee,vec3(.43,.215,.070),clamp(cream,0.0,.78));
          float ripple=sin(length(p-vec2(-2.2,-1.1))*8.5-time*3.2)*.018;
          vec3 n=normalize(vec3(-.035*sin(p.x*1.4+time),1.0,.03*cos(p.y*1.3-time)+ripple));
          vec3 eye=normalize(cameraPosition-coffeeWorld);
          vec3 reflected=reflect(-eye,n);
          float window=pow(max(0.0,dot(reflected,normalize(cafeWindowDirection))),35.0);
          // Broken window sheen reads as liquid without painting green reflections.
          coffee+=vec3(.24,.16,.065)*window*(.35+fine*.65);
          coffee+=vec3(.016,.009,.003)*pow(1.0-max(0.0,dot(eye,n)),4.0);
        `}
        gl_FragColor=vec4(coffee,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  material.uniforms.cafeWindowDirection=windowUniform(material);
  material.userData.time=time;
  return material;
}
