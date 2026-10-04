import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const file=n=>fileURLToPath(new URL('../'+n,import.meta.url));
try {
 const c=await browser.newContext();await c.route('**/*',r=>r.fulfill({contentType:r.request().url().endsWith('/api/vehicles')?'application/json':'text/html',body:r.request().url().endsWith('/api/vehicles')?'[{"id":1}]':'<a id="navbar_profile_link" href="/profile/100">Test</a>'}));
 const p=await c.newPage();await p.goto('https://www.missionchief.co.uk/');
 await p.evaluate(()=>{
  window.NexusSettings={runtime:[{key:'testPref',fallback:true}]};window.autoBusy=false;window.__NEXUS_AUTO_DISPATCH_BUSY__=()=>autoBusy;
  window.requests=[];window.cloud=new Map();window.rev=0;window.editDuringRead=false;window.changeAccount=false;window.owner='123';window.lastStatus='';window.extensionPrefs={tools:null,rules:null};
  window.seed=(id,data,at=1000,kind='setting')=>cloud.set(kind+':'+id,{id,data,at,kind,deleted:data===null,rev:++rev});
  window.addEventListener('nexus:profile-sync-status',e=>lastStatus=JSON.parse(e.detail).message);
  window.addEventListener('nexus:account-request',e=>{
   const m=JSON.parse(e.detail);let result={ok:true};
   if(m.action==='STATUS')Object.assign(result,{signedIn:true,enabled:true,discordId:owner});
   if(m.action==='PREFS_GET')result.values=extensionPrefs;
   if(m.action==='PREFS_SET')extensionPrefs[m.key]=m.value;
   if(m.action==='SYNC'){
    requests.push(m.body);if(editDuringRead){editDuringRead=false;localStorage.setItem('testPref','true');}if(changeAccount){changeAccount=false;owner='456';}
    for(const row of m.body.rows){const k=row.kind+':'+row.id,old=cloud.get(k);if(!old||row.at>old.at)cloud.set(k,{...row,rev:++rev});}
    const rows=[...cloud.values()].filter(r=>r.rev>m.body.cursor).sort((a,b)=>a.rev-b.rev).slice(0,2),cursor=rows.at(-1)?.rev||Math.max(m.body.cursor,rev);
    result.data={discordId:owner,cursor,rows:rows.map(({rev,...r})=>r),more:cursor<rev};
   }
   window.dispatchEvent(new CustomEvent('nexus:account-response',{detail:JSON.stringify({id:m.id,result})}));
  });
 });
 for(const n of ['nexus-register-storage.js','nexus-personnel-store.js','nexus-profile-sync.js'])await p.addScriptTag({path:file(n)});
 await p.evaluate(async()=>{await NexusPersonnelStore.ready();await NexusPersonnelStore.write({schemaVersion:1,vehicles:{'1':{vehicleId:'1',updatedAt:100,assignedPersonnelCount:2}}});localStorage.setItem('testPref','false');localStorage.setItem('toolkitWebhook','keep-private');seed('local:testPref','true');seed('local:toolkitWebhook','do-not-restore');seed('1',{vehicleId:'1',updatedAt:999,assignedPersonnelCount:99},999,'vehicle');});
 await p.evaluate(()=>__NEXUS_PROFILE_SYNC__.chooseSettings('cloud'));
 assert.equal(await p.evaluate(()=>localStorage.getItem('testPref')),'true');assert.equal(await p.evaluate(()=>localStorage.getItem('toolkitWebhook')),'keep-private');
 assert.equal(await p.evaluate(()=>JSON.parse(NexusPersonnelStore.readRaw()).vehicles['1'].assignedPersonnelCount),2);assert(await p.evaluate(()=>requests.every(r=>r.rows.length===0)));assert.match(await p.evaluate(()=>lastStatus),/applied/);
 await p.evaluate(async()=>{localStorage.setItem('testPref','false');requests=[];await __NEXUS_PROFILE_SYNC__.chooseSettings('device');});
 assert.equal(await p.evaluate(()=>cloud.get('setting:local:testPref').data),'false');assert.match(await p.evaluate(()=>lastStatus),/kept and saved/);assert(await p.evaluate(()=>requests.every(r=>r.rows.every(row=>row.kind==='setting'&&!row.id.includes('Webhook')))));
 // Choosing the cloud explicitly can replace a newer local setting with the saved one.
 await p.evaluate(async()=>{seed('local:testPref','true',500);await __NEXUS_PROFILE_SYNC__.chooseSettings('cloud');});assert.equal(await p.evaluate(()=>localStorage.getItem('testPref')),'true');
 // No data in cloud is not an instruction to clear this browser.
 await p.evaluate(async()=>{cloud.clear();rev=0;await __NEXUS_PROFILE_SYNC__.chooseSettings('cloud');});assert.equal(await p.evaluate(()=>localStorage.getItem('testPref')),'true');assert.match(await p.evaluate(()=>lastStatus),/No saved cloud settings/);
 await p.evaluate(async()=>{seed('local:testPref','false');localStorage.setItem('testPref','false');editDuringRead=true;requests=[];await __NEXUS_PROFILE_SYNC__.chooseSettings('cloud');});assert.equal(await p.evaluate(()=>localStorage.getItem('testPref')),'true');assert.match(await p.evaluate(()=>lastStatus),/Device settings changed/);assert(await p.evaluate(()=>requests.every(r=>r.rows.length===0)));
 await p.evaluate(async()=>{autoBusy=true;requests=[];await __NEXUS_PROFILE_SYNC__.chooseSettings('device');});assert.equal(await p.evaluate(()=>requests.length),0);assert.match(await p.evaluate(()=>lastStatus),/Stop Auto Mode/);
 await p.evaluate(async()=>{autoBusy=false;changeAccount=true;await __NEXUS_PROFILE_SYNC__.chooseSettings('cloud');});assert.match(await p.evaluate(()=>lastStatus),/Account changed/);assert.equal(await p.evaluate(()=>localStorage.getItem('testPref')),'true');
 assert.equal(await p.evaluate(()=>JSON.parse(NexusPersonnelStore.readRaw()).vehicles['1'].assignedPersonnelCount),2);
 await c.close();console.log('PASS: explicit cloud/device choices, paginated read-back verification, older cloud restore, empty cloud, concurrent edits, Auto busy and account changes; register and Toolkit webhook untouched.');
}finally{await browser.close();}
