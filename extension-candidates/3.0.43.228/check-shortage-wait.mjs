import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const previous=fs.readFileSync(new URL('../3.0.43.227/extension/nexus-runtime.js',import.meta.url),'utf8');
function fn(name,text=source){const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);assert(a,name);const b=/\n {0,4}(?:async )?function /.exec(text.slice(a.index+a[0].length));assert(b,name);return text.slice(a.index,a.index+a[0].length+b.index);}
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const message='AUTO STOPPED: Auto stopped: Required mission resource is unavailable. Unit Finder selected 9 vehicles, but the mission is not fully covered. Confirmed requirements still missing: HazMat Units or CBRN Vehicles x1, Police Cars x3. No vehicles were dispatched.';
function fixture(text=source){
 let now=100000;const calls=[],claims=new Map(),attempts=new Set();
 const signals={confirmed:true,running:false,control:true,transport:null,storedReason:message,after:true,age:0,href:'/missions/101',evidence:null};
 const doc={readyState:'complete',defaultView:{}};
 const state={wanted:true,stopping:false,workerRole:'MISSION_A',currentMissionId:'101',currentMissionName:'Aircraft crash',currentMissionUrl:'/missions/101',workerDocument:doc,
  worker:{isConnected:true,contentDocument:doc,contentWindow:{location:{replace:u=>calls.push(['reload',u])}}},
  nativeMissionAdvances:0,missionSkipRecords:new Map(),missionSkipHistory:[],autoRecoveryHistory:[],recoverableMissionSkips:0,autoRecoverySkips:0};
 const noop=()=>{};
 const c=vm.createContext({console,state,Date:{now:()=>now},normaliseText:s=>String(s||'').replace(/\s+/g,' ').trim(),collectAutoStopEvidence:(d,s)=>signals.evidence??s,
  currentWorkerAutoConfirmed:()=>signals.confirmed,missionIdFromUrl:u=>String(u).match(/\/missions\/(\d+)/)?.[1]||'',getWorkerHref:()=>signals.href,
  findAutoModeControl:()=>signals.control?{}:null,autoControlLooksRunning:()=>signals.running,
  readV2AutoStopRecord:()=>({reason:signals.storedReason,afterCurrentConfirmation:signals.after,ageMs:signals.age}),
  sessionStorage:{getItem:k=>claims.get(k)||null},
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,ZERO_SELECTION_SKIP_ADVANCES:20,GENERIC_RECOVERABLE_STOP_SKIP_ADVANCES:20,AUTO_RECOVERY_WATCHDOG_MS:12000,AUTO_RECOVERY_TERMINAL_WATCHDOG_MS:3000,MISSION_SKIP_HISTORY_LIMIT:80,AUTO_RECOVERY_HISTORY_LIMIT:80,
  isMissionUrl:u=>/^\/missions\/\d+$/.test(u),hasCoastguardHelicopterShortageEvidence:()=>({matched:false}),hasExactZeroSelectionFullListStop:()=>({matched:false}),
  setPhase:noop,log:noop,render:noop,transportServiceRequest:()=>signals.transport,refreshRadioTransportRequests:()=>[],resetAutoStartTracking:noop,
  __NEXUS_RECOVERY__:{attempt:id=>{if(attempts.has(id))return false;attempts.add(id);return true;},outcome:noop,emit:noop},
  cleanMissionCaption:s=>s,missionNameForId:()=> 'Aircraft crash',missionDisplay:(id,n)=>n,nowIso:()=>new Date(now).toISOString(),
  missionSkipIssueDetails:()=>[],trimOldestMapEntries:noop,recordMissionSkipEvent:e=>calls.push(['skip',e]),
  choosePriorityTarget:()=>({missionId:'102',url:'/missions/102'}),redirectAfterRecoverableSkip:t=>{calls.push(['next',t.missionId]);return true;},
  clearSharedV2AutoRunning:noop,removeWorker:noop,startTransportOnlyWorker:r=>{calls.push(['transport',r.key]);return true;}
 });
 if(text===source)vm.runInContext(fn('isConfirmedResourceSelectionStop'),c);
 for(const name of ['recordAutoRecoveryEvent','clearAutoRecoveryWatchdog','classifyGenericRecoverableAutoStop','registerRecoverableMissionSkip','maybeHandleRecoverableAutoStop'])vm.runInContext(fn(name,text),c);
 return {c,state,doc,calls,claims,signals,run:(status=message)=>c.maybeHandleRecoverableAutoStop(doc,status),tick:ms=>now+=ms,
  classify:(status=message)=>c.classifyGenericRecoverableAutoStop(doc,status)};
}
const old=fixture(previous);eq(old.classify().terminal,false,'reproduce .227 exact final resource stop misclassification');old.run();eq(old.state.autoRecoveryCandidateWaitMs,12000);old.tick(3000);old.run();eq(old.calls.length,0,'old controller still idle at three seconds');
const fast=fixture();eq(fast.classify().terminal,true);fast.run();eq(fast.state.autoRecoveryCandidateWaitMs,3000);fast.tick(2999);fast.run();eq(fast.calls.length,0);fast.tick(1);fast.run();eq(fast.calls,[['reload','/missions/101']],'same once-only fresh search starts after three seconds');
fast.run();fast.tick(3000);fast.run();eq(fast.calls.filter(x=>x[0]==='reload').length,1);eq(fast.calls.filter(x=>x[0]==='next'),[['next','102']]);eq(fast.state.missionSkipRecords.get('101').retryAfterAdvance,20,'existing retry eligibility retained');
const b=fixture();b.signals.transport={key:'5:88'};b.run();b.tick(3000);b.run();eq(b.calls.some(x=>x[0]==='transport'),true);eq(b.calls.some(x=>x[0]==='reload'),false,'pending transport still takes precedence');
const variants=[message.replace('9 vehicles','1 vehicle').replace('HazMat Units or CBRN Vehicles x1, Police Cars x3','CRVs x1'),message.replace(' Confirmed requirements still missing: HazMat Units or CBRN Vehicles x1, Police Cars x3.','')];
for(const value of variants){const f=fixture();f.signals.storedReason=value;eq(f.classify(value).terminal,true,'native singular/no-detail terminal wording');}
const guards={
 'stopped by user':f=>f.state.wanted=false,'stopping':f=>f.state.stopping=true,'transport worker':f=>f.state.workerRole='TRANSPORT_B',
 'loading document':f=>f.doc.readyState='interactive','stale document':f=>f.state.workerDocument={},'wrong frame document':f=>f.state.worker.contentDocument={},
 'detached frame':f=>f.state.worker.isConnected=false,'unconfirmed owner':f=>f.signals.confirmed=false,'different mission':f=>f.signals.href='/missions/202',
 'active selection':f=>f.doc.defaultView.__NEXUS_AUTO_SELECTION_WAIT__={missionId:'101',active:true},
 'failed selection':f=>f.doc.defaultView.__NEXUS_AUTO_SELECTION_WAIT__={missionId:'101',failed:true},
 'running control':f=>f.signals.running=true,'missing control':f=>f.signals.control=false,
 'old stop':f=>f.signals.after=false,'expired stop':f=>f.signals.age=30001,'unknown age':f=>f.signals.age=null,
 'other recorded reason':f=>f.signals.storedReason='Auto stopped: something else',
 'dispatch already claimed':f=>f.claims.set('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101',claimedAt:1})),
 'unreadable claim':f=>f.c.sessionStorage.getItem=()=>{throw Error('unavailable');},
 'malformed claim':f=>f.claims.set('mf_auto_dispatch_latch_v1','{')
};
for(const [name,mutate]of Object.entries(guards)){const f=fixture();mutate(f);eq(f.classify().terminal,false,name+' blocks accelerated recovery');}
const unrelated=fixture();unrelated.claims.set('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'202'}));eq(unrelated.classify().terminal,true,'another mission claim is not this mission');
const warning=fixture();warning.signals.evidence=message;eq(warning.classify('Loading vehicles...').terminal,false,'old page alert cannot provide current terminal proof');
const transient=fixture();eq(transient.classify('Missing vehicles: Police Cars x3').terminal,false);transient.run('Missing vehicles: Police Cars x3');eq(transient.state.autoRecoveryCandidateWaitMs,12000,'ambiguous warning keeps full window');
for(const mutate of [f=>f.signals.running=true,f=>f.signals.after=false,f=>f.claims.set('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101'}))]){
 const f=fixture();f.run();f.tick(3000);mutate(f);f.run();eq(f.calls.length,0,'proof is rechecked at expiry before any action');eq(f.state.autoRecoveryCandidateWaitMs,12000,'lost proof restarts conservative wait');
}
for(const mutate of [f=>f.state.wanted=false,f=>f.state.stopping=true,f=>f.state.postDispatchWatchdog={},f=>f.state.transportServiceActive=true]){
 const f=fixture();f.run();f.tick(3000);mutate(f);eq(f.run(),false);eq(f.calls.length,0,'explicit stop and active dispatch/transport are untouched');
}
// The actual selection loop, loading, coverage, alternatives and trained-crew
// algorithms are byte-identical to the installed .227, not mocked away.
for(const name of ['runAutoModeLoop','handleCombinedLogic','selectVehicleUnits','countSelectedMatchingVehicles','getAllMatchingVehicleCheckboxes','nexusMakeSelectiveProbe','ensureVehicleListLoaded','waitForVehicleCheckboxListStable','claimAutoMissionDispatch','refreshArmedResponseRegistryFromLiveVehicles','nexusHasCompletedTrainedShortageRecheck','selectVehiclesForTrainedPersonnelRequirements','getRemainingTrainedPersonnelRequirements','applyTrainingCandidateCoverage','normalisePublicOrderTrainedRequirements','nexusConfirmCommittedTraining','blockTrainedPersonnelDispatch','nexusCheckMissionProgress','maybeResumeFinalDispatchHandoff','nexusReadIdleDispatchClaim','missionSkipRemaining'])eq(fn(name),fn(name,previous),name+' unchanged');
fs.writeFileSync(new URL('./shortage-wait-validation.json',import.meta.url),JSON.stringify({checks,oldWaitMs:12000,confirmedWaitMs:3000,oneFreshSearchRetained:true,selectionAndCrewUnchanged:true,liveGameVerified:false},null,2)+'\n');
console.log(`${checks} shortage wait checks passed.`);
