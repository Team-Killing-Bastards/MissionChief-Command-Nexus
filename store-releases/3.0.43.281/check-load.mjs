import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const root=fileURLToPath(new URL('extension/',import.meta.url)),release=JSON.parse(fs.readFileSync(new URL('release.json',import.meta.url)));
let syntaxFiles=0;
for(const name of Object.keys(release.files))if(/\.m?js$/.test(name)){execFileSync(process.execPath,['--check',path.join(root,name)]);syntaxFiles++;}
const {chromium}=devLibrary('playwright'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-store-281-'));
const context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
try{
 const errors=[];context.on('weberror',e=>errors.push(e.error().message));
 await context.route(/^https?:/,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated test</title><body>Signed out test fixture</body>'}));
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
 const info=await worker.evaluate(()=>({id:chrome.runtime.id,version:chrome.runtime.getManifest().version}));
 assert.equal(info.id,release.itemId);assert.equal(info.version,release.version);
 const page=await context.newPage();
 const pages=[];
 for(const name of ['popup.html','collector.html']){await page.goto(`chrome-extension://${info.id}/${name}`);assert((await page.locator('body').innerText()).trim().length>30);pages.push(name);}
 assert.deepEqual(errors,[]);
 const result={passed:true,syntaxFiles,extensionId:info.id,version:info.version,serviceWorkerLoaded:true,pages,noPageErrors:true,isolatedProfile:true};
 fs.writeFileSync(new URL('load-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await context.close();}
