#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `function ${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`function ${name} is unterminated`);
}

for (const token of [
  "const MISSION_FINDER_VERSION = '10.6.178';",
  'const RUN_MISSION_ID_HISTORY_LIMIT = 5000;',
  'const MISSION_TIMING_SAMPLE_LIMIT = 5000;',
  "const V2_SESSION_STATS_KEY = 'mf_session_stats_v1';",
  "const V2_STAFFING_FAILURE_HISTORY_KEY = 'mf_staffing_failure_history_v1';",
]) assert.ok(source.includes(token), `missing endurance contract: ${token}`);
for (const token of [
  'const isTopLevelDocument = window.top === window.self;',
  "sessionStorage.getItem(\n                    'mcn_v3_background_wanted_v1'",
  'isTopLevelDocument &&\n                isBrowserReload &&\n                !nexusRunActive',
]) assert.ok(source.includes(token), `worker reload must preserve endurance telemetry: ${token}`);

const visitState = {
  runMissionIds: [],
  runMissionIdsSeen: new Set(),
  runUniqueMissionCount: 0,
};
const visitContext = vm.createContext({
  state: visitState,
  RUN_MISSION_ID_HISTORY_LIMIT: 3,
  missionIdFromUrl: value => String(value).split('/').pop(),
  updateCurrentMissionName() {},
  getWorkerDocument: () => null,
  render() {},
});
vm.runInContext(
  `${extractFunction('recordMissionVisit')}\nthis.recordMissionVisit = recordMissionVisit;`,
  visitContext
);
for (const id of ['1', '2', '3', '4', '4']) {
  visitContext.recordMissionVisit(`/missions/${id}`);
}
assert.equal(visitState.runUniqueMissionCount, 4, 'revisiting a retained mission must not inflate the count');
assert.deepEqual(visitState.runMissionIds, ['2', '3', '4'], 'mission ID retention must be bounded independently of the true counter');

const timingState = {
  missionDispatchTimingCount: 0,
  missionDispatchTimingTotalMs: 0,
  missionDispatchTimingSamplesMs: [],
  missionCycleTimingTotalMs: 0,
  missionCycleTimingSamplesMs: [],
};
const timingContext = vm.createContext({
  state: timingState,
  MISSION_TIMING_SAMPLE_LIMIT: 5000,
  Number,
  Math,
});
vm.runInContext(
  `${extractFunction('appendMissionTimingSample')}\n` +
    `${extractFunction('recordMissionTimingAggregate')}\n` +
    'this.recordMissionTimingAggregate = recordMissionTimingAggregate;',
  timingContext
);
timingContext.recordMissionTimingAggregate({
  loadedAtMs: 1000,
  totalMs: 7000,
  milestones: { finalDispatch: { atMs: 6000 } },
});
assert.equal(timingState.missionDispatchTimingCount, 1);
assert.equal(timingState.missionDispatchTimingTotalMs, 5000);
assert.equal(timingState.missionCycleTimingTotalMs, 7000);
assert.deepEqual(timingState.missionDispatchTimingSamplesMs, [5000]);

const valueContext = vm.createContext({
  sessionStorage: {},
  V2_SESSION_STATS_KEY: 'stats',
  Number,
  Math,
  Date,
  readJsonStorage: () => ({
    startedAt: 1000,
    completed: 120,
    skipped: 4,
    updates: 3,
    credits: 240000,
    entries: [],
  }),
});
vm.runInContext(
  `${extractFunction('missionFinderRunValueSnapshot')}\nthis.snapshot = missionFinderRunValueSnapshot(3600);`,
  valueContext
);
assert.equal(valueContext.snapshot.completedDispatches, 120);
assert.equal(valueContext.snapshot.estimatedValuePerHour, 240000);
assert.equal(valueContext.snapshot.averageEstimatedValuePerDispatch, 2000);
assert.match(valueContext.snapshot.source, /estimated mission value, not settled bank income/i);

