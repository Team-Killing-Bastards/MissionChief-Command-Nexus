import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root='extension';
const source=fs.readFileSync(`${root}/nexus-runtime.js`,'utf8');
const extract=(name,text=source)=>{const m=new RegExp('^ {0,4}(?:async )?function '+name+'\\(','m').exec(text);assert.ok(m,name);const tail=text.slice(m.index+m[0].length),end=/\n {0,4}(?:async )?function /.exec(tail);assert.ok(end,name);return text.slice(m.index,m.index+m[0].length+end.index);};
new vm.Script(source);
async function scenario(options={}) {
 let now=1000,index=0,clicks=0,stopped=false;
 const pages=options.pages||[[38],[16],[17]], rows=options.rows||[{unitName:'Fire engines',stillNeeded:1}];
 const vehicles=pages.map((types,p)=>types.map((type,n)=>({id:`p${p}v${n}`,type:String(type),checked:false,disabled:false,
  closest:()=>({getAttribute:()=>String(10+n)})})));
 if(options.duplicates)vehicles[0].push({...vehicles[0][0]});
 const controls=pages.slice(0,-1).map((_,p)=>({token:String(p),isConnected:true,click(){clicks++;this.isConnected=false;index++;}}));
 const snapshot=()=>vehicles.slice(0,index+1).flat();
 const mission=()=>now >= (options.missionChangeAt||Infinity)?'other':'mission';
 const c={console,Date:class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}},
  autoModeRunning:true,MF_VEHICLE_NEXT_PAGE_SETTLE_MS:1200,mfDebugEnabled:false,
  isManualAutoStopActive:()=>stopped,isCurrentMissionExecutionOwner:()=>!options.unowned,
  getLocalMissionInstanceKey:mission,getMissionRequirementReadFailure:()=>null,
  findPatientCount:()=>options.patients||0,readUnitFinderPatientRequirementRows:()=>[],
  hasVisibleCurrentMissingOnMissionTable:()=>!!options.liveShortages,
  getExplicitCurrentMissingRequirementRows:()=>[],readMissionUpdateRows:()=>[],
  hasMissionVehiclesOnSceneForTrainedPersonnelAuthority:()=>false,
  applyConfiguredFreshMissionVehicleRequirements:r=>options.configuredRows?[...r,...options.configuredRows]:r,
  collapseSharedFireOperationalSupportRequirements:r=>r,normaliseOperationalRequirementRows:r=>r,
  getVehicleCheckboxSnapshot:snapshot,getVehicleTypeIdentifiers:v=>[v.type],getMissionVehicleId:v=>v.id,resolveUnitName:n=>n,
  normaliseVehicleText:v=>String(v||'').trim().toLowerCase(),isFireEngineRequirement:n=>n==='Fire engines',
  sortVehicleCheckboxesByBestArrival:a=>a,mfApplyStoredStaffingQuarantine:()=>{},
  getVisibleVehicleListLoadControl:()=>controls[index]||null,
  isVehicleListLoadControlVisible:()=>!!controls[index],
  getVehicleCheckboxListSignature:()=>({boxes:snapshot(),signature:snapshot().map(v=>v.id).join(',')}),
  invalidateVehicleCheckboxCache:()=>{},invalidateVehicleListStructureCache:()=>{},
  isVehicleListLoadingIndicatorVisible:()=>options.spinner===true || now<(options.loadingUntil||0),
  getVehicleListLoadControlToken:v=>v?.token||'',realClickForQueueRestart:()=>false,
  updateStatusBox:()=>{},debugLog:()=>{},
  wait:async ms=>{now+=ms;if(options.stopAt&&now>=options.stopAt)stopped=true;if(options.removeAt&&now>=options.removeAt)vehicles[0].forEach(v=>v.disabled=true);},
  __NEXUS_RULES__:{isReady:()=>true,lookup:()=>options.override?{vehicleTypeId:options.override}:null},
 };
 c.window={top:c};vm.createContext(c);c.JSON=vm.runInContext('JSON',c);
 vm.runInContext(['nexusFleetPreferenceTypes','nexusFleetMatches'].map(n=>extract(n)).join('\n'),c);
 c.getAllMatchingVehicleCheckboxes=(name,mapped,checked)=>{
  const types=options.override?[options.override]:c.nexusFleetPreferenceTypes(name,mapped)||(/Police Car/i.test(name)?['8']:/Fire Officer/i.test(name)?['3']:/Ambulance/i.test(name)?['5']:['6']);
  return c.nexusFleetMatches(types,checked,false);
 };
 vm.runInContext(['nexusMakeSelectiveProbe','nexusRecordSelectiveLoad','nexusRecordSelectiveDispatch','waitForVehicleCheckboxListStable','waitForVehicleNextPageReady','ensureVehicleListLoaded'].map(n=>extract(n)).join('\n'),c);
 c.fixtureRows=rows;
 const probe=vm.runInContext('nexusMakeSelectiveProbe(Promise.resolve(fixtureRows))',c);
 const result=await c.ensureVehicleListLoaded({canStopEarly:options.full?null:probe,requireNonZero:true,pageProgressTimeoutMs:3000});
 if(result.ready&&result.partial)c.nexusRecordSelectiveDispatch(true);
 return {result:JSON.parse(JSON.stringify(result)),clicks,elapsed:now-1000,stats:JSON.parse(JSON.stringify(c.__NEXUS_SELECTIVE_LOADING__))};
}
const results={};
results.police=await scenario({pages:[[8,8],[8],[8]],rows:[{unitName:'Police cars',stillNeeded:2}]});assert.equal(results.police.clicks,0);assert.equal(results.police.result.partial,true);
assert.equal(results.police.stats.recent[0].probeReason,'loaded vehicles cover requirements');
results.policeNext=await scenario({pages:[[8],[8],[8]],rows:[{unitName:'Police cars',stillNeeded:2}]});assert.equal(results.policeNext.clicks,1);
results.policeShort=await scenario({pages:[[8],[3]],rows:[{unitName:'Police cars',stillNeeded:2}]});assert.equal(results.policeShort.clicks,1);assert.ok(!results.policeShort.result.partial);
results.policeTrained=await scenario({pages:[[8],[8]],rows:[{unitName:'Police cars',stillNeeded:1,personnelTrainingRequirements:['public order']}]});assert.equal(results.policeTrained.clicks,1);
results.policeOverride=await scenario({pages:[[8],[25]],override:'25',rows:[{unitName:'Police cars',stillNeeded:1}]});assert.equal(results.policeOverride.clicks,1);
results.policeMixed=await scenario({pages:[[8,38],[8]],rows:[{unitName:'Police cars',stillNeeded:1},{unitName:'Fire engines',stillNeeded:1}]});assert.equal(results.policeMixed.clicks,0);

