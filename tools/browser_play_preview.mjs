import {makeCourse} from '../experience/rules.js';
// Real official DevKit keys, driven in the browser to avoid CDP roundtrip delay.
// The optional QA entry sends copied p0.hud observations; no game-state setters exist.
export async function driveClimbPreview(runtime,options={}) {
  await runtime.page.evaluate(course=>{window.starboxQaCourse=course;},makeCourse(options.recipe||'espresso'));
  return runtime.page.evaluate(async options=>{
    const angleDistance=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
    const trace=[],landed=[0],began=performance.now(),maximum=options.maximumMs||180000;
    let keys={KeyA:false,KeyD:false,Space:false},current=0,routeIndex=0,lastFrame=-1,phase='ground';
    let stoppedAt=null,result=null;
    while(performance.now()-began<maximum) {
      await new Promise(resolve=>setTimeout(resolve,8));
      const snapshot=window.starboxObserved,run=snapshot?.run;
      if(!run||run.state!=='play'&&!run.result)continue;
      if(run.result){result=run.result;if(run.grounded&&landed.at(-1)!==run.onPlatform)landed.push(run.onPlatform);break;}
      if(snapshot.frameTime===lastFrame)continue;
      const latency=Math.min(.07,Math.max(.015,(snapshot.frameTime-lastFrame)/1000));lastFrame=snapshot.frameTime;
      if(phase==='launch'&&!run.grounded)phase='air';
      if(phase==='air'&&run.grounded)phase='ground';
      const path=options.path|| (options.safe?run.safePath:options.stars?run.rewardPath:options.perfect?run.perfectPath:run.mainPath);
      if(run.grounded&&phase==='ground') {
        current=run.onPlatform;const found=path.indexOf(current,routeIndex);if(found>=0)routeIndex=found;
        if(landed.at(-1)!==current)landed.push(current);
      }
      if(options.stopAtPlatform===current&&run.grounded){stoppedAt=current;break;}
      const at=run.platforms[path[routeIndex]],next=run.platforms[path[Math.min(path.length-1,routeIndex+1)]];
      const pending=options.collect===false?null:run.ingredients.find(i=>i.platform===at.id&&(i.required||options.stars)&&!i.collected);
      const deeper=!run.grounded&&next.kind==='safe'&&next.y-at.y>1.55?Math.sign(angleDistance(next.angle,at.angle))*.10:0;
      const target=pending?pending.angle:next.angle+deeper,error=angleDistance(target,run.theta+run.vTheta*latency);
      let demand=error*9-run.vTheta*1.25,move=demand>.08?1:demand<-.08?-1:0,jump=phase!=='ground'||!run.grounded;
      if(run.grounded&&phase==='ground') {
        if(pending)jump=false;
        else if(Math.sign(run.vTheta)!==Math.sign(error)&&Math.abs(run.vTheta)>.12){jump=false;move=at.surface==='ceramic'?Math.sign(error):0;}
        else {
          const dir=Math.sign(angleDistance(next.angle,at.angle)),gap=Math.abs(angleDistance(next.angle,at.angle));
          const offset=next.y-at.y>1.6&&gap<.9?-.14:Math.max(0,gap-.98);
          const launch=at.angle+dir*Math.min(at.halfWidth*.85,offset),e=angleDistance(launch,run.theta);
          if(gap<=1.25){move=Math.sign(angleDistance(target,run.theta));jump=Math.abs(angleDistance(target,run.theta))<1.1;}
          else if(gap>1.25){move=dir;const high=next.y-at.y>1.4;
            jump=dir*angleDistance(run.theta,at.angle)>at.halfWidth*(high?1:.85)&&dir*run.vTheta>(high?1.50:.85);}
          else if(Math.abs(e)>.06||next.y-at.y>1.6&&gap<.9&&Math.abs(run.vTheta)>.55){demand=e*8-run.vTheta*1.7;move=demand>.08?1:demand<-.08?-1:0;jump=false;}
          else jump=true;
        }
      }
      if(jump&&phase==='ground'){if(keys.Space){devkit.key('Space',false);devkit.key('Space',true);}phase='launch';}
      const desired={KeyA:move<0,KeyD:move>0,Space:jump};
      for(const[k,v]of Object.entries(desired))if(keys[k]!==v)devkit.key(k,v);
      if(Object.keys(keys).some(k=>keys[k]!==desired[k]))trace.push({elapsed:run.elapsed,theta:run.theta,y:run.y,vTheta:run.vTheta,current,target:next.id,move,jump});
      keys=desired;
    }
    for(const k of['KeyA','KeyD','Space'])devkit.key(k,false);
    await new Promise(resolve=>setTimeout(resolve,500));
    return {recipe:options.recipe,result,landed,trace,stoppedAt,wallSeconds:(performance.now()-began)/1000,finalSnapshot:window.starboxObserved,
      timedOut:!result&&stoppedAt===null,method:'Official DevKit keyboard API in the actual browser; copy-only p0.hud observations via the optional preview entry. No game-state/score/collection writes.'};
  },options);
}
