#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()
out = ['FIRE ENGINE CHECKBOX MATCHING CONTEXT', f'SOURCE LINES: {len(lines)}', '']

def emit_range(label, start, end):
    start = max(0, start)
    end = min(len(lines), end)
    out.append(f'=== {label} | source lines {start + 1}-{end} ===')
    for i in range(start, end):
        out.append(f'{i + 1:06d}: {lines[i]}')
    out.append('')

def find_function(name):
    rx = re.compile(rf'\b(?:async\s+)?function\s+{re.escape(name)}\s*\(')
    return next((i for i, line in enumerate(lines) if rx.search(line)), None)

for name, window in [
    ('selectVehicleUnits', 1100),
    ('countSelectedMatchingVehicles', 650),
    ('getVehicleMatchCandidates', 320),
    ('getExtendedVehicleValues', 420),
    ('getVehicleTypeIdentifiers', 300),
    ('isAmbulanceTransportRequest', 180),
]:
    index = find_function(name)
    if index is None:
        out.append(f'=== FUNCTION {name}: NOT FOUND ===\n')
    else:
        emit_range(f'function {name}', index, index + window)

patterns = [
    r'getVehicleMatchCandidates\(',
    r'candidate\.includes',
    r'\.includes\(candidate',
    r'some\(candidate',
    r'matchesVehicle',
    r'vehicleMatches',
    r'isAmbulanceTransportRequest\(',
    r'Fire Engine R/PUMP x 1',
]

for pattern in patterns:
    rx = re.compile(pattern)
    hits = [i for i, line in enumerate(lines) if rx.search(line)]
    out.append(f'=== PATTERN {pattern!r}: {len(hits)} hit(s) ===')
    for i in hits:
        start = max(0, i - 12)
        end = min(len(lines), i + 18)
        out.append(f'--- source lines {start + 1}-{end} ---')
        for j in range(start, end):
            out.append(f'{j + 1:06d}: {lines[j]}')
    out.append('')

Path('.diagnostics/fire-engine-update-targeted.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('Wrote checkbox matching context')
