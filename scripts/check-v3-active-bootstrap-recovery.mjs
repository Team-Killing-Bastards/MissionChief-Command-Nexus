#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function extractFunction(name) {
  const markers = [`function ${name}(`, `async function ${name}(`];
  const starts = markers
    .map(marker => source.indexOf(marker))
    .filter(index => index >= 0);

  assert.ok(starts.length > 0, `${name} must exist`);

  const start = Math.min(...starts);
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
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  assert.fail(`${name} is unterminated`);
}

const confirmCurrentDocumentAutoMode = extractFunction(
  'confirmCurrentDocumentAutoMode'
);
const waitForNexusAndStart = extractFunction('waitForNexusAndStart');

assert.match(
  source,
  /const ACTIVE_BOOTSTRAP_RESCUE_LIMIT_PER_MISSION = 1;/,
  'bootstrap recovery must be bounded per mission incident'
);
assert.doesNotMatch(
  source,
  /const ACTIVE_BOOTSTRAP_RESCUE_LIMIT =/,
  'the former run-wide bootstrap rescue cap must stay removed'
);
assert.match(
  confirmCurrentDocumentAutoMode,
  /clearTimer\('nexusDiscoveryTimer'\);/,
  'confirming Auto Mode must cancel stale discovery work'
);
assert.match(
  confirmCurrentDocumentAutoMode,
  /activeBootstrapRescueMissionId = '';/,
  'confirming Auto Mode must close the current bootstrap incident'
);
assert.doesNotMatch(
  waitForNexusAndStart,
  /\.click\s*\(/,
  'bootstrap recovery must never issue a dispatch or UI click'
);
for (const token of [
  'window.__MCN_BOOT_TRACE__',
  "window.addEventListener('error'",
  "window.addEventListener('unhandledrejection'",
  "globalThis.__MCN_BOOT_MARK__?.('heavy-runtime-admitted')",
  "globalThis.__MCN_BOOT_MARK__?.('mission-control-mounted')",
  'state.activeBootstrapHistory.push(event)',
  'compactControllerEphemeralMemory()',
  'CONTROLLER_RECYCLE_RESTART_DELAY_MS',
]) assert.ok(source.includes(token), `bootstrap evidence/recovery contract lost: ${token}`);
assert.ok(
  waitForNexusAndStart.indexOf('removeWorker(false)') <
    waitForNexusAndStart.indexOf('createWorker(rescueUrl)'),
  'the retry must release Worker A before creating its clean replacement'
);

function createHarness({
  href,
  rescueMissionId = '',
  rescueAttempts = 0,
  totalRescues = 0,
  now = 0
}) {
  const frame = { href, isConnected: true, contentWindow: { __MCN_BOOT_TRACE__: { events: [{ stage: 'embedded-start' }] } } };
  const timers = [];
  const calls = {
    createWorker: [],
    errors: [],
    ownership: 0,
    watcher: 0
  };
  const state = {
    wanted: true,
    workerGeneration: 9,
    worker: frame,
    nexusDiscoveryTimer: null,
    activeBootstrapRescueMissionId: rescueMissionId,
    activeBootstrapRescueAttempts: rescueAttempts,
    activeBootstrapRescues: totalRescues,
    activeBootstrapHistory: [],
    stopping: false,
    currentMissionUrl: href,
    bootstrapMissionUrl: href,
    currentMissionName: 'Regression mission'
  };

  const context = vm.createContext({
    frame,
    generation: 9,
    state,
    Date: { now: () => now },
    ACTIVE_BOOTSTRAP_RESCUE_AFTER_MS: 6500,
    ACTIVE_BOOTSTRAP_RESCUE_LIMIT_PER_MISSION: 1,
    NEXUS_DISCOVERY_TIMEOUT_MS: 22000,
    CONTROLLER_RECYCLE_RESTART_DELAY_MS: 900,
    PROMOTION_RECOVERY_HISTORY_LIMIT: 30,
    MISSION_FINDER_VERSION: '10.6.177',
    window: {
      setTimeout(callback, delay) {
        const timer = { callback, delay };
        timers.push(timer);
        return timer;
      }
    },
    clearTimer(name) {
      state[name] = null;
    },
    getWorkerHref: worker => worker.href,
    missionIdFromUrl: value =>
      String(value).match(/\/missions\/(\d+)/)?.[1] || '',
    ensureActiveWorkerOwnership() {
      calls.ownership += 1;
      return true;
    },
    getWorkerDocument: () => ({ readyState: 'complete' }),
    nowIso: () => '2026-08-25T00:00:00.000Z',
    adoptWorkerDocument: () => {},
    maybeRecoverStaleCanonicalMissionWorker: () => false,
    applyAirfieldOperationsSupervisorCrossRef: () => {},
    installAirfieldOperationsSupervisorObservers: () => {},
    maybeRedirectSkippedMissionBeforeAuto: () => false,
    findAutoModeControl: () => null,
    elementLabel: () => '',
    startExistingAutoMode: () => {},
    startWatcher() {
      calls.watcher += 1;
    },
    setError(status, detail) {
      calls.errors.push({ status, detail });
    },
    log: () => {},
    pausePipelineController: () => {},
    compactControllerEphemeralMemory: () => {},
    removeWorker() {
      frame.isConnected = false;
      state.worker = null;
      state.workerGeneration += 1;
    },
    createWorker(url) {
      calls.createWorker.push(url);
    }
  });

  vm.runInContext(
    `${waitForNexusAndStart}\nwaitForNexusAndStart(frame, generation);`,
    context
  );

  return {
    calls,
    frame,
    state,
    timers,
    setNow(value) {
      now = value;
    },
    runTimer(delay) {
      const index = timers.findIndex(timer => timer.delay === delay);
      assert.ok(index >= 0, `expected a ${delay}ms timer`);
      const [timer] = timers.splice(index, 1);
      timer.callback();
    }
  };
}

const transport = createHarness({
  href: 'https://www.missionchief.co.uk/vehicles/7602860',
  rescueMissionId: '258882842',
  rescueAttempts: 1,
  totalRescues: 1
});

assert.equal(
  transport.calls.ownership,
  0,
  'a stale discovery timer must leave a transport page before mission ownership work'
);
assert.equal(
  transport.calls.watcher,
  1,
  'transport navigation must return control to the route watcher'
);
assert.equal(
  transport.state.activeBootstrapRescueMissionId,
  '',
  'transport navigation must not retain a mission-bootstrap incident'
);
assert.equal(
  transport.state.activeBootstrapRescueAttempts,
  0,
  'transport navigation must not spend a bootstrap recovery attempt'
);
assert.deepEqual(
  transport.calls.createWorker,
  [],
  'transport navigation must never trigger a mission reload'
);
assert.deepEqual(
  transport.calls.errors,
  [],
  'transport navigation must never raise a missing-Mission-Finder error'
);

const firstMission = createHarness({
  href: 'https://www.missionchief.co.uk/missions/258882842',
  totalRescues: 4
});
firstMission.setNow(7000);
firstMission.runTimer(150);

assert.equal(
  firstMission.state.activeBootstrapRescueMissionId,
  '258882842',
  'a genuine bootstrap recovery must be tied to its exact mission'
);
assert.equal(
  firstMission.state.activeBootstrapRescueAttempts,
  1,
  'a genuine mission gets one bounded bootstrap reload'
);
assert.equal(
  firstMission.state.activeBootstrapRescues,
  5,
  'lifetime rescue telemetry must remain cumulative without acting as a cap'
);
assert.equal(firstMission.state.activeBootstrapHistory.length, 1);
assert.equal(firstMission.state.activeBootstrapHistory[0].trace.events[0].stage, 'embedded-start');
firstMission.runTimer(120);
assert.deepEqual(firstMission.calls.createWorker, [], 'clean recovery must leave a worker-free reclamation gap');
firstMission.runTimer(900);
assert.deepEqual(
  firstMission.calls.createWorker,
  ['https://www.missionchief.co.uk/missions/258882842'],
  'bootstrap recovery must reload only the exact mission route'
);

const routeChangedDuringRescue = createHarness({
  href: 'https://www.missionchief.co.uk/missions/258882842'
});
routeChangedDuringRescue.setNow(7000);
routeChangedDuringRescue.runTimer(150);
routeChangedDuringRescue.frame.href =
  'https://www.missionchief.co.uk/vehicles/7602860';
routeChangedDuringRescue.runTimer(120);

assert.deepEqual(
  routeChangedDuringRescue.calls.createWorker,
  [],
  'a transport navigation during the reload handoff must cancel mission recovery'
);
assert.equal(
  routeChangedDuringRescue.calls.watcher,
  1,
  'a changed route during the reload handoff must return to the watcher'
);
assert.equal(
  routeChangedDuringRescue.state.activeBootstrapRescueAttempts,
  0,
  'an aborted reload handoff must close its bootstrap incident'
);

const sameMission = createHarness({
  href: 'https://www.missionchief.co.uk/missions/258882842',
  rescueMissionId: '258882842',
  rescueAttempts: 1,
  totalRescues: 5,
  now: 7000
});
sameMission.setNow(30000);
sameMission.runTimer(150);

assert.equal(
  sameMission.state.activeBootstrapRescues,
  5,
  'the same mission incident must not receive a second reload'
);
assert.deepEqual(
  sameMission.calls.createWorker,
  [],
  'the same mission incident must remain single-reload bounded'
);
assert.equal(
  sameMission.calls.errors.length,
  1,
  'a mission that still cannot mount after its bounded reload must fail closed'
);

const nextMission = createHarness({
  href: 'https://www.missionchief.co.uk/missions/258882999',
  rescueMissionId: '258882842',
  rescueAttempts: 1,
  totalRescues: 5,
  now: 30000
});
nextMission.setNow(37000);
nextMission.runTimer(150);

assert.equal(
  nextMission.state.activeBootstrapRescueMissionId,
  '258882999',
  'a different mission must open a fresh bootstrap incident'
);
assert.equal(
  nextMission.state.activeBootstrapRescueAttempts,
  1,
  'a different mission must receive its own bounded recovery attempt'
);
assert.equal(
  nextMission.state.activeBootstrapRescues,
  6,
  'a prior mission rescue must not block recovery of a later mission'
);

console.log(
  'PASS: stale discovery exits transport pages, confirmed Auto Mode cancels discovery, and bootstrap reloads are bounded per exact mission incident.'
);
