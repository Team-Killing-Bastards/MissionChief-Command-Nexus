#!/usr/bin/env python3
from pathlib import Path

source_path = Path('src/missionchief-command-nexus.user.js')
output_path = Path('.github/diagnostics/runtime-memory-hotpaths-v1082.txt')
lines = source_path.read_text(encoding='utf-8').splitlines()
output_path.parent.mkdir(parents=True, exist_ok=True)

needles = [
    'MF_MUTATION_RELEVANT_SELECTOR',
    'MF_MUTATION_RELEVANT_TARGET_SELECTOR',
    'MF_MUTATION_VEHICLE_SELECTOR',
    'MF_MUTATION_MISSION_SELECTOR',
    'MF_MUTATION_MISSION_TARGET_SELECTOR',
    'MF_MUTATION_PATIENT_SELECTOR',
    'MF_MUTATION_TRANSPORT_SELECTOR',
    'function shouldIgnoreMissionFinderMutationRecord',
    'function mutationNodeMatches',
    'function mutationTargetWithin',
    'function getMissionAccessibleDocuments',
    'function startMissionEventCollectibleCollector',
    'function stopMissionEventCollectibleCollector',
    'function startMissionFinderObserver',
    'mfMainMutationObserver.observe',
    'function renderSelectedTrainedPersonnelPanel',
    'function getLiveMissionTrainedPersonnelRequirementsForDisplay',
    'function readMissionUpdateRows',
    'function normaliseOperationalRequirementRows',
    'function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority',
    'function getSelectedVehicleTrainingCoverageRows',
    'function getMissionFinderRuntimeMemoryBlockReason',
    'function runMissionFinderRuntimeMemoryMaintenance',
    'function performMissionFinderRuntimeMemorySoftFlush',
    'function requestMissionFinderMemoryRecycle',
    'function shouldRunBackgroundAutomationWatchers',
    'function mfHasPotentialTransportUi',
    'function getVisibleQueueOpenModals',
    'function isMissionScreenVisibleForQueueRestart',
    'mfVehicleCheckboxCache',
    'mfMissionContextCache',
    'missionUpdateRowsCache',
    'mfLastMissionDefinitionRawRows',
    'const mfDebugRows',
    'mfEventCollectibleScanTimer',
]

matches = []
for number, line in enumerate(lines, 1):
    if any(needle in line for needle in needles):
        matches.append((number, line.strip()))

ranges = []
for number, label in matches:
    start = max(1, number - 35)
    end = min(len(lines), number + 180)
    if ranges and start <= ranges[-1][1] + 15:
        ranges[-1] = (ranges[-1][0], max(ranges[-1][1], end), ranges[-1][2] + ' | ' + label)
    else:
        ranges.append((start, end, label))

parts = []
for start, end, label in ranges:
    parts.append(
        f'===== {label} | source lines {start}-{end} =====\n' +
        '\n'.join(f'{index:05d}: {lines[index - 1]}' for index in range(start, end + 1))
    )

parts.append('===== ALL SETINTERVAL CALL WINDOWS =====')
for number, line in enumerate(lines, 1):
    if 'setInterval' not in line:
        continue
    start = max(1, number - 25)
    end = min(len(lines), number + 65)
    parts.append(
        f'--- setInterval source line {number} | {line.strip()} ---\n' +
        '\n'.join(f'{index:05d}: {lines[index - 1]}' for index in range(start, end + 1))
    )

output_path.write_text('\n\n'.join(parts) + '\n', encoding='utf-8')
print(f'Wrote {output_path} with {len(ranges)} merged hot-path ranges and {sum(1 for line in lines if "setInterval" in line)} interval windows.')
