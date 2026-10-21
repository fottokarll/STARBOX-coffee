// Run the official Project 0 sandbox against the local experience.
// The inherited HTTPS proxy remains in use for every remote request.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const phone = args.includes('--phone');
const review = args.includes('--review');
const play = args.includes('--play');
const climb = args.includes('--climb');
const touch = args.includes('--touch');
const screenshotPath = process.env.P0_SCREENSHOT || '/workspace/work/reports/devkit.png';
const reportPath = process.env.P0_REPORT || '/workspace/work/reports/devkit.json';
const proxyServer = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  proxy: proxyServer ? { server: proxyServer, bypass: 'localhost,127.0.0.1' } : undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    ...(touch?['--disable-features=SyntheticPointerActions']:[])],
});
const context = await browser.newContext({
  permissions: ['local-network-access'],
  viewport: { width: 1440, height: 1100 },
});
// Chromium's legacy per-user NSS database is outside this workspace. Transport
// remote devkit resources through Playwright's API client, which verifies TLS
// using the managed environment's NODE_EXTRA_CA_CERTS and inherited proxy.
const transport = await require('playwright').request.newContext({
  proxy: proxyServer ? { server: proxyServer, bypass: 'localhost,127.0.0.1' } : undefined,
  userAgent: 'curl/8.0',
});
const staticResponses = new Map();
await context.route('https://project0.city/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const immutable = request.method() === 'GET' && (
    url.pathname.startsWith('/assets/') || url.pathname.startsWith('/sandbox/three-r186/') ||
    (url.pathname.startsWith('/sandbox/') && url.searchParams.has('v'))
  );
  if(immutable && staticResponses.has(url.href)) {
    await route.fulfill(staticResponses.get(url.href));
    return;
  }
  const response = await transport.fetch(route.request());
  if(immutable && response.ok()) {
    const cached = {status:response.status(),headers:response.headers(),body:await response.body()};
    staticResponses.set(url.href,cached);
    await route.fulfill(cached);
  } else await route.fulfill({ response });
});
const page = await context.newPage();
const logs = [];
const requests = [];
page.on('console', message => {
  logs.push(`${message.type()}: ${message.text()}`);
  if(message.text().includes('Coffee Rising') || message.text().includes('[devkit]')) {
    console.log(message.text());
  }
});
page.on('pageerror', error => logs.push(`pageerror: ${error.message}`));
page.on('requestfailed', request => requests.push({
  url: request.url(), failure: request.failure()?.errorText,
}));
let report;
try {
  const url = new URL('https://project0.city/devkit');
  url.search = new URLSearchParams({
    entry: process.env.P0_ENTRY || 'http://localhost:5500/main.js', width: '12', depth: '19',
    height: '12', players: '1', slow: '1',
    ...(phone ? {phone:'1'} : {size:(review||climb)?'640x360':'960x640'}),
  }).toString();
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.devkit), { timeout: 30000 });
  const status = await page.evaluate(() => window.devkit.wait());
  for(const frame of page.frames()) {
    const close=frame.locator('#xclose');
    if(await close.count() && await close.isVisible()) await close.click();
  }
  let reviewed;
  if (review && status === 'started') reviewed = await page.evaluate(() => devkit.review(14));
  await page.waitForTimeout(2000);
  if(play && status === 'started') {
    await page.locator('#device').screenshot({path:screenshotPath.replace(/\.png$/, '-menu.png')});
    await page.evaluate(() => devkit.press('Space',120));
    await page.waitForTimeout(12000);
    await page.locator('#device').screenshot({path:screenshotPath.replace(/\.png$/, '-start.png')});
    await page.evaluate(() => devkit.key('KeyD',true));
    await page.evaluate(() => devkit.press('Space',650));
    await page.waitForTimeout(400);
    await page.evaluate(() => devkit.key('KeyD',false));
    await page.locator('#device').screenshot({path:screenshotPath.replace(/\.png$/, '-jump.png')});
    await page.evaluate(() => devkit.press('KeyP',80));
    await page.locator('#device').screenshot({path:screenshotPath.replace(/\.png$/, '-pause.png')});
    await page.evaluate(() => devkit.press('KeyP',80));
  }
  if(climb && status === 'started') {
    const {driveClimb} = await import('./browser_play.mjs');
    let capturedPlay=false;
    reviewed = await driveClimb(page, {
      recipe:args.includes('--espresso')?'espresso':'latte',collect:true,
      onProgress:async progress=>{
        if(!capturedPlay&&progress.platform>=3) {
          capturedPlay=true;
          await page.locator('#device').screenshot({path:screenshotPath.replace(/\.png$/, '-playing.png')});
        }
      },
    });
  }
  if(touch && status === 'started') {
    const {exerciseTouch}=await import('./mobile_touch.mjs');
    reviewed=await exerciseTouch(page);
  }
  const state = await page.evaluate(() => ({
    status: devkit.status, reason: devkit.reason, summary: devkit.summary(),
    frames: devkit.frames, hud: devkit.hud, errors: devkit.errors,
    console: devkit.console, room: devkit.room,
    device: document.querySelector('#device')?.getBoundingClientRect().toJSON(),
  }));
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  const device = page.locator('#device');
  if (await device.count()) await device.screenshot({ path: screenshotPath });
  else await page.screenshot({ path: screenshotPath });
  report = { ...state, reviewed, logs, requests, screenshotPath };
} catch (error) {
  report = { error: error.message, logs, requests };
  await page.screenshot({ path: screenshotPath }).catch(() => {});
} finally {
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  await transport.dispose();
}
