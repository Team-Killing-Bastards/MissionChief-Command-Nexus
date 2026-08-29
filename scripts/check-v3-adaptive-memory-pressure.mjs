#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `function ${name} must exist`);
  const signatureEnd = source.indexOf(') {', start);
  const brace = signatureEnd >= 0 ? signatureEnd + 2 : source.indexOf('{', start);
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

assert.match(source, /const PIPELINE_PRELOAD_COUNT = 0;/);
assert.match(source, /const CONTROLLER_MEMORY_PRESSURE_BYTES = 768 \* 1024 \* 1024;/);
assert.match(source, /const CONTROLLER_MEMORY_GROWTH_BYTES = 192 \* 1024 \* 1024;/);
assert.match(source, /const CONTROLLER_MEMORY_WARMUP_MS = 60 \* 1000;/);
assert.match(source, /const CONTROLLER_MEMORY_SUSTAIN_MS = 15 \* 1000;/);
assert.match(source, /const CONTROLLER_MEMORY_SAMPLE_MS = 5 \* 1000;/);
assert.match(source, /const CONTROLLER_MEMORY_RELEASE_SUSTAIN_MS = 60 \* 1000;/);
assert.match(source, /const CONTROLLER_MEMORY_RELEASE_CEILING_BYTES = 640 \* 1024 \* 1024;/);
assert.match(source, /const CONTROLLER_MEMORY_RELEASE_GROWTH_BYTES = 96 \* 1024 \* 1024;/);
assert.match(source, /const CONTROLLER_PRESSURE_RECYCLE_ADVANCES = 8;/);
assert.match(source, /const CONTROLLER_PRESSURE_RECYCLE_MAX_AGE_MS = 4 \* 60 \* 1000;/);
assert.match(source, /const CONTROLLER_RECYCLE_RESTART_DELAY_MS = 900;/);
assert.match(source, /const CONTROLLER_FULL_PAGE_RECYCLE_EVERY_RUNTIME_CYCLES = 3;/);

const disconnectObservers = extractFunction('disconnectAirfieldOperationsSupervisorObservers');
const installObservers = extractFunction('installAirfieldOperationsSupervisorObservers');
const rootDocument = { body: {} };
const nestedFrame = { isConnected: true };
const nestedDocument = { body: {}, defaultView: { frameElement: nestedFrame } };
const observerInstances = [];
class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    observerInstances.push(this);
  }
  observe() {}
  disconnect() { this.disconnected = true; }
}
const observerState = { wanted: true, airfieldObservers: new Map() };
const observerContext = vm.createContext({
  state: observerState,
  MutationObserver: FakeMutationObserver,
  accessibleWorkerDocuments: () => [rootDocument, nestedDocument],
  applyAirfieldOperationsSupervisorCrossRef() {},
});
vm.runInContext(`${disconnectObservers}\n${installObservers}`, observerContext);
observerContext.installAirfieldOperationsSupervisorObservers(rootDocument);
assert.equal(observerState.airfieldObservers.size, 2);
observerContext.installAirfieldOperationsSupervisorObservers(rootDocument);
assert.equal(observerInstances.length, 2, 'the same mission documents must not gain duplicate observers');
nestedFrame.isConnected = false;
observerContext.accessibleWorkerDocuments = () => [rootDocument];
observerContext.installAirfieldOperationsSupervisorObservers(rootDocument);
assert.equal(observerState.airfieldObservers.size, 1);
assert.equal(observerInstances[1].disconnected, true, 'a detached nested mission document must be released');
observerContext.disconnectAirfieldOperationsSupervisorObservers();
assert.equal(observerState.airfieldObservers.size, 0);
assert.equal(observerInstances[0].disconnected, true, 'Worker A teardown must disconnect its root observer');

