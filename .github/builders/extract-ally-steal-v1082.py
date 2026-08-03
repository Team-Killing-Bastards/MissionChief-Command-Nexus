#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')


def extract_function(name: str) -> str:
    match = re.search(
        rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(',
        source,
    )
    if not match:
        return f'FUNCTION NOT FOUND: {name}\n'

    open_paren = source.find('(', match.start(), match.end())
    paren_depth = 0
    state = 'code'
    quote = ''
    escaped = False
    close_paren = -1
    index = open_paren

    while index < len(source):
        character = source[index]
        next_character = source[index + 1] if index + 1 < len(source) else ''
        if state == 'line_comment':
            if character == '\n':
                state = 'code'
            index += 1
            continue
        if state == 'block_comment':
            if character == '*' and next_character == '/':
                state = 'code'
                index += 2
                continue
            index += 1
            continue
        if state == 'string':
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                state = 'code'
            index += 1
            continue
        if character == '/' and next_character == '/':
            state = 'line_comment'
            index += 2
            continue
        if character == '/' and next_character == '*':
            state = 'block_comment'
            index += 2
            continue
        if character in ('"', "'", '`'):
            state = 'string'
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
    state = 'code'
    quote = ''
    escaped = False
    index = body_start

    while index < len(source):
        character = source[index]
        next_character = source[index + 1] if index + 1 < len(source) else ''
        if state == 'line_comment':
            if character == '\n':
                state = 'code'
            index += 1
            continue
        if state == 'block_comment':
            if character == '*' and next_character == '/':
                state = 'code'
                index += 2
                continue
            index += 1
            continue
        if state == 'string':
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                state = 'code'
            index += 1
            continue
        if character == '/' and next_character == '/':
            state = 'line_comment'
            index += 2
            continue
        if character == '/' and next_character == '*':
            state = 'block_comment'
            index += 2
            continue
        if character in ('"', "'", '`'):
            state = 'string'
            quote = character
            index += 1
            continue
        if character == '{':
            depth += 1
        elif character == '}':
            depth -= 1
            if depth == 0:
                return source[match.start():index + 1]
        index += 1

    return f'FUNCTION NOT TERMINATED: {name}\n'


names = [
    'getAllAllyStealSuccessAlerts',
    'getAllyStealParentModalCloseCandidates',
    'closeAllyStealSuccessModal',
    'waitForAllyStealSuccess',
    'resumeAllyStealAfterDispatchRefresh',
    'handleAllySteal',
]

for name in names:
    print(f'\n===== {name} =====\n')
    print(extract_function(name))

print('\n===== ALLY STEAL CONSTANTS / WAITS =====\n')
for line_number, line in enumerate(source.splitlines(), 1):
    lower = line.lower()
    if 'ally' not in lower:
        continue
    if any(token in line for token in ('setTimeout', 'sleep(', 'await sleep', '_MS', 'INTERVAL', 'DELAY', 'POLL', 'TIMEOUT')):
        print(f'{line_number}: {line}')
