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
async function fixture({enabled=false,missions=[{id:'123'}],vehicles=Array.from({length:20},(_,i)=>unit(i+1,i+1)),unknown=false,hold=false,settings={},personal=false,onDispatch=null,onLoad=null}={}){
 const context=await browser.newContext({viewport:{width:1280,height:1000}});const page=await context.newPage();const events=[],errors=[],loads=[];let api=0,finish;
 const held=new Promise(r=>finish=r);
 await context.addInitScript({content:read('nexus-vehicle-claims.js')});
 await context.route('**/*',async route=>{
  if(new URL(route.request().url()).origin!=='https://www.missionchief.co.uk')return route.abort();
  const url=new URL(route.request().url()),p=url.pathname,html=body=>route.fulfill({contentType:'text/html',body});
  if(p==='/api/vehicles'){api++;if(hold)await held;return route.fulfill({contentType:'application/json',body:'[]'});}
  if(p==='/')return html(`<nav class="navbar"><div><ul class="dropdown-menu"><li><a>FAQ</a></li><li><a>Contact support</a></li></ul></div></nav><button id="mcn-v3-map-controller">Nexus</button>${personal?'<input id="personal" class="vehicle_checkbox" value="1" type="checkbox">':''}<div id="mission_list_alliance">${missions.map(card).join('')}</div>`);
  const match=p.match(/^\/missions\/(\d+)(\/alarm)?$/);
  if(match){const id=match[1];if(match[2]){events.push({id,chosen:new URLSearchParams(route.request().postData()).getAll('vehicle_ids[]')});if(onDispatch)await onDispatch(page,id);return html(unknown?'':`<div class="alert alert-success"><a href="/vehicles/${events.at(-1).chosen[0]}">Unit</a> has successfully been dispatched.</div>`);}
   loads.push(id);if(onLoad)await onLoad(page,id);return html(`<table id="vehicle_list_step"><tbody>${vehicles.join('')}</tbody></table><a id="mission_alarm_btn" href="#" title="Dispatch">Dispatch <span id="vehicle_amount">0</span></a><div id="feedback"></div><script>document.addEventListener('change',()=>document.querySelector('#vehicle_amount').textContent=document.querySelectorAll('input:checked').length);document.querySelector('#mission_alarm_btn').onclick=async e=>{e.preventDefault();const b=new URLSearchParams();document.querySelectorAll('input:checked').forEach(n=>b.append('vehicle_ids[]',n.value));document.querySelector('#feedback').innerHTML=await(await fetch('/missions/${id}/alarm',{method:'POST',body:b})).text();};</script>`);
  }
  return route.fulfill({status:404,body:''});
 });
 page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();
 await page.goto('https://www.missionchief.co.uk/');
 await page.evaluate(({enabled,settings})=>{window.__NEXUS_AUTO_DISPATCH_BUSY__=()=>true;for(const[k,v]of Object.entries(settings))localStorage.setItem(k,v);if(enabled)localStorage.setItem('nexusAllianceAutoEnabledV1','true');},{enabled,settings});
 for(const n of ['nexus-settings-main.js','nexus-alliance-core.js','nexus-alliance-results-store.js','nexus-alliance-support.js'])await page.addScriptTag({path:path.join(root,n)});
 return {context,page,events,errors,loads,get api(){return api;},finish,async mount(target){for(const n of ['nexus-settings-main.js','nexus-alliance-core.js','nexus-alliance-results-store.js','nexus-alliance-support.js'])await target.addScriptTag({path:path.join(root,n)});},async close(){assert.deepEqual(errors,[]);await context.close();}};
}
const report={version:'3.0.43.234',realGame:false,cases:[]};
const pass=name=>{report.cases.push(name);console.log('PASS '+name);};
const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++;};
const ok=(a,msg)=>{assert(a,msg);checks++;};
const idle=page=>page.waitForFunction(()=>!__NEXUS_ALLIANCE_SUPPORT__.busy);
const saved=page=>page.evaluate(()=>NexusSettings.snapshot().runtime);
const configure=(page,settings)=>page.evaluate(settings=>{for(const[k,v]of Object.entries(settings))localStorage.setItem(k,String(v));window.dispatchEvent(new Event('nexus:settings-saved'));},settings);
const stop=page=>configure(page,{nexusAllianceAutoEnabledV1:false});
const insert=(page,missions)=>page.evaluate(html=>document.querySelector('#mission_list_alliance').insertAdjacentHTML('beforeend',html),missions.map(card).join(''));
try {
 // Real settings UI and the compact panel both use the same validated, syncable runtime preferences.
 const f=await fixture({personal:true,missions:[{id:'100',credits:9999},{id:'101',credits:10000},{id:'102',credits:15000},{id:'103',credits:null},{id:'104',credits:0},{id:'105',credits:12000}]});
 const p=f.page;
 eq((await saved(p)).allianceAuto,false);eq((await saved(p)).allianceBatchSize,10);eq((await saved(p)).alliancePauseMinutes,10);eq((await saved(p)).allianceMinCredits,0);
 await p.waitForTimeout(1200);eq(f.api,0);eq(f.events.length,0);
 await p.locator('#personal').check();
 await p.evaluate(()=>{window.chrome={runtime:{id:'fixture',getURL:n=>'https://www.missionchief.co.uk/'+n,sendMessage:async m=>m.type==='NEXUS_TOOLS_GET'?{ok:true,value:{}}:{ok:true}},storage:{onChanged:{addListener(){}}}};});
 for(const n of ['nexus-tools-core.js','nexus-tools.js'])await p.addScriptTag({path:path.join(root,n)});
 await p.locator('#nexus-tools-menu-link').click();await p.locator('#nexus-native-tools').getByRole('button',{name:'Settings',exact:true}).click();
 const tools=p.locator('#nexus-native-tools');
 for(const[id,v]of [['allianceMinCredits','10000'],['allianceBatchSize','2'],['alliancePauseMinutes','1']])await tools.locator(`input[data-setting-id="${id}"]`).fill(v);
 await tools.getByRole('button',{name:'Save settings',exact:true}).click();
 eq((await saved(p)).allianceMinCredits,10000);eq((await saved(p)).allianceBatchSize,2);eq((await saved(p)).alliancePauseMinutes,1);
 await p.locator('#nx-alliance-launcher').click();const panel=p.locator('#nx-alliance-panel');
 await p.waitForFunction(()=>document.querySelector('#nx-alliance-panel [data-mission="101"]'));
 eq(await panel.locator('[data-mission]').evaluateAll(ns=>ns.map(n=>n.dataset.mission)),['102','105','101']);
 eq(await panel.getByLabel('Minimum credits',{exact:true}).inputValue(),'10000');
 await panel.getByLabel('Missions per batch',{exact:true}).fill('0');await panel.getByRole('button',{name:'Save options',exact:true}).click();eq((await saved(p)).allianceBatchSize,2);
 await panel.getByLabel('Missions per batch',{exact:true}).fill('2');
 await panel.getByRole('button',{name:'Turn Alliance Auto on',exact:true}).click();
 await sent(p,'105');await idle(p);eq(f.events.map(e=>e.id),['102','105']);eq(f.events.map(e=>e.chosen),[['2'],['3']]);
 ok(await p.evaluate(()=>__NEXUS_AUTO_DISPATCH_BUSY__()));eq(await p.locator('iframe[data-nx-alliance-worker]').count(),0);
 ok((await panel.locator('#nx-alliance-auto-status').innerText()).includes('next batch at'));eq(f.api,1,'cached participation read, not one per mission');
 await p.screenshot({path:fileURLToPath(new URL('./alliance-batches-desktop.png',import.meta.url))});
 await p.setViewportSize({width:430,height:900});await p.screenshot({path:fileURLToPath(new URL('./alliance-batches-mobile.png',import.meta.url))});
 ok(await panel.getByRole('button',{name:'Save options',exact:true}).isVisible());
 const bounds=await panel.boundingBox();ok(bounds.y>=0&&bounds.y+bounds.height<=900,'panel fits viewport');
 await panel.getByRole('button',{name:'Close',exact:true}).click();
 const apiBefore=f.api;await insert(p,[{id:'106',credits:9998}]);await p.waitForTimeout(1300);eq(f.events.length,2);eq(f.api,apiBefore,'hidden pause does not fetch participation');
 // Advancing the actual browser clock exercises the scheduled timer, without invoking private functions.
 await p.clock.fastForward(60050);await sent(p,'101');await idle(p);eq(f.events.map(e=>e.id),['102','105','101']);
 await stop(p);await f.close();pass('Saved controls, exact minimum, unknown/zero exclusion, batch limit, scheduled resume, distinct units and personal independence');

 // Refresh and another tab share the saved pause; manual Support still works while auto waits.
 const multi=await fixture({enabled:true,settings:{nexusAllianceBatchSizeV1:'1',nexusAlliancePauseMinutesV1:'10'},missions:[{id:'200',credits:20000},{id:'201',credits:19000},{id:'202',credits:18000},{id:'203',credits:17000}]});
 await sent(multi.page,'200');await idle(multi.page);
 const until=await multi.page.evaluate(()=>__NEXUS_ALLIANCE_SUPPORT__.nextBatchAt);
 await multi.page.reload();await multi.mount(multi.page);await multi.page.waitForTimeout(1400);eq(multi.events.length,1);eq(await multi.page.evaluate(()=>__NEXUS_ALLIANCE_SUPPORT__.nextBatchAt),until);
 const second=await multi.context.newPage();await second.goto('https://www.missionchief.co.uk/');await multi.mount(second);await second.waitForTimeout(1400);eq(multi.events.length,1);
 await second.locator('#nx-alliance-launcher').click();await second.locator('[data-mission="201"]').getByRole('button',{name:'Support',exact:true}).click();await sent(second,'201');await idle(second);eq(multi.events.length,2);eq(await second.evaluate(()=>__NEXUS_ALLIANCE_SUPPORT__.nextBatchAt),until);
 await second.locator('#nx-alliance-panel').getByRole('button',{name:'Close',exact:true}).click();
 // Changing the pause to one minute reschedules both tabs but cannot bypass their shared batch lock.
 await configure(multi.page,{nexusAlliancePauseMinutesV1:1});
 await multi.page.clock.fastForward(60050);await sent(multi.page,'202');await idle(multi.page);await second.waitForTimeout(1400);eq(multi.events.length,3);eq(multi.events.at(-1).id,'202');
 await stop(multi.page);await multi.close();pass('Reload persistence, shared browser pause, manual support and cross-tab lock');

 // Cancellation during the participation read cannot open a mission.
 const cancel=await fixture({enabled:true,hold:true});await cancel.page.waitForTimeout(1300);await stop(cancel.page);cancel.finish();await cancel.page.waitForTimeout(500);eq(cancel.events.length,0);eq(cancel.loads.length,0);await cancel.close();pass('Stop during pending participation');

 // A failed candidate counts toward the batch, with no immediate replacement flood.
 const shortage=await fixture({enabled:true,settings:{nexusAllianceBatchSizeV1:'1',nexusAlliancePauseMinutesV1:'1'},missions:[{id:'300',credits:12000},{id:'301',credits:11000}],vehicles:[unit(1,1,10)]});
 await shortage.page.waitForFunction(()=>__NEXUS_ALLIANCE_SUPPORT__.nextBatchAt>Date.now()&&!__NEXUS_ALLIANCE_SUPPORT__.busy);eq(shortage.loads,['300']);eq(shortage.events.length,0);
 await insert(shortage.page,[{id:'302',credits:13000}]);await shortage.page.waitForTimeout(1300);eq(shortage.loads,['300']);await stop(shortage.page);await shortage.close();pass('Shortages consume batch slots and respect pause');

 // Unknown dispatch outcomes remain protected: no automatic replay or next candidate.
 const uncertain=await fixture({enabled:true,unknown:true,settings:{nexusAllianceBatchSizeV1:'3',nexusAlliancePauseMinutesV1:'1'},missions:[{id:'400',credits:12000},{id:'401',credits:11000}]});
 await uncertain.page.waitForFunction(()=>document.querySelector('[data-nx-alliance-worker]')?.contentDocument?.querySelector('#vehicle_amount')?.textContent==='1');
 await uncertain.page.waitForTimeout(300);await uncertain.page.clock.fastForward(21000);
 await uncertain.page.waitForFunction(()=>!!__NEXUS_ALLIANCE_SUPPORT__.paused);eq(uncertain.events.length,1);eq(uncertain.loads.length,1);eq((await uncertain.page.evaluate(()=>NexusAllianceResultsStore.read()))['400'].state,'uncertain');
 await uncertain.page.clock.fastForward(60050);eq(uncertain.events.length,1);await uncertain.close();pass('Unconfirmed dispatch still pauses without replay');

 // Invalid saved cadence never authorises a dispatch; failures writing pacing also fail closed.
 const invalid=await fixture({enabled:true,settings:{nexusAllianceAutoPaceV1:'broken'}});await invalid.page.waitForTimeout(1300);ok(await invalid.page.evaluate(()=>!!__NEXUS_ALLIANCE_SUPPORT__.paused));eq(invalid.api,0);eq(invalid.events.length,0);await invalid.close();pass('Corrupt saved schedule blocks automatic sends');

 // Changing options in-flight reduces the remaining batch without undoing the accepted send.
 const reduced=await fixture({enabled:true,settings:{nexusAllianceBatchSizeV1:'3'},missions:[{id:'500',credits:20000},{id:'501',credits:15000},{id:'502',credits:10000}],onDispatch:page=>configure(page,{nexusAllianceBatchSizeV1:1})});
 await sent(reduced.page,'500');await idle(reduced.page);eq(reduced.events.length,1);eq(reduced.loads,['500']);await stop(reduced.page);await reduced.close();pass('Lowering batch size takes effect before the next mission');
 const changed=await fixture({enabled:true,settings:{nexusAllianceMinCreditsV1:'5000',nexusAllianceBatchSizeV1:'2'},missions:[{id:'510',credits:20000},{id:'511',credits:10000}],onLoad:page=>configure(page,{nexusAllianceMinCreditsV1:25000})});
 await changed.page.waitForFunction(()=>__NEXUS_ALLIANCE_SUPPORT__.nextBatchAt>Date.now()&&!__NEXUS_ALLIANCE_SUPPORT__.busy);eq(changed.events.length,0);eq(changed.loads,['510']);eq(Object.keys(await changed.page.evaluate(()=>NexusAllianceResultsStore.read())).length,0);await stop(changed.page);await changed.close();pass('In-flight minimum change is checked before the dispatch checkpoint');
 // Disabling Auto after the first accepted POST verifies it, then stops the batch.
 const partial=await fixture({enabled:true,settings:{nexusAllianceBatchSizeV1:'3'},missions:[{id:'520',credits:20000},{id:'521',credits:15000}],onDispatch:page=>stop(page)});
 await sent(partial.page,'520');await idle(partial.page);eq(partial.events.length,1);ok(await partial.page.evaluate(()=>__NEXUS_ALLIANCE_SUPPORT__.nextBatchAt>Date.now()));await partial.close();pass('Stop verifies the current dispatch and cancels remaining batch');
 const quota=await fixture({missions:[{id:'530'}]});await quota.page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='nexusAllianceAutoPaceV1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);};});
 await configure(quota.page,{nexusAllianceAutoEnabledV1:true});await quota.page.waitForFunction(()=>!!__NEXUS_ALLIANCE_SUPPORT__.paused);eq(quota.loads.length,0);eq(quota.events.length,0);await quota.close();pass('Failed pause checkpoint prevents dispatch');
 // Both tabs become eligible at once: the lock and persisted deadline enforce one combined batch.
 const race=await fixture({settings:{nexusAllianceBatchSizeV1:'2'},missions:[{id:'540',credits:20000},{id:'541',credits:19000},{id:'542',credits:18000},{id:'543',credits:17000}]});
 const racingTab=await race.context.newPage();await racingTab.goto('https://www.missionchief.co.uk/');await race.mount(racingTab);
 await configure(race.page,{nexusAllianceAutoEnabledV1:true});
 const deadline=Date.now()+10000;while(race.events.length<2&&Date.now()<deadline)await race.page.waitForTimeout(100);
 await idle(race.page);await idle(racingTab);await race.page.waitForTimeout(1400);eq(race.events.map(e=>e.id),['540','541']);eq(race.loads,['540','541']);await stop(race.page);await race.close();pass('Simultaneous tabs respect one combined batch');
 // A zero minimum restores unknown-value missions; the existing value-range filter still intersects it.
 const filters=await fixture({missions:[{id:'550',credits:3000},{id:'551',credits:4999},{id:'552',credits:5000},{id:'553',credits:null}]});
 await filters.page.locator('#nx-alliance-launcher').click();const fp=filters.page.locator('#nx-alliance-panel');await filters.page.waitForFunction(()=>document.querySelectorAll('#nx-alliance-panel [data-mission]').length===4);
 await fp.getByLabel('Mission value',{exact:true}).selectOption('3');eq(await fp.locator('[data-mission]').evaluateAll(ns=>ns.map(n=>n.dataset.mission)),['551','550']);
 await fp.getByLabel('Minimum credits',{exact:true}).fill('4999');await fp.getByRole('button',{name:'Save options',exact:true}).click();eq(await fp.locator('[data-mission]').evaluateAll(ns=>ns.map(n=>n.dataset.mission)),['551']);
 await fp.getByLabel('Minimum credits',{exact:true}).fill('0');await fp.getByRole('button',{name:'Save options',exact:true}).click();await fp.getByLabel('Mission value',{exact:true}).selectOption('all');eq(await fp.locator('[data-mission]').count(),4);await filters.close();pass('Minimum and existing value range combine, including zero minimum');
 eq(read('nexus-settings.js'),read('nexus-settings-main.js'));
 ok(read('nexus-profile-sync.js').includes('(window.NexusSettings?.runtime||[]).map(s=>s.key)'));
 ok(!read('nexus-profile-sync.js').includes('nexusAllianceAutoPaceV1'));
 report.checks=checks;report.allRequestsIntercepted=true;fs.writeFileSync(new URL('./alliance-batches-browser-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${checks} assertions across ${report.cases.length} isolated Edge cases.`);
} finally {await browser.close();}
