#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `function ${name} must exist`);
  const bodyStart = source.indexOf(') {', start);
  const brace = bodyStart >= 0 ? bodyStart + 2 : source.indexOf('{', start);
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

assert.match(source, /const PIPELINE_MAX_LOAD_CLICKS = 0;/);
assert.match(source, /const MF_UPDATE_FIRST_MIN_WAIT_MS = 500;/);
assert.match(source, /const MF_UPDATE_FIRST_MAX_WAIT_MS = 2200;/);
assert.match(source, /const MF_UPDATE_FIRST_STABLE_MS = 250;/);
assert.match(source, /const MF_AUTO_VEHICLE_LIST_STABLE_FOR_MS = 650;/);
assert.match(source, /const MF_AUTO_VEHICLE_LIST_MIN_SETTLE_MS = 450;/);

const signature = extractFunction('getVehicleCheckboxListSignature');
assert.ok(signature.includes('const sampleIndexes = new Set()'));
assert.ok(signature.includes('vehicleRows'));
assert.doesNotMatch(
  signature,
  /Array\.from\(\s*selectionDocument\.querySelectorAll\(\s*'input\.vehicle_checkbox'/,
  'stability polling must not materialise the full 1,500-row checkbox list'
);

const loader = extractFunction('ensureVehicleListLoaded');
for (const safetyEvidence of [
  'rowProgressSeen',
  'controlTransitionSeen',
  'isVehicleListLoadingIndicatorVisible()',
  'remainingLoadControl',
  'requireNonZero',
]) {
  assert.ok(loader.includes(safetyEvidence), `vehicle loader lost ${safetyEvidence}`);
}
assert.equal(
  (loader.match(/invalidateVehicleCheckboxCache\(\)/g) || []).length,
  1,
  'the expensive attribute caches should reset once, after the final stable list'
);
assert.ok(
  (loader.match(/invalidateVehicleListStructureCache\(\)/g) || []).length >= 3,
  'page polling must still refresh live checkbox/document structure'
);

const guardFunction = extractFunction('installDormantInteractionGuard');
const listeners = new Map();
let activeOwner = false;
let realOpenCalls = 0;
const targetWindow = {
  addEventListener(type, handler) {
    listeners.set(type, handler);
  },
  open() {
    realOpenCalls += 1;
    return 'opened';
  },
};
const guardContext = vm.createContext({
  targetWindow,
  ownershipBridge: { isActive: () => activeOwner },
  result: null,
});
vm.runInContext(
  `${guardFunction}\nresult = installDormantInteractionGuard(targetWindow, ownershipBridge);`,
  guardContext
);
const dormantClick = {
  type: 'click',
  prevented: false,
  stopped: false,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
};
listeners.get('click')(dormantClick);
assert.equal(dormantClick.prevented, true);
assert.equal(dormantClick.stopped, true);
assert.equal(targetWindow.open('/vehicles/1'), null);
assert.equal(guardContext.result.blockedCount(), 2);
activeOwner = true;
const activeClick = {
  type: 'click',
  preventDefault() { throw new Error('promoted Worker A click was blocked'); },
  stopImmediatePropagation() { throw new Error('promoted Worker A click was stopped'); },
};
listeners.get('click')(activeClick);
assert.equal(targetWindow.open('/missions/1'), 'opened');
assert.equal(realOpenCalls, 1, 'promotion must restore normal interaction behavior');

const refresh = extractFunction('refreshRadioTransportRequests');
let clock = 1000;
let observedRequests = [];
const rehooks = [];
const radioState = {
  radioRequestFirstSeenAt: new Map(),
  radioRequestKeys: new Set(),
  radioRequestHistory: [],
  radioTransportRequests: [],
  radioRequestSince: 0,
  radioRequestWarned: false,
  runRadioTransportRequests: 0,
  transportServiceDeferredUntil: new Map(),
};
const requestA = { key: '1:101', vehicleId: '1', missionId: '101' };
const requestB = { key: '2:202', vehicleId: '2', missionId: '202' };
const radioContext = vm.createContext({
  state: radioState,
  Date: { now: () => clock },
  collectRadioTransportRequests: () => observedRequests.map(item => ({ ...item })),
  nowIso: () => `t${clock}`,
  log() {},
  schedulePostTransportRehook: key => rehooks.push(key),
  RADIO_HISTORY_LIMIT: 40,
  result: null,
});
vm.runInContext(`${refresh}\nthis.__refresh = refreshRadioTransportRequests;`, radioContext);
observedRequests = [requestA];
radioContext.__refresh();
clock = 2000;
observedRequests = [requestB, requestA];
radioContext.__refresh();
assert.equal(radioState.radioTransportRequests[0].key, requestA.key);
assert.equal(radioState.radioTransportRequests[0].pendingMs, 1000);
assert.equal(radioState.radioRequestSince, 1000);
radioState.transportServiceDeferredUntil.set(requestA.key, 9000);
clock = 2500;
observedRequests = [requestB];
radioContext.__refresh();
assert.equal(radioState.radioTransportRequests[0].key, requestB.key);
assert.equal(radioState.radioRequestSince, 2000);
assert.equal(radioState.radioRequestFirstSeenAt.has(requestA.key), false);
assert.equal(radioState.transportServiceDeferredUntil.has(requestA.key), false);
assert.deepEqual(rehooks, [requestA.key]);

const fastRelease = extractFunction('maybeFastReleaseStalePostTransportQueueGuard');
const releaseState = {
  wanted: true,
  stopping: false,
  transportServiceActive: false,
  currentMissionId: '202',
  postTransportGuardFastReleases: 0,
};
let released = 0;
const releaseContext = vm.createContext({
  state: releaseState,
  currentWorkerAutoConfirmed: () => true,
  missionIdFromUrl: () => '202',
  findAutoModeControl: () => ({}),
  autoControlLooksRunning: () => true,
  chooseTopMission: () => ({ missionId: '202' }),
  readSharedV2QueueGuardState: () => ({
    pendingRemainingMs: 28000,
    pendingReason: 'pending-transport-rehook-post-transport-watch',
    openReason: '',
  }),
  sharedV2QueueGuardIsActive: () => true,
  normaliseText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  clearSharedV2QueueGuard: () => {
    released += 1;
    return true;
  },
  result: null,
});
vm.runInContext(
  `${fastRelease}\nresult = maybeFastReleaseStalePostTransportQueueGuard(` +
    `{ readyState: 'complete' }, '/missions/202', { kind: '' });`,
  releaseContext
);
assert.equal(releaseContext.result, true);
assert.equal(released, 1);
assert.equal(releaseState.postTransportGuardFastReleases, 1);
releaseContext.chooseTopMission = () => ({ missionId: '999' });
vm.runInContext(
  `result = maybeFastReleaseStalePostTransportQueueGuard(` +
    `{ readyState: 'complete' }, '/missions/202', { kind: '' });`,
  releaseContext
);
assert.equal(releaseContext.result, false, 'a non-authoritative mission cannot release the guard');

const preloadLoad = extractFunction('onPipelinePreloadLoad');
assert.ok(preloadLoad.includes("'dormant-preload-transport-navigation'"));
assert.ok(preloadLoad.includes('enterActiveOnlyMode('));

console.log(
  'PASS: bounded vehicle polling, oldest-first personal transport, stale post-transport release and dormant interaction isolation are enforced.'
);
