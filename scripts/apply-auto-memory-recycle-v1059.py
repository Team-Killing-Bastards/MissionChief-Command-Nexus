#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/missionchief-command-nexus.user.js'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = SOURCE.read_text(encoding='utf-8')

if '// @version      1.0.59' in source:
    print('v1.0.59 source is already applied.')
else:
    source = source.replace('// @version      1.0.58', '// @version      1.0.59')
    source = source.replace('MISSION FINDER V10.6.121', 'MISSION FINDER V10.6.122')
    source = source.replace("commandNexus: '1.0.58'", "commandNexus: '1.0.59'")
    source = source.replace("missionFinder: 'V10.6.121'", "missionFinder: 'V10.6.122'")

    source = replace_once(
        source,
        '''    let mfRuntimePageShowHandler = null;
    let mfBackgroundWatcherSupervisorTimer = null;
    let mfBackgroundStorageHandler = null;
    const mfMissingUnitRetryIntervals = new Set();
''',
        '''    let mfRuntimePageShowHandler = null;
    let mfBackgroundWatcherSupervisorTimer = null;
    let mfBackgroundStorageHandler = null;
    let mfRuntimeSuspendedForPageHide = false;
    const MF_AUTO_MEMORY_RECYCLE_STATE_KEY =
        'mf_auto_memory_recycle_state_v1';
    const MF_AUTO_MEMORY_RECYCLE_HEAP_THRESHOLD_BYTES =
        640 * 1024 * 1024;
    const MF_AUTO_MEMORY_RECYCLE_COOLDOWN_MS =
        4 * 60 * 1000;
    const MF_AUTO_MEMORY_RECYCLE_MAX_STATE_AGE_MS =
        20 * 60 * 1000;
    const mfMissingUnitRetryIntervals = new Set();
''',
        'memory lifecycle constants'
    )

    memory_guard = r'''
    function getAutoMemoryHeapSnapshot() {
        try {
            const memory = performance.memory;
            if (!memory) return null;

            const usedJSHeapSize =
                Number(memory.usedJSHeapSize || 0);
            const totalJSHeapSize =
                Number(memory.totalJSHeapSize || 0);
            const jsHeapSizeLimit =
                Number(memory.jsHeapSizeLimit || 0);

            if (!Number.isFinite(usedJSHeapSize) || usedJSHeapSize <= 0) {
                return null;
            }

            return {
                usedJSHeapSize,
                totalJSHeapSize,
                jsHeapSizeLimit
            };
        } catch (_error) {
            return null;
        }
    }

    function readAutoMemoryRecycleState() {
        let state = null;

        try {
            state = JSON.parse(
                sessionStorage.getItem(
                    MF_AUTO_MEMORY_RECYCLE_STATE_KEY
                ) || 'null'
            );
        } catch (_error) {
            state = null;
        }

        if (!state || typeof state !== 'object') {
            return null;
        }

        const lastRecycleAt =
            Number(state.lastRecycleAt || 0);
        const age = Date.now() - lastRecycleAt;

        if (
            !Number.isFinite(age) ||
            age < 0 ||
            age > MF_AUTO_MEMORY_RECYCLE_MAX_STATE_AGE_MS
        ) {
            try {
                sessionStorage.removeItem(
                    MF_AUTO_MEMORY_RECYCLE_STATE_KEY
                );
            } catch (_error) {}
            return null;
        }

        return state;
    }

    function writeAutoMemoryRecycleState(state) {
        try {
            sessionStorage.setItem(
                MF_AUTO_MEMORY_RECYCLE_STATE_KEY,
                JSON.stringify(state)
            );
            return true;
        } catch (_error) {
            return false;
        }
    }

    function getAutoMemoryRecycleDiagnosticState() {
        const state = readAutoMemoryRecycleState();
        if (!state) return null;

        return {
            lastRecycleAt:
                Number(state.lastRecycleAt || 0),
            recycleCount:
                Math.max(0, parseInt(state.recycleCount, 10) || 0),
            missionId:
                String(state.missionId || ''),
            usedJSHeapSize:
                Math.max(0, Number(state.usedJSHeapSize || 0)),
            resumePending:
                state.resumePending === true,
            reason:
                String(state.reason || '')
        };
    }

    function hasSelectedMissionVehiclesForMemoryRecycle() {
        try {
            return getVehicleCheckboxSnapshot(true)
                .some(input => input?.checked === true);
        } catch (_error) {
            return false;
        }
    }

    function shouldRecycleAutoMissionMemoryBeforeSelection() {
        if (
            !autoModeRunning ||
            isManualAutoStopActive() ||
            !isMissionPage() ||
            document.visibilityState === 'hidden' ||
            vehicleLoadState.ready ||
            processedSelectionKeys.size > 0 ||
            hasSelectedMissionVehiclesForMemoryRecycle() ||
            readAutoAdvanceAfterDispatchState() ||
            readAllyStealPendingState() ||
            readAutoPostDispatchUpgradeState() ||
            isPostTransportRehookPending()
        ) {
            return null;
        }

        const heap = getAutoMemoryHeapSnapshot();
        if (
            !heap ||
            heap.usedJSHeapSize <
                MF_AUTO_MEMORY_RECYCLE_HEAP_THRESHOLD_BYTES
        ) {
            return null;
        }

        const previous = readAutoMemoryRecycleState();
        if (
            previous &&
            Date.now() - Number(previous.lastRecycleAt || 0) <
                MF_AUTO_MEMORY_RECYCLE_COOLDOWN_MS
        ) {
            return null;
        }

        return heap;
    }

    function requestAutoMissionMemoryRecycle(
        reason = 'high JavaScript heap before selection'
    ) {
        const heap =
            shouldRecycleAutoMissionMemoryBeforeSelection();
        if (!heap) return false;

        const previous = readAutoMemoryRecycleState();
        const state = {
            lastRecycleAt: Date.now(),
            recycleCount:
                Math.max(
                    0,
                    parseInt(previous?.recycleCount, 10) || 0
                ) + 1,
            missionId:
                getCurrentMissionIdForQueueRestart() || '',
            href:
                String(window.location.href || ''),
            usedJSHeapSize:
                heap.usedJSHeapSize,
            totalJSHeapSize:
                heap.totalJSHeapSize,
            resumePending: true,
            reason:
                String(reason || '')
        };

        if (!writeAutoMemoryRecycleState(state)) {
            return false;
        }

        updateStatusBox(
            `Auto Mode memory guard: recycling the mission frame before selection (${Math.round(heap.usedJSHeapSize / 1048576)} MiB heap)...`
        );

        suspendMissionFinderRuntimeForPageHide(
            'automatic high-heap mission recycle'
        );

        const href = String(window.location.href || '');
        window.setTimeout(() => {
            if (!href) return;
            try {
                window.location.replace(href);
            } catch (_error) {
                window.location.href = href;
            }
        }, 60);

        return true;
    }

    function scheduleAutoMemoryRecycleResume() {
        const state = readAutoMemoryRecycleState();

        if (
            !state ||
            state.resumePending !== true ||
            !autoModeRunning ||
            isManualAutoStopActive() ||
            !isMissionPage()
        ) {
            return false;
        }

        state.resumePending = false;
        state.resumedAt = Date.now();
        writeAutoMemoryRecycleState(state);

        window.setTimeout(() => {
            if (
                autoModeRunning &&
                !isManualAutoStopActive() &&
                isMissionPage() &&
                !autoModeLoopActive
            ) {
                requireMissionUpdateFirstPass(
                    'automatic memory recycle resume'
                );
                runAutoModeLoop();
            }
        }, 700);

        return true;
    }

'''

    source = replace_once(
        source,
        '''    async function runAutoModeLoop() {
''',
        memory_guard + '''    async function runAutoModeLoop() {
''',
        'memory guard insertion'
    )

    source = replace_once(
        source,
        '''            const autoCycleMissionId =
                getCurrentMissionIdForQueueRestart();

            const prisonerCellGate =
''',
        '''            const autoCycleMissionId =
                getCurrentMissionIdForQueueRestart();

            if (
                requestAutoMissionMemoryRecycle(
                    'high JavaScript heap before Unit Finder'
                )
            ) {
                autoModeLoopActive = false;
                updateAutoModeButton();
                return;
            }

            const prisonerCellGate =
''',
        'auto loop memory recycle gate'
    )

    suspend_function = r'''
    function suspendMissionFinderRuntimeForPageHide(
        reason = ''
    ) {
        if (mfMainMutationObserver) {
            mfMainMutationObserver.disconnect();
            mfMainMutationObserver = null;
        }

        if (mfIssueRecorderObserver) {
            mfIssueRecorderObserver.disconnect();
            mfIssueRecorderObserver = null;
        }

        if (mfMainMutationFlushTimer) {
            clearTimeout(mfMainMutationFlushTimer);
            mfMainMutationFlushTimer = null;
        }

        if (mfAutoLoopResumeTimer) {
            clearTimeout(mfAutoLoopResumeTimer);
            mfAutoLoopResumeTimer = null;
        }

        if (mfIssueRecorderMutationTimer) {
            clearTimeout(mfIssueRecorderMutationTimer);
            mfIssueRecorderMutationTimer = null;
        }

        if (mfDebugRenderFrame !== null) {
            try {
                cancelAnimationFrame(mfDebugRenderFrame);
            } catch (_error) {}
            clearTimeout(mfDebugRenderFrame);
            mfDebugRenderFrame = null;
        }

        if (mfVehicleLoadRenderFrame !== null) {
            try {
                cancelAnimationFrame(mfVehicleLoadRenderFrame);
            } catch (_error) {}
            clearTimeout(mfVehicleLoadRenderFrame);
            mfVehicleLoadRenderFrame = null;
        }

        stopSessionRuntimeTicker();
        stopMissionEventCollectibleCollector();
        stopBackgroundWatcherIntervalsOnly();

        if (mfBackgroundWatcherSupervisorTimer) {
            clearInterval(mfBackgroundWatcherSupervisorTimer);
            mfBackgroundWatcherSupervisorTimer = null;
        }

        mfMissingUnitRetryIntervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        mfMissingUnitRetryIntervals.clear();

        invalidateVehicleCheckboxCache();
        invalidateMissionContextCaches();
        invalidatePatientCountCache();
        invalidateTransportCaches();
        mfVehicleMatchCandidateCache.clear();
        resetMainMutationFlags();
        mfRuntimeSuspendedForPageHide = true;

        if (mfDebugEnabled && reason) {
            debugLog(
                'RUNTIME SUSPEND',
                reason
            );
        }
    }

'''

    source = replace_once(
        source,
        '''    function cleanupMissionFinderRuntime() {
''',
        suspend_function + '''    function cleanupMissionFinderRuntime() {
''',
        'pagehide suspension insertion'
    )

    source = replace_once(
        source,
        '''            ) {
                stopMissionEventCollectibleCollector();
                invalidateVehicleCheckboxCache();
                invalidateMissionContextCaches();
                invalidatePatientCountCache();
                invalidateTransportCaches();
                resetMainMutationFlags();
                return;
            }
''',
        '''            ) {
                suspendMissionFinderRuntimeForPageHide(
                    'browser back-forward cache pagehide'
                );
                return;
            }
''',
        'bfcache full runtime suspension'
    )

    source = replace_once(
        source,
        '''    function reconcileMissionFinderAfterPageShow() {
        startMissionEventCollectibleCollector();
''',
        '''    function reconcileMissionFinderAfterPageShow() {
        mfRuntimeSuspendedForPageHide = false;
        startMissionEventCollectibleCollector();
''',
        'bfcache suspended flag reset'
    )

    source = replace_once(
        source,
        '''        syncBackgroundAutomationWatchers();
    }

    function installMissionFinderRuntimeCleanup() {
''',
        '''        syncBackgroundAutomationWatchers();

        if (
            document.getElementById(
                'session-panel-content'
            )
        ) {
            startSessionRuntimeTicker();
        }
    }

    function installMissionFinderRuntimeCleanup() {
''',
        'bfcache session ticker restart'
    )

    source = replace_once(
        source,
        '''                backgroundSupervisorActive:
                    mfBackgroundWatcherSupervisorTimer !== null
            },
''',
        '''                backgroundSupervisorActive:
                    mfBackgroundWatcherSupervisorTimer !== null,
                sessionRuntimeTickerActive:
                    sessionRuntimeTicker !== null,
                runtimeSuspendedForPageHide:
                    mfRuntimeSuspendedForPageHide === true,
                autoMemoryRecycle:
                    getAutoMemoryRecycleDiagnosticState()
            },
''',
        'memory diagnostic lifecycle state'
    )

    source = replace_once(
        source,
        '''        mfMainMutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
''',
        '''        mfMainMutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        scheduleAutoMemoryRecycleResume();
    }
''',
        'memory recycle resume hook'
    )

    SOURCE.write_text(source, encoding='utf-8')

