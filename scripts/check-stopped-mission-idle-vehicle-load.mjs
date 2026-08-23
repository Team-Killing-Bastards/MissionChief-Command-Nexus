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

const initialize = extractFunction('initialize');

assert.match(
  initialize,
  /if\s*\(\s*!autoModeRunning\s*\)/,
  'stopped mission initialization must have an explicit idle branch'
);
assert.match(
  initialize,
  /STOPPED MISSION IDLE/,
  'stopped mission initialization must retain an auditable idle marker'
);
assert.doesNotMatch(
  initialize,
  /ensureVehicleListLoaded|clickVehicleDisplayBarImmediately/,
  'opening a stopped mission must not expand the complete vehicle list'
);
assert.ok(
  !source.includes('function clickVehicleDisplayBarImmediately('),
  'the obsolete automatic mission-start vehicle loader must stay removed'
);

function exerciseInitialize(autoModeRunning) {
  const calls = [];
  const context = vm.createContext({
    autoModeRunning,
    document: {
      getElementById: () => null
    },
    isMissionPage: () => true,
    claimCurrentMissionExecutionOwnership: () => true,
    synchroniseMissionInstanceState: () => calls.push('sync'),
    cleanupDuplicatePanels: () => calls.push('cleanup'),
    scheduleMissionFinderIphoneNativePickerSync: () => calls.push('iphone-sync'),
    createControlPanel: () => calls.push('panel'),
    readAllyStealPendingState: () => false,
    readAutoAdvanceAfterDispatchState: () => false,
    updateStatusBox: () => {},
    resumeAllyStealAfterDispatchRefresh: () => {},
    resumeAutoAdvanceAfterDispatch: () => {},
    setTimeout: () => {},
    mfDebugEnabled: false,
    debugLog: () => {},
    requireMissionUpdateFirstPass: () => calls.push('auto-precheck')
  });

  vm.runInContext(`${initialize}\ninitialize();`, context);
  return calls;
}

const stoppedCalls = exerciseInitialize(false);
assert.ok(stoppedCalls.includes('panel'), 'manual mission controls must still mount while stopped');
assert.ok(
  !stoppedCalls.includes('auto-precheck'),
  'stopped mission initialization must not start the Auto Mode precheck'
);

const activeCalls = exerciseInitialize(true);
assert.ok(activeCalls.includes('panel'), 'active mission controls must still mount');
assert.ok(
  activeCalls.includes('auto-precheck'),
  'active Auto Mode must retain its mission-update-first precheck'
);

const unitFinder = extractFunction('handleCombinedLogic');
assert.match(
  unitFinder,
  /await ensureVehicleListLoaded\s*\(/,
  'manual Unit Finder must still load the complete vehicle list on demand'
);

const allySteal = extractFunction('handleAllySteal');
assert.match(
  allySteal,
  /await ensureVehicleListLoaded\s*\(/,
  'manual Ally Steal must still load the complete vehicle list on demand'
);

const missionUpdateStart = source.indexOf(
  "const missionUpdateBtn = document.createElement('button');"
);
const missionUpdateEnd = source.indexOf(
  "const dispatchBtn = document.createElement('button');",
  missionUpdateStart
);
assert.ok(
  missionUpdateStart >= 0 && missionUpdateEnd > missionUpdateStart,
  'manual Mission Update handler must exist'
);
assert.match(
  source.slice(missionUpdateStart, missionUpdateEnd),
  /await ensureVehicleListLoaded\s*\(/,
  'manual Mission Update must still load the complete vehicle list on demand'
);

console.log(
  'PASS: stopped mission startup stays idle while Unit Finder, Mission Update, Ally Steal and active Auto Mode retain on-demand loading.'
);
