import fs from 'node:fs';
export function patchMemoryRecovery(replace) {
 replace('function shouldRecycleControllerRuntimeAtBoundary() {\nif (', 'function shouldRecycleControllerRuntimeAtBoundary() {\nif (state.postDispatchWatchdog) return null;\nif (');
 replace('function shouldRecycleControllerRuntimeAtBoundary() {',fs.readFileSync('scripts/runtime/memory-recovery.js','utf8')+'\nfunction shouldRecycleControllerRuntimeAtBoundary() {');
 replace('if (!due || !nextMissionId || !url || !isMissionUrl(url.href)) return false;', 'if (!due || !nextMissionId || !url || !isMissionUrl(url.href) ||\ncanonicalMissionPageId(url.href) !== String(nextMissionId)) return false;');
 replace('activateControllerMemoryPressure();\nconst now = Date.now();\nconst parsedRunStart', 'activateControllerMemoryPressure();\nif (nexusPersistentHeapRecoveryDue()) state.pipelineMemoryRecyclePending = true;\nconst now = Date.now();\nconst parsedRunStart');
 replace('const fullPageRecycle =\nstate.runtimeRecycles % CONTROLLER_FULL_PAGE_RECYCLE_EVERY_RUNTIME_CYCLES === 0;', `const persistentHeap = nexusPersistentHeapRecoveryDue();
let fullPageRecycle = nexusMemoryRefreshAllowed() && (persistentHeap ||
state.runtimeRecycles % CONTROLLER_FULL_PAGE_RECYCLE_EVERY_RUNTIME_CYCLES === 0);
event.heapBeforeBytes = controllerUsedHeapBytes();
event.persistentHeap = persistentHeap;
event.fullPageRecycle = fullPageRecycle;`);
 replace("saveRunContinuity();\nsetPhase(\n'MEMORY_RECYCLE',", `saveRunContinuity();
if (fullPageRecycle && !nexusSaveVerifiedResume(url.href)) {
fullPageRecycle = false;
event.fullPageRecycle = false;
event.refreshBlocked = 'resume-storage-unverified';
log('Memory refresh deferred because resume storage could not be verified.', event);
}
if (!fullPageRecycle) nexusMemoryRecycleProbe = { at: Date.now(), heap: controllerUsedHeapBytes() };
saveRunContinuity();
setPhase(
'MEMORY_RECYCLE',`);
 replace('if (!state.wanted || state.stopping) return;\nwindow.location.reload();', `if (!state.wanted || state.stopping || state.worker?.isConnected) return;
if (!nexusSaveVerifiedResume(url.href)) { createWorker(url.href); return; }
const refreshAt = String(Date.now());
sessionSet('nexus_memory_refresh_at_v1', refreshAt);
if (sessionGet('nexus_memory_refresh_at_v1') !== refreshAt) { createWorker(url.href); return; }
window.location.reload();`);
}
