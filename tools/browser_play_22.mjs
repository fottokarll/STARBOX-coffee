// Official DevKit play: reads public diagnostic poses and presses ordinary keys.
// No game-state writes, teleportation, collection or reward shortcuts.
import {makeCourse,PHYSICS} from '../experience/rules.js';
import {readRuntime,parseGameLog} from './devkit_v2.mjs';

export async function driveClimb22(runtime, options = {}) {
  const {page} = runtime, recipe = options.recipe || 'espresso', course = makeCourse(recipe);
  const route = options.safe ? course.safePath : options.perfect ? course.perfectPath : course.mainPath;
  const landed = [0], collected = new Set(), events = [], trace = [];
  let cursor = options.start || 0, lastLine = null, pose = null, current = 0, routeIndex = 0, result = null;
  let keys = {KeyA:false,KeyD:false,Space:false}, stoppedAt = null, lastProgress = 0;
  let phase = 'ground';
  let forecast = null, anchor = null;
  const began = Date.now(), maximumMs = options.maximumMs || 900000;
  while (Date.now() - began < maximumMs) {
    const state = await readRuntime(page);
    // Track the last line so a bounded console window can also be consumed safely.
    const index = lastLine === null ? cursor : state.console.lastIndexOf(lastLine) + 1;
    const fresh = state.console.slice(index).map(parseGameLog);
    lastLine = state.console.at(-1) ?? lastLine; cursor = state.console.length;
    for (const entry of fresh) {
      if (entry.kind === 'pose') pose = entry.data;
      if (entry.kind === 'result') result = entry.data;
      if (entry.kind === 'event') {
        events.push(entry.data);
        if (entry.data.type === 'collect') collected.add(entry.data.id);
        if (entry.data.type === 'land') {
          phase = 'ground';
          current = entry.data.platform;
          if (landed.at(-1) !== current) landed.push(current);
          // A landing after the latest periodic pose is a newer observation.
          if (!pose || entry.data.elapsed >= pose.elapsed) pose = {...entry.data,grounded:true,onPlatform:current};
        }
        if (entry.data.type === 'jump') {
          phase = 'air';
          if (!pose || entry.data.elapsed >= pose.elapsed) pose = {...entry.data,grounded:false,onPlatform:-1};
        }
      }
    }
    if (result) break;
    if (state.status !== 'started') throw new Error(`Runtime ${state.status}: ${state.reason}`);
    if (!pose) {await page.waitForTimeout(20); continue;}
    // The city's quantized room position trails the event stream. Predict only
    // our controller's observation between exact public poses, never game state.
    const now = Date.now()/1000;
    if (anchor !== pose) {forecast={...pose,at:now};anchor=pose;}
    let remaining=Math.min(.12,Math.max(0,now-forecast.at)); forecast.at=now;
    const heldMove=Number(keys.KeyD)-Number(keys.KeyA);
    while(remaining>0) {
      const dt=Math.min(PHYSICS.fixedStep,remaining), ceramic=phase==='ground'&&course.platforms[current]?.surface==='ceramic';
      const rate=heldMove?(ceramic?PHYSICS.ceramicAcceleration:PHYSICS.acceleration):(ceramic?PHYSICS.ceramicBraking:PHYSICS.braking);
      forecast.vTheta+=Math.max(-rate*dt,Math.min(rate*dt,heldMove*PHYSICS.maxSpeed-forecast.vTheta));
      forecast.theta+=forecast.vTheta*dt;remaining-=dt;
    }
    if (pose.grounded && route.includes(pose.onPlatform)) {
      current = pose.onPlatform; routeIndex = route.indexOf(current);
    }
    const at = course.platforms[current], next = course.platforms[route[Math.min(route.length - 1, routeIndex + 1)]];
    const pending = options.collect === false ? null : course.ingredients.find(i => i.platform === current && i.required && !collected.has(i.id));
    const target = pending ? pending.angle : next.angle;
    const error = target - forecast.theta, direction = Math.sign(error);
    const towards = Math.max(0,forecast.vTheta*direction);
    const ceramic = phase === 'ground' && at.surface === 'ceramic';
    const brake = ceramic ? PHYSICS.ceramicAcceleration : PHYSICS.braking;
    const stopping = towards*towards/(2*brake) + towards*.045;
    let move = Math.abs(error)<.035&&Math.abs(forecast.vTheta)<.18 ? 0
      : Math.abs(error)<=stopping ? ceramic ? -Math.sign(forecast.vTheta) : 0 : direction;
    let jump = phase !== 'ground';
    if (phase === 'ground') {
      if (options.stopAtPlatform === current || options.stopAtBiscuit && at.kind === 'biscuit') {stoppedAt = current; break;}
      if (pending) jump = false;
      else if (keys.Space || Math.sign(forecast.vTheta) !== Math.sign(error) && Math.abs(forecast.vTheta) > .12) {
        jump = false; move = ceramic && forecast.vTheta*direction<0 ? direction : 0;
      } else jump = true;
    }
    if (jump && phase === 'ground') phase = 'launch';
    const desired = {KeyA:move < 0,KeyD:move > 0,Space:jump};
    const changed = Object.entries(desired).filter(([key,value])=>keys[key] !== value);
    if (changed.length) {
      await page.evaluate(changed => {for (const [key,down] of changed) devkit.key(key,down);}, changed);
      keys = desired;
      trace.push({wallSeconds:(Date.now()-began)/1000,current,target:next.id,...pose,move,jump});
    }
    if (Date.now() - began - lastProgress > 10000) {
      lastProgress = Date.now() - began;
      console.log('2.2 browser climb',JSON.stringify({recipe,current,y:pose.y,elapsed:pose.elapsed,ingredients:collected.size}));
    }
    await page.waitForTimeout(20);
  }
  await page.evaluate(()=>{for(const key of ['KeyA','KeyD','Space']) devkit.key(key,false);});
  return {recipe,perfectRoute:Boolean(options.perfect),result,stoppedAt,
    wallSeconds:(Date.now()-began)/1000,trace,events,collected:[...collected],landed,
    timedOut:!result && stoppedAt === null};
}
