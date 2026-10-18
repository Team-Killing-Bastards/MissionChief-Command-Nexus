import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
const previous=fs.readFileSync(new URL('../3.0.43.222/extension/nexus-runtime.js',import.meta.url),'utf8');
function fn(name,text=source) {
 const matches=[...text.matchAll(new RegExp('^ {0,8}(?:async )?function '+name+'\\(','gm'))];
 const start=matches.at(-1);assert(start,name);
 const end=/\n {0,4}(?:async )?function /.exec(text.slice(start.index+start[0].length));assert(end,name);
 return text.slice(start.index,start.index+start[0].length+end.index);
}
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);checks++;};
const ok=(v,m)=>{assert(v,m);checks++;};
const functions=['isStrictLiveVerifiedTrainingEntry','isAuthoritativeLivePoliceTrainingEntry',
 'getTrainingRequirementPersonnelTarget','getTrainingRequirementRequiredCodes','getTrainingRequirementEligibleTypeIds',
 'getTrainingRequirementVehicleCapacity','getTrainingRequirementVehicleTypeId','getRegistryTrainingQualifiedCount',
 'getTrainingRequirementQualifiedCount','getTrainingRequirementNominalCapacity','getTrainingCandidatePersonnelProfiles',
 'isCheckboxVehicleTypeEligibleForTrainingRequirement','isCheckboxEligibleForTrainingRequirement',
 'doesTrainingProfileSatisfyRequirement','applyTrainingCandidateCoverage','getRegistryTrainingCountsForCheckbox',
 'getRemainingTrainedPersonnelRequirements','getUnverifiedRegistryTrainingHintScore','orderStrictPoliceTrainingCandidates',
 'hasStrictPoliceTrainingRequirement','getTrainedCandidateMetrics','getTrainedVehicleSelectionScore',
 'applyTrainingCandidateToRemaining','countSelectedTrainingVehicles','selectVehiclesForTrainedPersonnelRequirements',
 'areTrainedPersonnelRequirementsSatisfied'];
