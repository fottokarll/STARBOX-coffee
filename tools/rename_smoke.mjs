// Ordinary-input smoke checks for the text-only COFFEE PANIC! rename.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {openRuntime,enterRound,readRuntime,keyTap,waitForLog} from './devkit_v2.mjs';

const directory='verification/rename',reports=[];
for(const view of ['phone','desktop']) {
  const runtime=await openRuntime({view,reportDirectory:directory,name:'rename-smoke'});
  try {
    const menu=await enterRound(runtime,{recipe:'espresso',character:view==='phone'?'boy':'girl'});
    const before=(await readRuntime(runtime.page)).console.length;
    await runtime.page.evaluate(()=>{devkit.key('KeyD',true);devkit.key('Space',true);});
    await runtime.page.waitForTimeout(420);
    await runtime.page.evaluate(()=>devkit.key('KeyD',false));
    await runtime.page.waitForTimeout(300);
    await runtime.page.evaluate(()=>devkit.key('Space',false));
    await waitForLog(runtime.page,event=>event.kind==='event'&&event.data?.type==='jump',{start:before});
    await waitForLog(runtime.page,event=>event.kind==='event'&&event.data?.type==='land',{start:before});
    await keyTap(runtime.page,'KeyP');
    await waitForLog(runtime.page,event=>event.kind==='screen'&&event.screen==='pause',{start:before});
    const screenshot=await runtime.capture('jump-land-pause'),state=await readRuntime(runtime.page);
    assert.deepEqual(state.errors,[]);
    assert.ok(state.console.some(line=>String(line).includes('COFFEE PANIC! 2.4.1 ready:')));
    reports.push({view,passed:true,menu,screenshot,state,networkFailures:runtime.networkFailures});
  } finally {await runtime.close();}
}
await fs.writeFile(`${directory}/smoke.json`,JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports.map(({view,passed})=>({view,passed}))));
