#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()
out = ['FIRE ENGINE RESOLUTION/PATIENT CONTEXT', f'SOURCE LINES: {len(lines)}', '']

def emit(label, start, window):
    start = max(0, start)
    end = min(len(lines), start + window)
    out.append(f'=== {label} | source lines {start + 1}-{end} ===')
    for i in range(start, end):
        out.append(f'{i + 1:06d}: {lines[i]}')
    out.append('')

def find_function(name):
    rx = re.compile(rf'\b(?:async\s+)?function\s+{re.escape(name)}\s*\(')
    return next((i for i, line in enumerate(lines) if rx.search(line)), None)

for name, window in [
    ('resolveUnitName', 500),
    ('normaliseMissionUpdatePatientRequirement', 650),
    ('getMissionUpdatePatientRequirementRule', 500),
    ('normaliseOperationalRequirementRows', 1100),
    ('getGenericMissingVehicleRowsFromText', 500),
    ('getStructuredMissingVehicleRows', 700),
    ('readLiveMissionRequirementRow', 700),
]:
    idx = find_function(name)
    if idx is None:
        out.append(f'=== FUNCTION {name}: NOT FOUND ===\n')
    else:
        emit(f'function {name}', idx, window)

for pattern in [
    r'Ambulance x 01',
    r'Fire engines',
    r'patientRequirement',
    r'resolveUnitName\(',
    r'Dispatch after queue',
    r'Starts from the current mission',
    r'keeps repeating Unit Finder',
    r'Live current-mission source found',
]:
    rx = re.compile(pattern, re.I)
    hits = [i for i, line in enumerate(lines) if rx.search(line)]
    out.append(f'=== PATTERN {pattern!r}: {len(hits)} hit(s) ===')
    for i in hits[:100]:
        start = max(0, i - 14)
        end = min(len(lines), i + 24)
        out.append(f'--- source lines {start + 1}-{end} ---')
        for j in range(start, end):
            out.append(f'{j + 1:06d}: {lines[j]}')
    out.append('')

Path('.diagnostics/fire-engine-update-targeted.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('Wrote resolution/patient context')
