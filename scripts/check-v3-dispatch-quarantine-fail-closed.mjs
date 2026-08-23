#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
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

const watchdog = extractFunction('maybeRunPostDispatchWatchdog');
assert.ok(
  watchdog.indexOf('quarantinePostDispatchMission(') <
    watchdog.indexOf('choosePostDispatchRecoveryTarget('),
  'the stalled dispatched mission must be quarantined before choosing a recovery target'
);
assert.ok(
  watchdog.indexOf('redirectWorkerToTransportService(') <
    watchdog.indexOf('redirectWorkerToPriority('),
  'an existing personal transport must be serviced before the next mission handoff'
);
assert.doesNotMatch(
  watchdog,
  /target\?\.url\s*\|\||new URL\(`\/missions\/\$\{watchdog\.missionId\}/,
  'hard recovery must never fall back to reloading the quarantined mission'
);
assert.match(
  watchdog,
  /action:\s*'fail-closed-release-all-workers'/,
  'the repeated-stall circuit breaker must describe a real all-worker shutdown'
);

const recoveryCalls = [];
const recoveryRequest = {
  key: '5002115:258782154',
  vehicleId: '5002115',
  missionId: '258782154',
};
const watchdogState = {
  postDispatchWatchdog: {
    missionId: '101',
    missionName: 'Heat stroke',
    startedAt: 0,
    pausedAt: 0,
    pausedMs: 0,
    softRecovered: true,
    hardRecoveryIssued: false,
    statusText: 'Dispatch & Next clicked',
  },
  wanted: true,
  stopping: false,
  postDispatchRecoveryHistory: [],
  postDispatchHardRecoveries: 0,
  postDispatchCircuitBreakers: 0,
  transportServiceEligible: false,
  activeMissionTiming: null,
};
const recoveryContext = vm.createContext({
  state: watchdogState,
  Date: { now: () => 16001, parse: value => Number(value) || 0 },
  POST_DISPATCH_SOFT_RECOVERY_MS: 8000,
  POST_DISPATCH_HARD_RECOVERY_MS: 16000,
  POST_DISPATCH_RECOVERY_WINDOW_MS: 120000,
  missionIdFromUrl: () => '101',
  postDispatchPauseReason: () => '',
  postDispatchEffectiveElapsed: () => 16001,
  collectMissionCandidates: () => [{
    missionId: '101',
    ruleSignature: 'same-state',
    rendered: true,
    allianceLike: false,
    actionKind: 'NEW',
  }],
  quarantinePostDispatchMission: () => {
    recoveryCalls.push('quarantine');
    return { retryAfterAdvance: 20 };
  },
  refreshRadioTransportRequests: () => [recoveryRequest],
  transportServiceRequest: () => recoveryRequest,
  choosePostDispatchRecoveryTarget: () => ({
    missionId: '202',
    url: '/missions/202',
    source: 'POST_DISPATCH_NEXT_MISSION',
    mission: { caption: 'Next mission' },
  }),
  recordPostDispatchRecovery: (level, active, data) => ({
    level,
    missionId: active.missionId,
    missionName: active.missionName,
    ...data,
  }),
  cleanMissionCaption: value => String(value || ''),
  clearSharedV2QueueGuard() {},
  clearPostDispatchWatchdog() {
    watchdogState.postDispatchWatchdog = null;
  },
  log() {},
  redirectWorkerToTransportService() {
    recoveryCalls.push('transport');
    return true;
  },
  redirectWorkerToPriority() {
    recoveryCalls.push('mission');
    return true;
  },
  setError() {},
  missionDisplay: id => id,
  result: null,
});
vm.runInContext(
  `${watchdog}\nresult = maybeRunPostDispatchWatchdog({}, '/missions/101', {});`,
  recoveryContext
);
assert.equal(recoveryContext.result, true);
assert.deepEqual(
  recoveryCalls,
  ['quarantine', 'transport'],
  'hard recovery must quarantine once, then open transport without routing a mission'
);
assert.equal(watchdogState.transportServiceEligible, true);

const registerSkip = extractFunction('registerRecoverableMissionSkip');
const quarantine = extractFunction('quarantinePostDispatchMission');
const quarantineState = {
  nativeMissionAdvances: 7,
  missionSkipRecords: new Map(),
  recoverableMissionSkips: 0,
};
const quarantineContext = vm.createContext({
  state: quarantineState,
  RECOVERABLE_SHORTAGE_SKIP_ADVANCES: 20,
  MISSION_SKIP_HISTORY_LIMIT: 80,
  cleanMissionCaption: value => String(value || '').trim(),
  missionNameForId: id => `Mission ${id}`,
  normaliseText: value => String(value || '').trim(),
  nowIso: () => '2026-08-22T12:00:00.000Z',
  trimOldestMapEntries() {},
  recordMissionSkipEvent() {},
  recordMissionRuleSignature() {},
  log() {},
  result: null,
});
vm.runInContext(
  `${registerSkip}\n${quarantine}\n` +
    `result = quarantinePostDispatchMission(` +
    `{ missionId: '101', missionName: 'Heat stroke', statusText: 'Dispatch & Next clicked' },` +
    `{ missionId: '101', ruleSignature: 'new-signature' });`,
  quarantineContext
);
assert.equal(quarantineContext.result.category, 'POST_DISPATCH_STALL');
assert.equal(quarantineContext.result.retryAfterAdvance, 27);
assert.equal(quarantineContext.result.ruleSignature, 'new-signature');

const signatureFunction = extractFunction('recordMissionRuleSignature');
const signatureEvents = [];
const signatureState = {
  missionRowSignatures: new Map([['101', 'old-signature']]),
  missionSkipRecords: new Map([['101', {
    missionId: '101',
    category: 'POST_DISPATCH_STALL',
  }]]),
  ruleChangeHistory: [],
};
const signatureContext = vm.createContext({
  state: signatureState,
  RULE_CHANGE_HISTORY_LIMIT: 40,
  CONTROLLER_IDENTITY_CACHE_LIMIT: 400,
  nowIso: () => '2026-08-22T12:01:00.000Z',
  trimOldestMapEntries() {},
  recordMissionSkipEvent: event => signatureEvents.push(event),
  log() {},
});
vm.runInContext(`${signatureFunction}\nthis.check = recordMissionRuleSignature;`, signatureContext);
signatureContext.check({
  missionId: '101',
  caption: 'Heat stroke',
  ruleSignature: 'upgraded-signature',
  actionKind: 'UPGRADE',
  visualOrder: 1,
  stateFilter: 'red',
  participation: 'own',
  missingText: '1 Ambulance',
});
assert.equal(
  signatureState.missionSkipRecords.has('101'),
  false,
  'an authoritative upgrade must release only the stale post-dispatch quarantine'
);
assert.equal(signatureEvents[0]?.event, 'post-dispatch-quarantine-released');

signatureState.missionRowSignatures.set('202', 'old-shortage');
signatureState.missionSkipRecords.set('202', {
  missionId: '202',
  category: 'NO_ELIGIBLE_VEHICLE',
});
signatureContext.check({
  missionId: '202',
  caption: 'Shortage mission',
  ruleSignature: 'new-shortage',
  actionKind: 'UPGRADE',
  visualOrder: 2,
  stateFilter: 'red',
  participation: 'own',
  missingText: '1 Search Dog Unit',
});
assert.equal(
  signatureState.missionSkipRecords.has('202'),
  true,
  'ordinary 20-advance shortage protection must survive unrelated row refreshes'
);

const priority = extractFunction('maybeEnforcePriority');
assert.ok(
  priority.includes('state.postDispatchWatchdog'),
  'priority routing must pause while Dispatch & Next is still awaiting a native transition'
);

const transportOnly = extractFunction('startTransportOnlyWorker');
assert.match(transportOnly, /`\/vehicles\/\$\{request\.vehicleId\}`/);
assert.doesNotMatch(transportOnly, /!state\.lowQueuePaused/);
assert.doesNotMatch(transportOnly, /\.click\s*\(/);
const startController = extractFunction('startController');
assert.ok(
  startController.indexOf('startTransportOnlyWorker(') < startController.indexOf('createWorker('),
  'a queued personal transport must be opened before the first mission worker'
);
const retryCurrent = extractFunction('retryCurrent');
assert.ok(
  retryCurrent.includes('!isMissionTemporarilySkipped(candidateMissionId)'),
  'Retry current must not reload a quarantined or shortage-skipped mission'
);
assert.ok(
  retryCurrent.indexOf('startTransportOnlyWorker(') < retryCurrent.indexOf("if (!mission?.url)"),
  'Retry current must clear an existing personal transport before reopening a mission'
);

assert.match(
  source,
  /const PIPELINE_MAX_LOAD_CLICKS = 0;/,
  'B/C must remain page-warm and must not expand the full vehicle table'
);
const pump = extractFunction('pumpPipelinePreloads');
assert.match(pump, /snapshot\.control && slot\.loadClicks < PIPELINE_MAX_LOAD_CLICKS/);
const promote = extractFunction('promotePipelineMission');
assert.match(promote, /snapshot\.control && slot\.loadClicks < PIPELINE_MAX_LOAD_CLICKS/);

const fatal = extractFunction('setError');
for (const required of [
  'captureWorkerSnapshot()',
  'clearPersistedRunIntent()',
  'clearAllControllerTimers()',
  "clearSharedV2AutoRunning('controller-error')",
  "pausePipelineController('controller-error', true)",
  'removeWorker(false)',
  'markRunStopped()',
  'saveRunContinuity()',
]) {
  assert.ok(fatal.includes(required), `fatal shutdown is missing ${required}`);
}
assert.doesNotMatch(fatal, /(?:localStorage|sessionStorage)\.clear\s*\(/);
assert.ok(
  fatal.indexOf('captureWorkerSnapshot()') < fatal.indexOf('removeWorker(false)'),
  'fatal shutdown must snapshot diagnostics before removing Worker A'
);

console.log('PASS: V3 quarantines stalled dispatches, clears queued transports first, releases fatal workers, and keeps B/C page-warm.');
