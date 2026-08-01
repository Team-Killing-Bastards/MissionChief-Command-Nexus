#!/usr/bin/env python3
from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')
OUTPUT = Path('tmp/mission-coverage-source-excerpts.txt')
TERMS = [
    'Vehicle Load List',
    'renderVehicleLoad',
    'vehicleLoadPanel',
    'syncVehicleLoadCollapseState',
    'renderSelectedTrainedPersonnelPanel',
    'missionRequiredPersonnelCache',
    'getCachedMissionRequiredPersonnel',
    'scheduleMissionRequiredPersonnelPreload',
    'mission_vehicle_driving',
    'mission_vehicle_at_mission',
    'vehicle_type_id',
    'trained personnel',
    'personnel assignment',
    'personnelAssignment',
]

lines = SOURCE.read_text(encoding='utf-8').splitlines()
blocks = []
seen = set()
for term in TERMS:
    matches = [i for i, line in enumerate(lines) if term.lower() in line.lower()]
    blocks.append(f'\n===== TERM: {term!r} | MATCHES: {len(matches)} =====\n')
    for i in matches[:12]:
        start = max(0, i - 45)
        end = min(len(lines), i + 90)
        key = (start, end)
        if key in seen:
            blocks.append(f'-- duplicate context omitted; match line {i + 1} --\n')
            continue
        seen.add(key)
        blocks.append(f'\n--- lines {start + 1}-{end} (match {i + 1}) ---\n')
        blocks.extend(f'{n + 1:06d}: {lines[n]}\n' for n in range(start, end))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(''.join(blocks), encoding='utf-8')
print(f'wrote {OUTPUT} with {len(seen)} contexts from {len(lines)} source lines')
