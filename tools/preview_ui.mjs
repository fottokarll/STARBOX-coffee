import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openRuntime,readRuntime,waitForLog} from './devkit_v2.mjs';
const runtime=await openRuntime({view:'phone',reportDirectory:'verification/overhaul',name:'ui-final',touch:true});
let client,report;
try {
  const {page,capture}=runtime,shell=page.frames().find(f=>f.url().includes('/sandbox/devkit/shell.html'));
  client=await page.context().newCDPSession(shell||page);
  const metrics=await client.send('Page.getLayoutMetrics');let local=(metrics.cssLayoutViewport||metrics.layoutViewport).clientWidth<=400;
  if(!local){await client.detach();client=await page.context().newCDPSession(page);}
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  async function tap(x,y) {
    const box=await page.locator('#device').boundingBox();
    const point={x:local?x:box.x+x/390*box.width,y:local?y:box.y+y/844*box.height,id:1,radiusX:2,radiusY:2};
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await page.waitForTimeout(100);
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point]});
  }
  const start=(await readRuntime(page)).console.length,screens=[await capture('title')];
  await tap(195,742);await waitForLog(page,e=>e.kind==='screen'&&e.screen==='order',{start});
  await tap(287,380);screens.push(await capture('order'));
  await tap(195,569);await waitForLog(page,e=>e.kind==='screen'&&e.screen==='character',{start});
  await tap(287,380);screens.push(await capture('barista'));
  await tap(195,569);await waitForLog(page,e=>e.kind==='go',{start});
  await tap(356,77);await waitForLog(page,e=>e.kind==='screen'&&e.screen==='pause',{start});
  screens.push(await capture('pause'));
  await tap(195,462);await waitForLog(page,e=>e.kind==='screen'&&e.screen==='play',{start});
  await tap(318,77);await waitForLog(page,e=>/mute true/.test(e.text),{start});
  await tap(318,77);await waitForLog(page,e=>/mute false/.test(e.text),{start});
  const fail=await waitForLog(page,e=>e.kind==='result',{start,timeout:20000});assert.equal(fail.data.success,false);
  screens.push(await capture('failure'));
  const after=(await readRuntime(page)).console.length;
  await tap(195,567);await waitForLog(page,e=>e.kind==='screen'&&e.screen==='countdown',{start:after});
  await waitForLog(page,e=>e.kind==='go',{start:after});screens.push(await capture('hud'));
  const state=await readRuntime(page);assert.deepEqual(state.errors,[]);
  report={passed:true,method:'Native Chromium touch through the official Project 0 sandbox, main.js entry.',
    checks:['coffee and Mira selection','pause/resume targets below the city toolbar','mute/unmute','failure receipt','touch retry','readable timer/HUD'],
    failure:fail.data,screens,frames:state.frames,errors:state.errors};
} catch(error) {report={passed:false,error:error.message,...await readRuntime(runtime.page)};process.exitCode=1;}
finally {await client?.detach().catch(()=>{});await runtime.close();await fs.writeFile('verification/overhaul/ui-phone.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,error:report.error}));
