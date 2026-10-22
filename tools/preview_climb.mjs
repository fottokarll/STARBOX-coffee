import fs from 'node:fs/promises';
import {openRuntime,enterRound,readRuntime,parseGameLog} from './devkit_v2.mjs';
import {previewObserver} from './preview_observer.mjs';
import {driveClimbPreview} from './browser_play_preview.mjs';
const recipe=process.argv[2]||'espresso',view=process.argv[3]||'desktop',safe=process.argv.includes('--safe'),stars=process.argv.includes('--stars');
const reportDirectory=process.env.P0_REPORT_DIR||'verification/overhaul',suffix=safe?'-safe':stars?'-stars':'';
const runtime=await openRuntime({view,reportDirectory,name:`${recipe}${suffix}`,entry:'http://localhost:5500/preview.js',initScript:previewObserver});
const captures=[],seen=new Set();
runtime.page.on('console',message=>{
  const e=parseGameLog(message.text());
  if(e.kind==='event'&&e.data.type==='land'&&[8,16,24,32,38].includes(e.data.platform)&&!seen.has(e.data.platform)) {
    seen.add(e.data.platform);captures.push(runtime.capture(`climb-${e.data.platform}`));
  }
});
try {
  const menu=await enterRound(runtime,{recipe,character:recipe==='latte'?'girl':'boy',captureGo:false});
  const play=await driveClimbPreview(runtime,{recipe,perfect:true,safe,stars,collect:!safe,start:menu.start,maximumMs:180000});
  await runtime.capture('result');
  await Promise.all(captures);
  const state=await readRuntime(runtime.page);
  const report={menu,play,state,networkFailures:runtime.networkFailures};
  await fs.writeFile(`${reportDirectory}/${recipe}${suffix}-${view}.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({recipe,result:play.result,landed:play.landed,errors:state.errors}));
  if(!play.result?.success||!safe&&!play.result?.perfect||state.errors.length)process.exitCode=1;
} finally {await runtime.close();}
