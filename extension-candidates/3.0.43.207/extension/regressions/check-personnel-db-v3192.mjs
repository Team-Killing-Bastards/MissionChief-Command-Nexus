import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const file=n=>fileURLToPath(new URL('../'+n,import.meta.url));
try{
 const c=await browser.newContext();let owned=[1,2];await c.route('**/*',route=>route.fulfill({contentType:route.request().url().endsWith('/api/vehicles')?'application/json':'text/html',body:route.request().url().endsWith('/api/vehicles')?JSON.stringify(owned.map(id=>({id}))):'<a id="navbar_profile_link" href="/profile/100">Player One</a>'}));
 const page=await c.newPage();await page.goto('https://www.missionchief.co.uk/');
 await page.evaluate(()=>{window.nativeGet=Storage.prototype.getItem;const vehicles={};for(const id of [1,2,9])vehicles[id]={vehicleId:String(id),updatedAt:1000,assignedTrainingProfiles:[['critical_care']],trainingProfilesComplete:true};localStorage.setItem('mcPersonnelVehicleTrainingRegistry_v1',JSON.stringify({schemaVersion:1,vehicles}));localStorage.setItem('unrelated','keep');});
 for(const n of ['nexus-register-storage.js','nexus-personnel-store.js'])await page.addScriptTag({path:file(n)});
 await page.evaluate(()=>NexusPersonnelStore.ready());
 assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(NexusPersonnelStore.readRaw()).vehicles)),['1','2']);
 assert.equal(await page.evaluate(()=>nativeGet.call(localStorage,'mcPersonnelVehicleTrainingRegistry_v1')),null);
 assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated')),'keep');
 // Aborted writes never change the committed cache or remove the original durable row.
 assert.equal(await page.evaluate(async()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='vehicles'&&value.id==='1'){this.transaction.abort();throw Error('disk full');}return original.call(this,value,...args);};const reg=JSON.parse(NexusPersonnelStore.readRaw());reg.vehicles['1'].updatedAt=2000;let failed=false;try{await NexusPersonnelStore.write(reg);}catch{failed=true;}IDBObjectStore.prototype.put=original;return failed&&JSON.parse(NexusPersonnelStore.readRaw()).vehicles['1'].updatedAt===1000;}),true);
 await page.evaluate(async()=>{const reg=JSON.parse(NexusPersonnelStore.readRaw());reg.vehicles['1'].updatedAt=3000;await NexusPersonnelStore.write(reg);await NexusPersonnelStore.remove(['2']);});
 const pending=await page.evaluate(()=>NexusPersonnelStore.syncState());assert(pending.rows.some(r=>r.id==='2'&&r.deleted));
 await page.evaluate(async()=>{await NexusPersonnelStore.applySync({cursor:5,rows:[{id:'1',at:2000,deleted:false,data:{vehicleId:'1',updatedAt:2000}},{id:'2',at:1000,deleted:false,data:{vehicleId:'2',updatedAt:1000}}]},[]);});
 assert.equal(await page.evaluate(()=>JSON.parse(NexusPersonnelStore.readRaw()).vehicles['1'].updatedAt),3000);assert.equal(await page.evaluate(()=>!!JSON.parse(NexusPersonnelStore.readRaw()).vehicles['2']),false);
 // Same-browser account switching must never expose the other account's records.
 owned=[9];await page.evaluate(()=>document.querySelector('a').href='/profile/200');await page.evaluate(()=>NexusPersonnelStore.ready());assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(NexusPersonnelStore.readRaw()).vehicles)),['9']);
 await page.evaluate(()=>document.querySelector('a').href='/profile/100');await page.evaluate(()=>NexusPersonnelStore.ready());assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(NexusPersonnelStore.readRaw()).vehicles)),['1']);
 await page.reload();for(const n of ['nexus-register-storage.js','nexus-personnel-store.js'])await page.addScriptTag({path:file(n)});await page.evaluate(()=>NexusPersonnelStore.ready());assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(NexusPersonnelStore.readRaw()).vehicles)),['1']);
 // Existing building writer now waits for the durable database and verifies the saved vehicle.
 await page.goto('https://www.missionchief.co.uk/buildings/10');for(const n of ['nexus-register-storage.js','nexus-personnel-store.js','nexus-crew-register.js'])await page.addScriptTag({path:file(n)});
 await page.evaluate(async()=>{await NexusPersonnelStore.ready();await __NEXUS_CREW_REGISTER__.save({vehicleId:'1',vehicleTypeId:'5',buildingId:'10',profiles:[['critical_care'],['critical_care']],vehicleName:'AB',stationName:'STATION',rowsSeen:2});});
 assert.equal(await page.evaluate(()=>JSON.parse(NexusPersonnelStore.readRaw()).vehicles['1'].assignedPersonnelCount),2);
 console.log('PASS: owned-only migration, archived legacy for another player, no quota-backed register, atomic failed saves, durable changes, stale/tombstone protection, account isolation, reload persistence and real crew-writer await/verification.');
 await c.close();
}finally{await browser.close();}
