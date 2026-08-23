#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

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
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  assert.fail(`function ${name} is unterminated`);
}

assert.match(
  source,
  /const MINIMUM_ACTIONABLE_MISSIONS = 2;/,
  'the V3 controller must pause below exactly two actionable missions'
);
assert.match(
  source,
  /const MF_V3_MINIMUM_ACTIONABLE_MISSIONS = 2;/,
  'the embedded Mission Finder must share the exact two-mission watermark'
);
assert.equal(
  (source.match(/mcn_v3_low_queue_pause_request_v1/g) || []).length,
  2,
  'controller and Mission Finder must share one low-queue request key'
);

const activeFrameCheck = extractFunction('isMfV3ManagedActiveFrame');
const activeWorkerCheck = extractFunction('isMfV3ManagedActiveWorker');
const lowQueueCheck = extractFunction('isV3LowQueuePauseSignal');
const finalQueueCheck = extractFunction('isFinalQueueSignal');
const managedWindow = {
  name: 'mcn-v3-active-worker-test',
  top: {},
  __MCN_V3_FRAME_OWNERSHIP_BRIDGE__: {
    isActive: () => true,
  },
};
managedWindow.self = managedWindow;
const queueContext = vm.createContext({
  window: managedWindow,
  MF_V3_ACTIVE_NAME_PREFIX: 'mcn-v3-active-worker-',
  MF_V3_MINIMUM_ACTIONABLE_MISSIONS: 2,
  mfQueueRestartEnabled: true,
  result: null,
});
vm.runInContext(
  `${activeFrameCheck}\n${activeWorkerCheck}\n${lowQueueCheck}\n${finalQueueCheck}\n` +
    `result = {` +
    ` zero: isV3LowQueuePauseSignal({ exists: true, count: 0 }),` +
    ` one: isV3LowQueuePauseSignal({ exists: true, count: 1 }),` +
    ` two: isV3LowQueuePauseSignal({ exists: true, count: 2 }),` +
    ` unknown: isV3LowQueuePauseSignal({ exists: true, count: null }),` +
    ` finalOne: isFinalQueueSignal({ exists: true, count: 1 })` +
    `};`,
  queueContext
);
assert.deepEqual(
  JSON.parse(JSON.stringify(queueContext.result)),
  { zero: true, one: true, two: false, unknown: false, finalOne: true },
  'a managed active worker must stop at counts 0/1, never at 2 or unknown'
);
delete managedWindow.__MCN_V3_FRAME_OWNERSHIP_BRIDGE__;
vm.runInContext(
  `result = {` +
    ` frame: isMfV3ManagedActiveFrame(),` +
    ` owned: isMfV3ManagedActiveWorker(),` +
    ` zero: isV3LowQueuePauseSignal({ exists: true, count: 0 }),` +
    ` one: isV3LowQueuePauseSignal({ exists: true, count: 1 })` +
    `};`,
  queueContext
);
assert.deepEqual(
  JSON.parse(JSON.stringify(queueContext.result)),
  { frame: true, owned: false, zero: true, one: true },
  'a transient post-dispatch bridge gap must still use the parent V3 low-queue handoff'
);
managedWindow.name = 'standalone-mission-frame';
vm.runInContext(
  `result = {` +
    ` one: isFinalQueueSignal({ exists: true, count: 1 }),` +
    ` zero: isFinalQueueSignal({ exists: true, count: 0 })` +
    `};`,
  queueContext
);
assert.deepEqual(
  JSON.parse(JSON.stringify(queueContext.result)),
  { one: false, zero: true },
  'standalone Mission Finder queue semantics must remain count-zero only'
);

