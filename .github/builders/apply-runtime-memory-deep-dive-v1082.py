#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path('.')
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
source = SOURCE_PATH.read_text(encoding='utf-8')


def fail(message: str) -> None:
    raise SystemExit(message)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def function_span(text: str, name: str) -> tuple[int, int]:
    match = re.search(
        rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(',
        text,
    )
    if not match:
        fail(f'Function not found: {name}')

    open_paren = text.find('(', match.start(), match.end())
    paren_depth = 0
    state = 'code'
    quote = ''
    escaped = False
    index = open_paren
    close_paren = -1
    while index < len(text):
        ch = text[index]
        nxt = text[index + 1] if index + 1 < len(text) else ''
        if state == 'line_comment':
            if ch == '\n': state = 'code'
            index += 1
            continue
        if state == 'block_comment':
            if ch == '*' and nxt == '/':
                state = 'code'
                index += 2
                continue
            index += 1
            continue
        if state == 'string':
            if escaped: escaped = False
            elif ch == '\\': escaped = True
            elif ch == quote: state = 'code'
            index += 1
            continue
        if ch == '/' and nxt == '/':
            state = 'line_comment'
            index += 2
            continue
        if ch == '/' and nxt == '*':
            state = 'block_comment'
            index += 2
            continue
        if ch in ('"', "'", '`'):
            state = 'string'
            quote = ch
            index += 1
            continue
        if ch == '(':
            paren_depth += 1
        elif ch == ')':
            paren_depth -= 1
            if paren_depth == 0:
                close_paren = index
                break
        index += 1
    if close_paren < 0:
        fail(f'Function parameters not terminated: {name}')

    open_brace = text.find('{', close_paren)
    if open_brace < 0:
        fail(f'Function body not found: {name}')

    depth = 0
    state = 'code'
    quote = ''
    escaped = False
    index = open_brace
    while index < len(text):
        ch = text[index]
        nxt = text[index + 1] if index + 1 < len(text) else ''
        if state == 'line_comment':
            if ch == '\n': state = 'code'
            index += 1
            continue
        if state == 'block_comment':
            if ch == '*' and nxt == '/':
                state = 'code'
                index += 2
                continue
            index += 1
            continue
        if state == 'string':
            if escaped: escaped = False
            elif ch == '\\': escaped = True
            elif ch == quote: state = 'code'
            index += 1
            continue
        if ch == '/' and nxt == '/':
            state = 'line_comment'
            index += 2
            continue
        if ch == '/' and nxt == '*':
            state = 'block_comment'
            index += 2
            continue
        if ch in ('"', "'", '`'):
            state = 'string'
            quote = ch
            index += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return match.start(), index + 1
        index += 1
    fail(f'Function body not terminated: {name}')


def replace_function(text: str, name: str, replacement: str) -> str:
    start, end = function_span(text, name)
    return text[:start] + replacement.rstrip() + text[end:]


# Release baseline.
source = replace_once(source, '// @version      1.0.81', '// @version      1.0.82', 'userscript version')
source = source.replace('MISSION FINDER V10.6.141', 'MISSION FINDER V10.6.142')

# Idle event scanner: keep the immediate scan, but stop walking every iframe/document each second.
source = replace_once(
    source,
    'const MF_EVENT_COLLECTIBLE_SCAN_INTERVAL_MS = 1000;',
    'const MF_EVENT_COLLECTIBLE_SCAN_INTERVAL_MS =\n        15 * 1000;',
    'event scanner interval',
)
source = replace_function(
    source,
    'getMissionEventCollectibleDocuments',
    '''    function getMissionEventCollectibleDocuments() {
        try {
            return getMissionAccessibleDocuments(false)
                .slice(0, 24);
        } catch (_error) {
            return [document];
        }
    }''',
)

# Shared document topology cache lives longer; explicit invalidation/force refresh remains available.
source = replace_once(
    source,
    'expiresAt: now + 500,\n            documents',
    'expiresAt: now + 5000,\n            documents',
    'mission document cache lifetime',
)

# Background ownership reconciliation no longer force-walks all frames every five seconds.
source = replace_function(
    source,
    'reconcileMissionFinderFrameRuntimesFromTop',
    '''    function reconcileMissionFinderFrameRuntimesFromTop() {
        if (!MF_IS_TOP_WINDOW) return;

        try {
            getMissionAccessibleDocuments(false)
                .forEach(candidateDocument => {
                    if (candidateDocument === document) return;
                    dispatchMissionFinderFrameRuntimeEvent(
                        candidateDocument,
                        {
                            reason:
                                'top-window ownership supervisor'
                        }
                    );
                });
        } catch (_error) {}
    }''',
)
install_start, install_end = function_span(source, 'installBackgroundWatcherSupervisor')
install_body = source[install_start:install_end]
install_body = replace_once(
    install_body,
    '                5000\n',
    '                15 * 1000\n',
    'background supervisor interval',
)
source = source[:install_start] + install_body + source[install_end:]

# Start only the background pollers that currently own work.
watcher_helpers = '''
    function stopSilentQueueWatcher() {
        if (!mfSilentQueueWatcherTimer) return;
        clearInterval(mfSilentQueueWatcherTimer);
        mfSilentQueueWatcherTimer = null;
    }

    function stopBruteApproachTransportWatcher() {
        if (!mfBruteApproachWatcherTimer) return;
        clearInterval(mfBruteApproachWatcherTimer);
        mfBruteApproachWatcherTimer = null;
    }

    function stopPostTransportRehookWatcher() {
        if (!mfPostTransportRehookTimer) return;
        clearInterval(mfPostTransportRehookTimer);
        mfPostTransportRehookTimer = null;
    }

'''
source = replace_once(
    source,
    '    function syncBackgroundAutomationWatchers() {',
    watcher_helpers + '    function syncBackgroundAutomationWatchers() {',
    'watcher stop helper insertion',
)
source = replace_function(
    source,
    'syncBackgroundAutomationWatchers',
    '''    function syncBackgroundAutomationWatchers() {
        if (!MF_IS_TOP_WINDOW) return;

        autoModeRunning =
            !isManualAutoStopActive() &&
            (
                sessionStorage.getItem('mf_auto_mode_running') === 'true' ||
                localStorage.getItem('mf_auto_mode_running') === 'true'
            );

        mfQueueRestartEnabled =
            localStorage.getItem(
                'mf_next_queue_restart_enabled_v10'
            ) !== 'false';

        const silentQueueRequired = Boolean(
            sessionStorage.getItem(
                MF_QUEUE_WAIT_ACTIVE_FLAG
            ) === 'true' ||
            sessionStorage.getItem(
                MF_FINAL_QUEUE_DISPATCH_FLAG
            ) === 'true'
        );
        const transportWatcherRequired =
            isTransportAutomationAllowed();
        const postTransportWatcherRequired = Boolean(
            isPostTransportRehookPending() ||
            isRecentTransportRehookWindowActive()
        );

        if (silentQueueRequired) {
            startSilentQueueWatcher();
        } else {
            stopSilentQueueWatcher();
        }

        if (transportWatcherRequired) {
            startBruteApproachTransportWatcher();
        } else {
            stopBruteApproachTransportWatcher();
        }

        if (postTransportWatcherRequired) {
            startPostTransportRehookWatcher();
        } else {
            stopPostTransportRehookWatcher();
        }
    }''',
)
source = replace_function(
    source,
    'stopBackgroundWatcherIntervalsOnly',
    '''    function stopBackgroundWatcherIntervalsOnly() {
        stopSilentQueueWatcher();

        if (mfGlobalTransportWatcherTimer) {
            clearInterval(mfGlobalTransportWatcherTimer);
            mfGlobalTransportWatcherTimer = null;
        }

        stopBruteApproachTransportWatcher();
        stopPostTransportRehookWatcher();
    }''',
)

# Coalesce live personnel reads and avoid rebuilding identical DOM subtrees.
panel_helpers = '''    const MF_TRAINED_PERSONNEL_MUTATION_REFRESH_DELAY_MS =
        1200;
    const MF_LIVE_TRAINED_PERSONNEL_DISPLAY_CACHE_MS =
        1500;
    let mfTrainedPersonnelMutationRefreshTimer = null;
    let mfLiveTrainedPersonnelDisplayCache = {
        missionId: '',
        expiresAt: 0,
        rows: []
    };

    function invalidateLiveTrainedPersonnelDisplayCache() {
        mfLiveTrainedPersonnelDisplayCache = {
            missionId: '',
            expiresAt: 0,
            rows: []
        };
    }

    function cancelTrainedPersonnelPanelRefresh() {
        if (mfTrainedPersonnelMutationRefreshTimer) {
            clearTimeout(
                mfTrainedPersonnelMutationRefreshTimer
            );
            mfTrainedPersonnelMutationRefreshTimer = null;
        }
        invalidateLiveTrainedPersonnelDisplayCache();
    }

    function scheduleTrainedPersonnelPanelRefresh() {
        if (mfTrainedPersonnelMutationRefreshTimer) return;

        mfTrainedPersonnelMutationRefreshTimer = setTimeout(
            () => {
                mfTrainedPersonnelMutationRefreshTimer = null;
                renderSelectedTrainedPersonnelPanel();
            },
            MF_TRAINED_PERSONNEL_MUTATION_REFRESH_DELAY_MS
        );
    }

    function applyTrainedPersonnelPanelTextRender(
        summary,
        content,
        summaryText,
        contentMarkup
    ) {
        if (summary.textContent !== summaryText) {
            summary.textContent = summaryText;
        }
        if (content.innerHTML !== contentMarkup) {
            content.innerHTML = contentMarkup;
        }
    }

    function applyTrainedPersonnelPanelMarkupRender(
        summary,
        content,
        summaryMarkup,
        contentMarkup
    ) {
        if (summary.innerHTML !== summaryMarkup) {
            summary.innerHTML = summaryMarkup;
        }
        if (content.innerHTML !== contentMarkup) {
            content.innerHTML = contentMarkup;
        }
    }

'''
source = replace_once(
    source,
    '    function renderSelectedTrainedPersonnelPanel() {',
    panel_helpers + '    function renderSelectedTrainedPersonnelPanel() {',
    'trained personnel render helpers',
)

source = replace_function(
    source,
    'getLiveMissionTrainedPersonnelRequirementsForDisplay',
    '''    function getLiveMissionTrainedPersonnelRequirementsForDisplay() {
        if (
            !hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()
        ) {
            invalidateLiveTrainedPersonnelDisplayCache();
            return [];
        }

        const now = Date.now();
        const missionId =
            getCurrentMissionIdForQueueRestart() || '';
        const cached =
            mfLiveTrainedPersonnelDisplayCache;

        if (
            cached.missionId === missionId &&
            now < cached.expiresAt
        ) {
            return cached.rows;
        }

        let liveRows = [];

        try {
            liveRows = normaliseOperationalRequirementRows(
                readMissionUpdateRows({ silent: true })
            );
        } catch (error) {
            if (mfDebugEnabled) {
                debugLog(
                    'LIVE TRAINED PERSONNEL DISPLAY',
                    `current shortage read failed: ${error?.message || error}`
                );
            }

            invalidateLiveTrainedPersonnelDisplayCache();
            return [];
        }

        const requirements = new Map();

        liveRows
            .filter(row => {
                return (
                    row?.isTrainedPersonnelRequirement === true &&
                    Array.isArray(row?.personnelTrainingRequirements)
                );
            })
            .forEach(row => {
                row.personnelTrainingRequirements
                    .forEach(requirement => {
                        const requiredTrainingCodes =
                            Array.isArray(requirement?.requiredTrainingCodes)
                                ? requirement.requiredTrainingCodes
                                    .map(value => String(value || '').trim())
                                    .filter(Boolean)
                                : [];
                        const code =
                            requiredTrainingCodes[0] ||
                            String(requirement?.code || '')
                                .replace(/_vehicle$/i, '')
                                .trim();
                        const missing = Math.max(
                            0,
                            parseInt(
                                requirement?.personnelRequired ??
                                requirement?.required,
                                10
                            ) || 0
                        );

                        if (!code || missing <= 0) return;

                        const existing =
                            requirements.get(code);

                        if (
                            !existing ||
                            missing > existing.missing
                        ) {
                            requirements.set(code, {
                                code,
                                label:
                                    getSelectedTrainingDisplayLabel(code),
                                missing
                            });
                        }
                    });
            });

        const rows = Array.from(requirements.values())
            .sort((left, right) => {
                return left.label.localeCompare(right.label);
            });

        mfLiveTrainedPersonnelDisplayCache = {
            missionId,
            expiresAt:
                now +
                MF_LIVE_TRAINED_PERSONNEL_DISPLAY_CACHE_MS,
            rows
        };

        return rows;
    }''',
)

source = replace_once(
    source,
    '''                summary.textContent =
                    'No current trained-personnel shortage is reported.';
                content.innerHTML =
                    '<span class="mf2026-small">Vehicles are on scene. Live personnel and course shortages are authoritative; Mission Required Personnel is shown only before the first vehicle arrives on scene.</span>';''',
    '''                applyTrainedPersonnelPanelTextRender(
                    summary,
                    content,
                    'No current trained-personnel shortage is reported.',
                    '<span class="mf2026-small">Vehicles are on scene. Live personnel and course shortages are authoritative; Mission Required Personnel is shown only before the first vehicle arrives on scene.</span>'
                );''',
    'on-scene empty trained panel render',
)
source = replace_once(
    source,
    '''                summary.textContent =
                    'Loading mission Required Personnel...';
                content.innerHTML =
                    '<span class="mf2026-small">Reading the mission requirement table before unit selection.</span>';''',
    '''                applyTrainedPersonnelPanelTextRender(
                    summary,
                    content,
                    'Loading mission Required Personnel...',
                    '<span class="mf2026-small">Reading the mission requirement table before unit selection.</span>'
                );''',
    'loading trained panel render',
)
source = replace_once(
    source,
    '''            summary.textContent =
                'No required or selected trained-personnel evidence is available.';
            content.innerHTML =
                '<span class="mf2026-small">Mission Required Personnel and selected trained personnel will appear here.</span>';''',
    '''            applyTrainedPersonnelPanelTextRender(
                summary,
                content,
                'No required or selected trained-personnel evidence is available.',
                '<span class="mf2026-small">Mission Required Personnel and selected trained personnel will appear here.</span>'
            );''',
    'empty trained panel render',
)
source = replace_once(
    source,
    "        summary.innerHTML = summaryParts.join('');",
    "        const summaryMarkup = summaryParts.join('');",
    'trained panel summary markup',
)
source = replace_once(
    source,
    '''        content.innerHTML =
            requiredMarkup +
            liveMissingMarkup +
            selectedMarkup;''',
    '''        const contentMarkup =
            requiredMarkup +
            liveMissingMarkup +
            selectedMarkup;

        applyTrainedPersonnelPanelMarkupRender(
            summary,
            content,
            summaryMarkup,
            contentMarkup
        );''',
    'trained panel final markup',
)

# Mutation-driven refresh is deliberately delayed and cache-aware.
source = replace_once(
    source,
    '''        if (
            missionPage &&
            wrapper &&
            shouldRefreshTrainedPersonnelPanel
        ) {
            renderSelectedTrainedPersonnelPanel();
        }''',
    '''        if (
            missionPage &&
            wrapper &&
            shouldRefreshTrainedPersonnelPanel
        ) {
            invalidateLiveTrainedPersonnelDisplayCache();
            scheduleTrainedPersonnelPanelRefresh();
        }''',
    'mutation trained panel refresh',
)

# Cancel pending panel work when a mission surface loses ownership.
source = replace_once(
    source,
    '''        stopSessionRuntimeTicker();
        cleanupMissionFinderIphoneNativePickerSurfaces();''',
    '''        stopSessionRuntimeTicker();
        cancelTrainedPersonnelPanelRefresh();
        cleanupMissionFinderIphoneNativePickerSurfaces();''',
    'closed mission trained refresh cleanup',
)
source = replace_once(
    source,
    '''        stopSessionRuntimeTicker();
        stopMissionFinderRuntimeMemoryMaintenance();
        removeMissionFinderRuntimeMemoryActivityTracking();''',
    '''        stopSessionRuntimeTicker();
        stopMissionFinderRuntimeMemoryMaintenance();
        cancelTrainedPersonnelPanelRefresh();
        removeMissionFinderRuntimeMemoryActivityTracking();''',
    'inactive frame trained refresh cleanup',
)

# High-heap recovery can no longer be starved forever by benign live DOM mutations.
source = replace_once(
    source,
    '''    const MF_AUTO_MEMORY_RECYCLE_HEAP_THRESHOLD_BYTES =
        640 * 1024 * 1024;''',
    '''    const MF_AUTO_MEMORY_RECYCLE_HEAP_THRESHOLD_BYTES =
        640 * 1024 * 1024;
    const MF_RUNTIME_MEMORY_EMERGENCY_RECYCLE_THRESHOLD_BYTES =
        700 * 1024 * 1024;''',
    'emergency recycle threshold',
)
source = replace_function(
    source,
    'shouldRecycleIdleMissionMemory',
    '''    function shouldRecycleIdleMissionMemory() {
        if (
            autoModeRunning ||
            sessionStorage.getItem(
                'mf_auto_mode_running'
            ) === 'true' ||
            !isMissionPage() ||
            !isCurrentMissionExecutionOwner(
                'idle memory maintenance'
            ) ||
            document.visibilityState === 'hidden' ||
            mfRuntimeSuspendedForPageHide ||
            mfRuntimeSuspendedForInactiveFrame ||
            vehicleLoadState.ready ||
            isMissionFinderMemoryWorkActive() ||
            hasSelectedMissionVehiclesForMemoryRecycle() ||
            mfMissionRequirementPreloadPromise ||
            mfMissionRequirementPreloadCache.status === 'loading'
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

        const now = Date.now();
        const emergencyRecycle =
            heap.usedJSHeapSize >=
                MF_RUNTIME_MEMORY_EMERGENCY_RECYCLE_THRESHOLD_BYTES;

        if (
            now - mfRuntimeMemoryLastActivityAt <
                MF_RUNTIME_MEMORY_IDLE_MS ||
            (
                !emergencyRecycle &&
                now - mfRuntimeMemoryLastMutationAt <
                    MF_RUNTIME_MEMORY_STABLE_MS
            )
        ) {
            return null;
        }

        const previous = readAutoMemoryRecycleState();
        if (
            previous &&
            now - Number(previous.lastRecycleAt || 0) <
                MF_AUTO_MEMORY_RECYCLE_COOLDOWN_MS
        ) {
            return null;
        }

        return heap;
    }''',
)

# Soft maintenance also releases recent render caches and stale detached modal references.
flush_start, flush_end = function_span(source, 'flushMissionFinderEphemeralMemory')
flush_body = source[flush_start:flush_end]
flush_body = replace_once(
    flush_body,
    '''        pruneLiveTrainingVerifyCache();
        pruneMissionFinderIphoneNativePickerDocuments();''',
    '''        pruneLiveTrainingVerifyCache();
        pruneMissionFinderIphoneNativePickerDocuments();
        invalidateLiveTrainedPersonnelDisplayCache();

        if (
            mfTransportOwnerModal &&
            !mfTransportOwnerModal.isConnected
        ) {
            mfTransportOwnerModal = null;
        }''',
    'soft flush retained UI state',
)
source = source[:flush_start] + flush_body + source[flush_end:]

SOURCE_PATH.write_text(source, encoding='utf-8')

# Update permanent version expectations.
for path in sorted((ROOT / 'scripts').glob('check-*.mjs')):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.81', '// @version      1.0.82')
    text = text.replace('MISSION FINDER V10.6.141', 'MISSION FINDER V10.6.142')
    path.write_text(text, encoding='utf-8')

# Add a focused permanent regression.
check_path = ROOT / 'scripts/check-runtime-memory-deep-dive-v1082.mjs'
check_path.write_text(r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  if (start < 0) fail(`Unable to find ${name}`);
  const openParen = source.indexOf('(', start);
  let parenDepth = 0;
  let quote = '';
  let escaped = false;
  let closeParen = -1;
  for (let i = openParen; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '(') parenDepth += 1;
    else if (ch === ')' && --parenDepth === 0) { closeParen = i; break; }
  }
  const openBrace = source.indexOf('{', closeParen);
  let depth = 0;
  quote = '';
  escaped = false;
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

expect(source.includes('// @version      1.0.82'), 'Expected Command Nexus 1.0.82');
expect(source.includes('MISSION FINDER V10.6.142'), 'Expected Mission Finder V10.6.142');
expect(source.includes('15 * 1000;'), 'Expected reduced idle scan cadence');

const eventDocuments = extractFunction('getMissionEventCollectibleDocuments');
expect(eventDocuments.includes('getMissionAccessibleDocuments(false)'), 'Event scanner must share the bounded document cache');
expect(!eventDocuments.includes("querySelectorAll('iframe')"), 'Event scanner must not independently walk every iframe');

const reconcile = extractFunction('reconcileMissionFinderFrameRuntimesFromTop');
expect(reconcile.includes('getMissionAccessibleDocuments(false)'), 'Frame supervisor must not force-refresh the document graph');

const syncWatchers = extractFunction('syncBackgroundAutomationWatchers');
for (const token of ['silentQueueRequired', 'transportWatcherRequired', 'postTransportWatcherRequired', 'stopSilentQueueWatcher()', 'stopPostTransportRehookWatcher()']) {
  expect(syncWatchers.includes(token), `Background watcher gating missing ${token}`);
}

const mutationFlush = extractFunction('flushMissionFinderMutationWork');
expect(mutationFlush.includes('scheduleTrainedPersonnelPanelRefresh()'), 'Mutation path must debounce the trained panel');
expect(!mutationFlush.includes('renderSelectedTrainedPersonnelPanel();'), 'Mutation path must not synchronously rebuild the trained panel');

const panel = extractFunction('renderSelectedTrainedPersonnelPanel');
expect(panel.includes('applyTrainedPersonnelPanelMarkupRender('), 'Trained panel must use unchanged-markup suppression');
expect(!panel.includes("summary.innerHTML = summaryParts.join('')"), 'Trained panel must not unconditionally rebuild summary DOM');

const liveRows = extractFunction('getLiveMissionTrainedPersonnelRequirementsForDisplay');
for (const token of ['mfLiveTrainedPersonnelDisplayCache', 'MF_LIVE_TRAINED_PERSONNEL_DISPLAY_CACHE_MS', 'cached.expiresAt']) {
  expect(liveRows.includes(token), `Live trained-personnel cache missing ${token}`);
}

const idleRecycle = extractFunction('shouldRecycleIdleMissionMemory');
expect(idleRecycle.includes('MF_RUNTIME_MEMORY_EMERGENCY_RECYCLE_THRESHOLD_BYTES'), 'Emergency recycle threshold missing');
expect(idleRecycle.includes('!emergencyRecycle'), 'Emergency recycle must bypass mutation-stability starvation');
expect(idleRecycle.includes('mfRuntimeMemoryLastActivityAt'), 'Emergency recycle must still require user idle time');

const softFlush = extractFunction('flushMissionFinderEphemeralMemory');
expect(softFlush.includes('invalidateLiveTrainedPersonnelDisplayCache()'), 'Soft flush must release live panel cache');
expect(softFlush.includes('!mfTransportOwnerModal.isConnected'), 'Soft flush must release detached transport modal references');

const observerCount = (source.match(/new\s+MutationObserver\s*\(/g) || []).length;
expect(observerCount === 2, `Expected exactly two permanent observers; found ${observerCount}`);

console.log('Runtime memory deep-dive contracts passed.');
''', encoding='utf-8')

# Register the new regression in permanent CI.
workflow_path = ROOT / '.github/workflows/validate-userscript.yml'
workflow = workflow_path.read_text(encoding='utf-8')
anchor_path = "      - 'scripts/check-runtime-memory-maintenance-v1074.mjs'\n"
if workflow.count(anchor_path) < 2:
    fail('Permanent workflow path anchor missing')
workflow = workflow.replace(
    anchor_path,
    anchor_path + "      - 'scripts/check-runtime-memory-deep-dive-v1082.mjs'\n",
)
anchor_step = '''      - name: Validate runtime memory maintenance and frame ownership
        run: node scripts/check-runtime-memory-maintenance-v1074.mjs
'''
workflow = replace_once(
    workflow,
    anchor_step,
    anchor_step + '''
      - name: Validate runtime memory deep-dive hardening
        run: node scripts/check-runtime-memory-deep-dive-v1082.mjs
''',
    'permanent workflow step',
)
workflow_path.write_text(workflow, encoding='utf-8')

# Documentation.
for path in (ROOT / 'README.md', ROOT / 'src/README.md'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('`1.0.81`', '`1.0.82`')
    text = text.replace('`V10.6.141`', '`V10.6.142`')
    path.write_text(text, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.82] - 2026-08-02

### Fixed

- Reduced the default-on Event Scanner from a one-second independent iframe/document walk to a shared cached document snapshot every 15 seconds, while retaining the immediate startup scan and exact claim route.
- Reduced top-window mission-frame reconciliation from a forced document-graph rebuild every five seconds to a cached reconciliation every 15 seconds.
- Background automation now starts only the silent-queue and post-transport pollers whose state is actually active instead of running all three watchers for the whole Auto Mode session.
- Live Trained Personnel updates are now coalesced, cached briefly and skipped when generated markup is unchanged, preventing repeated full parser/model work and detached DOM churn on rapidly mutating mission pages.
- High-heap idle recovery can now recycle safely above 700 MiB after user-idle and operational safety checks even when benign live mission mutations prevent a 15-second mutation-free window.
- Soft memory maintenance releases the live personnel display cache and stale detached transport-modal references.

### Safety and compatibility

- No additional observer, repeating timer, fetch, selection or dispatch path was added.
- Exact Unit Finder, Mission Update, trained-personnel authority, patient/prisoner transport, Auto Mode mission ownership and final dispatch safeguards remain unchanged.
- Event collection remains enabled by the existing setting and still performs an immediate scan when the runtime starts.
- iPhone/iPadOS ownership and native-picker cleanup paths remain intact.

### Changed engine baseline

- Mission Finder increased from `V10.6.141` to `V10.6.142`.
- Unit Naming remains `3.3.9`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

'''
marker = '## [1.0.81] - 2026-08-01\n'
if marker not in changelog:
    fail('Changelog 1.0.81 marker missing')
changelog = changelog.replace(marker, entry + marker, 1)
changelog_path.write_text(changelog, encoding='utf-8')

print('Applied runtime memory deep-dive candidate 1.0.82.')
