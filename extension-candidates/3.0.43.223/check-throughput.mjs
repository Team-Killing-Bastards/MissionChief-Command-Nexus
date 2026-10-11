import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const source=read('./extension/nexus-runtime.js'), previous=read('../3.0.43.219/extension/nexus-runtime.js');
function fn(name,text=source) {
  const start=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);assert(start,name);
  const end=/\n {0,4}(?:async )?function /.exec(text.slice(start.index+start[0].length));assert(end,name);
  return text.slice(start.index,start.index+start[0].length+end.index);
}
let checks=0;
const results={};
async function load(o={},text=source) {
  let now=1000,page=0,clicks=0,selected=0,stopped=false,writes=0;
  const pages=(o.pages||[[38,5],[0],[8]]).map((types,p)=>types.map((type,i)=>({id:String(1000+p*100+i),type:String(type),checked:false,disabled:false,closest:()=>({getAttribute:()=>String(i)})})));
  if(o.duplicate)pages[0].push({...pages[0][0]});
  if(o.checked)pages[0][0].checked=true;
  const controls=pages.slice(0,-1).map((_,p)=>({token:String(p),isConnected:true,click(){clicks++;this.isConnected=false;page++;}}));
  const snapshot=()=>pages.slice(0,page+1).flat();
  const mission=()=>now>=(o.changeMissionAt||Infinity)?'102':'101';
  const c=vm.createContext({console,Date:class extends Date {constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}},
    autoModeRunning:true,mfDebugEnabled:false,MF_VEHICLE_NEXT_PAGE_SETTLE_MS:1200,
    isManualAutoStopActive:()=>stopped,isCurrentMissionExecutionOwner:()=>!o.unowned,
    getLocalMissionInstanceKey:mission,getCurrentMissionIdForQueueRestart:mission,
    getMissionRequirementReadFailure:()=>o.failedRead?'failed':null,
    mfLastMissionRequirementRead:{missionKey:'101',status:o.failedRead?'failed':'loaded-empty'},
    findPatientCount:()=>now>=(o.increasePatientsAt||Infinity)?2:(o.patients??1),
    readUnitFinderPatientRequirementRows:()=>o.alerts||[],
    parseVisibleMissionRequirementRows:()=>[],findLegacyVehicleRequirementList:()=>null,
    hasVisibleCurrentMissingOnMissionTable:()=>!!o.live,
    getExplicitCurrentMissingRequirementRows:()=>o.explicit?[{}]:[],readMissionUpdateRows:()=>[],
    hasMissionVehiclesOnSceneForTrainedPersonnelAuthority:()=>!!o.onScene,
    collapseSharedFireOperationalSupportRequirements:r=>r,normaliseOperationalRequirementRows:r=>r,
    getVehicleCheckboxSnapshot:snapshot,getVehicleTypeIdentifiers:v=>[v.type],getMissionVehicleId:v=>v.id,
    resolveUnitName:n=>n,normaliseVehicleText:n=>String(n||'').trim().toLowerCase(),
    isFireEngineRequirement:n=>n==='Fire engines',sortVehicleCheckboxesByBestArrival:r=>r,mfApplyStoredStaffingQuarantine:()=>{},
    getVisibleVehicleListLoadControl:()=>controls[page]||null,isVehicleListLoadControlVisible:()=>!!controls[page],
    getVehicleCheckboxListSignature:()=>({boxes:snapshot(),signature:snapshot().map(v=>v.id).join(',')}),
    invalidateVehicleCheckboxCache:()=>{},invalidateVehicleListStructureCache:()=>{},
    isVehicleListLoadingIndicatorVisible:()=>!!o.spinner,
    getVehicleListLoadControlToken:v=>v?.token||'',realClickForQueueRestart:()=>false,
    updateStatusBox:()=>{},debugLog:()=>{},clickVehicleElement:()=>{selected++;},
    wait:async ms=>{now+=ms;if(now>=(o.stopAt||Infinity))stopped=true;if(now>=(o.removeAt||Infinity))pages[0].forEach(v=>v.disabled=true);},
    __NEXUS_RULES__:{isReady:()=>!o.rulesPending,lookup:()=>o.override?{vehicleTypeId:o.override}:null},
    isAmbulanceMissionLimitEnabled:()=>o.limit!=null,getConfiguredAmbulanceMissionLimit:()=>o.limit,
    isAmbulanceTransportRequest:(a,b)=>/^Ambulance(?:s| x \d+)?$/i.test(a)||/^Ambulance(?:s| x \d+)?$/i.test(b),
    isAmbulanceOfficerRequirement:n=>n==='Ambulance Officer',
    mfAmbulanceOfficerThresholdEnabled:o.officer!==false,mfAmbulanceOfficerThreshold:3,
    normaliseConfiguredAmbulanceOfficerThreshold:n=>n,hasAmbulanceOfficerThresholdAlreadySatisfied:()=>false,
    mfAlwaysSendAmbulanceToHighRiskMissingPerson:false,isNexusKnownAmbulanceMission:()=>false,
    mfGetRecordedUncappedAmbulanceDemand:()=>0,countSelectedMatchingVehicles:()=>0,
    localStorage:{getItem:k=>k.endsWith('enabled_v1')?(o.mce===false?'false':'true'):String(o.mceThreshold??15),setItem:()=>{writes++;}}
  });
  c.window={top:c};c.JSON=vm.runInContext('JSON',c);
  for(const name of ['nexusIsFlexibleSarSupportRequirement','nexusLifeguardAlternativeTypes','nexusWaterCarrierTypes','nexusFleetPreferenceTypes','nexusFleetMatches','buildFreshAmbulanceOfficerThresholdAdditionalRows',
    'addConfiguredAmbulanceOfficerThresholdRequirement','addConfiguredHighRiskMissingPersonAmbulanceRequirement',
    'addNexusKnownAmbulanceRequirement','addConfiguredMassCasualtyThresholdRequirement','applyConfiguredFreshMissionVehicleRequirements'])vm.runInContext(fn(name,text),c);
  c.getAllMatchingVehicleCheckboxes=(name,mapped,checked)=>{
    const types=o.override?[o.override]:c.nexusFleetPreferenceTypes(name,mapped)||
      (/^Ambulance Officer$/i.test(name)?['19']:/^Mass Casualty Equipment$/i.test(name)?['72']:/^Ambulance/i.test(name)?['5']:/^Police/i.test(name)?['8']:['999']);
    return c.nexusFleetMatches(types,checked,false);
  };
  for(const name of ['nexusMakeSelectiveProbe','nexusRecordSelectiveLoad','waitForVehicleCheckboxListStable','waitForVehicleNextPageReady','ensureVehicleListLoaded'])vm.runInContext(fn(name,text),c);
  c.rows=o.rows??[{unitName:'Fire engines',stillNeeded:1}];c.options=o.current?{allowCurrentAuthority:true,applyFreshConfiguredRules:false}:{};
  const probe=vm.runInContext('nexusMakeSelectiveProbe(Promise.resolve(rows),options)',c);
  await probe(); // Surface fixture dependency errors instead of the loader's safe full fallback.
  const result=await c.ensureVehicleListLoaded({canStopEarly:probe,requireNonZero:true,pageProgressTimeoutMs:3000});
  assert.equal(selected,0,'coverage probe never selects');assert.equal(writes,0,'coverage proof does not write storage');checks+=2;
  return {result:JSON.parse(JSON.stringify(result)),clicks,elapsedMs:now-1000,reason:c.__NEXUS_SELECTIVE_LOADING__.recent.at(-1).probeReason};
}
async function scenario(name,o,expectedClicks,partial=false){const r=results[name]=await load(o);assert.equal(r.clicks,expectedClicks,name+': '+JSON.stringify(r));assert.equal(!!r.result.partial,partial,name);checks+=2;return r;}
results.oldMixed=await load({},previous);assert.equal(results.oldMixed.clicks,2);checks++;
await scenario('mixedPatients',{},0,true);
await scenario('ambulanceNextPage',{pages:[[38],[5],[8]]},1,true);
await scenario('missingAmbulance',{pages:[[38],[8],[8]]},2);
await scenario('simpleMedical',{rows:[],pages:[[5],[5],[8]]},0,true);
await scenario('patientIncrease',{increasePatientsAt:1200,pages:[[38,5],[5],[8]]},1,true);
await scenario('patientAlert',{alerts:[{patientRequirementType:'critical-care',stillNeeded:1}]},2);
await scenario('trained',{rows:[{unitName:'Fire engines',stillNeeded:1,personnelTrainingRequirements:['specialist']} ]},2);
await scenario('liveAuthority',{live:true},2);
await scenario('explicitShortage',{explicit:true},2);
await scenario('attended',{onScene:true},2);
await scenario('currentWithPatients',{current:true},2);
await scenario('currentWithoutPatients',{current:true,patients:0},0,true);
await scenario('failedRead',{failedRead:true},2);
await scenario('pendingRules',{rulesPending:true},2);
await scenario('invalidPatients',{patients:NaN},2);
await scenario('alreadySelected',{checked:true},2);
await scenario('vanishingVehicles',{removeAt:1200,pages:[[38,5],[38,5],[8]]},1,true);
await scenario('duplicateVehicleId',{duplicate:true,patients:0,rows:[{unitName:'Fire engines',stillNeeded:2}],pages:[[38],[38],[8]]},1,true);
await scenario('sharedVehicle',{patients:0,rows:[{unitName:'Fire engines',stillNeeded:1},{unitName:'Rescue Pump',stillNeeded:1}],pages:[[38],[38],[8]]},1,true);
await scenario('ruleOverride',{patients:0,override:'16',pages:[[38],[16],[8]]},1,true);
const many=[38,...Array(30).fill(5),19,72];
results.oldLarge=await load({patients:159,limit:30,pages:[many,[8],[8],[8],[8],[8]]},previous);
assert.equal(results.oldLarge.clicks,5);checks++;
await scenario('largeCapped',{patients:159,limit:30,pages:[many,[8],[8],[8],[8],[8]]},0,true);
await scenario('uncappedSupport',{patients:20,limit:2,pages:[[38,5,5],[19],[72],[8]]},2,true);
await scenario('missingMCE',{patients:20,limit:2,pages:[[38,5,5,19],[8],[8]]},2);
await scenario('supportDisabled',{patients:20,limit:2,officer:false,mce:false,pages:[[38,5,5],[8],[8]]},0,true);
await scenario('limitOff',{patients:4,pages:[[38,5,5,19],[5,5],[8]]},1,true);
await scenario('missionChanged',{changeMissionAt:1200},0);
await scenario('manualStop',{stopAt:1200},0);
await scenario('lostOwnership',{unowned:true},0);
const spinner=await scenario('spinner',{spinner:true},1);assert.equal(spinner.result.ready,false);checks++;

