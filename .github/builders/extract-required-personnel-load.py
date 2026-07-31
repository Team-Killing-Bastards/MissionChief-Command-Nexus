#!/usr/bin/env python3
from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')
OUTPUT = Path('.github/diagnostics/required-personnel-load-path.txt')
NAMES = [
    'cleanRequirementName',
    'findMissionRequirementTable',
    'getMissionDefinitionTrainedPersonnelRequirements',
    'getMissionDefinitionSarPersonnelVehicleRequirements',
    'extractLiveMissionRequirementRows',
    'mergeRequirementRows',
    'getMissionRequirementSource',
    'normaliseMissionRequirementSourceUrl',
    'validateMissionRequirementResponseUrl',
    'readLiveMissionRequirements',
    'getPreloadedMissionTrainedPersonnelRequirements',
    'preloadMissionRequiredPersonnel',
    'scheduleMissionRequiredPersonnelPreload',
]


def find_body_brace(source: str, start: int) -> int:
    paren = source.find('(', start)
    if paren < 0:
        return -1
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = paren
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
        if quote is not None:
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
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                return source.find('{', i + 1)
        i += 1
    return -1


def extract_function(source: str, name: str) -> str:
    signatures = [f'function {name}(', f'async function {name}(']
    starts = [source.find(sig) for sig in signatures]
    starts = [value for value in starts if value >= 0]
    if not starts:
        return f'// MISSING: {name}\n'
    start = min(starts)
    brace = find_body_brace(source, start)
    if brace < 0:
        return f'// MISSING BODY: {name}\n'

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
        if quote is not None:
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
                return source[start:i + 1] + '\n'
        i += 1
    return f'// UNTERMINATED: {name}\n'


source = SOURCE.read_text(encoding='utf-8')
sections = []
for name in NAMES:
    sections.append(f'\n/* ===== {name} ===== */\n')
    sections.append(extract_function(source, name))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(''.join(sections), encoding='utf-8')
print(OUTPUT)
