#!/usr/bin/env python3
from pathlib import Path
import re

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')
lines = source.splitlines()
patterns = [
    r'Fire engines?',
    r'fire engines?',
    r'Ambulance',
    r'ambulance',
    r'Missing Vehicles',
    r'handleMissionUpdateUnits',
    r'mission update',
    r'vehicleRequirement',
    r'requirementAlias',
    r'isFireEngine',
]

out = []
out.append('SOURCE: src/missionchief-command-nexus.user.js')
out.append(f'LINES: {len(lines)}')
out.append('')

seen_ranges = set()
for pattern in patterns:
    rx = re.compile(pattern)
    matches = [i for i, line in enumerate(lines) if rx.search(line)]
    out.append(f'=== PATTERN {pattern!r}: {len(matches)} match(es) ===')
    for index in matches[:40]:
        start = max(0, index - 10)
        end = min(len(lines), index + 11)
        key = (start, end)
        if key in seen_ranges:
            continue
        seen_ranges.add(key)
        out.append(f'--- lines {start + 1}-{end} ---')
        for offset in range(start, end):
            out.append(f'{offset + 1:06d}: {lines[offset]}')
    out.append('')

# Extract complete named function bodies that contain the most relevant terms.
function_starts = []
for i, line in enumerate(lines):
    match = re.search(r'\b(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', line)
    if match:
        function_starts.append((i, match.group(1)))

relevant_terms = (
    'Fire engine', 'fire engine', 'Ambulance', 'ambulance',
    'Missing Vehicles', 'handleMissionUpdateUnits', 'vehicleRequirement'
)

out.append('=== RELEVANT FUNCTION BODIES ===')
for start_index, name in function_starts:
    brace_depth = 0
    began = False
    end_index = start_index
    for j in range(start_index, min(len(lines), start_index + 1800)):
        line = lines[j]
        for char in line:
            if char == '{':
                brace_depth += 1
                began = True
            elif char == '}':
                brace_depth -= 1
        end_index = j
        if began and brace_depth <= 0:
            break
    body = '\n'.join(lines[start_index:end_index + 1])
    if any(term in body for term in relevant_terms):
        out.append(f'--- function {name} lines {start_index + 1}-{end_index + 1} ---')
        for offset in range(start_index, end_index + 1):
            out.append(f'{offset + 1:06d}: {lines[offset]}')
        out.append('')

Path('.diagnostics/fire-engine-update-context.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('Wrote .diagnostics/fire-engine-update-context.txt')