results.first=await scenario();assert.equal(results.first.clicks,0);assert.equal(results.first.result.partial,true);assert.equal(results.first.stats.dispatchClicksWithoutFullList,1);
results.next=await scenario({pages:[[16],[38],[38]]});assert.equal(results.next.clicks,1);assert.equal(results.next.result.partial,true);
results.full=await scenario({pages:[[16],[37],[0]]});assert.equal(results.full.clicks,2);assert.equal(results.full.result.ready,true);assert.ok(!results.full.result.partial);
results.height=await scenario({pages:[[2],[17],[2]],rows:[{unitName:'Aerial Appliance',stillNeeded:1}]});assert.equal(results.height.clicks,1);assert.equal(results.height.result.partial,true);
results.heightFallback=await scenario({pages:[[2],[2]],rows:[{unitName:'Aerial Appliance',stillNeeded:1}]});assert.equal(results.heightFallback.clicks,1);assert.ok(!results.heightFallback.result.partial);
results.training=await scenario({rows:[{unitName:'HazMat',stillNeeded:1,isTrainedPersonnelRequirement:true}]});assert.equal(results.training.clicks,2);
results.unknown=await scenario({rows:[{unitName:'Special Equipment',stillNeeded:1}]});assert.equal(results.unknown.clicks,2);
results.patients=await scenario({patients:1});assert.equal(results.patients.clicks,2);
results.shortages=await scenario({liveShortages:true});assert.equal(results.shortages.clicks,2);
results.shared=await scenario({pages:[[38],[38],[16]],rows:[{unitName:'Fire engines',stillNeeded:1},{unitName:'Rescue Pump',stillNeeded:1}]});assert.equal(results.shared.clicks,1);
results.override=await scenario({pages:[[16],[38]],override:'16'});assert.equal(results.override.clicks,0);
results.configured=await scenario({configuredRows:[{unitName:'Ambulance',stillNeeded:1}]});assert.equal(results.configured.clicks,2);
results.lost=await scenario({removeAt:1200,pages:[[38],[38],[16]]});assert.equal(results.lost.clicks,1);assert.equal(results.lost.result.partial,true);
results.mission=await scenario({missionChangeAt:1200});assert.equal(results.mission.clicks,0);assert.equal(results.mission.result.ready,false);
results.stop=await scenario({stopAt:1200});assert.equal(results.stop.clicks,0);assert.equal(results.stop.result.ready,false);
results.loading=await scenario({loadingUntil:1500});assert.ok(results.loading.elapsed>=500);assert.equal(results.loading.result.ready,true);
results.spinner=await scenario({spinner:true});assert.equal(results.spinner.result.ready,false);assert.equal(results.spinner.stats.failedLoads,1);
results.baseline=await scenario({full:true});assert.equal(results.baseline.clicks,2);
results.duplicates=await scenario({duplicates:true,pages:[[38],[38],[16]],rows:[{unitName:'Fire engines',stillNeeded:2}]});assert.equal(results.duplicates.clicks,1);
results.empty=await scenario({rows:[]});assert.equal(results.empty.clicks,2);
results.invalid=await scenario({rows:[{unitName:'Fire engines',stillNeeded:'unknown'}]});assert.equal(results.invalid.clicks,2);
async function fastReady(partial,spinner=false){
 let now=1000;
 const c={Date:{now:()=>now},isManualAutoStopActive:()=>false,autoModeRunning:true,
  detectAndLatchStaffingBlock:()=>false,getDispatchReadinessSignature:()=> 'stable',
  isLoadingBarVisible:()=>true,nexusSelectiveLoadCurrent:partial?{partial:true,mission:'mission'}:null,
  getLocalMissionInstanceKey:()=> 'mission',isVehicleListLoadingIndicatorVisible:()=>spinner,
  mfDebugEnabled:false,wait:async ms=>{now+=ms;}};
 vm.createContext(c);vm.runInContext(extract('waitForFastDispatchReadiness'),c);
 await c.waitForFastDispatchReadiness('test',{minimumWait:150,stableFor:300,timeout:1200});return now-1000;
}
assert.equal(await fastReady(true),300);assert.equal(await fastReady(false),1200);assert.equal(await fastReady(true,true),1200);
results.readiness={partial:300,unverified:1200,spinner:1200};
assert.ok(source.includes('selectiveVehicleLoading: globalThis.__NEXUS_SELECTIVE_LOADING__ || null'));
assert.ok(source.includes("clearSelectionGuards();\n                        await withTimeout(handleCombinedLogic"));
const report={passed:true,realGame:false,root,results};fs.writeFileSync(`audit/selective-load-72-verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,scenarios:Object.keys(results).length,first:results.first.elapsed,full:results.baseline.elapsed,localOnly:true}));
