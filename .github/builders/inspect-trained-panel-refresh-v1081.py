#!/usr/bin/env python3
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()
needles = (
    'MutationObserver',
    'renderSelectedTrainedPersonnelPanel(',
    'renderVehicleLoadList(',
    'renderVehicleLoadListNow(',
    'missionUpdateRowsCache',
    'scheduleMissionRequiredPersonnelPreload(',
)
blocks = []
seen = set()
for number, line in enumerate(lines, 1):
    if not any(needle in line for needle in needles):
        continue
    start = max(1, number - 18)
    end = min(len(lines), number + 28)
    key = (start, end)
    if key in seen:
        continue
    seen.add(key)
    blocks.append(
        f'--- lines {start}-{end} ---\n' +
        '\n'.join(f'{index}: {lines[index - 1]}' for index in range(start, end + 1))
    )
output = Path('.github/diagnostics/trained-panel-refresh-v1081.txt')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text('\n\n'.join(blocks), encoding='utf-8')
