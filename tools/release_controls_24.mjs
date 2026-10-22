// STARBOX 2.4: native Chromium contacts in the actual official DevKit.
// Only copied QA observations and ordinary player controls are used.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openRuntime,enterRound,readRuntime,waitForLog,keyTap,settleVisuals} from './devkit_v2.mjs';
import {previewObserver} from './preview_observer.mjs';
import {makeCourse} from '../experience/rules.js';
import {touchLayout} from '../experience/ui-layout.js';

const directory='verification/2.4',checks=[],screens=[];
const limitations=[
  'The current official SDK strips pointer IDs and does not forward pointercancel or a blur event. Contact matching uses the official per-contact x/y and dx/dy.',
  'An OS cancellation without a shell input reset, resize or interruption is not immediately observable through this SDK. This test does not claim an invented cancellation signal.'
];
let runtime,client,report,contacts=new Map();
const W=390,H=844,layout=touchLayout(W,H);
const middle=b=>({x:b.x+b.w/2,y:b.y+b.h/2});
try {
  runtime=await openRuntime({view:'phone',reportDirectory:directory,name:'controls',touch:true,
    entry:process.env.P0_ENTRY||'http://localhost:5500/preview.js',initScript:previewObserver});
  const {page,capture}=runtime;
  await page.evaluate(course=>{window.starboxQaCourse=course;},makeCourse('espresso'));
  const shell=page.frames().find(f=>f.url().includes('/sandbox/devkit/shell.html'));
  assert.ok(shell,'official sandbox frame is present');
  client=await page.context().newCDPSession(shell);
  const metrics=await client.send('Page.getLayoutMetrics');
  let local=(metrics.cssLayoutViewport||metrics.layoutViewport).clientWidth<=400;
  if(!local){await client.detach();client=await page.context().newCDPSession(page);}
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:8});
  await shell.evaluate(()=>{
    window.__starboxNativeAudit=[];
    for(const type of ['blur','focus','pointerdown','pointermove','pointerup','pointercancel','touchcancel'])
      window.addEventListener(type,e=>window.__starboxNativeAudit.push({type:e.type,trusted:e.isTrusted,
        x:e.clientX,y:e.clientY,pointerId:e.pointerId,time:performance.now()}),true);
  });
  async function point(coordinate,id) {
    const box=await page.locator('#device').boundingBox();
    return {x:local?coordinate.x:box.x+coordinate.x/W*box.width,
      y:local?coordinate.y:box.y+coordinate.y/H*box.height,id,radiusX:2,radiusY:2};
  }
  async function down(id,coordinate) {
    const p=await point(coordinate,id);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});contacts.set(id,p);
  }
  async function move(id,coordinate) {
    assert.ok(contacts.has(id),`contact ${id} exists`);const p=await point(coordinate,id);
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});contacts.set(id,p);
  }
  async function up(id,coordinate) {
    if(!contacts.has(id))return;
    const p=coordinate?await point(coordinate,id):contacts.get(id);
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[p]});contacts.delete(id);
  }
  async function release() {for(const id of [...contacts.keys()])await up(id);}
  async function mark() {return (await readRuntime(page)).console.length;}
  async function expectInput(operation,moveValue,jump) {
    const start=await mark();await operation();
    return (await waitForLog(page,e=>e.kind==='input'&&e.data.move===moveValue&&e.data.jump===jump,{start,timeout:8000})).data;
  }
  async function observe(predicate,timeout=15000) {
    const began=Date.now();
    while(Date.now()-began<timeout) {
      const observed=await page.evaluate(()=>window.starboxObserved);
      if(observed&&predicate(observed.run,observed))return observed;
      const state=await readRuntime(page);assert.ok(!state.errors.length,JSON.stringify(state.errors));
      assert.notEqual(state.status,'crashed',state.reason);
      await page.waitForTimeout(35);
    }
    throw new Error(`Copied QA observation timed out: ${predicate.toString()}`);
  }
  async function restart() {
    await release();await page.evaluate(()=>{for(const k of ['Space','KeyA','KeyD','KeyP'])devkit.key(k,false);});
    const start=await mark();await keyTap(page,'KeyR',60);
    await waitForLog(page,e=>e.kind==='go',{start,timeout:20000});
    return observe(r=>r.state==='play'&&r.elapsed<1);
  }
  async function assertNeutralAfterGo(label) {
    await page.waitForTimeout(500);
    const observed=await observe(r=>r.state==='play'&&r.elapsed>.3);
    assert.equal(observed.run.grounded,true,`${label}: no carried jump`);
    assert.ok(Math.abs(observed.run.vY)<.01,`${label}: zero vertical velocity`);
    assert.ok(Math.abs(observed.run.vTheta)<.01,`${label}: zero steering`);
    const start=await mark();
    await waitForLog(page,e=>e.kind==='pose'&&e.data.move===0&&e.data.jump===false,{start,timeout:15000});
    return observed.run;
  }
  await enterRound(runtime,{recipe:'espresso',character:'boy',captureGo:false});
  screens.push(await capture('hud-large-controls'));

  // Edge taps are inside expanded bounds and outside the visible key face.
  const edgeResults=[];
  for(const [id,moveValue,jump] of [['left',-1,false],['right',1,false],['jump',0,true]]) {
    await restart();const b=layout[id],coordinate={x:b.hit.x+1,y:b.y+b.h/2};
    assert.ok(coordinate.x<b.x,'edge is outside the painted key');
    edgeResults.push({id,coordinate,input:await expectInput(()=>down(10,coordinate),moveValue,jump)});
    await expectInput(()=>up(10),0,false);
    checks.push({name:`expanded ${id} target edge outside visible key`,passed:true,result:edgeResults.at(-1)});
  }

  await restart();
  await expectInput(async()=>{await down(20,middle(layout.left));await down(21,middle(layout.jump));},-1,true);
  await expectInput(()=>move(20,middle(layout.right)),1,true);
  await expectInput(()=>move(20,middle(layout.left)),-1,true);
  // Crossing the steering thumb onto JUMP never transfers its steering origin.
  await move(20,{x:layout.jump.x+15,y:layout.jump.y+25});
  await expectInput(()=>up(20,{x:260,y:640}),0,true);
  // Jump-origin contact passes over steering, then releases away from all keys.
  await move(21,middle(layout.right));
  await expectInput(()=>up(21,{x:210,y:610}),0,false);
  checks.push({name:'left/right sliding, crossing origins and off-button releases preserve the other thumb',passed:true});

  for(const [id,moveValue,base] of [['left',-1,30],['right',1,40]]) {
    await restart();const p=middle(layout[id]);
    await expectInput(async()=>{await down(base,{x:p.x-10,y:p.y});await down(base+1,{x:p.x+10,y:p.y});
      await down(base+2,middle(layout.jump));},moveValue,true);
    const start=await mark();await up(base);await page.waitForTimeout(150);
    const released=(await readRuntime(page)).console.slice(start).some(line=>/Coffee Rising: input/.test(String(line))&&String(line).includes('"move":0'));
    assert.equal(released,false,`${id}: first duplicate must not release steering`);
    await expectInput(()=>up(base+1),0,true);await expectInput(()=>up(base+2),0,false);
  }
  checks.push({name:'left and right duplicate-contact reference counts',passed:true});

  await restart();await expectInput(async()=>{await down(50,middle(layout.right));await down(51,middle(layout.jump));},1,true);
  const blankStart=await mark();await down(52,{x:210,y:620});await move(52,{x:190,y:640});await up(52);
  await page.waitForTimeout(150);
  assert.equal((await readRuntime(page)).console.slice(blankStart).some(line=>/Coffee Rising: input/.test(String(line))),false);
  await expectInput(()=>up(51),1,false);await expectInput(()=>up(50),0,false);
  checks.push({name:'blank third-contact release preserves both controls',passed:true});

  // Ordinary keyboard retry from a real coffee failure, held through countdown.
  await restart();let start=await mark();
  const failure=await waitForLog(page,e=>e.kind==='result'&&!e.data.success,{start,timeout:60000});
  screens.push(await capture('failure-quick-retry'));
  start=await mark();await page.evaluate(()=>devkit.key('Space',true));
  await waitForLog(page,e=>e.kind==='screen'&&e.screen==='countdown',{start,timeout:5000});
  await waitForLog(page,e=>e.kind==='go',{start,timeout:20000});
  const keyboardNeutral=await assertNeutralAfterGo('held keyboard retry');
  await page.evaluate(()=>devkit.key('Space',false));await page.waitForTimeout(80);
  await page.evaluate(()=>devkit.key('Space',true));
  const freshKeyboard=await observe(r=>r.state==='play'&&!r.grounded&&r.vY>0,5000);
  await page.evaluate(()=>devkit.key('Space',false));
  checks.push({name:'Space after failure restarts immediately, held retry cannot jump, release/new press jumps',passed:true,
    failure:failure.data,neutral:keyboardNeutral,freshJump:freshKeyboard.run});

  await restart();start=await mark();await waitForLog(page,e=>e.kind==='result'&&!e.data.success,{start,timeout:60000});
  start=await mark();await down(60,middle(layout.jump));
  await waitForLog(page,e=>e.kind==='screen'&&e.screen==='countdown',{start,timeout:5000});
  await waitForLog(page,e=>e.kind==='go',{start,timeout:20000});
  const touchNeutral=await assertNeutralAfterGo('held giant Quick Retry');
  await up(60);await expectInput(()=>down(61,middle(layout.jump)),0,true);
  await observe(r=>r.state==='play'&&!r.grounded&&r.vY>0,5000);await expectInput(()=>up(61),0,false);
  checks.push({name:'giant Quick Retry hold across countdown does not carry jump; fresh contact jumps',passed:true,neutral:touchNeutral});

  // Pause while both controls are physically held, then resume and inspect the
  // simulation's real input diagnostics (inertia may remain while airborne).
  await restart();await expectInput(async()=>{await down(70,middle(layout.left));await down(71,middle(layout.jump));},-1,true);
  start=await mark();await keyTap(page,'KeyP',60);
  await waitForLog(page,e=>e.kind==='screen'&&e.screen==='pause',{start,timeout:5000});
  screens.push(await capture('pause-cleared-controls'));await release();
  start=await mark();await keyTap(page,'KeyP',60);
  await waitForLog(page,e=>e.kind==='screen'&&e.screen==='play',{start,timeout:5000});
  const resumePose=(await waitForLog(page,e=>e.kind==='pose'&&e.data.move===0&&e.data.jump===false,{start,timeout:15000})).data;
  checks.push({name:'pause clears held touch; resume has no held steering or jump',passed:true,resumePose});

  await restart();await expectInput(async()=>{await down(80,middle(layout.right));await down(81,middle(layout.jump));},1,true);
  await page.waitForTimeout(80);start=await mark();
  const nativeAuditStart=await shell.evaluate(()=>window.__starboxNativeAudit.length);
  // Click the parent toolbar/input without changing its value or restarting.
  const parentInput=page.locator('input:not([type]),input[type="text"],input[type="url"]').first();
  let parentClick;
  if(await parentInput.count()&&await parentInput.isVisible()) {
    await parentInput.click({timeout:3000});parentClick='visible parent toolbar input';
  } else {
    const box=await page.locator('#device').boundingBox();
    await page.mouse.click(Math.max(3,box.x-14),Math.max(3,box.y-12));parentClick='parent area above/outside device';
  }
  await page.waitForTimeout(200);
  let audit=await shell.evaluate(n=>window.__starboxNativeAudit.slice(n),nativeAuditStart);
  const nativeBlur=audit.some(e=>e.type==='blur'&&e.trusted);
  let syntheticFallback=false;
  if(!nativeBlur) {
    // Explicitly disclosed synthetic DOM blur exercises the actual official
    // shell's reset handler. No SDK blur event is invented or dispatched.
    syntheticFallback=true;await shell.evaluate(()=>window.dispatchEvent(new Event('blur')));
  }
  await waitForLog(page,e=>e.kind==='screen'&&e.screen==='pause',{start,timeout:5000});
  await observe(r=>r.state==='paused');await release();
  screens.push(await capture('focus-loss-paused'));
  audit=await shell.evaluate(n=>window.__starboxNativeAudit.slice(n),nativeAuditStart);
  start=await mark();await keyTap(page,'KeyP',60);
  await waitForLog(page,e=>e.kind==='screen'&&e.screen==='play',{start,timeout:5000});
  const focusResume=(await waitForLog(page,e=>e.kind==='pose'&&e.data.move===0&&e.data.jump===false,{start,timeout:15000})).data;
  checks.push({name:'shell focus-reset clears contacts and pauses; resume is neutral',passed:true,
    parentClick,nativeBlur,syntheticFallback,audit,focusResume});
  if(syntheticFallback)limitations.push('The parent click did not produce a trusted shell blur in this Chromium run; the focus reset assertion used a recorded synthetic DOM blur on the official shell window.');

  await settleVisuals(page);screens.push(await capture('final-neutral'));
  const state=await readRuntime(page);assert.deepEqual(state.errors,[]);
  report={passed:true,method:'Actual official DevKit preview entry, native Chromium CDP contacts, ordinary DevKit keys; copied p0.hud observations only.',
    viewport:{width:W,height:H},inputTarget:local?'sandbox frame':'root viewport',checks,limitations,screens,
    frames:state.frames,errors:state.errors,networkFailures:runtime.networkFailures,
    nativeAudit:await shell.evaluate(()=>window.__starboxNativeAudit)};
} catch(error) {
  process.exitCode=1;report={passed:false,error:error.message,stack:error.stack,checks,limitations,screens};
  if(runtime)Object.assign(report,{state:await readRuntime(runtime.page).catch(()=>null),networkFailures:runtime.networkFailures});
} finally {
  if(client){for(const point of contacts.values())await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point]}).catch(()=>{});
    await client.detach().catch(()=>{});}
  if(runtime)await runtime.close();
  await fs.mkdir(directory,{recursive:true});await fs.writeFile(`${directory}/controls-phone.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,checks:checks.length,error:report.error,limitations}));
