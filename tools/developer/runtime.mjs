import * as THREE from 'three';
import {RECIPES,PHYSICS} from './rules.js';
import {coffee,setCoffeeMode,developerCoffeeY,checkpoints,restoreCheckpoint,snapshot,blockedSideEffects} from './developer-session.js';

/** All code in this module is excluded from the public experience tree and ZIP. */
export function createDeveloper(p0,{getModel,begin,chooseRecipe,clearTouch,markDirty}) {
  const canvas=new OffscreenCanvas(Math.max(1,p0.width),Math.max(1,p0.height)),ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.position.z=-1;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,5);scene.add(mesh);
  let expanded=true,flight=false,index=0,lastRun=null,lastLog=-1,buttons=[],inspection=0;
  function current(){return getModel().run;}
  function section(){const run=current();return run?checkpoints(run):[];}
  function inspect(detail=false){const data=snapshot(current(),{checkpoint:section()[index]?.id||0,flight,blocked:blockedSideEffects});
    const {biscuits,ingredients,...summary}=data,round=(_key,value)=>typeof value==='number'?Math.round(value*1000)/1000:value;
    const text=JSON.stringify({...summary,serial:++inspection},round);
    if(text.length+16>400)throw new Error('Private tester status exceeds documented HUD limit');
    p0.hud('STARBOX_PRIVATE '+text);
    p0.log('STARBOX PRIVATE DEVELOPER',text);
    if(detail) {
      for(let i=0;i<(biscuits||[]).length;i+=3)p0.log('STARBOX PRIVATE BISCUITS',JSON.stringify(biscuits.slice(i,i+3),round));
      for(let i=0;i<(ingredients||[]).length;i+=4)p0.log('STARBOX PRIVATE PICKUPS',JSON.stringify(ingredients.slice(i,i+4).map(item=>[item.id,item.kind,item.platform,item.collected])));
    }
    return data;}
  function ensureRun(run) {
    if(lastRun===run)return;
    lastRun=run;index=0;lastLog=-1;flight=false;
    coffee.mode='frozen';coffee.y=-3;coffee.elapsed=0;
  }
  function navigate(delta) {
    const run=current();if(!run)return;
    const points=section();index=(index+delta+points.length)%points.length;
    restoreCheckpoint(run,points[index].id);clearTouch();markDirty();inspect();
  }
  function action(id,down=true) {
    if(!String(id).startsWith('developer:'))return false;
    if(!down)return true;
    const command=id.slice(10),run=current();
    if(command==='panel')expanded=!expanded;
    if(command==='coffee')setCoffeeMode(({frozen:'disabled',disabled:'rising',rising:'frozen'})[coffee.mode],run,RECIPES[run?.recipe||getModel().selected].rise);
    if(command==='previous')navigate(-1);
    if(command==='next')navigate(1);
    if(command==='restart'&&run){restoreCheckpoint(run,section()[index].id,{resetSection:true});clearTouch();}
    if(command==='flight') {flight=!flight;if(run){run.vTheta=0;run.vY=0;}}
    if(command==='espresso'||command==='latte'){chooseRecipe(command);getModel().selectedCharacter='boy';begin();ensureRun(current());}
    if(command==='inspect')inspect(true);
    markDirty();return true;
  }
  const keys={F2:'panel',KeyC:'coffee',BracketLeft:'previous',BracketRight:'next',KeyT:'restart',
    KeyG:'flight',Digit1:'espresso',Digit2:'latte',KeyI:'inspect'};
  function key(code){return keys[code]?action('developer:'+keys[code]):false;}
  function step(run,input,dt,ordinaryStep) {
    ensureRun(run);
    if(flight&&run.state==='play'&&!input.pause) {
      const vertical=Number(p0.input.keys.has('KeyE'))-Number(p0.input.keys.has('KeyQ'));
      run.elapsed+=dt;run.theta+=input.move*PHYSICS.maxSpeed*dt;run.y=Math.max(-4,Math.min(run.top+4,run.y+vertical*6*dt));
      run.vTheta=input.move*PHYSICS.maxSpeed;run.vY=vertical*6;run.grounded=false;run.onPlatform=-1;run.events=[];
      run.coffeeY=developerCoffeeY(run,RECIPES[run.recipe].rise);
      run.progress=Math.max(0,Math.min(1,run.y/run.top));run.bestHeight=Math.max(run.bestHeight,run.y);
    } else ordinaryStep(run,input,dt);
    // Falling never ends practice; return to the last inspected section.
    if(run.y< -5)restoreCheckpoint(run,section()[index].id);
    if(run.events.some(event=>event.type==='land')) {
      const points=section();
      for(let n=0;n<points.length;n++)if(points[n].y<=run.y+.05)index=n;
    }
    run.result=null;
    if(run.elapsed-lastLog>=1){lastLog=run.elapsed;inspect();}
  }
  function draw() {
    const width=Math.max(1,p0.width),height=Math.max(1,p0.height);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.clearRect(0,0,width,height);buttons=[];
    const mobile=width<550,scale=Math.min(1,Math.max(.78,width/500)),left=10;
    function button(command,label,x,y,w,h=30) {
      ctx.fillStyle='#164a46';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#95dbdf';ctx.strokeRect(x+.5,y+.5,w-1,h-1);
      ctx.fillStyle='#ffffff';ctx.font='bold 12px sans-serif';ctx.fillText(label,x+8,y+20);
      buttons.push({id:'developer:'+command,x,y,w,h});
    }
    ctx.fillStyle='rgba(79,12,78,.97)';ctx.fillRect(0,56,width,28);
    ctx.fillStyle='#fff';ctx.font=`bold ${mobile?10:12}px sans-serif`;
    ctx.fillText('PRIVATE DEVELOPER • NO SCORES / REWARDS / SAVES',10,74);
    button('panel',expanded?'F2 HIDE':'F2 TOOLS',width-92,86,82,28);
    if(!expanded){texture.needsUpdate=true;return;}
    const top=118,panelWidth=Math.min(325,width-20),run=current(),points=section(),cp=points[index];
    ctx.fillStyle='rgba(14,27,38,.96)';ctx.fillRect(left,top,panelWidth,316);
    ctx.save();ctx.translate(left+10,top+10);ctx.scale(scale,scale);
    const maxWidth=(panelWidth-20)/scale;
    ctx.fillStyle='#a8ecf0';ctx.font='bold 16px sans-serif';ctx.fillText('DEVELOPER TESTER',0,17);
    ctx.font='12px sans-serif';ctx.fillStyle='#fff';
    const lines=[`Coffee: ${coffee.mode.toUpperCase()}  •  invulnerable`,
      `${run?.recipe||'latte'} • ${run?.state||''} • ${run?.elapsed?.toFixed(1)||0}s`,
      `Climb ${Math.max(0,Math.min(100,(run?.y||0)/(run?.top||1)*100)).toFixed(1)}% • ${run?.y?.toFixed(2)||0}/${run?.top?.toFixed(1)||0} • pad ${run?.onPlatform??0}`,
      `Beans ${run?.collected.bean||0}/${run?.required.bean||0}  Milk ${run?.collected.milk||0}/${run?.required.milk||0}  Stars ${run?.bonusStars||0}`,
      `Section ${index+1}/${points.length}: ${cp?.label||'START'} (pad ${cp?.id||0})`];
    lines.forEach((line,n)=>ctx.fillText(line,0,39+n*19,maxWidth));ctx.restore();
    let y=top+125;const x=left+10,w=panelWidth-20,half=(w-8)/2;
    button('coffee','C: COFFEE MODE',x,y,w);y+=36;
    button('previous','[ PREVIOUS',x,y,half);button('next','NEXT ]',x+half+8,y,half);y+=36;
    button('restart','T: RESTART SECTION',x,y,w);y+=36;
    button('flight',`G: FLIGHT ${flight?'ON':'OFF'}`,x,y,half);button('inspect','I: INSPECT',x+half+8,y,half);y+=36;
    button('espresso','1: ESPRESSO',x,y,half);button('latte','2: LATTE',x+half+8,y,half);
    ctx.fillStyle='#b8c6d2';ctx.font='11px sans-serif';ctx.fillText('Flight: A/D around cup, E/Q up/down',x,y+46);
    texture.needsUpdate=true;
  }
  return {action,key,step,hit(x,y){return [...buttons].reverse().find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?.id||null;},
    start(){getModel().selectedCharacter='boy';begin();ensureRun(current());inspect();},
    render(renderer){draw();renderer.render(scene,camera);},dispose(){mesh.geometry.dispose();material.dispose();texture.dispose();}};
}
