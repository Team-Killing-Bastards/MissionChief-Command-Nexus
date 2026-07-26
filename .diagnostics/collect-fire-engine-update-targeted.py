#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()
out = []

def emit(start, end, label):
    out.append(f'=== {label} source {start+1}-{end} ===')
    for i in range(start, min(end, len(lines))):
        out.append(f'{i+1:06d}: {lines[i]}')
    out.append('')

def find(name):
    rx = re.compile(rf'\b(?:async\s+)?function\s+{re.escape(name)}\s*\(')
    return next((i for i,l in enumerate(lines) if rx.search(l)), -1)

for name, window in [
    ('getMissionUpdatePatientRequirementRule', 360),
    ('normaliseOperationalRequirementRows', 800),
    ('getGenericMissingVehicleRowsFromText', 300),
    ('vehicleValuesMatchCandidates', 280),
    ('getVehicleTypeIdentifiers', 300),
]:
    idx=find(name)
    if idx>=0: emit(idx, idx+window, name)
    else: out.append(f'NOT FOUND {name}\n')

for needle in ['Dispatch after queue','Starts from the current mission','Live current-mission source found','Fire engines','Ambulance x 01']:
    hits=[i for i,l in enumerate(lines) if needle.lower() in l.lower()]
    out.append(f'=== {needle}: {len(hits)} ===')
    for i in hits:
        emit(max(0,i-20), min(len(lines),i+35), f'{needle} hit')

Path('.diagnostics/fire-engine-update-targeted.txt').write_text('\n'.join(out)+'\n', encoding='utf-8')
