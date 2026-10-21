// V2 verification uses the official Project 0 sandbox and ordinary inputs only.
// No game-state mutation, secret injection, TLS bypass, or external asset proxy.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium,request}=require('playwright');
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const defaultReports=path.join(projectRoot,'verification/2.2');

export function parseGameLog(line) {
  const text=String(line);
  const objectStart=text.indexOf('{');
  let data=null;
  if(objectStart>=0) {
    try {data=JSON.parse(text.slice(objectStart));} catch { /* ordinary text */ }
  }
  if(/Coffee Rising.*result/.test(text))return {kind:'result',data,text};
  if(/Coffee Rising.*pose/.test(text))return {kind:'pose',data,text};
  if(/Coffee Rising.*input/.test(text))return {kind:'input',data,text};
  if(/Coffee Rising.*event/.test(text)&&data?.type)return {kind:'event',data,text};
  const namedEvent=/Coffee Rising:\s*(jump|land|collect|crumbleStart|crumble|collapse|reform)\b/.exec(text)?.[1];
  if(namedEvent)return {kind:'event',data:{...data,type:namedEvent},text};
  if(/Coffee Rising.*\bGO\b/.test(text))return {kind:'go',data,text};
  const screen=/Coffee Rising.*screen[ :]+([a-z]+)/i.exec(text)?.[1];
  if(screen)return {kind:'screen',screen,data,text};
  return {kind:'other',data,text};
}

export async function readRuntime(page) {
  return page.evaluate(()=>({
    status:devkit.status,reason:devkit.reason,summary:devkit.summary(),
    frames:devkit.frames,console:devkit.console,errors:devkit.errors,
    hud:devkit.hud,room:devkit.room,
  }));
}

export async function waitForLog(page,predicate,{start=0,timeout=90000}={}) {
  const began=Date.now();
  while(Date.now()-began<timeout) {
    const state=await readRuntime(page);
    const match=state.console.slice(start).map(parseGameLog).find(predicate);
    if(match)return match;
    if(state.status==='crashed'||state.status==='exited')throw new Error(state.reason||state.status);
    await page.waitForTimeout(80);
  }
  throw new Error(`No expected game event after ${timeout} ms`);
}

export async function keyTap(page,code,milliseconds=110) {
  await page.evaluate(({code,milliseconds})=>devkit.press(code,milliseconds),{code,milliseconds});
}

export async function settleVisuals(page) {
  const before=await page.evaluate(()=>devkit.frames.count);
  await page.waitForFunction(count=>devkit.frames.count>=count+2,before,{timeout:6000}).catch(()=>{});
}

async function localServerExists(port) {
  return new Promise(resolve=>{
    const probe=http.get(`http://127.0.0.1:${port}/experience.json`,response=>{
      response.resume();resolve(response.statusCode===200);
    });
    probe.on('error',()=>resolve(false));probe.setTimeout(1200,()=>probe.destroy());
  });
}

