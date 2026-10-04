import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage();let target=10,on=true,started=false;const writes=[];
 const edit=()=>`<form action="/buildings/42" method="post"><input name="_method" value="patch"><input name="building[name]" value="TEST STATION"><input name="building[personal_count_target]" value="${target}"><input name="building[leitstelle_building_id]" value="7"></form>`;
 const station=()=>`<div><span class="label">${on?'In service':'Out of service'}</span><a href="/buildings/42/active">Switch</a></div><div id="ausbauten"><table><tbody><tr><td><b>Test Extension</b></td><td>${started?'<span data-end-time="9999999999">Building</span>':'<a data-method="post" href="/buildings/42/extension/credits/1">10,000 Credits</a><a data-method="post" href="/buildings/42/extension/coins/1">5 Coins</a>'}</td></tr></tbody></table></div>`;
 await page.route('https://www.missionchief.co.uk/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==='/buildings/42'&&req.method()==='POST'){writes.push({path,body:req.postData()});const match=req.postData().match(/name="building\[personal_count_target\]"\r?\n\r?\n(\d+)/);assert(match);target=Number(match[1]);}
  if(path==='/buildings/42/active'){writes.push({path});on=!on;}
  if(path.includes('/extension/credits/')){writes.push({path});started=true;}
  assert(!path.includes('/coins/'),'never spend coins');
  await route.fulfill({contentType:'text/html',body:path.endsWith('/edit')?edit():station()});
 });
 await page.goto('https://www.missionchief.co.uk/');
 await page.addScriptTag({path:fileURLToPath(new URL('../nexus-realism-setup.js',import.meta.url))});
 const result=await page.evaluate(async()=>{const log=[];return {issues:await NexusRealismSetup.apply(42,{personnelTarget:'80',serviceStatus:'off',extensions:['Test Extension']},x=>log.push(x)),log};});
 assert.equal(result.issues.length,0);assert.equal(target,80);assert.equal(on,false);assert(started);assert.equal(writes.length,3);
 assert(writes[0].body.includes('TEST STATION'),'preserve name');assert(writes[0].body.includes('building[leitstelle_building_id]'),'preserve dispatch centre');
 await page.evaluate(()=>NexusRealismSetup.apply(42,{personnelTarget:'',serviceStatus:'off',extensions:['Test Extension']},()=>{}));assert.equal(writes.length,3,'do not toggle or buy again');
 const unavailable=await page.evaluate(()=>NexusRealismSetup.apply(42,{personnelTarget:'',serviceStatus:'off',extensions:['Unavailable Extension']},()=>{}));assert.equal(unavailable.length,1);assert.equal(writes.length,3);
 const source=fs.readFileSync(new URL('../nexus-real-locations.js',import.meta.url),'utf8');
 assert(source.includes(".toLocaleUpperCase('en-GB')"));assert(source.includes('if(!built.alreadyExisting)'));assert(source.includes('setup incomplete'));
 console.log('PASS: Realism setup preserves form fields, sets/verifies personnel and service, buys selected extensions using credits once, skips existing construction and reports unavailable extensions.');
}finally{await browser.close();}
