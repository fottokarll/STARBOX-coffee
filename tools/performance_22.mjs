import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {openRuntime,readRuntime} from './devkit_v2.mjs';

const reports=[];
const baselineDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'starbox-perf-'));
const baselineRoot=path.join(baselineDirectory,'experience');
await fs.cp('experience',baselineRoot,{recursive:true});
for(const name of ['main.js','ui.js','rules.js','barista.js','collectibles.js','environment.js','rewards.js','experience.json'])
  await fs.writeFile(path.join(baselineRoot,name),execFileSync('git',['show',`checkpoint-2.1-before-2.2:experience/${name}`]));
const baselineServer=spawn('python3',['tools/serve.py','--port','5501','--directory',baselineRoot],{stdio:'ignore'});
await new Promise(resolve=>setTimeout(resolve,500));
try {
for(const [version,entry] of [['2.1','http://localhost:5501/main.js'],['2.2','http://localhost:5500/main.js']]) {
  const runtime=await openRuntime({view:'review',entry,reportDirectory:'verification/2.2',name:`performance-${version}`});
  try {
    await runtime.page.waitForTimeout(2500);
    const before=await readRuntime(runtime.page),began=Date.now();
    await runtime.page.waitForTimeout(10000);
    const after=await readRuntime(runtime.page);
    const samples=after.frames.recent.slice().sort((a,b)=>a-b);
    reports.push({version,method:'10-second warmed attract scene at 640x360 on the same GPU browser, sequential runs on a busy shared desktop',
      seconds:(Date.now()-began)/1000,frames:after.frames.count-before.frames.count,
      fps:(after.frames.count-before.frames.count)/((Date.now()-began)/1000),
      medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],
      errors:after.errors,networkFailures:runtime.networkFailures,screenshot:await runtime.capture('title')});
  } finally {await runtime.close();}
}
} finally {baselineServer.kill('SIGTERM');await fs.rm(baselineDirectory,{recursive:true,force:true});}
await fs.writeFile('verification/2.2/performance.json',JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
