import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const c=await browser.newContext(),page=await c.newPage();let reads=[];
 await c.route('**/*',route=>{const path=new URL(route.request().url()).pathname;reads.push(path);const body=path==='/api/buildings'?JSON.stringify([{id:1,caption:'HILLEND-AS1 test',building_type:2,personal_count:1},{id:2,caption:'HART must be excluded',building_type:25,personal_count:1},{id:3,caption:'Home response must be excluded',building_type:22,personal_count:1}]):path==='/api/vehicles'?JSON.stringify([{id:10,caption:'AMB1',building_id:1,vehicle_type:5}]):path==='/buildings/1'?'<dt>Specialization active</dt><dd><span>yes</span></dd><dt>Generates</dt><dd>Mass Casualty Missions (Specialization)</dd>':path==='/buildings/1/personals'?'<a id="back_to_building" href="/buildings/1">Back</a><dt>Amount</dt><dd>1 people</dd><table id="personal_table"><thead><tr><th>Education</th><th>Assigned to</th><th>Status</th></tr></thead><tbody><tr data-filterable-by=\'["critical_care"]\'><td><input class="personal-delete-checkbox" value="11"></td><td><a href="/vehicles/10">AMB1</a></td><td>Not relevant</td></tr></tbody></table>':'<div><a id="navbar_profile_link" href="/profile/100">Test</a></div>';return route.fulfill({contentType:path.startsWith('/api/')?'application/json':'text/html',body});});
 await page.goto('https://www.missionchief.co.uk/');
 await page.evaluate(()=>{window.events=[];window.NexusPersonnelStore={ready:async()=>{}};window.addEventListener('nexus-analytics-event-v1',e=>events.push(JSON.parse(e.detail)));localStorage.setItem('nexus-upgrade-evidence-v1:100',JSON.stringify({'2':{building:{specialisation:'Mass Casualty',specialisationActive:false,specialisationVerifiedAt:100},crew:[]}}));const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).startsWith('nexus-upgrade-evidence'))throw new DOMException('Full','QuotaExceededError');return native.call(this,k,v);};});
 await page.addScriptTag({path:fileURLToPath(new URL('../collector-register.js',import.meta.url))});
 await page.getByRole('button',{name:'Sync ambulance upgrades'}).click();
 await page.getByRole('button',{name:'Ambulance upgrades: 1 saved'}).waitFor({timeout:10000});
 const records=await page.evaluate(()=>events.filter(e=>e.kind==='register').map(e=>e.record));
 assert.equal(records.find(r=>r.entityType==='building').specialisationActive,true);
 assert.equal(records.find(r=>r.entityType==='building').personnelTraining.counts.critical_care,1);
 assert.equal(records.find(r=>r.entityType==='crew').trainingCounts.critical_care,1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('nexus-upgrade-evidence-v1:100')),null);
 const durable=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-upgrade-evidence',1);r.onsuccess=()=>{const t=r.result.transaction('records'),q=t.objectStore('records').get('nexus-upgrade-evidence-v1:100');q.onsuccess=()=>resolve(q.result);};r.onerror=reject;}));
 assert.equal(durable['1'].building.specialisationActive,true);assert.equal(durable['2'].building.specialisationVerifiedAt,100);
 assert.deepEqual(reads.filter(x=>x.startsWith('/buildings/')),['/buildings/1','/buildings/1/personals']);
 await c.close();console.log('PASS: actual .192 capture verifies specialisation and assignment-column crew counts; evidence persists in IDB with localStorage writes blocked; legacy timestamp retained.');
}finally{await browser.close();}
