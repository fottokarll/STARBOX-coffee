// Sequential actual DevKit playthroughs; keep a single GPU browser active.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {makeCourse} from '../experience/rules.js';
const directory='verification/2.4';
const jobs=[['espresso','review'],['latte','phone'],['espresso','desktop','--safe'],
  ['latte','phone','--safe'],['espresso','desktop','--stars'],['latte','phone','--stars']];
await fsp.mkdir(directory,{recursive:true});
const results=[];
for(const args of jobs) {
  const [recipe,view,flag]=args,suffix=flag==='--safe'?'-safe':flag==='--stars'?'-stars':'';
  const name=`${recipe}${suffix}-${view}`,reportPath=`${directory}/${name}.json`;
  if(!(process.argv.includes('--remaining')&&name==='espresso-review')) {
    console.log(`Starting ${name}`);
    const log=fs.openSync(`${directory}/${name}.log`,'w');
    try {
      const code=await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,['tools/preview_climb.mjs',...args],{
          env:{...process.env,P0_REPORT_DIR:directory},stdio:['ignore',log,log]});
        child.on('error',reject);child.on('exit',resolve);
      });
      assert.equal(code,0,`${name} failed; inspect ${reportPath} and its log`);
    } finally {fs.closeSync(log);}
  }
  const report=JSON.parse(await fsp.readFile(reportPath,'utf8')),r=report.play.result;
  assert.ok(r?.success,`${name} must finish`);assert.deepEqual(report.state.errors,[]);
  if(flag!=='--safe')assert.ok(r.perfect,`${name} must collect the recipe`);
  if(flag==='--stars')assert.equal(r.bonusStars,makeCourse(recipe).ingredients.filter(i=>!i.required).length);
  results.push({name,success:r.success,perfect:r.perfect,time:r.time,stars:r.bonusStars,
    landed:report.play.landed,errors:report.state.errors});
  await fsp.writeFile(`${directory}/browser-routes.json`,JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results.at(-1)));
}
