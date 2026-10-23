import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {isolateSDK,checkpoints,restoreCheckpoint,snapshot,coffee,setCoffeeMode,developerCoffeeY} from '../tools/developer/session.mjs';
import {createRun} from '../experience/rules.js';

const pythonEnv={...process.env,PYTHONHOME:'',PYTHONPATH:''};

test('private SDK refuses every reward/persistence route and hides saved progression',async()=>{
  const realCalls=[];
  const sdk={saved:{starbox:{bests:{latte:'real'}}},table:[{score:100}],
    score:()=>realCalls.push('score'),win:()=>realCalls.push('win'),save:()=>realCalls.push('save'),
    items:{owned:[{id:1}],give:()=>realCalls.push('item')},
    me:{position:{clone:()=>({set(){realCalls.push('private-position');}})}},
    on:(event)=>realCalls.push(event),hud:()=>realCalls.push('hud')};
  const isolated=isolateSDK(sdk),p0=isolated.sdk;
  assert.equal((await p0.score(100)).ok,false);assert.equal((await p0.win()).ok,false);
  assert.equal((await p0.items.give('card')).ok,false);assert.equal((await p0.save({progress:999})).ok,false);
  assert.equal(p0.saved,null);assert.deepEqual(p0.table,[]);assert.deepEqual(p0.items.owned,[]);
  p0.on('reward',()=>{});p0.on('table',()=>{});
  for(const key of ['shop','duel','quests','prize','boards','notes','room','send','entities'])
    assert.throws(()=>p0[key],/denied/);
  assert.throws(()=>{p0.saved={progress:10};},/denied/);
  assert.deepEqual(realCalls,[]);
  assert.deepEqual(isolated.blocked,['score','win','items.give','save']);
  p0.hud('private');assert.deepEqual(realCalls,['hud']);
});

test('authored sections include both recipes, all bypasses, bonus pockets and finish',()=>{
  for(const recipe of ['espresso','latte']){
    const run=createRun(recipe),points=checkpoints(run),ids=new Set(points.map(p=>p.id));
    assert.equal(points[0].id,0);assert.ok(ids.has(run.finishPlatform));
    for(const route of [...run.biscuitAlternates,...run.returnBranches])for(const id of route.pads)assert.ok(ids.has(id));
    for(const fork of run.forks)assert.ok(ids.has(fork.pad));
    for(const point of points){assert.equal(point.y,run.platforms[point.id].y);assert.ok(point.label);}
    run.collected.bean=2;run.result={score:999};run.state='results';
    Object.assign(run.platforms.find(p=>p.kind==='biscuit'),{collapsed:true,crumbleTimer:0});
    restoreCheckpoint(run,run.forks[0].pad,{resetSection:true});
    assert.equal(run.theta,run.platforms[run.forks[0].pad].angle);assert.equal(run.state,'play');
    assert.equal(run.result,null);assert.equal(run.collected.bean,2);assert.ok(run.platforms.every(p=>!p.collapsed));
    const data=snapshot(run);data.beans[0]=99;data.biscuits[0].collapsed=true;
    assert.equal(run.collected.bean,2);assert.ok(run.platforms.every(p=>!p.collapsed));
  }
});

test('coffee freezes, disappears below the floor and resumes from the held level',()=>{
  const run=createRun('espresso');coffee.mode='frozen';coffee.y=-3;coffee.elapsed=0;
  run.elapsed=300;assert.equal(developerCoffeeY(run,1.18),-3);
  setCoffeeMode('rising',run,1.18);run.elapsed+=10;assert.ok(Math.abs(developerCoffeeY(run,1.18)-8.8)<1e-9);
  setCoffeeMode('frozen',run,1.18);run.elapsed+=100;assert.ok(Math.abs(developerCoffeeY(run,1.18)-8.8)<1e-9);
  setCoffeeMode('disabled',run,1.18);assert.equal(developerCoffeeY(run,1.18),-6);
  setCoffeeMode('rising',run,1.18);assert.ok(Math.abs(developerCoffeeY(run,1.18)-8.8)<1e-9);
});

test('staged tester cannot finish, fail, score or save; public source and package stay clean',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'starbox-developer-test-')),destination=join(temporary,'experience');
  const publicRules=await readFile('experience/rules.js');
  try {
    await writeFile(join(temporary,'package.json'),' {"type":"module"}\n');
    execFileSync('python3',['tools/developer/stage.py','--out',destination],{env:pythonEnv});
    assert.notDeepEqual(await readFile(join(destination,'assets/polish/milo.webp')),await readFile('experience/assets/polish/milo.webp'));
    const stagedRules=await import(pathToFileURL(join(destination,'developer-rules.js')));
    const stagedSession=await import(pathToFileURL(join(destination,'developer-session.js')));
    for(const recipe of ['espresso','latte']){
      const run=stagedRules.createRun(recipe);run.state='play';stagedSession.coffee.mode='frozen';stagedSession.coffee.y=-3;
      for(let n=0;n<500;n++)stagedRules.step(run,{},.25);
      assert.equal(run.state,'play');assert.equal(run.result,null);assert.equal(run.coffeeY,-3);
      restoreCheckpoint(run,run.finishPlatform);
      stagedRules.step(run,{},.1);
      assert.equal(run.state,'play');assert.equal(run.result,null);
      assert.ok(run.events.every(event=>!['finish','fail'].includes(event.type)));
      run.y=-100;run.grounded=false;run.onPlatform=-1;
      stagedRules.step(run,{},.1);assert.equal(run.state,'play');assert.equal(run.result,null);
    }
    const main=await readFile(join(destination,'main.js'),'utf8');
    assert.doesNotMatch(main,/p0\.(?:score|win|save)\(|p0\.items\.give\(/);
    assert.match(main,/developer\.step/);
    assert.deepEqual(await readFile('experience/rules.js'),publicRules);
    assert.doesNotMatch(await readFile('experience/main.js','utf8'),/developer\.js|developer:|createDeveloper/);
    execFileSync('python3',['tools/package_release.py','--out',join(temporary,'public.zip')],{env:pythonEnv});
    const audit=execFileSync('python3',['-c',
      'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); bad=[n for n in z.namelist() if "developer" in n.lower() or "private" in n.lower()]; assert not bad,bad; assert b"createDeveloper" not in z.read("main.js"); assert z.read("assets/polish/milo.webp") != open("tools/developer/assets/milo.webp","rb").read(); print(len(z.namelist()))',
      join(temporary,'public.zip')],{env:pythonEnv,encoding:'utf8'});
    assert.ok(Number(audit)>10);
    const refused=execFileSync('python3',['-c',
      'import importlib.util,pathlib; p=pathlib.Path("tools/developer/stage.py"); s=importlib.util.spec_from_file_location("stage",p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m);\ntry: m.build(pathlib.Path("experience"))\nexcept ValueError: pass\nelse: raise AssertionError("must refuse public tree")'],{env:pythonEnv});
    assert.equal(refused.length,0);
  } finally {await rm(temporary,{recursive:true,force:true});}
});
