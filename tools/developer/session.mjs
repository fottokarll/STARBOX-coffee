/** Private local tooling. Copied into an isolated DevKit experience by stage.py only. */
export const coffee = {mode:'frozen', y:-3, elapsed:0};
export function developerCoffeeY(run, rise) {
  if(coffee.mode==='disabled')return -6;
  return coffee.mode==='rising'?coffee.y+Math.max(0,run.elapsed-coffee.elapsed)*rise:coffee.y;
}
export function setCoffeeMode(mode, run, rise) {
  if(!['frozen','disabled','rising'].includes(mode))throw new Error('Unknown coffee mode');
  if(run&&!Number.isFinite(rise))throw new Error('Coffee rise must come from the current authored recipe');
  const current=coffee.mode==='disabled'?coffee.y:run?developerCoffeeY(run,rise):-3;
  coffee.y=current;coffee.elapsed=run?.elapsed||0;coffee.mode=mode;
}

/** Only documented rendering/input SDK facilities reach the local tester. */
export const blockedSideEffects=[];
export function isolateSDK(sdk) {
  const blocked=blockedSideEffects;blocked.length=0;
  const deny=name=>(..._args)=>{blocked.push(name);return Promise.resolve({ok:false,reason:'Private developer session: persistence and rewards disabled'});};
  const items=Object.freeze({owned:Object.freeze([]),give:deny('items.give')});
  const allowed=new Set(['loading','controls','bodies','players','createRenderer','renderer','scene','camera',
    'autoRender','pixelRatio','on','asset','sound','input','hud','width','height','log','loop','exit']);
  // A private clone prevents practice position updates from entering any shared session.
  const originalMe=sdk.me||{};
  const me={id:originalMe.id,name:'Developer Tester',color:originalMe.color,avatar:originalMe.avatar,
    position:originalMe.position?.clone?.()||{set(){}},yaw:0};
  const proxy=new Proxy({}, {
    get(_target,key) {
      if(key==='score'||key==='win'||key==='save')return deny(String(key));
      if(key==='items')return items;
      if(key==='saved')return null;
      if(key==='table')return [];
      if(key==='me')return me;
      if(key==='on')return (event,handler)=>['reward','table'].includes(event)?undefined:sdk.on(event,handler);
      if(!allowed.has(key))throw new Error(`Private developer SDK access denied: ${String(key)}`);
      const value=sdk[key];return typeof value==='function'?value.bind(sdk):value;
    },
    set(_target,key,value) {
      if(key!=='autoRender')throw new Error(`Private developer SDK mutation denied: ${String(key)}`);
      sdk[key]=value;return true;
    }
  });
  return {sdk:proxy,blocked};
}

/** Sections come from authored course relationships, never duplicated coordinates. */
export function checkpoints(run) {
  const ids=new Set([run.mainPath[0],...run.forks.map(f=>f.pad),run.finishPlatform]);
  for(const route of run.biscuitAlternates)for(const id of [route.from,...route.pads,route.rejoin])ids.add(id);
  for(const route of run.returnBranches)for(const id of [route.from,...route.pads])ids.add(id);
  return [...ids].map(id=>run.platforms[id]).sort((a,b)=>a.y-b.y||a.id-b.id)
    .map(p=>({id:p.id,label:p.id===0?'START':p.finish?'FINISH':p.routeRole==='bonus'?'BONUS POCKET':
      p.optional?'TIMBER BYPASS':run.forks.some(f=>f.pad===p.id)?'SWITCHBACK':`SECTION ${p.id}`,y:p.y}));
}
export function restoreCheckpoint(run,id,{resetSection=false}={}) {
  const p=run.platforms[id];if(!p)throw new Error('Unknown checkpoint');
  run.theta=p.angle;run.y=p.y;run.vTheta=0;run.vY=0;run.grounded=true;run.onPlatform=id;
  run.state='play';run.result=null;run.accumulator=0;run.jumpBuffer=0;run.coyote=.11;
  run.previousJump=true;run.previousPause=false;run.previousRestart=false;run.events=[];
  if(resetSection) {
    // Reset the inspected section's transient biscuit state; collected counts stay visible.
    for(const platform of run.platforms)if(platform.kind==='biscuit')Object.assign(platform,{
      collapsed:false,crumbleTimer:null,crumbleProgress:0,crumbleStage:'idle',cracked:false,
      regenerateTimer:null,regenerateProgress:0});
  }
  return run;
}
export function snapshot(run,{checkpoint=0,flight=false,blocked=[]}={}) {
  if(!run)return {private:true};
  return {private:true,recipe:run.recipe,state:run.state,elapsed:run.elapsed,theta:run.theta,y:run.y,
    climbPercent:Math.max(0,Math.min(100,run.y/run.top*100)),velocity:[run.vTheta,run.vY],platform:run.onPlatform,coffeeMode:coffee.mode,coffeeY:run.coffeeY,
    beans:[run.collected.bean,run.required.bean],milk:[run.collected.milk,run.required.milk],stars:run.bonusStars,
    ingredients:run.ingredients.map(i=>({id:i.id,kind:i.kind,platform:i.platform,collected:i.collected})),
    biscuits:run.platforms.filter(p=>p.kind==='biscuit').map(p=>({id:p.id,collapsed:p.collapsed,
      crumble:p.crumbleTimer,regenerate:p.regenerateTimer})),checkpoint,flight,blocked:[...blocked]};
}
