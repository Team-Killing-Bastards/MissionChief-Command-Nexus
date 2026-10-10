import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=version=>fs.readFileSync(new URL(`../${version}/extension/nexus-runtime.js`,import.meta.url),'utf8');
const source=read('3.0.43.217'),previous=read('3.0.43.213');
function fn(source,name){const start=source.indexOf('function '+name+'(');assert(start>=0,name);const end=source.indexOf('\nfunction ',start+10);assert(end>start,name+' boundary');return source.slice(start,end);}
const reason='Auto stopped: patient transport remains pending; no additional vehicles were requested. Existing units were kept for transport.';
let checks=0;
function harness(source,{withVerifier=true,radio=true}={}){
 let now=1200;const actions=[],records=[],errors=[];
 const doc={defaultView:{__NEXUS_PATIENT_TAIL_HANDOFF__:{kind:'PATIENT_TRANSPORT_PENDING',missionId:'101',at:1010,reason}}};
 const state={wanted:true,workerRole:'MISSION_A',currentMissionId:'101',currentMissionUrl:'/missions/101',currentMissionName:'Multiple Seizures',workerDocument:doc,workerDocumentSerial:3,autoStartDocumentSerial:3,autoRunningConfirmedDocumentSerial:0,autoStartIssued:true,autoStartAttemptAt:1000,autoStartAttempts:1};
 const c=vm.createContext({state,doc,Date:{now:()=>now},reason,
  stop:{reason,stoppedAtMs:1010,afterCurrentConfirmation:false},
  AUTO_START_CONFIRM_TIMEOUT_MS:2500,AUTO_START_MAX_ATTEMPTS:2,
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,ZERO_SELECTION_SKIP_ADVANCES:20,AUTO_RECOVERY_WATCHDOG_MS:2000,
  autoControlLooksRunning:()=>false,confirmCurrentDocumentAutoMode:()=>false,
  readV2AutoStopRecord:()=>c.stop,getWorkerHref:()=>'/missions/101',missionIdFromUrl:url=>url.match(/\/missions\/(\d+)/)?.[1]||'',
  setError:(title,detail)=>errors.push({title,detail}),setPhase:()=>{},log:()=>{},elementLabel:()=> 'Auto Mode: Start',
  clearAutoRecoveryWatchdog:()=>{},isMissionUrl:()=>true,findAutoModeControl:()=>null,
  hasCoastguardHelicopterShortageEvidence:()=>({matched:false}),
  collectAutoStopEvidence:(_doc,status)=>status,normaliseText:x=>String(x||''),
  candidate:{actionKind:'UPGRADE',missingText:'Transport is needed!'},mapMissionCandidate:()=>c.candidate,
  requests:radio?[{key:'11:101',missionId:'101',vehicleId:'11'}]:[],refreshRadioTransportRequests:()=>c.requests,transportServiceRequest:requests=>requests[0]||null,
  registerRecoverableMissionSkip:(id,name,why,evidence,advances,category)=>{const record={missionId:id,missionName:name,skipAdvances:advances,category};records.push(record);return record;},
  clearSharedV2AutoRunning:()=>{},resetAutoStartTracking:()=>{},removeWorker:()=>actions.push('release-A'),
  startTransportOnlyWorker:request=>{actions.push('start-B:'+request.vehicleId);return true;},
  choosePriorityTarget:()=>({missionId:'102'}),redirectAfterRecoverableSkip:()=>{actions.push('defer-one-advance');return true;}
 });
 c.control={ownerDocument:doc,click:()=>actions.push('start-click')};
 const names=['hasExactZeroSelectionFullListStop','isTransportOnlyZeroSelection','maybeHandleRecoverableAutoStop','handleUnconfirmedAutoStart'];
 if(withVerifier)names.unshift('verifiedPatientTailTransportStop');
 vm.runInContext(names.map(name=>fn(source,name)).join('\n'),c);
 return {c,actions,records,errors,clock:value=>now=value,run:()=>vm.runInContext('handleUnconfirmedAutoStart(control)',c)};
}
// Exact .213 regression: immediate deliberate stop never confirmed as running,
// then two start attempts followed by startup error instead of transport handoff.
{const h=harness(previous,{withVerifier:false});assert.equal(h.run(),true);assert.deepEqual(h.actions,[]);h.clock(3700);h.run();assert.deepEqual(h.actions,['start-click']);h.clock(6300);h.run();assert.match(h.errors[0].title,/did not confirm/);assert.deepEqual(h.records,[]);checks++;}
// New handler calls the real recoverable-stop path before any startup retry.
{const h=harness(source);assert.equal(h.run(),true);assert.deepEqual(h.actions,['release-A','start-B:11']);assert.deepEqual(h.errors,[]);assert.equal(h.records[0].skipAdvances,1);checks++;}
{const h=harness(source,{radio:false});h.run();assert.deepEqual(h.actions,['defer-one-advance']);assert.equal(h.records[0].skipAdvances,1);assert.deepEqual(h.errors,[]);checks++;}
{const h=harness(source);h.c.state.transportKind='PATIENT';h.run();assert.deepEqual(h.actions,['release-A','start-B:11']);assert.deepEqual(h.errors,[]);checks++;}
// Old persisted records, another realm/mission, manual stop and unrelated errors
// cannot opt into this exception. The existing bounded start gate stays intact.
for(const change of [
 h=>h.c.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__.missionId='999',
 h=>h.c.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__.at=999,
 h=>h.c.stop={reason:'Auto stopped: unknown error',stoppedAtMs:1010},
 h=>h.c.stop=null,
 h=>h.c.stop.stoppedAtMs=700,
 h=>h.c.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__=null,
 h=>h.c.state.workerDocument={},
 h=>h.c.state.workerDocumentSerial=4,
 h=>h.c.state.workerRole='TRANSPORT_B',
 h=>h.c.state.wanted=false,
 h=>h.c.state.transportKind='PRISONER',
 h=>h.c.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__.at=1300,
 h=>{h.c.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__.at=1000;h.c.stop.stoppedAtMs=1000;h.c.state.autoStartAttemptAt=1000;h.clock(12000);}
]){const h=harness(source);change(h);h.run();assert(!h.actions.some(x=>x.startsWith('start-B')));assert.deepEqual(h.records,[]);checks++;}
{const h=harness(source);h.c.state.autoStartAttemptAt=1020;h.run();assert.deepEqual(h.records,[]);checks++;}
{const h=harness(source);h.c.doc.defaultView.__NEXUS_PATIENT_TAIL_HANDOFF__=null;h.clock(3700);h.run();assert.deepEqual(h.actions,['start-click']);h.clock(6300);h.run();assert.match(h.errors[0].title,/did not confirm/);checks++;}
assert(source.includes("kind:'PATIENT_TRANSPORT_PENDING', missionId, at:Date.now(), reason"));checks++;
console.log(`${checks} startup handoff checks passed. Reproduced .213 failure; exercised real recovery path without live game actions.`);
