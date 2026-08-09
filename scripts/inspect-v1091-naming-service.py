#!/usr/bin/env python3
from pathlib import Path
source = Path('src/missionchief-command-nexus.user.js').read_text()
lines = source.splitlines()
for label, start, end in [
    ('DISPATCH CONSTANTS AND STATE', 1210, 1335),
    ('UNIT TYPE CHANGE HANDLERS', 10790, 10856),
]:
    print(f'=== {label} ({start}-{end}) ===')
    for n in range(start, min(end, len(lines)) + 1):
        print(f'{n:6}: {lines[n-1]}')
