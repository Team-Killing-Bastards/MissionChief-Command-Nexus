import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
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
 await page.evaluate(()=>window.__NEXUS_AUTO_DISPATCH_BUSY__=()=>false);
 for(const file of ['nexus-vehicle-claims.js','nexus-alliance-core.js','nexus-alliance-results-store.js','nexus-alliance-support.js'])await page.addScriptTag({path:fileURLToPath(new URL('../'+file,import.meta.url))});
 await page.locator('#nx-alliance-launcher').click();
 await page.locator('[data-mission="123"]').getByRole('button',{name:'Support',exact:true}).click();
 await page.waitForFunction(()=>!window.__NEXUS_ALLIANCE_SUPPORT__.busy);
 assert.equal(sends,1);assert.deepEqual(chosen,['2'],'closest vehicle from later page must win');
 assert.equal(await page.locator('iframe[data-nx-alliance-worker]').count(),0);
 const record=await page.evaluate(async ()=>(await NexusAllianceResultsStore.read())['123']);
 assert.equal(record.state,'sent');assert.equal(record.vehicle,'2');
 console.log('PASS: browser support button loads later page, chooses closer officer, sends exactly once, confirms and releases frame.');
}finally{await browser.close();}