const staffingContext = vm.createContext({
  sessionStorage: {},
  V2_STAFFING_FAILURE_HISTORY_KEY: 'staffing',
  V2_STAFFING_QUARANTINE_KEY: 'staffing-quarantine',
  Map,
  Set,
  String,
  readJsonStorage: () => [
    {
      eventType: 'dispatch-block',
      selectedVehicles: [{ vehicleId: '1001', vehicleName: 'A1', stationName: 'Station A' }],
      knownEmptyAmbulanceExclusions: [],
    },
    {
      eventType: 'preflight-exclusion',
      selectedVehicles: [],
      knownEmptyAmbulanceExclusions: [{ vehicleId: '2002', vehicleName: 'A2', stationName: 'Station B' }],
    },
  ],
});
vm.runInContext(
  `${extractFunction('staffingFailureDiagnosticsSnapshot')}\nthis.staffing = staffingFailureDiagnosticsSnapshot();`,
  staffingContext
);
assert.equal(staffingContext.staffing.currentRunFailureCount, 1);
assert.equal(staffingContext.staffing.preflightExclusionEventCount, 1);
assert.equal(staffingContext.staffing.stationSummary[0].stationName, 'Station B');
assert.equal(staffingContext.staffing.stationSummary[0].confirmedEmptyOccurrences, 1);

const filterFunction = extractFunction('filterKnownUnstaffedAmbulanceCandidates');
const now = Date.now();
const makeInput = (id, evidence) => ({
  id,
  evidence,
  getAttribute: name => name === 'vehicle_type_id' ? '5' : '',
  closest: () => ({ innerText: id, getAttribute: () => '5' }),
});
const recentEmpty = makeInput('recent-empty', {
  vehicleId: '3003', stationName: 'Station Empty', assignedPersonnelCount: 0,
  assignmentScanComplete: true, updatedAt: now - 1000,
});
const incompleteEmpty = makeInput('unknown-empty', {
  vehicleId: '4004', assignedPersonnelCount: 0,
  assignmentScanComplete: false, updatedAt: now - 1000,
});
const staffed = makeInput('staffed', {
  vehicleId: '5005', assignedPersonnelCount: 1,
  assignmentScanComplete: true, updatedAt: now - 1000,
});
const staleEmpty = makeInput('stale-empty', {
  vehicleId: '6006', assignedPersonnelCount: 0,
  assignmentScanComplete: true, updatedAt: now - 2 * 24 * 60 * 60 * 1000,
});
let recordedEventType = '';
const filterContext = vm.createContext({
  mfKnownUnstaffedAmbulanceExclusions: [],
  MF_KNOWN_UNSTAFFED_AMBULANCE_MAX_AGE_MS: 24 * 60 * 60 * 1000,
  readPersonnelTrainingRegistry: () => ({}),
  mfGetDiagnosticRegistryEvidence: input => input.evidence,
  getMissionVehicleId: input => input.evidence.vehicleId,
  getVehicleDebugName: input => input.id,
  mfPersistUnitFinderDiagnostic: () => ({ selectionSummary: { selectedVehicles: [] } }),
  mfRecordStaffingFailure(_reason, _text, _snapshot, eventType) {
    recordedEventType = eventType;
  },
  Date,
  Number,
  String,
  Map,
  Array,
});
vm.runInContext(`${filterFunction}\nthis.filter = filterKnownUnstaffedAmbulanceCandidates;`, filterContext);
const eligible = filterContext.filter(
  [recentEmpty, incompleteEmpty, staffed, staleEmpty],
  'test'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(eligible.map(input => input.id))),
  ['unknown-empty', 'staffed', 'stale-empty'],
  'only a recent, complete, exact zero-personnel register entry may be excluded'
);
assert.equal(recordedEventType, 'preflight-exclusion');

const registryEvidence = extractFunction('mfGetDiagnosticRegistryEvidence');
for (const token of ['stationName', 'stationHref', 'registryMatch?.matchMode']) {
  assert.ok(registryEvidence.includes(token), `station evidence is missing ${token}`);
}
const staffingLatch = extractFunction('detectAndLatchStaffingBlock');
for (const token of [
  "mfPersistUnitFinderDiagnostic(\n                'staffing-block'",
  'mfRecordStaffingFailure(',
  "'dispatch-block'",
]) assert.ok(staffingLatch.includes(token), `staffing latch is missing ${token}`);

const reset = extractFunction('resetRunStats');
assert.ok(reset.includes('resetMissionFinderRunTelemetry('), 'a new 12-hour run must reset its exact telemetry once');
const diagnostics = extractFunction('diagnosticsSnapshot');
for (const token of ['successfulDispatchCount', 'missionTimingSummary', 'staffingFailures', 'missionIdHistoryLimit']) {
  assert.ok(diagnostics.includes(token), `diagnostics are missing ${token}`);
}

console.log('PASS: 12-hour mission counts, value/rate telemetry, timing samples and station-aware staffing safeguards are bounded and exact.');
