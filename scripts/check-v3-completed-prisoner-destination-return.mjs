#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = bodyStart; index < source.length; index += 1) {
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
  assert.fail(`${name} is unterminated`);
}

assert.ok(
  source.includes('const COMPLETED_PRISONER_DESTINATION_RETURN_MS = 6000;'),
  'completed prisoner destinations need a bounded settle window'
);

const completedContextFunction = extractFunction('isCompletedPrisonerDestinationContext');
const returnFunction = extractFunction('maybeReturnFromCompletedPrisonerDestination');
const hardRecoveryFunction = extractFunction('maybeRecoverStalledTransportContext');
const watcher = extractFunction('watchWorker');

assert.ok(
  watcher.indexOf('maybeReturnFromCompletedPrisonerDestination(context, href, radioRequests)') <
    watcher.indexOf('maybeRecoverStalledTransportContext(context, href, radioRequests)'),
  'the lightweight completed-destination return must run before generic hard recovery'
);
assert.match(
  hardRecoveryFunction,
  /isCompletedPrisonerDestinationContext\(context, href\)[\s\S]*!radioRequestForVehicle\(vehicleIdFromUrl\(href\), requests\)[\s\S]*return false;/,
  'the generic watchdog must not rebuild a cleared bare prisoner destination'
);
for (const unsafePattern of [/\.click\s*\(/, /createWorker\s*\(/, /removeWorker\s*\(/, /startTransportOnlyWorker\s*\(/]) {
  assert.doesNotMatch(returnFunction, unsafePattern, 'the completed return must reuse Worker A without page actions');
}

function createHarness({ now = 10_000, liveRequest = false, contextOverrides = {}, recoveryUrl } = {}) {
  const calls = { replaces: [], phases: [], logs: [], errors: [], recoveries: [] };
  const href = 'https://www.missionchief.co.uk/vehicles/7505698/gefangener/2591924';
  const context = {
    kind: 'PRISONER',
    prisonerPath: '/vehicles/7505698/gefangener/2591924',
    structuredPrisonerRequests: 0,
    cellSelectionAlerts: 0,
    greenPrisonDestinations: 0,
    releaseLinks: 0,
    releaseSuccessAlerts: 0,
    evidence: ['prisoner-route:/vehicles/7505698/gefangener/2591924'],
    ...contextOverrides,
  };
  const worker = {
    isConnected: true,
    contentWindow: {
      location: { replace(value) { calls.replaces.push(value); } },
    },
    src: href,
  };
  const state = {
    wanted: true,
    stopping: false,
    transportServiceActive: false,
    worker,
    transportSince: 3_000,
    currentMissionId: '259030749',
    currentMissionName: 'Demonstration against the construction of a motorway project',
    activeTransportEvent: { kind: 'PRISONER' },
    nonMissionRedirectRecoveries: 0,
    nonMissionRedirectRecoveryHistory: [],
    running: true,
    transportKind: 'PRISONER',
    transportIdentity: 'PRISONER:7505698:2591924',
    transportWarned: false,
    redirectFromMissionId: '',
    redirectTargetMissionId: '',
    lastPriorityRedirectAt: 0,
    currentMissionUrl: href,
  };
  const routePath = value => {
    try { return new URL(value, 'https://www.missionchief.co.uk').pathname; }
    catch { return ''; }
  };
  const sandbox = vm.createContext({
    Number,
    Boolean,
    String,
    Date: { now: () => now },
    state,
    COMPLETED_PRISONER_DESTINATION_RETURN_MS: 6_000,
    NON_MISSION_REDIRECT_RECOVERY_HISTORY_LIMIT: 40,
    exactPrisonerPath(value) {
      const path = routePath(value);
      return /^\/vehicles\/\d+\/gefangener\/\d+\/?$/.test(path) ? path : '';
    },
    vehicleIdFromUrl(value) { return routePath(value).match(/^\/vehicles\/(\d+)/)?.[1] || ''; },
    radioRequestForVehicle(vehicleId) {
      return liveRequest && vehicleId === '7505698' ? { vehicleId, missionId: '259030749' } : null;
    },
    sleepRecoveryMissionUrl() {
      return recoveryUrl === undefined
        ? 'https://www.missionchief.co.uk/missions/259030749'
        : recoveryUrl;
    },
    missionIdFromUrl(value) { return routePath(value).match(/^\/missions\/(\d+)/)?.[1] || ''; },
    transportContextIdentity: () => 'PRISONER:7505698:2591924',
    missionNameForId: () => state.currentMissionName,
    pathFromUrl: routePath,
    nowIso: () => '2026-08-24T20:55:30.000Z',
    recordTransportRecovery(event) { calls.recoveries.push(event); },
    endTransportEvent() { state.activeTransportEvent = null; },
    clearPostDispatchWatchdog() {},
    clearAutoRecoveryWatchdog() {},
    clearSharedV2QueueGuard() {},
    clearSharedV2AutoRunning() {},
    resetAutoStartTracking() {},
    clearPromotedWorkTracking() {},
    persistResumeMission() {},
    missionDisplay: (_id, name) => name,
    setPhase(...args) { calls.phases.push(args); },
    log(...args) { calls.logs.push(args); },
    setError(...args) { calls.errors.push(args); },
  });
  vm.runInContext(
    `${completedContextFunction}\n${returnFunction}\nthis.runReturn = maybeReturnFromCompletedPrisonerDestination;`,
    sandbox
  );
  return { calls, context, href, run: sandbox.runReturn, state, worker };
}

const completed = createHarness();
assert.equal(completed.run(completed.context, completed.href, []), true);
assert.deepEqual(
  completed.calls.replaces,
  ['https://www.missionchief.co.uk/missions/259030749'],
  'the diagnostic route must return the existing worker to the exact same mission'
);
assert.equal(completed.calls.recoveries[0]?.action, 'return-existing-worker-after-completed-prisoner-destination');
assert.equal(completed.state.transportKind, '');
assert.equal(completed.calls.errors.length, 0);
assert.equal(completed.worker.isConnected, true, 'Worker A must be preserved');

for (const variant of [
  { now: 8_999 },
  { liveRequest: true },
  { contextOverrides: { greenPrisonDestinations: 1 } },
  { contextOverrides: { releaseLinks: 1, cellSelectionAlerts: 1, prisonerPath: '' } },
]) {
  const guarded = createHarness(variant);
  assert.equal(guarded.run(guarded.context, guarded.href, []), false);
  assert.equal(guarded.calls.replaces.length, 0);
}

const wrongMission = createHarness({ recoveryUrl: 'https://www.missionchief.co.uk/missions/999' });
assert.equal(wrongMission.run(wrongMission.context, wrongMission.href, []), true);
assert.equal(wrongMission.calls.replaces.length, 0);
assert.equal(wrongMission.calls.errors.length, 1, 'a mismatched mission target must fail closed');

console.log('V3 completed prisoner destination return regression checks passed.');
