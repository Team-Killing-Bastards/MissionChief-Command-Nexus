import test from 'node:test';
import assert from 'node:assert/strict';
import {functions} from './helpers.mjs';
function fixture() {
 const state={wanted:true,stopping:false,currentMissionId:'260178368',currentMissionName:'Unknown Tanker Spill',workerDocumentSerial:62,activeMissionTiming:{missionId:'260178368',milestones:{}}};
 const c=functions(['noteMissionTimingStatus','armPostDispatchWatchdog'],{state,Date,normaliseText:s=>String(s).trim(),cleanMissionCaption:s=>s,missionNameForId:()=>'',log(){},POST_DISPATCH_SOFT_RECOVERY_MS:5000,POST_DISPATCH_HARD_RECOVERY_MS:16000,startMissionTiming(){throw Error('Unexpected timing reset');}});
 return {state,c};
}
const status='Auto Mode: duplicate Dispatch blocked for this mission. Waiting for MissionChief to finish the existing handoff...';
test('overnight replay arms recovery on duplicate claim without inventing a dispatch',()=>{
 const {state,c}=fixture();c.noteMissionTimingStatus(status);
 assert.equal(state.postDispatchWatchdog.missionId,'260178368');assert.equal(state.postDispatchWatchdog.documentSerial,62);
 assert.equal(state.postDispatchWatchdog.source,'duplicate-dispatch-guard');
 assert.equal(state.activeMissionTiming.milestones.dispatchNext,undefined);
 assert.equal(state.activeMissionTiming.milestones.finalDispatch,undefined);
 const first=state.postDispatchWatchdog;first.startedAt=123;
 c.noteMissionTimingStatus(status);assert.equal(state.postDispatchWatchdog,first);assert.equal(first.startedAt,123);
});
test('ordinary running text does not arm recovery; stopped controller is respected',()=>{
 const {state,c}=fixture();c.noteMissionTimingStatus('Units ready for dispatch.');assert.equal(state.postDispatchWatchdog,undefined);
 state.wanted=false;c.noteMissionTimingStatus(status);assert.equal(state.postDispatchWatchdog,undefined);
});
