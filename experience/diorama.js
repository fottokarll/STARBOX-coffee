import * as THREE from 'three';

/** One inexpensive depth-aware composite. Sprites and UI render afterwards. */
export function createDioramaComposite(target,camera) {
  const uniforms={map:{value:target.texture},depthMap:{value:target.depthTexture},
    texel:{value:new THREE.Vector2()},planes:{value:new THREE.Vector2(camera.near,camera.far)},
    focusDepth:{value:3.5},focusA:{value:new THREE.Vector2(.5,.45)},focusB:{value:new THREE.Vector2(.5,.6)}};
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
      varying vec2 screenUV;
      float focusMask(vec2 center){return 1.0-smoothstep(.82,1.2,length((screenUV-center)/vec2(.27,.19)));}
      void main(){
        vec3 color=texture2D(map,screenUV).rgb;
        float depth=texture2D(depthMap,screenUV).r;
        float distanceToCamera=planes.x*planes.y/(planes.y-depth*(planes.y-planes.x));
        float farScene=smoothstep(focusDepth+1.25,focusDepth+3.3,distanceToCamera);
        float protectedLane=max(focusMask(focusA),focusMask(focusB));
        float tilt=farScene*(1.0-protectedLane)*(.35+.65*smoothstep(.18,.5,abs(screenUV.y-.48)));
        vec2 offset=texel*(1.0+tilt*1.1);
        vec3 soft=(texture2D(map,screenUV+vec2(offset.x,0.)).rgb+
          texture2D(map,screenUV-vec2(offset.x,0.)).rgb+
          texture2D(map,screenUV+vec2(0.,offset.y)).rgb+
          texture2D(map,screenUV-vec2(0.,offset.y)).rgb)*.25;
        color=mix(color,soft,tilt*.62);
        // Highlight-only warm halation: no full-screen blur or extra render pass.
        vec3 halo=max(soft-vec3(.78),vec3(0.0));
        color+=halo*vec3(.065,.045,.022)*(1.0-protectedLane*.65);
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`});
  const point=new THREE.Vector3(),viewPoint=new THREE.Vector3();
  function project(p,out) {point.copy(p).project(camera);out.set(point.x*.5+.5,point.y*.5+.5);}
  return {material,update(heroPoint,nextPoint){
    uniforms.texel.value.set(1/target.width,1/target.height);
    uniforms.planes.value.set(camera.near,camera.far);
    camera.updateMatrixWorld();viewPoint.copy(heroPoint).applyMatrix4(camera.matrixWorldInverse);
    uniforms.focusDepth.value=Math.max(camera.near,-viewPoint.z);
    project(heroPoint,uniforms.focusA.value);project(nextPoint,uniforms.focusB.value);
  },dispose(){material.dispose();}};
}