const forgetDocument = extractFunction('forgetWorkerDocument');
assert.ok(
  forgetDocument.indexOf('disconnectAirfieldOperationsSupervisorObservers()') <
    forgetDocument.indexOf('state.workerDocument = null'),
  'observer teardown must happen before the controller drops Worker A document identity'
);

const heapSnapshot = extractFunction('controllerUsedHeapBytes');
const pressureReleaseLimit = extractFunction('controllerMemoryPressureReleaseLimit');
const activatePressure = extractFunction('activateControllerMemoryPressure');
const pressureState = {
  pipelineMemoryPressureActive: false,
  pipelineMemoryPressureSince: 0,
  pipelineMemoryPressureHeapBytes: 0,
  pipelineMemoryPressureActivations: 0,
  pipelineMemoryRecyclePending: false,
  pipelineMemoryBaselineBytes: 0,
  pipelineMemoryLastBytes: 0,
  pipelineMemoryPeakBytes: 0,
  pipelineMemoryCandidateSince: 0,
  pipelineMemoryPressureReason: '',
  pipelineMemoryPressureBelowSince: 0,
  pipelineMemoryPressureReleases: 0,
  pipelineMemoryLastSampleAt: 0,
  runStartedAt: '',
  wanted: true,
  running: true,
  stopping: false,
  lowQueuePaused: false,
  transportKind: '',
  transportServiceActive: false,
};
let pipelinePauses = 0;
let pipelineRestarts = 0;
let now = Date.now();
class FakeDate extends Date {
  static now() { return now; }
}
pressureState.runStartedAt = new Date(now).toISOString();
const pressureContext = vm.createContext({
  state: pressureState,
  performance: { memory: { usedJSHeapSize: 537 * 1024 * 1024 } },
  CONTROLLER_MEMORY_PRESSURE_BYTES: 768 * 1024 * 1024,
  CONTROLLER_MEMORY_GROWTH_BYTES: 192 * 1024 * 1024,
  CONTROLLER_MEMORY_WARMUP_MS: 60 * 1000,
  CONTROLLER_MEMORY_SUSTAIN_MS: 15 * 1000,
  CONTROLLER_MEMORY_SAMPLE_MS: 5 * 1000,
  CONTROLLER_MEMORY_RELEASE_SUSTAIN_MS: 60 * 1000,
  CONTROLLER_MEMORY_RELEASE_CEILING_BYTES: 640 * 1024 * 1024,
  CONTROLLER_MEMORY_RELEASE_GROWTH_BYTES: 96 * 1024 * 1024,
  Date: FakeDate,
  Math,
  window: { setTimeout(callback) { callback(); } },
  pausePipelineController() { pipelinePauses += 1; },
  startPipelineController() { pipelineRestarts += 1; },
  compactControllerEphemeralMemory() {},
  pipelineRecord() {},
  log() {},
  result: null,
});
vm.runInContext(
  `${heapSnapshot}\n${pressureReleaseLimit}\n${activatePressure}\nresult = activateControllerMemoryPressure();`,
  pressureContext
);
assert.equal(pressureContext.result, false, 'normal mission-A startup heap must be learned, not rejected');
assert.equal(pressureState.pipelineMemoryBaselineBytes, 537 * 1024 * 1024);
now += 61 * 1000;
pressureContext.performance.memory.usedJSHeapSize = 740 * 1024 * 1024;
vm.runInContext('result = activateControllerMemoryPressure();', pressureContext);
assert.equal(pressureContext.result, false, 'growth must be sustained before RAM protection activates');
now += 16 * 1000;
vm.runInContext('result = activateControllerMemoryPressure();', pressureContext);
assert.equal(pressureContext.result, true);
assert.equal(pressureState.pipelineMemoryPressureActive, true);
assert.equal(pressureState.pipelineMemoryRecyclePending, true);
assert.equal(pressureState.pipelineMemoryPressureReason, 'sustained-growth');
assert.equal(pipelinePauses, 1);
vm.runInContext('result = activateControllerMemoryPressure();', pressureContext);
assert.equal(pressureContext.result, false);
assert.equal(pipelinePauses, 1, 'RAM protection activation must be idempotent');

