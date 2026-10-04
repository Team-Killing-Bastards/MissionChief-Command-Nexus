import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const c=await browser.newContext(),page=await c.newPage(),reads=[];
 await c.route('**/*',route=>{const path=new URL(route.request().url()).pathname;reads.push(path);const id=path.split('/')[2];let body='<div><a id="navbar_profile_link" href="/profile/100">Test</a></div>';
 if(path==='/api/buildings')body=JSON.stringify([{id:1,caption:'Ambiguous station',building_type:2,personal_count:1},{id:4,caption:'HILLEND-AS1',building_type:'20',personal_count:1},{id:25,caption:'HART excluded',building_type:25}]);
 else if(path==='/api/vehicles')body=JSON.stringify([{id:10,caption:'AMB1',building_id:1,vehicle_type:5},{id:40,caption:'AMB4',building_id:4,vehicle_type:5}]);
 else if(path.endsWith('/personals'))body=`<a id="back_to_building" href="/buildings/${id}">Back</a><dt>Amount</dt><dd>1 people</dd><table id="personal_table"><thead><tr><th>Education</th><th>Assigned to</th></tr></thead><tbody><tr data-filterable-by='["critical_care"]'><td><input class="personal-delete-checkbox" value="11"></td><td>${id==='1'?'Unmatchable vehicle':'<a href="/vehicles/40">AMB4</a>'}</td></tr></tbody></table>`;
 else if(path.startsWith('/buildings/'))body='<dt>Specialization active</dt><dd><span>yes</span></dd><dt>Generates</dt><dd>Mass Casualty Missions (Specialization)</dd>';
 return route.fulfill({contentType:path.startsWith('/api/')?'application/json':'text/html',body});});
 await page.goto('https://www.missionchief.co.uk/');await page.evaluate(()=>{window.events=[];window.NexusPersonnelStore={ready:async()=>{}};window.addEventListener('nexus-analytics-event-v1',e=>events.push(JSON.parse(e.detail)));localStorage.setItem('nexus-upgrade-evidence-v1:100',JSON.stringify({'1':{building:{specialisation:'Mass Casualty',specialisationActive:false,specialisationVerifiedAt:123,personnelTraining:{complete:true,verifiedAt:123,counts:{critical_care:1}}},crew:[{entityType:'crew',entityId:'10',verifiedAt:123}]}}));});
 await page.addScriptTag({path:fileURLToPath(new URL('../collector-register.js',import.meta.url))});await page.getByRole('button',{name:'Ambulance evidence: automatic'}).click();await page.getByRole('button',{name:'Ambulance upgrades: 2 saved · 1 crew checks',exact:true}).waitFor({timeout:10000});
 const events=await page.evaluate(()=>window.events),rows=events.filter(e=>e.kind==='register').map(e=>e.record);
 assert.deepEqual(rows.filter(r=>r.entityType==='building').map(r=>r.entityId),[1,4]);assert(rows.filter(r=>r.entityType==='building').every(r=>r.specialisationActive===true));
 assert.equal(rows.find(r=>r.entityId===1).personnelTraining.verifiedAt,123);assert.deepEqual(rows.filter(r=>r.entityType==='crew').map(r=>r.entityId),['40']);
 const warning=events.find(e=>e.kind==='capture-health'&&e.record.area==='upgrade-details').record;assert.equal(warning.state,'warning');assert(warning.message.includes('Ambiguous station: Assigned vehicle cannot be matched safely.'));
 const saved=await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('nexus-upgrade-evidence');r.onsuccess=()=>{const q=r.result.transaction('records').objectStore('records').get('nexus-upgrade-evidence-v1:100');q.onsuccess=()=>resolve(q.result);};}));assert.equal(saved['1'].crew[0].verifiedAt,123);assert(saved['1'].building.specialisationVerifiedAt>123);assert(saved['4'].building.specialisationActive);
 assert(!reads.some(p=>p.startsWith('/buildings/25')));await c.close();console.log('PASS: actual collector continues after ambiguous crew to later small Ambulance Station; fresh specialisation and old crew dates kept independently in IDB; HART excluded; named warning emitted.');
}finally{await browser.close();}


