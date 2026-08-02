#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
OUTPUT = Path('.github/diagnostics/runtime-memory-root-causes-v1082.txt')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def extract_function(name: str) -> str:
    match = re.search(
        rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(',
        SOURCE,
    )
    if not match:
        return f'FUNCTION NOT FOUND: {name}\n'
    open_brace = SOURCE.find('{', match.end())
    if open_brace < 0:
        return f'OPEN BRACE NOT FOUND: {name}\n'
    depth = 0
    state = 'code'
    quote = ''
    escaped = False
    index = open_brace
    while index < len(SOURCE):
        ch = SOURCE[index]
        nxt = SOURCE[index + 1] if index + 1 < len(SOURCE) else ''
        if state == 'line_comment':
            if ch == '\n':
                state = 'code'
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
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                state = 'code'
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
                return SOURCE[match.start():index + 1] + '\n'
        index += 1
    return f'UNTERMINATED FUNCTION: {name}\n'


def extract_named_block(name: str, radius: int = 35) -> str:
    lines = SOURCE.splitlines()
    hits = [i for i, line in enumerate(lines) if name in line]
    if not hits:
        return f'NAME NOT FOUND: {name}\n'
    parts = []
    for hit in hits[:8]:
        start = max(0, hit - radius)
        end = min(len(lines), hit + radius + 1)
        parts.append(
            f'--- {name} near source line {hit + 1} ---\n' +
            '\n'.join(f'{idx + 1:05d}: {lines[idx]}' for idx in range(start, end))
        )
    return '\n\n'.join(parts) + '\n'

functions = [
    'getMissionAccessibleDocuments',
    'getMissionEventCollectibleDocuments',
    'scanMissionEventCollectibles',
    'startMissionEventCollectibleCollector',
    'stopMissionEventCollectibleCollector',
    'shouldRunBackgroundAutomationWatchers',
    'syncBackgroundAutomationWatchers',
    'installBackgroundWatcherSupervisor',
    'reconcileMissionFinderFrameRuntimesFromTop',
    'getMissionFinderRuntimeMemoryBlockReason',
    'runMissionFinderRuntimeMemoryMaintenance',
    'performMissionFinderRuntimeMemorySoftFlush',
    'requestMissionFinderMemoryRecycle',
    'requestAutoMissionMemoryRecycle',
    'shouldRecycleAutoMissionMemoryBeforeSelection',
    'classifyMissionFinderMutations',
    'flushMissionFinderMutationWork',
    'renderSelectedTrainedPersonnelPanel',
    'getLiveMissionTrainedPersonnelRequirementsForDisplay',
    'readMissionUpdateRows',
    'normaliseOperationalRequirementRows',
    'getSelectedVehicleTrainingCoverageRows',
    'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority',
    'mfHasPotentialTransportUi',
    'getVisibleQueueOpenModals',
    'isMissionScreenVisibleForQueueRestart',
    'suspendMissionFinderRuntimeForInactiveFrame',
    'cleanupMissionFinderRuntime',
    'removeMissionFinderPanelForClosedMission',
    'cleanupMissionFinderIphoneNativePickerSurfaces',
]

names = [
    'MF_MUTATION_RELEVANT_SELECTOR',
    'MF_MUTATION_RELEVANT_TARGET_SELECTOR',
    'MF_MUTATION_VEHICLE_SELECTOR',
    'MF_MUTATION_MISSION_SELECTOR',
    'MF_MUTATION_MISSION_TARGET_SELECTOR',
    'MF_MUTATION_PATIENT_SELECTOR',
    'MF_MUTATION_TRANSPORT_SELECTOR',
    'MF_RUNTIME_MEMORY_RECENT_ACTIVITY_MS',
    'MF_RUNTIME_MEMORY_RECENT_MUTATION_MS',
    'MF_RUNTIME_MEMORY_SOFT_FLUSH_COOLDOWN_MS',
    'MF_RUNTIME_MEMORY_HARD_RECYCLE_COOLDOWN_MS',
    'MF_RUNTIME_MEMORY_MAINTENANCE_INTERVAL_MS',
    'MF_RUNTIME_MEMORY_SOFT_FLUSH_THRESHOLD_BYTES',
    'MF_AUTO_MEMORY_RECYCLE_HEAP_THRESHOLD_BYTES',
    'mfRuntimeMemoryLastActivityAt',
    'mfRuntimeMemoryLastMutationAt',
    'mfIphoneNativePickerDocuments',
    'mfTransportOwnerModal',
    'mfVehicleCheckboxCache',
    'mfMissionContextCache',
    'missionUpdateRowsCache',
    'mfLastMissionDefinitionRawRows',
    'mfDebugRows',
]

parts = []
for name in functions:
    parts.append(f'===== FUNCTION {name} =====\n{extract_function(name)}')
for name in names:
    parts.append(f'===== REFERENCES {name} =====\n{extract_named_block(name)}')

OUTPUT.write_text('\n\n'.join(parts), encoding='utf-8')
print(f'Wrote {OUTPUT}')