function fixture({count=66,type='75',profiles=[['arff']],old=false}={}) {
 let now=1000000,registry={schemaVersion:1,updatedAt:1,vehicles:{}},requests=[],writes=[],active=0,peak=0;
 const boxes=Array.from({length:count},(_,i)=>({id:String(1000+i),type,checked:false,disabled:false}));
 const signals={mission:'101',fail:new Set(),redirect:new Set(),incomplete:new Set(),owner:true,stop:false,saveFail:false,load:false,loading:false,native:'Requirements',changedType:new Set()};
 const entry=(id,assigned=profiles)=>({vehicleId:id,vehicleTypeId:type,updatedAt:now,source:'mission-finder-live-strict-fixture',
  assignmentScanComplete:true,trainingProfilesComplete:true,assignedTrainingProfiles:assigned,
  assignedPersonnelCount:assigned.length,trainingCounts:Object.fromEntries([...new Set(assigned.flat())].map(code=>[code,assigned.filter(p=>p.includes(code)).length])),trainingCombinationCounts:{}});
 const c=vm.createContext({console,URL,AbortSignal,Date:{now:()=>now},location:{href:'https://www.missionchief.co.uk/missions/101'},
  MF_LIVE_TRAINING_VERIFY_CACHE_MS:600000,MF_LIVE_TRAINING_VERIFY_BATCH_SIZE:6,MF_STRICT_TRAINING_SOURCE_PREFIX:'mission-finder-live-strict-',MF_EXACT_REGISTER_TRAINING_SOURCE_PREFIX:'personnel-register-exact-',MF_EXACT_REGISTER_TRAINING_MAX_AGE_MS:180*86400000,
  MF_TRAINED_VEHICLE_CAPACITY_BY_TYPE:{'51':9,'8':2,'25':2},MF_PSU_COMPATIBLE_TRAINING_CODES:['level_1_public_order','level_2_public_order','police_sergeant','police_medic','railway_police'],
  mfLiveTrainingVerifyCache:new Map(),markLiveTrainingVehicleVerified:id=>c.mfLiveTrainingVerifyCache.set(id,now),
  autoModeRunning:true,autoModeLoopActive:false,mfDebugEnabled:false,nexusTrainedRecheckProof:null,
  getCurrentMissionIdForQueueRestart:()=>signals.mission,isManualAutoStopActive:()=>signals.stop,
  isCurrentMissionExecutionOwner:()=>signals.owner,readPersonnelTrainingRegistry:()=>structuredClone(registry),
  getVehicleCheckboxSnapshot:()=>boxes,getMissionVehicleId:b=>b.id,getVehicleTypeIdentifiers:b=>[b.type],
  sortVehicleCheckboxesByBestArrival:b=>b.slice(),getVehicleDebugName:b=>b.id,
  getRegistryEntryForMissionCheckbox:(b,r)=>({entry:r.vehicles[b.id]?.vehicleTypeId===b.type?r.vehicles[b.id]:null}),
  nexusApplyCommittedTraining:r=>r,clickVehicleElement:b=>{b.checked=true;return true;},debugLog:()=>{},
  getVisibleVehicleListLoadControl:()=>signals.load,isVehicleListLoadingIndicatorVisible:()=>signals.loading,
  document:{querySelectorAll:()=>[{textContent:signals.native,closest:()=>false}]},
  fetch:async url=>{const id=url.match(/vehicles\/(\d+)/)[1];requests.push(id);active++;peak=Math.max(peak,active);
   await Promise.resolve();active--;if(signals.fail.has(id))throw Error('network');
   return {ok:true,url:'https://www.missionchief.co.uk'+(signals.redirect.has(id)?'/users/sign_in':url),text:async()=>id};},
  parseLivePoliceTrainingAssignments:(id)=>({...entry(id),assignmentScanComplete:!signals.incomplete.has(id),
   detectedVehicleTypeId:signals.changedType.has(id)?'8':type,personnelRowsSeen:300,document:{retained:'must be removed'}}),
  savePersonnelTrainingRegistry:async patch=>{if(signals.saveFail)throw Error('database failure');writes.push(structuredClone(patch));
   for(const[id,e]of Object.entries(patch.vehicles))if(!registry.vehicles[id]||registry.vehicles[id].updatedAt<=e.updatedAt)registry.vehicles[id]=structuredClone(e);
   registry.updatedAt=++now;},
  __NEXUS_PERFORMANCE__:{record:()=>{}}
 });c.window=c;c.NexusPersonnelStore={player:'555'};
 for(const name of functions)vm.runInContext(fn(name),c);
 for(const name of ['nexusFreshLiveTrainingEntry','nexusFullyVerifiedTrainedPool','nexusTrainedRecheckFingerprint','nexusHasCompletedTrainedShortageRecheck'])vm.runInContext(fn(name),c);
 vm.runInContext(fn('refreshPoliceInspectorRegistryFromLiveVehicles',old?previous:source),c);
 const req=(target=count)=>[{code:profiles[0]?.[0]||'arff',label:'Qualified crew',personnelRequired:target,requirementType:'fixture',eligibleVehicleTypeIds:[type],vehicleCapacityByType:{[type]:Math.max(1,profiles.length)},requiredTrainingCodes:profiles[0]?.length?profiles[0]:['arff']}];
 return {c,boxes,signals,entry,req,requests,writes,get registry(){return registry;},set registry(v){registry=v;},get peak(){return peak;},tick:n=>now+=n,
  run:r=>c.refreshPoliceInspectorRegistryFromLiveVehicles(r||req(),'TEST'),select:r=>c.selectVehiclesForTrainedPersonnelRequirements(r||req(),'TEST')};
}
const before=fixture({old:true});await before.run();eq(before.writes.length,11,'baseline writes entire register after every six reads');
const f=fixture();const result=await f.run();eq(f.requests.length,66);eq(f.writes.length,1,'one commit per scan');eq(f.peak,6,'request concurrency unchanged');ok(result.complete);ok(f.select().satisfied,'all 66 qualified staff still selected');eq(f.boxes.filter(b=>b.checked).length,66);
ok(!JSON.stringify(f.writes).includes('retained'),'parser document not saved');
// New worker/document has no local verification map. Fresh committed evidence is reused.
const next=fixture();next.registry=f.registry;const nextResult=await next.run();eq(next.requests.length,0);eq(next.writes.length,0);ok(nextResult.complete);ok(next.select().satisfied);
// Existing unrelated records are never cloned into the patch, erased, or re-saved.
const patch=fixture({count:6});patch.registry.vehicles['9999']={...patch.entry('9999'),vehicleTypeId:'8'};await patch.run();eq(Object.keys(patch.writes[0].vehicles).length,6);ok(patch.registry.vehicles['9999']);
for(const kind of ['expired','future','incomplete','cloud','changed-type']) {
 const x=fixture({count:6});for(const b of x.boxes){const e=x.entry(b.id);if(kind==='expired')e.updatedAt-=600001;if(kind==='future')e.updatedAt+=1;if(kind==='incomplete')e.trainingProfilesComplete=false;if(kind==='cloud')e.source='personnel-register-exact-cloud';if(kind==='changed-type')e.vehicleTypeId='8';x.registry.vehicles[b.id]=e;}
 await x.run();eq(x.requests.length,6,kind+' must receive live verification');ok(x.select().satisfied);
}
const zero=fixture({count:6,profiles:[[]]});await zero.run();ok(!zero.select().satisfied,'untrained staff cannot satisfy demand');await zero.run();eq(zero.requests.length,6,'complete negative evidence is reused during local final search');
for(const failure of ['fail','redirect','incomplete','changedType']) {
 const x=fixture({count:6});x.signals[failure].add('1000');let r=await x.run();ok(!r.complete,failure+' never proves complete');ok(!x.select().satisfied,failure+' remains under-covered');x.signals[failure].clear();await x.run();eq(x.requests.length,7,'only missing evidence is re-read');ok(x.select().satisfied);
}
const disk=fixture({count:6});disk.signals.saveFail=true;await assert.rejects(disk.run(),/database/);checks++;eq(Object.keys(disk.registry.vehicles).length,0);ok(!disk.select().satisfied);
for(const kind of ['owner','stop','mission','player']) {
 const x=fixture({count:6});const fetch=x.c.fetch;x.c.fetch=async(...a)=>{const r=await fetch(...a);if(kind==='owner')x.signals.owner=false;if(kind==='stop')x.signals.stop=true;if(kind==='mission')x.signals.mission='102';if(kind==='player')x.c.NexusPersonnelStore.player='556';return r;};
 const r=await x.run();ok(!r.complete);eq(x.writes.length,0,kind+' prevents evidence commit');
}
// Dual qualifications must belong to the same assigned individual, and the exact vehicle type.
const dual=fixture({count:2,type:'25',profiles:[['traffic_police'],['swat']]});const dualReq=[{code:'armed_response_atc',label:'Armed Traffic Car crew',personnelRequired:2,requirementType:'armed_response_atc_vehicle',eligibleVehicleTypeIds:['25'],vehicleCapacityByType:{'25':2},requiredTrainingCodes:['traffic_police','swat']}];await dual.run(dualReq);ok(!dual.select(dualReq).satisfied,'separate single-trained people cannot count as dual-trained');
const qualified=fixture({count:2,type:'25',profiles:[['traffic_police','swat'],['traffic_police','swat']]});await qualified.run(dualReq);ok(qualified.select(dualReq).satisfied);eq(qualified.boxes.filter(b=>b.checked).length,1);
// Five simultaneous Public Order categories retain the production seat allocation algorithm.
const courses=['level_1_public_order','level_2_public_order','police_medic','police_sergeant','police_inspector'];
const publicOrder=fixture({count:36,type:'8',profiles:[courses,courses]});
const publicReq=courses.map((code,i)=>({code,label:code,personnelRequired:[24,24,6,6,2][i],eligibleVehicleTypeIds:['8'],vehicleCapacityByType:{'8':2},requiredTrainingCodes:[code]}));
await publicOrder.run(publicReq);const publicSelected=publicOrder.select(publicReq);ok(publicSelected.satisfied);ok(publicOrder.c.areTrainedPersonnelRequirementsSatisfied(publicReq));
const noInspector=fixture({count:36,type:'8',profiles:[courses.slice(0,4),courses.slice(0,4)]});
await noInspector.run(publicReq);ok(!noInspector.select(publicReq).satisfied,'other public-order courses cannot substitute for inspectors');
ok(!noInspector.c.areTrainedPersonnelRequirementsSatisfied(publicReq),'final coverage still detects missing inspectors');
const seats=fixture({count:1,type:'25',profiles:Array.from({length:4},()=>['traffic_police','swat'])});
const threePeople=[{...dualReq[0],personnelRequired:3}];await seats.run(threePeople);
ok(!seats.select(threePeople).satisfied,'extra assignment rows cannot exceed the exact two-seat vehicle capacity');
// Recheck proof invalidation: current document, stopped loop, complete list, pool, requirements and register.
const proof=fixture({count:1});await proof.run();proof.c.autoModeRunning=false;
function arm(){proof.c.nexusTrainedRecheckProof={at:1000001,missionId:'101',fingerprint:proof.c.nexusTrainedRecheckFingerprint(),requirements:proof.req()};}
arm();ok(proof.c.nexusHasCompletedTrainedShortageRecheck());
for(const [change,undo]of [
 [()=>proof.signals.load=true,()=>proof.signals.load=false],
 [()=>proof.signals.loading=true,()=>proof.signals.loading=false],
 [()=>proof.signals.native='New shortage',()=>proof.signals.native='Requirements'],
 [()=>proof.boxes[0].disabled=true,()=>proof.boxes[0].disabled=false],
 [()=>proof.boxes[0].checked=true,()=>proof.boxes[0].checked=false],
 [()=>proof.signals.mission='102',()=>proof.signals.mission='101'],
 [()=>proof.c.autoModeRunning=true,()=>proof.c.autoModeRunning=false],
 [()=>proof.c.autoModeLoopActive=true,()=>proof.c.autoModeLoopActive=false],
 [()=>proof.registry.updatedAt++,()=>proof.registry.updatedAt--]
]){change();ok(!proof.c.nexusHasCompletedTrainedShortageRecheck());undo();}
proof.tick(60001);ok(!proof.c.nexusHasCompletedTrainedShortageRecheck(),'expired proof keeps retry');
const newPool=fixture({count:1});await newPool.run();newPool.boxes.push({id:'9999',type:'75',checked:false,disabled:false});
ok(!newPool.c.nexusFullyVerifiedTrainedPool(newPool.req()),'new eligible vehicle between scan and stop must be verified');
newPool.boxes[1].disabled=true;ok(newPool.c.nexusFullyVerifiedTrainedPool(newPool.req()),'unavailable unchecked vehicle is excluded');
newPool.boxes[1].checked=true;ok(!newPool.c.nexusFullyVerifiedTrainedPool(newPool.req()),'selected disabled vehicle still requires evidence');
// Contract check: all downstream dispatch/coverage algorithms are byte-identical to .222.
for(const name of ['selectVehiclesForTrainedPersonnelRequirements','getRemainingTrainedPersonnelRequirements','applyTrainingCandidateCoverage','normalisePublicOrderTrainedRequirements','nexusConfirmCommittedTraining','claimAutoMissionDispatch','releaseAutoMissionDispatch','blockTrainedPersonnelDispatch','nexusCheckMissionProgress'])eq(fn(name),fn(name,previous),name+' unchanged');
ok(fn('processRequirementRows').includes('nexusFinalCrewChecks.push(finalCrewCheck.complete === true)'));
ok(fn('maybeHandleRecoverableAutoStop').includes("category === 'PERSONNEL_SHORTAGE' && doc === state.workerDocument"));
function recoveryFixture({proof=true,wrongDocument=false,category='PERSONNEL_SHORTAGE',transport=false}={}) {
 const calls=[];
 const evidence='Auto stopped: 12 trained personnel short. Dispatch was not clicked. Start Auto Mode again.';
 const doc={defaultView:{__NEXUS_TRAINED_SHORTAGE_RECHECKED__:()=>proof}};
 const state={wanted:true,stopping:false,currentMissionId:'101',currentMissionName:'CBRNE',currentMissionUrl:'/missions/101',
  workerDocument:wrongDocument?{}:doc,worker:{contentDocument:doc,contentWindow:{location:{replace:()=>calls.push('reload')}}},
  autoRecoveryCandidateKey:'101:GENERIC_RECOVERABLE_STOP',autoRecoveryCandidateSince:1000,autoRecoveryCandidateMissionId:'101',
  autoRecoveryCandidateWaitMs:3000,autoRecoveryCandidateReason:'shortage',autoRecoveryCandidateCategory:category,
  autoRecoveryCandidateEvidence:evidence,autoRecoverySkips:0};
 const c=vm.createContext({console,Date:{now:()=>10000},state,
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES:20,ZERO_SELECTION_SKIP_ADVANCES:20,GENERIC_RECOVERABLE_STOP_SKIP_ADVANCES:20,
  AUTO_RECOVERY_WATCHDOG_MS:12000,AUTO_RECOVERY_TERMINAL_WATCHDOG_MS:3000,
  isMissionUrl:()=>true,hasCoastguardHelicopterShortageEvidence:()=>({matched:false}),hasExactZeroSelectionFullListStop:()=>({matched:false}),
  classifyGenericRecoverableAutoStop:()=>({matched:true,terminal:true,evidence,category,reason:'shortage'}),
  clearAutoRecoveryWatchdog:()=>{},findAutoModeControl:()=>({}),autoControlLooksRunning:()=>false,
  refreshRadioTransportRequests:()=>[],transportServiceRequest:()=>transport?{}:null,
  resetAutoStartTracking:()=>{},setPhase:()=>{},log:()=>{},recordAutoRecoveryEvent:()=>{},
  registerRecoverableMissionSkip:(...a)=>{calls.push('skip');return {missionId:'101',skipAdvances:20,retryAfterAdvance:20};},
  choosePriorityTarget:()=>({missionId:'102'}),redirectAfterRecoverableSkip:()=>{calls.push('next');return true;},
  clearSharedV2AutoRunning:()=>{},removeWorker:()=>{},startTransportOnlyWorker:()=>{calls.push('transport');return true;},
  __NEXUS_RECOVERY__:{attempt:()=>{calls.push('attempt');return true;},outcome:()=>{}}
 });vm.runInContext(fn('maybeHandleRecoverableAutoStop'),c);c.maybeHandleRecoverableAutoStop(doc,evidence);return calls;
}
eq(recoveryFixture(),['skip','next'],'completed local final search rotates without repeating the mission');
for(const options of [{proof:false},{wrongDocument:true},{category:'RESOURCE_SHORTAGE'}])eq(recoveryFixture(options),['attempt','reload'],'unproven/other shortage retains the fresh-page recovery');
eq(recoveryFixture({transport:true}),['skip','transport'],'transport priority retained');
const report={checks,baselineColdReads:66,candidateColdReads:66,baselineColdCommits:11,candidateColdCommits:1,freshNextDocumentReads:next.requests.length,maxConcurrentReads:f.peak,liveGameVerified:false};
fs.writeFileSync(new URL('./crew-throughput-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