export async function openRuntime(options={}) {
  const view=options.view||'review';
  const reportDirectory=options.reportDirectory||defaultReports;
  await fs.mkdir(reportDirectory,{recursive:true});
  const proxyServer=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
  const networkFailures=[],logs=[];
  let ownedServer=null;
  if(!await localServerExists(5500)) {
    ownedServer=spawn('python3',[path.join(projectRoot,'tools/serve.py')],{stdio:'ignore'});
    for(let i=0;i<30&&!await localServerExists(5500);i++)await new Promise(resolve=>setTimeout(resolve,100));
    if(!await localServerExists(5500))throw new Error('Local CORS server did not start on port5500');
  }
  const browser=await chromium.launch({
    executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:process.env.P0_HEADLESS!=='0',
    proxy:proxyServer?{server:proxyServer,bypass:'localhost,127.0.0.1'}:undefined,
    args:['--no-sandbox',...(process.env.P0_HEADLESS==='0'?['--ignore-gpu-blocklist']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']),
      ...(options.touch?['--disable-features=SyntheticPointerActions']:[])],
  });
  const context=await browser.newContext({
    permissions:['local-network-access'],viewport:{width:1440,height:1120},
  });
  // API transport verifies TLS using the managed Node CA and session proxy.
  // This avoids changing the user's Chromium NSS database outside the workspace.
  const transport=await request.newContext({
    proxy:proxyServer?{server:proxyServer,bypass:'localhost,127.0.0.1'}:undefined,
    userAgent:'curl/8.0',
  });
  const immutableResponses=new Map();
  await context.route('https://project0.city/**',async route=>{
    const incoming=route.request(),url=new URL(incoming.url());
    const immutable=incoming.method()==='GET'&&(
      url.pathname.startsWith('/assets/')||url.pathname.startsWith('/sandbox/three-r186/')||
      (url.pathname.startsWith('/sandbox/')&&url.searchParams.has('v'))
    );
    try {
      if(immutable&&immutableResponses.has(url.href)) {
        await route.fulfill(immutableResponses.get(url.href));return;
      }
      const response=await transport.fetch(incoming);
      if(immutable&&response.ok()) {
        const headers={...response.headers()};
        delete headers['content-encoding'];delete headers['content-length'];delete headers['transfer-encoding'];
        const cached={status:response.status(),headers,body:await response.body()};
        immutableResponses.set(url.href,cached);await route.fulfill(cached);
      } else await route.fulfill({response});
    } catch(error) {
      networkFailures.push({url:url.href,error:error.message});
      await route.abort('failed').catch(()=>{});
    }
  });
  const page=await context.newPage();
  page.on('console',message=>{
    logs.push(`${message.type()}: ${message.text()}`);
    if(/Coffee Rising|\[devkit\]|V2 native audit/.test(message.text()))console.log(message.text());
  });
  page.on('pageerror',error=>logs.push(`pageerror: ${error.message}`));
  page.on('requestfailed',incoming=>networkFailures.push({
    url:incoming.url(),error:incoming.failure()?.errorText,
  }));
  const close=async()=>{
    await browser.close().catch(()=>{});await transport.dispose().catch(()=>{});
    if(ownedServer)ownedServer.kill('SIGTERM');
  };
  const capture=async label=>{
    const destination=path.join(reportDirectory,`${options.name||'v2'}-${view}-${label}.png`);
    await page.locator('#device').screenshot({path:destination});return destination;
  };
  try {
    const url=new URL('https://project0.city/devkit');
    url.search=new URLSearchParams({
      entry:options.entry||'http://localhost:5500/main.js',width:'12',depth:'19',height:'12',
      // phone=1 unconditionally adds the devkit's own city stick even when the
      // manifest says stick:false. An explicit phone-sized viewport plus native
      // CDP touch tests the game's intended touch controls without that overlay.
      players:'1',slow:'1',size:view==='phone'?'390x844':view==='desktop'?'960x640':'640x360',
    }).toString();
    await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>Boolean(window.devkit),{timeout:30000});
    let status=await page.evaluate(()=>devkit.wait());
    if(status==='loading')status=await page.evaluate(()=>devkit.wait());
    for(const frame of page.frames()) {
      const closeButton=frame.locator('#xclose');
      if(await closeButton.count()&&await closeButton.isVisible())await closeButton.click();
    }
    const state=await readRuntime(page);
    if(status!=='started')throw new Error(`Sandbox ${status}: ${state.reason||'startup did not finish'}`);
    return {page,context,browser,transport,capture,close,logs,networkFailures,reportDirectory,view};
  } catch(error) {
    await page.screenshot({path:path.join(reportDirectory,`${options.name||'v2'}-${view}-startup-error.png`)}).catch(()=>{});
    await close();throw error;
  }
}

// Menu keys are normal player controls. Root's V2 UI provides these transitions.
export async function enterRound(runtime,options={}) {
  const {page,capture}=runtime;
  const recipe=options.recipe||'espresso',character=options.character||'boy';
  const start=(await readRuntime(page)).console.length;
  const screenshots=[await capture('title')];
  await keyTap(page,'Space');
  await waitForLog(page,event=>event.kind==='screen'&&event.screen==='order',{start});
  await keyTap(page,recipe==='espresso'?'Digit1':'Digit2');
  await settleVisuals(page);
  screenshots.push(await capture('order'));
  await keyTap(page,'Space');
  await waitForLog(page,event=>event.kind==='screen'&&event.screen==='character',{start});
  await keyTap(page,character==='boy'?'Digit1':'Digit2');
  await settleVisuals(page);
  screenshots.push(await capture(`character-${character}`));
  await keyTap(page,'Space');
  await waitForLog(page,event=>event.kind==='go',{start,timeout:90000});
  if(options.captureGo!==false)screenshots.push(await capture('go'));
  return {recipe,character,start,screenshots};
}

