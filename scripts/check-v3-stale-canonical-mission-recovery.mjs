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

const canonicalMissionPageId = extractFunction('canonicalMissionPageId');
const missionAlarmSubmissionId = extractFunction('missionAlarmSubmissionId');
const resetCandidate = extractFunction('resetStaleCanonicalMissionCandidate');
const disposedRecovery = extractFunction('maybeRecoverDisposedMissionWorker');
const recover = extractFunction('maybeRecoverStaleCanonicalMissionWorker');

assert.doesNotMatch(disposedRecovery, /\.click\s*\(/, 'stale canonical recovery must never click Dispatch');
assert.match(disposedRecovery, /#mission_general_info/, 'a live mission shell must block stale recovery');
assert.match(disposedRecovery, /missionCandidates\.some/, 'the authoritative map must confirm that the dead mission disappeared');
assert.match(disposedRecovery, /STALE_CANONICAL_MISSION_SETTLE_MS/, 'the recovery must use a bounded settle period');
assert.match(disposedRecovery, /choosePostDispatchRecoveryTarget\(missionId\)/, 'the completed mission must be excluded from fresh selection');
assert.match(disposedRecovery, /removeWorker\(false\)/, 'the dead Worker A must be removed');
assert.match(disposedRecovery, /preserveFinalDispatch:\s*dispatchProtected/, 'any final Dispatch latch must survive worker teardown');

function createHarness({
  missionListed = false,
  hasMissionShell = false,
  hasTransport = false,
  hasMissionList = true,
  nextTarget = {
    missionId: '259200002',
    url: 'https://www.missionchief.co.uk/missions/259200002',
    mission: { caption: 'Shed fire' }
  }
} = {}) {
  let now = 1787760000000;
  const timers = [];
  const calls = {
    created: [],
    rescans: 0,
    removed: 0,
    queueClears: [],
    logs: [],
    phases: []
  };
  const frame = { isConnected: true };
  const state = {
    wanted: true,
    stopping: false,
    running: true,
    worker: frame,
    workerGeneration: 71,
    workerDocumentSerial: 512,
    currentMissionName: 'Smoke Inhalation',
    postDispatchWatchdog: { missionId: '259200001' },
    postDispatchRecoveryHistory: [],
    recentlyNativeAdvanced: new Map(),
    staleCanonicalMissionCandidateKey: '',
    staleCanonicalMissionCandidateSince: 0
  };
  const doc = {
    readyState: 'complete',
    title: 'MissionChief',
    querySelector(selector) {
      if (selector === '#mission_general_info' && hasMissionShell) return {};
      return null;
    }
  };
  const candidates = missionListed
    ? [{ missionId: '259200001', url: 'https://www.missionchief.co.uk/missions/259200001' }]
    : [{ missionId: '259200002', url: 'https://www.missionchief.co.uk/missions/259200002' }];
  const context = vm.createContext({
    state,
    href: 'https://www.missionchief.co.uk/missions/259200001',
    doc,
    source: 'nexus-discovery',
    URL,
    location: { origin: 'https://www.missionchief.co.uk', href: 'https://www.missionchief.co.uk/' },
    Date: { now: () => now },
    STALE_CANONICAL_MISSION_SETTLE_MS: 1200,
    POST_DISPATCH_RECOVERY_HISTORY_LIMIT: 50,
    SESSION_RESUME_MISSION: 'resume',
    window: {
      setTimeout(callback, delay) {
        timers.push({ callback, delay });
        return { callback, delay };
      }
    },
    sameOriginUrl(value) {
      const url = new URL(value, 'https://www.missionchief.co.uk/');
      return url.origin === 'https://www.missionchief.co.uk' ? url : null;
    },
    findMissionListRoot: () => hasMissionList ? {} : null,
    collectMissionCandidates: () => candidates,
    detectTransportContext: () => ({ kind: hasTransport ? 'PATIENT' : '' }),
    missionNameForId: id => id === '259200001' ? 'Smoke Inhalation' : 'Shed fire',
    normaliseText: value => String(value || '').replace(/\s+/g, ' ').trim(),
    readSharedV2QueueGuardState: () => ({ finalDispatch: 'true' }),
    choosePostDispatchRecoveryTarget: () => nextTarget,
    nowIso: () => '2026-08-26T08:00:00.000Z',
    clearSharedV2QueueGuard(reason, missionId, options) {
      calls.queueClears.push({ reason, missionId, options });
    },
    clearSharedV2AutoRunning() {},
    clearAutoRecoveryWatchdog() {},
    pausePipelineController() {},
    finaliseActiveMissionTiming() {},
    removeWorker() {
      calls.removed += 1;
      frame.isConnected = false;
      state.worker = null;
      state.workerGeneration += 1;
    },
    compactControllerEphemeralMemory() {},
    persistResumeMission(value) { context.resume = value; },
    sessionSet(_key, value) { context.resume = value; },
    saveRunContinuity() {},
    missionDisplay: (id, name) => `${name || 'Mission'} #${id}`,
    setPhase(phase, status, detail) { calls.phases.push({ phase, status, detail }); },
    log(message, data) { calls.logs.push({ message, data }); },
    createWorker(value) { calls.created.push(value); },
    beginMissionRescan() { calls.rescans += 1; }
  });
  vm.runInContext(`${canonicalMissionPageId}\n${missionAlarmSubmissionId}\n${resetCandidate}\n${disposedRecovery}\n${recover}`, context);
  const run = () => vm.runInContext('result = maybeRecoverStaleCanonicalMissionWorker(href, doc, source);', context);
  const advance = milliseconds => { now += milliseconds; };
  return { calls, context, frame, state, timers, run, advance };
}

const stale = createHarness();
stale.run();
assert.equal(stale.context.result, false, 'the first stale observation must only start settling');
assert.equal(stale.calls.removed, 0);
stale.advance(1199);
stale.run();
assert.equal(stale.context.result, false, 'the worker must remain intact throughout the settle window');
stale.advance(1);
stale.run();
assert.equal(stale.context.result, true, 'the settled dead canonical page must recover');
assert.equal(stale.calls.removed, 1);
assert.equal(stale.state.recentlyNativeAdvanced.has('259200001'), true, 'the dead mission must be excluded from immediate reselection');
assert.equal(stale.calls.queueClears[0].options.preserveFinalDispatch, true);
assert.equal(stale.timers[0].delay, 80);
stale.timers[0].callback();
assert.deepEqual(stale.calls.created, ['https://www.missionchief.co.uk/missions/259200002']);
assert.equal(stale.calls.rescans, 0);

const noNext = createHarness({ nextTarget: null });
noNext.run();
noNext.advance(1200);
noNext.run();
noNext.timers[0].callback();
assert.equal(noNext.calls.rescans, 1, 'no fresh mission must return control to the live map scanner');

for (const safeCase of [
  createHarness({ missionListed: true }),
  createHarness({ hasMissionShell: true }),
  createHarness({ hasTransport: true }),
  createHarness({ hasMissionList: false })
]) {
  safeCase.run();
  safeCase.advance(5000);
  safeCase.run();
  assert.equal(safeCase.context.result, false, 'uncertain or live mission evidence must fail closed');
  assert.equal(safeCase.calls.removed, 0);
}

console.log('PASS: a settled canonical mission page missing from the authoritative map is discarded and replaced without repeating Dispatch; live, listed, transport and map-uncertain pages remain untouched.');
