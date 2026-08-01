#!/usr/bin/env python3
import re
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')


def extract_function(name: str) -> str:
    match = re.search(
        rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(',
        source
    )
    if not match:
        return f'FUNCTION NOT FOUND: {name}\n'
    start = match.start()
    open_paren = source.find('(', match.start(), match.end() + 1)
    paren_depth = 0
    quote = ''
    escaped = False
    close_paren = -1
    index = open_paren
    while index < len(source):
        character = source[index]
        if quote:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                quote = ''
            index += 1
            continue
        if character in ('"', "'", '`'):
            quote = character
            index += 1
            continue
        if character == '(':
            paren_depth += 1
        elif character == ')':
            paren_depth -= 1
            if paren_depth == 0:
                close_paren = index
                break
        index += 1
    if close_paren < 0:
        return f'PARAMETERS NOT TERMINATED: {name}\n'
    body_start = source.find('{', close_paren)
    if body_start < 0:
        return f'BODY NOT FOUND: {name}\n'
    depth = 0
    quote = ''
    escaped = False
    index = body_start
    while index < len(source):
        character = source[index]
        next_character = source[index + 1] if index + 1 < len(source) else ''
        if quote:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                quote = ''
            index += 1
            continue
        if character in ('"', "'", '`'):
            quote = character
            index += 1
            continue
        if character == '/' and next_character == '/':
            line_end = source.find('\n', index + 2)
            index = len(source) if line_end < 0 else line_end + 1
            continue
        if character == '/' and next_character == '*':
            block_end = source.find('*/', index + 2)
            index = len(source) if block_end < 0 else block_end + 2
            continue
        if character == '{':
            depth += 1
        elif character == '}':
            depth -= 1
            if depth == 0:
                return source[start:index + 1] + '\n'
        index += 1
    return f'UNTERMINATED FUNCTION: {name}\n'

names = [
    'getPreloadedMissionTrainedPersonnelRequirements',
    'renderSelectedTrainedPersonnelPanel',
    'readMissionUpdateRows',
    'normaliseOperationalRequirementRows',
    'mergeRequirementRows',
    'getSelectedTrainingDisplayLabel',
    'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority',
    'renderVehicleLoadListNow',
    'installPersonnelRegistryUpdateHandler',
]

lines = source.splitlines()
call_sites = []
for number, line in enumerate(lines, 1):
    if 'renderSelectedTrainedPersonnelPanel(' in line:
        start = max(1, number - 6)
        end = min(len(lines), number + 8)
        call_sites.append(
            f'--- lines {start}-{end} ---\n' +
            '\n'.join(f'{idx}: {lines[idx - 1]}' for idx in range(start, end + 1))
        )

output = [
    'CURRENT VERSION',
    '\n'.join(line for line in lines[:200] if '@version' in line or 'MISSION FINDER V' in line),
    '',
]
for name in names:
    output.extend([f'===== {name} =====', extract_function(name), ''])
output.extend(['===== PANEL CALL SITES =====', '\n\n'.join(call_sites)])

path = Path('.github/diagnostics/live-trained-personnel-v1081.txt')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text('\n'.join(output), encoding='utf-8')
