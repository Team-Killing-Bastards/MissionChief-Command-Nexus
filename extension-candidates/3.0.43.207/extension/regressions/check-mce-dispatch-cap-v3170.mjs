import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../nexus-runtime.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const old=fs.readFileSync(new URL('../../build-169/nexus-runtime.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const extract=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
let rows=[{unitName:'Ambulance',stillNeeded:21},{unitName:'Mass Casualty Equipment',stillNeeded:1}];
let selected={'Ambulance':0,'Mass Casualty Equipment':1},committed=30,limit=30,cap=true;
const alert={innerText:'28x We need: Mass Casualty Equipment 21x We need: Mass Casualty Equipment, Ambulance'};
function context(s){
 const c=vm.createContext({readMissionUpdateRows:()=>rows, resolveUnitName:n=>n,
  countSelectedMatchingVehicles:n=>selected[n]||0, areTrainedPersonnelRequirementsSatisfied:()=>false,
  mfRecordUncappedAmbulanceDemand:()=>{},mfGetAmbulanceMissionLimitState:n=>n==='Ambulance'&&cap?{remainingSlots:Math.max(0,limit-committed-(selected.Ambulance||0))}:null,
  getCurrentMissionAlertScopes:()=>[{querySelectorAll:()=>[alert]}],isElementVisible:()=>true,hasSupportedMissingPersonnelUpdate:()=>false});
 vm.runInContext(extract(s,'    function mfApplyAmbulanceMissionLimitToEffectiveRequired(', '    function mfApplyAmbulanceMissionLimitToSelectionAmount('),c);
 vm.runInContext(extract(s,'    function areCurrentMissionUpdateRowsFullySelected()', '    function normaliseVisibleRequirementName('),c);
 return c;
}
const before=context(old),after=context(source);
assert.equal(before.areCurrentMissionUpdateRowsFullySelected(),false,'reproduce .169 rejecting MCE with 30 ambulances committed');
assert.ok(before.getVisibleInlineProblemAlertText(),'old final gate blocks the selected MCE');
assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),true);
assert.equal(after.getVisibleInlineProblemAlertText(),'','capped ambulance shortage no longer vetoes selected MCE');
selected['Mass Casualty Equipment']=0;assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),false,'missing MCE must still block');
selected['Mass Casualty Equipment']=1;committed=29;
assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),false,'remaining ambulance slot must be filled');
selected.Ambulance=1;assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),true);
cap=false;assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),false,'cap disabled requires all 21');
selected.Ambulance=21;assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),true);
rows.push({unitName:'Fire Engine',stillNeeded:1});assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),false,'other shortages remain blocking');
rows=[{isTrainedPersonnelRequirement:true,personnelTrainingRequirements:[]}];assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),false,'training guard preserved');
rows=[];assert.equal(after.areCurrentMissionUpdateRowsFullySelected(),false,'no authority must not count as covered');

// Exercise the real patient-only exit branch: configured support must run and
// its failure must propagate instead of marking dispatch ready unconditionally.
const branch=extract(source,'        if (\n            patientCount > 0 ||\n            patientRequirementResult.found','        const recovered = await recoverLateMissionRequirements(patientCount);');
assert.ok(branch.includes('fresh patient-only support thresholds'));
let calls=[],ready=[],supportResult=true;
const c=vm.createContext({patientCount:49,patientRequirementResult:{found:false,satisfied:true},
 ambulanceOfficerThresholdAdditionalRows:[{unitName:'Ambulance',stillNeeded:49}],
 processRequirementRows:async (r,label,opts)=>{calls.push({r,label,opts});return supportResult;},
 updateStatusBox:()=>{},changeDispatchBoxColor:v=>ready.push(v)});
vm.runInContext('async function run(){'+branch+'}',c);
assert.equal(await c.run(),true);assert.equal(calls.length,1);
assert.equal(calls[0].opts.includeConfiguredHighRiskMissingPersonAmbulance,true);
assert.equal(calls[0].opts.ambulanceOfficerThresholdAdditionalRows[0].stillNeeded,49);
supportResult=false;assert.equal(await c.run(),false);assert.equal(ready.at(-1),false);
console.log('PASS: reproduced .169 MCE dispatch veto; capped/uncapped ambulance targets, missing MCE, other resources and training guards; patient-only support success/failure.');
