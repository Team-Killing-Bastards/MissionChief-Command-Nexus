#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const parameterStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let bodyStart = -1;
  let quote = '';
  let escaped = false;

  for (let index = parameterStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') parameterDepth += 1;
    if (character === ')' && --parameterDepth === 0) {
      bodyStart = source.indexOf('{', index);
      break;
    }
  }

  assert.ok(bodyStart >= 0, `${name} must have a body`);
  let depth = 0;
  quote = '';
  escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd < 0 ? source.length : lineEnd;
      continue;
    }
    if (character === '/' && next === '*') {
      const blockEnd = source.indexOf('*/', index + 2);
      assert.ok(blockEnd >= 0, `${name} has an unclosed comment`);
      index = blockEnd + 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const missionAlarmSubmissionId = extractFunction('missionAlarmSubmissionId');
const recover = extractFunction('maybeRecoverMissionAlarmWorker');
const persistResumeMission = extractFunction('persistResumeMission');
const storedResumeMissionUrl = extractFunction('storedResumeMissionUrl');

assert.doesNotMatch(recover, /\.click\s*\(/, '404/alarm recovery must never click Dispatch');
assert.match(recover, /preserveFinalDispatch:\s*dispatchProtected/, 'the final-dispatch latch must be preserved');
assert.match(recover, /removeWorker\(false\)/, 'the broken Worker A must be removed');
assert.match(recover, /choosePostDispatchRecoveryTarget\(missionId\)/, 'recovery must select a fresh mission excluding the completed mission');
assert.match(recover, /beginMissionRescan\(\)/, 'recovery must wait on the map when no fresh mission exists');

function createHarness({
  href = 'https://www.missionchief.co.uk/missions/259126557/alarm',
  title = "The page you were looking for doesn't exist (404)",
  dispatchProtected = true,
  nextTarget = {
    missionId: '259127837',
    url: 'https://www.missionchief.co.uk/missions/259127837',
    mission: { caption: 'Spinal injury' }
  }
} = {}) {
  const timers = [];
  const storage = new Map();
  const calls = {
    created: [],
    queueClears: [],
    logs: [],
    phases: [],
    rescans: 0,
    removed: 0
  };
  const frame = { isConnected: true };
  const state = {
    wanted: true,
    stopping: false,
    worker: frame,
    workerGeneration: 61,
    workerDocumentSerial: 421,
    postDispatchWatchdog: dispatchProtected
      ? { missionId: '259126557', missionName: 'Internal flooding (Risk to life)' }
      : null,
    activeMissionTiming: null,
    currentMissionName: 'Internal flooding (Risk to life)',
    postDispatchRecoveryHistory: [],
    recentlyNativeAdvanced: new Map(),
    running: true
  };
  const doc = {
    title,
    querySelector: () => null
  };
  const context = vm.createContext({
    state,
    frame,
    generation: 61,
    doc,
    href,
    source: 'worker-load',
    URL,
    location: { origin: 'https://www.missionchief.co.uk', href: 'https://www.missionchief.co.uk/' },
    Date: { now: () => 1787693758293 },
    POST_DISPATCH_RECOVERY_HISTORY_LIMIT: 50,
    SESSION_RESUME_MISSION: 'resume',
    window: {
      clearInterval() {},
      setTimeout(callback, delay) {
        timers.push({ callback, delay });
        return { callback, delay };
      }
    },
    normaliseText: value => String(value || '').replace(/\s+/g, ' ').trim(),
    sameOriginUrl(value) {
      try {
        const url = new URL(value, 'https://www.missionchief.co.uk/');
        return url.origin === 'https://www.missionchief.co.uk' ? url : null;
      } catch {
        return null;
      }
    },
    missionIdFromUrl: value => String(value).match(/\/missions\/(\d+)/)?.[1] || '',
    isMissionUrl: value => /\/missions\/\d+/.test(String(value)),
    readSharedV2QueueGuardState: () => ({ finalDispatch: dispatchProtected ? 'true' : '' }),
    choosePostDispatchRecoveryTarget: () => nextTarget,
    nowIso: () => '2026-08-25T21:35:58.293Z',
    cleanMissionCaption: value => String(value || ''),
    missionNameForId: id => id === '259127837' ? 'Spinal injury' : 'Internal flooding (Risk to life)',
    pathFromUrl: value => new URL(value).pathname,
    clearSharedV2QueueGuard(reason, missionId, options) {
      calls.queueClears.push({ reason, missionId, options });
    },
    clearSharedV2AutoRunning() {},
    clearAutoRecoveryWatchdog() {},
    resetAutoStartTracking() {},
    clearPromotedWorkTracking() {},
    pausePipelineController() {},
    clearTimer() {},
    finaliseActiveMissionTiming() {},
    removeWorker() {
      calls.removed += 1;
      frame.isConnected = false;
      state.worker = null;
      state.workerGeneration += 1;
    },
    compactControllerEphemeralMemory() {},
    sessionSet(key, value) { storage.set(key, value); },
    sessionGet(key) { return storage.get(key) || ''; },
    saveRunContinuity() {},
    missionDisplay: (id, name) => `${name || 'Mission'} #${id}`,
    setPhase(phase, status, detail) { calls.phases.push({ phase, status, detail }); },
    log(message, event) { calls.logs.push({ message, event }); },
    createWorker(url) { calls.created.push(url); },
    beginMissionRescan() { calls.rescans += 1; }
  });

  vm.runInContext(
    `${missionAlarmSubmissionId}\n${persistResumeMission}\n${storedResumeMissionUrl}\n${recover}\nresult = maybeRecoverMissionAlarmWorker(href);`,
    context
  );

  return { calls, context, frame, state, storage, timers };
}

const completed = createHarness();
assert.equal(completed.context.result, true);
assert.equal(completed.calls.removed, 1, 'the 404 /alarm worker must be removed immediately');
assert.equal(completed.state.recentlyNativeAdvanced.has('259126557'), true, 'the completed mission must be protected from duplicate routing');
assert.equal(
  completed.calls.queueClears[0].options.preserveFinalDispatch,
  true,
  'the final-dispatch duplicate guard must survive teardown'
);
assert.equal(completed.storage.get('resume'), 'https://www.missionchief.co.uk/missions/259127837');
assert.equal(completed.timers.length, 1);
assert.equal(completed.timers[0].delay, 120);
completed.timers[0].callback();
assert.deepEqual(completed.calls.created, ['https://www.missionchief.co.uk/missions/259127837']);
assert.equal(completed.calls.rescans, 0);

const noNextMission = createHarness({ nextTarget: null });
noNextMission.timers[0].callback();
assert.deepEqual(noNextMission.calls.created, []);
assert.equal(noNextMission.calls.rescans, 1, 'no-target recovery must return to authoritative map scanning');

const unconfirmedAlarm = createHarness({
  title: 'MissionChief',
  dispatchProtected: false,
  nextTarget: null
});
unconfirmedAlarm.timers[0].callback();
assert.deepEqual(
  unconfirmedAlarm.calls.created,
  ['https://www.missionchief.co.uk/missions/259126557'],
  'an unconfirmed /alarm route must reopen only the canonical mission for verification'
);
assert.equal(
  unconfirmedAlarm.calls.queueClears[0].options.preserveFinalDispatch,
  false
);

const ordinaryMission = createHarness({
  href: 'https://www.missionchief.co.uk/missions/259126557',
  title: 'Internal flooding (Risk to life)',
  dispatchProtected: true
});
assert.equal(ordinaryMission.context.result, false, 'a normal live mission page must remain untouched');
assert.equal(ordinaryMission.calls.removed, 0);

const resumeGuard = createHarness({
  href: 'https://www.missionchief.co.uk/missions/259126557',
  title: 'Internal flooding (Risk to life)'
});
vm.runInContext(
  `persistResumeMission('https://www.missionchief.co.uk/missions/259126557/alarm');`,
  resumeGuard.context
);
assert.equal(resumeGuard.storage.has('resume'), false, 'the transient /alarm route must never be persisted');
resumeGuard.storage.set('resume', 'https://www.missionchief.co.uk/missions/259126557/alarm');
vm.runInContext('stored = storedResumeMissionUrl();', resumeGuard.context);
assert.equal(resumeGuard.context.stored, '', 'a legacy persisted /alarm route must be rejected');

console.log('PASS: transient /alarm and same-origin 404 workers are discarded, Dispatch remains protected, and a fresh canonical Worker A resumes safely.');
