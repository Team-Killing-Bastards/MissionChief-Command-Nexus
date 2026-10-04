import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const file=name=>fileURLToPath(new URL('../'+name,import.meta.url));
try{
 const context=await browser.newContext();await context.route('**/*',r=>r.fulfill({contentType:r.request().url().endsWith('/api/vehicles')?'application/json':'text/html',body:r.request().url().endsWith('/api/vehicles')?JSON.stringify(Array.from({length:11000},(_,id)=>({id}))):'<a id="navbar_profile_link" href="/profile/100">Storage fixture</a>'}));const page=await context.newPage();await page.goto('https://www.missionchief.co.uk/');
 // Seed packed-v1 storage exactly as the previous build would, without layering wrappers.
 const old=fs.readFileSync(new URL('../../build-190/nexus-register-storage.js',import.meta.url),'utf8');
 const begin=old.indexOf(" const key="),end=old.indexOf(' const proto=Storage.prototype');
 await page.addScriptTag({content:'(()=>{'+old.slice(begin,end)+'window.oldPack=pack;})();'});
 await page.evaluate(()=>{
  const vehicles={};for(let i=0;i<11000;i++)vehicles[i]={vehicleId:String(i),vehicleName:'🚒 '+i,vehicleTypeId:'5',stationName:'STATION '+Math.floor(i/20),stationHref:'/buildings/'+Math.floor(i/20),assignedPersonnelCount:6,assignmentScanComplete:true,trainingCounts:{hazmat:6},assignedTrainingProfiles:Array.from({length:6},()=>['hazmat']),trainingProfilesComplete:true,updatedAt:1790499493893,source:'personnel-register-exact-assign-crew'};
  window.original=JSON.stringify({schemaVersion:1,vehicles});window.nativeGet=Storage.prototype.getItem;window.before=oldPack(original).length;
  localStorage.setItem('mcPersonnelVehicleTrainingRegistry_v1',oldPack(original));localStorage.setItem('fixture-setting','keep');
  for(let i=0;;i++)try{localStorage.setItem('fill-'+i,'x'.repeat(1000));}catch{break;}
 });
 await page.addScriptTag({path:file('nexus-register-storage.js')});await page.addScriptTag({path:file('nexus-personnel-store.js')});await page.evaluate(()=>NexusPersonnelStore.ready());
 const result=await page.evaluate(()=>{
  const key='mcPersonnelVehicleTrainingRegistry_v1',stored=nativeGet.call(localStorage,key);
  if(JSON.stringify(JSON.parse(localStorage.getItem(key)).vehicles)!==JSON.stringify(JSON.parse(original).vehicles))throw Error('Migration changed register vehicles');if(stored!==null)throw Error('Legacy register was not released after durable migration');
  localStorage.setItem('fixture-auto-stop','x'.repeat(50000));
  return {before,after:stored?.length||0,setting:localStorage.getItem('fixture-setting')};
 });
 assert(result.after<result.before/2);assert.equal(result.setting,'keep');console.log('PASS: full Chromium storage recovered by verified migration of 11,000 vehicles to IDB:',result);
 await context.close();
 const c=await browser.newContext();await c.route('**/*',r=>r.fulfill({body:'fixture'}));const p=await c.newPage();await p.goto('https://www.missionchief.co.uk/');
 await p.evaluate(()=>localStorage.setItem('nexusAllianceSupportResultsV1',JSON.stringify({1:{state:'uncertain',vehicle:'12',at:Date.now()}})));
 await p.addScriptTag({path:file('nexus-alliance-results-store.js')});
 const outcome=await p.evaluate(async()=>{
  const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){this.transaction.abort();throw Error('disk failure');};
  let failed=false;try{await NexusAllianceResultsStore.read();}catch{failed=true;}
  const retained=!!localStorage.getItem('nexusAllianceSupportResultsV1');IDBObjectStore.prototype.put=put;
  const migrated=await NexusAllianceResultsStore.read();await NexusAllianceResultsStore.forget('1');
  const forgotten=!(await NexusAllianceResultsStore.read())['1'];
  localStorage.setItem('nexusAllianceSupportResultsV1','invalid JSON');let corruptBlocked=false;try{await NexusAllianceResultsStore.read();}catch{corruptBlocked=true;}
  return {failed,retained,migrated:migrated['1'].state,forgotten,corruptBlocked,corruptRetained:localStorage.getItem('nexusAllianceSupportResultsV1')==='invalid JSON'};
 });
 assert.deepEqual(outcome,{failed:true,retained:true,migrated:'uncertain',forgotten:true,corruptBlocked:true,corruptRetained:true});console.log('PASS: migration abort retains legacy history; recovery and forget persist; corrupt legacy fails closed.');
 await c.close();
}finally{await browser.close();}
