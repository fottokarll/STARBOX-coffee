import * as THREE from 'three';
import {createRun,step} from './rules.js';
import {createUI,GAME_TITLE} from './ui.js';
import {createBarista,createContactShadow} from './barista.js';
import {createEnvironment} from './environment.js';
import {createCollectibles} from './collectibles.js';
import {readRecords,keepRecord} from './records.js';
import {CARD_IDS} from './rewards.js';
import {createPointerControls} from './pointer-controls.js';
import {createInputLatch} from './input-latch.js';
import {createDioramaComposite} from './diorama.js';
import {cameraFrame} from './camera-layout.js';

const SCALE=.24,BASE=.85;
export const RELEASE_VERSION='2.4.1';

export default async function start(p0,{observe=null}={}) {
  p0.loading(.03,'opening the lantern cafe');
  p0.controls.mode='none';p0.controls.vertical=false;p0.bodies.visible=false;
  for(const id of p0.players.keys()) {const body=p0.bodies.get(id);if(body)body.visible=false;}
  p0.createRenderer({antialias:false,alpha:true,depth:false,stencil:false});
  const renderer=p0.renderer,scene=p0.scene,camera=p0.camera;
  p0.autoRender=false;
  const capResolution=()=>renderer.setPixelRatio(Math.min(1,p0.pixelRatio||1));
  capResolution();p0.on('resize',capResolution);
  for(const child of [...scene.children])if(child.isLight)scene.remove(child);
  scene.background=new THREE.Color(0x28211c);
  scene.fog=new THREE.Fog(0x28211c,8,20);
  camera.fov=52;camera.near=.025;camera.far=32;camera.updateProjectionMatrix();
  const world=new THREE.Group();world.scale.setScalar(SCALE);world.position.y=BASE;scene.add(world);
  const loader=new THREE.ImageBitmapLoader();
  p0.loading(.12,'welcoming your baristas');
  const [ui,atlasBitmap]=await Promise.all([
    createUI(p0),loader.setOptions({imageOrientation:'flipY'}).loadAsync(p0.asset('assets/v2/cafe-atlas.png'))
  ]);
  const atlas=new THREE.Texture(atlasBitmap);atlas.needsUpdate=true;
  atlas.minFilter=THREE.LinearFilter;atlas.magFilter=THREE.LinearFilter;
  atlas.generateMipmaps=false;atlas.colorSpace=THREE.SRGBColorSpace;
  const worldTarget=new THREE.WebGLRenderTarget(4,4,{depthBuffer:true,stencilBuffer:false});
  worldTarget.depthTexture=new THREE.DepthTexture(4,4,THREE.UnsignedIntType);
  const barista=createBarista(ui.characterAssets,worldTarget.depthTexture);
  const actorScene=barista.scene,hero=barista.hero;
  const contactShadow=createContactShadow(world);
  const model={screen:'title',selected:'latte',selectedCharacter:'boy',run:null,muted:false,
    bests:readRecords(p0.saved),notice:'',noticeLeft:0,reward:'',rewardPending:false,table:p0.table||[],gamepad:p0.input.pad||false,
    pressed:{left:false,right:false,jump:false,restart:false}};
  let preview=createRun(model.selected),environment,collectibles,sceneRecipe='';
  const courseCache=new Map();
  let cameraTheta=0,cameraY=0,visualTime=0,lastUI=0,landLeft=0,facing=1;
  let lastPoseLog=-1;
  let pathDirection=1,cameraDirection=1;
  let qualityScale=.85,slowFrames=0,steadyFrames=0,lastScreenDraw='',uiDirty=true;
  let touchLeft=false,touchRight=false,touchJump=false,jumpPulse=false,pausePulse=false;
  let awarded=false,round=0;
  const heldActions=new Set(),lookTarget=new THREE.Vector3();
  const inputLatch=createInputLatch(),focusPoint=new THREE.Vector3(),landingPoint=new THREE.Vector3();
  let lastPointerButtons=0,lastTickAt=performance.now();
  const blitScene=new THREE.Scene(),blitCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,5);
  const composite=createDioramaComposite(worldTarget,camera);
  const blit=new THREE.Mesh(new THREE.PlaneGeometry(2,2),composite.material);
  blit.position.z=-1;blitScene.add(blit);

  const pointers=createPointerControls((x,y)=>ui.hit(x,y),action);
  function clearTouch() {
    pointers.clear();touchLeft=false;touchRight=false;touchJump=false;jumpPulse=false;
    for(const id of Object.keys(model.pressed))model.pressed[id]=false;
    uiDirty=true;
  }
  function padJumpDown() {
    const b=p0.input.gamepad?.buttons;return (b?.[0]||0)>.5||(b?.[7]||0)>.3;
  }
  function interrupt() {
    clearTouch();heldActions.clear();inputLatch.capture(p0.input.keys,padJumpDown());
    lastPointerButtons=p0.input.pointer.buttons||0;
    if(model.run?.state==='play')pausePulse=true;
  }
  function sound(name,volume=.23,rate=1) {
    if(!model.muted)p0.sound.play(`assets/${name}.wav`,{volume,rate});
  }
  function screen(name) {
    model.screen=name;uiDirty=true;clearTouch();
    p0.log('Coffee Rising: screen',name);
  }
  function setupCourse(recipe) {
    if(sceneRecipe===recipe)return;
    if(environment)environment.root.visible=false;
    if(collectibles)collectibles.root.visible=false;
    let cached=courseCache.get(recipe);
    if(!cached) {
      const data=createRun(recipe);
      cached={preview:data,environment:createEnvironment(world,data,{atlas,camera}),
        collectibles:createCollectibles(world,data,{camera})};
      courseCache.set(recipe,cached);
    }
    // Keep both recipe materials alive, so changing orders never recompiles shaders.
    ({preview,environment,collectibles}=cached);sceneRecipe=recipe;
    environment.root.visible=true;collectibles.root.visible=true;
    p0.log('Coffee Rising: course',JSON.stringify({recipe,top:preview.top,platforms:preview.platforms.length,
      scale:SCALE,base:BASE,finish:preview.finishPlatform,switchbacks:preview.forks.length}));
  }
  p0.loading(.45,'building warm wooden switchbacks');
  setupCourse(model.selected);
  function chooseRecipe(recipe) {
    model.selected=recipe;setupCourse(recipe);uiDirty=true;sound('land',.10);
  }
  function begin(quick=false) {
    inputLatch.capture(p0.input.keys,padJumpDown());pausePulse=false;
    model.run=createRun(model.selected);model.run.character=model.selectedCharacter;
    if(quick)model.run.countdown=.35;
    model.reward='';model.rewardPending=false;model.notice='White ceramic slides. Brake before the edge.';
    model.noticeLeft=5;awarded=false;round++;landLeft=0;facing=1;cameraTheta=0;cameraY=0;pathDirection=1;cameraDirection=1;
    setupCourse(model.selected);lastPoseLog=-1;clearTouch();sound('start',.24);screen('game');
    p0.log('Coffee Rising: round started',model.selected,model.selectedCharacter,round);
    p0.log('Coffee Rising: screen countdown');
  }
  function action(id,down=true) {
    if(id==='left'||id==='right'||id==='jump') {
      if(id==='left')touchLeft=down;
      if(id==='right')touchRight=down;
      if(id==='jump') {touchJump=down;if(down&&model.run?.state==='play')jumpPulse=true;}
      model.pressed[id]=down;uiDirty=true;
      p0.log('Coffee Rising: input',JSON.stringify({move:Number(touchRight)-Number(touchLeft),jump:touchJump}));
      return;
    }
    if(!down)return;
    if(id==='mute') {model.muted=!model.muted;p0.log('Coffee Rising: mute',model.muted);if(model.muted)p0.sound.stopAll();uiDirty=true;return;}
    if(id==='titleStart'){screen('order');sound('land',.10);return;}
    if(id==='espresso'||id==='latte'){chooseRecipe(id);return;}
    if(id==='characterNext'){screen('character');sound('land',.10);return;}
    if(id==='boy'||id==='girl') {model.selectedCharacter=id;uiDirty=true;sound('land',.10);return;}
    if(id==='start'||id==='restart'){begin(id==='restart');return;}
    if(id==='pause'){pausePulse=true;uiDirty=true;return;}
    if(id==='order'){model.run=null;screen('order');return;}
    if(id==='back'){screen(model.screen==='character'?'order':'title');return;}
    if(id==='exit')p0.exit();
  }
  p0.on('keyup',event=>{heldActions.delete(event.code);inputLatch.release(event.code);});
  p0.on('keydown',event=>{
    const code=event.code;if(event.repeat)return;heldActions.add(code);
    if(code==='KeyM'){action('mute');return;}
    const confirm=code==='Space'||code==='KeyW'||code==='ArrowUp';
    if(model.screen==='title') {if(confirm)action('titleStart');return;}
    if(model.screen==='order') {
      if(code==='Digit1'||code==='ArrowLeft')action('espresso');
      if(code==='Digit2'||code==='ArrowRight')action('latte');
      if(confirm)action('characterNext');if(code==='Backspace')action('back');return;
    }
    if(model.screen==='character') {
      if(code==='Digit1'||code==='ArrowLeft')action('boy');
      if(code==='Digit2'||code==='ArrowRight')action('girl');
      if(confirm)action('start');if(code==='Backspace')action('back');return;
    }
    if(code==='Space'&&model.run?.state==='results'&&!model.run.result?.success) {action('restart');return;}
    if(confirm&&model.run?.state==='play')jumpPulse=true;
    if(code==='KeyR')action('restart');
    if(code==='KeyP')action('pause');
    if(code==='KeyO'&&(model.run?.state==='results'||model.run?.state==='paused'))action('order');
  });
  for(const [event,handle] of [['pointerdown',pointers.down],['pointermove',pointers.move],['pointerup',pointers.up]])
    p0.on(event,e=>{lastPointerButtons=e.buttons||0;handle(e);});
  p0.on('resize',interrupt);
  p0.on('pointerlock',locked=>{if(!locked)interrupt();});
  p0.on('pad',active=>{if(model.gamepad&&!active)interrupt();model.gamepad=active;uiDirty=true;});
  p0.on('table',table=>{model.table=table;uiDirty=true;});
  p0.on('reward',reward=>{
    if(reward.kind==='item') {
      model.rewardPending=false;
      model.reward=reward.ok?'Your Perfect Coffee card is in your collection.':reward.reason||'This card is already in your collection.';
    } else if(reward.kind==='score'&&!model.run?.result?.perfect) {
      model.rewardPending=false;model.reward=reward.ok?'Your weekly score is saved.':reward.reason||'Your drink is ready.';
    } else if(reward.kind==='score'&&reward.reason)model.reward=reward.reason;
    uiDirty=true;
  });
  p0.hud(`${GAME_TITLE}. A/D or arrows: move. Hold Space/W/Up: jump; release between jumps. Touch: slide arrows + UP. Pad: stick + A. White ceramic slides. Biscuits reform in 1.8s; timber stays solid. Follow BEAN signs for your recipe; STAR/RETURN paths are optional. Space after a spill: quick retry. R retry / P pause / M mute. Esc leave / Enter chat. Free play.`);
  function updateWorld(dt,time) {
    visualTime+=dt;
    const active=model.screen==='game'&&model.run;
    const sample=active?model.run:preview;
    const attract=!active;
    let theta=sample.theta,y=sample.y;
    if(attract){theta=.7+Math.sin(time*.11)*.7;y=sample.top*.31+Math.sin(time*.09)*.6;}
    if(Math.abs(sample.vTheta)>.08)facing=sample.vTheta<0?-1:1;
    cameraTheta+=(theta-cameraTheta)*(1-Math.exp(-dt*8));
    cameraY+=(y-cameraY)*(1-Math.exp(-dt*11));
    if(attract&&dt===0){cameraTheta=theta;cameraY=y;}
    if(active&&sample.onPlatform>=0)pathDirection=sample.platforms[sample.onPlatform].direction||1;
    cameraDirection+=(pathDirection-cameraDirection)*(1-Math.exp(-dt*6));
    const frame=cameraFrame({top:sample.top,theta:cameraTheta,y:cameraY,direction:cameraDirection,
      attract,width:p0.width,height:p0.height});
    if(camera.fov!==frame.fov){camera.fov=frame.fov;camera.updateProjectionMatrix();}
    camera.position.set(frame.position.x*SCALE,BASE+frame.position.y*SCALE,frame.position.z*SCALE);
    lookTarget.set(frame.target.x*SCALE,BASE+frame.target.y*SCALE,frame.target.z*SCALE);
    camera.lookAt(lookTarget);
    focusPoint.set(Math.sin(theta)*5*SCALE,BASE+(y+.8)*SCALE,Math.cos(theta)*5*SCALE);
    const path=sample.perfectPath,index=path.indexOf(sample.onPlatform);
    const next=sample.platforms[path[Math.min(path.length-1,Math.max(0,index)+1)]];
    landingPoint.set(Math.sin(next.angle)*5*SCALE,BASE+(next.y+.3)*SCALE,Math.cos(next.angle)*5*SCALE);
    hero.visible=Boolean(active);
    barista.update(sample,{character:model.selectedCharacter,time:visualTime,dt,camera,facing,landLeft,
      width:p0.width,height:p0.height,light:environment.lightAt?.(sample.theta,sample.y)||0});
    landLeft=Math.max(0,landLeft-dt);
    contactShadow.update(sample,hero.visible);
    environment.update(sample,time,dt,{theta:cameraTheta});collectibles.update(sample,time,{windowAngle:cameraTheta*.84});
    if(active) {
      p0.me.position.set(hero.position.x*SCALE,BASE+(sample.y+.7)*SCALE,hero.position.z*SCALE);
      p0.me.yaw=sample.theta;
    }
  }
  function finishRewards(run) {
    if(awarded||!run.result?.success)return;
    awarded=true;model.rewardPending=true;p0.score(run.result.score);p0.win();
    if(run.result.perfect&&CARD_IDS[run.recipe])p0.items.give(CARD_IDS[run.recipe]);
    if(run.result.perfect&&!CARD_IDS[run.recipe]){model.rewardPending=false;model.reward='Perfect Coffee. Every ingredient, beautifully brewed.';}
  }
  function processEvents(run,time) {
    for(const event of run.events) {
      if(event.type==='go'){p0.log('Coffee Rising: GO');sound('start',.15,1.25);}
      if(event.type==='jump'){p0.log('Coffee Rising: jump',JSON.stringify(event));sound('jump',.14);}
      if(event.type==='land') {
        landLeft=.18;p0.log('Coffee Rising: land',JSON.stringify(event));sound('land',.10);
      }
      if(event.type==='collect') {
        collectibles.collect(event.id,time);sound('collect',.22,event.kind==='star'?1.4:1+run.collected.bean*.035);
        model.notice=event.kind==='star'?'+ GOLDEN CAFE STAR':event.kind==='milk'?'+ MILK DROP':'+ COFFEE BEAN';
        model.noticeLeft=1.1;p0.log('Coffee Rising: collect',JSON.stringify({id:event.id,kind:event.kind}));
        if(run.collected.bean===run.required.bean&&run.collected.milk===run.required.milk) {
          model.notice='Recipe complete. Reach the star gate!';model.noticeLeft=2;sound('perfect',.17,1.2);
        }
      }
      if(event.type==='crumbleStart'){model.notice='Biscuit cracking. Jump now!';model.noticeLeft=.8;}
      if(event.type==='reform') {
        sound('land',.06,1.6);
        if(Math.abs(run.y-run.platforms[event.platform].y)<2.4) {
          model.notice='Fresh biscuit. Route restored.';model.noticeLeft=1.2;
        }
      }
      if(event.type==='crumble'||event.type==='collapse')sound('land',event.type==='collapse'?.16:.09,.6);
      if(event.type==='crumbleStart'||event.type==='crumble'||event.type==='collapse'||event.type==='reform') {
        p0.log('Coffee Rising: '+event.type,JSON.stringify({platform:event.platform}));
      }
      if(event.type==='warning')sound('warning',.11);
      if(event.type==='paused'||event.type==='play') {
        clearTouch();p0.log('Coffee Rising: screen',event.type==='paused'?'pause':'play');
      }
      if(event.type==='finish'||event.type==='fail') {
        clearTouch();sound(event.type==='finish'?'perfect':'fail',.25);
        model.bests=keepRecord(model.bests,run.result);
        p0.save({...p0.saved,starbox:{version:1,bests:model.bests}}).catch(()=>{});
        p0.log('Coffee Rising: result',JSON.stringify(run.result));finishRewards(run);
      }
      if(event.type!=='contact')uiDirty=true;
    }
  }
  function renderFrame() {
    const w=Math.max(1,Math.round(p0.width*qualityScale)),h=Math.max(1,Math.round(p0.height*qualityScale));
    if(worldTarget.width!==w||worldTarget.height!==h)worldTarget.setSize(w,h);
    composite.update(focusPoint,landingPoint);
    renderer.autoClear=true;renderer.setRenderTarget(worldTarget);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(blitScene,blitCamera);
    renderer.autoClear=false;renderer.render(actorScene,camera);
    if(environment.foregroundScene)renderer.render(environment.foregroundScene,camera);
    ui.render(renderer);renderer.autoClear=true;
  }
  function tick(dt,time) {
    const now=performance.now(),wallGap=now-lastTickAt;lastTickAt=now;
    // The SDK consumes shell blur by clearing input state; it emits no blur or
    // pointercancel event. Observe that reset without treating a finger's UP
    // (buttons=0 while another thumb remains down) as a global release.
    const lostKey=[...heldActions].some(code=>!p0.input.keys.has(code));
    if(wallGap>3000||lastPointerButtons!==0&&p0.input.pointer.buttons===0||lostKey)interrupt();
    const safe=Math.min(dt,.1),run=model.run;
    if(model.screen==='game'&&run) {
      const keys=inputLatch.read(p0.input.keys,padJumpDown());
      const left=keys.down('KeyA')||keys.down('ArrowLeft'),right=keys.down('KeyD')||keys.down('ArrowRight');
      const touchMove=Number(touchRight)-Number(touchLeft);
      const analog=p0.input.gamepad?.axes?.[0]||0;
      const move=touchMove||(Math.abs(analog)>.15?analog:Number(right)-Number(left));
      const jump=touchJump||keys.padJump||keys.down('Space')||keys.down('KeyW')||keys.down('ArrowUp');
      model.pressed.left=touchLeft||left||analog<-.15;
      model.pressed.right=touchRight||right||analog>.15;model.pressed.jump=jump;
      step(run,{move,jump,jumpPressed:jumpPulse,pause:pausePulse},safe);
      jumpPulse=false;pausePulse=false;processEvents(run,time);
      // Read-only diagnostics for control/recovery reports; never drive gameplay.
      if(run.state==='play'&&run.elapsed-lastPoseLog>=.75) {
        lastPoseLog=run.elapsed;
        p0.log('Coffee Rising: pose',JSON.stringify({elapsed:run.elapsed,theta:run.theta,y:run.y,
          vTheta:run.vTheta,vY:run.vY,grounded:run.grounded,onPlatform:run.onPlatform,
          move,jump,coffeeY:run.coffeeY}));
      }
    }
    model.noticeLeft=Math.max(0,model.noticeLeft-safe);
    updateWorld(safe,time);
    if(dt>.065)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
    steadyFrames=dt<.030?steadyFrames+1:0;
    if(steadyFrames>120 && qualityScale<.90){qualityScale=Math.min(.90,qualityScale+.05);steadyFrames=0;}
    if(slowFrames>4&&qualityScale>.5){qualityScale=Math.max(.5,qualityScale*.8);slowFrames=0;}
    lastUI+=safe;
    if(uiDirty||lastUI>1/15||model.screen!==lastScreenDraw) {
      ui.draw(model);lastUI=0;uiDirty=false;lastScreenDraw=model.screen;
    }
    renderFrame();
    if(observe&&model.run) {
      const r=model.run,b=r.platforms[6],best=model.bests[r.recipe];
      // Primitives and new arrays only; the optional QA observer cannot edit a run.
      observe([r.recipe,r.state,r.elapsed,r.theta,r.y,r.vTheta,r.vY,r.grounded,r.onPlatform,
        r.ingredients.reduce((mask,i,index)=>i.collected?mask|(1<<index):mask,0),
        r.collected.bean,r.collected.milk,r.bonusStars,r.coffeeY,r.bestHeight,qualityScale,
        r.platforms.filter(p=>p.collapsed).map(p=>p.id),b?.crumbleTimer,b?.regenerateTimer,
        r.result?.success??null,r.result?.score??0,model.rewardPending,model.reward.slice(0,80),
        [best.progress,best.height,best.time],r.result?.quality??null]);
    }
  }
  updateWorld(0,0);ui.draw(model);
  p0.loading(.80,'lighting lanterns and warming the mug');
  const warmStart=performance.now();
  renderer.setRenderTarget(worldTarget);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  renderer.setRenderTarget(null);if(performance.now()-warmStart>800)qualityScale=.55;
  p0.loading(.86,'setting your table');
  await renderer.compileAsync(blitScene,blitCamera);
  p0.loading(.90,'welcoming your baristas');
  const wasVisible=hero.visible;hero.visible=true;
  await renderer.compileAsync(actorScene,camera);hero.visible=wasVisible;
  p0.loading(.94,'one more moment');await ui.compile(renderer);
  p0.loading(.97,'ready to brew');
  if(environment.foregroundScene)await renderer.compileAsync(environment.foregroundScene,camera);
  renderFrame();
  // Allow the final loading status to reach the shell before start returns.
  await new Promise(resolve=>setTimeout(resolve,150));
  p0.loading(1,'ready to brew');await new Promise(resolve=>setTimeout(resolve,0));lastTickAt=performance.now();p0.loop(tick);
  p0.log(`${GAME_TITLE} ${RELEASE_VERSION} ready: Milo + Mira / recovering biscuits / safe routes / free entry`);
  p0.log('Coffee Rising: screen title');
  p0.on('end',()=>{
    clearTouch();heldActions.clear();
    p0.sound.stopAll();
    for(const cached of courseCache.values()){cached.environment.dispose();cached.collectibles.dispose();}
    atlas.dispose();atlasBitmap.close();
    barista.dispose();contactShadow.dispose();
    worldTarget.dispose();blit.geometry.dispose();composite.dispose();ui.dispose();
  });
}
