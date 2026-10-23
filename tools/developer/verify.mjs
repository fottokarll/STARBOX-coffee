// Actual official DevKit inputs exercise the isolated local tester.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {openRuntime,readRuntime,keyTap} from '../devkit_v2.mjs';
import {createRun} from '../../experience/rules.js';
import {checkpoints} from './session.mjs';

const directory=process.env.P0_REPORT_DIR||'verification/2.4.1/developer',checks=[],screens=[];
let runtime,report;
try {
  runtime=await openRuntime({view:'phone',size:'390x844',touch:true,name:'developer',reportDirectory:directory,
    entry:process.env.P0_ENTRY||'http://localhost:5502/developer-entry.js'});
  const {page,capture}=runtime;
  function parse(line){const value=String(line),start=value.indexOf('{');
    return value.includes('STARBOX PRIVATE DEVELOPER')&&start>=0?JSON.parse(value.slice(start)):null;}
  function hud(state) {const values=Array.isArray(state.hud)?state.hud:[state.hud];const text=values.findLast(value=>String(value).startsWith('STARBOX_PRIVATE '));return text?JSON.parse(String(text).slice(16)):null;}
  async function inspect() {
    const before=hud(await readRuntime(page))?.serial||0;
    await keyTap(page,'KeyI',40);
    for(let n=0;n<100;n++){
      const state=await readRuntime(page);assert.equal(state.status,'started',state.reason);assert.deepEqual(state.errors,[]);
      const data=hud(state);
      if(data&&data.serial>before){assert.deepEqual(data.blocked,[]);return data;}
      await page.waitForTimeout(50);
    }
    throw new Error('Developer inspection did not arrive');
  }
  await page.waitForTimeout(900);
  const initial=await inspect();assert.equal(initial.recipe,'latte');assert.equal(initial.coffeeMode,'frozen');
  checks.push({name:'local tester boots with frozen coffee, private state and zero attempted side effects',passed:true,initial});
  screens.push(await capture('private-tester'));

  await keyTap(page,'KeyC',40);assert.equal((await inspect()).coffeeMode,'disabled');
  await keyTap(page,'KeyC',40);const rising=await inspect();await page.waitForTimeout(1300);
  const risen=await inspect();assert.ok(risen.coffeeY>rising.coffeeY+.2);
  await keyTap(page,'KeyC',40);const frozen=await inspect();await page.waitForTimeout(900);
  assert.equal((await inspect()).coffeeY,frozen.coffeeY);
  checks.push({name:'keyboard coffee disable, resume and freeze',passed:true,rising,risen,frozen});

  await keyTap(page,'BracketRight',40);const section=await inspect();assert.ok(section.y>0);
  await keyTap(page,'KeyG',40);await page.evaluate(()=>devkit.key('KeyE',true));await page.waitForTimeout(1000);
  await page.evaluate(()=>devkit.key('KeyE',false));const flown=await inspect();assert.ok(flown.flight);assert.ok(flown.y>section.y+1);
  await keyTap(page,'KeyG',40);await keyTap(page,'KeyT',40);const restarted=await inspect();assert.equal(restarted.platform,section.platform);
  checks.push({name:'checkpoint navigation, unrestricted flight and section restart',passed:true,section,flown,restarted});

  for(const recipe of ['espresso','latte']){
    await keyTap(page,recipe==='espresso'?'Digit1':'Digit2',40);await page.waitForTimeout(500);
    let state=await inspect();assert.equal(state.recipe,recipe);
    const points=checkpoints(createRun(recipe));
    for(let n=0;n<points.length-1;n++){await keyTap(page,'BracketRight',40);await page.waitForTimeout(75);}
    state=await inspect();assert.equal(state.platform,createRun(recipe).finishPlatform);assert.equal(state.state,'play');
    assert.ok(state.private);assert.deepEqual(state.blocked,[]);
    screens.push(await capture(`${recipe}-finish-unlimited`));
    checks.push({name:`${recipe} finish remains unlimited and unrewarded`,passed:true,state});
  }

  // Native Chromium touch passes through the real shell and SDK to the private button.
  const shell=page.frames().find(frame=>frame.url().includes('/sandbox/devkit/shell.html'));
  assert.ok(shell);let client=await page.context().newCDPSession(shell);
  const metrics=await client.send('Page.getLayoutMetrics');
  const local=(metrics.cssLayoutViewport||metrics.layoutViewport).clientWidth<=400;
  if(!local){await client.detach();client=await page.context().newCDPSession(page);}
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await shell.evaluate(()=>{window.__developerTouchAudit=[];window.addEventListener('pointerdown',e=>window.__developerTouchAudit.push({trusted:e.isTrusted,x:e.clientX,y:e.clientY}),true);});
  const box=await page.locator('#device').boundingBox(),x=100,y=258;
  const point={id:1,x:local?x:box.x+x/390*box.width,y:local?y:box.y+y/844*box.height,radiusX:2,radiusY:2};
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point]});
  const touched=await inspect();assert.equal(touched.coffeeMode,'disabled');
  const audit=await shell.evaluate(()=>window.__developerTouchAudit);assert.ok(audit.some(event=>event.trusted));
  await client.detach();checks.push({name:'native trusted touch operates private coffee control through official SDK',passed:true,audit});
  await keyTap(page,'F2',40);screens.push(await capture('panel-hidden-private-ribbon'));
  const final=await readRuntime(page);
  assert.equal(final.console.some(line=>/Coffee Rising: result|weekly score|Perfect Coffee card/.test(String(line))),false);
  report={passed:true,checks,screens,status:final.status,errors:final.errors,networkFailures:runtime.networkFailures,summary:final.summary,
    limitation:'Private checkpoint/flight verification is not an ordinary gameplay playthrough. No public owner gating was added because the SDK has no documented trusted owner check.'};
} catch(error){report={passed:false,error:error.stack,checks,screens,networkFailures:runtime?.networkFailures||[],runtimeState:runtime?await readRuntime(runtime.page):null};process.exitCode=1;}
finally {await fs.mkdir(directory,{recursive:true});await fs.writeFile(`${directory}/developer-report.json`,JSON.stringify(report,null,2)+'\n');await runtime?.close();}
console.log(JSON.stringify({passed:report.passed,checks:checks.map(check=>check.name),error:report.error},null,2));
