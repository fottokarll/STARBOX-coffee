// Ordinary-key full runs in the official DevKit. Milestone observations only
// trigger screenshots; they do not pause, teleport or alter the running game.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {makeCourse} from '../experience/rules.js';
import {openRuntime,enterRound,readRuntime} from './devkit_v2.mjs';
import {previewObserver} from './preview_observer.mjs';
import {driveClimbPreview} from './browser_play_preview.mjs';

const recipe=process.argv[2]||'espresso',view=process.argv[3]||'phone';
const directory=process.env.P0_REPORT_DIR||'verification/2.4.1';
const prefix=process.env.P0_CAMERA_PREFIX||'camera';
const size=process.env.P0_CAMERA_SIZE;
const runtime=await openRuntime({view,reportDirectory:directory,name:`${prefix}-${recipe}`,
  recordVideoDirectory:process.env.P0_VIDEO_DIR,
  size,entry:process.env.P0_ENTRY||'http://localhost:5500/preview.js',initScript:previewObserver});
const screenshots=[],pending=[];
runtime.page.on('console',message=>{
  if(!message.text().startsWith('STARBOX_CAMERA '))return;
  const observed=JSON.parse(message.text().slice(15));
  pending.push((async()=>{
    const screenshot=await runtime.capture(`climb-${Math.round(observed.milestone*100)}`);
    const after=await runtime.page.evaluate(()=>window.starboxObserved?.run);
    screenshots.push({screenshot,trigger:observed,after:{state:after?.state,y:after?.y,
      elapsed:after?.elapsed,progress:after?.y/after?.top,onPlatform:after?.onPlatform}});
  })());
});
try {
  const menu=await enterRound(runtime,{recipe,character:recipe==='latte'?'girl':'boy',captureGo:false});
  await runtime.page.evaluate(course=>{window.starboxQaCourse=course;},makeCourse(recipe));
  await runtime.page.evaluate(()=>{
    const milestones=[.85,.90,.95,.97,.99],seen=new Set();
    window.starboxCameraTimer=setInterval(()=>{
      const run=window.starboxObserved?.run;
      if(!run||run.state!=='play')return;
      const progress=run.y/run.top;
      for(const milestone of milestones)if(progress>=milestone&&!seen.has(milestone)) {
        seen.add(milestone);
        console.log('STARBOX_CAMERA '+JSON.stringify({milestone,progress,y:run.y,theta:run.theta,
          elapsed:run.elapsed,onPlatform:run.onPlatform,grounded:run.grounded}));
      }
    },8);
  });
  const play=await driveClimbPreview(runtime,{recipe,perfect:true,collect:true,start:menu.start,maximumMs:180000});
  await runtime.page.evaluate(()=>clearInterval(window.starboxCameraTimer));
  await Promise.all(pending);await runtime.capture('result');
  const state=await readRuntime(runtime.page);
  const report={recipe,view,deviceBounds:await runtime.page.locator('#device').boundingBox(),
    size:size||(view==='phone'?'390x844':view==='desktop'?'960x640':'640x360'),
    entry:process.env.P0_ENTRY||'http://localhost:5500/preview.js',
    menu,play,screenshots,state,networkFailures:runtime.networkFailures};
  await fs.writeFile(`${directory}/${prefix}-${recipe}-${view}.json`,JSON.stringify(report,null,2)+'\n');
  assert.ok(play.result?.success);assert.ok(play.result?.perfect);assert.deepEqual(state.errors,[]);
  assert.equal(screenshots.length,5,'All upper-course milestones were captured');
  console.log(JSON.stringify({recipe,view,result:play.result,screenshots,errors:state.errors}));
} finally {await runtime.close();}
