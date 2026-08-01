#!/usr/bin/env python3
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')


def extract_function(name: str) -> str:
    signatures = [f'    function {name}(', f'    async function {name}(']
    starts = [source.find(signature) for signature in signatures]
    starts = [start for start in starts if start >= 0]
    if not starts:
        return f'FUNCTION NOT FOUND: {name}\n'
    start = min(starts)
    body_start = source.find('{', start)
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
    'getInitialMissionDefinitionTrainedPersonnelRequirements',
    'hasAuthoritativeMissionDefinitionTrainedPersonnelRequirements',
    'processRequirementRows',
    'getSelectedTrainedPersonnelPanelModel',
    'extractLiveMissionRequirementRows',
    'readMissionUpdateRows',
    'hasAuthoritativeLiveMissionRequirementsPanel',
    'getVehicleCheckboxSnapshot',
    'getMissionVehicleId',
]

lines = source.splitlines()
markers = []
needles = (
    'on scene', 'on_scene', 'on-scene', 'status_4', 'status-4',
    'vehicle_status_4', 'vehicle-status-4', 'vehicle_marker_s',
    'vehiclestatus', 'vehicle_status', 'mission_vehicle', 'arrived'
)
seen = set()
for number, line in enumerate(lines, 1):
    lower = line.lower()
    if any(needle in lower for needle in needles):
        start = max(1, number - 3)
        end = min(len(lines), number + 3)
        key = (start, end)
        if key in seen:
            continue
        seen.add(key)
        markers.append(f'--- lines {start}-{end} ---\n' + '\n'.join(
            f'{idx}: {lines[idx - 1]}' for idx in range(start, end + 1)
        ))

output = [
    'CURRENT VERSION LINES',
    '\n'.join(line for line in lines[:150] if '@version' in line or 'MISSION FINDER V' in line),
    '',
]
for name in names:
    output.extend([f'===== {name} =====', extract_function(name), ''])
output.extend(['===== STATUS MARKERS =====', '\n\n'.join(markers)])

path = Path('.github/diagnostics/trained-personnel-authority-v1080.txt')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text('\n'.join(output), encoding='utf-8')
