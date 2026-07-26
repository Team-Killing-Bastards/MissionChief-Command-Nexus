#!/usr/bin/env python3
from pathlib import Path
import re

SOURCE = Path('src/missionchief-command-nexus.user.js')
OUTPUT = Path('.diagnostics/bulk-trained-register-context.txt')
source = SOURCE.read_text(encoding='utf-8')
lines = source.splitlines()

patterns = [
    r'Mission Ready Delay',
    r'mission ready delay',
    r'missionReady',
    r'MISSION_READY',
    r'1000',
    r'Search Advisor',
    r'Search Advisors',
    r'search_and_rescue',
    r'Control Van',
    r'getSarPersonnelVehicleRequirement',
    r'getTrainedPersonnelRequirements',
    r'getTrainedPersonnelVehicleTarget',
    r'selectVehiclesForTrainedPersonnelRequirements',
    r'readPersonnelTrainingRegistry',
    r'Build Personnel Register',
    r'Build All Register',
    r'getPersonnelVehicleTypeIdFromRow',
    r'getPersonnelAmbulanceQueue',
    r'parseVehicleAssignmentPage',
    r'PERSONNEL_TARGET_VEHICLE_TYPE_ID',
    r'PERSONNEL_TRAINING_REGISTRY',
    r'buildPersonnelTrainingRegistry',
    r'personnel.*register',
    r'vehicle_type_id',
    r'#vehicle_table',
    r'assignmentHref',
]
compiled = [re.compile(pattern, re.I) for pattern in patterns]

intervals = []
for index, line in enumerate(lines):
    if any(pattern.search(line) for pattern in compiled):
        intervals.append((max(0, index - 45), min(len(lines), index + 46)))

intervals.sort()
merged = []
for start, end in intervals:
    if not merged or start > merged[-1][1] + 5:
        merged.append([start, end])
    else:
        merged[-1][1] = max(merged[-1][1], end)

out = [
    'BULK TRAINED REGISTER DIAGNOSTIC CONTEXT',
    f'SOURCE LINES: {len(lines)}',
    f'MERGED CONTEXT BLOCKS: {len(merged)}',
    '',
]
for block_index, (start, end) in enumerate(merged, 1):
    out.append(f'=== BLOCK {block_index}: source lines {start + 1}-{end} ===')
    for line_no in range(start, end):
        out.append(f'{line_no + 1:06d}: {lines[line_no]}')
    out.append('')

# Add compact inventories for exact string/function discovery.
out.append('=== FUNCTION INVENTORY MATCHING PERSONNEL / TRAINING / SEARCH / READY ===')
for match in re.finditer(r'^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', source, re.M):
    name = match.group(1)
    if re.search(r'personnel|training|search|advisor|ready|register|vehicle', name, re.I):
        line_no = source.count('\n', 0, match.start()) + 1
        out.append(f'{line_no:06d}: {name}')
out.append('')

out.append('=== CONSTANT / KEYWORD COUNTS ===')
for pattern in patterns:
    count = len(re.findall(pattern, source, re.I))
    out.append(f'{pattern}: {count}')

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text('\n'.join(out) + '\n', encoding='utf-8')
