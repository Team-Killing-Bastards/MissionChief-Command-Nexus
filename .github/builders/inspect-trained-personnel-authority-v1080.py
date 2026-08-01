#!/usr/bin/env python3
import re
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')


def extract_function(name: str) -> str:
    match = re.search(
        rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(',
        source
    )
    if not match:
        return f'FUNCTION NOT FOUND: {name}\n'
    start = match.start()
    name_index = source.find(name, start, match.end() + len(name) + 20)
    open_paren = source.find('(', name_index)
    paren_depth = 0
    quote = ''
    escaped = False
    close_paren = -1
    index = open_paren
    while index < len(source):
        character = source[index]
        if quote:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                quote = ''
            index += 1
            continue
        if character in ('"', "'", '`'):
            quote = character
            index += 1
            continue
        if character == '(':
            paren_depth += 1
        elif character == ')':
            paren_depth -= 1
            if paren_depth == 0:
                close_paren = index
                break
        index += 1
    if close_paren < 0:
        return f'PARAMETERS NOT TERMINATED: {name}\n'
    body_start = source.find('{', close_paren)
    if body_start < 0:
        return f'BODY NOT FOUND: {name}\n'
    depth = 0
    quote = ''
    escaped = False
    index = body_start
    while index < len(source):
        character = source[index]
        next_character = source[index + 1] if index + 1 < len(source) else ''
        if quote:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                quote = ''
            index += 1
            continue
        if character in ('"', "'", '`'):
            quote = character
            index += 1
            continue
        if character == '/' and next_character == '/':
            line_end = source.find('\n', index + 2)
            index = len(source) if line_end < 0 else line_end + 1
            continue
        if character == '/' and next_character == '*':
            block_end = source.find('*/', index + 2)
            index = len(source) if block_end < 0 else block_end + 2
            continue
        if character == '{':
            depth += 1
        elif character == '}':
            depth -= 1
            if depth == 0:
                return source[start:index + 1] + '\n'
        index += 1
    return f'UNTERMINATED FUNCTION: {name}\n'

names = [
    'processRequirementRows',
    'getPreloadedMissionTrainedPersonnelRequirements',
    'renderSelectedTrainedPersonnelPanel',
    'getSelectedTrainedPersonnelPanelModel',
    'readLiveMissionRequirements',
    'getCachedMissionRequirementRows',
    'hasExplicitCurrentMissingRequirementRows',
    'normaliseOperationalRequirementRows',
    'extractLiveMissionRequirementRows',
    'readMissionUpdateRows',
    'hasAuthoritativeLiveMissionRequirementsPanel',
    'getMissionAccessibleDocuments',
    'getVehicleCheckboxSnapshot',
    'getMissionVehicleId',
    'handleMissionUpdateUnits',
    'selectVehiclesForTrainedPersonnelRequirements',
]

lines = source.splitlines()
markers = []
needles = (
    'on scene', 'on_scene', 'on-scene', 'status_4', 'status-4',
    'vehicle_status_4', 'vehicle-status-4', 'vehicle_marker_s',
    'vehiclestatus', 'vehicle_status', 'mission_vehicle', 'arrived',
    'fms_real', 'fms-real', 'data-fms', 'data-status', 'status="4"',
    "status='4'", 'at_mission', 'at-mission', 'atmission',
    'vehicle_at_mission', 'vehicle-at-mission', 'vehicleatmission',
    'mission vehicle', 'mission-vehicle', 'mission_vehicle'
)
seen = set()
for number, line in enumerate(lines, 1):
    lower = line.lower()
    if any(needle in lower for needle in needles):
        start = max(1, number - 5)
        end = min(len(lines), number + 5)
        key = (start, end)
        if key in seen:
            continue
        seen.add(key)
        markers.append(f'--- lines {start}-{end} ---\n' + '\n'.join(
            f'{idx}: {lines[idx - 1]}' for idx in range(start, end + 1)
        ))

output = [
    'CURRENT VERSION LINES',
    '\n'.join(line for line in lines[:200] if '@version' in line or 'MISSION FINDER V' in line),
    '',
]
for name in names:
    output.extend([f'===== {name} =====', extract_function(name), ''])
output.extend(['===== STATUS MARKERS =====', '\n\n'.join(markers)])

path = Path('.github/diagnostics/trained-personnel-authority-v1080.txt')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text('\n'.join(output), encoding='utf-8')
