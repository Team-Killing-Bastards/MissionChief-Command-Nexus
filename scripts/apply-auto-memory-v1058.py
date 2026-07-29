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

if '// @version      1.0.58' in source:
    print('v1.0.58 source is already applied.')
else:
    source = source.replace('// @version      1.0.57', '// @version      1.0.58')
    source = source.replace('MISSION FINDER V10.6.120', 'MISSION FINDER V10.6.121')
    source = source.replace("commandNexus: '1.0.57'", "commandNexus: '1.0.58'")
    source = source.replace("missionFinder: 'V10.6.120'", "missionFinder: 'V10.6.121'")

    old_collector = '''    function startMissionEventCollectibleCollector() {
        if (mfEventCollectibleScanTimer !== null) {
            return;
        }

        void scanMissionEventCollectibles();

        mfEventCollectibleScanTimer =
            window.setInterval(
                () => {
                    void scanMissionEventCollectibles();
                },
                MF_EVENT_COLLECTIBLE_SCAN_INTERVAL_MS
            );
    }

    startMissionEventCollectibleCollector();



    const MF_IS_TOP_WINDOW = (() => {
        try {
            return window.top === window.self;
        } catch (error) {
            return true;
        }
    })();

    function isMissionPage() {
        return !!document.querySelector('#mission_general_info');
    }

    if (window.missionFinder2026Initialized) return;

    window.missionFinder2026Initialized = true;
    window.missionFinderInitialized = true;
'''
    new_collector = '''    function startMissionEventCollectibleCollector() {
        if (
            !MF_IS_TOP_WINDOW ||
            mfEventCollectibleScanTimer !== null
        ) {
            return;
        }

        void scanMissionEventCollectibles();

        mfEventCollectibleScanTimer =
            window.setInterval(
                () => {
                    void scanMissionEventCollectibles();
                },
                MF_EVENT_COLLECTIBLE_SCAN_INTERVAL_MS
            );
    }

    function stopMissionEventCollectibleCollector() {
        if (mfEventCollectibleScanTimer !== null) {
            window.clearInterval(
                mfEventCollectibleScanTimer
            );
            mfEventCollectibleScanTimer = null;
        }

        mfEventCollectibleScanRunning = false;
        mfEventCollectibleClaimTimes.clear();
    }


    const MF_IS_TOP_WINDOW = (() => {
        try {
            return window.top === window.self;
        } catch (error) {
            return true;
        }
    })();

    function isMissionPage() {
        return !!document.querySelector('#mission_general_info');
    }

    if (window.missionFinder2026Initialized) return;

    window.missionFinder2026Initialized = true;
    window.missionFinderInitialized = true;

    startMissionEventCollectibleCollector();
'''
    source = replace_once(
        source,
        old_collector,
        new_collector,
        'seasonal collector ownership block'
    )

    source = replace_once(
        source,
        '''        stopSessionRuntimeTicker();
        cleanupMissionFinderIphoneNativePickerSurfaces();
''',
        '''        stopSessionRuntimeTicker();
        stopMissionEventCollectibleCollector();
        cleanupMissionFinderIphoneNativePickerSurfaces();
''',
        'runtime collector cleanup'
    )

    source = replace_once(
        source,
        '''    function reconcileMissionFinderAfterPageShow() {
        invalidateVehicleCheckboxCache();
''',
        '''    function reconcileMissionFinderAfterPageShow() {
        startMissionEventCollectibleCollector();
        invalidateVehicleCheckboxCache();
''',
        'bfcache collector restart'
    )

    source = replace_once(
        source,
        '''            ) {
                invalidateVehicleCheckboxCache();
                invalidateMissionContextCaches();
                invalidatePatientCountCache();
                invalidateTransportCaches();
                resetMainMutationFlags();
                return;
            }
''',
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
        'bfcache collector suspension'
    )

    memory_function = '''
    function mfCollectMemoryDiagnostics() {
        const documents = [];
        const addDocument = candidateDocument => {
            try {
                if (
                    candidateDocument?.documentElement &&
                    !documents.includes(candidateDocument)
                ) {
                    documents.push(candidateDocument);
                }
            } catch (_error) {}
        };

        try {
            getMissionAccessibleDocuments(true)
                .forEach(addDocument);
        } catch (_error) {
            addDocument(document);
        }

        if (documents.length === 0) {
            addDocument(document);
        }

        const documentSnapshots = documents
            .slice(0, 24)
            .map((candidateDocument, index) => {
                let ownerFrame = null;
                let ownerFrameVisible = true;
                let ownerFrameConnected = true;

                try {
                    ownerFrame =
                        candidateDocument.defaultView?.frameElement ||
                        null;
                    ownerFrameConnected = ownerFrame
                        ? ownerFrame.isConnected !== false
                        : true;
                    ownerFrameVisible = ownerFrame
                        ? isMissionElementVisible(ownerFrame)
                        : true;
                } catch (_error) {}

                const count = selector => {
                    try {
                        return candidateDocument
                            .querySelectorAll(selector)
                            .length;
                    } catch (_error) {
                        return 0;
                    }
                };

                let elementCount = 0;
                try {
                    elementCount = candidateDocument
                        .getElementsByTagName('*')
                        .length;
                } catch (_error) {}

                let pageUrl = '';
                try {
                    pageUrl = String(
                        candidateDocument.location?.href ||
                        ''
                    );
                } catch (_error) {}

                return {
                    index,
                    pageUrl,
                    title: String(candidateDocument.title || '')
                        .slice(0, 160),
                    isCurrentDocument:
                        candidateDocument === document,
                    ownerFrameConnected,
                    ownerFrameVisible,
                    elementCount,
                    iframeCount: count('iframe'),
                    vehicleCheckboxCount:
                        count('input.vehicle_checkbox'),
                    selectedVehicleCheckboxCount:
                        count('input.vehicle_checkbox:checked'),
                    missionPanelCount:
                        count('#mission-finder-wrapper'),
                    missionGeneralInfoCount:
                        count('#mission_general_info')
                };
            });

        let heap = null;
        try {
            const memory = performance.memory;
            if (memory) {
                heap = {
                    usedJSHeapSize:
                        Number(memory.usedJSHeapSize || 0),
                    totalJSHeapSize:
                        Number(memory.totalJSHeapSize || 0),
                    jsHeapSizeLimit:
                        Number(memory.jsHeapSizeLimit || 0)
                };
            }
        } catch (_error) {}

        const cachedVehicleNodes = Array.isArray(
            mfVehicleCheckboxCache?.nodes
        )
            ? mfVehicleCheckboxCache.nodes
            : [];

        return {
            capturedAt: new Date().toISOString(),
            heap,
            runtime: {
                isTopWindow: MF_IS_TOP_WINDOW,
                autoModeRunning:
                    autoModeRunning === true,
                eventCollectorTimerActive:
                    mfEventCollectibleScanTimer !== null,
                eventCollectorScanRunning:
                    mfEventCollectibleScanRunning === true,
                eventCollectorTrackedClaims:
                    mfEventCollectibleClaimTimes.size,
                mainMutationObserverActive:
                    mfMainMutationObserver !== null,
                backgroundSupervisorActive:
                    mfBackgroundWatcherSupervisorTimer !== null
            },
            caches: {
                liveTrainingVerifyEntries:
                    mfLiveTrainingVerifyCache.size,
                vehicleMatchCandidateEntries:
                    mfVehicleMatchCandidateCache.size,
                cachedVehicleCheckboxes:
                    cachedVehicleNodes.length,
                detachedCachedVehicleCheckboxes:
                    cachedVehicleNodes.filter(node =>
                        node?.isConnected === false
                    ).length,
                missionDocuments:
                    mfMissionDocumentCache.documents.length,
                missionContexts:
                    mfMissionContextCache.contexts.length,
                transportDocuments:
                    mfTransportDocumentCache.documents.length,
                transportScopes:
                    mfTransportScopeCache.scopes.length,
                iphoneNativePickerDocuments:
                    mfIphoneNativePickerDocuments.size
            },
            documents: {
                accessibleCount: documents.length,
                sampledCount: documentSnapshots.length,
                totalElements: documentSnapshots.reduce(
                    (total, item) =>
                        total + item.elementCount,
                    0
                ),
                totalVehicleCheckboxes:
                    documentSnapshots.reduce(
                        (total, item) =>
                            total + item.vehicleCheckboxCount,
                        0
                    ),
                hiddenOwnerFrames:
                    documentSnapshots.filter(item =>
                        !item.ownerFrameVisible
                    ).length,
                detachedOwnerFrames:
                    documentSnapshots.filter(item =>
                        !item.ownerFrameConnected
                    ).length,
                samples: documentSnapshots
            }
        };
    }

'''
    source = replace_once(
        source,
        '    function mfBuildUnitFinderDiagnosticSnapshot(reason) {\n',
        memory_function +
        '    function mfBuildUnitFinderDiagnosticSnapshot(reason) {\n',
        'memory diagnostic collector insertion'
    )

    source = replace_once(
        source,
        '''            privacyNote:
                'Contains mission IDs, vehicle names and training-code evidence. It does not include cookies, passwords or personnel names.',
            current,
            history
''',
        '''            privacyNote:
                'Contains mission IDs, vehicle names, training-code evidence and browser memory/DOM counts. It does not include cookies, passwords or personnel names.',
            memoryDiagnostics:
                mfCollectMemoryDiagnostics(),
            current,
            history
''',
        'memory diagnostics export payload'
    )

    SOURCE.write_text(source, encoding='utf-8')

