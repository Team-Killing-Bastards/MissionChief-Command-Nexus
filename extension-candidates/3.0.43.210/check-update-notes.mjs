import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
import {notesSince,compareVersions,NOTES} from './extension/nexus-update-notes-data.mjs';
import {createRequire} from 'node:module';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const root=new URL('./extension/',import.meta.url);
const worker=fs.readFileSync(new URL('nexus-update-notes-worker.mjs',root),'utf8').replace(/^import .*;\r?\n/,'');
const clone=v=>structuredClone(v);
function storage(data={}) {return {data,fail:false,async get(key){if(this.fail)throw Error('storage failed');return {[key]:clone(this.data[key])};},async set(value){if(this.fail)throw Error('storage failed');Object.assign(this.data,clone(value));},async remove(key){delete this.data[key];}};}
function harness({version='3.0.43.210',local=storage(),session=storage()}={}) {
  let install,listener;
  const context={notesSince,compareVersions,CHANGELOG_URL:'https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/blob/main/docs/extension-changelog.md',crypto:webcrypto,URL,Date,chrome:{storage:{local,session},runtime:{getManifest:()=>({version}),onInstalled:{addListener(fn){install=fn;}},onMessage:{addListener(fn){listener=fn;}}}}};
  vm.runInNewContext(worker,context);
  return {local,session,install:async(details)=>{install(details);await new Promise(resolve=>setImmediate(resolve));},request:(type,tab=1,extra={},origin='https://www.missionchief.co.uk/')=>new Promise(resolve=>{if(!listener({type,...extra},{tab:{id:tab},frameId:0,documentId:'doc-'+tab,url:origin},resolve))resolve(null);})};
}
const claim='NEXUS_UPDATES_CLAIM', ack='NEXUS_UPDATES_SHOWN', read='NEXUS_UPDATES_READ';
const key='nexusUpdateNoticeV1';
const h=harness();
await h.install({reason:'update',previousVersion:'3.0.43.204'});
const [one,two]=await Promise.all([h.request(claim),h.request(claim,2)]);
assert.equal(one.show,true);assert.equal(one.notes.length,8);assert.equal(two.show,false);
assert.equal((await h.request(ack,2,{token:one.token})).ok,false);
assert.equal((await h.request(ack,1,{token:one.token})).ok,true);
assert.equal((await h.request(claim)).show,false);
assert.equal((await harness({local:h.local,session:h.session}).request(claim,3)).show,false,'worker restart/refresh');
await h.install({reason:'update',previousVersion:'3.0.43.210'});
assert.equal((await h.request(claim)).show,false,'same-version reload');
assert.equal((await h.request(read)).notes.length,NOTES.length,'manual reopen');
assert.equal(await h.request(read,1,{},'https://example.com/'),null,'untrusted origin');
const fresh=harness();await fresh.install({reason:'install'});assert.equal((await fresh.request(claim)).show,false,'not an update');
const old=harness();await old.install({reason:'update',previousVersion:'3.0.43.190'});
const oldClaim=await old.request(claim);assert.equal(oldClaim.notes.length,14,'skipped releases');
const resumed=harness({local:old.local,session:old.session});assert.equal((await resumed.request(claim,2)).show,false,'lease survives worker restart');
old.session.data.nexusUpdateNoticeClaimV1.until=0;
assert.equal((await resumed.request(claim,2)).show,true,'abandoned tab lease expires');
const otherPc=harness();await otherPc.install({reason:'update',previousVersion:'3.0.43.204'});assert.equal((await otherPc.request(claim)).show,true,'independent browser');
const later=harness({version:'3.0.43.211',local:h.local});await later.install({reason:'update',previousVersion:'3.0.43.210'});assert.equal((await later.request(claim)).show,true,'next version');
const failure=harness();failure.local.fail=true;assert.equal((await failure.request(claim)).ok,false,'storage failure is caught');
const downgrade=harness({version:'3.0.43.204'});await downgrade.install({reason:'update',previousVersion:'3.0.43.205'});assert.equal((await downgrade.request(claim)).show,false);
assert(compareVersions('3.0.43.205','3.0.43.99')>0);
if(!process.env.NEXUS_SKIP_BROWSER) {
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try {
 const page=await browser.newPage({viewport:{width:1000,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://www.missionchief.co.uk/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local fixture</title><div id="map"></div><button id="tools">Tools</button>'}));
 await page.goto('https://www.missionchief.co.uk/');
 const data={ok:true,show:true,token:'fixture',version:'3.0.43.210',from:'3.0.43.190',changelog:oldClaim.changelog,notes:notesSince('3.0.43.190','3.0.43.210')};
 await page.evaluate(data=>{window.fixtureCalls=[];window.chrome={runtime:{sendMessage:async message=>{fixtureCalls.push(message.type);return message.type.endsWith('_CLAIM')||message.type.endsWith('_READ')?data:{ok:true};}}};},data);
 await page.addScriptTag({path:fileURLToPath(new URL('nexus-update-notes.js',root))});
 await page.getByRole('dialog').waitFor();
 assert.equal(await page.locator('#nexus-update-notice li').count(),14);
 await page.screenshot({path:fileURLToPath(new URL('update-notes-210-desktop.png',import.meta.url))});
 assert(await page.evaluate(()=>fixtureCalls.includes('NEXUS_UPDATES_SHOWN')));
 await page.getByRole('button',{name:'Got it'}).click();
 await page.locator('#nexus-update-notice').waitFor({state:'detached'});
 assert.equal(await page.locator('#nexus-update-notice').count(),0);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 assert.equal(await page.locator('#nexus-update-notice').count(),0);
 await page.setViewportSize({width:375,height:700});
 await page.evaluate(()=>window.dispatchEvent(new Event('nexus:show-update-notes')));
 await page.getByRole('dialog').waitFor();
 assert.equal(await page.locator('#nexus-update-notice li a').count(),14);
 const size=await page.getByRole('dialog').boundingBox();assert(size.x>=0&&size.width<=375&&size.height<=700);
 await page.screenshot({path:fileURLToPath(new URL('update-notes-210-mobile.png',import.meta.url))});
 await page.keyboard.press('Escape');await page.locator('#nexus-update-notice').waitFor({state:'detached'});assert.equal(await page.locator('#nexus-update-notice').count(),0);
 assert.deepEqual(errors,[]);
} finally {await browser.close();}
}
console.log('PASS update/new install, multi-tab claims, worker restart, abandoned tab, repeat reload, later update, downgrade, multi-PC, manual reopen, sender checks and storage failures.' + (process.env.NEXUS_SKIP_BROWSER?'':' Desktop/mobile render and Escape also passed.'));

