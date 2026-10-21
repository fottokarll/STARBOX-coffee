// Observer/controller for genuine V2 keyboard play in the official devkit.
// It reads public position snapshots and ordinary game event logs only.
import {makeCourse,angleDistance,PHYSICS,RADIUS} from '../experience/rules.js';
import {readRuntime,parseGameLog,waitForLog} from './devkit_v2.mjs';

export function makeControllerV2(recipe='espresso',options={}) {
  const course=makeCourse(recipe),route=options.safe?course.safePath:options.perfect?course.perfectPath:course.mainPath;
  const collected=new Set(),landed=[0],collapsed=new Set();
  let current=route[0],target=route[1],phase='ground',jumpHeld=false;
  let previous=null,velocity=0,initialPosition=null,scale=.24,lastChanged=0;
  let eventPose=null,eventFrame=-Infinity;
  let requestedAt=-Infinity,jumpAcknowledged=false,ended=null,lastFrame=0;
  const history=[];
  function nextPlatform(id) {
    const index=route.indexOf(id);
    if(index>=0&&index<route.length-1)return route[index+1];
    return course.platforms[id]?.nextIds?.find(next=>!collapsed.has(next))??course.finishPlatform;
  }
  function steer(error,v,extra=.035) {
    if(Math.abs(error)<.045&&Math.abs(v)<.25)return 0;
    const sign=Math.sign(error),towards=Math.max(0,v*sign);
    const stop=towards*towards/(2*PHYSICS.braking)+towards*.22;
    if(towards>0&&Math.abs(error)<=stop+extra)return 0;
    if(v*sign<-.15)return 0;
    return sign;
  }
  return {
    course,route,collected,landed,collapsed,history,
    update({position,events=[],wallTime=0,frames=0}) {
      if(!position)return {move:0,jump:false,jumpPressed:false,phase:'waiting'};
      if(!initialPosition) {
        initialPosition={...position};
        const measured=Math.hypot(position.x,position.z)/RADIUS;
        if(measured>.05&&measured<.8)scale=measured;
      }
      const raw=Number(position.yaw??Math.atan2(position.x,position.z));
      let theta=previous?previous.theta+angleDistance(raw,previous.theta):raw;
      // main.js publishes the avatar's world-space centre, 0.7 units above
      // its feet. Event poses are exact simulation coordinates.
      let y=(position.y-.85)/scale-.7;
      const freshPose=events.filter(event=>Number.isFinite(event.theta)&&Number.isFinite(event.y)).at(-1);
      if(freshPose) {
        eventPose={...freshPose};eventFrame=frames;
        theta=freshPose.theta;y=freshPose.y;velocity=freshPose.vTheta;
        previous={theta,y,at:wallTime};lastChanged=wallTime;
      } else if(eventPose) {
        // p0 room telemetry trails the event stream. Wait for the visible pose
        // to catch up before using it as the next finite-difference sample.
        const caughtUp=eventPose.type==='land'
          ?Math.abs(y-eventPose.y)<.13
          :y>eventPose.y+.12;
        if(!caughtUp&&frames<eventFrame+4) {
          theta=previous.theta;y=previous.y;
        } else {
          eventPose=null;previous={theta,y,at:wallTime};
        }
      }
      const changed=!previous||Math.abs(theta-previous.theta)>.00001||Math.abs(y-previous.y)>.00001;
      if(previous&&changed&&!freshPose) {
        const simulatedDt=Math.max(.015,Math.min(.1,wallTime-previous.at));
        velocity=Math.max(-PHYSICS.maxSpeed,Math.min(PHYSICS.maxSpeed,(theta-previous.theta)/simulatedDt));
        lastChanged=wallTime;
      } else if(wallTime-lastChanged>.35&&frames>lastFrame+1)velocity=0;
      if(changed)previous={theta,y,at:wallTime};
      lastFrame=frames;
      let justLanded=false;
      for(const event of events) {
        if(event.type==='collect')collected.add(event.id);
        if(event.type==='collapse')collapsed.add(event.platform);
        if(event.type==='reform')collapsed.delete(event.platform);
        if(event.type==='jump') {phase='air';jumpAcknowledged=true;}
        if(event.type==='land') {
          current=event.platform;phase='ground';jumpHeld=false;justLanded=true;
          if(landed[landed.length-1]!==current)landed.push(current);
          target=nextPlatform(current);
        }
        if(event.type==='fail'||event.type==='finish')ended=event.result||event;
      }
      let move=0,jumpPressed=false;
      const p=course.platforms[current];
      const requiredHere=course.ingredients.filter(item=>item.platform===current&&item.required&&!collected.has(item.id));
      if(phase==='ground'&&p&&!ended) {
        // Aim for the central part of a collectible's actual pickup interval,
        // rather than walking to a detour's outside edge.
        const pending=options.collect===false?null:requiredHere[0];
        if(pending) {
          const itemAngle=theta+angleDistance(pending.angle,theta);
          const centre=theta+angleDistance(p.angle,theta);
          const near=Math.max(itemAngle-.115,Math.min(itemAngle+.115,centre));
          move=steer(near-theta,velocity,.025);
          jumpHeld=false;
        } else if(options.stopAtPlatform===current||options.stopAtBiscuit&&p.kind==='biscuit') {
          move=0;jumpHeld=false;phase='stopped';
        } else if(!p.finish) {
          const next=course.platforms[target];
          const error=angleDistance(next.angle,theta);
          if(p.safeRouteFor&&Math.abs(error)>1.02) {
            // A normal player may walk along the broad safe balcony before
            // its longer rejoining hop; use ordinary steering to do the same.
            const centre=theta+angleDistance(p.angle,theta)+Math.sign(error)*p.halfWidth*.4;
            move=steer(centre-theta,velocity,.025);jumpHeld=false;
            const output={move,jump:false,jumpPressed:false,phase,current,target,theta,y,
              velocity,scale,collected:[...collected],landed:[...landed],result:ended};
            return output;
          }
          const reversing=velocity*Math.sign(error)<-.20;
          // A short real key release follows each acknowledged landing. V2's
          // normal keydown pulse makes the next jump independent of held state.
          if(!justLanded&&!reversing) {
            jumpHeld=true;jumpPressed=true;phase='launch';requestedAt=wallTime;
            jumpAcknowledged=false;move=steer(error,velocity);
          }
        }
      } else if((phase==='launch'||phase==='air')&&!ended) {
        const landing=course.platforms[target];
        const error=angleDistance(landing.angle,theta);
        // Once stopped within a valid landing span, a delayed corrective
        // reversal can walk off a narrow pad on the following frame.
        move=Math.abs(error)<landing.halfWidth&&Math.abs(velocity)<.30?0:steer(error,velocity);
        jumpHeld=true;
        if(phase==='launch'&&!jumpAcknowledged&&wallTime-requestedAt>1.5) {
          // Retry the ordinary key edge only if no actual jump was acknowledged.
          jumpPressed=true;requestedAt=wallTime;
        }
      }
      const output={move,jump:jumpHeld,jumpPressed,phase,current,target,theta,y,
        velocity,scale,requiredRemaining:requiredHere.map(item=>item.id),
        collected:[...collected],landed:[...landed],result:ended};
      const last=history[history.length-1];
      if(!last||last.current!==current||last.phase!==phase||wallTime-last.wallTime>1.2) {
        history.push({wallTime,...output});
      }
      return output;
    },
  };
}

