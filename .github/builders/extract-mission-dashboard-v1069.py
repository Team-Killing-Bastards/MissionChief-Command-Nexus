#!/usr/bin/env python3
from pathlib import Path
import re

SOURCE = Path('src/missionchief-command-nexus.user.js')
OUTPUT = Path('.github/diagnostics/mission-dashboard-v1069.txt')
TOKENS = [
    'Mission Control',
    'Vehicle Load List',
    'Trained Personnel',
    'Mission Ready Delay',
    'Queue Restart',
    'Export Diagnostics',
    'Event Scanner',
    'event scanner',
    'collectible collector',
    'mission event collectible',
    'wrapper.appendChild(loadPanel);',
    'wrapper.appendChild(trainedPanel);',
    'const loadPanel',
    'const trainedPanel',
    'const controlPanel',
    'mf-mission-control',
    'renderSelectedTrainedPersonnelPanel',
    'startMissionEventCollectibleCollector',
    'stopMissionEventCollectibleCollector',
    'collectMissionEventCollectibles',
    'injectStyles',
]
FUNCTION_NAMES = [
    'createControlPanel',
    'injectStyles',
    'startMissionEventCollectibleCollector',
    'stopMissionEventCollectibleCollector',
    'collectMissionEventCollectibles',
    'renderSelectedTrainedPersonnelPanel',
    'renderVehicleLoadListNow',
]

source = SOURCE.read_text(encoding='utf-8')
lines = source.splitlines()
line_offsets = []
offset = 0
for line in lines:
    line_offsets.append(offset)
    offset += len(line) + 1


def line_number(pos: int) -> int:
    lo, hi = 0, len(line_offsets)
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if line_offsets[mid] <= pos:
            lo = mid
        else:
            hi = mid
    return lo + 1


def extract_balanced_function(start: int):
    brace = source.find('{', start)
    if brace < 0:
        return None
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if line_comment:
            if ch == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in ('\"', "'", '`'):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return source[start:i + 1]
        i += 1
    return None


def extract_named_function(name: str):
    match = re.search(
        rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(',
        source
    )
    if not match:
        return None
    return extract_balanced_function(match.start())


def extract_function_at(pos: int):
    candidates = list(re.finditer(
        r'(?m)^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(',
        source[:pos]
    ))
    if not candidates:
        return None
    match = candidates[-1]
    function_text = extract_balanced_function(match.start())
    if function_text and match.start() <= pos <= match.start() + len(function_text):
        return function_text
    return None

sections = []
seen_functions = set()
for token in TOKENS:
    sections.append(f'\n\n===== TOKEN: {token} =====\n')
    starts = [m.start() for m in re.finditer(re.escape(token), source, re.IGNORECASE)]
    sections.append(f'Occurrences: {len(starts)}\n')
    for index, pos in enumerate(starts[:20], 1):
        start = max(0, pos - 2200)
        end = min(len(source), pos + len(token) + 3200)
        sections.append(f'\n--- occurrence {index} at line {line_number(pos)} ---\n')
        sections.append(source[start:end])
        sections.append('\n')
        func = extract_function_at(pos)
        if func:
            signature = func.split('{', 1)[0].strip()
            if signature not in seen_functions:
                seen_functions.add(signature)
                sections.append(f'\n--- containing function: {signature} ---\n')
                sections.append(func)
                sections.append('\n')

for name in FUNCTION_NAMES:
    sections.append(f'\n\n===== NAMED FUNCTION: {name} =====\n')
    function_text = extract_named_function(name)
    if function_text:
        sections.append(function_text)
    else:
        sections.append('MISSING\n')

# Include constants/state close to collectible and dashboard identifiers.
for pattern in [
    r'(?mi)^.*(?:COLLECTIBLE|EVENT_COLLECT|EVENT_SCANNER).*$' ,
    r'(?mi)^.*(?:MF_PANEL_|MF_CONTROL_|MF_VEHICLE_LOAD_|MF_TRAINED_PERSONNEL_).*$'
]:
    sections.append(f'\n\n===== MATCHING LINES: {pattern} =====\n')
    for match in re.finditer(pattern, source):
        start = max(0, match.start() - 500)
        end = min(len(source), match.end() + 900)
        sections.append(source[start:end])
        sections.append('\n---\n')

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(''.join(sections), encoding='utf-8')
print(f'Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)')
