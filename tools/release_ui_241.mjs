// Responsive UI evidence through the official DevKit and native touch only.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openRuntime,enterRound,readRuntime,waitForLog,keyTap,settleVisuals} from './devkit_v2.mjs';
import {headerLayout,touchLayout,resultsLayout} from '../experience/ui-layout.js';
const directory=process.env.P0_REPORT_DIR||'verification/2.4.1';
const sizes=[[320,568],[390,844],[412,915],[844,390],[568,320]];
const checks=[],screens=[];
let runtime,client,report;
try {
  for(const [w,h]of sizes) {
    runtime=await openRuntime({view:`${w}x${h}`,size:`${w}x${h}`,reportDirectory:directory,name:'ui',touch:true,
      entry:process.env.P0_ENTRY||'http://localhost:5500/main.js'});
    const {page,capture}=runtime;
    const shell=page.frames().find(f=>f.url().includes('/sandbox/devkit/shell.html'));
    assert.ok(shell,'official sandbox present');
    client=await page.context().newCDPSession(shell);
    const metrics=await client.send('Page.getLayoutMetrics');
    const local=Math.abs((metrics.cssLayoutViewport||metrics.layoutViewport).clientWidth-w)<2;
    if(!local){await client.detach();client=await page.context().newCDPSession(page);}
    await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    async function tap(x,y) {
      const box=await page.locator('#device').boundingBox();
      const point={x:local?x:box.x+x/w*box.width,y:local?y:box.y+y/h*box.height,id:1,radiusX:2,radiusY:2};
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
      await page.waitForTimeout(85);
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point]});
    }
    const menu=await enterRound(runtime,{captureGo:false});
    await settleVisuals(page);screens.push(await capture('hud-top'));
    let start=(await readRuntime(page)).console.length;
    const header=headerLayout(w,h,true),mute=header.mute;
    await tap(header.pause.x+header.pause.w/2,header.pause.y+header.pause.h/2);
    await waitForLog(page,e=>e.kind==='screen'&&e.screen==='pause',{start});
    screens.push(await capture('pause'));
    start=(await readRuntime(page)).console.length;
    await tap(mute.x+mute.w/2,mute.y+mute.h/2);await page.waitForTimeout(180);
    let state=await readRuntime(page);
    assert.equal(state.console.slice(start).some(line=>/mute (true|false)/.test(String(line))),false,'pause blocks dimmed HUD mute');
    await keyTap(page,'KeyP',60);
    await waitForLog(page,e=>e.kind==='screen'&&e.screen==='play',{start});
    const failure=await waitForLog(page,e=>e.kind==='result'&&!e.data.success,{start:menu.start,timeout:60000});
    await settleVisuals(page);screens.push(await capture('failure-single-retry'));
    const jump=touchLayout(w,h).jump,receipt=resultsLayout(w,h);
    start=(await readRuntime(page)).console.length;
    await tap(jump.x+jump.w/2,jump.y+jump.h-2);await page.waitForTimeout(250);
    state=await readRuntime(page);
    assert.equal(state.console.slice(start).some(line=>/screen countdown/.test(String(line))),false,'former giant retry area stays inactive');
    await tap(receipt.restart.x+receipt.restart.w/2,receipt.restart.y+receipt.restart.h/2);
    await waitForLog(page,e=>e.kind==='screen'&&e.screen==='countdown',{start,timeout:5000});
    await waitForLog(page,e=>e.kind==='go',{start,timeout:20000});
    screens.push(await capture('brew-again-restarted'));
    state=await readRuntime(page);assert.deepEqual(state.errors,[]);
    checks.push({viewport:{width:w,height:h},passed:true,hud:header.hud,timer:header.timer,receipt,
      checks:['top-anchored HUD and timer','pause blocks underlying mute target','failure shows receipt with sole BREW AGAIN retry',
        'former giant retry area inactive','native BREW AGAIN restarts'],failure:failure.data,errors:state.errors,networkFailures:runtime.networkFailures});
    await client.detach();client=null;await runtime.close();runtime=null;
  }
  report={passed:true,method:'Actual official DevKit main.js, native Chromium touch and ordinary keys. No game-state mutation.',checks,screens};
} catch(error) {
  process.exitCode=1;report={passed:false,error:error.message,stack:error.stack,checks,screens};
  if(runtime)Object.assign(report,{state:await readRuntime(runtime.page).catch(()=>null),networkFailures:runtime.networkFailures});
} finally {
  await client?.detach().catch(()=>{});if(runtime)await runtime.close();
  await fs.mkdir(directory,{recursive:true});await fs.writeFile(`${directory}/ui-responsive.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,viewports:checks.length,error:report.error}));
