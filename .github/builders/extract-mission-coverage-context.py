#!/usr/bin/env python3
from pathlib import Path
import re

SOURCE = Path('src/missionchief-command-nexus.user.js')
OUT = Path('tmp/mission-coverage-context')
lines = SOURCE.read_text(encoding='utf-8').splitlines()
OUT.mkdir(parents=True, exist_ok=True)


def numbered(start, end):
    return ''.join(f'{i + 1:06d}: {lines[i]}\n' for i in range(start, end))


def extract_function(name):
    pattern = re.compile(rf'\b(?:async\s+)?function\s+{re.escape(name)}\s*\(')
    for index, line in enumerate(lines):
        if not pattern.search(line):
            continue
        start = max(0, index - 14)
        depth = 0
        opened = False
        end = min(len(lines), index + 800)
        for i in range(index, min(len(lines), index + 4000)):
            text = lines[i]
            depth += text.count('{') - text.count('}')
            opened = opened or '{' in text
            if opened and depth <= 0:
                end = i + 1
                break
        return numbered(start, min(len(lines), end + 14))
    return f'NOT FOUND: {name}\n'


def extract_terms(filename, terms, before=25, after=55, limit=20):
    chunks = []
    for term in terms:
        matches = [i for i, line in enumerate(lines) if term.lower() in line.lower()]
        chunks.append(f'===== {term!r}: {len(matches)} matches =====\n')
        for i in matches[:limit]:
            start = max(0, i - before)
            end = min(len(lines), i + after + 1)
            chunks.append(f'--- lines {start + 1}-{end}; match {i + 1} ---\n')
            chunks.append(numbered(start, end))
    (OUT / filename).write_text(''.join(chunks), encoding='utf-8')

functions = [
    'renderVehicleLoadList',
    'renderVehicleLoadListNow',
    'refreshVehicleRequirementCounters',
    'renderSelectedTrainedPersonnelPanel',
    'getSelectedTrainedPersonnelPanelModel',
    'getSelectedTrainedPersonnelCountForCode',
    'getPreloadedMissionTrainedPersonnelRequirements',
    'getMissionRequirementPreloadState',
    'getCachedMissionRequirementRows',
    'preloadMissionRequiredPersonnel',
    'scheduleMissionRequiredPersonnelPreload',
    'readLiveMissionRequirements',
    'updateVehicleLoadState',
    'setVehicleLoadState',
    'resetVehicleLoadState',
    'readPersonnelTrainingRegistry',
    'getRegistryEntryForMissionCheckbox',
    'getMissionVehicleId',
    'getVehicleDebugName',
]
for function_name in functions:
    (OUT / f'{function_name}.txt').write_text(
        extract_function(function_name), encoding='utf-8'
    )

extract_terms('vehicle-load-declaration.txt', [
    'const vehicleLoadState =',
    'let vehicleLoadState =',
    'vehicleLoadState.rows =',
    'vehicleLoadState.rows.push',
    'rows: vehicleLoadState.rows',
], before=25, after=50, limit=40)
extract_terms('vehicle-load-population.txt', [
    'originalName:',
    'mappedName:',
    'status: \'missing\'',
    'status: \'selected\'',
    'required: required',
], before=22, after=45, limit=60)
extract_terms('preloaded-row-shape.txt', [
    'missionDefinitionRequiredPersonnel',
    'isTrainedPersonnelRequirement',
    'personnelTrainingRequirements',
    'missionDefinition',
], before=35, after=75, limit=40)
extract_terms('mission-dom-observers.txt', [
    'new MutationObserver',
    'MutationObserver(',
    'mission_vehicle_driving',
    'mission_vehicle_at_mission',
    'vehicle_checkbox',
], before=30, after=80, limit=60)
extract_terms('training-registry-shape.txt', [
    'assignedTrainingProfiles',
    'trainingProfilesComplete',
    'trainingCounts',
    'vehicles: {}',
], before=35, after=75, limit=50)
print(f'wrote exact mission coverage contexts from {len(lines)} source lines')
