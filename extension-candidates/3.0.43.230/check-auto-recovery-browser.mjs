import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const old=fs.readFileSync(new URL('../3.0.43.226/extension/nexus-runtime.js',import.meta.url),'utf8');
function fn(name,text=source){const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);assert(a);const b=/\n {0,4}(?:async )?function /.exec(text.slice(a.index+a[0].length));assert(b);return text.slice(a.index,a.index+a[0].length+b.index);}
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const report={};
try{
 const page=await browser.newPage(),requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{
  const u=new URL(r.request().url());requests.push({method:r.request().method(),path:u.pathname});
  return r.fulfill({contentType:'text/html',body:u.pathname==='/'?'<iframe name="mcn-v3-active-worker-1-101" src="/missions/101"></iframe>':
   '<form method="post" action="/missions/101"><input type="checkbox" class="vehicle_checkbox" name="vehicle_ids[]" value="5" checked><button id="mission_alarm_btn">Dispatch</button></form><button id="auto-mode-box">Auto Mode: Stop</button>'});
 });
 await page.goto('https://www.missionchief.co.uk/');
 const install=async reader=>page.evaluate(reader=>{
  const w=document.querySelector('iframe').contentWindow;
  window.owner={token:'owner',missionKey:'mission101'};
  Object.assign(w,{autoModeRunning:true,autoModeLoopActive:false,mfAutoStartup:{phase:'running'},mfAutoAdvanceResumeActive:false,mfAutoUpgradeResumeActive:false,
   MF_AUTO_DISPATCH_LATCH_KEY:'mf_auto_dispatch_latch_v1',MF_AUTO_DISPATCH_LATCH_TTL_MS:300000,MF_AUTO_ADVANCE_AFTER_DISPATCH_KEY:'advance',MF_AUTO_UPGRADE_PENDING_KEY:'upgrade',MF_QUEUE_OPENING_MISSION_FLAG:'opening',MF_FINAL_QUEUE_DISPATCH_FLAG:'final',MF_INSTANCE_TOKEN:'owner',MF_SHARED_ACTIVE_INSTANCE_KEY:'owner',
   isManualAutoStopActive:()=>false,isMissionPage:()=>true,isMfV3ManagedActiveWorker:()=>w.name.startsWith('mcn-v3-active-worker-'),
   getCurrentMissionIdForQueueRestart:()=> '101',getLocalMissionInstanceKey:()=> 'mission101',getSharedTopWindow:()=>window});
  w.eval(reader);w.__NEXUS_READ_IDLE_DISPATCH_CLAIM__=w.nexusReadIdleDispatchClaim;
 },reader);
 await install(fn('nexusReadIdleDispatchClaim'));
 await page.evaluate(()=>{sessionStorage.setItem('final','true');sessionStorage.setItem('opening','true');sessionStorage.setItem('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101',claimedAt:Date.now()}));});
 check(await page.evaluate(()=>document.querySelector('iframe').contentWindow.__NEXUS_READ_IDLE_DISPATCH_CLAIM__({finalHandoff:true})===null),'same document remains protected before native submit');
 const frame=page.frames().find(f=>f.url().includes('/missions/'));
 await Promise.all([frame.waitForNavigation({waitUntil:'load'}),frame.locator('#mission_alarm_btn').click()]);
 await install(fn('nexusReadIdleDispatchClaim',old));
 check(await page.evaluate(()=>document.querySelector('iframe').contentWindow.__NEXUS_READ_IDLE_DISPATCH_CLAIM__({finalHandoff:true})===null),'baseline reproduced after actual same-route form navigation');
 await install(fn('nexusReadIdleDispatchClaim'));
 check(await page.evaluate(()=>!!document.querySelector('iframe').contentWindow.__NEXUS_READ_IDLE_DISPATCH_CLAIM__({finalHandoff:true})),'replacement document can prove inherited final claim');
 await page.evaluate(controller=>{
  const worker=document.querySelector('iframe'),doc=worker.contentDocument,noop=()=>{};
  window.originalClaim=sessionStorage.getItem('mf_auto_dispatch_latch_v1');
  Object.assign(window,{actions:[],state:{wanted:true,stopping:false,workerRole:'MISSION_A',worker,workerDocument:doc,workerDocumentSerial:2,currentMissionId:'101',currentMissionName:'Fireplace fire'},
   currentWorkerAutoConfirmed:()=>true,sessionGet:k=>sessionStorage.getItem(k)||'',V2_FINAL_QUEUE_DISPATCH_FLAG:'final',
   missionIdFromUrl:u=>new URL(u,location.href).pathname.match(/\/missions\/(\d+)/)?.[1]||'',
   collectMissionCandidates:()=>[],choosePostDispatchRecoveryTarget:()=>({missionId:'102',url:'/missions/102'}),transportServiceRequest:()=>null,
   sameOriginUrl:u=>new URL(u,location.href),isMissionUrl:u=>/\/missions\/\d+$/.test(u),
   recordPostDispatchRecovery:(...a)=>actions.push(['record',...a]),clearLowQueuePauseRequest:noop,
   clearSharedV2QueueGuard:()=>{sessionStorage.removeItem('final');sessionStorage.removeItem('opening');},clearPostDispatchWatchdog:noop,
   finaliseActiveMissionTiming:noop,pausePipelineController:noop,clearSharedV2AutoRunning:noop,resetAutoStartTracking:noop,
   removeWorker:()=>{actions.push(['remove']);worker.remove();},setPhase:noop,
   createWorker:url=>{actions.push(['create',url]);const f=document.createElement('iframe');f.src=url;document.body.appendChild(f);}
  });
  eval(controller);
  window.beforeHandoff=performance.now();window.handedOff=maybeResumeFinalDispatchHandoff(doc,doc.location.href,{},[]);window.handoffMs=performance.now()-beforeHandoff;
 },fn('maybeResumeFinalDispatchHandoff'));
 await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.location.pathname==='/missions/102');
 check(await page.evaluate(()=>handedOff),'controller automatically continued');
 check(requests.filter(x=>x.method==='POST').length===1,'exactly one native Dispatch, no replay');
 check(await page.evaluate(()=>sessionStorage.getItem('mf_auto_dispatch_latch_v1')===originalClaim),'dispatch claim retained across handoff');
 check(await page.evaluate(()=>actions.filter(x=>x[0]==='create').length===1),'one next mission only');
 report.handoffMs=await page.evaluate(()=>handoffMs);check(report.handoffMs<100,'no deliberate handoff timeout');
 check(errors.length===0,errors.join('\n'));
 // Actual browser timers and DOM pagination: readiness must still reject an incomplete list.
 await page.evaluate(loader=>{
  window.loadClock=0;window.list=[{id:'1'}];window.remaining=true;
  Object.assign(window,{getVehicleCheckboxListSignature:()=>({boxes:list,signature:list.map(v=>v.id).join(',')}),
   isVehicleListLoadControlVisible:()=>remaining,isVehicleListLoadingIndicatorVisible:()=>false,wait:ms=>new Promise(r=>setTimeout(r,ms))});
  window.eval(loader);
 },fn('waitForVehicleCheckboxListStable'));
 const incomplete=await page.evaluate(()=>waitForVehicleCheckboxListStable(250,50,{requireNonZero:true}));
 check(!incomplete.ready,'remaining vehicle page cannot become fully ready');
 const ready=await page.evaluate(async()=>{remaining=false;return waitForVehicleCheckboxListStable(500,50,{requireNonZero:true});});
 check(ready.ready&&ready.count===1,'completed vehicle list retains existing readiness');
 check(requests.filter(x=>x.method==='POST').length===1,'readiness checks issue no dispatch');
 report.requests=requests;report.errors=errors;report.checks=checks;report.liveGameVerified=false;report.allRequestsIntercepted=true;
 fs.writeFileSync(new URL('./auto-recovery-browser-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(`${checks} browser recovery checks passed; same-route handoff ${report.handoffMs.toFixed(1)} ms.`);
}finally{await browser.close();}
