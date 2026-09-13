import test from 'node:test';
import assert from 'node:assert/strict';
import {functions} from './helpers.mjs';
import fs from 'node:fs';
import {controllerProtectedDigest} from '../scripts/auto-focus-integrity.mjs';

test('executable code outside UI and skip records matches reviewed cumulative .82 source',()=>{
  const baseline=JSON.parse(fs.readFileSync('reference/auto-focus-protected-82.json'));
  assert.equal(controllerProtectedDigest(fs.readFileSync('extension/nexus-runtime.js','utf8')),baseline.protectedRuntimeSha256);
});

test('temporary skip details retain confirmed vehicle and personnel shortages without inventing counts',()=>{
  const c=functions(['missionSkipIssueDetails']);
  const details=record=>Array.from(c.missionSkipIssueDetails(record));
  assert.deepEqual(details({evidence:'Auto stopped: Required mission resource is unavailable. Confirmed requirements still missing: HazMat Unit x1, Fire engines x2. No vehicles were dispatched.'}),['HazMat Unit x1, Fire engines x2']);
  assert.deepEqual(details({evidence:'Auto stopped: Confirmed PRV/SRV units still missing: Primary Response Vehicles x2. Dispatch was not clicked.'}),['Primary Response Vehicles x2']);
  assert.deepEqual(details({evidence:'Auto-OK alert: It lacks: 1 Water Carrier | Missing Vehicles: 2 Fire Officers'}),['1 Water Carrier','2 Fire Officers']);
  assert.deepEqual(details({evidence:'Auto stopped: OSU: 5 trained personnel short. Dispatch was not clicked.'}),['OSU: 5 trained personnel short.']);
  assert.deepEqual(details({evidence:'Auto stopped: Unit Finder selected 0 vehicles after a full-list retry. The mission was not dispatched.'}),[]);
  assert.deepEqual(details({reason:'Post-dispatch transition stalled'}),[]);
});

test('skip record captures specific issues before truncation and preserves advance-based expiry',()=>{
  const state={nativeMissionAdvances:12,missionSkipRecords:new Map(),recoverableMissionSkips:0};
  const c=functions(['registerRecoverableMissionSkip','missionSkipIssueDetails','activeMissionSkipRecords'],{state,RECOVERABLE_SHORTAGE_SKIP_ADVANCES:5,MISSION_SKIP_HISTORY_LIMIT:80,cleanMissionCaption:s=>s,missionNameForId:()=>'',normaliseText:s=>String(s).replace(/\s+/g,' '),nowIso:()=>new Date(0).toISOString(),trimOldestMapEntries(){},recordMissionSkipEvent(){}});
  const record=c.registerRecoverableMissionSkip('81','Chemical spill','Resource shortage','Diagnostic '.repeat(50)+' | Confirmed requirements still missing: HazMat Unit x1. No vehicles were dispatched.');
  assert.equal(record.evidence.length,420);
  assert.deepEqual(Array.from(record.issues),['HazMat Unit x1']);
  assert.equal(record.retryAfterAdvance,17);
  assert.equal(c.activeMissionSkipRecords()[0].remaining,5);
  state.nativeMissionAdvances=16;assert.equal(c.activeMissionSkipRecords()[0].remaining,1);
  state.nativeMissionAdvances=17;assert.equal(c.activeMissionSkipRecords().length,0);
  assert.equal(state.recoverableMissionSkips,1);
});

test('restored issue text is bounded and unknown legacy records stay unknown',()=>{
  const c=functions(['missionSkipIssueDetails']);
  assert.equal(c.missionSkipIssueDetails({issues:Array.from({length:100},(_,i)=>i+' '+ 'x'.repeat(500))}).length,8);
  assert.equal(c.missionSkipIssueDetails({issues:['x'.repeat(500)]})[0].length,240);
  assert.deepEqual(Array.from(c.missionSkipIssueDetails({issues:[{},null,'A','A']})),['A']);
  assert.deepEqual(Array.from(c.missionSkipIssueDetails(null)),[]);
});
