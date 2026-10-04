import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
 for(const failCheckpoint of [false,true]) {
 const context=await browser.newContext(),page=await context.newPage();let sends=0,chosen=[];
 const vehicle=(id,time)=>`<tr data-sortvalue="${time}"><td><input class="vehicle_checkbox" name="vehicle_ids[]" type="checkbox" value="${id}" vehicle_type_id="3"><a href="/vehicles/${id}">Officer ${id}</a></td></tr>`;
 await context.route('https://www.missionchief.co.uk/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const html=body=>route.fulfill({contentType:'text/html',body});
  if(path==='/api/vehicles')return route.fulfill({contentType:'application/json',body:'[]'});
  if(path==='/')return html(`<button id="mcn-v3-map-controller">Nexus</button><div id="mission_list_alliance"><div class="missionSideBarEntry" mission_id="123" data-mission-participation-filter="new" data-sortable-by='{"average_credits":5000}'><a class="mission-alarm-button" href="/missions/123">Test mission</a></div></div>`);
  if(path==='/missions/123')return html(`<table id="vehicle_list_step"><tbody>${vehicle(1,100)}</tbody></table><a class="missing_vehicles_load" href="#more">More</a><a id="mission_alarm_btn" href="#" title="Dispatch">Dispatch <span id="vehicle_amount">0</span></a><div id="feedback"></div><script>
   document.querySelector('.missing_vehicles_load').onclick=e=>{e.preventDefault();e.target.classList.add('disabled');setTimeout(()=>{document.querySelector('tbody').insertAdjacentHTML('beforeend',${JSON.stringify(vehicle(2,10))});e.target.remove();},300);};
   document.addEventListener('change',()=>document.querySelector('#vehicle_amount').textContent=document.querySelectorAll('input:checked').length);
   document.querySelector('#mission_alarm_btn').onclick=async e=>{e.preventDefault();const body=new URLSearchParams();document.querySelectorAll('input:checked').forEach(n=>body.append('vehicle_ids[]',n.value));document.querySelector('#feedback').innerHTML=await(await fetch('/missions/123/alarm',{method:'POST',body})).text();};
  </script>`);
  if(path==='/missions/123/alarm'){sends++;chosen=new URLSearchParams(route.request().postData()).getAll('vehicle_ids[]');return html(`<div class="alert alert-success"><a href="/vehicles/${chosen[0]}">Officer</a> has successfully been dispatched.</div>`);}
  return route.fulfill({status:404,body:''});
 });
 await page.goto('https://www.missionchief.co.uk/');
 await page.evaluate(()=>{
  window.__NEXUS_AUTO_DISPATCH_BUSY__=()=>false;
  const history={999:{state:'uncertain',vehicle:'999',vehicleType:'3',at:Date.now()-86400000*10}};
  for(let i=1000;i<1500;i++)history[i]={state:'sent',vehicle:String(i),vehicleType:'3',at:Date.now()};
  localStorage.setItem('nexusAllianceSupportResultsV1',JSON.stringify(history));
  // Fill real Chromium localStorage to its quota; migration must free the lease space.
  for(let i=0;;i++){try{localStorage.setItem('fixture-fill-'+i,'x'.repeat(10000));}catch{break;}}
 });
 for(const file of ['nexus-vehicle-claims.js','nexus-alliance-core.js','nexus-alliance-results-store.js','nexus-alliance-support.js'])await page.addScriptTag({path:fileURLToPath(new URL('../'+file,import.meta.url))});
 await page.locator('#nx-alliance-launcher').click();
 await page.waitForFunction(()=>!document.querySelector('[data-mission="123"] button')?.disabled);
 if(failCheckpoint)await page.evaluate(()=>{
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,...args){if(value?.['123']?.state==='uncertain'){this.transaction.abort();throw new DOMException('Injected disk failure','QuotaExceededError');}return put.call(this,value,...args);};
 });
 await page.locator('[data-mission="123"]').getByRole('button',{name:'Support',exact:true}).click();
 await page.waitForFunction(()=>!window.__NEXUS_ALLIANCE_SUPPORT__.busy);
 if(failCheckpoint){
  assert.equal(sends,0,'failed durable checkpoint must prevent the native dispatch');
  assert.equal(await page.locator('iframe[data-nx-alliance-worker]').count(),0);
  console.log('PASS: aborting the IndexedDB checkpoint sends nothing and releases the frame.');
  await context.close();continue;
 }
 assert.equal(sends,1);assert.deepEqual(chosen,['2'],'closest vehicle from later page must win');
 assert.equal(await page.locator('iframe[data-nx-alliance-worker]').count(),0);
 const record=await page.evaluate(async ()=>(await NexusAllianceResultsStore.read())['123']);
 assert.equal(record.state,'sent');assert.equal(record.vehicle,'2');
 assert.equal(await page.evaluate(()=>localStorage.getItem('nexusAllianceSupportResultsV1')),null);
 assert.equal(await page.evaluate(async()=>(await NexusAllianceResultsStore.read())['999'].state),'uncertain','old uncertain records must not expire');
 await page.reload();await page.addScriptTag({path:fileURLToPath(new URL('../nexus-alliance-results-store.js',import.meta.url))});
 assert.equal(await page.evaluate(async()=>(await NexusAllianceResultsStore.read())['123'].state),'sent','checkpoint survives reload');
 console.log('PASS: browser support button loads later page, chooses closer officer, sends exactly once, confirms and releases frame.');
 await context.close();
 }
}finally{await browser.close();}