# Keep baseline assertions aligned without rewriting release history.
for pattern in ('*.mjs', '*.py'):
    for path in (ROOT / 'scripts').glob(pattern):
        if path.name == 'apply-auto-memory-v1058.py':
            continue
        text = path.read_text(encoding='utf-8')
        updated = text.replace('// @version      1.0.57', '// @version      1.0.58')
        updated = updated.replace('MISSION FINDER V10.6.120', 'MISSION FINDER V10.6.121')
        updated = updated.replace("commandNexus: '1.0.57'", "commandNexus: '1.0.58'")
        updated = updated.replace("missionFinder: 'V10.6.120'", "missionFinder: 'V10.6.121'")
        if updated != text:
            path.write_text(updated, encoding='utf-8')

readme = ROOT / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace(
    '**Current version:** `1.0.57` · **Mission Finder engine:** `V10.6.120`',
    '**Current version:** `1.0.58` · **Mission Finder engine:** `V10.6.121`'
)
readme.write_text(text, encoding='utf-8')

src_readme = ROOT / 'src/README.md'
text = src_readme.read_text(encoding='utf-8')
text = text.replace('| Command Nexus version | `1.0.57` |', '| Command Nexus version | `1.0.58` |')
text = text.replace('| Mission Finder baseline | `V10.6.120` |', '| Mission Finder baseline | `V10.6.121` |')
src_readme.write_text(text, encoding='utf-8')

