import assert from 'node:assert/strict';
import {readRuntime,parseGameLog,keyTap} from './devkit_v2.mjs';
import {exerciseTouchV2} from './mobile_touch_v2.mjs';

export async function exerciseTouch22(runtime, options = {}) {
  const initial = await exerciseTouchV2(runtime, options);
  assert.ok(initial.jumped && initial.movedAfterJumpRelease);
  const {page,capture} = runtime;
  const shell = page.frames().find(f=>f.url().includes('/sandbox/devkit/shell.html'));
  let client = await page.context().newCDPSession(shell || page), local = Boolean(shell);
  const metrics = await client.send('Page.getLayoutMetrics');
  if ((metrics.cssLayoutViewport||metrics.layoutViewport).clientWidth > 400) {
    await client.detach(); client = await page.context().newCDPSession(page); local=false;
  }
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  let contacts = new Map(), box;
  const point = (x,y,id)=>({x:local?x:box.x+x/390*box.width,y:local?y:box.y+y/844*box.height,id,radiusX:2,radiusY:2});
  async function touch(type, points) {
    await client.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    if (type==='touchStart'||type==='touchMove') for(const p of points) contacts.set(p.id,p);
    if (type==='touchEnd') for(const p of points) contacts.delete(p.id);
  }
  async function releaseAll() {
    if (contacts.size) await touch('touchEnd',[...contacts.values()]);
    contacts.clear();
  }
  async function observer() {
    let last=(await readRuntime(page)).console.at(-1);
    return async predicate=>{
      const began=Date.now();
      while(Date.now()-began<20000) {
        const state=await readRuntime(page),index=last?state.console.lastIndexOf(last)+1:0;
        const fresh=state.console.slice(index).map(parseGameLog);last=state.console.at(-1)||last;
        const match=fresh.find(predicate);if(match)return match;
        await page.waitForTimeout(20);
      }
      throw new Error('Native touch input was not observed by the game');
    };
  }
  async function restart() {
    await releaseAll();const wait=await observer();await keyTap(page,'KeyR',40);
    await wait(e=>e.kind==='go');box=await page.locator('#device').boundingBox();
  }
  async function poseAfter(operation, move, jump) {
    const wait=await observer();await operation();
    return (await wait(e=>e.kind==='input'&&e.data.move===move&&e.data.jump===jump)).data;
  }
  const y=796, cases=[];
  try {
    await restart();
    let right=point(95,y,11),jump=point(322,y,12);
    const both=await poseAfter(async()=>{await touch('touchStart',[right]);await touch('touchStart',[jump]);},1,true);
    const off=point(230,710,12);
    const releasedJump=await poseAfter(async()=>{await touch('touchMove',[off]);await touch('touchEnd',[off]);},1,false);
    const overJump=point(322,y,11);
    const releasedMove=await poseAfter(async()=>{await touch('touchMove',[overJump]);await touch('touchEnd',[overJump]);},0,false);
    cases.push({name:'jump off button; right released over jump',both,releasedJump,releasedMove});

    await restart();
    let left=point(40,y,21);jump=point(322,y,22);
    await poseAfter(async()=>{await touch('touchStart',[left]);await touch('touchStart',[jump]);},-1,true);
    const overRight=point(95,y,21);
    const heldJump=await poseAfter(async()=>{await touch('touchMove',[overRight]);await touch('touchEnd',[overRight]);},0,true);
    const blank=point(250,700,22);
    const released=await poseAfter(async()=>{await touch('touchMove',[blank]);await touch('touchEnd',[blank]);},0,false);
    cases.push({name:'left released over right preserves jump',heldJump,released});

    await restart();right=point(95,y,31);jump=point(322,y,32);
    await poseAfter(async()=>{await touch('touchStart',[right]);await touch('touchStart',[jump]);},1,true);
    const third=point(220,720,33);
    const wait=await observer();
    await touch('touchStart',[third]);await touch('touchEnd',[third]);
    const heldBoth=(await wait(e=>e.kind==='pose'&&e.data.move===1&&e.data.jump===true)).data;
    await releaseAll();
    cases.push({name:'blank third finger release preserves both held actions',heldBoth});
    return {initial,cases,passed:true,screenshot:await capture('multitouch-release'),
      method:'Native Chromium multi-touch in official Project 0 sandbox; assertions read actual simulation input diagnostics. No pointerId assumed.'};
  } finally {await releaseAll().catch(()=>{});await client.detach();}
}
