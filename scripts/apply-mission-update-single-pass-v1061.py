#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src' / 'missionchief-command-nexus.user.js'
source = SOURCE.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def function_slice(text: str, start_token: str, end_token: str, label: str):
    start = text.find(start_token)
    if start < 0:
        raise SystemExit(f'{label}: start token not found')
    end = text.find(end_token, start)
    if end < 0:
        raise SystemExit(f'{label}: end token not found')
    return start, end, text[start:end]


source = replace_once(source, '// @version      1.0.60', '// @version      1.0.61', 'userscript version')
source = replace_once(source, ' * MODULE 2: MISSION FINDER V10.6.123', ' * MODULE 2: MISSION FINDER V10.6.124', 'Mission Finder version')

start, end, combined = function_slice(
    source,
    '    async function handleCombinedLogic(options = {}) {',
    '\n    function getActiveMissionInfoForAllySteal()',
    'handleCombinedLogic'
)

promise_anchor = '''        const suppliedAttachmentPromise =
            options.attachmentRowsPromise &&
            typeof options.attachmentRowsPromise.then === 'function'
                ? options.attachmentRowsPromise
                : null;
'''
promise_replacement = '''        const suppliedAttachmentPromise =
            options.attachmentRowsPromise &&
            typeof options.attachmentRowsPromise.then === 'function'
                ? options.attachmentRowsPromise
                : null;

        const selectionRunState =
            options.selectionRunState &&
            typeof options.selectionRunState === 'object'
                ? options.selectionRunState
                : null;

        if (selectionRunState) {
            selectionRunState.usedCurrentMissionUpdateAuthority = false;
        }
'''
combined = replace_once(combined, promise_anchor, promise_replacement, 'selection run state setup')

route_state_anchor = '''        if (
            missionKeyAtStart !==
            getLocalMissionInstanceKey()
        ) {
'''
route_state_replacement = '''        if (selectionRunState) {
            selectionRunState.usedCurrentMissionUpdateAuthority =
                useCurrentMissionUpdateAuthority;
        }

        if (
            missionKeyAtStart !==
            getLocalMissionInstanceKey()
        ) {
'''
combined = replace_once(combined, route_state_anchor, route_state_replacement, 'selection route receipt')
source = source[:start] + combined + source[end:]

helper_anchor = '''    async function runAutoModeLoop() {
'''
helper_replacement = '''    function shouldRunPostSelectionMissionUpdate(selectionRunState) {
        return !Boolean(
            selectionRunState?.usedCurrentMissionUpdateAuthority
        );
    }


    async function runAutoModeLoop() {
'''
source = replace_once(source, helper_anchor, helper_replacement, 'post-selection helper')

start, end, auto_loop = function_slice(
    source,
    '    async function runAutoModeLoop() {',
    '\n    function getCurrentAutoDispatchSelectionState()',
    'runAutoModeLoop'
)

handled_anchor = '''            let autoMissionUpdateRowsHandled = 0;
'''
handled_replacement = '''            let autoMissionUpdateRowsHandled = 0;
            const autoSelectionRunState = {
                usedCurrentMissionUpdateAuthority:
                    hasEarlyCurrentMissionUpdateAuthority
            };
'''
auto_loop = replace_once(auto_loop, handled_anchor, handled_replacement, 'auto selection state')

call_anchor = '''                        handleCombinedLogic({
                            vehicleListAlreadyLoaded: true,
                            attachmentRowsPromise: prefetchedAttachmentRowsPromise
                        }),
'''
call_replacement = '''                        handleCombinedLogic({
                            vehicleListAlreadyLoaded: true,
                            attachmentRowsPromise: prefetchedAttachmentRowsPromise,
                            selectionRunState: autoSelectionRunState
                        }),
'''
auto_loop = replace_once(auto_loop, call_anchor, call_replacement, 'Auto Mode selection state handoff')

