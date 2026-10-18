import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const previous=fs.readFileSync(new URL('../3.0.43.230/extension/nexus-runtime.js',import.meta.url),'utf8');
export function fn(name,text=source){
 const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);assert(a,name);
 const b=/\n {0,4}(?:async )?function /.exec(text.slice(a.index+a[0].length));assert(b,name);
 return text.slice(a.index,a.index+a[0].length+b.index);
}
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const noop=()=>{};
function fixture(text=source){
 let now=100000;const calls=[],storage=new Map(),signals={transport:null,target:{missionId:'102',url:'/missions/102'},running:false};
 const reason='Auto stopped: zero-patient cleanup needs checking (Cancellation response did not confirm success and the mission remains). No further cancellation was sent.';
 const doc={readyState:'complete',defaultView:{__NEXUS_PATIENT_TAIL_HANDOFF__:{kind:'PATIENT_CLEANUP_REVIEW',missionId:'101',at:now,reason}}};
 const control={ownerDocument:doc,textContent:'Auto Mode: Start'};
 const stop={reason,stoppedAtMs:now,afterCurrentConfirmation:true};
 const c=vm.createContext({console,Date:{now:()=>now},doc,stop,normaliseText:s=>String(s||'').replace(/\s+/g,' ').trim(),collectAutoStopEvidence:(d,s)=>s,
  state:{wanted:true,stopping:false,workerRole:'MISSION_A',autoStartIssued:true,autoStartDocumentSerial:100,workerDocumentSerial:100,autoStartAttemptAt:now-300,
   currentMissionId:'101',currentMissionName:'Smoke Inhalation',currentMissionUrl:'/missions/101',nativeMissionAdvances:0,missionSkipRecords:new Map(),missionSkipHistory:[],autoRecoveryHistory:[],recoverableMissionSkips:0,
   workerDocument:doc,worker:{isConnected:true,contentDocument:doc,contentWindow:{location:{replace:u=>calls.push(['reload',u])}}}},
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,ZERO_SELECTION_SKIP_ADVANCES:20,GENERIC_RECOVERABLE_STOP_SKIP_ADVANCES:20,AUTO_RECOVERY_WATCHDOG_MS:12000,AUTO_RECOVERY_TERMINAL_WATCHDOG_MS:3000,MISSION_SKIP_HISTORY_LIMIT:80,
  sessionStorage:{getItem:k=>storage.get(k)||null},isMissionUrl:u=>/^\/missions\/\d+$/.test(u),missionIdFromUrl:u=>String(u).match(/missions\/(\d+)/)?.[1]||'',getWorkerHref:()=>'/missions/101',readV2AutoStopRecord:()=>stop,
  hasCoastguardHelicopterShortageEvidence:()=>({matched:false}),hasExactZeroSelectionFullListStop:()=>({matched:false}),verifiedPatientTailTransportStop:()=>null,
  clearAutoRecoveryWatchdog:noop,recordAutoRecoveryEvent:e=>calls.push(['recovery',e]),setPhase:(...a)=>calls.push(['phase',...a]),log:noop,render:noop,
  findAutoModeControl:()=>control,autoControlLooksRunning:()=>signals.running,
  transportServiceRequest:()=>signals.transport,refreshRadioTransportRequests:()=>[],resetAutoStartTracking:noop,
  __NEXUS_RECOVERY__:{attempt:()=>{calls.push(['unsafe-retry']);return true;},outcome:noop,emit:noop},
  cleanMissionCaption:s=>s,missionNameForId:()=> 'Smoke Inhalation',missionDisplay:(id,n)=>n,nowIso:()=>new Date(now).toISOString(),
  missionSkipIssueDetails:()=>[],trimOldestMapEntries:noop,recordMissionSkipEvent:e=>calls.push(['skip',e]),
  choosePriorityTarget:()=>signals.target,redirectAfterRecoverableSkip:t=>{calls.push(['next',t.missionId]);return true;},
  clearSharedV2AutoRunning:noop,removeWorker:()=>calls.push(['remove']),startTransportOnlyWorker:r=>{calls.push(['transport',r.key]);return true;},beginMissionRescan:()=>calls.push(['rescan'])
 });
 for(const name of ['classifyGenericRecoverableAutoStop','isTimedMissionLoadingSkip','registerRecoverableMissionSkip','missionSkipRemaining','maybeHandleRecoverableAutoStop'])vm.runInContext(fn(name,text),c);
 if(text===source)vm.runInContext(fn('verifiedPatientTailCleanupStop'),c);
 return {c,doc,control,stop,calls,storage,signals,run:()=>c.maybeHandleRecoverableAutoStop(doc,'AUTO STOPPED: '+stop.reason),tick:ms=>now+=ms};
}
const old=fixture(previous);old.stop.reason='Auto stopped: zero-patient cleanup could not be verified (Cancel All Units was not accepted and the mission remains). Check this mission; no further cancellation was sent.';
eq(old.run(),false,'reproduce .230 unhandled stop');eq(old.calls,[]);
const good=fixture();good.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__.responseEvidence='HTTP 200; success flash false; state empty';eq(good.run(),true);eq(good.calls.filter(x=>x[0]==='next'),[['next','102']]);
eq(good.calls.find(x=>x[0]==='recovery')[1].responseEvidence,'HTTP 200; success flash false; state empty','response evidence retained in controller export');
eq(good.c.state.missionSkipRecords.get('101').category,'PATIENT_CLEANUP_REVIEW');eq(good.c.state.missionSkipRecords.get('101').skipAdvances,20);
eq(good.calls.some(x=>['reload','unsafe-retry'].includes(x[0])),false,'no retry of uncertain cancellation');
eq(good.c.state.wanted,true,'user run intent retained');
const transport=fixture();transport.signals.transport={key:'vehicle-2'};eq(transport.run(),true);eq(transport.calls.filter(x=>['transport','remove'].includes(x[0])),[['remove'],['transport','vehicle-2']]);
const empty=fixture();empty.signals.target=null;eq(empty.run(),true);eq(empty.calls.some(x=>x[0]==='rescan'),true);eq(empty.c.state.wanted,true);
const guards={
 stopped:f=>f.c.state.wanted=false,stopping:f=>f.c.state.stopping=true,role:f=>f.c.state.workerRole='TRANSPORT_B',
 detached:f=>f.c.state.worker.isConnected=false,oldDocument:f=>f.c.state.workerDocument={},wrongDocument:f=>f.c.state.worker.contentDocument={},
 noStart:f=>f.c.state.autoStartIssued=false,oldStart:f=>f.c.state.autoStartDocumentSerial=99,
 dispatch:f=>f.c.state.postDispatchWatchdog={},transport:f=>f.c.state.transportServiceActive=true,transportKind:f=>f.c.state.transportKind='PATIENT',
 active:f=>f.signals.running=true,claim:f=>f.storage.set('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'101'})),badClaim:f=>f.storage.set('mf_auto_dispatch_latch_v1','bad'),
 otherMission:f=>f.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__.missionId='999',stale:f=>f.tick(10001),future:f=>f.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__.at+=1000,
 noSignal:f=>delete f.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__,manualReason:f=>f.stop.reason='Manual stop',staleStop:f=>f.stop.stoppedAtMs-=1000,
 selection:f=>f.doc.defaultView.__NEXUS_AUTO_SELECTION_WAIT__={missionId:'101',active:true},failedSelection:f=>f.doc.defaultView.__NEXUS_AUTO_SELECTION_WAIT__={missionId:'101',failed:true}
};
for(const [name,mutate] of Object.entries(guards)){const f=fixture();mutate(f);eq(f.run(),false,name);eq(f.calls.some(x=>['next','remove','transport','rescan','reload','unsafe-retry'].includes(x[0])),false,name+' no action');}
const unrelated=fixture();unrelated.storage.set('mf_auto_dispatch_latch_v1',JSON.stringify({missionId:'999'}));eq(unrelated.run(),true);eq(JSON.parse(unrelated.storage.get('mf_auto_dispatch_latch_v1')).missionId,'999');
// Use actual startup handler: immediate cleanup stops must not trigger another Start.
const early=fixture();vm.runInContext(fn('handleUnconfirmedAutoStart'),early.c);early.c.captureWorkerSnapshot=noop;
eq(early.c.handleUnconfirmedAutoStart(early.control),true);eq(early.calls.some(x=>x[0]==='next'),true);
fs.writeFileSync(new URL('./cleanup-recovery-validation.json',import.meta.url),JSON.stringify({checks,reproduced230Stop:true,noCancellationReplay:true,transportHandoff:true},null,2)+'\n');
console.log(`${checks} cleanup controller recovery checks passed.`);
