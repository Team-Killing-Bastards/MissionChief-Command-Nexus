import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { runtime, functions, functionText, events } from './helpers.mjs';
import { validateRules, mergeRules, repairLegacySearchDogRule } from '../extension/rules-core.mjs';
const origin='https://www.missionchief.co.uk';
test('bootstrap rejects mixed parent/worker builds before starting a runtime',()=>{
  const parent={location:{origin},__NEXUS_EXTENSION__:{build:'3.0.43.13'},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail}},dispatchEvent(){}};
  const window={top:parent,location:{origin}};
  vm.runInNewContext(runtime.slice(0,runtime.indexOf('function createNexusPerformance'))+'\n})();',{window,Date});
  assert.equal(window.__NEXUS_EXTENSION__.status,'parent-build-mismatch');
  assert.equal(window.__NEXUS_PERFORMANCE__,undefined);assert.equal(window.__MCN_V3_CONTROLLER__,undefined);
});
test('bootstrap admits matching builds and preserves duplicate-owner protection',()=>{
  for(const alreadyRunning of [false,true]) {
    const window={location:{origin},__MCN_V3_CONTROLLER__:alreadyRunning};window.top=window;
    const prefix=runtime.slice(0,runtime.indexOf('function createNexusPerformance'))+'\n})();';
    vm.runInNewContext(prefix,{window,Date});
    assert.equal(window.__NEXUS_EXTENSION__.status,alreadyRunning?'existing-runtime':'loaded');
    const previous=window.__NEXUS_EXTENSION__;vm.runInNewContext(prefix,{window,Date});assert.equal(window.__NEXUS_EXTENSION__,previous);
  }
});
test('Search Dog matching accepts 101 and 102 but excludes Police DSU and name-only impostors',()=>{
  const api=functions(['isSearchDogUnitVehicleCheckbox'],{getVehicleTypeIdentifiers:input=>input.types});
  for(const id of ['101','102',101,102])assert.equal(api.isSearchDogUnitVehicleCheckbox({types:[id]}),true);
  for(const id of ['12','85','86','99',''])assert.equal(api.isSearchDogUnitVehicleCheckbox({types:[id],name:'Search Dog Unit'}),false);
});
test('SAR alternatives require explicit wording and only accept types 86, 87 or 92',()=>{
  const api=functions(['nexusIsFlexibleSarSupportRequirement','nexusMatchesSarSupportAlternative'],{normaliseVehicleText:s=>String(s).toLowerCase(),getVehicleTypeIdentifiers:i=>i.types,isOperationalSupportVanCheckbox:i=>i.types.includes('86')});
  const wording='Operational Support Vans, Trailers or Personal SAR Vehicles';
  for(const id of ['86','87','92'])assert.equal(api.nexusMatchesSarSupportAlternative({types:[id]},wording),true);
  for(const id of ['39','88','93'])assert.equal(api.nexusMatchesSarSupportAlternative({types:[id]},wording),false);
  assert.equal(api.nexusMatchesSarSupportAlternative({types:['87']},'Operational Support Vans'),false);
});
function patientApi({mission='42',docMission='42',host=origin,attended=true,connected=true,owner=true}={}) {
  return functions(['nexusHasAttendedPatientUpgrade'],{
    URL,location:{origin},getCurrentMissionIdForQueueRestart:()=>mission,isCurrentMissionExecutionOwner:()=>owner,
    getMissionAccessibleDocuments:()=>[{location:{href:host+'/missions/'+docMission},querySelectorAll:()=>attended?[{id:'vehicle_row_7',isConnected:connected}]:[]}]
  }).nexusHasAttendedPatientUpgrade;
}
const patients=[{isPatientAlertFallback:true,patientRequirementType:'ambulance',stillNeeded:3}];
test('attended patient upgrades require live rows from this mission and origin',()=>{
  assert.equal(patientApi()(patients),true);
  for(const options of [{attended:false},{connected:false},{mission:''},{docMission:'43'},{host:'https://evil.test'},{owner:false}])assert.equal(patientApi(options)(patients),false);
  assert.equal(patientApi()([{...patients[0],stillNeeded:0}]),false);
  assert.equal(patientApi()([{stillNeeded:3}]),false);
});
test('custom rules never fall back to a similarly named wrong-type vehicle',()=>{
  const boxes=[{type:'102',name:'Search Dog Unit'},{type:'101',name:'Anything'},{type:'101',disabled:true},{type:'101',checked:true}];
  const api=functions(['getAllMatchingVehicleCheckboxes'],{__NEXUS_RULES__:{lookup:()=>({vehicleTypeId:'101'})},mfApplyStoredStaffingQuarantine(){},getVehicleCheckboxSnapshot:()=>boxes,getVehicleTypeIdentifiers:i=>[i.type],sortVehicleCheckboxesByBestArrival:x=>x});
  assert.deepEqual(api.getAllMatchingVehicleCheckboxes('Custom','Search Dog Unit',false),[boxes[1]]);
  assert.deepEqual(api.getAllMatchingVehicleCheckboxes('Custom','Search Dog Unit',true),[boxes[1],boxes[3]]);
});
test('selection cannot proceed before authoritative extension rules arrive',()=>{
  let clicks=0;
  const api=functions(['selectVehicleUnits'],{__NEXUS_RULES__:{isReady:()=>false},clickVehicleElement(){clicks++}});
  const result=api.selectVehicleUnits('Ambulances','Ambulance',3,'UPDATE');
  assert.equal(result.rulesLoading,true);assert.equal(result.missing,3);assert.equal(clicks,0);
});
test('rule validation rejects ambiguous duplicates and migration preserves user choices',()=>{
  const dog={requirement:'Search Dog Units',vehicleName:'Search Dog Unit SAR',vehicleTypeId:'102',enabled:true};
  const custom={requirement:'My ambulance rule',vehicleName:'Ambulance',vehicleTypeId:'5',enabled:true};
  assert.throws(()=>validateRules({schema:1,rules:[dog,{...dog,requirement:'Required 2 Search Dog Units'}]}));
  assert.deepEqual(repairLegacySearchDogRule({schema:1,rules:[dog,custom]}).rules,[custom]);
  assert.equal(repairLegacySearchDogRule({schema:1,rules:[{...dog,enabled:false}]}).rules.length,1);
  assert.equal(mergeRules({schema:1,rules:[custom]},{schema:1,rules:[dog]}).rules.length,2);
});
test('the personnel cache reuses immutable reads but supplies mutable verification copies',()=>{
  const env={Date,structuredClone,location:{origin,pathname:'/'},...events()};env.top=env;
  const api=functions(['createNexusPerformance']).createNexusPerformance(env);
  const raw=JSON.stringify({vehicles:{'7':{trainingCounts:{sar:3}}}});
  const first=api.readRegistry(raw);assert.equal(api.readRegistry(raw),first);assert.ok(Object.isFrozen(first.vehicles['7']));
  const mutable=api.readRegistry(raw,true);mutable.vehicles['7'].trainingCounts.sar=5;
  assert.equal(api.readRegistry(raw).vehicles['7'].trainingCounts.sar,3);
  assert.equal(api.snapshot().counters.registryParses,1);
  api.dispose();assert.equal(api.snapshot().registryRetained,false);
});
test('vehicle signature cache notices synchronous DOM mutations and releases old documents',()=>{
  const observers=[];
  class Observer{constructor(){this.records=[];observers.push(this)}observe(){}takeRecords(){return this.records.splice(0)}disconnect(){this.disconnected=true}}
  const env={Date,structuredClone,MutationObserver:Observer,location:{origin,pathname:'/'},...events()};env.top=env;
  const api=functions(['createNexusPerformance']).createNexusPerformance(env);
  const first={documentElement:{}},second={documentElement:{}};let scans=0;
  const compute=()=>({signature:String(++scans)});
  api.vehicleSignature(first,compute);api.vehicleSignature(first,compute);assert.equal(scans,1);
  observers[0].records.push({type:'childList'});api.vehicleSignature(first,compute);assert.equal(scans,2);
  api.vehicleSignature(second,compute);assert.equal(observers[0].disconnected,true);assert.equal(api.snapshot().retainedDocuments,1);
  api.dispose();assert.equal(api.snapshot().retainedDocuments,0);assert.equal(observers[1].disconnected,true);
});
test('requirement cache refuses cross-mission/cross-origin keys and safely falls back without IndexedDB',async()=>{
  const env={Date,structuredClone,URL,crypto:{randomUUID},sessionStorage:{getItem:()=>'',setItem(){}},location:{origin,pathname:'/'},...events()};env.top=env;
  const api=functions(['createNexusPerformance']).createNexusPerformance(env);
  assert.equal(await api.getRequirements({url:origin+'/einsaetze/6?mission_id=42',missionId:'99',missionTypeId:'6'}),null);
  assert.equal(await api.getRequirements({url:'https://evil.test/einsaetze/6?mission_id=42',missionId:'42',missionTypeId:'6'}),null);
  assert.equal(await api.getRequirements({url:origin+'/einsaetze/6?mission_id=42',missionId:'42',missionTypeId:'6'}),null);
});
test('recovery permits one extra mission attempt and suppresses repeatedly unsuccessful profiles',()=>{
  const memory=new Map();const env={localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},document:{querySelector:()=>null}};env.top=env;
  const api=functions(['createNexusRecovery'],{Date}).createNexusRecovery(env);
  assert.equal(api.attempt('1','shortage','Hikers'),true);assert.equal(api.attempt('1','shortage','Hikers'),false);
  api.outcome('1',false);assert.equal(api.attempt('2','shortage','Hikers'),true);api.outcome('2',false);
  assert.equal(api.attempt('3','shortage','Hikers'),false);assert.equal(api.attempt('3','shortage','Different'),true);
});
test('full logger survives BFCache pagehide but disposes on a real navigation',()=>{
  const win={...events()},doc={...events(),querySelector:()=>null};win.top=win;win.document=doc;
  const timers=new Set();let next=1;
  const api=functions(['installNexusFullLogger'],{window:win,document:doc,crypto:{randomUUID},Map,Set,Date,
    setTimeout(){const id=next++;timers.add(id);return id;},clearTimeout:id=>timers.delete(id),
    trimMissionLoggerText:s=>String(s||''),localStorage:{setItem(){}},CustomEvent:class{constructor(type){this.type=type}}
  });
  api.installNexusFullLogger();assert.ok(win.__NEXUS_FULL_LOGGER__);
  win.dispatchEvent({type:'pagehide',persisted:true});assert.ok(win.__NEXUS_FULL_LOGGER__);assert.ok(timers.size);
  win.dispatchEvent({type:'pagehide',persisted:false});assert.equal(win.__NEXUS_FULL_LOGGER__,undefined);assert.equal(timers.size,0);
});
test('committed training offsets totals once and never offsets an explicit deficit',()=>{
  const input={setAttribute(){}};let active=new Set(['7']),selected=[];
  const api=functions(['nexusApplyCommittedTraining'],{
    Date,document:{createElement:()=>({...input})},getCurrentMissionIdForQueueRestart:()=> '42',nexusCommittedVehicleIds:()=>active,
    getMissionVehicleId:box=>box.id,
    applyTrainingCandidateCoverage:requirements=>({remaining:requirements.map(r=>({...r,remaining:Math.max(0,r.remaining-3)}))})
  },`let nexusCommittedTraining={missionId:'42',at:Date.now(),vehicles:[{id:'7',type:'85',entry:{}}]},nexusCommittedUsed=false;`);
  const rows=[{remaining:5,nexusAbsoluteTraining:true},{remaining:5,nexusAbsoluteTraining:false}];
  assert.equal(api.nexusApplyCommittedTraining(rows,selected)[0].remaining,2);
  assert.equal(api.nexusApplyCommittedTraining(rows,selected)[1].remaining,5);
  selected=[{id:'7'}];assert.equal(api.nexusApplyCommittedTraining(rows,selected)[0].remaining,5);
  active=new Set();assert.equal(api.nexusApplyCommittedTraining(rows,[])[0].remaining,5);
});
test('stale committed training and another mission contribute no coverage',()=>{
  for(const [missionId,at] of [['43',Date.now()],['42',Date.now()-31000]]) {
    const api=functions(['nexusApplyCommittedTraining'],{Date,getCurrentMissionIdForQueueRestart:()=> '42'},`let nexusCommittedTraining=${JSON.stringify({missionId,at,vehicles:[{id:'7'}]})};`);
    const rows=[{remaining:3,nexusAbsoluteTraining:true}];assert.equal(api.nexusApplyCommittedTraining(rows,[]),rows);
  }
});
test('lost committed crew at final verification blocks dispatch',async()=>{
  let blocked=false;
  const api=functions(['nexusConfirmCommittedTraining'],{
    nexusRefreshCommittedTraining:async()=>{},getVehicleCheckboxSnapshot:()=>[],readPersonnelTrainingRegistry:()=>({}),
    getRemainingTrainedPersonnelRequirements:()=>[{remaining:1}],formatTrainedPersonnelShortfall:()=> '1 trained crew missing',
    blockTrainedPersonnelDispatch:()=>{blocked=true;}
  },'let nexusCommittedUsed=true,nexusCommittedRequirements=[{code:"sar",nexusAbsoluteTraining:true}];');
  assert.equal(await api.nexusConfirmCommittedTraining(),false);assert.equal(blocked,true);
});
