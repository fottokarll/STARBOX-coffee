// Guest play in the actual city. Owner credentials are never supplied to the browser.
import {chromium,request} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const expected=process.argv[2];if(!expected)throw new Error('Pass the published experience version');
const reportDirectory=process.argv[3]||'verification/2.2';
const expectedRelease=process.argv[4]||null;
await fs.mkdir(reportDirectory,{recursive:true});
const proxyServer=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
const proxy=proxyServer?{server:proxyServer,bypass:'localhost,127.0.0.1'}:undefined;
const browser=await chromium.launch({headless:false,args:['--no-sandbox','--ignore-gpu-blocklist'],proxy});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const transport=await request.newContext({proxy,userAgent:'curl/8.0'});
const logs=[],errors=[],failures=[];
await context.route(/^https:\/\/(project0\.city|files\.project0\.city)\//,async route=>{
  try {await route.fulfill({response:await transport.fetch(route.request())});}
  catch(error) {failures.push({url:new URL(route.request().url()).origin+new URL(route.request().url()).pathname,error:error.message});await route.abort();}
});
const page=await context.newPage();
page.on('console',m=>{if(/Coffee Rising|STARBOX/.test(m.text()))logs.push(m.text());});
page.on('pageerror',e=>errors.push(e.message));
let report;
async function waitLog(part,start=0,timeout=60000) {
  const began=Date.now();
  while(Date.now()-began<timeout) {
    const found=logs.slice(start).find(line=>line.includes(part));if(found)return found;
    await page.waitForTimeout(100);
  }
  throw new Error(`Live game did not emit ${part}`);
}
try {
  await page.goto('https://project0.city/lot/696',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(4000);
  await page.screenshot({path:`${reportDirectory}/live-city.png`});
  const enter=page.locator('#panel').getByRole('button',{name:/Play/i}).first();
  await enter.waitFor({state:'visible',timeout:60000});
  const onboarding=page.getByRole('dialog',{name:'How Project 0 works'});
  const navigation=page.getByRole('dialog',{name:'Around the city'});
  // City onboarding can arrive after the lot panel has already become visible.
  // Complete it through ordinary clicks, including that delayed arrival.
  let entered=false;
  for(let attempt=0;attempt<16&&!entered;attempt++) {
    if(await onboarding.isVisible()) {
      await onboarding.getByRole('button',{name:/^(Let's go|Next|Start|Got it)$/}).first().click();
      await page.waitForTimeout(250);continue;
    }
    if(await navigation.isVisible())await navigation.getByRole('button',{name:'Close',exact:true}).click();
    await page.screenshot({path:`${reportDirectory}/live-city.png`});
    try {await enter.click({timeout:1500});entered=true;}
    catch(error) {if(attempt===15)throw error;await page.waitForTimeout(300);}
  }
  assert.ok(entered,'city onboarding completed and Play clicked');
  await waitLog('Coffee Rising: screen title',0,120000);
  const releaseLog=expectedRelease?await waitLog(`STARBOX COFFEE ${expectedRelease} ready:`):null;
  const shell=page.frames().find(f=>f.url().includes('/sandbox/shell.html?lot=696'));
  assert.ok(shell,'actual city sandbox, rather than DevKit');
  assert.equal(new URL(shell.url()).searchParams.get('v'),expected);
  await page.screenshot({path:`${reportDirectory}/live-title.png`});
  await shell.locator('canvas').click({position:{x:25,y:200}});
  await page.keyboard.press('Space');await waitLog('Coffee Rising: screen order');
  await page.keyboard.press('Digit1');await page.keyboard.press('Space');await waitLog('Coffee Rising: screen character');
  await page.keyboard.press('Digit2');await page.keyboard.press('Space');await waitLog('Coffee Rising: GO');
  const start=logs.length;
  await page.keyboard.down('KeyD');await page.keyboard.down('Space');
  await page.waitForTimeout(420);await page.keyboard.up('KeyD');
  await page.waitForTimeout(300);await page.keyboard.up('Space');
  const jump=await waitLog('Coffee Rising: jump',start);
  const landing=await waitLog('Coffee Rising: land',start);
  await page.keyboard.press('KeyP');
  await waitLog('Coffee Rising: screen pause',start);
  await page.screenshot({path:`${reportDirectory}/live-gameplay.png`});
  report={passed:true,version:expected,release:expectedRelease,releaseLog,sandbox:shell.url(),guest:true,jump,landing,errors,failures,logs,
    note:'Live guest entry, title, coffee/character selection, keyboard jump/landing and pause. Full Perfect victories were separately verified in official DevKit.'};
} catch(error) {
  await page.screenshot({path:`${reportDirectory}/live-error.png`}).catch(()=>{});
  report={passed:false,error:error.message,errors,failures,logs,panel:(await page.locator('#panel').innerText().catch(()=>'' )).slice(0,2500)};
} finally {
  await browser.close();await transport.dispose();
  await fs.writeFile(`${reportDirectory}/live-browser.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,error:report.error,version:report.version,errors:report.errors,failures:report.failures},null,2));
if(!report.passed)process.exitCode=1;
