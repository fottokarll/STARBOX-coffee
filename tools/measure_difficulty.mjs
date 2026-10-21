// Compare tagged 2.1 and current rules with the same binary-input route pilot.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as current from '../experience/rules.js';
import {climb} from './route_pilot.mjs';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'starbox-baseline-'));
try {
  const oldPath = path.join(dir, 'rules.mjs');
  await fs.writeFile(oldPath, execFileSync('git', ['show', 'checkpoint-2.1-before-2.2:experience/rules.js']));
  const baseline = await import(pathToFileURL(oldPath));
  const report = {method: 'Same binary steering/jump pilot for both engines; no teleportation or synthetic pickups. Logical metres at radius 5.', versions: {}};
  for (const [version, rules] of [['2.1', baseline], ['2.2', current]]) {
    report.versions[version] = {};
    for (const recipe of Object.keys(rules.RECIPES)) {
      const course = rules.makeCourse(recipe), def = rules.RECIPES[recipe];
      const arcs = course.mainPath.slice(1).map(id => Math.abs(course.platforms[id].angle - course.platforms[id - 1].angle) * rules.RADIUS);
      const gaps = course.mainPath.slice(1).map(id => Math.max(0, arcs[id - 1] - (course.platforms[id].halfWidth + course.platforms[id - 1].halfWidth) * rules.RADIUS));
      const runs = {};
      for (const [name, options] of Object.entries({perfect: {}, direct: {collect:false}, timber: {safe:true, collect:false}, deliberate: {hesitation:.12}, hesitant: {hesitation:.25}})) {
        const out = climb(recipe, {...options, rules});
        runs[name] = {seconds: out.run.elapsed, success: out.run.result?.success, quality: out.run.result?.quality,
          minimumClearance: out.minimumClearance, finishClearance: out.run.y - out.run.coffeeY,
          jumps: out.events.filter(e => e.type === 'jump').length,
          bestProgress: out.run.result?.progress ?? Math.min(1,out.run.bestHeight/out.run.top)};
      }
      report.versions[version][recipe] = {mainPlatforms: course.mainPath.length, top: course.top, switchbacks: course.forks.length,
        centreArcMetres: arcs.reduce((a,b)=>a+b,0), meanCentreJump: arcs.reduce((a,b)=>a+b,0)/arcs.length,
        maxCentreJump: Math.max(...arcs), maxEdgeGap: Math.max(...gaps),
        minimumLandingWidth: Math.min(...course.mainPath.map(id=>course.platforms[id].halfWidth*2*rules.RADIUS)),
        coffeeRise: def.rise, grace: def.grace ?? 4, idleDeadline: (def.grace ?? 4)+2.92/def.rise,
        summitDeadline: (def.grace ?? 4)+(course.top+2.92)/def.rise, runs};
    }
  }
  const output = process.argv[2] || 'verification/2.2/difficulty.json';
  await fs.writeFile(output, JSON.stringify(report, null, 2)+'\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await fs.rm(dir, {recursive:true,force:true}); }
