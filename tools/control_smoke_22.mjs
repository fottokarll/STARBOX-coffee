import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {openRuntime,readRuntime,enterRound,keyTap,waitForLog,parseGameLog} from './devkit_v2.mjs';

const runtime=await openRuntime({view:'review',reportDirectory:'verification/2.2',name:'controls'});
let report;
try {
  const {page}=runtime,menu=await enterRound(runtime,{recipe:'latte',character:'boy'});
  let start=(await readRuntime(page)).console.length;
  await keyTap(page,'KeyP');await waitForLog(page,e=>e.kind==='screen'&&e.screen==='pause',{start});
  const before=(await readRuntime(page)).room.position;
  await page.waitForTimeout(350);
  assert.deepEqual((await readRuntime(page)).room.position,before,'pause holds the avatar in place');
  await runtime.capture('paused');
  start=(await readRuntime(page)).console.length;
  await keyTap(page,'KeyP');await waitForLog(page,e=>e.kind==='screen'&&e.screen==='play',{start});
  start=(await readRuntime(page)).console.length;
  await page.evaluate(()=>devkit.pad({axes:[.75,0,0,0],buttons:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],active:true}));
  const jump=await waitForLog(page,e=>e.kind==='event'&&e.data.type==='jump',{start,timeout:5000});
  assert.ok(jump.data.vY>0);
  await page.waitForTimeout(250);
  await page.evaluate(()=>devkit.pad(null));
  const padState=await readRuntime(page);
  await runtime.capture('gamepad');
  start=padState.console.length;
  await keyTap(page,'KeyR');
  await waitForLog(page,e=>e.kind==='screen'&&e.screen==='countdown',{start});
  await waitForLog(page,e=>e.kind==='go',{start});
  const idle=await waitForLog(page,e=>e.kind==='result',{start,timeout:15000});
  assert.equal(idle.data.success,false);assert.equal(idle.data.progress,0);
  await runtime.capture('failure-progress');
  const state=await readRuntime(page);
  assert.deepEqual(state.errors,[]);
  report={passed:true,pause:true,resume:true,gamepadJump:jump.data,restart:true,failure:idle.data,
    screenshots:menu.screenshots,frames:state.frames,errors:state.errors,networkFailures:runtime.networkFailures,
    rewards:'Score/item success paths are exercised by legitimate deterministic completions and DevKit finish probes; this smoke test deliberately spills.'};
} catch(error) {report={passed:false,error:error.message,...await readRuntime(runtime.page)};}
finally {await runtime.close();await fs.writeFile('verification/2.2/controls.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,error:report.error},null,2));
if(!report.passed)process.exitCode=1;