async function cli() {
  const argv=process.argv.slice(2);
  const value=(flag,fallback)=>argv.includes(flag)?argv[argv.indexOf(flag)+1]:fallback;
  const view=value('--view','review'),mode=value('--mode','smoke');
  const name=value('--name',`v2-${mode}`);
  const recipe=value('--recipe','espresso'),character=value('--character','boy');
  const perfect=value('--route','main')==='perfect';
  const safe=value('--route','main')==='safe';
  const reportDirectory=process.env.P0_V2_REPORT_DIR||defaultReports;
  await fs.mkdir(reportDirectory,{recursive:true});
  const lockPath=path.join(reportDirectory,'browser.lock');
  const lock=await fs.open(lockPath,'wx').catch(()=>{throw new Error('Another V2 browser verification holds browser.lock');});
  await lock.writeFile(String(process.pid));
  let runtime=null,report;
  try {
    runtime=await openRuntime({view,name,reportDirectory,touch:mode==='touch',entry:process.env.P0_ENTRY});
    let result;
    if(mode==='review')result=await runtime.page.evaluate(()=>devkit.review(14));
    else if(mode==='flow'||mode==='climb'||mode==='idle'||mode==='crumble'||mode==='recovery') {
      const menu=await enterRound(runtime,{recipe,character,captureGo:mode!=='climb'});
      result={menu};
      if(mode==='recovery') {
        const {exerciseRecovery}=await import('./browser_recovery.mjs');
        result.recovery=await exerciseRecovery(runtime,{recipe,start:menu.start,maximumMs:300000});
      }
      if(mode==='climb') {
        const {driveClimb22}=await import('./browser_play_22.mjs');
        result.climb=await driveClimb22(runtime,{recipe,character,perfect,safe,start:menu.start,maximumMs:900000});
      }
      if(mode==='idle')result.failure=await waitForLog(runtime.page,event=>event.kind==='result',{
        start:menu.start,timeout:180000,
      });
      if(mode==='crumble') {
        const {exerciseCrumbleV2}=await import('./browser_play_v2.mjs');
        result.crumble=await exerciseCrumbleV2(runtime,{recipe,start:menu.start,maximumMs:180000});
      }
    } else if(mode==='touch') {
      const {exerciseTouch22}=await import('./mobile_touch_22.mjs');
      result=await exerciseTouch22(runtime,{recipe,character});
    } else if(mode!=='smoke')throw new Error(`Unknown mode ${mode}`);
    const screenshot=await runtime.capture('final');
    report={view,mode,result,...await readRuntime(runtime.page),screenshot,
      browserLogs:runtime.logs,networkFailures:runtime.networkFailures};
  } catch(error) {
    report={view,mode,error:error.message,stack:error.stack};
    if(runtime)Object.assign(report,await readRuntime(runtime.page).catch(()=>({})),{
      browserLogs:runtime.logs,networkFailures:runtime.networkFailures,
    });
  } finally {
    if(runtime)await runtime.close();
    await lock.close();await fs.unlink(lockPath).catch(()=>{});
    const reportPath=path.join(reportDirectory,`${name}-${view}.json`);
    await fs.writeFile(reportPath,JSON.stringify(report,null,2));
    const climb=report?.result?.climb||report?.result?.crumble?.climb;
    const summary=climb?{result:climb.result,landed:climb.landed,wallSeconds:climb.wallSeconds,
      timedOut:climb.timedOut,stoppedAt:climb.stoppedAt}:report?.result?.menu?{
      recipe:report.result.menu.recipe,character:report.result.menu.character,
    }:report?.result;
    console.log(JSON.stringify({reportPath,error:report?.error,status:report?.status,summary},null,2));
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  // Do not hold module evaluation open while a driver imports these helpers.
  cli().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
}
