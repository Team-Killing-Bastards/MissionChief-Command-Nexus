#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

assert.match(
  source,
  /let autoModeRunning\s*=\s*!mfV3DormantPreload\s*&&/,
  'dormant preloads must not inherit shared Auto Mode running state'
);
assert.match(
  source,
  /function startMissionFinderObserver\(\)\s*\{\s*if \(mfV3DormantPreload\) return;/,
  'the Mission Finder runtime must fail closed while a V3 preload is dormant'
);
assert.match(
  source,
  /if \(mfV3DormantPreload\)\s*\{\s*installMfV3DormantPreloadBridge\(\);\s*\} else if \(document\.body\)/,
  'dormant startup must install only the promotion bridge instead of the observer'
);
assert.match(
  source,
  /!activationToken[\s\S]*expectedMissionId !== currentMissionId[\s\S]*MF_V3_ACTIVE_NAME_PREFIX[\s\S]*!ownsOperationalState/,
  'promotion must require a token, the expected mission, an active frame name and sole storage ownership'
);

const blockStart = source.indexOf(
  '    function getMfV3DormantPreloadMissionId()'
);
const blockEnd = source.indexOf(
  '\n    if (mfV3DormantPreload) {',
  blockStart
);
assert.ok(blockStart >= 0 && blockEnd > blockStart, 'dormant bridge implementation was found');

const bridgeSource = source.slice(blockStart, blockEnd);
let observerStarts = 0;
let alertInstalls = 0;
let cleanups = 0;
let ownsOperationalState = false;

const windowObject = {
  name: 'mcn-v3-pipeline-preload-test',
  location: { pathname: '/missions/123' },
  __MCN_V3_FRAME_OWNERSHIP_BRIDGE__: {
    isActive() {
      return ownsOperationalState;
    },
  },
};
const context = vm.createContext({
  window: windowObject,
  document: {
    body: {},
    addEventListener() {},
    getElementById() {
      return null;
    },
  },
  MF_V3_DORMANT_PRELOAD_BRIDGE_KEY: '__testDormantBridge',
  MF_V3_ACTIVE_NAME_PREFIX: 'mcn-v3-active-worker-',
  mfV3DormantPreload: true,
  mfV3DormantPreloadPromoted: false,
  mfV3DormantPreloadPromotedAt: 0,
  mfV3DormantPreloadPromotionSource: '',
  mfMainMutationObserver: null,
  autoModeRunning: true,
  installMissionFinderAlertOverride() {
    alertInstalls += 1;
  },
  startMissionFinderObserver() {
    observerStarts += 1;
  },
  cleanupMissionFinderRuntime() {
    cleanups += 1;
  },
});

vm.runInContext(
  `${bridgeSource}\nthis.__bridgeInstaller = installMfV3DormantPreloadBridge;`,
  context,
  { filename: 'dormant-preload-bridge-extract.js' }
);

const bridge = context.__bridgeInstaller();
assert.ok(bridge, 'a dormant preload exposes the V2 promotion bridge');
assert.equal(bridge.isDormant(), true);
assert.equal(bridge.isPromoted(), false);
assert.equal(observerStarts, 0, 'installing the bridge alone does not start Mission Finder');

windowObject.name = 'mcn-v3-active-worker-test';
assert.equal(
  bridge.promote({ expectedMissionId: '123' }),
  false,
  'a missing activation token is rejected'
);
assert.equal(
  bridge.promote({ activationToken: 'token', expectedMissionId: '999' }),
  false,
  'a mission mismatch is rejected'
);
assert.equal(
  bridge.promote({ activationToken: 'token', expectedMissionId: '123' }),
  false,
  'promotion is rejected until V3 grants storage ownership'
);

ownsOperationalState = true;
assert.equal(
  bridge.promote({
    activationToken: 'token',
    expectedMissionId: '123',
    source: 'regression-test',
  }),
  true,
  'the exact sole-owner mission can be promoted'
);
assert.equal(bridge.isDormant(), false);
assert.equal(bridge.isPromoted(), true);
assert.equal(observerStarts, 1, 'promotion starts Mission Finder exactly once');
assert.equal(alertInstalls, 1, 'promotion installs frame-local alert handling');
assert.equal(cleanups, 0, 'the successful promotion path does not need rollback cleanup');
assert.equal(
  bridge.promote({ activationToken: 'again', expectedMissionId: '123' }),
  true,
  'promotion is idempotent for the same mission'
);
assert.equal(observerStarts, 1, 'idempotent promotion does not start a second runtime');

console.log('V3 native dormant-preload lifecycle regression passed.');
