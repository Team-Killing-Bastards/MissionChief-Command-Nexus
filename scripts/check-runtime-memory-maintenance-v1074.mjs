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
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Missing function ${name}`);
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
    if (character === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        bodyStart = source.indexOf('{', index);
        break;
      }
    }
  }

  if (bodyStart < 0) fail(`Missing body for ${name}`);
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

expect(source.includes('// @version      1.0.105'), 'Expected Command Nexus 1.0.79');
expect(source.includes('MISSION FINDER V10.6.153'), 'Expected Mission Finder V10.6.139');
expect(source.includes('480 * 1024 * 1024'), 'Soft cache flush threshold must be 480 MiB');
expect(source.includes('640 * 1024 * 1024'), 'Guarded frame recycle threshold must remain 640 MiB');
expect(source.includes("'missionchief-nexus-frame-runtime-reconcile-v1074'"), 'Missing frame-runtime reconciliation event');

const namingModuleStart = source.slice(
  source.indexOf("if (window.__MC_NAMING_TOOLS_V428__) return;"),
  source.indexOf("const UNIT_VERSION = '3.3.21';")
);
expect(namingModuleStart.includes('window.top === window.self'), 'Naming/personnel runtime must identify its top-window owner');
expect(namingModuleStart.includes('TOOL_IS_STATION_OVERVIEW_FRAME'), 'Naming/personnel runtime must recognise the exact Stations overview lightbox');
expect(namingModuleStart.includes('window.top.location.origin !== location.origin'), 'Stations overview lightbox ownership must remain same-origin');
expect(namingModuleStart.includes('leitstellenansicht'), 'Stations overview lightbox ownership must remain route-scoped');
expect(namingModuleStart.includes('if (!TOOL_IS_TOP_WINDOW && !TOOL_IS_STATION_OVERVIEW_FRAME) return;'), 'Naming/personnel runtime must remain excluded from mission and unrelated child frames');
expect(!namingModuleStart.includes('if (!TOOL_IS_TOP_WINDOW) return;'), 'Blanket child-frame exclusion must not suppress the Stations overview lightbox');

const frameOwner = extractFunction('shouldKeepMissionFinderObserverForCurrentFrame');
expect(frameOwner.includes('if (MF_IS_TOP_WINDOW) return true'), 'Top MissionChief document must retain its observer');
expect(frameOwner.includes('getPrimaryMissionRequirementDocument() === document'), 'Child observer ownership must follow the visible primary mission document');

const inactiveSuspend = extractFunction('suspendMissionFinderRuntimeForInactiveFrame');
for (const token of [
  'mfMainMutationObserver.disconnect()',
  'mfMainMutationObserver = null',
  'stopSessionRuntimeTicker()',
  'stopMissionFinderRuntimeMemoryMaintenance()',
  'removeMissionFinderRuntimeMemoryActivityTracking()',
  "document.getElementById(\n            'mission-finder-wrapper'\n        )?.remove()",
  'invalidateVehicleCheckboxCache()',
  'invalidateMissionContextCaches()',
  'invalidateTransportCaches()',
  'mfVehicleMatchCandidateCache.clear()',
  'mfRuntimeSuspendedForInactiveFrame = true',
]) {
  expect(inactiveSuspend.includes(token), `Inactive-frame suspension missing ${token}`);
}
expect(!inactiveSuspend.includes('resetMissionRequirementPreloadCache'), 'Inactive-frame suspension must not mutate authoritative mission requirements through the normal cache reset path');

const frameReconcile = extractFunction('reconcileMissionFinderFrameRuntime');
expect(frameReconcile.includes('suspendMissionFinderRuntimeForInactiveFrame(reason)'), 'Inactive frame must be suspended by ownership reconciliation');
expect(frameReconcile.includes('startMissionFinderObserver()'), 'A frame that becomes primary must restore its observer');
expect(frameReconcile.includes('initialize()'), 'A restored primary frame must remount Mission Control');
expect(frameReconcile.includes('startMissionFinderRuntimeMemoryMaintenance()'), 'A restored primary frame must restart memory maintenance');

const topSupervisor = extractFunction('installBackgroundWatcherSupervisor');
expect(topSupervisor.includes('reconcileMissionFinderFrameRuntimesFromTop()'), 'Top supervisor must reconcile child frame owners');
expect(topSupervisor.includes('setInterval('), 'Top supervisor must retain a bounded periodic ownership safety net');

const releaseRemoved = extractFunction('releaseRemovedMissionFinderFrameRuntimes');
expect(releaseRemoved.includes('record.removedNodes'), 'Removed iframe cleanup must inspect removed DOM nodes');
expect(releaseRemoved.includes('removed: true'), 'Removed iframe cleanup must request a full child runtime teardown');

const observer = extractFunction('startMissionFinderObserver');
const ownerGateIndex = observer.indexOf('shouldKeepMissionFinderObserverForCurrentFrame()');
const mutationObserverIndex = observer.indexOf('new MutationObserver');
expect(ownerGateIndex >= 0 && ownerGateIndex < mutationObserverIndex, 'Child ownership must be checked before attaching the whole-document observer');
expect(observer.includes('releaseRemovedMissionFinderFrameRuntimes(records)'), 'Top observer must release removed iframe runtimes');
expect(observer.includes('startMissionFinderRuntimeMemoryMaintenance()'), 'Active mission observer must start memory maintenance');

const maintenance = extractFunction('runMissionFinderRuntimeMemoryMaintenance');
for (const token of [
  'pruneLiveTrainingVerifyCache()',
  'pruneMissionFinderIphoneNativePickerDocuments()',
  'MF_RUNTIME_MEMORY_SOFT_FLUSH_THRESHOLD_BYTES',
  'flushMissionFinderEphemeralMemory(',
  'shouldRecycleIdleMissionMemory()',
  'requestMissionFinderMemoryRecycle(',
]) {
  expect(maintenance.includes(token), `Runtime maintenance missing ${token}`);
}

const softFlush = extractFunction('flushMissionFinderEphemeralMemory');
for (const token of [
  'invalidateVehicleCheckboxCache()',
  'invalidateMissionContextCaches()',
  'invalidatePatientCountCache()',
  'invalidateTransportCaches()',
  'mfVehicleMatchCandidateCache.clear()',
  'pruneLiveTrainingVerifyCache()',
]) {
  expect(softFlush.includes(token), `Soft memory flush missing ${token}`);
}
for (const forbidden of [
  'resetMissionRequirementPreloadCache',
  'mfMissionRequirementPreloadCache =',
  'vehicleLoadState =',
  'localStorage.removeItem(MF_PERSONNEL_TRAINING_REGISTRY_KEY)',
]) {
  expect(!softFlush.includes(forbidden), `Soft memory flush must preserve operational state: ${forbidden}`);
}

const idleGuard = extractFunction('shouldRecycleIdleMissionMemory');
for (const token of [
  'autoModeRunning',
  'isCurrentMissionExecutionOwner(',
  "document.visibilityState === 'hidden'",
  'vehicleLoadState.ready',
  'isMissionFinderMemoryWorkActive()',
  'hasSelectedMissionVehiclesForMemoryRecycle()',
  'mfMissionRequirementPreloadPromise',
  "mfMissionRequirementPreloadCache.status === 'loading'",
  'MF_RUNTIME_MEMORY_IDLE_MS',
  'MF_RUNTIME_MEMORY_STABLE_MS',
  'MF_AUTO_MEMORY_RECYCLE_HEAP_THRESHOLD_BYTES',
  'MF_AUTO_MEMORY_RECYCLE_COOLDOWN_MS',
]) {
  expect(idleGuard.includes(token), `Idle frame recycle guard missing ${token}`);
}

const workGuard = extractFunction('isMissionFinderMemoryWorkActive');
for (const token of [
  'mfRuntimeMemoryOperationDepth > 0',
  'autoModeLoopActive',
  'mfSilentQueueOpening',
  'mfGlobalTransportClicking',
  'mfTransportSequenceActive',
  'mfTransportContinuationRunning',
  'mfAutoAdvanceResumeActive',
  'mfAutoUpgradeResumeActive',
  'readAutoAdvanceAfterDispatchState()',
  'readAllyStealPendingState()',
  'readAutoPostDispatchUpgradeState()',
  'isPostTransportRehookPending()',
]) {
  expect(workGuard.includes(token), `Active-work guard missing ${token}`);
}

const unitFinderControl = source.slice(
  source.indexOf("unitFinderBtn.addEventListener('click'"),
  source.indexOf("const allyStealBtn")
);
expect(unitFinderControl.includes('runMissionFinderMemorySensitiveOperation('), 'Manual Unit Finder must hold the memory operation lock');
const allyControl = source.slice(source.indexOf("allyStealBtn.addEventListener('click'"), source.indexOf('const missionUpdateBtn'));
expect(allyControl.includes('runMissionFinderMemorySensitiveOperation('), 'Manual Ally Steal must hold the memory operation lock');
const missionUpdateControl = source.slice(source.indexOf("missionUpdateBtn.addEventListener("), source.indexOf('const dispatchBtn'));
expect(missionUpdateControl.includes('beginMissionFinderMemorySensitiveOperation('), 'Manual Mission Update must acquire the memory operation lock');
expect(missionUpdateControl.includes('endMissionFinderMemorySensitiveOperation('), 'Manual Mission Update must release the memory operation lock');

expect(source.includes('const MF_LIVE_TRAINING_VERIFY_CACHE_LIMIT = 600;'), 'Live training verification cache must have a hard entry limit');
const livePrune = extractFunction('pruneLiveTrainingVerifyCache');
expect(livePrune.includes('MF_LIVE_TRAINING_VERIFY_CACHE_MS'), 'Live training cache must prune expired entries');
expect(livePrune.includes('MF_LIVE_TRAINING_VERIFY_CACHE_LIMIT'), 'Live training cache must prune by hard size');
expect(source.includes('markLiveTrainingVehicleVerified('), 'Live verification writes must use the bounded cache helper');

expect(source.includes('const MF_UNIT_FINDER_DIAGNOSTICS_MAX_STORAGE_CHARS = 750000;'), 'Diagnostic history must have a storage-size cap');
const boundHistory = extractFunction('mfBoundUnitFinderDiagnosticHistory');
expect(boundHistory.includes('MF_UNIT_FINDER_DIAGNOSTICS_MAX_STORAGE_CHARS'), 'Diagnostic history must enforce its storage-size cap');
expect(boundHistory.includes('bounded = bounded.slice(1)'), 'Diagnostic history must drop oldest snapshots first');
const persistDiagnostic = extractFunction('mfPersistUnitFinderDiagnostic');
expect(persistDiagnostic.includes('mfBoundUnitFinderDiagnosticHistory(history)'), 'Diagnostic writes must use the byte-bounded history');

const storageMaintenance = extractFunction('compactMissionFinderPersistentStorage');
expect(storageMaintenance.includes('localStorage.removeItem(MF_RECORDER_KEY)'), 'Removed Issue Recorder payload must be deleted');
expect(storageMaintenance.includes('mfBoundUnitFinderDiagnosticHistory('), 'Existing diagnostic history must be compacted on startup');
expect(!storageMaintenance.includes('MF_PERSONNEL_TRAINING_REGISTRY_KEY'), 'Storage maintenance must never remove the authoritative Personnel Register');
expect(!storageMaintenance.includes('mcPersonnelVehicleTrainingRegistry_v1'), 'Storage maintenance must never name or delete the authoritative Personnel Register key');

const diagnostics = extractFunction('mfCollectMemoryDiagnostics');
for (const token of [
  'runtimeSuspendedForInactiveFrame',
  'memoryMaintenanceTimerActive',
  'memorySoftFlushCount',
  'memoryInactiveSuspendCount',
  'storageMaintenance',
]) {
  expect(diagnostics.includes(token), `Memory diagnostics missing ${token}`);
}

console.log('Runtime memory maintenance, inactive-frame ownership and storage bounds checks passed.');
