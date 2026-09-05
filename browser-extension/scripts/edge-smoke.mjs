import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { devLibrary } from './dev-library.mjs';
const {chromium}=devLibrary('playwright');
const extension=path.resolve('extension');
const profile=path.resolve('audit',`edge-smoke-profile-${Date.now()}`);
const executable=process.env.NEXUS_EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// A separate, empty test profile. Never attach to or reuse the player's Edge profile.
const browser=await chromium.launchPersistentContext(profile,{executablePath:executable,headless:true,
  args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],
  ignoreDefaultArgs:['--disable-extensions']
});
const report={browser:browser.browser()?.version(),checks:[],errors:[],realGame:false,realGoogle:false};
try {
  await browser.route('https://**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin==='https://www.missionchief.co.uk' && url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Nexus empty game fixture</title></head><body><div id="map"></div><a id="navbar_profile_link" href="/profile/123">Test player</a></body></html>'});
    return route.abort();
  });
  const worker=browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker',{timeout:20000});
  const extensionId=new URL(worker.url()).host;
  // No telemetry goes to Google: capture stays disabled throughout this browser test.
  await worker.evaluate(()=>chrome.storage.local.set({nexusAnalyticsSettingsV1:{enabled:false}}));
  const page=await browser.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/analytics.html`);
  await page.getByRole('status').filter({hasText:'Automatic sharing paused'}).waitFor();
  assert.equal(await page.locator('#enabled').isChecked(),false);
  report.checks.push('Service worker and Sharing & Sync load in Edge; sharing remains off');
  await page.screenshot({path:'audit/edge-sharing.png',fullPage:true});
  await page.goto(`chrome-extension://${extensionId}/rules.html`);
  await page.locator('#status').filter({hasText:'Ready.'}).waitFor();
  await page.locator('#requirement').fill('Test Ambulance Requirement');
  await page.locator('#vehicle').selectOption('5');
  await page.locator('#save').click();
  await page.locator('#status').filter({hasText:'Saved.'}).waitFor();
  assert.match(await page.locator('#rules').innerText(),/Test Ambulance Requirement/);
  await page.reload();await page.locator('#status').filter({hasText:'Ready.'}).waitFor();
  assert.match(await page.locator('#rules').innerText(),/Test Ambulance Requirement/);
  report.checks.push('Requirement rule saves through Web Locks/storage and survives reload');
  await page.screenshot({path:'audit/edge-rules.png',fullPage:true});
  await page.goto(`chrome-extension://${extensionId}/privacy.html`);
  assert.equal(await page.getByRole('heading',{name:'Nexus data and sharing'}).count(),1);
  report.checks.push('Data/sharing disclosure renders with extension CSP');
  await page.goto('https://www.missionchief.co.uk/');
  await page.waitForFunction(()=>window.__NEXUS_RULES__?.isReady(),{},{timeout:10000});
  const state=await page.evaluate(()=>({runtime:window.__NEXUS_EXTENSION__,rules:window.__NEXUS_RULES__.snapshot()}));
  assert.equal(state.runtime.build,JSON.parse(fs.readFileSync('extension/manifest.json','utf8')).version);assert.equal(state.runtime.status,'loaded');
  assert.ok(state.rules.rules.some(r=>r.requirement==='Test Ambulance Requirement'));
  report.checks.push('MAIN-world runtime receives authoritative rules from isolated bridge on mocked game origin');
  assert.deepEqual(report.errors,[]);
  report.extensionId=extensionId;report.passed=true;
} catch(error) {report.passed=false;report.failure=error.stack;throw error;}
finally {fs.writeFileSync('audit/edge-smoke.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report,null,2));
