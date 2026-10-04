import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../nexus-runtime.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('    function nexusMakeSelectiveProbe('),source.indexOf('    let nexusSelectiveLoadCurrent ='));
async function probe(overrides={}){
 const c={autoModeRunning:true,isManualAutoStopActive:()=>false,getLocalMissionInstanceKey:()=> 'mission:1',isCurrentMissionExecutionOwner:()=>true,
 mfLastMissionRequirementRead:{missionKey:'mission:1',status:'loaded-empty'},findPatientCount:()=>1,readUnitFinderPatientRequirementRows:()=>[],
 parseVisibleMissionRequirementRows:()=>[],findLegacyVehicleRequirementList:()=>null,getMissionRequirementReadFailure:()=>null,
 hasVisibleCurrentMissingOnMissionTable:()=>false,getExplicitCurrentMissingRequirementRows:()=>[],readMissionUpdateRows:()=>[],hasMissionVehiclesOnSceneForTrainedPersonnelAuthority:()=>false,
 collapseSharedFireOperationalSupportRequirements:x=>x,normaliseOperationalRequirementRows:x=>x,applyConfiguredFreshMissionVehicleRequirements:x=>x,
 getVehicleCheckboxSnapshot:()=>[],resolveUnitName:x=>x,getAllMatchingVehicleCheckboxes:()=>[{id:'1',checked:false,disabled:false}],getMissionVehicleId:x=>x.id,...overrides};
 vm.createContext(c);vm.runInContext(code,c);const check=c.nexusMakeSelectiveProbe(Promise.resolve([])); await new Promise(resolve=>setImmediate(resolve)); return await check();
}
assert.equal(await probe(),true,'Known patient-only mission can stop with an ambulance');
assert.equal(await probe({getAllMatchingVehicleCheckboxes:()=>[]}),false,'Missing ambulance loads more');
assert.equal(await probe({findPatientCount:()=>2}),false,'Must cover every patient');
assert.equal(await probe({readUnitFinderPatientRequirementRows:()=>[{patientRequirementType:'helicopter'}]}),false,'Specialist alert retains full load');
assert.equal(await probe({hasMissionVehiclesOnSceneForTrainedPersonnelAuthority:()=>true}),false,'Attended mission retains full load');
assert.equal(await probe({mfLastMissionRequirementRead:{missionKey:'mission:1',status:'missing-source'}}),false,'Unknown definition cannot take shortcut');
assert.equal(await probe({mfLastMissionRequirementRead:{missionKey:'mission:2',status:'loaded-empty'}}),false,'Wrong mission cannot take shortcut');
assert.equal(await probe({applyConfiguredFreshMissionVehicleRequirements:x=>[...x,{unitName:'Ambulance Officer',stillNeeded:1}],getAllMatchingVehicleCheckboxes:n=>n==='Ambulance'?[{id:'1'}]:[]}),false,'Configured support must be present');
assert.equal(await probe({applyConfiguredFreshMissionVehicleRequirements:x=>[...x,{unitName:'Ambulance Officer',stillNeeded:1}],getAllMatchingVehicleCheckboxes:n=>[{id:n}]}),true,'Ambulance plus support covered');
assert.equal(await probe({isManualAutoStopActive:()=>true}),false);
console.log('PASS patient-only adaptive coverage and conservative fallback cases');
