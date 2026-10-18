import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
function fn(name){const a=new RegExp('(?:async )?function '+name+'\\(').exec(source).index,b=/\n(?:    )?(?:async )?function /.exec(source.slice(a+10));return source.slice(a,a+10+b.index).replace(/^    globalThis\.[^\n]+\n/gm,'');}
const worker=['readAutoModeStartup','cancelAutoModeStartup','startAutoMode','completeAutoModeStart','requestManagedAutoModeStart','setManualAutoStop'].map(fn).join('\n');
const controller=['readWorkerAutoStartup','activateAutoModeStart','handleUnconfirmedAutoStart'].map(fn).join('\n');
const store=fs.readFileSync(new URL('./extension/nexus-personnel-store.js',import.meta.url),'utf8');
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
let checks=0;const check=(v,message)=>{assert(v,message);checks++;};
try{
 const page=await browser.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{requests.push(route.request().method());return route.fulfill({contentType:'text/html',body:route.request().url().includes('/missions/')?'<button id="auto-mode-box">Auto Mode: Start</button><p id="status"></p>':'<iframe src="/missions/101"></iframe>'});});
 await page.goto('https://www.missionchief.co.uk/');
 const setup=async()=>page.evaluate(({worker,controller,store})=>{
  window.readyCalls=0;window.NexusPersonnelStore={ready:()=>{readyCalls++;return window.readyPromise;}};
  window.readyPromise=new Promise((resolve,reject)=>{window.resolveReady=resolve;window.rejectReady=reject;});
  const frame=document.querySelector('iframe'),w=frame.contentWindow,doc=frame.contentDocument;
  const noop=()=>{};
  Object.assign(w,{autoModeRunning:false,autoModeLoopActive:false,mfAutoStartup:null,MF_AUTO_REGISTER_START_TIMEOUT_MS:30000,
   MF_MANUAL_AUTO_STOP_FLAG:'stop',mfDebugEnabled:false,loops:0,clicks:0,isManualAutoStopActive:()=>false,
   getCurrentMissionIdForQueueRestart:()=> '101',isMissionPage:()=>true,isMfV3ManagedActiveFrame:()=>true,isMfV3ManagedTransportWorker:()=>false,isCurrentMissionExecutionOwner:()=>true,
   updateStatusBox:msg=>doc.getElementById('status').textContent=msg,
   updateAutoModeButton:()=>doc.getElementById('auto-mode-box').textContent=w.autoModeRunning?'Auto Mode: Stop':'Auto Mode: Start',
   resetVehicleLoadState:noop,clearPersistentAutoStopRecord:noop,clearManualAutoStop:noop,clearQueueWaitFlags:noop,clearAllTransportAutomationFlags:noop,clearAutoPostDispatchUpgradeState:noop,readAutoAdvanceAfterDispatchState:()=>null,clearAutoAdvanceAfterDispatchState:noop,clearAutoSelectionMissionGuard:noop,startSilentQueueWatcher:noop,startGlobalTransportApproachWatcher:noop,startBruteApproachTransportWatcher:noop,startPostTransportRehookWatcher:noop,stopAllBackgroundAutomationTimers:noop,runAutoModeLoop:()=>{w.loops++;}});
  // Real iframe store proxy resolves to the map-owned store, as in the extension.
  w.eval(store);w.eval(worker);w.__NEXUS_READ_AUTO_STARTUP__=w.readAutoModeStartup;w.__NEXUS_REQUEST_AUTO_START__=w.requestManagedAutoModeStart;
  doc.getElementById('auto-mode-box').onclick=()=>{w.clicks++;w.startAutoMode();};
  Object.assign(window,{state:{wanted:true,stopping:false,workerRole:'MISSION_A',currentMissionId:'101',workerDocument:doc,workerDocumentSerial:1,autoStartIssued:true,autoStartDocumentSerial:1,autoRunningConfirmedDocumentSerial:0,autoStartAttemptAt:Date.now(),autoStartAttempts:1},errors:[],phases:[],AUTO_START_CONFIRM_TIMEOUT_MS:2500,AUTO_START_MAX_ATTEMPTS:2,
   verifiedPatientTailTransportStop:()=>null,maybeHandleRecoverableAutoStop:()=>false,autoControlLooksRunning:()=>w.autoModeRunning,confirmCurrentDocumentAutoMode:()=>true,
   setError:(title,detail)=>window.errors.push({title,detail}),setPhase:(...x)=>window.phases.push(x),log:noop,elementLabel:c=>c.textContent});
  (0,eval)(controller);window.control=doc.getElementById('auto-mode-box');activateAutoModeStart(control);
 },{worker,controller,store});
 await setup();
 await page.waitForTimeout(2700);await page.evaluate(()=>handleUnconfirmedAutoStart(control));
 await page.waitForTimeout(2800);await page.evaluate(()=>handleUnconfirmedAutoStart(control));
 const pending=await page.evaluate(()=>({errors,attempts:state.autoStartAttempts,start:readWorkerAutoStartup(state.workerDocument),readyCalls}));
 check(pending.errors.length===0,'real pending frame survives old timeout');check(pending.attempts===1,'no retry');check(pending.start.phase==='loading-register','pending phase');check(pending.readyCalls===1,'one register wait');
 await page.evaluate(()=>resolveReady());await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.loops===1);
 const done=await page.evaluate(()=>{handleUnconfirmedAutoStart(control);const w=document.querySelector('iframe').contentWindow;return {start:readWorkerAutoStartup(state.workerDocument),loops:w.loops,clicks:w.clicks,errors};});
 check(done.start.phase==='running'&&done.loops===1,'one loop');check(done.clicks===0,'direct method');check(!done.errors.length,'successful confirmation');
 await setup();await page.evaluate(()=>document.querySelector('iframe').contentWindow.setManualAutoStop('manual stop'));
 await page.evaluate(()=>resolveReady());await page.waitForTimeout(30);
 check(await page.evaluate(()=>document.querySelector('iframe').contentWindow.loops===0),'stopped worker cannot resume');
 await setup();await page.evaluate(()=>rejectReady(Error('Fixture database unavailable')));await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.readAutoModeStartup()?.phase==='failed');
 await page.evaluate(()=>handleUnconfirmedAutoStart(control));
 check(await page.evaluate(()=>errors[0]?.detail==='Fixture database unavailable'),'failure reaches controller');
 check(errors.length===0,'no unhandled page errors');check(requests.every(x=>x==='GET'),'no game writes');
}finally{await browser.close();}
fs.writeFileSync(new URL('./startup-browser-validation.json',import.meta.url),JSON.stringify({version:'3.0.43.223',passed:true,checks,scope:'Isolated headless Edge map/worker documents; real iframe personnel-store proxy, controlled readiness promise, all routes intercepted. No live game actions.'},null,2)+'\n');
console.log(checks+' isolated Edge startup checks passed.');