for pattern in ('*.mjs', '*.py'):
    for path in (ROOT / 'scripts').glob(pattern):
        if path.name == 'apply-auto-memory-recycle-v1059.py':
            continue
        text = path.read_text(encoding='utf-8')
        updated = text.replace('// @version      1.0.58', '// @version      1.0.59')
        updated = updated.replace('MISSION FINDER V10.6.121', 'MISSION FINDER V10.6.122')
        updated = updated.replace("commandNexus: '1.0.58'", "commandNexus: '1.0.59'")
        updated = updated.replace("missionFinder: 'V10.6.121'", "missionFinder: 'V10.6.122'")
        if updated != text:
            path.write_text(updated, encoding='utf-8')

readme = ROOT / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace(
    '**Current version:** `1.0.58` · **Mission Finder engine:** `V10.6.121`',
    '**Current version:** `1.0.59` · **Mission Finder engine:** `V10.6.122`'
)
readme.write_text(text, encoding='utf-8')

src_readme = ROOT / 'src/README.md'
text = src_readme.read_text(encoding='utf-8')
text = text.replace('| Command Nexus version | `1.0.58` |', '| Command Nexus version | `1.0.59` |')
text = text.replace('| Mission Finder baseline | `V10.6.121` |', '| Mission Finder baseline | `V10.6.122` |')
src_readme.write_text(text, encoding='utf-8')

