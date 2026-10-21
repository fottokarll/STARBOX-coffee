// Native two-finger input through Chromium's real touch event pipeline.
import {readRuntime,waitForLog,settleVisuals} from './devkit_v2.mjs';

export async function exerciseTouchV2(runtime,options={}) {
  const {page,capture}=runtime;
  // Target the actual sandbox canvas's frame. Chromium's legacy root input
  // forwarding can otherwise send a post-screenshot tap to the iframe element
  // instead of its canvas, even with correct device coordinates.
  const shell=page.frames().find(frame=>frame.url().includes('/sandbox/devkit/shell.html'));
  let client,frameCoordinates=false;
  if(shell) {
    try {
      client=await page.context().newCDPSession(shell);
      const metrics=await client.send('Page.getLayoutMetrics');
      frameCoordinates=(metrics.cssLayoutViewport||metrics.layoutViewport).clientWidth<=400;
      if(!frameCoordinates){await client.detach();client=null;}
    } catch {if(client)await client.detach().catch(()=>{});client=null;}
  }
  if(!client)client=await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  for(const frame of page.frames())await frame.evaluate(()=>{
    window.__nativeTouchAudit=[];
    for(const name of ['pointerdown','pointerup','pointercancel','touchstart','touchend'])
      addEventListener(name,event=>{
        const point=event.changedTouches?.[0]||event;
        const record={type:event.type,x:point.clientX,y:point.clientY,
          target:event.target?.tagName,id:event.pointerId,touch:event.pointerType,
          frame:location.pathname};
        window.__nativeTouchAudit.push(record);
        console.info('V2 native audit '+JSON.stringify(record));
      },true);
  });
  const W=390,H=844;
  let box=await page.locator('#device').boundingBox();
  const point=(x,y,id)=>({x:frameCoordinates?x:box.x+x/W*box.width,y:frameCoordinates?y:box.y+y/H*box.height,
    id,radiusX:2,radiusY:2});
  const contacts=new Map();
  async function dispatch(type,touchPoints) {
    // Chromium's legacy native path permits releasing one changed contact.
    // Track the held contacts so cleanup also names every remaining finger.
    const changed=type==='touchEnd'&&!touchPoints.length?[...contacts.values()]:touchPoints;
    await client.send('Input.dispatchTouchEvent',{type,touchPoints:changed});
    if(type==='touchStart'||type==='touchMove')for(const contact of changed)contacts.set(contact.id,contact);
    if(type==='touchEnd'||type==='touchCancel')for(const contact of changed)contacts.delete(contact.id);
  }
  async function tap(x,y) {
    // Element screenshots may scroll the devkit. Re-read viewport coordinates
    // immediately before every native contact rather than caching the box.
    box=await page.locator('#device').boundingBox();
    await dispatch('touchStart',[point(x,y,1)]);
    await page.waitForTimeout(400);await dispatch('touchEnd',[]);
    console.log('V2 native tap',JSON.stringify({x,y,box}));
  }
  const start=(await readRuntime(page)).console.length;
  const screenshots=[await capture('touch-title')];
  try {
    await settleVisuals(page);
    await page.waitForTimeout(650);
    await tap(W/2,H-126+24.5);
    await waitForLog(page,event=>event.kind==='screen'&&event.screen==='order',{start,timeout:20000});
    await settleVisuals(page);
    // These are the actual responsive ui.js card bounds at390×844.
    const cardW=(W-44)/2,gap=12,x=(W-cardW*2-gap)/2;
    const cardY=Math.max(154,H*.25),cardH=Math.min(310,H-294);
    const recipe=options.recipe||'latte',character=options.character||'girl';
    await tap(x+(recipe==='latte'?cardW+gap:0)+cardW/2,cardY+cardH*.55);
    await settleVisuals(page);screenshots.push(await capture('touch-order'));
    const bottom=cardY+cardH+24;
    await tap(W/2,bottom+24);
    await waitForLog(page,event=>event.kind==='screen'&&event.screen==='character',{start,timeout:20000});
    await settleVisuals(page);
    await tap(x+(character==='girl'?cardW+gap:0)+cardW/2,cardY+cardH*.55);
    await settleVisuals(page);screenshots.push(await capture(`touch-character-${character}`));
    await tap(W/2,bottom+24);
    await waitForLog(page,event=>event.kind==='screen'&&event.screen==='countdown',{start});
    screenshots.push(await capture('touch-countdown'));
    await waitForLog(page,event=>event.kind==='go',{start,timeout:90000});
    const initial=(await readRuntime(page)).room.position;
    box=await page.locator('#device').boundingBox();
    const y=H-71+47/2,right=point(25+47+47/2,y,1),jump=point(W-118+50,y,2);
    await dispatch('touchStart',[right]);await dispatch('touchStart',[jump]);
    await page.waitForFunction(before=>devkit.room.position?.y>before+.06,initial.y,{timeout:10000});
    const bothHeld=(await readRuntime(page)).room.position;
    // The changed contact is ended; the other finger remains physically held.
    await dispatch('touchEnd',[jump]);
    await page.waitForFunction(before=>Math.abs((devkit.room.position?.yaw??0)-before)>.025,
      bothHeld.yaw,{timeout:10000});
    const afterJumpRelease=(await readRuntime(page)).room.position;
    await dispatch('touchEnd',[]);await settleVisuals(page);
    const final=(await readRuntime(page)).room.position;
    screenshots.push(await capture('touch-gameplay'));
    const logs=(await readRuntime(page)).console.slice(start);
    return {recipe,character,initial,bothHeld,afterJumpRelease,final,screenshots,
      jumped:Math.max(bothHeld.y,afterJumpRelease.y)>initial.y+.06,
      movedAfterJumpRelease:Math.abs(afterJumpRelease.yaw-bothHeld.yaw)>.025,
      round:logs.find(line=>String(line).includes('Coffee Rising: round started')),
      viewport:'390x844 explicit size; native CDP touch; manifest stick:false',
      inputTarget:frameCoordinates?'sandbox frame':'root viewport',
    };
  } finally {
    await dispatch('touchEnd',[]).catch(()=>{});await client.detach();
  }
}
