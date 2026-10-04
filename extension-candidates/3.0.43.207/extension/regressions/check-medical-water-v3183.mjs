import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../nexus-runtime.js',import.meta.url),'utf8');
function extract(a,b){return src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));}
let title='Ineffective Breathing',committed=new Set();
const env={getCurrentMissionName:()=>title,getCurrentMissionIdForQueueRestart:()=> '42',mfSyncAmbulanceMissionAllocation:()=>committed,resolveUnitName:n=>n,isAmbulanceTransportRequest:n=>n==='Ambulance',normaliseVehicleText:n=>String(n||'').toLowerCase().trim()};vm.createContext(env);
vm.runInContext(extract('    function isNexusKnownAmbulanceMission(','    function applyConfiguredFreshMissionVehicleRequirements('),env);
for(const name of ['Ineffective Breathing','Slurred Speech','[Event] Slurred Speech']){title=name;assert.equal(env.addNexusKnownAmbulanceRequirement([])[0].stillNeeded,1);}
title='Slurred Speech';assert.equal(env.addNexusKnownAmbulanceRequirement([{unitName:'Ambulance',stillNeeded:3}]).length,1);
committed=new Set(['123']);assert.equal(env.addNexusKnownAmbulanceRequirement([]).length,0);committed=new Set();title='Other Slurred Speech';assert.equal(env.addNexusKnownAmbulanceRequirement([]).length,0);
vm.runInContext(extract('    function nexusWaterCarrierTypes(','    function nexusFleetPreferenceTypes('),env);
for(const name of ['Water Carrier','Water Carriers','Required Water Carriers','Water Carriers x2'])assert.deepEqual(Array.from(env.nexusWaterCarrierTypes(name,'')),['6','26','36','41','50']);
assert.equal(env.nexusWaterCarrierTypes('Water Ladder',''),null);
const match=extract('function getAllMatchingVehicleCheckboxes(','    function getMatchingVehicleCheckboxes(');
assert(match.indexOf('const waterTypes')<match.indexOf('const customRule'),'water group takes precedence over obsolete single-type override');
assert(src.includes("if(waterTypes)return nexusFleetMatches(waterTypes,true,true).filter(input=>input.checked).length"),'selection counting uses same group');
assert(src.includes("processRequirementRows(knownFallback,'known medical mission fallback'"),'zero-requirement recovery processes fallback');
console.log('PASS: named medical missions get one ambulance, existing requirements/dispatches are not duplicated, and singular/plural water carriers share the five-type selection and counting path.');
