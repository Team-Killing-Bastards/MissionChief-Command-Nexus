import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {functions} from './helpers.mjs';
function fixture() {
 const store={};let heap=1200*1048576;
 const state={runStartedAt:'test-run',nativeMissionAdvances:10,runtimeRecycles:2};
 const c=vm.createContext({Date,Number,JSON,state,controllerUsedHeapBytes:()=>heap,sessionGet:k=>store[k]||'',SESSION_CONTINUITY:'continuity',SESSION_RESUME_MISSION:'resume',persistResumeMission:u=>store.resume=u,saveRunContinuity:()=>store.continuity=JSON.stringify(state)});
 vm.runInContext(fs.readFileSync('scripts/runtime/memory-recovery.js','utf8'),c);
 return {c,store,state,setHeap:v=>heap=v,probe:()=>vm.runInContext('nexusMemoryRecycleProbe = {at:1000000};',c)};
}
test('high heap requires a previous recycle, sustained time and refresh cooldown',()=>{
 const h=fixture();assert.equal(h.c.nexusPersistentHeapRecoveryDue(1100000),false);h.probe();
 assert.equal(h.c.nexusPersistentHeapRecoveryDue(1059999),false);
 assert.equal(h.c.nexusPersistentHeapRecoveryDue(1060000),true);
 h.store.nexus_memory_refresh_at_v1='1050000';assert.equal(h.c.nexusPersistentHeapRecoveryDue(1100000),false);
 assert.equal(h.c.nexusMemoryRefreshAllowed(1100000),false);assert.equal(h.c.nexusMemoryRefreshAllowed(1650000),true);
});
test('memory reduction or unavailable measurement clears escalation evidence',()=>{
 const h=fixture();h.probe();h.setHeap(500*1048576);assert.equal(h.c.nexusPersistentHeapRecoveryDue(1100000),false);
 h.setHeap(1300*1048576);assert.equal(h.c.nexusPersistentHeapRecoveryDue(1200000),false);
});
test('refresh requires matching saved next mission and current run counters',()=>{
 const h=fixture();assert.equal(h.c.nexusSaveVerifiedResume('https://game/missions/2'),true);
 h.c.saveRunContinuity=()=>{};h.state.runtimeRecycles++;assert.equal(h.c.nexusSaveVerifiedResume('https://game/missions/2'),false);
 h.store.continuity='invalid';assert.equal(h.c.nexusSaveVerifiedResume('https://game/missions/2'),false);
});
function boundary() {
 const callbacks=[],calls=[];
 const state={wanted:true,stopping:false,runtimeRecycles:2,nativeMissionAdvances:8,runtimeRecycleHistory:[],runStartedAt:'run'};
 const store={};
 const c=functions(['recycleControllerRuntimeAtMissionBoundary'],{state,Date,window:{setTimeout:fn=>callbacks.push(fn),location:{reload:()=>calls.push('reload')}},
 shouldRecycleControllerRuntimeAtBoundary:()=>({reason:'test',advancesSince:8,ageMs:60000}),sameOriginUrl:u=>new URL(u),isMissionUrl:()=>true,canonicalMissionPageId:u=>new URL(u).pathname.match(/^\/missions\/(\d+)$/)?.[1]||'',
 nowIso:()=>new Date().toISOString(),missionNameForId:()=>'',nexusPersistentHeapRecoveryDue:()=>true,nexusMemoryRefreshAllowed:()=>true,controllerUsedHeapBytes:()=>1300*1048576,
 CONTROLLER_FULL_PAGE_RECYCLE_EVERY_RUNTIME_CYCLES:3,CONTROLLER_RUNTIME_RECYCLE_HISTORY_LIMIT:40,CONTROLLER_RECYCLE_RESTART_DELAY_MS:80,
 persistResumeMission(){},pausePipelineController(){},clearSharedV2QueueGuard(){},clearSharedV2AutoRunning(){},resetAutoStartTracking(){},clearPromotedWorkTracking(){},finaliseActiveMissionTiming(){},removeWorker:()=>calls.push('remove-worker'),compactControllerEphemeralMemory(){},saveRunContinuity(){},setPhase(){},missionDisplay:()=>'',log(){},nexusSaveVerifiedResume:()=>true,sessionGet:k=>store[k]||'',sessionSet:(k,v)=>store[k]=v,createWorker:()=>calls.push('create-worker')},'let nexusMemoryRecycleProbe = null;');
 return {c,state,callbacks,calls};
}
test('confirmed boundary disposes workers before refresh and rechecks user stop',()=>{
 const h=boundary();assert.equal(h.c.recycleControllerRuntimeAtMissionBoundary('2','https://game/missions/2'),true);
 assert.deepEqual(h.calls,['remove-worker']);h.state.wanted=false;h.callbacks[0]();assert.deepEqual(h.calls,['remove-worker']);
 const next=boundary();next.c.recycleControllerRuntimeAtMissionBoundary('2','https://game/missions/2');next.callbacks[0]();assert.deepEqual(next.calls,['remove-worker','reload']);
});
test('unverified persistence falls back to a worker; submission URLs cannot trigger refresh',()=>{
 const h=boundary();h.c.nexusSaveVerifiedResume=()=>false;h.c.recycleControllerRuntimeAtMissionBoundary('2','https://game/missions/2');h.callbacks[0]();assert.deepEqual(h.calls,['remove-worker','create-worker']);
 const bad=boundary();assert.equal(bad.c.recycleControllerRuntimeAtMissionBoundary('2','https://game/missions/2/alarm'),false);assert.deepEqual(bad.calls,[]);
});