changelog = ROOT / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
heading = '## [1.0.58] - 2026-07-29\n'
section = '''## [1.0.59] - 2026-07-29

### Fixed

- Browser back-forward-cache transitions now suspend the complete Mission Finder runtime instead of retaining the main subtree observer, session ticker, automation timers and DOM caches with the old mission document.
- Auto Mode now has a high-heap circuit breaker. Before any Unit Finder selection, an Edge/Chromium mission frame using at least 640 MiB of JavaScript heap is reloaded once with `location.replace`, then Auto Mode resumes on the same mission.
- The recycle is guarded by current selection, dispatch-transition, transport and cooldown checks, so it cannot interrupt selected vehicles or change mission requirements.

### Diagnostics

- Memory exports now include runtime suspension state, session ticker state and the bounded automatic recycle receipt.

### Changed engine baseline

- Mission Finder increased from `V10.6.121` to `V10.6.122`.
- Personnel Assignment remains `1.3.7`.

'''
if '## [1.0.59]' not in text:
    if heading not in text:
        raise SystemExit('CHANGELOG.md v1.0.58 insertion point not found')
    text = text.replace(heading, section + heading, 1)
changelog.write_text(text, encoding='utf-8')

print('Applied Command Nexus 1.0.59 mission lifecycle recycle hardening.')
