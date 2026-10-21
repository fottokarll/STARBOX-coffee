import * as THREE from 'three';
import {createRun,step} from './rules.js';
import {createUI,GAME_TITLE} from './ui.js';
import {createBarista,createContactShadow} from './barista.js';
import {createEnvironment} from './environment.js';
import {createCollectibles} from './collectibles.js';
import {CARD_IDS} from './rewards.js';

const SCALE=.24,BASE=.85;

export default async function start(p0) {
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
    notice:'',noticeLeft:0,reward:'',rewardPending:false,table:p0.table||[],gamepad:p0.input.pad||false};
  let preview=createRun(model.selected),environment,collectibles,sceneRecipe='';
  const courseCache=new Map();
  let cameraTheta=0,cameraY=0,visualTime=0,lastUI=0,landLeft=0,facing=1;
  let pathDirection=1,cameraDirection=1;
  let qualityScale=.85,slowFrames=0,lastScreenDraw='',uiDirty=true;
  let touchLeft=false,touchRight=false,touchJump=false,jumpPulse=false,pausePulse=false;
  let awarded=false,round=0;
  const heldActions=new Set(),lookTarget=new THREE.Vector3();
  const blitScene=new THREE.Scene(),blitCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,5);
  const blit=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({
    map:worldTarget.texture,depthTest:false,depthWrite:false,toneMapped:false}));
  blit.position.z=-1;blitScene.add(blit);

  function clearTouch() {touchLeft=false;touchRight=false;touchJump=false;jumpPulse=false;}
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
  function begin() {
    model.run=createRun(model.selected);model.run.character=model.selectedCharacter;
    model.reward='';model.rewardPending=false;model.notice='Biscuits reform. Green timber routes stay safe.';
    model.noticeLeft=5;awarded=false;round++;landLeft=0;facing=1;cameraTheta=0;cameraY=0;pathDirection=1;cameraDirection=1;
    setupCourse(model.selected);clearTouch();sound('start',.24);screen('game');
    p0.log('Coffee Rising: round started',model.selected,model.selectedCharacter,round);
    p0.log('Coffee Rising: screen countdown');
  }
  function action(id,down=true) {
    if(id==='left'){touchLeft=down;return;}
    if(id==='right'){touchRight=down;return;}
    if(id==='jump') {
      touchJump=down;if(down&&model.run?.state==='play')jumpPulse=true;return;
    }
    if(!down)return;
    if(id==='mute') {model.muted=!model.muted;if(model.muted)p0.sound.stopAll();uiDirty=true;return;}
    if(id==='titleStart'){screen('order');sound('land',.10);return;}
    if(id==='espresso'||id==='latte'){chooseRecipe(id);return;}
    if(id==='characterNext'){screen('character');sound('land',.10);return;}
    if(id==='boy'||id==='girl') {model.selectedCharacter=id;uiDirty=true;sound('land',.10);return;}
    if(id==='start'||id==='restart'){begin();return;}
    if(id==='pause'){pausePulse=true;uiDirty=true;return;}
    if(id==='order'){model.run=null;screen('order');return;}
    if(id==='back'){screen(model.screen==='character'?'order':'title');return;}
    if(id==='exit')p0.exit();
  }
  p0.on('keyup',event=>heldActions.delete(event.code));
  p0.on('keydown',event=>{
    const code=event.code;if(heldActions.has(code))return;heldActions.add(code);
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
    if(confirm&&model.run?.state==='play')jumpPulse=true;
    if(code==='KeyR')action('restart');
    if(code==='KeyP')action('pause');
    if(code==='KeyO'&&(model.run?.state==='results'||model.run?.state==='paused'))action('order');
  });
  p0.on('pointerdown',event=>{
    const id=ui.hit(event.x??p0.input.pointer.x,event.y??p0.input.pointer.y);if(id)action(id,true);
  });
  p0.on('pointerup',event=>{
    const id=ui.hit(event.x??p0.input.pointer.x,event.y??p0.input.pointer.y);
    if(id==='left'||id==='right'||id==='jump')action(id,false);else clearTouch();
  });
  p0.on('pad',active=>{model.gamepad=active;uiDirty=true;});
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
  p0.hud(`${GAME_TITLE}. CLIMB. COLLECT. BREW. Space: choose coffee and barista. A/D or arrows: circle the cup. Hold Space/W/Up: jump. Biscuits crack, collapse and return in 1.8 seconds; permanent green timber detours offer safer extra jumps. White ceramic has a gentle glide. Follow lanterns in both directions; golden forks hold recipe ingredients. R retry / P pause / M mute. Touch supported. Esc leaves; Enter chats. Free entry.`);
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
    const phone=p0.width/p0.height<.8;
    const fov=phone?72:52;
    if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    const radius=attract?17:phone?17.6:12.6;
    const cameraHeight=attract?cameraY+7.1:Math.max(3.25,cameraY+(phone?5.5:4.3));
    camera.position.set(Math.sin(cameraTheta)*radius*SCALE,BASE+cameraHeight*SCALE,Math.cos(cameraTheta)*radius*SCALE);
    if(active&&sample.onPlatform>=0)pathDirection=sample.platforms[sample.onPlatform].direction||1;
    cameraDirection+=(pathDirection-cameraDirection)*(1-Math.exp(-dt*6));
    const lookAngle=cameraTheta+cameraDirection*(phone?.23:.07);
    lookTarget.set(Math.sin(lookAngle)*2.65*SCALE,BASE+(cameraY+1.22)*SCALE,Math.cos(lookAngle)*2.65*SCALE);
    camera.lookAt(lookTarget);
    hero.visible=Boolean(active);
    barista.update(sample,{character:model.selectedCharacter,time:visualTime,dt,camera,facing,landLeft,
      width:p0.width,height:p0.height,light:environment.lightAt?.(sample.theta,sample.y)||0});
    landLeft=Math.max(0,landLeft-dt);
    contactShadow.update(sample,hero.visible);
    environment.update(sample,time,dt);collectibles.update(sample,time);
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
        p0.log('Coffee Rising: result',JSON.stringify(run.result));finishRewards(run);
      }
      uiDirty=true;
    }
  }
  function renderFrame() {
    const w=Math.max(1,Math.round(p0.width*qualityScale)),h=Math.max(1,Math.round(p0.height*qualityScale));
    if(worldTarget.width!==w||worldTarget.height!==h)worldTarget.setSize(w,h);
    renderer.autoClear=true;renderer.setRenderTarget(worldTarget);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(blitScene,blitCamera);
    renderer.autoClear=false;renderer.render(actorScene,camera);
    if(environment.foregroundScene)renderer.render(environment.foregroundScene,camera);
    ui.render(renderer);renderer.autoClear=true;
  }
  function tick(dt,time) {
    const safe=Math.min(dt,.1),run=model.run;
    if(model.screen==='game'&&run) {
      const keys=p0.input.keys;
      const left=keys.has('KeyA')||keys.has('ArrowLeft'),right=keys.has('KeyD')||keys.has('ArrowRight');
      const touchMove=Number(touchRight)-Number(touchLeft);
      const analog=p0.input.gamepad?.axes?.[0]||0;
      const move=touchMove||(Math.abs(analog)>.15?analog:Number(right)-Number(left));
      const jump=touchJump||keys.has('Space')||keys.has('KeyW')||keys.has('ArrowUp');
      step(run,{move,jump,jumpPressed:jumpPulse,pause:pausePulse},safe);
      jumpPulse=false;pausePulse=false;processEvents(run,time);
    }
    model.noticeLeft=Math.max(0,model.noticeLeft-safe);
    updateWorld(safe,time);
    if(dt>.065)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
    if(slowFrames>4&&qualityScale>.5){qualityScale=Math.max(.5,qualityScale*.8);slowFrames=0;}
    lastUI+=safe;
    if(uiDirty||lastUI>1/15||model.screen!==lastScreenDraw) {
      ui.draw(model);lastUI=0;uiDirty=false;lastScreenDraw=model.screen;
    }
    renderFrame();
  }
  updateWorld(0,0);ui.draw(model);
  p0.loading(.80,'lighting lanterns and warming the mug');
  const warmStart=performance.now();
  renderer.setRenderTarget(worldTarget);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  renderer.setRenderTarget(null);if(performance.now()-warmStart>800)qualityScale=.55;
  await renderer.compileAsync(blitScene,blitCamera);
  const wasVisible=hero.visible;hero.visible=true;
  await renderer.compileAsync(actorScene,camera);hero.visible=wasVisible;await ui.compile(renderer);
  if(environment.foregroundScene)await renderer.compileAsync(environment.foregroundScene,camera);
  renderFrame();p0.loading(1,'ready to brew');p0.loop(tick);
  p0.log(`${GAME_TITLE} ready: Milo + Mira / recovering biscuits / safe routes / free entry`);
  p0.log('Coffee Rising: screen title');
  p0.on('end',()=>{
    p0.sound.stopAll();
    for(const cached of courseCache.values()){cached.environment.dispose();cached.collectibles.dispose();}
    atlas.dispose();atlasBitmap.close();
    barista.dispose();contactShadow.dispose();
    worldTarget.dispose();blit.geometry.dispose();blit.material.dispose();ui.dispose();
  });
}
