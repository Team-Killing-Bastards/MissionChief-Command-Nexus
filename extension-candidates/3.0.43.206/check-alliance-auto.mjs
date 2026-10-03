import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const root=path.resolve(process.env.NEXUS_CANDIDATE_ROOT||fileURLToPath(new URL('./extension/',import.meta.url)));
async function sent(page,id){const end=Date.now()+15000;while(Date.now()<end){if(await page.evaluate(async id=>(await NexusAllianceResultsStore.read())[id]?.state==='sent',id))return;await page.waitForTimeout(100);}throw Error('No confirmed support for '+id);}
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
let checks=0;
const card=({id,credits=5000,joined='new',name='Shared fixture'})=>`<div class="missionSideBarEntry" mission_id="${id}" data-mission-participation-filter="${joined}" data-sortable-by='{"average_credits":${credits}}'><a class="mission-alarm-button" href="/missions/${id}">${name}</a></div>`;
const unit=(id,time,type=3)=>`<tr data-sortvalue="${time}"><td><input class="vehicle_checkbox" name="vehicle_ids[]" type="checkbox" value="${id}" vehicle_type_id="${type}"><a href="/vehicles/${id}">Unit ${id}</a></td></tr>`;
async function fixture({enabled=false,missions=[{id:'123'}],vehicles=[unit(1,10),unit(2,20)],unknown=false,hold=false,settings={},personal=false}={}){
 const context=await browser.newContext();const page=await context.newPage();const events=[],errors=[],loads=[];let api=0,finish;
 const held=new Promise(r=>finish=r);
 await context.addInitScript({content:read('nexus-vehicle-claims.js')});
 await context.route('https://www.missionchief.co.uk/**',async route=>{
  const url=new URL(route.request().url()),p=url.pathname,html=body=>route.fulfill({contentType:'text/html',body});
  if(p==='/api/vehicles'){api++;if(hold)await held;return route.fulfill({contentType:'application/json',body:'[]'});}
  if(p==='/')return html(`<nav class="navbar"><div><ul class="dropdown-menu"><li><a>FAQ</a></li><li><a>Contact support</a></li></ul></div></nav><button id="mcn-v3-map-controller">Nexus</button>${personal?'<input id="personal" class="vehicle_checkbox" value="1" type="checkbox">':''}<div id="mission_list_alliance">${missions.map(card).join('')}</div>`);
  const match=p.match(/^\/missions\/(\d+)(\/alarm)?$/);
  if(match){const id=match[1];if(match[2]){events.push({id,chosen:new URLSearchParams(route.request().postData()).getAll('vehicle_ids[]')});return html(unknown?'':`<div class="alert alert-success"><a href="/vehicles/${events.at(-1).chosen[0]}">Unit</a> has successfully been dispatched.</div>`);}
   loads.push(id);return html(`<table id="vehicle_list_step"><tbody>${vehicles.join('')}</tbody></table><a id="mission_alarm_btn" href="#" title="Dispatch">Dispatch <span id="vehicle_amount">0</span></a><div id="feedback"></div><script>document.addEventListener('change',()=>document.querySelector('#vehicle_amount').textContent=document.querySelectorAll('input:checked').length);document.querySelector('#mission_alarm_btn').onclick=async e=>{e.preventDefault();const b=new URLSearchParams();document.querySelectorAll('input:checked').forEach(n=>b.append('vehicle_ids[]',n.value));document.querySelector('#feedback').innerHTML=await(await fetch('/missions/${id}/alarm',{method:'POST',body:b})).text();};</script>`);
  }
  return route.fulfill({status:404,body:''});
 });
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://www.missionchief.co.uk/');
 await page.evaluate(({enabled,settings})=>{window.__NEXUS_AUTO_DISPATCH_BUSY__=()=>true;for(const[k,v]of Object.entries(settings))localStorage.setItem(k,v);if(enabled)localStorage.setItem('nexusAllianceAutoEnabledV1','true');},{enabled,settings});
 for(const n of ['nexus-settings-main.js','nexus-alliance-core.js','nexus-alliance-results-store.js','nexus-alliance-support.js'])await page.addScriptTag({path:path.join(root,n)});
 return {context,page,events,errors,loads,get api(){return api;},finish,async close(){assert.deepEqual(errors,[]);await context.close();}};
}
try{
 // Actual Settings UI: off until saved, then independent of a permanently busy personal controller.
 const f=await fixture({personal:true});const {page}=f;
 assert.equal(await page.evaluate(()=>NexusSettings.snapshot().runtime.allianceAuto),false);
 await page.waitForTimeout(1400);assert.equal(f.api,0);assert.equal(f.loads.length,0);checks++;
 await page.evaluate(()=>{window.chrome={runtime:{id:'fixture',getURL:n=>'https://www.missionchief.co.uk/'+n,sendMessage:async m=>m.type==='NEXUS_TOOLS_GET'?{ok:true,value:{}}:{ok:true}},storage:{onChanged:{addListener(){}}}};});
 for(const n of ['nexus-tools-core.js','nexus-tools.js'])await page.addScriptTag({path:path.join(root,n)});
 await page.locator('#nexus-tools-menu-link').click();await page.locator('#nexus-native-tools').getByRole('button',{name:'Settings',exact:true}).click();
 const toggle=page.locator('#nexus-native-tools input[data-setting-id="allianceAuto"]');assert.equal(await toggle.isChecked(),false);
 await page.locator('#personal').check();await toggle.check();await page.locator('#nexus-native-tools').getByRole('button',{name:'Save settings',exact:true}).click();
 await sent(page,'123');
 assert.deepEqual(f.events,[{id:'123',chosen:['2']}]);assert.equal(await page.evaluate(()=>__NEXUS_AUTO_DISPATCH_BUSY__()),true);assert.equal(await page.locator('#nx-alliance-panel').isVisible(),false);assert.equal(await page.locator('iframe[data-nx-alliance-worker]').count(),0);checks++;
 // A live alliance event wakes the closed-panel queue; confirmed support never sends twice.
 await page.evaluate(html=>document.querySelector('#mission_list_alliance').insertAdjacentHTML('beforeend',html),card({id:'124'}));
 await sent(page,'124');
 assert.equal(f.events.length,2);assert.deepEqual(f.events[1],{id:'124',chosen:['2']});assert.equal(f.api,1,'participation is cached, not fetched per mission');checks++;
 await toggle.uncheck();await page.locator('#nexus-native-tools').getByRole('button',{name:'Save settings',exact:true}).click();
 await page.evaluate(html=>document.querySelector('#mission_list_alliance').insertAdjacentHTML('beforeend',html),card({id:'125'}));await page.waitForTimeout(1500);assert.equal(f.events.length,2);assert.equal(await page.evaluate(()=>__NEXUS_ALLIANCE_SUPPORT__.enabled),false);checks++;
 await page.screenshot({path:fileURLToPath(new URL('./alliance-auto-settings-206.png',import.meta.url))});await f.close();
 // Respect saved unit and credit filters, including supported and no-reward missions.
 const filtered=await fixture({enabled:true,settings:{nexusAllianceSupportVehicleV1:'10',nexusAllianceValueRangeV1:'20'},missions:[{id:'130',credits:1000},{id:'131',credits:23000},{id:'132',credits:25000,joined:'joined'},{id:'133',credits:0}],vehicles:[unit(1,1,3),unit(2,20,10),unit(3,10,10)]});
 await sent(filtered.page,'131');
 assert.deepEqual(filtered.events,[{id:'131',chosen:['3']}]);assert.deepEqual(filtered.loads,['131']);checks++;
 await filtered.page.evaluate(()=>{localStorage.setItem('nexusAllianceAutoEnabledV1','false');window.dispatchEvent(new Event('nexus:settings-saved'));});await filtered.close();
 // Switch off while participation is in flight: no mission opens and no dispatch occurs.
 const cancel=await fixture({enabled:true,hold:true});await cancel.page.waitForFunction(()=>__NEXUS_ALLIANCE_SUPPORT__.enabled);await cancel.page.waitForTimeout(1300);
 await cancel.page.evaluate(()=>{localStorage.setItem('nexusAllianceAutoEnabledV1','false');window.dispatchEvent(new Event('nexus:settings-saved'));});cancel.finish();await cancel.page.waitForTimeout(600);
 assert.equal(cancel.events.length,0);assert.equal(cancel.loads.length,0);checks++;await cancel.close();
 // Cooldown avoids hammering a shortage while allowing another mission to use available cover.
 const shortage=await fixture({enabled:true,missions:[{id:'150',credits:7000}],vehicles:[unit(1,10,10)]});
 await shortage.page.waitForFunction(()=>!__NEXUS_ALLIANCE_SUPPORT__.busy && document.querySelector('#nx-alliance-launcher').textContent.includes('Auto'),null,{timeout:10000});await shortage.page.waitForTimeout(1800);
 assert.deepEqual(shortage.loads,['150']);assert.equal(shortage.events.length,0);
 await shortage.page.evaluate(html=>document.querySelector('#mission_list_alliance').insertAdjacentHTML('beforeend',html),card({id:'151'}));
 await shortage.page.waitForTimeout(2200);assert.deepEqual(shortage.loads,['150','151']);checks++;
 await shortage.page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await shortage.page.waitForTimeout(1200);assert.equal(await shortage.page.locator('iframe').count(),0);assert.equal(await shortage.page.evaluate(()=>__NEXUS_ALLIANCE_SUPPORT__.enabled),false);checks++;await shortage.close();
 // Failed confirmation stops the queue, retaining the durable checkpoint without retrying.
 const uncertain=await fixture({enabled:true,unknown:true,missions:[{id:'160',credits:9000},{id:'161',credits:8000}]});
 await uncertain.page.waitForFunction(()=>__NEXUS_ALLIANCE_SUPPORT__.paused,null,{timeout:30000});assert.equal(uncertain.events.length,1);assert.equal(uncertain.loads.length,1);
 assert.equal((await uncertain.page.evaluate(()=>NexusAllianceResultsStore.read()))['160'].state,'uncertain');assert.equal(await uncertain.page.locator('iframe').count(),0);await uncertain.page.waitForTimeout(1800);assert.equal(uncertain.events.length,1);checks++;await uncertain.close();
 // Shared claims are bounded scalars, expire, and block a native personal selection.
 const claim=await fixture({personal:true});assert.equal(await claim.page.evaluate(()=>NexusVehicleClaims.claim('1','alliance-test')),true);
 await claim.page.locator('#personal').click();assert.equal(await claim.page.locator('#personal').isChecked(),false);
 await claim.page.evaluate(()=>NexusVehicleClaims.releaseOwner('alliance-test'));await claim.page.locator('#personal').check();assert.equal(await claim.page.evaluate(()=>NexusVehicleClaims.held('1','alliance-test')),true);checks++;await claim.close();
 // Two windows share the existing origin lock and durable history: only one dispatch.
 const multi=await fixture({enabled:true});const second=await multi.context.newPage();await second.goto('https://www.missionchief.co.uk/');
 for(const n of ['nexus-settings-main.js','nexus-alliance-core.js','nexus-alliance-results-store.js','nexus-alliance-support.js'])await second.addScriptTag({path:path.join(root,n)});
 await sent(multi.page,'123');await second.waitForTimeout(1700);
 assert.equal(multi.events.length,1);assert.equal(await second.locator('iframe').count(),0);checks++;await multi.close();
 assert.equal(read('nexus-settings.js'),read('nexus-settings-main.js'));
 const source=read('nexus-runtime.js');assert(!source.includes('if (nexusAllianceSupportBusy())'));assert(source.includes("frame.hasAttribute('data-nx-alliance-worker')"));assert(read('nexus-profile-sync.js').includes('(window.NexusSettings?.runtime||[]).map(s=>s.key)'));checks++;
 console.log(`PASS: ${checks} Alliance Auto checks, including Settings UI, default-off, concurrent personal Auto, filters, duplicate prevention, cancellation, shortages, uncertainty, claims and tab locking.`);
}catch(e){console.error(e);throw e;}finally{await browser.close();}