// Exercise the real no-repeat claim, supervisor, resume timer and early loop gate.
function handoff(o={},text=source){
  let now=2000,starts=0,expensive=0,timers=0,writes=0;
  const storage=new Map(o.claim===false?[]:[['latch',JSON.stringify({missionId:o.other?'102':'101',claimedAt:1000})]]);
  const c=vm.createContext({console,Date:{now:()=>now},MF_AUTO_DISPATCH_LATCH_KEY:'latch',MF_AUTO_DISPATCH_LATCH_TTL_MS:300000,
    MF_QUEUE_OPENING_MISSION_FLAG:'opening',MF_FINAL_QUEUE_DISPATCH_FLAG:'final',mfAutoLoopResumeTimer:null,
    sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{writes++;storage.set(k,v);},removeItem:k=>{writes++;storage.delete(k);}},
    autoModeRunning:true,autoModeLoopActive:false,isManualAutoStopActive:()=>!!o.manual,
    getCurrentMissionIdForQueueRestart:()=> '101',isCurrentMissionExecutionOwner:()=>!o.unowned,
    readAutoAdvanceAfterDispatchState:()=>null,readAutoPostDispatchUpgradeState:()=>null,
    mfAutoAdvanceResumeActive:false,mfAutoUpgradeResumeActive:false,isMissionPage:()=>true,
    updateStatusBox:()=>{},updateAutoModeButton:()=>{},removeMissionFinderPanelForClosedMission:()=>{},
    requestAutoMissionMemoryRecycle:()=>{expensive++;return true;},
    setTimeout:callback=>{timers++;c.timer=callback;return timers;},
    runAutoModeLoop:()=>{starts++;}
  });c.window=c;
  for(const name of ['hasActiveAutoMissionDispatchClaim','claimAutoMissionDispatch','releaseAutoMissionDispatch'])vm.runInContext(fn(name),c);
  vm.runInContext(fn('nexusEnsureAutoLoopStarted',text),c);vm.runInContext(fn('scheduleAutoModeLoopResume',text),c);
  return {c,storage,counts:()=>({starts,expensive,timers,writes}),clock:n=>now=n};
}
{const h=handoff({},previous);h.c.nexusEnsureAutoLoopStarted();assert.equal(h.counts().starts,1);checks++;}
{const h=handoff();for(let i=0;i<100;i++)h.c.nexusEnsureAutoLoopStarted();assert.equal(h.counts().starts,0);assert.equal(h.counts().writes,0);checks+=2;
 h.c.scheduleAutoModeLoopResume();h.c.timer();assert.equal(h.counts().timers,1);checks++;
 vm.runInContext(fn('runAutoModeLoop'),h.c);await h.c.runAutoModeLoop();assert.equal(h.counts().expensive,0);assert.equal(h.c.__NEXUS_AUTO_LOOP_FAILURE__,null);assert.equal(h.c.autoModeLoopActive,false);checks+=3;
 assert.equal(h.c.claimAutoMissionDispatch('101'),false);assert(h.storage.has('latch'));checks+=2;
 h.clock(301000);assert.equal(h.c.hasActiveAutoMissionDispatchClaim('101'),false);assert(h.storage.has('latch'));checks+=2;
}
for(const o of [{claim:false},{other:true}]){const h=handoff(o);h.c.nexusEnsureAutoLoopStarted();assert.equal(h.counts().starts,1);vm.runInContext(fn('runAutoModeLoop'),h.c);await h.c.runAutoModeLoop();assert.equal(h.counts().expensive,1);checks+=2;}
for(const o of [{manual:true,claim:false},{unowned:true,claim:false}]){const h=handoff(o);h.c.nexusEnsureAutoLoopStarted();assert.equal(h.counts().starts,0);checks++;}
{const h=handoff();h.c.releaseAutoMissionDispatch('101');h.c.nexusEnsureAutoLoopStarted();assert.equal(h.counts().starts,1);assert.equal(h.c.claimAutoMissionDispatch('101'),true);assert.equal(h.c.claimAutoMissionDispatch('101'),false);checks+=3;}
// Dispatch/coverage/fallback/transport paths keep their existing implementation.
for(const name of ['claimAutoMissionDispatch','releaseAutoMissionDispatch','clickMissionDispatchByValue','handleCombinedLogic',
  'confirmPrvSrvSelectionBeforeDispatch','waitForFastDispatchReadiness','nexusHandlePatientMissionTail',
  'triggerAmbulanceClick','selectVehicleUnits','applyConfiguredFreshMissionVehicleRequirements']){
 assert.equal(fn(name),fn(name,previous),name+' unchanged');checks++;
}
const loop=fn('runAutoModeLoop');
assert(loop.indexOf('hasActiveAutoMissionDispatchClaim(autoCycleMissionId)')<loop.indexOf('nexusHandlePatientMissionTail(autoCycleMissionId)'));checks++;
const fallbackStart=loop.indexOf('if (nexusUsedPartialList');
assert(fallbackStart>=0,'partial-list full fallback retained');checks++;
assert.equal(loop.slice(loop.indexOf('let prefetchedAttachmentRowsPromise'))
  .replace('// rows. Ordinary fresh patients include their ambulance/support needs.\n                // Live patient alerts and trained-personnel cases retain the full path.',
    '// rows. Missing-on-mission-only, patient and trained-personnel cases retain\n                // the established complete-list path.'),
  fn('runAutoModeLoop',previous).slice(fn('runAutoModeLoop',previous).indexOf('let prefetchedAttachmentRowsPromise')),
  'Selection, full-list fallback, post-selection update and final dispatch body unchanged');checks++;
const report={version:'3.0.43.223',passed:true,checks,scope:'Deterministic production-function fixtures; simulated clock and fleet, no live game throughput claim',results};
fs.writeFileSync(new URL('./throughput-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,checks,mixedPages:[results.oldMixed.clicks,results.mixedPatients.clicks],largePages:[results.oldLarge.clicks,results.largeCapped.clicks],scope:report.scope}));
