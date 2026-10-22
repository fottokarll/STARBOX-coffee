// Comparable unmodified runtime captures. Only ordinary player inputs are used.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openRuntime,enterRound,readRuntime,waitForLog,keyTap} from './devkit_v2.mjs';

const stage=process.argv[2]||'after';
const entry=process.argv[3]||'http://localhost:5500/main.js';
const reports=[];
for(const view of ['review','phone','desktop']) {
  const runtime=await openRuntime({view,entry,reportDirectory:'verification/2.4',name:stage});
  try {
    await runtime.page.waitForTimeout(2000);
    let performance=null;
    if(view==='review') {
      const before=await readRuntime(runtime.page),began=Date.now();
      await runtime.page.waitForTimeout(10000);
      const after=await readRuntime(runtime.page),seconds=(Date.now()-began)/1000;
      const times=after.frames.recent.slice().sort((a,b)=>a-b);
      performance={seconds,frames:after.frames.count-before.frames.count,
        fps:(after.frames.count-before.frames.count)/seconds,
        medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],
        method:'Warmed 10-second 640x360 attract scene, same GPU Chromium, sequential shared-desktop sample'};
    }
    const menu=await enterRound(runtime,{recipe:'espresso',character:'girl',captureGo:true});
    const start=(await readRuntime(runtime.page)).console.length;
    await runtime.page.evaluate(()=>{devkit.key('KeyD',true);devkit.key('Space',true);});
    await runtime.page.waitForTimeout(420);
    await runtime.page.evaluate(()=>devkit.key('KeyD',false));
    await runtime.page.waitForTimeout(200);
    await runtime.page.evaluate(()=>devkit.key('Space',false));
    const landing=await waitForLog(runtime.page,e=>e.kind==='event'&&e.data.type==='land'&&e.data.platform>0,{start,timeout:10000});
    const screenshot=await runtime.capture('gameplay');
    await keyTap(runtime.page,'KeyP');
    const state=await readRuntime(runtime.page);
    assert.deepEqual(state.errors,[]);
    reports.push({stage,view,entry,performance,menu,landing,screenshot,errors:state.errors,networkFailures:runtime.networkFailures});
  } finally {await runtime.close();}
}
await fs.writeFile(`verification/2.4/${stage}-visuals.json`,JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports.map(({stage,view,performance,errors})=>({stage,view,performance,errors})),null,2));
