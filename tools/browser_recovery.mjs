// Ordinary keyboard play demonstrates collapse, retreat, regeneration and continuation.
import {makeCourse,angleDistance} from '../experience/rules.js';
import {readRuntime,parseGameLog,waitForLog} from './devkit_v2.mjs';
import {driveClimbV2} from './browser_play_v2.mjs';
export async function exerciseRecovery(runtime,options={}) {
  const {page,capture}=runtime,recipe=options.recipe||'espresso';
  const approach=await driveClimbV2(runtime,{...options,stopAtBiscuit:true,collect:false});
  if(approach.stoppedAt===null)throw new Error('Could not reach a biscuit with ordinary keys');
  const biscuit=approach.stoppedAt,course=makeCourse(recipe),fallback=course.platforms[biscuit-1];
  await waitForLog(page,e=>e.kind==='event'&&e.data.type==='crumble'&&e.data.platform===biscuit,
    {start:options.start||0,timeout:45000});
  const screenshots=[await capture('biscuit-cracking')];
  let cursor=(await readRuntime(page)).console.length;
  await page.evaluate(()=>devkit.key('Space',true));
  let retreated=false,refuge=null;
  const began=Date.now();
  while(Date.now()-began<45000) {
    const state=await readRuntime(page),fresh=state.console.slice(cursor).map(parseGameLog);cursor=state.console.length;
    if(fresh.some(e=>e.kind==='result'))throw new Error('Spilled before biscuit recovery');
    const landing=fresh.find(e=>e.kind==='event'&&e.data.type==='land'&&
      course.platforms[e.data.platform]?.kind!=='biscuit');
    if(landing) {retreated=true;refuge=landing.data.platform;break;}
    const error=angleDistance(fallback.angle,state.room.position.yaw);
    const move=Math.abs(error)>.30?Math.sign(error):0;
    await page.evaluate(move=>{devkit.key('KeyA',move<0);devkit.key('KeyD',move>0);},move);
    await page.waitForTimeout(60);
  }
  await page.evaluate(()=>{for(const k of ['KeyA','KeyD','Space'])devkit.key(k,false);});
  if(!retreated)throw new Error('Did not reach a permanent recovery ledge');
  await waitForLog(page,e=>e.kind==='event'&&e.data.type==='collapse'&&e.data.platform===biscuit,
    {start:options.start||0,timeout:45000});
  screenshots.push(await capture('biscuit-missing'));
  const reformed=await waitForLog(page,e=>e.kind==='event'&&e.data.type==='reform'&&e.data.platform===biscuit,
    {start:options.start||0,timeout:45000});
  screenshots.push(await capture('biscuit-restored'));
  const continued=await driveClimbV2(runtime,{...options,collect:false,stopAtPlatform:biscuit+1});
  const recoveryVerified=continued.landed.includes(biscuit)&&continued.landed.some(id=>
    course.platforms[id]?.y>course.platforms[biscuit].y);
  if(!recoveryVerified)throw new Error('The restored biscuit did not support an actual upward continuation');
  return {biscuit,fallback:fallback.id,refuge,retreated,reformed:reformed.data,
    recoveryVerified,finished:Boolean(continued.result?.success),result:continued.result,approach,continued,screenshots};
}