pressureState.pipelineMemoryRecyclePending = false;
pressureContext.performance.memory.usedJSHeapSize = 600 * 1024 * 1024;
now += 5 * 1000;
vm.runInContext('result = activateControllerMemoryPressure();', pressureContext);
assert.equal(pressureState.pipelineMemoryPressureActive, true, 'one low sample must not release RAM protection');
now += 61 * 1000;
vm.runInContext('result = activateControllerMemoryPressure();', pressureContext);
assert.equal(pressureState.pipelineMemoryPressureActive, false, 'a sustained safe heap must release RAM protection');
assert.equal(pressureState.pipelineMemoryPressureReleases, 1);
assert.equal(pipelineRestarts, 1, 'the controller may leave RAM protection after the sustained safe period');

const recycleDecision = extractFunction('shouldRecycleControllerRuntimeAtBoundary');
for (const token of [
  'pipelineMemoryRecyclePending',
  'CONTROLLER_PRESSURE_RECYCLE_ADVANCES',
  'CONTROLLER_PRESSURE_RECYCLE_MAX_AGE_MS',
]) {
  assert.ok(recycleDecision.includes(token), `memory-pressure recycle decision lost ${token}`);
}
const recycle = extractFunction('recycleControllerRuntimeAtMissionBoundary');
assert.ok(recycle.includes('state.pipelineMemoryRecyclePending = false'));
assert.ok(recycle.includes('CONTROLLER_RECYCLE_RESTART_DELAY_MS'));
assert.ok(recycle.includes('removeWorker(false)'));
assert.ok(recycle.includes('window.location.reload()'), 'native iframe memory must get a periodic full-realm recycle');
assert.ok(recycle.includes('CONTROLLER_FULL_PAGE_RECYCLE_EVERY_RUNTIME_CYCLES'));
assert.doesNotMatch(recycle, /localStorage\.(?:clear|removeItem)/);

const dispose = extractFunction('disposeManagedFrameRuntime');
assert.ok(dispose.includes("removeEventListener('load', loadHandler)"));
assert.ok(dispose.includes('contentWindow?.stop?.()'));
assert.ok(dispose.includes('V2_FRAME_RUNTIME_RECONCILE_EVENT'));
const removeSlot = extractFunction('removePipelineSlot');
assert.ok(removeSlot.includes('slot.frame = null'), 'removed preload slots must release their iframe document edge');
assert.ok(removeSlot.includes("frame.src = 'about:blank'"));

const largeRelease = extractFunction('releaseMissionFinderLargeEphemeralState');
for (const token of [
  'resetMissionRequirementPreloadCache',
  'resetVehicleLoadState',
  'mfLastMissionDefinitionRawRows = []',
  'mfPatientSelectionLedgerCache = null',
  'mfTransportOwnerModal = null',
]) {
  assert.ok(largeRelease.includes(token), `embedded cleanup lost ${token}`);
}
for (const lifecycle of [
  'suspendMissionFinderRuntimeForInactiveFrame',
  'suspendMissionFinderRuntimeForPageHide',
  'cleanupMissionFinderRuntime',
]) {
  assert.ok(
    extractFunction(lifecycle).includes('releaseMissionFinderLargeEphemeralState('),
    `${lifecycle} must release large transient mission state`
  );
}

for (const durableKey of [
  'mcPersonnelVehicleTrainingRegistry_v1',
  'mcPersonnelService',
  'mcPersonnelProfile',
]) {
  assert.doesNotMatch(largeRelease, new RegExp(durableKey));
}

console.log(
  'PASS: V3 owns mission observers, learns normal mission-A heap and activates protection only after sustained pressure, releases the latch after a safe minute, and clears disposable state without touching durable registers.'
);