export async function driveClimbV2(runtime,options={}) {
  const {page,capture}=runtime;
  const recipe=options.recipe||'espresso';
  const controller=makeControllerV2(recipe,options);
  const maximumMs=options.maximumMs||300000;
  const started=Date.now(),start=options.start??0;
  let cursor=start,result=null,lastProgress=0,keys={KeyA:false,KeyD:false,Space:false};
  let captured=false,stoppedAt=null;
  const eventsSeen=[];
  while(Date.now()-started<maximumMs) {
    const state=await readRuntime(page);
    const fresh=state.console.slice(cursor).map(parseGameLog);cursor=state.console.length;
    const resultLog=fresh.find(line=>line.kind==='result');
    if(resultLog) {result=resultLog.data;break;}
    const events=fresh.filter(line=>line.kind==='event').map(line=>line.data);
    eventsSeen.push(...events);
    if(state.status!=='started')throw new Error(`Runtime ${state.status}: ${state.reason||''}`);
    const input=controller.update({position:state.room?.position,events,
      wallTime:(Date.now()-started)/1000,frames:state.frames.count});
    const desired={KeyA:input.move<0,KeyD:input.move>0,Space:input.jump};
    const changed=Object.entries(desired).filter(([key,value])=>keys[key]!==value);
    if(changed.length||input.jumpPressed) {
      await page.evaluate(({changed,pulse})=>{
        for(const [key,value] of changed)if(key!=='Space'||!pulse)devkit.key(key,value);
        if(pulse) {devkit.key('Space',false);devkit.key('Space',true);}
      },{changed,pulse:input.jumpPressed});
      keys=desired;
    }
    if(!captured&&input.current>=3) {captured=true;await capture('playing');}
    if(Date.now()-started-lastProgress>10000) {
      lastProgress=Date.now()-started;
      console.log('V2 climb',JSON.stringify({ms:lastProgress,recipe,current:input.current,
        target:input.target,phase:input.phase,ingredients:input.collected.length,y:input.y}));
    }
    if(input.phase==='stopped') {stoppedAt=input.current;break;}
    await page.waitForTimeout(45);
  }
  await page.evaluate(()=>{
    for(const code of ['KeyA','KeyD','Space'])devkit.key(code,false);
  });
  return {recipe,perfectRoute:Boolean(options.perfect),result,stoppedAt,
    wallSeconds:(Date.now()-started)/1000,trace:controller.history,events:eventsSeen,
    collected:[...controller.collected],landed:controller.landed,
    timedOut:!result&&stoppedAt===null};
}

export async function exerciseCrumbleV2(runtime,options={}) {
  const climb=await driveClimbV2(runtime,{...options,stopAtBiscuit:true,collect:false});
  if(climb.stoppedAt===null)return {climb,collapse:null};
  await runtime.capture('biscuit-landed');
  const collapse=await waitForLog(runtime.page,entry=>entry.kind==='event'&&
    entry.data.type==='collapse'&&entry.data.platform===climb.stoppedAt,
  {start:options.start||0,timeout:90000});
  await runtime.capture('biscuit-collapsed');
  const result=await waitForLog(runtime.page,entry=>entry.kind==='result',{
    start:options.start||0,timeout:120000,
  });
  return {climb,collapse,result};
}
