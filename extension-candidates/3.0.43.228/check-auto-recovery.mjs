import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const previous=fs.readFileSync(new URL('../3.0.43.226/extension/nexus-runtime.js',import.meta.url),'utf8');
export function fn(name,text=source) {
 const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);assert(a,name);
 const b=/\n {0,4}(?:async )?function /.exec(text.slice(a.index+a[0].length));assert(b,name);
 return text.slice(a.index,a.index+a[0].length+b.index);
}
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const noop=()=>{};
function handoff(text=source) {
 let now=100000;const calls=[],session=new Map([['final','true'],['opening','true'],['mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101',claimedAt:80000})]]),local=new Map();
 const store=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
 const signals={manual:false,owned:true,confirmed:true,transport:null,candidate:null,target:{missionId:'102',url:'/missions/102'}};
 const doc={readyState:'complete'};
 const c=vm.createContext({console,Date:{now:()=>now},performance:{timeOrigin:90000},document:doc,
  autoModeRunning:true,autoModeLoopActive:false,mfAutoStartup:{phase:'running'},mfAutoAdvanceResumeActive:false,mfAutoUpgradeResumeActive:false,
  MF_AUTO_DISPATCH_LATCH_KEY:'mf_auto_dispatch_latch_v1',MF_AUTO_DISPATCH_LATCH_TTL_MS:300000,
  MF_AUTO_ADVANCE_AFTER_DISPATCH_KEY:'advance',MF_AUTO_UPGRADE_PENDING_KEY:'upgrade',MF_QUEUE_OPENING_MISSION_FLAG:'opening',MF_FINAL_QUEUE_DISPATCH_FLAG:'final',
  MF_INSTANCE_TOKEN:'owner',MF_SHARED_ACTIVE_INSTANCE_KEY:'owner',sessionStorage:store(session),localStorage:store(local),
  isManualAutoStopActive:()=>signals.manual,isMissionPage:()=>true,isMfV3ManagedActiveWorker:()=>signals.owned,
  getCurrentMissionIdForQueueRestart:()=>c.state.currentMissionId,getLocalMissionInstanceKey:()=> 'mission101',getSharedTopWindow:()=>c,
  state:{wanted:true,stopping:false,workerRole:'MISSION_A',currentMissionId:'101',currentMissionName:'Fireplace fire',workerDocumentSerial:2,workerDocument:doc,worker:{isConnected:true,contentDocument:doc}},
  currentWorkerAutoConfirmed:()=>signals.confirmed,sessionGet:k=>session.get(k)||'',V2_FINAL_QUEUE_DISPATCH_FLAG:'final',
  missionIdFromUrl:u=>String(u).match(/missions\/(\d+)/)?.[1]||'',collectMissionCandidates:()=>signals.candidate?[signals.candidate]:[],
  choosePostDispatchRecoveryTarget:()=>signals.target,transportServiceRequest:()=>signals.transport,
  sameOriginUrl:u=>String(u).startsWith('/')?{href:'https://www.missionchief.co.uk'+u}:null,isMissionUrl:u=>/\/missions\/\d+$/.test(u),
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,registerRecoverableMissionSkip:(...a)=>calls.push(['skip',...a]),
  recordPostDispatchRecovery:(...a)=>calls.push(['record',...a]),clearLowQueuePauseRequest:()=>calls.push(['clear-low']),
  clearSharedV2QueueGuard:()=>{session.delete('final');session.delete('opening');calls.push(['clear-guard']);},clearPostDispatchWatchdog:()=>calls.push(['clear-watchdog']),
  redirectWorkerToTransportService:request=>{calls.push(['transport',request.key]);return true;},
  enterLowQueuePause:reason=>{calls.push(['pause',reason]);return true;},
  finaliseActiveMissionTiming:noop,pausePipelineController:noop,clearSharedV2AutoRunning:noop,resetAutoStartTracking:noop,
  removeWorker:()=>calls.push(['remove']),setPhase:noop,createWorker:url=>calls.push(['create',url])
 });
 c.window=c;c.owner={token:'owner',missionKey:'mission101'};doc.defaultView=c;
 vm.runInContext(fn('nexusReadIdleDispatchClaim',text),c);
 vm.runInContext('globalThis.__NEXUS_READ_IDLE_DISPATCH_CLAIM__=nexusReadIdleDispatchClaim;',c);
 vm.runInContext(fn('maybeResumeFinalDispatchHandoff'),c);
 return {c,doc,calls,signals,session,local,setNow:n=>now=n,
  run:(context={})=>c.maybeResumeFinalDispatchHandoff(doc,'https://www.missionchief.co.uk/missions/101',context,[])};
}
const old=handoff(previous);eq(old.run(),false,'old final flag is refused by inherited-claim reader');eq(old.calls.length,0);
const good=handoff(),claim=good.session.get('mf_auto_dispatch_latch_v1');
eq(good.run(),true,'replacement page immediately hands off');eq(good.calls.filter(x=>x[0]==='create'),[['create','https://www.missionchief.co.uk/missions/102']]);
eq(good.session.get('mf_auto_dispatch_latch_v1'),claim,'no repeat dispatch claim cleared');eq(good.run(),false,'handoff is once only');
eq(good.calls.some(x=>x[0]==='skip'),false,'completed mission not mislabelled as a shortage');
const transport=handoff();transport.signals.transport={key:'5:88'};eq(transport.run(),true);eq(transport.calls.filter(x=>x[0]==='transport'),[['transport','5:88']]);eq(transport.calls.some(x=>x[0]==='create'),false,'transport gets the boundary');
const empty=handoff();empty.signals.target=null;eq(empty.run(),true);eq(empty.calls.some(x=>x[0]==='pause'),true,'empty queue retains automatic resume');
const actionable=handoff();actionable.signals.candidate={missionId:'101',rendered:true,actionKind:'UPGRADE',ruleSignature:'missing'};eq(actionable.run(),true);eq(actionable.calls.filter(x=>x[0]==='skip').length,1,'uncertain result deferred');
const guards={
 'manual stop':h=>h.signals.manual=true,'controller stopped':h=>h.c.state.wanted=false,'stopping':h=>h.c.state.stopping=true,
 'worker B':h=>h.c.state.workerRole='TRANSPORT_B','transport service active':h=>h.c.state.transportServiceActive=true,'transport context':h=>h.c.state.transportKind='PATIENT',
 'detached worker':h=>h.c.state.worker.isConnected=false,'stale controller doc':h=>h.c.state.workerDocument={},'stale frame doc':h=>h.c.state.worker.contentDocument={},
 'incomplete document':h=>h.doc.readyState='loading','unconfirmed start':h=>h.signals.confirmed=false,'foreign mission':h=>h.c.state.currentMissionId='102',
 'no final flag':h=>h.session.delete('final'),'no claim':h=>h.session.delete('mf_auto_dispatch_latch_v1'),
 'same document claim':h=>h.c.performance.timeOrigin=70000,'expired claim':h=>h.setNow(500000),'future document':h=>h.c.performance.timeOrigin=110000,
 'active selection':h=>h.c.autoModeLoopActive=true,'not running':h=>h.c.autoModeRunning=false,'not active owner':h=>h.signals.owned=false,
 'different owner':h=>h.c.owner.token='other','register still loading':h=>h.c.mfAutoStartup.phase='loading-register',
 'pending share advance':h=>h.session.set('advance','{}'),'pending upgrade':h=>h.local.set('upgrade','{}'),
 'resuming advance':h=>h.c.mfAutoAdvanceResumeActive=true,'unreadable claim':h=>h.c.sessionStorage.getItem=()=>{throw Error('unreadable');},
 'invalid next route':h=>h.signals.target.url='https://foreign.invalid/missions/102'
};
for(const [name,mutate]of Object.entries(guards)){const h=handoff();mutate(h);eq(h.run(),false,name);eq(h.calls.some(x=>['remove','create','transport'].includes(x[0])),false,name+' no mutation');}
const activeTransport=handoff();eq(activeTransport.run({kind:'PATIENT'}),false);

