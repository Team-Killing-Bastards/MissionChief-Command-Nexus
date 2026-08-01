#!/usr/bin/env python3
import re
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()


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

needles = (
    'MutationObserver',
    'renderSelectedTrainedPersonnelPanel(',
    'renderVehicleLoadList(',
    'renderVehicleLoadListNow(',
    'missionUpdateRowsCache',
    'scheduleMissionFinderMutationWork(',
    'flushMissionFinderMutationWork(',
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

output_text = '\n\n'.join([
    '===== classifyMissionFinderMutations =====',
    extract_function('classifyMissionFinderMutations'),
    '===== scheduleMissionFinderMutationWork =====',
    extract_function('scheduleMissionFinderMutationWork'),
    '===== flushMissionFinderMutationWork =====',
    extract_function('flushMissionFinderMutationWork'),
    '===== renderVehicleLoadList =====',
    extract_function('renderVehicleLoadList'),
    '===== renderVehicleLoadListNow =====',
    extract_function('renderVehicleLoadListNow'),
    '===== MATCH WINDOWS =====',
    '\n\n'.join(blocks),
])
output = Path('.github/diagnostics/trained-panel-refresh-v1081.txt')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(output_text, encoding='utf-8')
