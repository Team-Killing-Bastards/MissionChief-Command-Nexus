#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')
OUT = Path('runtime-memory-audit.json')
TEXT = SOURCE.read_text(encoding='utf-8')
LINES = TEXT.splitlines()

TOKENS = [
    'new MutationObserver', 'setInterval(', 'setTimeout(', 'requestAnimationFrame(',
    'addEventListener(', 'localStorage.setItem(', 'sessionStorage.setItem(',
    'GM_setValue(', 'GM.setValue(', 'new Map(', 'new Set(', 'new WeakMap(',
    'new WeakSet(', '.push(', '.unshift(', '.splice(', '.clear()', '.disconnect()',
]

FUNCTIONS = [
    'suspendMissionFinderRuntimeForPageHide',
    'installMissionFinderRuntimeCleanup',
    'reconcileMissionFinderAfterPageShow',
    'startMissionFinderObserver',
    'stopBackgroundWatcherIntervalsOnly',
    'startSessionRuntimeTicker',
    'stopSessionRuntimeTicker',
    'shouldRecycleAutoMissionMemoryBeforeSelection',
    'requestAutoMissionMemoryRecycle',
    'scheduleAutoMemoryRecycleResume',
    'runAutoModeLoop',
    'mfCollectMemoryDiagnostics',
]

def matching_lines(token: str) -> list[dict[str, object]]:
    found: list[dict[str, object]] = []
    for index, line in enumerate(LINES, start=1):
        if token in line:
            start = max(1, index - 2)
            end = min(len(LINES), index + 2)
            found.append({
                'line': index,
                'context': '\n'.join(f'{n}: {LINES[n - 1]}' for n in range(start, end + 1)),
            })
    return found

def extract_function(name: str) -> dict[str, object] | None:
    pattern = re.compile(rf'\b(?:async\s+)?function\s+{re.escape(name)}\s*\(')
    match = pattern.search(TEXT)
    if not match:
        return None
    body_start = TEXT.find('{', match.start())
    if body_start < 0:
        return None
    depth = 0
    quote = ''
    escaped = False
    index = body_start
    while index < len(TEXT):
        char = TEXT[index]
        nxt = TEXT[index + 1] if index + 1 < len(TEXT) else ''
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = ''
            index += 1
            continue
        if char in ('"', "'", '`'):
            quote = char
            index += 1
            continue
        if char == '/' and nxt == '/':
            newline = TEXT.find('\n', index + 2)
            index = len(TEXT) if newline < 0 else newline + 1
            continue
        if char == '/' and nxt == '*':
            close = TEXT.find('*/', index + 2)
            index = len(TEXT) if close < 0 else close + 2
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                function_text = TEXT[match.start():index + 1]
                line_start = TEXT.count('\n', 0, match.start()) + 1
                return {
                    'line': line_start,
                    'length': len(function_text),
                    'text': function_text,
                }
        index += 1
    return None

report = {
    'source_bytes': SOURCE.stat().st_size,
    'source_lines': len(LINES),
    'token_counts': {token: TEXT.count(token) for token in TOKENS},
    'matches': {token: matching_lines(token) for token in TOKENS},
    'functions': {name: extract_function(name) for name in FUNCTIONS},
}
OUT.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(f'Wrote {OUT} for {SOURCE.stat().st_size:,} source bytes and {len(LINES):,} lines')