changelog = ROOT / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
heading = '## [1.0.57] - 2026-07-29\n'
section = '''## [1.0.58] - 2026-07-29

### Fixed

- Seasonal collectible scanning now has one top-window owner instead of starting a one-second recursive iframe scanner in every MissionChief frame.
- The collector now starts only after the Mission Finder duplicate-instance guard and is stopped during runtime cleanup and Safari back-forward-cache suspension, then restarted safely on restoration.
- This removes a confirmed long-session timer and frame-retention path without changing Unit Finder, Mission Update, vehicle matching or Auto Mode dispatch decisions.

### Diagnostics

- Existing Unit Finder exports now include an on-demand browser memory snapshot with JavaScript heap figures when supported, accessible document/frame counts, DOM and vehicle-checkbox totals, active timer/observer state and bounded cache sizes.
- Memory evidence is collected only when Export Diagnostics is clicked; no new polling timer is introduced.

### Changed engine baseline

- Mission Finder increased from `V10.6.120` to `V10.6.121`.
- Personnel Assignment remains `1.3.7`.

'''
if '## [1.0.58]' not in text:
    if heading not in text:
        raise SystemExit('CHANGELOG.md v1.0.57 insertion point not found')
    text = text.replace(heading, section + heading, 1)
changelog.write_text(text, encoding='utf-8')

workflow = ROOT / '.github/workflows/validate-userscript.yml'
text = workflow.read_text(encoding='utf-8')
path_token = "      - 'scripts/check-unit-finder-diagnostic-export.mjs'\n"
path_insert = path_token + "      - 'scripts/check-auto-memory-lifecycle.mjs'\n"
if "scripts/check-auto-memory-lifecycle.mjs" not in text:
    text = text.replace(path_token, path_insert)
    # The path occurs in both pull_request and push lists.
    text = text.replace(path_token, path_insert, 1)
step_token = '''      - name: Validate Unit Finder diagnostic export
        run: node scripts/check-unit-finder-diagnostic-export.mjs
'''
step_insert = step_token + '''
      - name: Validate Auto Mode memory lifecycle
        run: node scripts/check-auto-memory-lifecycle.mjs
'''
if 'Validate Auto Mode memory lifecycle' not in text:
    if step_token not in text:
        raise SystemExit('validate-userscript workflow insertion point not found')
    text = text.replace(step_token, step_insert, 1)
workflow.write_text(text, encoding='utf-8')

print('Applied Command Nexus 1.0.58 memory lifecycle hardening.')
