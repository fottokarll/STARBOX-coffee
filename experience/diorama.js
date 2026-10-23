import * as THREE from 'three';

/** One inexpensive depth-aware composite. Sprites and UI render afterwards. */
export function createDioramaComposite(target,camera) {
  const uniforms={map:{value:target.texture},depthMap:{value:target.depthTexture},
    texel:{value:new THREE.Vector2()},planes:{value:new THREE.Vector2(camera.near,camera.far)},
    focusDepth:{value:3.5},focusA:{value:new THREE.Vector2(.5,.45)},focusB:{value:new THREE.Vector2(.5,.6)},
    bloom:{value:1},grade:{value:1},aa:{value:1}};
  const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,
    vertexShader:`varying vec2 screenUV;
      void main(){screenUV=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
    fragmentShader:`
      uniform sampler2D map;
      uniform sampler2D depthMap;
      uniform vec2 texel;
      uniform vec2 planes;
      uniform float focusDepth;
      uniform vec2 focusA;
      uniform vec2 focusB;
      uniform float bloom;
      uniform float grade;
      uniform float aa;
      varying vec2 screenUV;
      float focusMask(vec2 center){return 1.0-smoothstep(.82,1.2,length((screenUV-center)/vec2(.27,.19)));}
      float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
      void main(){
        vec3 color=texture2D(map,screenUV).rgb;
        float depth=texture2D(depthMap,screenUV).r;
        float distanceToCamera=planes.x*planes.y/(planes.y-depth*(planes.y-planes.x));
        float farScene=smoothstep(focusDepth+1.25,focusDepth+3.3,distanceToCamera);
        float protectedLane=max(focusMask(focusA),focusMask(focusB));
        float tilt=farScene*(1.0-protectedLane)*(.35+.65*smoothstep(.18,.5,abs(screenUV.y-.48)));
        vec2 offset=texel*(1.0+tilt*1.1);
        vec3 e=texture2D(map,screenUV+vec2(offset.x,0.)).rgb;
        vec3 w=texture2D(map,screenUV-vec2(offset.x,0.)).rgb;
        vec3 n=texture2D(map,screenUV+vec2(0.,offset.y)).rgb;
        vec3 so=texture2D(map,screenUV-vec2(0.,offset.y)).rgb;
        vec3 soft=(e+w+n+so)*.25;
        // Edge-aware AA, protecting the playable path.
        float range=max(max(luma(e),luma(w)),max(luma(n),luma(so)))-min(min(luma(e),luma(w)),min(luma(n),luma(so)));
        float edge=aa*smoothstep(.06,.22,range);
        color=mix(color,soft,max(tilt*.62,edge*.55));
        // Eight-tap wide highlight-only bloom, scaled for the mobile render target.
        vec2 r=texel*6.0;
        vec3 glow=max(texture2D(map,screenUV+vec2(r.x,0.)).rgb-.62,0.0)
                 +max(texture2D(map,screenUV-vec2(r.x,0.)).rgb-.62,0.0)
                 +max(texture2D(map,screenUV+vec2(0.,r.y)).rgb-.62,0.0)
                 +max(texture2D(map,screenUV-vec2(0.,r.y)).rgb-.62,0.0)
                 +max(texture2D(map,screenUV+r*.7).rgb-.62,0.0)
                 +max(texture2D(map,screenUV-r*.7).rgb-.62,0.0)
                 +max(texture2D(map,screenUV+vec2(r.x,-r.y)*.7).rgb-.62,0.0)
                 +max(texture2D(map,screenUV+vec2(-r.x,r.y)*.7).rgb-.62,0.0);
        color+=glow*.125*vec3(1.05,.78,.42)*bloom*(1.0-protectedLane*.5);
        vec3 halo=max(soft-vec3(.78),vec3(0.0));
        color+=halo*vec3(.065,.045,.022)*(1.0-protectedLane*.65);
        float l=luma(color);
        color=mix(vec3(l),color,1.0+.16*grade);
        color*=mix(vec3(1.0),vec3(1.05,1.0,.93),grade);
        vec2 q=(screenUV-.5)*vec2(1.0,1.15);
        color*=1.0-smoothstep(.30,.95,length(q))*.30*grade;
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`});
  const point=new THREE.Vector3(),viewPoint=new THREE.Vector3();
  function project(p,out) {point.copy(p).project(camera);out.set(point.x*.5+.5,point.y*.5+.5);}
  return {material,
    update(heroPoint,nextPoint,resolution){
      const w=resolution?.x||target.width,h=resolution?.y||target.height;
      uniforms.texel.value.set(1/w,1/h);
      uniforms.planes.value.set(camera.near,camera.far);
      camera.updateMatrixWorld();viewPoint.copy(heroPoint).applyMatrix4(camera.matrixWorldInverse);
      uniforms.focusDepth.value=Math.max(camera.near,-viewPoint.z);
      project(heroPoint,uniforms.focusA.value);project(nextPoint,uniforms.focusB.value);
    },
    setLook({bloom,grade,aa}={}){
      if(bloom!==undefined)uniforms.bloom.value=bloom?1:0;
      if(grade!==undefined)uniforms.grade.value=grade?1:0;
      if(aa!==undefined)uniforms.aa.value=aa?1:0;
    },dispose(){material.dispose();}};
}
