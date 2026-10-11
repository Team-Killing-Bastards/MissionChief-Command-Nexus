import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=v=>fs.readFileSync(new URL(`../${v}/extension/nexus-runtime.js`,import.meta.url),'utf8');
const old=read('3.0.43.220'), source=read('3.0.43.221');
function fn(s,name){const match=new RegExp('(?:async )?function '+name+'\\(').exec(s);assert(match,name);const a=match.index,b=/\n(?:    )?(?:async )?function /.exec(s.slice(a+10));assert(b,name+' boundary');return s.slice(a,a+10+b.index).replace(/^    globalThis\.[^\n]+\n/gm,'');}
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
let checks=0;const check=(value,msg)=>{assert(value,msg);checks++;};
function harness(s,{legacy=false}={}){
 let now=1000,id=0,resolveReady,rejectReady;const timers=new Map(),errors=[],statuses=[],loops=[],actions=[];
 const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 const storage={getItem:()=>null,setItem:()=>{}};
 const state={wanted:true,stopping:false,workerRole:'MISSION_A',currentMissionId:'101',workerDocumentSerial:1,autoStartIssued:true,autoStartDocumentSerial:1,autoRunningConfirmedDocumentSerial:0,autoStartAttemptAt:1000,autoStartAttempts:1};
 const c=vm.createContext({Promise,Date:{now:()=>now},String,Number,Error,Object,
 state,autoModeRunning:false,autoModeLoopActive:false,mfAutoStartup:null,MF_AUTO_REGISTER_START_TIMEOUT_MS:30000,
 setTimeout:(f,ms)=>{timers.set(++id,{f,at:now+ms});return id;},clearTimeout:key=>timers.delete(key),
 sessionStorage:storage,localStorage:storage,MF_MANUAL_AUTO_STOP_FLAG:'stop',mfDebugEnabled:false,
 window:{NexusPersonnelStore:{ready:()=>ready}},missionId:'101',owner:true,managed:true,isMission:true,manualStop:false,
 isManualAutoStopActive:()=>c.manualStop,
 isMissionPage:()=>c.isMission,getCurrentMissionIdForQueueRestart:()=>c.missionId,
 isMfV3ManagedActiveFrame:()=>c.managed,isMfV3ManagedTransportWorker:()=>false,
 isCurrentMissionExecutionOwner:()=>c.owner,
 updateStatusBox:message=>statuses.push(message),resetVehicleLoadState:()=>{},clearPersistentAutoStopRecord:()=>{},clearManualAutoStop:()=>{},
 clearQueueWaitFlags:()=>{},clearAllTransportAutomationFlags:()=>{},clearAutoPostDispatchUpgradeState:()=>{},readAutoAdvanceAfterDispatchState:()=>null,
 clearAutoAdvanceAfterDispatchState:()=>{},clearAutoSelectionMissionGuard:()=>{},updateAutoModeButton:()=>{},
 startSilentQueueWatcher:()=>{},startGlobalTransportApproachWatcher:()=>{},startBruteApproachTransportWatcher:()=>{},startPostTransportRehookWatcher:()=>{},
 stopAllBackgroundAutomationTimers:()=>{},runAutoModeLoop:()=>{loops.push(c.missionId);},
 AUTO_START_CONFIRM_TIMEOUT_MS:2500,AUTO_START_MAX_ATTEMPTS:2,
 verifiedPatientTailTransportStop:()=>null,maybeHandleRecoverableAutoStop:()=>false,
 autoControlLooksRunning:()=>c.autoModeRunning,confirmCurrentDocumentAutoMode:()=>true,
 setError:(title,detail)=>errors.push({title,detail}),setPhase:(...args)=>statuses.push(args),log:()=>{},elementLabel:()=> 'Auto Mode: Start'
 });
 const doc={defaultView:c};c.doc=doc;state.workerDocument=doc;
 c.control={ownerDocument:doc,click:()=>{actions.push('click');c.startAutoMode();}};
 const names=['startAutoMode','handleUnconfirmedAutoStart'];
 if(!legacy)names.push('readAutoModeStartup','cancelAutoModeStartup','completeAutoModeStart','requestManagedAutoModeStart','readWorkerAutoStartup','activateAutoModeStart','setManualAutoStop');
 vm.runInContext(names.map(n=>fn(s,n)).join('\n'),c);
 if(!legacy){c.__NEXUS_READ_AUTO_STARTUP__=c.readAutoModeStartup;c.__NEXUS_REQUEST_AUTO_START__=c.requestManagedAutoModeStart;}
 return {c,state,timers,errors,statuses,loops,actions,
 start:()=>legacy?c.control.click():c.activateAutoModeStart(c.control),watch:()=>c.handleUnconfirmedAutoStart(c.control),
 async at(value){now=value;for(const [key,t]of [...timers])if(t.at<=now){timers.delete(key);t.f();}await flush();},
 async ready(){resolveReady();await flush();},async fail(message){rejectReady(Error(message));await flush();}};
}
// Reproduce the supplied button/start-timeout sequence with the unchanged .220
// functions. Delayed readiness is a verified code defect, not proof of IDB timing
// in the user's export, which did not record that state.
{const h=harness(old,{legacy:true});h.start();await h.at(3501);h.watch();await h.at(6002);h.watch();check(h.errors[0]?.title==='V2 Auto Mode did not confirm that it started.','old timeout reproduced');check(h.actions.length===2,'old duplicate start');await h.ready();check(h.loops.length===2,'both old pending starts resume');}
{const h=harness(source);h.start();await h.at(3501);h.watch();await h.at(6002);h.watch();check(!h.errors.length,'acknowledged readiness does not hit five-second stop');check(h.actions.length===0,'directed start avoids toggle clicks');check(h.c.readAutoModeStartup().phase==='loading-register','loading phase exposed');await h.at(8000);await h.ready();check(h.loops.length===1,'exactly one selection loop after readiness');check(h.c.readAutoModeStartup().phase==='running','running ack');check(h.timers.size===0,'startup timer released');h.watch();check(!h.errors.length,'normal running confirmation');}
{const h=harness(source);h.start();const job=h.c.mfAutoStartup.promise;check(h.c.startAutoMode()===job,'duplicate request shares promise');await h.ready();h.c.startAutoMode();check(h.loops.length===1,'already running is idempotent');}
{const h=harness(source);h.start();await h.ready();check(h.loops.length===1,'ready register starts immediately');check(h.timers.size===0,'no added delay');}
{const h=harness(source);h.start();await h.fail('Personnel database unavailable');h.watch();check(h.errors[0]?.detail==='Personnel database unavailable','specific failure exported to controller');check(h.c.readAutoModeStartup().phase==='failed','failure ack');check(h.loops.length===0,'register failure does not dispatch');}
{const h=harness(source);h.start();await h.at(31000);h.watch();check(/30 seconds/.test(h.errors[0]?.detail),'register wait bounded');await h.ready();check(h.loops.length===0,'late ready cannot revive timed-out start');check(h.timers.size===0,'timeout timer gone');}
{const h=harness(source);h.start();h.c.setManualAutoStop('User stopped');await h.ready();check(h.loops.length===0,'manual stop invalidates pending start');check(h.c.readAutoModeStartup().phase==='cancelled','cancelled ack');check(!h.c.autoModeRunning,'stays stopped');}
for(const cause of ['mission','owner','managed','page']){const h=harness(source);h.start();if(cause==='mission')h.c.missionId='102';if(cause==='owner')h.c.owner=false;if(cause==='managed')h.c.managed=false;if(cause==='page')h.c.isMission=false;await h.ready();check(h.loops.length===0,cause+' change rejects late continuation');check(h.c.readAutoModeStartup().phase==='cancelled',cause+' cancelled');}
for(const name of ['cleanupMissionFinderRuntime','suspendMissionFinderRuntimeForPageHide','suspendMissionFinderRuntimeForInactiveFrame']){check(fn(source,name).includes('cancelAutoModeStartup('),name+' cancels pending start');}
{const h=harness(source);h.start();h.c.cancelAutoModeStartup('removed');await flush();check(h.timers.size===0,'removal clears timer');await h.ready();check(h.loops.length===0,'removed document stays inactive');}
{const h=harness(source);h.c.owner=false;h.start();check(h.c.readAutoModeStartup()===null,'inactive worker cannot accept start');}
// A missing handler still uses the original bounded gate; arbitrary/stale reports
// cannot extend it or impersonate a current-document acknowledgement.
for(const report of [null,{phase:'loading-register',missionId:'999',startedAt:1000},{phase:'loading-register',missionId:'101',startedAt:900},{phase:'loading-register',missionId:'101',startedAt:99000},{phase:'made-up',missionId:'101',startedAt:1000}]){
 const h=harness(source);h.c.__NEXUS_REQUEST_AUTO_START__=()=>{};h.c.__NEXUS_READ_AUTO_STARTUP__=()=>report;h.start();await h.at(3501);h.watch();await h.at(6002);h.watch();check(h.errors[0]?.title.includes('did not confirm'),'unknown/stale acknowledgement stays bounded');
}
{const h=harness(source);h.c.__NEXUS_REQUEST_AUTO_START__=()=>{};h.c.__NEXUS_READ_AUTO_STARTUP__=()=>({phase:'loading-register',missionId:'101',startedAt:1000});h.start();await h.at(36000);h.watch();check(h.errors[0]?.title==='Auto Mode startup timed out.','controller watchdog bounds stuck runtime');}
{const h=harness(source);h.c.autoModeRunning=true;h.c.manualStop=true;h.start();await h.at(6002);h.watch();check(!h.errors.length,'inherited running flag waits for register');await h.ready();check(h.loops.length===1,'explicit start clears inherited stopped state');}
{const h=harness(source);h.c.autoModeRunning=true;h.c.manualStop=true;h.start();await h.fail('Register failed');h.watch();check(h.errors[0]?.detail==='Register failed','inherited running flag cannot hide startup error');}
{const h=harness(source);h.start();h.c.clearManualAutoStop=()=>{throw Error('Fixture storage failure');};await h.ready();h.watch();check(h.errors[0]?.detail==='Fixture storage failure','startup preparation error reaches controller');check(h.loops.length===0,'preparation failure cannot select');}
for(const name of ['claimAutoMissionDispatch','releaseAutoMissionDispatch','runAutoModeLoop','nexusHandlePatientMissionTail','isCurrentMissionExecutionOwner'])check(fn(source,name)===fn(old,name),name+' unchanged');
check(source.includes('autoStartup: readWorkerAutoStartup(doc) || workerSnapshot.autoStartup || null'),'startup evidence retained after worker removal');
fs.writeFileSync(new URL('./startup-readiness-validation.json',import.meta.url),JSON.stringify({version:'3.0.43.221',passed:true,checks,oldReproduced:{readinessDelayMs:7000,startRequests:2,loopContinuations:2,error:'V2 Auto Mode did not confirm that it started.'},scope:'Production functions with controlled promises and a simulated clock. Confirms a startup race; supplied export did not record register readiness, so the exact cause of that run remains unproven.'},null,2)+'\n');
console.log(checks+' startup readiness checks passed. Old timeout and duplicate continuation reproduced.');
