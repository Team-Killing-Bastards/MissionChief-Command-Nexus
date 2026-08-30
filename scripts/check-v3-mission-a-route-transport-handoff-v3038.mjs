#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const guard = extractFunction('maybeHandoffMissionATransportRoute');
for (const token of [
  "state.workerRole !== 'MISSION_A'",
  'vehicleIdFromUrl(href)',
  'transport?.kind',
  'refreshRadioTransportRequests(true)',
  'radioRequestForVehicle(',
  'redirectWorkerToTransportService(',
  "event: 'mission-a-route-detected'",
  "event: 'mission-a-route-rejected'",
  'removeWorker(false)',
  "startTransportOnlyWorker(lateRequest, 'mission-a-route-late-radio')",
]) {
  assert.ok(guard.includes(token), `route handoff guard is missing ${token}`);
}
assert.doesNotMatch(guard, /Dispatch|Unit Finder|handleTransportRequestsAfterDispatch/,
  'mission A route recovery must never perform transport or mission clicks itself');

const refresh = extractFunction('refreshRadioTransportRequests');
assert.match(refresh, /function refreshRadioTransportRequests\(force = false\)/);
assert.match(refresh, /if \(!force && state\.radioScanAt/,
  'normal Radio scans remain throttled while the ownership handoff can force exact evidence');

const load = extractFunction('onWorkerLoad');
const loadGuard = load.indexOf('maybeHandoffMissionATransportRoute(');
assert.ok(loadGuard >= 0 && loadGuard < load.indexOf("state.workerRole === 'TRANSPORT_B'"));
assert.ok(loadGuard < load.indexOf('if (!isMissionUrl(href))'),
  'load handling must convert A before generic non-mission handling');

const watch = extractFunction('watchWorker');
const watchGuard = watch.indexOf('maybeHandoffMissionATransportRoute(');
assert.ok(watchGuard >= 0 && watchGuard < watch.indexOf('maybeRecoverStalledNonMissionRedirect('));
assert.ok(watchGuard < watch.indexOf('beginTransportEvent('));
assert.ok(watchGuard < watch.indexOf('maybeAssistPatientTransport('),
  'watcher must transfer ownership before any transport observer or fallback can run');

const redirect = extractFunction('redirectWorkerToTransportService');
assert.ok(redirect.indexOf('removeWorker(false)') < redirect.indexOf('startTransportOnlyWorker('),
  'A must be destroyed before exact B creation');

let now = 10000;
let forcedScans = 0;
let redirects = 0;
let removals = 0;
let phases = [];
let callback = null;
let createdMission = '';
const request = {
  key: '4971825:259495582',
  vehicleId: '4971825',
  missionId: '259495582',
};
const state = {
  workerRole: 'MISSION_A',
  transportServiceActive: false,
  wanted: true,
  stopping: false,
  worker: { isConnected: true },
  currentMissionId: '259495582',
  lastWorkerNavigationAt: 9500,
  workerGeneration: 4,
  phase: 'ACTIVE',
  running: true,
  transportServiceEligible: false,
};
let scanResult = [request];
const context = vm.createContext({
  state,
  Date: { now: () => now },
  Math,
  String,
  Array,
  window: {
    setTimeout(fn) { callback = fn; return 1; },
  },
  vehicleIdFromUrl: () => '4971825',
  detectTransportContext: () => ({ kind: 'PATIENT', evidence: ['patient-route', 'anchors:68'] }),
  refreshRadioTransportRequests(force) {
    assert.equal(force, true);
    forcedScans += 1;
    return scanResult;
  },
  radioRequestForVehicle(vehicleId, requests) {
    return requests.find(item => item.vehicleId === vehicleId) || null;
  },
  recordTransportService() {},
  redirectWorkerToTransportService(exact) {
    assert.equal(exact.key, request.key);
    redirects += 1;
    return true;
  },
  setPhase(...args) { phases.push(args); state.phase = args[0]; },
  pausePipelineController() {},
  clearSharedV2AutoRunning() {},
  resetAutoStartTracking() {},
  removeWorker() {
    removals += 1;
    state.worker = null;
    state.workerRole = '';
    state.workerGeneration += 1;
  },
  startTransportOnlyWorker() { return false; },
  actionableMissionSupply() {
    return { candidates: [
      { missionId: '259495582', url: '/missions/259495582' },
      { missionId: '259500141', url: '/missions/259500141' },
    ] };
  },
  chooseTopMission: () => null,
  createWorker(url) { createdMission = url; },
  beginMissionRescan() {},
  result: null,
});
vm.runInContext(`${guard}\nthis.guard = maybeHandoffMissionATransportRoute;`, context);

context.result = context.guard({}, '/vehicles/4971825',
  { kind: 'PATIENT', evidence: ['patient-route', 'anchors:68'] }, 'watcher');
assert.equal(context.result, true);
assert.equal(forcedScans, 1);
assert.equal(redirects, 1, 'the exact personal request must transfer A to B immediately');
assert.equal(removals, 0, 'the central serialized handoff owns A removal');

state.workerRole = 'MISSION_A';
state.worker = { isConnected: true };
state.lastWorkerNavigationAt = 9500;
state.phase = 'ACTIVE';
scanResult = [];
context.result = context.guard({}, '/vehicles/4971825',
  { kind: 'PATIENT', evidence: [] }, 'watcher');
assert.equal(context.result, true);
assert.equal(phases.at(-1)[0], 'TRANSPORT_HANDOFF_WAIT');
assert.equal(removals, 0, 'a briefly delayed Radio row must receive a bounded evidence window');

now = 17000;
context.result = context.guard({}, '/vehicles/4971825',
  { kind: 'PATIENT', evidence: [] }, 'watcher');
assert.equal(context.result, true);
assert.equal(removals, 1, 'an unowned transport route must remove A instead of stalling');
assert.equal(typeof callback, 'function');
callback();
assert.equal(createdMission, '/missions/259500141',
  'fail-closed recovery must avoid immediately reopening the same trapped mission');

state.workerRole = 'TRANSPORT_B';
state.worker = { isConnected: true };
const scansBeforeB = forcedScans;
assert.equal(context.guard({}, '/vehicles/4971825',
  { kind: 'PATIENT', evidence: [] }, 'watcher'), false);
assert.equal(forcedScans, scansBeforeB, 'B must never be re-routed through the A-only guard');

console.log('PASS: any verified transport route reached by mission A is synchronously transferred to exact personal Worker B or removed by bounded fail-closed recovery.');
