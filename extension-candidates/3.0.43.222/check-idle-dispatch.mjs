import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const previous=fs.readFileSync(new URL('../3.0.43.221/extension/nexus-runtime.js',import.meta.url),'utf8');
function fn(name,text=source) {
 const start=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);assert(start,name);
 const end=/\n {0,4}(?:async )?function /.exec(text.slice(start.index+start[0].length));assert(end,name);
 return text.slice(start.index,start.index+start[0].length+end.index);
}
let checks=0;
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
function fixture(text=source) {
 let now=100000,writeCount=0;
 const storage=new Map([['mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101',claimedAt:80000})]]),local=new Map();
 const calls=[],signals={manual:false,managed:true,mission:true,guard:false,box:{value:'5',checked:false,disabled:false},status:'Auto Mode restored after mission load.'};
 const store=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>{writeCount++;m.set(k,v);},removeItem:k=>{writeCount++;m.delete(k);}});
 const c=vm.createContext({console,Date:{now:()=>now},performance:{timeOrigin:90000},
  autoModeRunning:true,autoModeLoopActive:false,mfAutoStartup:{phase:'running'},mfAutoAdvanceResumeActive:false,mfAutoUpgradeResumeActive:false,
  MF_AUTO_DISPATCH_LATCH_KEY:'mf_auto_dispatch_latch_v1',MF_AUTO_DISPATCH_LATCH_TTL_MS:300000,
  MF_AUTO_ADVANCE_AFTER_DISPATCH_KEY:'advance',MF_AUTO_UPGRADE_PENDING_KEY:'upgrade',MF_QUEUE_OPENING_MISSION_FLAG:'opening',MF_FINAL_QUEUE_DISPATCH_FLAG:'final',
  MF_INSTANCE_TOKEN:'owner1',MF_SHARED_ACTIVE_INSTANCE_KEY:'owner',
  sessionStorage:store(storage),localStorage:store(local),
  isManualAutoStopActive:()=>signals.manual,isMfV3ManagedActiveWorker:()=>signals.managed,isMissionPage:()=>signals.mission,
  getCurrentMissionIdForQueueRestart:()=>c.state.currentMissionId,getLocalMissionInstanceKey:()=> 'mission101',getSharedTopWindow:()=>c,
  state:{wanted:true,stopping:false,lowQueuePaused:false,workerRole:'MISSION_A',workerDocumentSerial:1,currentMissionId:'101',currentMissionName:'Aircraft crash'},
  missionIdFromUrl:()=> '101',findAutoModeControl:()=>({}),autoControlLooksRunning:()=>true,
  findUsefulNexusStatus:()=>signals.status,sharedV2QueueGuardIsActive:s=>s,readSharedV2QueueGuardState:()=>signals.guard,
  log:(message,data)=>calls.push(['log',message,data]),captureWorkerSnapshot:()=>calls.push(['snapshot']),
  registerRecoverableMissionSkip:(...args)=>calls.push(['skip',...args]),RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,
  finaliseActiveMissionTiming:r=>calls.push(['finish',r]),clearSharedV2AutoRunning:r=>calls.push(['clear-running',r]),
  resetAutoStartTracking:()=>calls.push(['reset-start']),removeWorker:()=>calls.push(['remove']),
  actionableMissionSupply:()=>({count:2,candidates:[{missionId:'101',url:'/missions/101'},{missionId:'102',url:'/missions/102'}]}),
  MINIMUM_ACTIONABLE_MISSIONS:2,enterLowQueuePause:r=>calls.push(['pause',r]),createWorker:url=>calls.push(['create',url]),
  setPhase:(...args)=>calls.push(['phase',...args]),beginMissionRescan:()=>calls.push(['rescan']),setError:(...args)=>calls.push(['error',...args]),
  sameOriginUrl:href=>({href}),isMissionUrl:()=>true
 });
 c.owner={token:'owner1',missionKey:'mission101'};c.window=c;
 vm.runInContext(fn('nexusReadIdleDispatchClaim'),c);
 vm.runInContext(fn('nexusCheckMissionProgress',text),c);
 vm.runInContext(fn('claimAutoMissionDispatch')+'\n'+fn('releaseAutoMissionDispatch'),c);
 const doc={readyState:'complete',defaultView:c,querySelectorAll:()=>[signals.box]};c.state.workerDocument=doc;
 return {c,doc,signals,storage,local,calls,writes:()=>writeCount,
  tick:(delta=0,context={})=>{now+=delta;return c.nexusCheckMissionProgress(doc,'https://www.missionchief.co.uk/missions/101',context);},
  proof:()=>c.nexusReadIdleDispatchClaim(),setClaim:v=>storage.set('mf_auto_dispatch_latch_v1',JSON.stringify(v))};
}
const baseline=fixture(previous);
eq(baseline.tick(),false);eq(baseline.tick(10000),false,'old restored document still waits');
eq(baseline.tick(109999),false);eq(baseline.tick(5000),true,'old generic recovery needs two minutes');
eq(baseline.calls.find(c=>c[0]==='create'),['create','/missions/102']);

