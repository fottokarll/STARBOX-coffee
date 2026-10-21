import * as THREE from 'three';
import {createBarista} from './barista.js';
export default async function start(p0) {
  p0.controls.mode='none';p0.bodies.visible=false;p0.autoRender=false;
  p0.createRenderer({antialias:false,depth:false});p0.autoRender=false;
  const renderer=p0.renderer;renderer.setPixelRatio(1);
  const width=640,height=360;
  const target=new THREE.WebGLRenderTarget(320,180,{depthBuffer:true});
  target.depthTexture=new THREE.DepthTexture(320,180,THREE.UnsignedIntType);
  const output=new THREE.WebGLRenderTarget(width,height,{depthBuffer:false});
  const camera=new THREE.PerspectiveCamera(30,width/height,.025,32);
  camera.position.set(0,1.08,3.2);camera.lookAt(0,1.08,1.2);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x162a20);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.65,.7,.1),new THREE.MeshBasicMaterial({color:0x845f3f}));
  wall.position.set(0,1.08,1);scene.add(wall);
  const [bitmap,meta]=await Promise.all([
    new THREE.ImageBitmapLoader().loadAsync(p0.asset('assets/polish/milo.webp')),
    new THREE.FileLoader().setResponseType('json').loadAsync(p0.asset('assets/polish/milo.json'))
  ]);
  meta.characters.girl=meta.characters.boy;
  const actor=createBarista({bitmap,meta},target.depthTexture);
  const sample={theta:0,y:0,vTheta:0,vY:0,grounded:true,coffeeY:-3};
  actor.update(sample,{camera,width,height,character:'boy',time:0});
  const blitScene=new THREE.Scene(),blitCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,5);
  const blit=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:target.texture,depthWrite:false,depthTest:false}));
  blit.position.z=-1;blitScene.add(blit);
  const before=new Uint8Array(width*height*4),after=new Uint8Array(width*height*4);
  const counts={};
  function composite(withActor,destination) {
    renderer.autoClear=true;renderer.setRenderTarget(target);renderer.render(scene,camera);
    renderer.setRenderTarget(output);renderer.render(blitScene,blitCamera);
    if(withActor){renderer.autoClear=false;renderer.render(actor.scene,camera);renderer.autoClear=true;}
    renderer.readRenderTargetPixels(output,0,0,width,height,destination);
  }
  await renderer.compileAsync(actor.scene,camera);
  for(const [mode,z] of [['clear',-10],['behind',1],['inFront',1.45]]) {
    wall.position.z=z;
    composite(false,before);composite(true,after);
    let changed=0;
    for(let i=0;i<before.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>24)changed++;
    counts[mode]=changed;
  }
  const passed=counts.clear>500&&counts.behind>counts.clear*.95&&counts.inFront<counts.clear*.02;
  p0.log('DEPTH PROOF',JSON.stringify({passed,counts,nativeSize:[width,height],worldDepthSize:[320,180]}));
  p0.hud(`Sprite depth proof: ${passed?'PASS':'FAIL'}. Clear ${counts.clear}; behind ${counts.behind}; in front ${counts.inFront}.`);
  wall.position.z=1.45;wall.position.x=.35;
  p0.loop(()=>{
    renderer.autoClear=true;renderer.setRenderTarget(target);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(blitScene,blitCamera);
    renderer.autoClear=false;renderer.render(actor.scene,camera);renderer.autoClear=true;
  });
}
