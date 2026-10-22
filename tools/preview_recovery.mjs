import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openRuntime,enterRound,keyTap,waitForLog,readRuntime} from './devkit_v2.mjs';
import {previewObserver} from './preview_observer.mjs';
import {driveClimbPreview} from './browser_play_preview.mjs';
import {makeCourse} from '../experience/rules.js';
const reportDirectory=process.env.P0_REPORT_DIR||'verification/overhaul';
const runtime=await openRuntime({view:'review',entry:'http://localhost:5500/preview.js',initScript:previewObserver,reportDirectory,name:'recovery'});
let report;
try {
  const {page,capture}=runtime,menu=await enterRound(runtime,{recipe:'espresso',captureGo:false});
  await page.evaluate(()=>devkit.key('KeyD',true));
  await page.waitForTimeout(600);
  const side=await page.evaluate(()=>starboxObserved.run);
  assert.ok(side.theta<=.2750001&&side.theta>.26);assert.equal(side.grounded,true);
  const screenshot=await capture('side-contact');
  await page.evaluate(()=>devkit.key('KeyD',false));
  const start=(await readRuntime(page)).console.length;
  await keyTap(page,'KeyR');await waitForLog(page,e=>e.kind==='go',{start});
  const approach=await driveClimbPreview(runtime,{recipe:'espresso',path:makeCourse('espresso').mainPath,collect:false,stopAtPlatform:6});assert.equal(approach.stoppedAt,6);
  const retreat=await driveClimbPreview(runtime,{recipe:'espresso',path:[6,5],collect:false,stopAtPlatform:5});assert.equal(retreat.stoppedAt,5);
  await page.waitForFunction(()=>starboxObserved.run.platforms[6].collapsed,{timeout:5000});
  const broken=await page.evaluate(()=>starboxObserved.run.platforms[6]);
  await page.waitForFunction(()=>!starboxObserved.run.platforms[6].collapsed,{timeout:10000});
  const restored=await page.evaluate(()=>starboxObserved.run.platforms[6]);
  assert.equal(restored.crumbleTimer,null);
  const returnJump=await driveClimbPreview(runtime,{recipe:'espresso',path:[5,6],collect:false,stopAtPlatform:6});assert.equal(returnJump.stoppedAt,6);
  assert.ok(returnJump.finalSnapshot.run.platforms[6].crumbleTimer>0);
  assert.equal(returnJump.finalSnapshot.run.state,'play');
  const after=await capture('restored-biscuit');
  const state=await readRuntime(page);assert.deepEqual(state.errors,[]);
  report={passed:true,method:'Ordinary DevKit keys and read-only QA observations. Real side obstruction, collapse, retreat, timed regeneration and relanding.',
    side:{theta:side.theta,y:side.y,grounded:side.grounded},broken,restored,approach,retreat,returnJump,screenshots:[screenshot,after],errors:state.errors};
} catch(error){report={passed:false,error:error.message,...await readRuntime(runtime.page)};process.exitCode=1;}
finally{await runtime.close();await fs.writeFile(`${reportDirectory}/recovery.json`,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,error:report.error}));