const happy=fixture(),originalClaim=happy.storage.get('mf_auto_dispatch_latch_v1');
eq(happy.tick(),false);eq(happy.tick(5000),false);eq(happy.tick(5000),true,'idle inherited claim defers after 10 seconds');
eq(happy.calls.filter(c=>c[0]==='skip').length,1);eq(happy.calls.find(c=>c[0]==='skip').at(-1),'DISPATCH_CLAIM_DEFERRED');
eq(happy.calls.find(c=>c[0]==='skip').at(-2),20,'existing skip cooldown');
eq(happy.calls.find(c=>c[0]==='create'),['create','/missions/102']);
eq(happy.writes(),0,'proof and deferral never change storage');eq(happy.storage.get('mf_auto_dispatch_latch_v1'),originalClaim);
eq(happy.c.claimAutoMissionDispatch('101'),false,'duplicate dispatch remains refused');eq(happy.writes(),0);

const guards={
 'active selection loop':h=>h.c.autoModeLoopActive=true,
 'manual stop':h=>h.signals.manual=true,
 'not running':h=>h.c.autoModeRunning=false,
 'inactive worker':h=>h.signals.managed=false,
 'not a mission page':h=>h.signals.mission=false,
 'register loading':h=>h.c.mfAutoStartup.phase='loading-register',
 'advance in progress':h=>h.c.mfAutoAdvanceResumeActive=true,
 'upgrade in progress':h=>h.c.mfAutoUpgradeResumeActive=true,
 'different owner':h=>h.c.owner.token='owner2',
 'different owned mission':h=>h.c.owner.missionKey='mission102',
 'no owner':h=>h.c.owner=null,
 'opening queue':h=>h.storage.set('opening','true'),
 'final dispatch':h=>h.storage.set('final','true'),
 'session handoff':h=>h.storage.set('advance','{}'),
 'shared handoff':h=>h.local.set('advance','{}'),
 'session upgrade':h=>h.storage.set('upgrade','{}'),
 'shared upgrade':h=>h.local.set('upgrade','{}'),
 'new claim in current document':h=>h.setClaim({missionId:'101',claimedAt:95000}),
 'claim at document start':h=>h.setClaim({missionId:'101',claimedAt:90000}),
 'other mission claim':h=>h.setClaim({missionId:'102',claimedAt:80000}),
 'missing claim':h=>h.storage.delete('mf_auto_dispatch_latch_v1'),
 'malformed claim':h=>h.storage.set('mf_auto_dispatch_latch_v1','bad json'),
 'undated claim':h=>h.setClaim({missionId:'101'}),
 'future claim':h=>h.setClaim({missionId:'101',claimedAt:200000}),
 'invalid document date':h=>h.c.performance.timeOrigin=NaN,
 'future document':h=>h.c.performance.timeOrigin=200000,
 'unreadable storage':h=>h.c.sessionStorage.getItem=()=>{throw Error('fixture storage failure');}
};
for(const [name,mutate] of Object.entries(guards)) {
 const h=fixture();mutate(h);eq(h.proof(),null,name+' cannot prove idle inherited claim');
 eq(h.tick(),false,name);eq(h.tick(15000),false,name);eq(h.calls.length,0,name+' no actions');eq(h.writes(),0,name+' no writes');
}
const controllerGuards={
 'stopping':h=>h.c.state.stopping=true,
 'not wanted':h=>h.c.state.wanted=false,
 'low queue pause':h=>h.c.state.lowQueuePaused=true,
 'Worker B':h=>h.c.state.workerRole='TRANSPORT_B',
 'current transport':h=>h.c.state.transportKind='PATIENT',
 'transport service':h=>h.c.state.transportServiceActive=true,
 'dispatch watchdog':h=>h.c.state.postDispatchWatchdog={},
 'document loading':h=>h.doc.readyState='loading',
 'wrong document':h=>h.c.state.workerDocument={},
 'wrong controller mission':h=>h.c.state.currentMissionId='102',
 'pending queue handoff':h=>h.signals.guard=true,
 'validation active':h=>h.c.__NEXUS_AUTO_VALIDATION_WAIT__={active:true,missionId:'101',startedAt:100000},
 'selection active':h=>h.c.__NEXUS_AUTO_SELECTION_WAIT__={active:true,missionId:'101',startedAt:100000},
 'no reader':h=>h.c.__NEXUS_READ_IDLE_DISPATCH_CLAIM__=null,
 'reader failure':h=>h.c.__NEXUS_READ_IDLE_DISPATCH_CLAIM__=()=>{throw Error('fixture');},
 'repeated recovery':h=>h.c.state.nexusProgressAttempts={'101':1},
 'recovery bound':h=>h.c.state.nexusProgressAttempts=Object.fromEntries(Array.from({length:100},(_,i)=>[i,1]))
};
for(const [name,mutate] of Object.entries(controllerGuards)) {
 const h=fixture();mutate(h);eq(h.tick(),false,name);eq(h.tick(15000),false,name);eq(h.calls.length,0,name+' no actions');eq(h.writes(),0,name+' no writes');
}
// Refusing the shortcut must not repeatedly restart the original stop deadline.
for(const name of ['repeated recovery','recovery bound']) {
 const h=fixture();controllerGuards[name](h);h.tick();
 for(let elapsed=5000;elapsed<120000;elapsed+=5000)eq(h.tick(5000),false,name+' remains bounded');
 eq(h.tick(5000),true,name+' reaches original deadline');
 eq(h.calls.filter(c=>c[0]==='error').length,1,name+' keeps fail-closed stop');
 eq(h.calls.filter(c=>c[0]==='create').length,0,name+' never reopens');
}
{const h=fixture();eq(h.tick(0,{kind:'PATIENT'}),false);eq(h.tick(15000,{kind:'PATIENT'}),false);eq(h.calls.length,0);}
// Any evidence change starts a fresh 10-second observation, even with the same URL.
for(const [name,change] of Object.entries({
 'new document serial':h=>h.c.state.workerDocumentSerial++,
 'changed selection':h=>h.signals.box.checked=true,
 'changed status':h=>h.signals.status='Another status',
 'changed claim':h=>h.setClaim({missionId:'101',claimedAt:85000})
})) {const h=fixture();h.tick();h.tick(5000);change(h);eq(h.tick(5000),false,name);eq(h.tick(5000),false,name);eq(h.tick(5000),true,name+' fresh idle window');}
{const h=fixture();h.tick();h.signals.guard=true;h.tick(5000);h.signals.guard=false;eq(h.tick(5000),false);eq(h.tick(5000),false);eq(h.tick(5000),true,'handoff clears before idle window starts');}
{const h=fixture();h.tick();h.c.autoModeLoopActive=true;h.tick(5000);h.c.autoModeLoopActive=false;eq(h.tick(5000),false);eq(h.tick(5000),false);eq(h.tick(5000),true,'work resumes before idle window starts');}
{const h=fixture();h.tick();h.c.state.workerDocument={};eq(h.tick(10000),false,'detached old doc cannot defer');}
{const h=fixture();h.setClaim({missionId:'101',claimedAt:1});eq(h.tick(201000),false,'expired claim no early deferral');eq(h.tick(10000),false);eq(h.calls.length,0);}
{const h=fixture();h.tick();h.signals.status='Units ready for dispatch.';eq(h.tick(5000),false);eq(h.tick(10000),true,'proof remains required regardless of text');}
{const h=fixture();h.storage.delete('mf_auto_dispatch_latch_v1');h.tick();eq(h.tick(10000),false);eq(h.tick(110000),true,'unclaimed stalled work retains two-minute recovery');eq(h.calls.find(c=>c[0]==='create'),['create','https://www.missionchief.co.uk/missions/101']);}
// A claim or lock can change between the proof read and final confirmation.
for(const [name,change] of Object.entries({
 'claim replaced':h=>h.setClaim({missionId:'101',claimedAt:99000}),
 'claim removed':h=>h.storage.delete('mf_auto_dispatch_latch_v1'),
 'handoff began':h=>h.signals.guard=true
})) {const h=fixture();h.tick();const reader=h.c.__NEXUS_READ_IDLE_DISPATCH_CLAIM__;h.c.__NEXUS_READ_IDLE_DISPATCH_CLAIM__=()=>{const p=reader();change(h);return p;};eq(h.tick(10000),false,name);eq(h.calls.length,0,name+' no early action');}
{const h=fixture();h.c.actionableMissionSupply=()=>({count:1,candidates:[]});h.tick();eq(h.tick(10000),true);eq(h.calls.find(c=>c[0]==='pause'),['pause','dispatch-claim-deferred']);eq(h.calls.filter(c=>c[0]==='create').length,0);}
// Actual dispatch, selection, transport and startup code stays byte-for-byte intact.
for(const name of ['claimAutoMissionDispatch','releaseAutoMissionDispatch','clickMissionDispatchByValue','handleCombinedLogic','confirmPrvSrvSelectionBeforeDispatch','waitForFastDispatchReadiness','nexusHandlePatientMissionTail','triggerAmbulanceClick','selectVehicleUnits','runAutoModeLoop','startAutoMode','completeAutoModeStart','handleUnconfirmedAutoStart']) {
 eq(fn(name),fn(name,previous),name+' unchanged');
}
fs.writeFileSync(new URL('./idle-dispatch-validation.json',import.meta.url),JSON.stringify({version:'3.0.43.222',passed:true,checks,oldIdleDeferralMs:124999,newIdleDeferralMs:10000,scope:'Production-function fixtures with controlled clocks and explicit inherited claim. No live throughput claim.'},null,2)+'\n');
console.log(checks+' idle-dispatch safety checks passed.');
