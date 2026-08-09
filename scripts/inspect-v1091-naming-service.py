#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text()
lines = source.splitlines()

def print_lines(label, start, end):
    print(f'=== {label} ({start}-{end}) ===')
    for n in range(start, min(end, len(lines)) + 1):
        print(f'{n:6}: {lines[n-1]}')

for label, start, end in [
    ('CANONICAL STATION TYPES', 912, 958),
    ('DISPATCH STATE AND CURRENT LOADERS', 1325, 1905),
    ('UNIT/STATION NAMING UI', 2508, 2605),
    ('NAMING EVENT BINDINGS', 4468, 4505),
    ('STATION REFRESH AND START CASCADE', 5148, 5300),
    ('UNIT REFRESH AND START CASCADE', 10845, 10955),
]:
    print_lines(label, start, end)

print('=== PROFILE / CURRENT USER REFERENCES ===')
for i, line in enumerate(lines, 1):
    if re.search(r'/profile/|profile_link|user_id|userId|current.?user|navbar.*profile|profile.*href', line, re.I):
        if i < 12000:
            print(f'{i:6}: {line}')

print('=== EXACT CASCADE FUNCTION NAMES ===')
for name in [
    'handleUnitStationTypeChange', 'refreshStations', 'populateStartDropdown',
    'refreshStationNamingStations', 'populateStationNamingStartDropdown',
    'loadNamingDispatchCentreList', 'loadNamingDispatchCentreData',
    'refreshNamingDispatchCentres', 'populateNamingDispatchCentreFilter',
    'getStationsForNamingDispatchCentre', 'populateNamingStationTypeFilter'
]:
    m = re.search(rf'^[ \t]*(?:async\s+)?function\s+{re.escape(name)}\s*\(', source, re.M)
    print(f'{name}: {source.count(chr(10), 0, m.start()) + 1 if m else "MISSING"}')