const message='AUTO STOPPED: Auto stopped: the complete vehicle list did not become stable before Unit Finder. No units were selected.';
function loading(text=source){
 let now=100000;const calls=[],storage=new Map(),attempts=new Set(),signals={transport:null};
 const c=vm.createContext({console,Date:{now:()=>now},normaliseText:s=>String(s||'').replace(/\s+/g,' ').trim(),collectAutoStopEvidence:(d,s)=>s,
  state:{wanted:true,stopping:false,currentMissionId:'101',currentMissionName:'Bus accident',currentMissionUrl:'/missions/101',nativeMissionAdvances:0,missionSkipRecords:new Map(),missionSkipHistory:[],autoRecoveryHistory:[],recoverableMissionSkips:0,autoRecoverySkips:0,worker:{contentWindow:{location:{replace:u=>calls.push(['reload',u])}}}},
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,ZERO_SELECTION_SKIP_ADVANCES:20,GENERIC_RECOVERABLE_STOP_SKIP_ADVANCES:20,AUTO_RECOVERY_WATCHDOG_MS:12000,AUTO_RECOVERY_TERMINAL_WATCHDOG_MS:3000,MISSION_SKIP_HISTORY_LIMIT:80,
  sessionStorage:{getItem:k=>storage.get(k)||null},isMissionUrl:u=>/^\/missions\/\d+$/.test(u),hasCoastguardHelicopterShortageEvidence:()=>({matched:false}),hasExactZeroSelectionFullListStop:()=>({matched:false}),
  clearAutoRecoveryWatchdog:()=>{},recordAutoRecoveryEvent:e=>calls.push(['recovery',e]),setPhase:noop,log:noop,render:noop,
  findAutoModeControl:()=>({textContent:'Auto Mode: Start'}),autoControlLooksRunning:()=>false,
  transportServiceRequest:()=>signals.transport,refreshRadioTransportRequests:()=>[],resetAutoStartTracking:noop,
  __NEXUS_RECOVERY__:{attempt:id=>{if(attempts.has(id))return false;attempts.add(id);return true;},outcome:noop,emit:noop},
  cleanMissionCaption:s=>s,missionNameForId:()=> 'Bus accident',missionDisplay:(id,n)=>n,nowIso:()=>new Date(now).toISOString(),
  missionSkipIssueDetails:()=>[],trimOldestMapEntries:noop,recordMissionSkipEvent:e=>calls.push(['skip',e]),
  choosePriorityTarget:()=>({missionId:'102',url:'/missions/102'}),redirectAfterRecoverableSkip:t=>{calls.push(['next',t.missionId]);return true;},
  clearSharedV2AutoRunning:noop,removeWorker:noop,startTransportOnlyWorker:r=>{calls.push(['transport',r.key]);return true;}
 });
 const doc={defaultView:{}};c.window=c;
 for(const name of ['classifyGenericRecoverableAutoStop','registerRecoverableMissionSkip','missionSkipRemaining','activeMissionSkipRecords','maybeHandleRecoverableAutoStop'])vm.runInContext(fn(name,text),c);
 return {c,doc,calls,storage,attempts,signals,run:()=>c.maybeHandleRecoverableAutoStop(doc,message),tick:ms=>now+=ms};
}
const before=loading(previous);eq(before.c.classifyGenericRecoverableAutoStop(before.doc,message).category,'RESOURCE_SHORTAGE','old No units selected text is misclassified as a fleet shortage');
before.run();before.tick(12000);before.run();eq(before.calls.some(x=>x[0]==='reload'),false,'old loading error never gets a fresh-page recovery');eq(before.c.state.missionSkipRecords.get('101').retryAfterAdvance,20,'old loading skip depends on twenty successful advances');
const l=loading();eq(l.c.classifyGenericRecoverableAutoStop(l.doc,message).category,'VEHICLE_LOADING');
eq(l.c.classifyGenericRecoverableAutoStop(l.doc,'Auto stopped: 4 trained personnel short. Dispatch was not clicked.').category,'PERSONNEL_SHORTAGE','trained checks retain classification');
eq(l.run(),true);l.tick(3000);eq(l.run(),true);eq(l.calls.filter(x=>x[0]==='reload'),[['reload','/missions/101']],'one fresh pre-dispatch load');
l.c.state.autoRecoveryCandidateKey='';eq(l.run(),true);l.tick(3000);eq(l.run(),true);eq(l.calls.filter(x=>x[0]==='reload').length,1,'second failure cannot loop reload');eq(l.calls.some(x=>x[0]==='next'),true,'continues without Start or Retry');
eq(l.c.state.missionSkipRecords.get('101').category,'VEHICLE_LOADING');eq(l.c.missionSkipRemaining('101'),1);l.c.state.nativeMissionAdvances=50;eq(l.c.missionSkipRemaining('101'),1,'busy queues cannot eliminate network backoff');l.tick(60000);eq(l.c.missionSkipRemaining('101'),0,'no mission advances required to retry');eq(l.c.activeMissionSkipRecords().length,0);
const held=loading();held.storage.set('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101'}));held.run();held.tick(3000);held.run();eq(held.calls.some(x=>x[0]==='reload'),false,'submitted mission never reloaded as a pre-dispatch failure');
const unreadable=loading();unreadable.c.sessionStorage.getItem=()=>{throw Error('storage');};unreadable.run();unreadable.tick(3000);unreadable.run();eq(unreadable.calls.some(x=>x[0]==='reload'),false);
const busy=loading();busy.signals.transport={key:'5:88'};busy.run();busy.tick(3000);busy.run();eq(busy.calls.some(x=>x[0]==='transport'),true,'loading failure yields to real transport');eq(busy.calls.some(x=>x[0]==='reload'),false);
for(const mut of [h=>h.c.state.wanted=false,h=>h.c.state.stopping=true,h=>h.c.state.postDispatchWatchdog={},h=>h.c.state.transportServiceActive=true,h=>h.doc.defaultView.__NEXUS_AUTO_SELECTION_WAIT__={missionId:'101',active:true}]){
 const h=loading();mut(h);eq(h.run(),false);eq(h.calls.length,0,'no recovery of active work or explicit stop');
}
const backoff=loading();for(let i=0;i<5;i++){backoff.c.registerRecoverableMissionSkip('101','Bus','load',message,1,'VEHICLE_LOADING');eq(backoff.c.state.missionSkipRecords.get('101').retryAfterAt-100000,[60000,120000,240000,300000,300000][i]);}
function rescan(text=source){
 let now=100000,timer;const calls=[];
 const c=vm.createContext({Date:{now:()=>now},state:{wanted:true,worker:null,lowQueuePaused:true,lowQueueTriggerMissionId:'101',lowQueuePauseSince:90000,nativeMissionAdvances:0,
  missionSkipRecords:new Map(['101','102'].map(id=>[id,{category:'VEHICLE_LOADING',retryAfterAt:160000,retryAfterAdvance:1}]))},
  clearTimer:noop,setInterval:f=>{timer=f;return 1;},clearInterval:noop,MISSION_RESCAN_MS:1000,SLEEP_GAP_RECOVERY_THRESHOLD_MS:999999,
  MINIMUM_ACTIONABLE_MISSIONS:2,LOW_QUEUE_RESUME_STABLE_MS:3000,transportServiceRequest:()=>null,refreshRadioTransportRequests:()=>[],
  render:noop,completeLowQueuePauseAggregate:noop,recordLowQueueLifecycle:noop,clearLowQueuePauseRequest:noop,compactControllerEphemeralMemory:noop,
  saveRunContinuity:noop,setPhase:noop,log:noop,createWorker:u=>calls.push(u)
 });c.window=c;c.pipelineActionableCandidates=()=>['101','102'].filter(id=>!c.missionSkipRemaining(id)).map(id=>({missionId:id,url:'/missions/'+id}));
 for(const name of ['missionSkipRemaining','lowQueueResumeExcludedMissionId','actionableMissionSupply'])vm.runInContext(fn(name),c);
 vm.runInContext(fn('beginMissionRescan',text),c);c.beginMissionRescan();
 return {c,calls,tick:ms=>{now+=ms;timer();}};
}
const oldRescan=rescan(previous);oldRescan.tick(60000);oldRescan.tick(3000);eq(oldRescan.calls.length,0,'old final-mission exclusion can keep two recovered loading failures paused');
const resumed=rescan();resumed.tick(1000);eq(resumed.calls.length,0,'cooling missions remain deferred');resumed.tick(59000);eq(resumed.calls.length,0,'existing low-supply stability period retained');resumed.tick(3000);eq(resumed.calls,['/missions/101'],'all-failed queue restarts without manual Retry, advances or new missions');eq(resumed.c.state.nativeMissionAdvances,0);
const exclusion=rescan();exclusion.c.state.missionSkipRecords.set('101',{category:'POST_DISPATCH_STALL',retryAfterAdvance:0});eq(exclusion.c.lowQueueResumeExcludedMissionId(),'101','submitted final mission exclusion preserved');
// Byte-for-byte safety boundary: selection, staffing and readiness are untouched.
for(const name of ['handleCombinedLogic','selectVehicleUnits','countSelectedMatchingVehicles','getAllMatchingVehicleCheckboxes','nexusMakeSelectiveProbe','ensureVehicleListLoaded','waitForVehicleCheckboxListStable','claimAutoMissionDispatch','refreshArmedResponseRegistryFromLiveVehicles','nexusHasCompletedTrainedShortageRecheck'])eq(fn(name),fn(name,previous),name+' unchanged');
fs.writeFileSync(new URL('./auto-recovery-validation.json',import.meta.url),JSON.stringify({checks,baselineReproduced:true,liveGameVerified:false},null,2)+'\n');
console.log(`${checks} automatic recovery checks passed.`);
