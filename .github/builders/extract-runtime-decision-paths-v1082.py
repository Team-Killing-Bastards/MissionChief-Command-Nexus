#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
output = Path('.github/diagnostics/runtime-memory-decision-paths-v1082.txt')
output.parent.mkdir(parents=True, exist_ok=True)


def function(name: str) -> str:
    match = re.search(rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(', source)
    if not match:
        return f'FUNCTION NOT FOUND: {name}\n'
    brace = source.find('{', match.end())
    depth = 0
    state = 'code'
    quote = ''
    escaped = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if state == 'line':
            if ch == '\n': state = 'code'
            i += 1; continue
        if state == 'block':
            if ch == '*' and nxt == '/': state = 'code'; i += 2; continue
            i += 1; continue
        if state == 'string':
            if escaped: escaped = False
            elif ch == '\\': escaped = True
            elif ch == quote: state = 'code'
            i += 1; continue
        if ch == '/' and nxt == '/': state = 'line'; i += 2; continue
        if ch == '/' and nxt == '*': state = 'block'; i += 2; continue
        if ch in ('"', "'", '`'): state = 'string'; quote = ch; i += 1; continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return source[match.start():i + 1] + '\n'
        i += 1
    return f'UNTERMINATED: {name}\n'


def references(token: str, radius: int = 18) -> str:
    lines = source.splitlines()
    hits = [idx for idx, line in enumerate(lines) if token in line]
    if not hits: return f'NOT FOUND: {token}\n'
    chunks = []
    for hit in hits[:12]:
        start = max(0, hit - radius)
        end = min(len(lines), hit + radius + 1)
        chunks.append('\n'.join(f'{i + 1:05d}: {lines[i]}' for i in range(start, end)))
    return '\n\n'.join(chunks) + '\n'

functions = [
    'shouldRecycleIdleMissionMemory',
    'flushMissionFinderEphemeralMemory',
    'isMissionFinderMemoryWorkActive',
    'installMissionFinderRuntimeMemoryActivityTracking',
    'removeMissionFinderRuntimeMemoryActivityTracking',
    'pruneMissionFinderIphoneNativePickerDocuments',
    'cleanupMissionFinderIphoneNativePickerSurfaces',
    'readMissionUpdateRows',
    'normaliseOperationalRequirementRows',
    'renderSelectedTrainedPersonnelPanel',
    'getLiveMissionTrainedPersonnelRequirementsForDisplay',
    'getSelectedVehicleTrainingCoverageRows',
    'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority',
    'shouldIgnoreMissionFinderMutationRecord',
    'mutationNodeMatches',
    'mutationTargetWithin',
    'stopBackgroundWatcherIntervalsOnly',
    'stopAutoMode',
    'isPostTransportRehookPending',
    'isRecentTransportRehookWindowActive',
    'clearQueueWaitFlags',
]

tokens = [
    'MF_MUTATION_RELEVANT_SELECTOR',
    'MF_MUTATION_RELEVANT_TARGET_SELECTOR',
    'MF_MUTATION_MISSION_SELECTOR',
    'MF_MUTATION_MISSION_TARGET_SELECTOR',
    'MF_MUTATION_VEHICLE_SELECTOR',
    'MF_MUTATION_PATIENT_SELECTOR',
    'MF_MUTATION_TRANSPORT_SELECTOR',
    'MF_RUNTIME_MEMORY_IDLE_MS',
    'MF_RUNTIME_MEMORY_STABLE_MS',
    'MF_AUTO_MEMORY_RECYCLE_HEAP_THRESHOLD_BYTES',
    'MF_RUNTIME_MEMORY_SOFT_FLUSH_THRESHOLD_BYTES',
    'mfRuntimeMemoryLastMutationAt = Date.now()',
    'mfTransportOwnerModal =',
    'mfIphoneNativePickerDocuments.add',
    'mfIphoneNativePickerDocuments.clear',
    'missionUpdateRowsCache',
]

parts = []
for name in functions:
    parts.append(f'===== FUNCTION {name} =====\n{function(name)}')
for token in tokens:
    parts.append(f'===== REFERENCES {token} =====\n{references(token)}')
output.write_text('\n\n'.join(parts), encoding='utf-8')
print(f'Wrote {output}')
