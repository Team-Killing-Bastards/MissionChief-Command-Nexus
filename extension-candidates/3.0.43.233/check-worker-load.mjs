import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
export const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const old=fs.readFileSync(new URL('../3.0.43.229/extension/nexus-runtime.js',import.meta.url),'utf8');
export function fn(name,text=source){
 const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);assert(a,name);
 const b=/\n {0,4}(?:async )?function /.exec(text.slice(a.index+a[0].length));assert(b,name);
 return text.slice(a.index,a.index+a[0].length+b.index);
}
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const ok=(v,m)=>{assert(v,m);checks++;};
function harness(text=source){
 let now=100000,nextTimer=0;const timers=new Map(),calls=[],attempts=new Set(),storage=new Map();
 const signals={target:{missionId:'102',url:'https://www.missionchief.co.uk/missions/102'},request:null,confirmed:false};
 const noop=()=>{};
 const state={wanted:true,stopping:false,workerGeneration:0,workerRole:'',worker:null,
  currentMissionId:'101',currentMissionName:'Fixture',currentMissionUrl:'https://www.missionchief.co.uk/missions/101',
  workerDocumentSerial:0,autoStartIssued:false,transportServiceActive:false,transportKind:'',
  postDispatchWatchdog:null,missionSkipRecords:new Map(),nativeMissionAdvances:0,recoverableMissionSkips:0,autoRecoverySkips:0};
 const c=vm.createContext({URL,Date:{now:()=>now},console,state,WORKER_LOAD_TIMEOUT_MS:30000,TRANSPORT_SERVICE_MAX_MS:18000,recoverInitialTransportWorkerLoad:()=>false,
  WORKER_ID:'fixture-worker',ACTIVE_WORKER_NAME_PREFIX:'mcn-v3-active-worker-',MISSION_SKIP_HISTORY_LIMIT:100,
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,location:{origin:'https://www.missionchief.co.uk',href:'https://www.missionchief.co.uk/'},
  document:{createElement:()=>({isConnected:false,doc:null,href:'about:blank',setAttribute:noop}),body:{appendChild:f=>{f.isConnected=true;}}},
  setTimeout:(cb,ms)=>{const id=++nextTimer;timers.set(id,{cb,ms});return id;},
  clearTimeout:id=>timers.delete(id),clearTimer:name=>{timers.delete(state[name]);state[name]=null;},
  sessionStorage:{getItem:k=>{if(signals.storageError)throw Error('blocked');return storage.get(k)||null;}},
  canonicalMissionWorkerUrl:u=>u,missionNameForId:id=>'Fixture '+id,cleanMissionCaption:s=>s,
  normaliseText:x=>String(x||'').trim(),nowIso:()=>new Date(now).toISOString(),
  missionSkipIssueDetails:()=>[],trimOldestMapEntries:noop,recordMissionSkipEvent:r=>calls.push(['skip-event',r]),
  clearPostDispatchWatchdog:noop,applyActiveWorkerFrameStyle:noop,bindManagedFrameLoad:(f,cb)=>{f.load=cb;},
  forgetWorkerDocument:()=>{state.workerDocument=null;state.autoStartIssued=false;},clearAutoRecoveryWatchdog:noop,
  recordMissionVisit:noop,setPhase:(p,s,d)=>{state.phase=p;calls.push(['phase',p,s,d]);},log:(m,d)=>calls.push(['log',m,d]),
  getWorkerDocument:f=>f.doc,getWorkerHref:f=>f.href,findAutoModeControl:doc=>doc.control||null,
  currentWorkerAutoConfirmed:()=>signals.confirmed,captureStartupDiagnostic:noop,captureWorkerSnapshot:noop,
  pausePipelineController:noop,clearSharedV2QueueGuard:(...a)=>calls.push(['guard',...a]),clearSharedV2AutoRunning:noop,
  resetAutoStartTracking:()=>{state.autoStartIssued=false;},finaliseActiveMissionTiming:noop,
  removeWorker:()=>{if(state.worker)state.worker.isConnected=false;state.worker=null;state.workerRole='';state.workerGeneration++;timers.delete(state.workerLoadTimer);},
  onWorkerLoad:(f,g)=>{calls.push(['adopt',g]);c.clearTimer('workerLoadTimer');state.phase='ACTIVE';},
  setError:(m,d)=>{state.wanted=false;calls.push(['error',m,d]);},recordAutoRecoveryEvent:r=>calls.push(['recovery',r]),
  refreshRadioTransportRequests:()=>[],transportServiceRequest:()=>signals.request,
  startTransportOnlyWorker:(r,reason)=>{calls.push(['transport',r,reason]);return true;},
  choosePriorityTarget:()=>signals.target,beginMissionRescan:()=>calls.push(['rescan']),missionDisplay:(id,name)=>`${name} [${id}]`,
  __NEXUS_RECOVERY__:{attempt:id=>{if(attempts.has(id))return false;attempts.add(id);return true;},outcome:noop,emit:noop}
 });c.window=c;
 for(const name of ['sameOriginUrl','missionIdFromUrl','canonicalMissionPageId','pathFromUrl','isTimedMissionLoadingSkip','registerRecoverableMissionSkip','missionSkipRemaining','lowQueueResumeExcludedMissionId','recoverInitialMissionWorkerLoad'])vm.runInContext(fn(name),c);
 vm.runInContext(fn('createWorker',text),c);
 return {c,state,calls,signals,attempts,storage,timers,tick:ms=>{now+=ms;},
  start:(role='MISSION_A')=>{c.createWorker('https://www.missionchief.co.uk/missions/101',role);return state.worker;},
  timeout:()=>{const timer=timers.get(state.workerLoadTimer);ok(timer,'load timer exists');eq(timer.ms,state.workerRole==='TRANSPORT_B'?18000:30000,'mission limit unchanged; B uses existing service budget');timers.delete(state.workerLoadTimer);timer.cb();},
  run:()=>c.recoverInitialMissionWorkerLoad(state.worker,state.workerGeneration,'https://www.missionchief.co.uk/missions/101')};
}
const baseline=harness(old);baseline.start();baseline.timeout();eq(baseline.state.wanted,false,'old callback stops the entire run');eq(baseline.calls.filter(x=>x[0]==='error').length,1);
const happy=harness();const first=happy.start(),staleTimer=happy.timers.get(happy.state.workerLoadTimer).cb;
happy.storage.set('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'99',claimedAt:99000}));const claim=happy.storage.get('mf_auto_dispatch_latch_v1');
happy.timeout();ok(happy.state.wanted);ok(happy.state.worker!==first);eq(happy.state.currentMissionId,'101');eq(first.isConnected,false);eq(happy.calls.filter(x=>x[0]==='error').length,0);eq(happy.attempts.size,1);eq(happy.storage.get('mf_auto_dispatch_latch_v1'),claim,'previous dispatch claim survives');
const generation=happy.state.workerGeneration;staleTimer();eq(happy.state.workerGeneration,generation,'obsolete timeout cannot destroy replacement');
happy.timeout();eq(happy.state.currentMissionId,'102');ok(happy.state.wanted);eq(happy.state.missionSkipRecords.get('101').category,'WORKER_LOADING');eq(happy.c.missionSkipRemaining('101'),1);eq(happy.state.autoRecoverySkips,1);
happy.state.nativeMissionAdvances=100;eq(happy.c.missionSkipRemaining('101'),1,'advances do not bypass network backoff');happy.tick(60000);eq(happy.c.missionSkipRemaining('101'),0,'retry becomes eligible without a completed mission');eq(happy.storage.get('mf_auto_dispatch_latch_v1'),claim);
for(const condition of ['stop','not-wanted','stale-generation','different-frame','disconnected','transport-b','transport-active','transport-kind','wrong-current-id','action-url','login-url','cross-origin','unreadable','started','confirmed','watchdog','selected','current-claim','invalid-claim','null-claim','invalid-id-claim','storage-error']){
 const h=harness();const f=h.start();let generation=h.state.workerGeneration,url='https://www.missionchief.co.uk/missions/101';
 switch(condition){
  case 'stop':h.state.stopping=true;break;
  case 'not-wanted':h.state.wanted=false;break;
  case 'stale-generation':generation--;break;
  case 'different-frame':h.state.worker={isConnected:true};break;
  case 'disconnected':f.isConnected=false;break;
  case 'transport-b':h.state.workerRole='TRANSPORT_B';break;
  case 'transport-active':h.state.transportServiceActive=true;break;
  case 'transport-kind':h.state.transportKind='patient';break;
  case 'wrong-current-id':h.state.currentMissionId='999';break;
  case 'action-url':f.href='https://www.missionchief.co.uk/missions/101/alarm';break;
  case 'login-url':f.href='https://www.missionchief.co.uk/users/sign_in';break;
  case 'cross-origin':f.href='https://example.invalid/missions/101';break;
  case 'unreadable':f.href='';break;
  case 'started':h.state.autoStartIssued=true;break;
  case 'confirmed':h.signals.confirmed=true;break;
  case 'watchdog':h.state.postDispatchWatchdog={missionId:'101'};break;
  case 'selected':f.doc={readyState:'loading',querySelector:sel=>sel.includes(':checked')?{}:null};break;
  case 'current-claim':h.storage.set('mf_auto_dispatch_latch_v1','{"missionId":"101"}');break;
  case 'invalid-claim':h.storage.set('mf_auto_dispatch_latch_v1','{bad');break;
  case 'null-claim':h.storage.set('mf_auto_dispatch_latch_v1','null');break;
  case 'invalid-id-claim':h.storage.set('mf_auto_dispatch_latch_v1','{"missionId":"unknown"}');break;
  case 'storage-error':h.signals.storageError=true;break;
 }
 eq(h.c.recoverInitialMissionWorkerLoad(f,generation,url),false,condition+' fails closed');eq(h.attempts.size,0,condition+' never starts retry');eq(h.state.missionSkipRecords.size,0);
}
for(const ready of ['interactive','complete','control-while-loading']){
 const h=harness(),f=h.start();f.href='https://www.missionchief.co.uk/missions/101';
 f.doc={readyState:ready==='control-while-loading'?'loading':ready,control:ready==='control-while-loading'?{}:null,querySelector:s=>s==='#missionH1'?{}:null};
 h.storage.set('mf_auto_dispatch_latch_v1','{"missionId":"101"}');
 h.timeout();eq(h.state.worker,f,'existing document retained');eq(h.calls.filter(x=>x[0]==='adopt').length,1);eq(h.attempts.size,0);ok(h.state.wanted);eq(h.state.phase,'ACTIVE');
}
const transport=harness();transport.attempts.add('101');transport.signals.request={key:'transport-1'};transport.start();transport.timeout();eq(transport.calls.filter(x=>x[0]==='transport').length,1);eq(transport.state.worker,null);ok(transport.state.wanted);
const empty=harness();empty.attempts.add('101');empty.signals.target=null;empty.start();empty.timeout();ok(empty.state.wanted);eq(empty.state.worker,null);eq(empty.calls.filter(x=>x[0]==='rescan').length,1);eq(empty.state.phase,'MISSION_SKIPPED');
empty.state.lowQueuePaused=true;empty.state.lowQueueTriggerMissionId='101';eq(empty.c.lowQueueResumeExcludedMissionId(),'101');empty.tick(60000);eq(empty.c.lowQueueResumeExcludedMissionId(),'','eligible load must count toward resumed supply');
for(let i=1;i<5;i++){empty.c.registerRecoverableMissionSkip('101','Fixture','load','',1,'WORKER_LOADING');eq(empty.state.missionSkipRecords.get('101').retryAfterAt-160000,[0,120000,240000,300000,300000][i]);}
const manual=harness();manual.start();manual.state.stopping=true;manual.timeout();eq(manual.calls.filter(x=>x[0]==='error'||x[0]==='recovery').length,0,'late timeout cannot override manual Stop');
const b=harness();b.start('TRANSPORT_B');b.timeout();eq(b.calls.filter(x=>x[0]==='error').length,1,'unrecognised transport recovery retains stop safeguard');eq(b.attempts.size,0);
fs.writeFileSync(new URL('./worker-load-validation.json',import.meta.url),JSON.stringify({checks,baselineStopReproduced:true,liveRecoveryVerified:false},null,2)+'\n');
console.log(`${checks} worker load recovery checks passed.`);
