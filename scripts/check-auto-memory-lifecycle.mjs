#!/usr/bin/env node
import fs from 'node:fs';

// Permanent regression for bounded Auto Mode timer, frame and cache ownership.
// This test is intentionally dispatch-agnostic so matching behaviour stays unchanged.
const source = fs.readFileSync('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) fail(`Missing function ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;

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
      if (blockEnd < 0) fail(`Unclosed comment in ${name}`);
      index = blockEnd + 1;
      continue;
    }

    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract ${name}`);
}

expect(source.includes('// @version      1.0.58'), 'Expected Command Nexus 1.0.58');
expect(source.includes('MISSION FINDER V10.6.121'), 'Expected Mission Finder V10.6.121');

const startCollector = extractFunction('startMissionEventCollectibleCollector');
expect(startCollector.includes('!MF_IS_TOP_WINDOW'), 'Collectible scanner must be top-window only');
expect(startCollector.includes('mfEventCollectibleScanTimer !== null'), 'Collector must retain its single-owner timer guard');
expect(startCollector.includes('window.setInterval'), 'Collector interval is missing');

const stopCollector = extractFunction('stopMissionEventCollectibleCollector');
expect(stopCollector.includes('window.clearInterval'), 'Collector timer must be cleared');
expect(stopCollector.includes('mfEventCollectibleScanTimer = null'), 'Collector timer handle must be released');
expect(stopCollector.includes('mfEventCollectibleClaimTimes.clear()'), 'Collector claim cache must be cleared');

const topWindowIndex = source.indexOf('const MF_IS_TOP_WINDOW =');
const duplicateGuardIndex = source.indexOf('if (window.missionFinder2026Initialized) return;');
const firstStartupIndex = source.indexOf('startMissionEventCollectibleCollector();');
expect(topWindowIndex >= 0 && duplicateGuardIndex > topWindowIndex, 'Top-window and duplicate guards were not found in order');
expect(firstStartupIndex > duplicateGuardIndex, 'Collector must start only after the duplicate-instance guard');

const cleanupRuntime = extractFunction('cleanupMissionFinderRuntime');
expect(cleanupRuntime.includes('stopMissionEventCollectibleCollector();'), 'Runtime cleanup must stop the collector');

const pageHide = source.slice(
  source.indexOf('mfRuntimePageHideHandler = event =>'),
  source.indexOf('mfRuntimePageShowHandler = event =>')
);
expect(pageHide.includes('stopMissionEventCollectibleCollector();'), 'bfcache suspension must stop the collector');

const reconcile = extractFunction('reconcileMissionFinderAfterPageShow');
expect(reconcile.includes('startMissionEventCollectibleCollector();'), 'bfcache restoration must restart the collector');

const memoryDiagnostics = extractFunction('mfCollectMemoryDiagnostics');
for (const token of [
  'performance.memory',
  'eventCollectorTimerActive',
  'detachedCachedVehicleCheckboxes',
  'accessibleCount',
  'totalElements',
  'totalVehicleCheckboxes',
  'hiddenOwnerFrames',
  'detachedOwnerFrames',
]) {
  expect(memoryDiagnostics.includes(token), `Memory diagnostics missing ${token}`);
}

const exportFunction = extractFunction('exportUnitFinderDiagnostics');
expect(exportFunction.includes('memoryDiagnostics:'), 'Diagnostic export must include memory evidence');
expect(exportFunction.includes('mfCollectMemoryDiagnostics()'), 'Diagnostic export must collect memory evidence on demand');

const collectorIntervals = (startCollector.match(/setInterval/g) || []).length;
expect(collectorIntervals === 1, `Expected one collector interval, found ${collectorIntervals}`);

console.log('Auto Mode memory lifecycle and diagnostic checks passed.');
