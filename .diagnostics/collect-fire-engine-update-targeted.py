#!/usr/bin/env python3
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()
out = []

for needle in [
    'Starts from the current mission',
    'Dispatch after queue',
    "includes('0')",
    "includes(\n                '0'",
    'vehicle_type_id="0"',
    "vehicle type 0",
    'Fire Engine type',
    'Fire Engine vehicle type',
]:
    hits = [i for i, line in enumerate(lines) if needle.lower() in line.lower()]
    out.append(f'=== {needle!r}: {len(hits)} hit(s) ===')
    for i in hits:
        start=max(0,i-35); end=min(len(lines),i+50)
        out.append(f'--- source lines {start+1}-{end} ---')
        for j in range(start,end):
            out.append(f'{j+1:06d}: {lines[j]}')
    out.append('')

Path('.diagnostics/fire-engine-update-targeted.txt').write_text('\n'.join(out)+'\n', encoding='utf-8')
