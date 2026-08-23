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

const noteTiming = extractFunction('noteMissionTimingStatus');
const timingState = {
  currentMissionId: '258829952',
  currentMissionName: 'Facial Droop',
  activeMissionTiming: {
    missionId: '258829952',
    missionName: 'Facial Droop',
    milestones: {},
  },
};
let watchdogArms = 0;
const timingContext = vm.createContext({
  state: timingState,
  normaliseText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  startMissionTiming() {},
  missionNameForId: () => 'Facial Droop',
  armPostDispatchWatchdog() {
    watchdogArms += 1;
    return true;
  },
  Date,
});
vm.runInContext(`${noteTiming}\nthis.noteMissionTimingStatus = noteMissionTimingStatus;`, timingContext);
timingContext.noteMissionTimingStatus(
  'Auto Mode: final mission dispatched. Restarting the queue...',
  'watcher'
);
assert.ok(timingState.activeMissionTiming.milestones.finalDispatch);
assert.equal(watchdogArms, 1, 'final Dispatch-only evidence must arm bounded recovery');
timingContext.noteMissionTimingStatus(
  'Silent queue watcher active. Waiting for 15 unattended missions.',
  'watcher'
);
assert.ok(timingState.activeMissionTiming.milestones.finalQueueHandoff);
assert.equal(watchdogArms, 1, 'queue-watcher status must not duplicate the dispatch watchdog');

const restoreWarning = extractFunction('restoreAfterResolvedRadioTransportWarning');
let phase = null;
const warningState = {
  phase: 'TRANSPORT_WARN',
  status: 'Personal Radio transport request may be stalled',
  transportServiceActive: false,
  transportKind: '',
  autoStopWarned: false,
  lastError: '',
  lowQueuePaused: false,
  lowQueueObservedCount: 0,
  postDispatchWatchdog: null,
  wanted: true,
  worker: { isConnected: true },
  currentMissionId: '258829952',
  currentMissionName: 'Facial Droop',
};
const warningContext = vm.createContext({
  state: warningState,
  getWorkerDocument: () => ({}),
  findUsefulNexusStatus: () => 'Units ready for dispatch.',
  missionDisplay: (id, name) => `${name} [${id}]`,
  setPhase(nextPhase, status, detail) {
    phase = { nextPhase, status, detail };
  },
  log() {},
});
vm.runInContext(
  `${restoreWarning}\nthis.restoreAfterResolvedRadioTransportWarning = restoreAfterResolvedRadioTransportWarning;`,
  warningContext
);
assert.equal(
  warningContext.restoreAfterResolvedRadioTransportWarning('5081398:258828075', []),
  true
);
assert.equal(phase.nextPhase, 'ACTIVE');
assert.match(phase.detail, /Units ready for dispatch/);

phase = null;
warningState.phase = 'TRANSPORT_WARN';
assert.equal(
  warningContext.restoreAfterResolvedRadioTransportWarning(
    '5081398:258828075',
    [{ key: '5081398:258828075' }]
  ),
  false
);
assert.equal(phase, null, 'a warning must remain while its exact request is still live');

const refreshRequests = extractFunction('refreshRadioTransportRequests');
assert.ok(
  refreshRequests.includes('restoreAfterResolvedRadioTransportWarning(warnedKey, requests)'),
  'radio reconciliation must restore the controller phase when the warned key clears'
);
assert.match(
  source,
  /state\.radioRequestWarningKey = String\(radioRequests\[0\]\?\.key \|\| ''\);/,
  'the warning must retain the exact request identity it describes'
);

const finalDispatch = extractFunction('handleAfterFinalQueueDispatch');
assert.match(finalDispatch, /\{\s*finalDispatch:\s*true\s*\}/);
const queueRestart = extractFunction('waitForQueueRestartAndOpenMission');
assert.ok(
  queueRestart.indexOf('requestV3LowQueuePause(') <
    queueRestart.indexOf('mfQueueRestartWaiting = true'),
  'the parent V3 handoff must happen before standalone queue-watcher state is entered'
);

console.log(
  'PASS: final Dispatch-only completion cannot fall into the hidden 15-mission watcher, recovery is armed, and cleared radio warnings cannot remain stale.'
);
