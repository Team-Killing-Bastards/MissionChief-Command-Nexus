#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()

out = []
out.append('TARGETED FIRE ENGINE UPDATE CONTEXT')
out.append(f'SOURCE LINES: {len(lines)}')
out.append('')

def emit_range(label, start, end):
    start = max(0, start)
    end = min(len(lines), end)
    out.append(f'=== {label} | source lines {start + 1}-{end} ===')
    for i in range(start, end):
        out.append(f'{i + 1:06d}: {lines[i]}')
    out.append('')

# Exact alias table and candidate-construction region.
emit_range('crossReference Fire aliases', 10588, 10625)
emit_range('vehicle search candidate construction', 12190, 12450)

# Emit named functions central to Update processing.
function_names = [
    'readMissionUpdateRows',
    'getExplicitCurrentMissingRequirementRows',
    'handleMissionUpdateUnits',
    'getVehicleSearchCandidates',
    'normaliseVehicleText',
    'getExtendedVehicleValues',
    'isAmbulanceTransportRequest',
]

for name in function_names:
    pattern = re.compile(rf'\b(?:async\s+)?function\s+{re.escape(name)}\s*\(')
    index = next((i for i, line in enumerate(lines) if pattern.search(line)), None)
    if index is None:
        out.append(f'=== FUNCTION {name}: NOT FOUND ===\n')
        continue
    # Fixed windows are deliberate: they survive braces in regexes/templates.
    window = 950 if name in {'readMissionUpdateRows', 'handleMissionUpdateUnits'} else 360
    emit_range(f'function {name}', index, index + window)

# List every direct use of the alias table and every direct ambulance special case.
for pattern, label in [
    (r'crossReference\[', 'crossReference lookups'),
    (r'Fire Engine R/PUMP x 1', 'Fire Engine mapped label uses'),
    (r'Ambulance x 01', 'Ambulance mapped label uses'),
    (r'getVehicleSearchCandidates\(', 'candidate function calls'),
    (r'isAmbulanceTransportRequest\(', 'ambulance request calls'),
]:
    rx = re.compile(pattern)
    hits = [i for i, line in enumerate(lines) if rx.search(line)]
    out.append(f'=== {label}: {len(hits)} hit(s) ===')
    for i in hits:
        start = max(0, i - 8)
        end = min(len(lines), i + 13)
        out.append(f'--- source lines {start + 1}-{end} ---')
        for j in range(start, end):
            out.append(f'{j + 1:06d}: {lines[j]}')
    out.append('')

Path('.diagnostics/fire-engine-update-targeted.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('Wrote targeted context')
