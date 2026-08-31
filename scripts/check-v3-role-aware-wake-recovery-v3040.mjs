#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name, from = 0) {
  const start = source.indexOf(`function ${name}(`, from);
  assert.ok(start >= 0, `${name} must exist`);
  const paren = source.indexOf('(', start);
  let pdepth = 0;
  let quote = '';
  let escaped = false;
  let index = paren;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '(') pdepth += 1;
    if (char === ')' && --pdepth === 0) { index += 1; break; }
  }
  const brace = source.indexOf('{', index);
  let depth = 0;
  quote = '';
  escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (index = brace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || '';
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
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

assert.match(source, /const SLEEP_GAP_RECOVERY_THRESHOLD_MS = 90 \* 1000;/);
assert.match(source, /const SLEEP_GAP_HIDDEN_RECOVERY_THRESHOLD_MS = 3 \* 60 \* 1000;/);

const recover = extractFunction('recoverFromSuspendedTimerGap');
for (const token of [
  "state.workerRole === 'TRANSPORT_B'",
  'refreshRadioTransportRequests(true)',
  "returnToTopMissionAfterTransport('wake-recovery-request-cleared'",
  "startTransportOnlyWorker(exactTransportRequest,\n'wake-recovery-exact-transport-b')",
  "clearSharedV2QueueGuard('suspended-timer-gap-recovery'",
  '{ preserveFinalDispatch: true }',
]) assert.ok(recover.includes(token), `wake recovery lost ${token}`);
assert.doesNotMatch(recover, /radioRequestFirstSeenAt\s*=\s*new Map\(/,
  'wake recovery must preserve oldest-first Radio timing');

function makeWakeContext({ visibility = 'visible', requests = [] } = {}) {
  let returnCalls = 0;
  let removals = 0;
  let clears = 0;
  let callback = null;
  let startedB = null;
  const state = {
    wanted: true,
    stopping: false,
    wakeRecoveryActive: false,
    workerRole: 'TRANSPORT_B',
    worker: { isConnected: true },
    workerGeneration: 7,
    transportServiceActive: true,
    transportServiceKey: '7623492:259600971',
    transportServiceVehicleId: '7623492',
    transportServiceMissionId: '259600971',
    currentMissionId: '259600971',
    sleepGapRecoveries: 0,
    sleepGapHistory: [],
    transportKind: 'PATIENT',
    transportIdentity: 'PATIENT:7623492:2633165',
    transportSince: 1,
    transportWarned: true,
    transportRecoveryAttempts: new Map(),
    transportServiceEligible: false,
    activeTransportEvent: null,
    running: true,
  };
  const context = vm.createContext({
    state,
    document: { visibilityState: visibility },
    String, Boolean, Number, Math, Map,
    Date: { now: () => 200000 },
    SLEEP_GAP_RECOVERY_THRESHOLD_MS: 90000,
    SLEEP_GAP_HIDDEN_RECOVERY_THRESHOLD_MS: 180000,
    SLEEP_GAP_HISTORY_LIMIT: 30,
    CONTROLLER_RECYCLE_RESTART_DELAY_MS: 120,
    window: {
      clearInterval() {},
      setTimeout(fn) { callback = fn; return 1; },
    },
    getWorkerHref: () => '/vehicles/7623492/patient/2633165',
    sleepRecoveryMissionUrl: () => '/missions/259600971',
    refreshRadioTransportRequests(force) { assert.equal(force, true); return requests; },
    transportServiceRequest: list => list[0] || null,
    nowIso: () => 'now',
    pathFromUrl: value => value,
    missionIdFromUrl: value => String(value || '').match(/missions\/(\d+)/)?.[1] || '',
    clearTimer() {},
    clearPostDispatchWatchdog() {},
    pausePipelineController() {},
    resetAutoStartTracking() {},
    clearPromotedWorkTracking() {},
    clearSharedV2AutoRunning() {},
    clearSharedV2QueueGuard(_reason, _missionId, options) {
      assert.equal(options.preserveFinalDispatch, true);
    },
    log() {},
    returnToTopMissionAfterTransport(reason, service) {
      assert.equal(reason, 'wake-recovery-request-cleared');
      assert.equal(service.key, '7623492:259600971');
      returnCalls += 1;
      return true;
    },
    endTransportEvent() {},
    removeWorker() {
      removals += 1;
      state.worker = null;
      state.workerRole = '';
      state.workerGeneration += 1;
    },
    clearTransportServiceState() {
      clears += 1;
      state.transportServiceActive = false;
    },
    setPhase() {},
    startTransportOnlyWorker(request, reason) {
      startedB = { request, reason };
      return true;
    },
    beginMissionRescan() {},
    createWorker() {},
    result: null,
  });
  vm.runInContext(`${recover}\nthis.runRecovery = recoverFromSuspendedTimerGap;`, context);
  return {
    context, state,
    run: ms => context.runRecovery(ms, 'watcher'),
    callback: () => callback?.(),
    counts: () => ({ returnCalls, removals, clears, startedB }),
  };
}

const shortGap = makeWakeContext();
assert.equal(shortGap.run(26300), false, 'a normal 26 second scheduling delay must not tear down B');
assert.deepEqual(shortGap.counts(), { returnCalls: 0, removals: 0, clears: 0, startedB: null });

const hiddenGap = makeWakeContext({ visibility: 'hidden' });
assert.equal(hiddenGap.run(120000), false, 'a hidden-page two minute delay must not be treated as sleep');

const cleared = makeWakeContext();
assert.equal(cleared.run(100000), true);
assert.equal(cleared.counts().returnCalls, 1,
  'a cleared B request must finish through the normal B-to-A function');
assert.equal(cleared.counts().removals, 0,
  'the wake handler must not run its generic teardown before normal B completion');

const exact = { key: '7623492:259600971', vehicleId: '7623492', missionId: '259600971' };
const pending = makeWakeContext({ requests: [exact] });
assert.equal(pending.run(100000), true);
assert.equal(pending.counts().removals, 1, 'stale B must be removed before exact B rebuild');
assert.equal(pending.counts().clears, 1);
pending.callback();
assert.equal(pending.counts().startedB?.request.key, exact.key);
assert.equal(pending.counts().startedB?.reason, 'wake-recovery-exact-transport-b');
assert.equal(pending.counts().returnCalls, 0,
  'a still-live request must not start mission A');

const missionModule = source.indexOf('MODULE 2: MISSION FINDER');
assert.ok(missionModule >= 0);
const shouldKeep = extractFunction('shouldKeepMissionFinderObserverForCurrentFrame', missionModule);
assert.ok(
  shouldKeep.indexOf('if (isMfV3ManagedActiveFrame()) return true;') <
  shouldKeep.indexOf('if (!document.body || !isMissionPage()) return false;'),
  'managed A must outrank early DOM readiness and visible-primary ranking'
);
const keepContext = vm.createContext({
  MF_IS_TOP_WINDOW: false,
  document: { body: null },
  globalThis: { location: { pathname: '/missions/259600971' } },
  String,
  isMissionPage: () => false,
  isMfV3ManagedActiveFrame: () => true,
  getPrimaryMissionRequirementDocument: () => ({}),
  result: null,
});
vm.runInContext(`${shouldKeep}\nresult = shouldKeepMissionFinderObserverForCurrentFrame();`, keepContext);
assert.equal(keepContext.result, true,
  'an early hidden managed Worker A must remain admitted before its DOM is complete');

const observer = extractFunction('startMissionFinderObserver', missionModule);
assert.match(observer, /const managedActiveFrame = isMfV3ManagedActiveFrame\(\);/);
assert.match(observer, /if \(!managedActiveFrame && !shouldKeepMissionFinderObserverForCurrentFrame\(\)\)/,
  'managed-active and inactive-owner outcomes must be mutually exclusive');

for (const name of ['claimCurrentMissionExecutionOwnership', 'isCurrentMissionExecutionOwner']) {
  const body = extractFunction(name, missionModule);
  assert.match(body, /const managedActiveFrame = isMfV3ManagedActiveFrame\(\);/);
  assert.match(body, /if \(!managedActiveFrame && primaryDocument !== document\)/,
    `${name} must trust the parent-appointed managed frame before visible ranking`);
}

const waiter = extractFunction('waitForNexusAndStart');
assert.ok(
  waiter.indexOf("clearSharedV2QueueGuard('active-bootstrap-clean-retry'") <
  waiter.indexOf('removeWorker(false)'),
  'clean A retry must release stale opening locks before worker replacement'
);
assert.ok(waiter.includes("clearSharedV2AutoRunning('active-bootstrap-clean-retry')"));

console.log('PASS: delayed transport completion is role-aware, short throttling gaps are ignored, and named Worker A admission is terminal before DOM/visible-owner ranking.');
