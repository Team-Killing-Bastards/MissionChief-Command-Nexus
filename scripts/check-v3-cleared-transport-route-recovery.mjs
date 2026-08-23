#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

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
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  assert.fail(`${name} is unterminated`);
}

const recoveryFunction = extractFunction(
  'maybeRecoverStalledNonMissionRedirect'
);

assert.match(
  recoveryFunction,
  /radioRequestForVehicle\(routeVehicleId, state\.radioTransportRequests\)/,
  'vehicle-page recovery must verify that the exact personal Radio request cleared'
);
assert.doesNotMatch(
  recoveryFunction,
  /isMissionUrl\(href\) \|\|\s*vehicleIdFromUrl\(href\) \|\|/,
  'a cleared vehicle route must not be excluded unconditionally'
);
assert.doesNotMatch(
  recoveryFunction,
  /\.click\s*\(/,
  'redirect recovery must never click Dispatch or a transport destination'
);

function createHarness({
  href = 'https://www.missionchief.co.uk/vehicles/7626867',
  now = 20_000,
  redirectAt = 1_000,
  contextKind = '',
  liveRequest = null,
  transportServiceActive = false
} = {}) {
  const timers = [];
  const calls = {
    createWorker: [],
    errors: [],
    logs: [],
    phases: []
  };
  const state = {
    wanted: true,
    stopping: false,
    transportServiceActive,
    nonMissionRedirectRecoveryInFlight: false,
    redirectTargetMissionId: '258907242',
    lastPriorityRedirectAt: redirectAt,
    currentMissionUrl: href,
    storedResumeMissionUrl: '',
    bootstrapMissionUrl: '',
    topMission: {
      missionId: '258907242',
      url: 'https://www.missionchief.co.uk/missions/258907242'
    },
    visualTopMission: null,
    radioTransportRequests: liveRequest ? [liveRequest] : [],
    nonMissionRedirectRecoveries: 0,
    nonMissionRedirectRecoveryHistory: [],
    workerDocumentSerial: 391,
    workerGeneration: 130,
    phase: 'TRANSPORT_WARN',
    running: false
  };

  const context = vm.createContext({
    state,
    href,
    doc: { readyState: 'complete' },
    transportContext: { kind: contextKind },
    Date: { now: () => now },
    NON_MISSION_REDIRECT_RECOVERY_MS: 10_000,
    NON_MISSION_REDIRECT_RECOVERY_HISTORY_LIMIT: 40,
    window: {
      setTimeout(callback, delay) {
        timers.push({ callback, delay });
        return { callback, delay };
      }
    },
    vehicleIdFromUrl(value) {
      return String(value).match(/\/vehicles\/(\d+)/)?.[1] || '';
    },
    radioRequestForVehicle(vehicleId, requests) {
      return (requests || []).find(request => request.vehicleId === vehicleId) || null;
    },
    isMissionUrl(value) {
      return /\/missions\/\d+/.test(String(value));
    },
    pendingRedirectRecoveryMissionUrl() {
      return 'https://www.missionchief.co.uk/missions/258907242';
    },
    missionIdFromUrl(value) {
      return String(value).match(/\/missions\/(\d+)/)?.[1] || '';
    },
    pathFromUrl(value) {
      return new URL(value).pathname;
    },
    nowIso: () => '2026-08-23T16:13:21.935Z',
    missionNameForId: () => 'Smoke Inhalation (caused by University halls fire (Major))',
    readSharedV2QueueGuardState: () => ({}),
    resetAutoStartTracking: () => {},
    clearPromotedWorkTracking: () => {},
    clearAutoRecoveryWatchdog: () => {},
    clearSharedV2AutoRunning: () => {},
    clearSharedV2QueueGuard: () => {},
    clearTransportServiceState: () => {},
    resetPriorityPending: () => {},
    pausePipelineController: () => {},
    persistResumeMission: () => {},
    pipelineRecord: () => {},
    missionDisplay: missionId => `M${missionId}`,
    setPhase(phase, status, detail) {
      calls.phases.push({ phase, status, detail });
    },
    log(message, event) {
      calls.logs.push({ message, event });
    },
    setError(status, detail) {
      calls.errors.push({ status, detail });
    },
    createWorker(url) {
      calls.createWorker.push(url);
    }
  });

  vm.runInContext(
    `${recoveryFunction}\nthis.result = maybeRecoverStalledNonMissionRedirect(doc, href, transportContext);`,
    context
  );

  return {
    calls,
    result: context.result,
    state,
    runRecoveryTimer() {
      const timer = timers.find(item => item.delay === 120);
      assert.ok(timer, 'expected the bounded 120ms recovery handoff');
      timer.callback();
    }
  };
}

const clearedTransport = createHarness();
assert.equal(
  clearedTransport.result,
  true,
  'a cleared patient vehicle route must recover after the pending mission redirect stalls'
);
assert.equal(clearedTransport.state.nonMissionRedirectRecoveries, 1);
assert.equal(
  clearedTransport.state.nonMissionRedirectRecoveryHistory[0].observedVehicleId,
  '7626867'
);
assert.equal(
  clearedTransport.state.nonMissionRedirectRecoveryHistory[0].routeRequestCleared,
  true
);
clearedTransport.runRecoveryTimer();
assert.deepEqual(
  clearedTransport.calls.createWorker,
  ['https://www.missionchief.co.uk/missions/258907242'],
  'recovery must rebuild only the exact pending mission'
);
assert.deepEqual(clearedTransport.calls.errors, []);

const activePatientSelection = createHarness({ contextKind: 'PATIENT' });
assert.equal(
  activePatientSelection.result,
  false,
  'an active patient destination handoff must remain owned by the transport flow'
);

const unclearedRequest = createHarness({
  liveRequest: {
    key: '7626867:258905868',
    vehicleId: '7626867',
    missionId: '258905868'
  }
});
assert.equal(
  unclearedRequest.result,
  false,
  'a vehicle with an uncleared personal Radio request must not be redirected'
);

const balancedTransport = createHarness({ transportServiceActive: true });
assert.equal(
  balancedTransport.result,
  false,
  'the balanced personal transport service must not be interrupted'
);

const redirectStillInFlight = createHarness({ now: 9_000, redirectAt: 1_000 });
assert.equal(
  redirectStillInFlight.result,
  false,
  'the existing redirect must retain its bounded settle window'
);

console.log(
  'PASS: cleared transport vehicle pages recover the exact pending mission while active patient/prisoner work remains protected.'
);
