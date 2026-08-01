#!/usr/bin/env node
import fs from 'node:fs';

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

expect(source.includes('// @version      1.0.75'), 'Expected Command Nexus 1.0.75');
expect(source.includes('MISSION FINDER V10.6.138'), 'Expected Mission Finder V10.6.138');
expect(source.includes('640 * 1024 * 1024'), 'Expected the 640 MiB high-heap threshold');
expect(source.includes('4 * 60 * 1000'), 'Expected a bounded recycle cooldown');

const suspendRuntime = extractFunction('suspendMissionFinderRuntimeForPageHide');
for (const token of [
  'mfMainMutationObserver.disconnect()',
  'mfMainMutationObserver = null',
  'stopSessionRuntimeTicker()',
  'stopMissionFinderRuntimeMemoryMaintenance()',
  'stopMissionEventCollectibleCollector()',
  'stopBackgroundWatcherIntervalsOnly()',
  'invalidateVehicleCheckboxCache()',
  'invalidateMissionContextCaches()',
  'invalidateTransportCaches()',
  'mfVehicleMatchCandidateCache.clear()',
  'mfRuntimeSuspendedForPageHide = true',
]) {
  expect(suspendRuntime.includes(token), `Runtime suspension missing ${token}`);
}

const cleanupInstall = extractFunction('installMissionFinderRuntimeCleanup');
expect(
  cleanupInstall.includes("suspendMissionFinderRuntimeForPageHide(\n                    'browser back-forward cache pagehide'"),
  'Persisted pagehide must suspend the complete runtime'
);

const reconcile = extractFunction('reconcileMissionFinderAfterPageShow');
expect(reconcile.includes('mfRuntimeSuspendedForPageHide = false'), 'pageshow must clear suspended state');
expect(reconcile.includes('startMissionEventCollectibleCollector()'), 'pageshow must restart the collector');
expect(reconcile.includes('startMissionFinderObserver()'), 'pageshow must restore the main observer');
expect(reconcile.includes('startSessionRuntimeTicker()'), 'pageshow must restore the session ticker');
expect(reconcile.includes('startMissionFinderRuntimeMemoryMaintenance()'), 'pageshow must restore memory maintenance');

const guard = extractFunction('shouldRecycleAutoMissionMemoryBeforeSelection');
for (const token of [
  'vehicleLoadState.ready',
  'processedSelectionKeys.size > 0',
  'hasSelectedMissionVehiclesForMemoryRecycle()',
  'readAutoAdvanceAfterDispatchState()',
  'readAllyStealPendingState()',
  'readAutoPostDispatchUpgradeState()',
  'isPostTransportRehookPending()',
  'MF_AUTO_MEMORY_RECYCLE_HEAP_THRESHOLD_BYTES',
  'MF_AUTO_MEMORY_RECYCLE_COOLDOWN_MS',
]) {
  expect(guard.includes(token), `Memory recycle guard missing ${token}`);
}

const requestAutoRecycle = extractFunction('requestAutoMissionMemoryRecycle');
expect(
  requestAutoRecycle.includes('requestMissionFinderMemoryRecycle('),
  'Auto recycle must delegate to the shared guarded frame recycle'
);
expect(requestAutoRecycle.includes('true'), 'Auto recycle must request Auto Mode resume');

const requestRecycle = extractFunction('requestMissionFinderMemoryRecycle');
expect(requestRecycle.includes('window.location.replace(href)'), 'Memory recycle must replace the current mission frame');
expect(requestRecycle.includes('resumePending:'), 'Memory recycle must persist a resume receipt');
expect(requestRecycle.includes("mode:\n                resumeAutoMode === true"), 'Memory recycle must record auto versus idle mode');
expect(requestRecycle.includes('suspendMissionFinderRuntimeForPageHide'), 'Memory recycle must release heavy runtime references before navigation');

const resumeRecycle = extractFunction('scheduleAutoMemoryRecycleResume');
expect(resumeRecycle.includes('state.resumePending = false'), 'Resume receipt must be consumed once');
expect(resumeRecycle.includes('requireMissionUpdateFirstPass'), 'Auto Mode must resume through the normal precheck');
expect(resumeRecycle.includes('runAutoModeLoop()'), 'Auto Mode must resume after the controlled reload');

const autoLoop = extractFunction('runAutoModeLoop');
const gateIndex = autoLoop.indexOf('requestAutoMissionMemoryRecycle(');
const prisonerIndex = autoLoop.indexOf('handleAutoPrisonerCellBeforeUnitFinder()');
const unitFinderIndex = autoLoop.indexOf('handleCombinedLogic(');
expect(gateIndex >= 0, 'Auto Mode loop does not call the memory recycle gate');
expect(prisonerIndex > gateIndex, 'Memory recycle must occur before prisoner and Unit Finder actions');
expect(unitFinderIndex > gateIndex, 'Memory recycle must occur before Unit Finder selection');

const observer = extractFunction('startMissionFinderObserver');
expect(observer.includes('scheduleAutoMemoryRecycleResume()'), 'Observer startup must resume a controlled memory recycle');

const diagnostics = extractFunction('mfCollectMemoryDiagnostics');
for (const token of [
  'sessionRuntimeTickerActive',
  'runtimeSuspendedForPageHide',
  'runtimeSuspendedForInactiveFrame',
  'memoryMaintenanceTimerActive',
  'autoMemoryRecycle',
  'getAutoMemoryRecycleDiagnosticState()',
]) {
  expect(diagnostics.includes(token), `Memory diagnostics missing ${token}`);
}

const dispatchOnly = extractFunction('clickDispatchOnly');
expect(dispatchOnly.includes("document.querySelectorAll(\n                    'a.alert_next'"), 'Normal Dispatch & Next selector changed unexpectedly');
const dispatchByValue = extractFunction('clickMissionDispatchByValue');
expect(dispatchByValue.includes('clickDispatchAndShareOnly()'), 'High-value Dispatch & Share path changed unexpectedly');
expect(dispatchByValue.includes('clickDispatchOnly()'), 'Normal dispatch path changed unexpectedly');

console.log('Auto Mode memory recycle and lifecycle suspension checks passed.');
