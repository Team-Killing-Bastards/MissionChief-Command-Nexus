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
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
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
  assert.fail(`${name} is unterminated`);
}

const manualFrame = extractFunction('isVisibleManualMissionFrame');
const observerGate = extractFunction(
  'shouldKeepMissionFinderObserverForCurrentFrame'
);
const reconcile = extractFunction('reconcileMissionFinderFrameRuntime');

function evaluateManualFrame({
  top = false,
  missionPage = true,
  managed = false,
  dormant = false,
  visible = true,
} = {}) {
  const context = vm.createContext({
    MF_IS_TOP_WINDOW: top,
    document: { body: {} },
    isMissionPage: () => missionPage,
    isMfV3ManagedActiveFrame: () => managed,
    mfV3DormantPreload: dormant,
    isMissionDocumentVisible: () => visible,
    result: null,
  });
  vm.runInContext(
    `${manualFrame}\nresult = isVisibleManualMissionFrame();`,
    context
  );
  return context.result;
}

assert.equal(
  evaluateManualFrame(),
  true,
  'a visible ordinary mission frame must retain the manual Mission Control overlay'
);
assert.equal(
  evaluateManualFrame({ visible: false }),
  false,
  'a genuinely hidden ordinary mission frame may yield its heavy runtime'
);
assert.equal(
  evaluateManualFrame({ managed: true }),
  false,
  'Worker A must continue through its separate sole-owner admission path'
);
assert.equal(
  evaluateManualFrame({ dormant: true }),
  false,
  'a dormant preload must never mount the manual overlay'
);

assert.ok(
  observerGate.indexOf('isVisibleManualMissionFrame()') >= 0,
  'the observer ownership gate must explicitly protect visible manual missions'
);
assert.ok(
  observerGate.indexOf('isVisibleManualMissionFrame()') <
    observerGate.indexOf('getPrimaryMissionRequirementDocument()'),
  'visible manual missions must be protected before cross-frame ranking'
);
assert.ok(
  reconcile.indexOf('shouldKeepMissionFinderObserverForCurrentFrame()') <
    reconcile.indexOf('suspendMissionFinderRuntimeForInactiveFrame(reason)'),
  'runtime suspension must remain behind the protected observer gate'
);

for (const controlId of [
  'unit-finder-box',
  'mission-update-box',
  'mf-ally-steal',
  'dispatch-box',
  'dispatch-share-box',
  'auto-mode-box',
]) {
  assert.ok(
    source.includes(`.id = '${controlId}'`),
    `the visible Mission Control overlay lost #${controlId}`
  );
}

console.log('Visible mission overlay and manual workflow contract checks passed.');
