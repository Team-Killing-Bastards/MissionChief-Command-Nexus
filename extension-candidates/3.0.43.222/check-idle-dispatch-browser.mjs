import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
function fn(name) {const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(source);const b=/\n {0,4}(?:async )?function /.exec(source.slice(a.index+a[0].length));return source.slice(a.index,a.index+a[0].length+b.index);}
const reader=fn('nexusReadIdleDispatchClaim'),controller=fn('nexusCheckMissionProgress');
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
try {
 const page=await browser.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{requests.push(r.request().method());return r.fulfill({contentType:'text/html',body:r.request().url().includes('/missions/')?'<button id="auto-mode-box">Auto Mode: Stop</button><p id="status">Auto Mode restored after mission load.</p><input class="vehicle_checkbox" value="5" type="checkbox">':'<iframe name="mcn-v3-active-worker-1-101" src="/missions/101"></iframe>'});});
 await page.goto('https://www.missionchief.co.uk/');
 const install=()=>page.evaluate(reader=>{
  const w=document.querySelector('iframe').contentWindow;
  window.owner={token:'owner1',missionKey:'mission101'};
  Object.assign(w,{autoModeRunning:true,autoModeLoopActive:false,mfAutoStartup:{phase:'running'},mfAutoAdvanceResumeActive:false,mfAutoUpgradeResumeActive:false,
   MF_AUTO_DISPATCH_LATCH_KEY:'mf_auto_dispatch_latch_v1',MF_AUTO_DISPATCH_LATCH_TTL_MS:300000,MF_AUTO_ADVANCE_AFTER_DISPATCH_KEY:'advance',MF_AUTO_UPGRADE_PENDING_KEY:'upgrade',MF_QUEUE_OPENING_MISSION_FLAG:'opening',MF_FINAL_QUEUE_DISPATCH_FLAG:'final',MF_INSTANCE_TOKEN:'owner1',MF_SHARED_ACTIVE_INSTANCE_KEY:'owner',
   isManualAutoStopActive:()=>false,isMissionPage:()=>true,isMfV3ManagedActiveWorker:()=>w.name==='mcn-v3-active-worker-1-101',
   getCurrentMissionIdForQueueRestart:()=> '101',getLocalMissionInstanceKey:()=> 'mission101',getSharedTopWindow:()=>window});
  w.eval(reader);
 },reader);
 await install();
 check(await page.evaluate(()=>{const w=document.querySelector('iframe').contentWindow;sessionStorage.setItem('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101',claimedAt:Date.now()}));return w.__NEXUS_READ_IDLE_DISPATCH_CLAIM__()===null;}),'same-document claim cannot use shortcut');
 const frame=page.frames().find(f=>f.url().includes('/missions/'));
 await frame.goto('https://www.missionchief.co.uk/missions/101');await install();
 check(await page.evaluate(()=>!!document.querySelector('iframe').contentWindow.__NEXUS_READ_IDLE_DISPATCH_CLAIM__()),'real navigation inherits the protected claim');
 check(await page.evaluate(()=>{const w=document.querySelector('iframe').contentWindow;localStorage.setItem('advance','{}');const blocked=w.__NEXUS_READ_IDLE_DISPATCH_CLAIM__()===null;localStorage.removeItem('advance');return blocked;}),'shared handoff blocks early deferral');
 await page.evaluate(controller=>{
  const doc=document.querySelector('iframe').contentDocument;
  window.originalClaim=sessionStorage.getItem('mf_auto_dispatch_latch_v1');window.fakeNow=Date.now();
  const NativeDate=Date;window.Date=class extends NativeDate{static now(){return fakeNow;}};
  const noop=()=>{};
  Object.assign(window,{state:{wanted:true,stopping:false,lowQueuePaused:false,workerRole:'MISSION_A',workerDocument:doc,workerDocumentSerial:1,currentMissionId:'101',currentMissionName:'Aircraft crash'},actions:[],
   missionIdFromUrl:()=> '101',findAutoModeControl:()=>doc.getElementById('auto-mode-box'),autoControlLooksRunning:c=>c.textContent.includes('Stop'),findUsefulNexusStatus:()=>doc.getElementById('status').textContent,
   sharedV2QueueGuardIsActive:x=>x,readSharedV2QueueGuardState:()=>false,log:noop,captureWorkerSnapshot:noop,
   registerRecoverableMissionSkip:(...args)=>actions.push(['skip',...args]),RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,
   finaliseActiveMissionTiming:noop,clearSharedV2AutoRunning:noop,resetAutoStartTracking:noop,removeWorker:()=>{actions.push(['remove']);document.querySelector('iframe').remove();},
   actionableMissionSupply:()=>({count:2,candidates:[{missionId:'102',url:'/missions/102'}]}),MINIMUM_ACTIONABLE_MISSIONS:2,
   createWorker:url=>actions.push(['next',url]),setError:(...x)=>actions.push(['error',...x])});
  (0,eval)(controller);
  window.tick=ms=>{fakeNow+=ms;return nexusCheckMissionProgress(doc,'https://www.missionchief.co.uk/missions/101',{});};
 },controller);
 check(await page.evaluate(()=>tick(0)===false),'first sample does not rotate');
 check(await page.evaluate(()=>Object.getPrototypeOf(state.nexusProgress.inheritedClaim)===Object.prototype),'retained evidence belongs to controller realm');
 check(await page.evaluate(()=>tick(5000)===false),'five seconds does not rotate');
 check(await page.evaluate(()=>{document.querySelector('iframe').contentWindow.autoModeLoopActive=true;return tick(5000)===false;}),'active worker loop prevents early removal');
 check(await page.evaluate(()=>{document.querySelector('iframe').contentWindow.autoModeLoopActive=false;return tick(5000)===false;}),'new idle interval starts after work finishes');
 check(await page.evaluate(()=>tick(10000)===true),'ten idle seconds rotates restored mission');
 const result=await page.evaluate(()=>({actions,claim:sessionStorage.getItem('mf_auto_dispatch_latch_v1'),originalClaim,frames:document.querySelectorAll('iframe').length,progress:state.nexusProgress}));
 check(result.actions.filter(a=>a[0]==='skip').length===1,'one deferred mission');
 check(result.actions.some(a=>a[0]==='next'&&a[1]==='/missions/102'),'next mission chosen');
 check(result.claim===result.originalClaim,'claim unchanged across worker removal');
 check(result.frames===0&&result.progress===null,'old document and probe released');
 check(errors.length===0,'no unhandled browser errors');check(requests.every(x=>x==='GET'),'no game writes');
}finally{await browser.close();}
fs.writeFileSync(new URL('./idle-dispatch-browser-validation.json',import.meta.url),JSON.stringify({version:'3.0.43.222',passed:true,checks,scope:'Isolated Edge map and actual reloaded iframe, real session/local storage and document time origins, controlled controller clock. All routes intercepted; no live game actions.'},null,2)+'\n');
console.log(checks+' isolated Edge idle-dispatch checks passed.');
