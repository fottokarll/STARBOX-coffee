import * as THREE from 'three';

/** Crisp pixel sprites share the world's sampled depth, rather than sitting over it. */
export function createBarista(assets, depthTexture) {
  const entries = {};
  for (const id of ['boy', 'girl']) {
    const source = id === 'boy' && assets.primary ? assets.primary : assets;
    const size = source.meta.gameplayAtlasSize || 320;
    const canvas = new OffscreenCanvas(size, size), ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; ctx.drawImage(source.bitmap, 0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    entries[id] = {texture, meta:source.meta, character:source.meta.characters[id]};
  }
  const uniforms = {
    atlas:{value:entries.boy.texture}, sceneDepth:{value:depthTexture},
    viewSize:{value:new THREE.Vector2(640,360)}, frameRect:{value:new THREE.Vector4()},
    anchor:{value:new THREE.Vector2(.5,0)}, flip:{value:1},
    texel:{value:new THREE.Vector2(1/320,1/320)}, warmth:{value:0}, bounce:{value:0}
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent:true, depthWrite:false, depthTest:false,
    vertexShader:`
      uniform vec4 frameRect;
      uniform vec2 anchor;
      uniform float flip;
      varying vec2 spriteUV;
      varying vec2 localUV;
      void main() {
        localUV=uv;
        spriteUV=frameRect.xy+vec2(flip>0.0?uv.x:1.0-uv.x,uv.y)*frameRect.zw;
        vec3 p=position;
        p.xy+=vec2(0.5)-anchor;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader:`
      uniform sampler2D atlas;
      uniform sampler2D sceneDepth;
      uniform vec2 viewSize;
      uniform vec2 texel;
      uniform float warmth;
      uniform float bounce;
      varying vec2 spriteUV;
      varying vec2 localUV;
      void main() {
        float worldDepth=texture2D(sceneDepth,gl_FragCoord.xy/viewSize).r;
        if(gl_FragCoord.z>worldDepth+0.000015) discard;
        vec4 pixel=texture2D(atlas,spriteUV);
        if(pixel.a<0.16) discard;
        float edge=1.0-min(texture2D(atlas,spriteUV+vec2(texel.x,0.0)).a,
                           texture2D(atlas,spriteUV+vec2(0.0,texel.y)).a);
        vec3 color=pixel.rgb*vec3(0.96,0.975,0.91);
        color+=vec3(0.13,0.085,0.025)*edge*(0.25+warmth);
        color+=vec3(0.045,0.025,0.008)*(1.0-localUV.y)*bounce;
        color*=1.0+warmth*0.07;
        gl_FragColor=vec4(color,pixel.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const hero=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
  hero.name='Depth-tested pixel barista';hero.frustumCulled=false;
  const scene=new THREE.Scene(),root=new THREE.Group();
  root.scale.setScalar(.24);root.position.y=.85;root.add(hero);scene.add(root);
  let runCycle=0;
  function update(sample, options) {
    const {character='boy',time=0,dt=0,camera,facing=1,landLeft=0,width=640,height=360,light=0}=options;
    const entry=entries[character],meta=entry.meta;
    const animations=entry.character.animations||meta.animations;
    const speed=Math.abs(sample.vTheta);
    let action=sample.result?.success?'victory':landLeft>0&&sample.grounded?'land':
      !sample.grounded?(sample.vY>1.5?'jump':sample.vY>-.8&&animations.apex?'apex':'fall'):
      speed>.12?'run':'idle';
    const animation=animations[action];
    if(action==='run')runCycle+=dt*(animation.fps||10)*Math.max(.55,speed/1.2);
    const clock=action==='run'?runCycle:action==='land'?Math.max(0,.18-landLeft)*(animation.fps||10):time*(animation.fps||1);
    const frame=entry.character.frames[animation.frames[Math.floor(clock)%animation.frames.length]];
    const [x,y,w,h]=frame.rect,[iw,ih]=meta.imageSize;
    uniforms.atlas.value=entry.texture;
    uniforms.frameRect.value.set(x/iw,1-(y+h)/ih,w/iw,h/ih);
    uniforms.anchor.value.set(facing<0?1-frame.anchor[0]:frame.anchor[0],1-frame.anchor[1]);
    uniforms.flip.value=facing;
    uniforms.texel.value.set(1/entry.texture.image.width,1/entry.texture.image.height);
    uniforms.viewSize.value.set(width,height);
    uniforms.warmth.value=light;
    uniforms.bounce.value=Math.max(0,1-(sample.y-sample.coffeeY)/5);
    const size=1.62/meta.nominalBodyHeight;
    hero.position.set(Math.sin(sample.theta)*5,sample.y,Math.cos(sample.theta)*5);
    hero.scale.set(w*size,h*size,1);
    hero.quaternion.copy(camera.quaternion);
  }
  return {scene,root,hero,update,dispose(){
    hero.geometry.dispose();material.dispose();
    for(const entry of Object.values(entries))entry.texture.dispose();
  }};
}

export function createContactShadow(world) {
  const canvas=new OffscreenCanvas(64,64),ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(32,32,2,32,32,31);
  gradient.addColorStop(0,'rgba(35,22,12,0.7)');
  gradient.addColorStop(.4,'rgba(35,22,12,0.36)');gradient.addColorStop(1,'rgba(35,22,12,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas);texture.generateMipmaps=false;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
  shadow.rotation.x=-Math.PI/2;shadow.renderOrder=2;world.add(shadow);
  return {object:shadow,update(run,visible){
    const floor=run.platforms.filter(p=>!p.collapsed&&p.y<=run.y+.025&&
      Math.abs(Math.atan2(Math.sin(run.theta-p.angle),Math.cos(run.theta-p.angle)))<p.halfWidth+.01)
      .sort((a,b)=>b.y-a.y)[0];
    const gap=floor?run.y-floor.y:10;
    shadow.visible=Boolean(visible&&floor&&gap<3);
    if(!shadow.visible)return;
    shadow.position.set(Math.sin(run.theta)*5,floor.y+.018,Math.cos(run.theta)*5);
    shadow.scale.set(.90+gap*.17,.62+gap*.13,1);
    material.opacity=Math.max(.08,.72-gap*.18);
  },dispose(){world.remove(shadow);shadow.geometry.dispose();material.dispose();texture.dispose();}};
}
