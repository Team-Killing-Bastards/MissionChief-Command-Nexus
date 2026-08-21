#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) {
    fail(`Missing runtime-hardening contract: ${label}`);
  }
}

function requirePattern(pattern, label) {
  if (!pattern.test(source)) {
    fail(`Missing runtime-hardening contract: ${label}`);
  }
}

function extractSimpleFunction(name) {
  const pattern = new RegExp(
    `function ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n    \\}`
  );
  const match = source.match(pattern);
  if (!match) {
    fail(`Unable to extract ${name}`);
  }

  try {
    return Function(
      `"use strict"; ${match[0]}; return ${name};`
    )();
  } catch (error) {
    fail(`Unable to evaluate ${name}: ${error.message}`);
  }
}

requireText(
  'function syncNamingToolsPanelLifecycle(',
  'single Resource Administration lifecycle reconciler'
);
requireText(
  'function isRenderedStationOverviewEntry(',
  'strict rendered Stations evidence'
);
requireText(
  'function shouldIgnoreMissionFinderMutationRecord(',
  'Mission Finder owned-panel mutation filter'
);
requireText(
  'function shouldPreserveMissionFinderRuntimeOnPageHide(',
  'Safari bfcache pagehide decision'
);
requireText(
  'function reconcileMissionFinderAfterPageShow(',
  'Safari bfcache pageshow reconciliation'
);
requireText(
  'mfPersonnelRegistryUpdatedHandler',
  'named personnel registry listener owner'
);
requireText(
  "window.removeEventListener(\n                'mc-personnel-training-registry-updated'",
  'personnel registry listener teardown'
);
requirePattern(
  /function initWhenReady\(\)[\s\S]{0,600}installSingleNamingToolsPanelGuard\(\);[\s\S]{0,600}if \(isIosSafariWebsite\(\)\)/,
  'single iOS guard replacing the readiness observer'
);
requirePattern(
  /function installSingleNamingToolsPanelGuard\(\)[\s\S]{0,9000}MutationObserver[\s\S]{0,9000}handleNavigationClick[\s\S]{0,9000}TOOL_LIFECYCLE_CLEANUPS\.delete\(cleanup\)/,
  'coalesced and cleanable Resource Administration guard'
);
requirePattern(
  /function classifyMissionFinderMutations\(records\)[\s\S]{0,9000}shouldIgnoreMissionFinderMutationRecord\([\s\S]{0,9000}changedNodes\.forEach\(inspectNode\)/,
  'self-mutation exclusion applied before classification'
);
requirePattern(
  /function installMissionFinderRuntimeCleanup\(\)[\s\S]{0,5000}pagehide[\s\S]{0,5000}pageshow/,
  'owned pagehide and pageshow listeners'
);

if (source.includes('installSingleNamingToolsPanelGuard(panel)')) {
  fail('Per-panel global lifecycle guard must not remain');
}

const embeddedStart = source.indexOf(
  '/* Complete embedded Command Nexus starts at the former document-end boundary. */'
);
if (embeddedStart < 0) fail('Embedded Command Nexus boundary missing');
const v3ObserverCount =
  (source.slice(0, embeddedStart).match(/new\s+MutationObserver\s*\(/g) || []).length;
const embeddedObserverCount =
  (source.slice(embeddedStart).match(/new\s+MutationObserver\s*\(/g) || []).length;
if (v3ObserverCount !== 2 || embeddedObserverCount !== 2) {
  fail(
    `Expected two bounded V3 observers and two retained engine observers; ` +
    `found V3=${v3ObserverCount}, embedded=${embeddedObserverCount}`
  );
}

const decideNamingToolsPanelLifecycle =
  extractSimpleFunction('decideNamingToolsPanelLifecycle');
const panelCases = [
  { input: [false, false, false], expected: 'wait' },
  { input: [false, true, false], expected: 'wait' },
  { input: [false, true, true], expected: 'dedupe' },
  { input: [true, false, false], expected: 'wait' },
  { input: [true, false, true], expected: 'hide' },
  { input: [true, true, false], expected: 'create' },
  { input: [true, true, true], expected: 'show' }
];
for (const testCase of panelCases) {
  const actual = decideNamingToolsPanelLifecycle(...testCase.input);
  if (actual !== testCase.expected) {
    fail(
      `Panel lifecycle ${JSON.stringify(testCase.input)} expected ` +
      `${testCase.expected}; found ${actual}`
    );
  }
}

const shouldIgnoreMissionFinderMutationRecord =
  extractSimpleFunction('shouldIgnoreMissionFinderMutationRecord');
const mutationCases = [
  { input: [false, false], expected: false },
  { input: [false, true], expected: false },
  { input: [true, false], expected: true },
  { input: [true, true], expected: false }
];
for (const testCase of mutationCases) {
  const actual = shouldIgnoreMissionFinderMutationRecord(...testCase.input);
  if (actual !== testCase.expected) {
    fail(
      `Mutation ownership ${JSON.stringify(testCase.input)} expected ` +
      `${testCase.expected}; found ${actual}`
    );
  }
}

const shouldPreserveMissionFinderRuntimeOnPageHide =
  extractSimpleFunction('shouldPreserveMissionFinderRuntimeOnPageHide');
if (shouldPreserveMissionFinderRuntimeOnPageHide(true) !== true) {
  fail('Persisted pagehide must preserve Mission Finder runtime');
}
if (shouldPreserveMissionFinderRuntimeOnPageHide(false) !== false) {
  fail('Normal pagehide must clean Mission Finder runtime');
}

console.log('Runtime performance and lifecycle hardening checks passed.');
