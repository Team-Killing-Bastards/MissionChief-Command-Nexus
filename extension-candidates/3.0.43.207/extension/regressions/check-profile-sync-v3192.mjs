import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const file=n=>fileURLToPath(new URL('../'+n,import.meta.url));
try {
 const context=await browser.newContext();await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<div><a id="navbar_profile_link" href="/profile/100">Test</a></div>'}));
 const page=await context.newPage();await page.goto('https://www.missionchief.co.uk/');
 await page.evaluate(()=>{
  window.NexusSettings={runtime:[{key:'testPref',fallback:true}]};window.remote=[];window.sent=[];window.revision=0;window.editDuringReply=null;window.autoBusy=false;
  window.__NEXUS_AUTO_DISPATCH_BUSY__=()=>window.autoBusy;
  window.addEventListener('nexus:account-request',async e=>{
   const m=JSON.parse(e.detail);let result={ok:true};
   if(m.action==='STATUS')Object.assign(result,{signedIn:true,enabled:true,discordId:'123'});
   if(m.action==='PREFS_GET')result.values={tools:null,rules:null};
   if(m.action==='SYNC'){
    sent.push(m.body);if(editDuringReply){localStorage.setItem('testPref',editDuringReply);editDuringReply=null;}
    const rows=remote.splice(0);result.data={discordId:'123',cursor:++revision,more:false,rows};
   }
   window.dispatchEvent(new CustomEvent('nexus:account-response',{detail:JSON.stringify({id:m.id,result})}));
  });
 });
 for(const n of ['nexus-register-storage.js','nexus-personnel-store.js','nexus-profile-sync.js'])await page.addScriptTag({path:file(n)});
 await page.evaluate(()=>NexusPersonnelStore.ready());
 await page.evaluate(()=>__NEXUS_PROFILE_SYNC__.sync());
 await page.evaluate(async()=>{remote=[{kind:'setting',id:'local:testPref',at:1000,deleted:false,data:'true'}];await __NEXUS_PROFILE_SYNC__.sync();});
 assert.equal(await page.evaluate(()=>localStorage.getItem('testPref')),'true');
 // A user edit made after sending the request takes priority over an older download.
 await page.evaluate(async()=>{remote=[{kind:'setting',id:'local:testPref',at:2000,deleted:false,data:'true'}];editDuringReply='false';await __NEXUS_PROFILE_SYNC__.sync();});
 assert.equal(await page.evaluate(()=>localStorage.getItem('testPref')),'false');
 assert(await page.evaluate(()=>sent.some(b=>b.rows.some(r=>r.id==='local:testPref'&&r.data==='false'&&r.at>2000))));
 // Defer restoration while dispatching, then preserve a local edit made before idle.
 await page.evaluate(async()=>{autoBusy=true;remote=[{kind:'setting',id:'local:testPref',at:Date.now()+1000,deleted:false,data:'true'}];await __NEXUS_PROFILE_SYNC__.sync();});
 assert.equal(await page.evaluate(()=>localStorage.getItem('testPref')),'false');
 await page.evaluate(async()=>{autoBusy=false;await __NEXUS_PROFILE_SYNC__.sync();});
 assert.equal(await page.evaluate(()=>localStorage.getItem('testPref')),'true');
 // Non-allowlisted keys cannot restore queue locks, collector secrets or dispatch state.
 await page.evaluate(async()=>{remote=[{kind:'setting',id:'local:nexusDiscordAccountV1',at:Date.now(),deleted:false,data:'secret'},{kind:'setting',id:'local:mf_auto_state',at:Date.now(),deleted:false,data:'running'}];await __NEXUS_PROFILE_SYNC__.sync();});
 assert.equal(await page.evaluate(()=>localStorage.getItem('nexusDiscordAccountV1')),null);
 assert.equal(await page.evaluate(()=>localStorage.getItem('mf_auto_state')),null);
 assert.equal(await page.evaluate(()=>sent.every(b=>b.player==='100'&&b.realm==='www.missionchief.co.uk'&&b.rows.length<=100)),true);
 await context.close();
 console.log('PASS: real IDB + sync bridge settings restore, edits during network request, deferred busy restore, protected-key exclusion and scoped bounded batches.');
}finally{await browser.close();}