const dispatchOnly = extractFunction('clickDispatchOnly');
assert.match(
  dispatchOnly,
  /!v3LowQueueBoundary\s*&&\s*Array\.from/,
  'managed low supply must suppress the combined Dispatch & Next control'
);
assert.match(
  dispatchOnly,
  /a#mission_alarm_btn/,
  'the exact MissionChief Dispatch-only control must remain available'
);
const shareAdvance = extractFunction('createAutoAdvanceAfterDispatchState');
assert.match(
  shareAdvance,
  /if \(isV3LowQueuePauseSignal\(queueState\)\) \{\s*return null;/,
  'Dispatch & Share must not save a Next target at the V3 low-watermark'
);
const finalDispatch = extractFunction('handleAfterFinalQueueDispatch');
assert.ok(
  finalDispatch.indexOf('requestV3LowQueuePause(') <
    finalDispatch.indexOf('isTransportScreenBlockingQueueRestart()'),
  'the low-queue request must survive a post-dispatch transport handoff'
);
assert.match(
  finalDispatch,
  /requestV3LowQueuePause\([\s\S]*?\{\s*finalDispatch:\s*true\s*\}/,
  'the exact final-dispatch route must force a parent handoff even during a bridge refresh'
);
const queueRestart = extractFunction('waitForQueueRestartAndOpenMission');
assert.ok(
  queueRestart.indexOf('requestV3LowQueuePause(') <
    queueRestart.indexOf('startSilentQueueWatcher()'),
  'a hidden V3 worker must re-issue the parent handoff before the standalone silent watcher'
);

const requestedPause = extractFunction('maybeEnterRequestedLowQueuePause');
for (const token of [
  'context?.kind',
  'state.transportKind',
  'state.transportServiceActive',
  '(radioRequests || []).length > 0',
]) {
  assert.ok(
    requestedPause.includes(token),
    `low-queue teardown must wait for transport guard: ${token}`
  );
}
const enterPause = extractFunction('enterLowQueuePause');
for (const token of [
  "pausePipelineController('low-queue-pause', true)",
  'removeWorker(false)',
  'state.pipelineMemoryRecyclePending = false',
  'beginMissionRescan()',
]) {
  assert.ok(enterPause.includes(token), `low-queue pause is missing ${token}`);
}
const rescan = extractFunction('beginMissionRescan');
assert.ok(
  rescan.includes('supply.count < MINIMUM_ACTIONABLE_MISSIONS'),
  'rescan must not start Worker A below the watermark'
);
assert.ok(
  rescan.includes('LOW_QUEUE_RESUME_STABLE_MS'),
  'two recovered missions must remain stable before resume'
);
assert.ok(
  rescan.includes("recordLowQueueLifecycle('resumed'"),
  'low-queue resume must be observable in diagnostics'
);
assert.ok(
  rescan.includes('transportServiceRequest(refreshRadioTransportRequests())') &&
    rescan.includes('startTransportOnlyWorker('),
  'a personal radio transport appearing during pause must still be serviced'
);
const pausedTransport = extractFunction('startTransportOnlyWorker');
assert.ok(
  pausedTransport.includes('`/vehicles/${request.vehicleId}`') &&
    pausedTransport.includes('createWorker(url.href)'),
  'paused transport must create only the exact vehicle worker'
);
assert.doesNotMatch(
  pausedTransport,
  /dispatch|mission_alarm_btn|alert_next/i,
  'the pause transport worker must never dispatch the reserved mission'
);
const transportReturn = extractFunction('returnToTopMissionAfterTransport');
assert.ok(
  transportReturn.includes("event: 'return-to-low-queue-pause'") &&
    transportReturn.includes('removeWorker(false)') &&
    transportReturn.includes('beginMissionRescan()'),
  'a pause transport worker must release itself and return to the mission wait'
);

let clock = 1000;
let rescanCallback = null;
let supplyCount = 1;
let workerCreates = 0;
let transportStarts = 0;
const rescanState = {
  wanted: true,
  worker: null,
  lowQueuePaused: true,
  lowQueueTriggerMissionId: 'old',
  lowQueueObservedCount: 1,
  lowQueueResumeCandidateSince: 0,
  lowQueuePauseSince: 100,
  nativeMissionAdvances: 8,
  runtimeRecycleLastAt: 0,
  runtimeRecycleAdvanceBaseline: 0,
  missionRescanTimer: null,
  status: '',
  detail: '',
};
const rescanContext = vm.createContext({
  state: rescanState,
  Date: { now: () => clock },
  Math,
  window: {
    setInterval(callback) {
      rescanCallback = callback;
      return 1;
    },
    clearInterval() {},
  },
  MISSION_RESCAN_MS: 500,
  SLEEP_GAP_RECOVERY_THRESHOLD_MS: 20000,
  MINIMUM_ACTIONABLE_MISSIONS: 2,
  LOW_QUEUE_RESUME_STABLE_MS: 1500,
  clearTimer() {},
  refreshRadioTransportRequests: () => [],
  transportServiceRequest: () => null,
  startTransportOnlyWorker() {
    transportStarts += 1;
    return true;
  },
  actionableMissionSupply() {
    return {
      count: supplyCount,
      missionIds: Array.from({ length: supplyCount }, (_, index) => String(index + 1)),
      candidates: Array.from({ length: supplyCount }, (_, index) => ({
        missionId: String(index + 1),
        url: `/missions/${index + 1}`,
      })),
    };
  },
  enterLowQueuePause() {},
  render() {},
  recordLowQueueLifecycle() {},
  completeLowQueuePauseAggregate() {},
  clearLowQueuePauseRequest() {},
  compactControllerEphemeralMemory() {},
  saveRunContinuity() {},
  setPhase() {},
  log() {},
  choosePriorityTarget: () => null,
  chooseBootstrapMission: () => null,
  createWorker() {
    workerCreates += 1;
  },
});
vm.runInContext(`${rescan}\nthis.beginMissionRescan = beginMissionRescan;`, rescanContext);
rescanContext.beginMissionRescan();
assert.equal(typeof rescanCallback, 'function');
rescanCallback();
assert.equal(workerCreates, 0, 'one mission must retain the zero-worker pause');
supplyCount = 2;
clock = 1500;
rescanCallback();
assert.equal(workerCreates, 0, 'the first two-mission observation starts stability timing only');
clock = 2999;
rescanCallback();
assert.equal(workerCreates, 0, 'resume must not occur before 1.5 stable seconds');
clock = 3000;
rescanCallback();
assert.equal(workerCreates, 1, 'two stable missions must create one fresh Worker A');
assert.equal(rescanState.lowQueuePaused, false, 'resume must exit low-queue state');

rescanState.worker = null;
rescanState.lowQueuePaused = true;
rescanState.lowQueueResumeCandidateSince = 2500;
workerCreates = 0;
clock = 4000;
rescanContext.beginMissionRescan();
clock = 50000;
rescanCallback();
assert.equal(workerCreates, 0, 'a suspended timer gap must restart the stability window');
assert.equal(
  rescanState.lowQueueResumeCandidateSince,
  50000,
  'post-sleep stability must begin from the fresh observation'
);

rescanContext.transportServiceRequest = () => ({
  key: '7:8',
  vehicleId: '7',
  missionId: '8',
});
rescanState.lowQueueResumeCandidateSince = 0;
rescanContext.beginMissionRescan();
rescanCallback();
assert.equal(transportStarts, 1, 'paused personal transport must run before mission resume');

assert.match(
  source,
  /const CONTROLLER_RUNTIME_RECYCLE_ADVANCES = 12;/,
  'the controller must bound frame lifetime by mission advances'
);
assert.match(
  source,
  /const CONTROLLER_RUNTIME_RECYCLE_MAX_AGE_MS = 8 \* 60 \* 1000;/,
  'the controller must bound frame lifetime by elapsed time'
);
const recycleDecision = extractFunction('shouldRecycleControllerRuntimeAtBoundary');
assert.ok(
  recycleDecision.includes('state.transportServiceActive') &&
    recycleDecision.includes('state.wakeRecoveryActive'),
  'scheduled runtime recycling must fail closed during transport or wake recovery'
);
const recycleBoundary = extractFunction('recycleControllerRuntimeAtMissionBoundary');
assert.ok(
  recycleBoundary.includes('removeWorker(false)') &&
    recycleBoundary.includes('createWorker(url.href)'),
  'scheduled recycling must end the old A/B/C lifecycle and rebuild fresh A'
);

for (const functionName of [
  'removePipelineSlot',
  'removeWorker',
]) {
  const body = extractFunction(functionName);
  const disposeIndex = body.indexOf('disposeManagedFrameRuntime(');
  const blankIndex = body.indexOf("src = 'about:blank'");
  const removeIndex = body.indexOf('.remove()');
  assert.ok(
    disposeIndex >= 0 &&
      blankIndex > disposeIndex &&
      removeIndex > blankIndex,
    `${functionName} must teardown the frame runtime before blanking/removal`
  );
}
const promotionDisposeIndex = source.indexOf(
  'disposeManagedFrameRuntime(oldFrame'
);
const promotionBlankIndex = source.indexOf(
  "oldFrame.src = 'about:blank'",
  promotionDisposeIndex
);
const promotionRemoveIndex = source.indexOf(
  'oldFrame.remove()',
  promotionBlankIndex
);
assert.ok(
  promotionDisposeIndex >= 0 &&
    promotionBlankIndex > promotionDisposeIndex &&
    promotionRemoveIndex > promotionBlankIndex,
  'a retired promoted Worker A must teardown its runtime before removal'
);
const frameDisposal = extractFunction('disposeManagedFrameRuntime');
assert.ok(
  frameDisposal.includes('V2_FRAME_RUNTIME_RECONCILE_EVENT') &&
    frameDisposal.includes('removed: true'),
  'managed frame disposal must ask the embedded runtime to clear listeners, observers and timers'
);

for (const body of [enterPause, recycleBoundary]) {
  assert.doesNotMatch(body, /localStorage\.(?:clear|removeItem)/);
  assert.doesNotMatch(body, /mcPersonnelVehicleTrainingRegistry_v1/);
  assert.doesNotMatch(body, /mcPersonnel(?:Service|Profile|UnitsRequired)/);
}
assert.ok(
  source.includes("'mcPersonnelVehicleTrainingRegistry_v1'"),
  'the durable personnel/training register must remain present in the merged runtime'
);

console.log(
  'PASS: V3 pauses below two missions, preserves transport and durable registers, and bounds managed frame lifetimes.'
);
