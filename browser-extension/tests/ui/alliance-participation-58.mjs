import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {devLibrary} from '../../scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
fs.mkdirSync('audit',{recursive:true});
const report={version:JSON.parse(fs.readFileSync('extension/manifest.json')).version,realGame:false,checks:[],errors:[],dispatches:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
const card=(id,title,flag='new')=>`<div class="missionSideBarEntry" mission_id="${id}" data-mission-participation-filter="${flag}" data-sortable-by='{"average_credits":26300}'><a class="mission-alarm-button" href="/missions/${id}"><span id="mission_caption_${id}">${title}</span></a></div>`;
const home=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#384852;font:14px Arial}.navbar-header{height:50px;background:#bd2f27}.navbar-brand{float:left;padding:14px;color:white}#map{height:1000px;background:linear-gradient(130deg,#22484c,#182d38)}</style></head><body><div class="navbar-header"><a class="navbar-brand" href="/">MC</a></div><a id="navbar_profile_link" href="/profile/123">Player</a><div id="mission_list_alliance" style="display:none">${card(260720772,'[Alliance] Large Aircraft Crash Off Airport')}${card(102,'Ambulance travelling')}${card(103,'Available for support')}${card(104,'Queued only')}${card(107,'Joined card','participated')}</div><div id="map"></div></body></html>`;
const ownFleet=[
 {id:11,vehicle_type:8,fms_real:4,target_type:'mission',target_id:260720772},
 {id:12,vehicle_type:8,fms_real:4,target_type:'mission',target_id:260720772},
 {id:13,vehicle_type:4,fms_real:3,target_type:'mission',target_id:102},
 {id:14,vehicle_type:3,fms_real:2,target_type:'building',target_id:104,queued_mission_id:104}
];
let fleet=ownFleet,fleetCalls=0,reply='ok',apiDelay=0,missionReads=0;
const base=path.resolve('extension');
const context=await chromium.launchPersistentContext(path.resolve('audit',`alliance58-${Date.now()}`),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport:{width:1280,height:900},args:[`--disable-extensions-except=${base}`,`--load-extension=${base}`],ignoreDefaultArgs:['--disable-extensions']});
try {
 await context.route('https://**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!=='https://www.missionchief.co.uk')return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:home});
  if(url.pathname==='/api/vehicles'){
   fleetCalls++;if(apiDelay)await new Promise(r=>setTimeout(r,apiDelay));
   return route.fulfill({status:reply==='error'?503:200,contentType:'application/json',body:reply==='malformed'?'{}':reply==='oversize'?' '.repeat(12*1024*1024+1):JSON.stringify(fleet)});
  }
  const alarm=url.pathname.match(/^\/missions\/(\d+)\/alarm$/);
  if(alarm){const selected=new URLSearchParams(route.request().postData()).getAll('vehicle_ids[]');report.dispatches.push({mission:alarm[1],selected});return route.fulfill({contentType:'text/html',body:`<div class="alert alert-success"><a href="/vehicles/${selected[0]}">Officer</a> has successfully been dispatched.</div>`});}
  if(/^\/missions\/\d+$/.test(url.pathname)){
   missionReads++;
   return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="csrf-token" content="fixture"></head><body><div id="mission_general_info">Shared mission</div><div id="vehicle_list_step"><table><tbody><tr data-sortvalue="10"><td><a href="/vehicles/202">2</a><input type="checkbox" name="vehicle_ids[]" class="vehicle_checkbox" vehicle_type_id="3" value="202"><a href="/vehicles/202">Fire Officer 202</a></td></tr></tbody></table></div><a id="mission_alarm_btn" title="Dispatch" href="#">Dispatch <span id="vehicle_amount">0</span></a><div id="feedback"></div><script>document.addEventListener('change',()=>document.getElementById('vehicle_amount').textContent=document.querySelectorAll('input:checked').length);document.getElementById('mission_alarm_btn').onclick=async e=>{e.preventDefault();const data=new URLSearchParams();for(const box of document.querySelectorAll('input:checked'))data.append('vehicle_ids[]',box.value);const response=await fetch('${url.pathname}/alarm',{method:'POST',body:data});document.getElementById('feedback').innerHTML=await response.text();};</script></body></html>`});
  }
  return route.fulfill({contentType:'application/json',body:'[]'});
 });
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto('https://www.missionchief.co.uk/');await page.locator('#nx-alliance-launcher').click();
 const panel=page.locator('#nx-alliance-panel'),row=id=>panel.locator(`[data-mission="${id}"]`),hint=panel.locator('[data-support-read]');
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-support-read]')?.textContent.startsWith('Supported missions checked'));
 const error=()=>page.waitForFunction(()=>document.querySelector('[data-support-read]')?.textContent.startsWith('Could not verify'));
 const refresh=()=>panel.getByRole('button',{name:'Refresh',exact:true}).click();
 const idle=()=>page.waitForFunction(()=>!window.__NEXUS_ALLIANCE_SUPPORT__.busy);
 await ready();assert.equal(fleetCalls,1);assert.deepEqual(await panel.locator('[data-mission]').evaluateAll(nodes=>nodes.map(n=>n.dataset.mission)),['103','104']);
 await panel.getByLabel('Show already supported').check();await ready();
 assert.equal(await row(260720772).locator('.nx-as-state').innerText(),'Supported');assert.equal(await row(102).locator('.nx-as-state').innerText(),'Supported');assert.equal(await row(104).locator('.nx-as-state').innerText(),'Not supported');
 assert.equal(await row(260720772).getByRole('button',{name:'Support',exact:true}).isDisabled(),true);
 await page.screenshot({path:'audit/alliance-58-supported.png'});
 pass('Stale new cards: own police IRVs on scene and ambulance travelling are supported; queued-only officer is not');
 await panel.getByLabel('Show already supported').uncheck();await ready();assert.equal(await row(260720772).count(),0);assert.equal(await row(102).count(),0);assert.equal(missionReads,0);assert.equal(report.dispatches.length,0);
 pass('Hide supported removes existing participation; opening and filtering fetch no missions and send no vehicles');
 const before=fleetCalls;apiDelay=400;
 // Fire the controls within one task so the requests really overlap. Separate
 // actionability clicks can outlast the fixture response on a busy test host.
 await page.evaluate(()=>{
  const p=document.getElementById('nx-alliance-panel'),refresh=[...p.querySelectorAll('button')].find(n=>n.textContent==='Refresh');
  refresh.click();refresh.click();const toggle=p.querySelector('input[type=checkbox]');toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));
 });await ready();assert.equal(fleetCalls,before+1);apiDelay=0;
 const cached=fleetCalls;
 await page.evaluate(()=>document.querySelector('[mission_id="103"]').setAttribute('data-sortable-by','{"average_credits":27000}'));
 await page.waitForFunction(()=>document.querySelector('[data-mission="103"] small')?.textContent.includes('27,000'));assert.equal(fleetCalls,cached);
 pass('Concurrent refresh and toggle share one fleet read; live-card changes reuse the recent participation set');
 reply='error';await refresh();await error();assert.equal(await row(260720772).locator('.nx-as-state').innerText(),'Supported');assert.equal(await row(103).locator('.nx-as-state').innerText(),'Participation not verified');assert.equal(await row(103).getByRole('button',{name:'Support',exact:true}).isDisabled(),true);
 await panel.getByLabel('Show already supported').uncheck();await error();assert.equal(await row(260720772).count(),0);
 reply='malformed';await refresh();await error();assert.equal(await row(103).getByRole('button',{name:'Support',exact:true}).isDisabled(),true);
 reply='oversize';await refresh();await error();assert.equal(await row(103).getByRole('button',{name:'Support',exact:true}).isDisabled(),true);
 pass('Failed, malformed and oversized fleet reads retain known support and prevent unsupported claims or new dispatches');
 reply='ok';await refresh();await ready();
 await row(104).getByRole('button',{name:'Select',exact:true}).click();
 fleet=[...ownFleet,{id:20,vehicle_type:8,fms_real:4,target_type:'mission',target_id:104}];
 await panel.getByRole('button',{name:'Support selected (1)',exact:true}).click();await idle();assert.equal(missionReads,0);assert.equal(report.dispatches.length,0);assert.equal(await row(104).count(),0);
 pass('Fresh pre-batch fleet check catches manual support made after selection and removes it without dispatch');
 await row(103).getByRole('button',{name:'Support',exact:true}).click();await idle();assert.deepEqual(report.dispatches,[{mission:'103',selected:['202']}]);assert.equal(await row(103).count(),0);
 await panel.getByLabel('Show already supported').check();await ready();assert.equal(await row(103).locator('.nx-as-state').innerText(),'Sent: 1 Fire Officer');
 await refresh();await ready();assert.equal(await row(103).locator('.nx-as-state').innerText(),'Sent: 1 Fire Officer');assert.equal(await panel.getByText('Sent · 2',{exact:true}).count(),0);
 await page.screenshot({path:'audit/alliance-58-sent.png'});
 await page.reload();await page.locator('#nx-alliance-launcher').click();await ready();await panel.getByLabel('Show already supported').check();await ready();assert.equal(await row(103).locator('.nx-as-state').innerText(),'Sent: 1 Fire Officer');assert.equal(report.dispatches.length,1);
 pass('Native status badge 2 never appears as sent count: one selected officer, clear confirmation and persisted label after reload');
 fleet=[];await refresh();await ready();assert.equal(await row(260720772).locator('.nx-as-state').innerText(),'Not supported');assert.equal(await row(107).locator('.nx-as-state').innerText(),'Supported');assert.equal(await row(103).locator('.nx-as-state').innerText(),'Sent: 1 Fire Officer');
 pass('Successful refresh replaces old fleet targets while retaining native-positive and locally confirmed support');
 assert.deepEqual(report.errors,[]);report.fleetCalls=fleetCalls;report.missionReads=missionReads;report.passed=true;
} finally {fs.writeFileSync('audit/alliance-participation-58.json',JSON.stringify(report,null,2)+'\n');await context.close();}
