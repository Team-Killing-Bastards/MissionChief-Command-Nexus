#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text()
lines = source.splitlines()
patterns = [
    re.compile(r'\bservice\b', re.I),
    re.compile(r'station.?type', re.I),
    re.compile(r'building.?type', re.I),
    re.compile(r'Fire Station|Ambulance Station|Police Station|Hospital|Coastguard', re.I),
    re.compile(r'mc-(?:namer|station)-', re.I),
    re.compile(r'NAMING_.*TYPE|STATION_.*TYPE', re.I),
]

hits = []
for i, line in enumerate(lines):
    if any(p.search(line) for p in patterns):
        # Focus on Resource Administration / naming code and definitions, avoid mission requirement noise.
        if i < 9000 or 'mc-namer-' in line or 'mc-station-' in line or 'NAMING_' in line or 'STATION_' in line:
            hits.append(i)

seen = set()
print('=== NAMING/SERVICE MATCHES ===')
for i in hits[:600]:
    start = max(0, i - 1)
    end = min(len(lines), i + 2)
    key = (start, end)
    if key in seen:
        continue
    seen.add(key)
    for j in range(start, end):
        print(f'{j+1:6}: {lines[j]}')
    print('---')

print('=== FUNCTION NAMES AROUND NAMING ===')
for m in re.finditer(r'^[ \t]*(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(', source, re.M):
    name = m.group(1)
    if re.search(r'naming|namer|station|building|dispatch', name, re.I):
        line = source.count('\n', 0, m.start()) + 1
        if line < 9000:
            print(f'{line:6}: {name}')