post_anchor = '''                updateStatusBox(
                    'Auto Mode checking the manual Mission Update source...'
                );

                // Only an explicit current Missing Vehicles/Personnel row may
                // add units after the initial attachment pass. A visible copy of the
                // full mission-definition table is not a Mission Update and must not
                // select the complete requirement set for a second time.
                const postUnitFinderUpdateRows =
                    readMissionUpdateRows();
                const postUnitFinderExplicitMissingRows =
                    getExplicitCurrentMissingRequirementRows(
                        postUnitFinderUpdateRows
                    );

                autoMissionUpdateRowsHandled =
                    postUnitFinderExplicitMissingRows.length;

                if (
                    postUnitFinderExplicitMissingRows.length > 0
                ) {
                    clearSelectionGuards();

                    await preparePoliceVehicleSafetyForRows(
                        postUnitFinderExplicitMissingRows,
                        'AUTO MISSION UPDATE'
                    );

                    const updated =
                        handleMissionUpdateUnits(
                            false,
                            postUnitFinderExplicitMissingRows
                        );

                    if (updated) {
                        await waitForFastDispatchReadiness(
                            'mission update fix',
                            {
                                minimumWait: 100,
                                stableFor: 250,
                                timeout: 900
                            }
                        );
                    }
                } else if (mfDebugEnabled) {
                    debugLog(
                        'AUTO MISSION UPDATE SKIP',
                        'No explicit current Missing Vehicles/Personnel rows; the full definition table was not reprocessed.'
                    );
                }
'''
post_replacement = '''                if (
                    shouldRunPostSelectionMissionUpdate(
                        autoSelectionRunState
                    )
                ) {
                    updateStatusBox(
                        'Auto Mode checking the manual Mission Update source...'
                    );

                    // A fresh Unit Finder mission may receive a genuinely new
                    // Missing Vehicles/Personnel row while selection is running.
                    // Re-read only in that fresh-mission route. A cycle that already
                    // used Mission Update authority must never process the same table
                    // a second time.
                    const postUnitFinderUpdateRows =
                        readMissionUpdateRows();
                    const postUnitFinderExplicitMissingRows =
                        getExplicitCurrentMissingRequirementRows(
                            postUnitFinderUpdateRows
                        );

                    autoMissionUpdateRowsHandled =
                        postUnitFinderExplicitMissingRows.length;

                    if (
                        postUnitFinderExplicitMissingRows.length > 0
                    ) {
                        clearSelectionGuards();

                        await preparePoliceVehicleSafetyForRows(
                            postUnitFinderExplicitMissingRows,
                            'AUTO MISSION UPDATE'
                        );

                        const updated =
                            handleMissionUpdateUnits(
                                false,
                                postUnitFinderExplicitMissingRows
                            );

                        if (updated) {
                            await waitForFastDispatchReadiness(
                                'mission update fix',
                                {
                                    minimumWait: 100,
                                    stableFor: 250,
                                    timeout: 900
                                }
                            );
                        }
                    } else if (mfDebugEnabled) {
                        debugLog(
                            'AUTO MISSION UPDATE SKIP',
                            'No explicit current Missing Vehicles/Personnel rows; the full definition table was not reprocessed.'
                        );
                    }
                } else {
                    autoMissionUpdateRowsHandled = Math.max(
                        1,
                        earlyUpdateRows.length
                    );

                    if (mfDebugEnabled) {
                        debugLog(
                            'AUTO MISSION UPDATE SINGLE PASS',
                            'Current Mission Update authority was already processed during the main selection pass; duplicate post-selection processing was suppressed.'
                        );
                    }
                }
'''
auto_loop = replace_once(auto_loop, post_anchor, post_replacement, 'single-pass post-update guard')
source = source[:start] + auto_loop + source[end:]

# Release documentation.
changelog = ROOT / 'CHANGELOG.md'
changelog_text = changelog.read_text(encoding='utf-8')
entry = '''## [1.0.61] - 2026-07-30

### Fixed

- Auto Mode now records whether the main selection pass used current Mission Update authority and suppresses the post-selection Mission Update re-read for that same cycle.
- Fresh Unit Finder missions still retain the late Missing Vehicles/Personnel check, so genuinely new shortages appearing during initial selection remain actionable.
- Trained-personnel Mission Update selection remains on the established exact-register route and is executed once rather than being repopulated by a duplicate update pass.

### Changed engine baseline

- Mission Finder increased from `V10.6.123` to `V10.6.124`.
- Personnel Assignment remains `1.3.7`.

'''
if '## [1.0.61]' not in changelog_text:
    changelog_text = changelog_text.replace('## [1.0.60]', entry + '## [1.0.60]', 1)
changelog.write_text(changelog_text, encoding='utf-8')

for path in [ROOT / 'README.md', ROOT / 'src' / 'README.md']:
    text = path.read_text(encoding='utf-8')
    text = text.replace('`1.0.60`', '`1.0.61`')
    text = text.replace('`V10.6.123`', '`V10.6.124`')
    path.write_text(text, encoding='utf-8')

# Keep version-sensitive permanent checks aligned with the new release.
for path in (ROOT / 'scripts').glob('*.mjs'):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('// @version      1.0.60', '// @version      1.0.61')
    updated = updated.replace('MISSION FINDER V10.6.123', 'MISSION FINDER V10.6.124')
    updated = updated.replace(' * MODULE 2: MISSION FINDER V10.6.123', ' * MODULE 2: MISSION FINDER V10.6.124')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

SOURCE.write_text(source, encoding='utf-8')
print('Applied v1.0.61 Mission Update single-pass correction.')
