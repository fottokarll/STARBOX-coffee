import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as rules from '../experience/rules.js';
import {climb} from './route_pilot.mjs';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'starbox-balance-'));
const oldRules=path.join(dir,'rules.mjs'),oldPilot=path.join(dir,'pilot.mjs');
await fs.writeFile(oldRules,execFileSync('git',['show','checkpoint-2.2-before-overhaul:experience/rules.js']));
await fs.writeFile(oldPilot,execFileSync('git',['show','checkpoint-2.2-before-overhaul:tools/route_pilot.mjs'],{encoding:'utf8'}).replace("'../experience/rules.js'",JSON.stringify(pathToFileURL(oldRules).href)));
const baseline=await import(pathToFileURL(oldRules)),pilot=await import(pathToFileURL(oldPilot));
const results=[];
try {
for(const [version,engine,drive]of[['2.2',baseline,pilot.climb],['preview',rules,climb]])for(const recipe of['espresso','latte']) {
  const course=engine.makeCourse(recipe),jumps=course.mainPath.slice(1).map((id,i)=>{
    const a=course.platforms[course.mainPath[i]],b=course.platforms[id];
    return {from:a.id,to:b.id,centerMetres:Math.abs(engine.angleDistance(b.angle,a.angle))*5,
      clearGapMetres:Math.max(0,(Math.abs(engine.angleDistance(b.angle,a.angle))-a.halfWidth-b.halfWidth)*5),rise:b.y-a.y};
  });
  const main=drive(recipe,{rules:engine}),safe=drive(recipe,{rules:engine,safe:true,collect:false});
  results.push({version,recipe,platforms:course.platforms.length,mainPlatforms:course.mainPath.length,top:course.top,
    coffee:engine.RECIPES[recipe],perfectSeconds:main.run.elapsed,perfect:main.run.result.perfect,
    safeSeconds:safe.run.elapsed,safeSuccess:safe.run.result.success,
    totalCircumferentialMetres:jumps.reduce((s,j)=>s+j.centerMetres,0),largestClearGap:Math.max(...jumps.map(j=>j.clearGapMetres)),
    largestRise:Math.max(...jumps.map(j=>j.rise)),mainCeilingContacts:main.events.filter(e=>e.type==='contact'&&e.axis===1&&e.normal<0).length,jumps});
}
await fs.writeFile('verification/overhaul/difficulty.json',JSON.stringify(results,null,2)+'\n');
console.table(results.map(({version,recipe,platforms,top,perfectSeconds,safeSeconds,largestClearGap})=>({version,recipe,platforms,top,perfectSeconds,safeSeconds,largestClearGap})));
} finally {await fs.rm(dir,{recursive:true,force:true});}
