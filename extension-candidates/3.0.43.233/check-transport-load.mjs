import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {source,old,fn,functions} from './transport-load-fixture.mjs';
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const ok=(v,m)=>{assert(v,m);checks++;};
const request={key:'11:101',vehicleId:'11',missionId:'101',missionUrl:'https://www.missionchief.co.uk/missions/101'};
function harness(text=source){
 let now=100000,serial=0;const timers=new Map(),calls=[],frames=[],storage=new Map();
 const signals={requests:[{...request}],supply:{count:2,candidates:[{missionId:'102',url:'https://www.missionchief.co.uk/missions/102'},{missionId:'103',url:'https://www.missionchief.co.uk/missions/103'}]}};
 const state={wanted:true,stopping:false,running:false,worker:null,workerRole:'',workerGeneration:0,workerDocumentSerial:0,
  currentMissionId:'101',currentMissionName:'Fixture',currentMissionUrl:request.missionUrl,transportServiceActive:false,
  transportServiceAttempts:0,transportServiceCleared:0,transportServiceHistory:[],transportServiceDeferredUntil:new Map(),
  patientAssistLastClickAt:0,prisonerAssistLastClickAt:0,postTransportRehooks:0,lowQueuePaused:false,lowQueueObservedCount:0};
 const noop=()=>{};let c;
 c=vm.createContext({URL,Date:{now:()=>now},console,state,WORKER_LOAD_TIMEOUT_MS:30000,TRANSPORT_SERVICE_MAX_MS:18000,
  TRANSPORT_SERVICE_RETRY_COOLDOWN_MS:30000,TRANSPORT_SERVICE_HISTORY_LIMIT:40,MINIMUM_ACTIONABLE_MISSIONS:2,
  LOW_QUEUE_RESUME_STABLE_MS:1500,SLEEP_GAP_RECOVERY_THRESHOLD_MS:60000,MISSION_RESCAN_MS:2000,
  WORKER_ID:'fixture',ACTIVE_WORKER_NAME_PREFIX:'active-',location:{origin:'https://www.missionchief.co.uk',href:'https://www.missionchief.co.uk/'},
  document:{createElement:()=>({isConnected:false,href:'about:blank',doc:null,setAttribute:noop}),body:{appendChild:f=>{f.isConnected=true;frames.push(f);}}},
  setTimeout:(cb,ms)=>{const id=++serial;timers.set(id,{cb,ms});return id;},setInterval:(cb,ms)=>{const id=++serial;timers.set(id,{cb,ms,interval:true});return id;},
  clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id),
  clearTimer:name=>{timers.delete(state[name]);state[name]=null;},
  sessionStorage:{getItem:k=>{if(signals.storageError)throw Error('blocked');return storage.get(k)||null;}},
  canonicalMissionWorkerUrl:u=>new URL(u,'https://www.missionchief.co.uk').href,clearPostDispatchWatchdog:noop,applyActiveWorkerFrameStyle:noop,bindManagedFrameLoad:(f,cb)=>{f.load=cb;},
  removeWorker:()=>{if(state.worker)state.worker.isConnected=false;state.worker=null;state.workerRole='';state.workerGeneration++;c.clearTimer('workerLoadTimer');},
  forgetWorkerDocument:noop,clearAutoRecoveryWatchdog:noop,recordMissionVisit:noop,
  setPhase:(phase,status,detail)=>{Object.assign(state,{phase,status,detail});calls.push(['phase',phase,status]);},log:(m,d)=>calls.push(['log',m,d]),
  missionNameForId:id=>'Fixture '+id,cleanMissionCaption:s=>s,missionDisplay:(id,name)=>`${name} [${id}]`,nowIso:()=>new Date(now).toISOString(),
  pausePipelineController:noop,clearSharedV2AutoRunning:noop,resetAutoStartTracking:noop,resetPatientAssistTracking:noop,resetPrisonerAssistTracking:noop,
  getWorkerHref:f=>f.href,getWorkerDocument:f=>f.doc,detectTransportContext:(doc,href)=>({kind:doc?.kind||(/\/(patient|gefangener)\//.test(href)?'PATIENT':''),evidence:[]}),
  refreshRadioTransportRequests:()=>signals.requests,actionableMissionSupply:()=>signals.supply,
  compactControllerEphemeralMemory:noop,saveRunContinuity:()=>calls.push(['save']),persistResumeMission:noop,
  enterLowQueuePause:reason=>{state.lowQueuePaused=true;calls.push(['low-queue',reason]);c.beginMissionRescan();},
  lowQueueResumeExcludedMissionId:()=>'',render:noop,captureStartupDiagnostic:noop,captureWorkerSnapshot:noop,
  onWorkerLoad:(f,g)=>{calls.push(['adopt',f.src,g]);c.clearTimer('workerLoadTimer');state.phase='TRANSPORT_SERVICE';},
  setError:(m,d)=>{state.wanted=false;calls.push(['error',m,d]);},recoverInitialMissionWorkerLoad:()=>false});
 c.window=c;
 for(const name of functions)vm.runInContext(fn(name,name==='createWorker'?text:source),c);
 return {c,state,signals,timers,calls,frames,storage,now:()=>now,tick:ms=>{now+=ms;},
  start:()=>{ok(c.startTransportOnlyWorker(request));return state.worker;},
  timeout:()=>{const t=timers.get(state.workerLoadTimer);ok(t);timers.delete(state.workerLoadTimer);now+=t.ms;t.cb();return t.ms;},
  later:ms=>{const t=[...timers.values()].find(t=>t.ms===ms);ok(t,`timer ${ms}`);t.cb();},
  recover:()=>c.recoverInitialTransportWorkerLoad(state.worker,state.workerGeneration,'https://www.missionchief.co.uk/vehicles/11')};
}
const baseline=harness(old);baseline.start();eq(baseline.timeout(),30000);eq(baseline.state.wanted,false,'old B load timeout ends run');
const h=harness();const first=h.start(),oldTimeout=h.timers.get(h.state.workerLoadTimer).cb;
h.storage.set('mf_auto_dispatch_latch_v1','{"missionId":"99","claimedAt":1}');
h.storage.set('mf_transport_click_lock_until_v10_3_9zd','99999');const locks=[...h.storage];
eq(h.timeout(),18000,'B uses existing side-pass budget');ok(h.state.wanted);eq(first.isConnected,false);
eq(h.state.transportServiceDeferredUntil.get(request.key)-h.now(),30000);eq(h.state.transportServiceCleared,0,'deferred is not transported');
eq(h.state.transportServiceHistory.at(-1).outcome,'deferred');eq([...h.storage],locks,'dispatch and transport locks retained');
eq(h.c.startTransportOnlyWorker(request,'late-callback'),false,'direct callbacks cannot bypass cooldown');
h.later(120);eq(h.state.workerRole,'MISSION_A');eq(h.state.currentMissionId,'102');eq(h.state.phase,'LOADING');
const gen=h.state.workerGeneration;oldTimeout();first.load();eq(h.state.workerGeneration,gen,'late B callbacks cannot replace A');
h.c.removeWorker();h.tick(29999);eq(h.c.startTransportOnlyWorker(request),false);h.tick(1);eq(h.c.startTransportOnlyWorker(request),true);
eq(h.state.worker.src,'https://www.missionchief.co.uk/vehicles/11','retry starts at canonical GET, not action route');
h.timeout();eq(h.state.transportServiceDeferredUntil.get(request.key)-h.now(),60000);
for(const expected of [120000,240000,300000,300000]){h.c.removeWorker();h.tick(300000);ok(h.c.startTransportOnlyWorker(request));h.timeout();eq(h.state.transportServiceDeferredUntil.get(request.key)-h.now(),expected);}
ok(h.state.wanted);eq(h.calls.filter(c=>c[0]==='error').length,0);
for(const mode of ['interactive','complete','context-while-loading','action-navigation','mission-navigation','shared-click','parent-patient-click','parent-prisoner-click','active-event']){
 const t=harness(),f=t.start();f.href='https://www.missionchief.co.uk/vehicles/11';f.doc={readyState:'loading'};
 if(mode==='interactive'||mode==='complete')f.doc.readyState=mode;
 if(mode==='context-while-loading')f.doc.kind='PATIENT';
 if(mode==='action-navigation')f.href='https://www.missionchief.co.uk/vehicles/11/patient/9';
 if(mode==='mission-navigation'){f.href=request.missionUrl;f.doc.readyState='interactive';}
 if(mode==='shared-click')t.storage.set('mf_transport_last_click_at_v10_3_9zd',String(t.now()));
 if(mode==='parent-patient-click')t.state.patientAssistLastClickAt=t.now();
 if(mode==='parent-prisoner-click')t.state.prisonerAssistLastClickAt=t.now();
 if(mode==='active-event')t.state.activeTransportEvent={kind:'PATIENT'};
 t.timeout();eq(t.state.worker,f,mode+' retained');eq(t.calls.filter(c=>c[0]==='adopt').length,1);
 eq(t.frames.length,1);ok(t.state.wanted);eq(t.state.transportServiceDeferredUntil.size,0);eq(t.state.transportServiceStartedAt,t.now());
}
for(const mode of ['not-wanted','stopping','stale-generation','other-frame','disconnected','wrong-role','inactive-service','wrong-key','wrong-initial','query-initial','login','foreign-origin','wrong-vehicle','unreadable','unknown-action','unexpected-query','unreadable-storage','corrupt-click','click-without-document']){
 const t=harness(),f=t.start();let gen=t.state.workerGeneration,url='https://www.missionchief.co.uk/vehicles/11';
 switch(mode){
 case 'not-wanted':t.state.wanted=false;break;case 'stopping':t.state.stopping=true;break;
 case 'stale-generation':gen--;break;case 'other-frame':t.state.worker={isConnected:true};break;case 'disconnected':f.isConnected=false;break;
 case 'wrong-role':t.state.workerRole='MISSION_A';break;case 'inactive-service':t.state.transportServiceActive=false;break;
 case 'wrong-key':t.state.transportServiceKey='11:999';break;case 'wrong-initial':url='/vehicles/11/patient/9';break;
 case 'query-initial':url='/vehicles/11?action=send';break;case 'login':f.href='https://www.missionchief.co.uk/users/sign_in';break;
 case 'foreign-origin':f.href='https://example.invalid/vehicles/11';break;case 'wrong-vehicle':f.href='https://www.missionchief.co.uk/vehicles/12';break;
 case 'unreadable':f.href='';break;case 'unknown-action':f.href='https://www.missionchief.co.uk/vehicles/11/backalarm';break;
 case 'unexpected-query':f.href='https://www.missionchief.co.uk/vehicles/11?send=1';break;
 case 'unreadable-storage':t.signals.storageError=true;break;case 'corrupt-click':t.storage.set('mf_transport_last_click_at_v10_3_9zd','bad');break;
 case 'click-without-document':t.storage.set('mf_transport_last_click_at_v10_3_9zd',String(t.now()));break;
 }
 eq(t.c.recoverInitialTransportWorkerLoad(f,gen,url),false,mode);eq(t.state.transportServiceDeferredUntil.size,0);eq(t.frames.length,1);
}
{const t=harness();t.start();t.signals.requests=[];t.timeout();ok(t.state.wanted);eq(t.state.transportServiceDeferredUntil.size,0);t.later(120);eq(t.state.workerRole,'MISSION_A');}
{const t=harness();t.signals.requests.push({key:'12:103',vehicleId:'12',missionId:'103'});t.start();t.timeout();ok(t.state.wanted);eq(t.state.workerRole,'TRANSPORT_B');eq(t.state.transportServiceKey,'12:103');}
{const t=harness();t.signals.supply={count:0,candidates:[]};t.start();t.timeout();ok(t.state.wanted);eq(t.state.worker,null);ok(t.state.lowQueuePaused);
 t.tick(29999);t.c.beginMissionRescan();const interval=t.timers.get(t.state.missionRescanTimer).cb;interval();eq(t.state.worker,null);
 t.tick(1);interval();eq(t.state.workerRole,'TRANSPORT_B');eq(t.state.transportServiceKey,request.key,'retry needs no completed missions');}
{const t=harness();const f=t.start();t.state.wanted=false;t.state.stopping=true;t.timeout();eq(t.state.worker,f);eq(t.calls.filter(c=>c[0]==='error').length,0);}
for(const mode of ['normal-load','mission-load']){const t=harness();const f=mode==='normal-load'?t.start():(t.c.createWorker('/missions/102'),t.state.worker);const pending=t.timers.get(t.state.workerLoadTimer);
 eq(pending.ms,mode==='normal-load'?18000:30000);f.load();eq(t.timers.has(t.state.workerLoadTimer),false);eq(t.frames.length,1);eq(t.state.transportServiceDeferredUntil.size,0);}
fs.writeFileSync(new URL('./transport-load-validation.json',import.meta.url),JSON.stringify({checks,baselineStopReproduced:true,healthyExtraRequests:0,healthyExtraTimers:0,liveRecoveryVerified:false},null,2)+'\n');
console.log(`${checks} transport load recovery checks passed.`);
