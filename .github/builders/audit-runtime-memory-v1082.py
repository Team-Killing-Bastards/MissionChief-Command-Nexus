#!/usr/bin/env python3
import re
from collections import Counter, defaultdict
from pathlib import Path

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')
REPORT_PATH = Path('.github/diagnostics/runtime-memory-audit-v1082.txt')
source = SOURCE_PATH.read_text(encoding='utf-8')
lines = source.splitlines()

FUNCTION_RE = re.compile(r'(?m)^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')


def extract_function(start_match):
    name = start_match.group(1)
    start = start_match.start()
    open_paren = source.find('(', start_match.start(), start_match.end() + 1)
    parens = 0
    quote = ''
    escaped = False
    i = open_paren
    while i < len(source):
        ch = source[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
            i += 1
            continue
        if ch in ('"', "'", '`'):
            quote = ch
        elif ch == '(':
            parens += 1
        elif ch == ')':
            parens -= 1
            if parens == 0:
                break
        i += 1
    body_start = source.find('{', i)
    depth = 0
    quote = ''
    escaped = False
    i = body_start
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ''
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
            i += 1
            continue
        if ch in ('"', "'", '`'):
            quote = ch
            i += 1
            continue
        if ch == '/' and nxt == '/':
            end = source.find('\n', i + 2)
            i = len(source) if end < 0 else end + 1
            continue
        if ch == '/' and nxt == '*':
            end = source.find('*/', i + 2)
            i = len(source) if end < 0 else end + 2
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return name, source[start:i + 1], start, i + 1
        i += 1
    return name, source[start:], start, len(source)

functions = []
for match in FUNCTION_RE.finditer(source):
    functions.append(extract_function(match))

patterns = {
    'setInterval': r'\bsetInterval\s*\(',
    'setTimeout': r'\bsetTimeout\s*\(',
    'requestAnimationFrame': r'\brequestAnimationFrame\s*\(',
    'MutationObserver': r'\bnew\s+MutationObserver\s*\(',
    'addEventListener': r'\.addEventListener\s*\(',
    'Map': r'\bnew\s+Map\s*\(',
    'Set': r'\bnew\s+Set\s*\(',
    'push': r'\.push\s*\(',
    'querySelectorAll': r'\.querySelectorAll\s*\(',
    'innerHTML': r'\.innerHTML\s*=',
    'localStorage.setItem': r'localStorage\.setItem\s*\(',
}

lines_out = []
lines_out.append('MISSIONCHIEF COMMAND NEXUS — DEEP RUNTIME MEMORY AUDIT')
lines_out.append(f'Source bytes: {len(source.encode("utf-8")):,}')
lines_out.append(f'Source lines: {len(lines):,}')
lines_out.append(f'Named functions: {len(functions):,}')
lines_out.append('')

lines_out.append('GLOBAL CONSTRUCT COUNTS')
for label, pattern in patterns.items():
    count = len(re.findall(pattern, source))
    lines_out.append(f'{label}: {count}')
lines_out.append('')

# Functions with lifecycle-heavy constructs.
ranked = []
for name, body, start, end in functions:
    counts = {label: len(re.findall(pattern, body)) for label, pattern in patterns.items()}
    score = (
        counts['MutationObserver'] * 40 + counts['setInterval'] * 30 +
        counts['addEventListener'] * 8 + counts['setTimeout'] * 4 +
        counts['requestAnimationFrame'] * 4 + counts['Map'] * 5 +
        counts['Set'] * 5 + counts['push'] + counts['querySelectorAll']
    )
    if score:
        start_line = source.count('\n', 0, start) + 1
        ranked.append((score, name, start_line, counts, body))

lines_out.append('TOP LIFECYCLE-HEAVY FUNCTIONS')
for score, name, start_line, counts, _body in sorted(ranked, reverse=True)[:80]:
    details = ', '.join(f'{k}={v}' for k, v in counts.items() if v)
    lines_out.append(f'{start_line}: {name} [score={score}] {details}')
lines_out.append('')

# Global mutable owners and timer/observer handles.
owner_regex = re.compile(
    r'(?m)^\s*(?:let|const|var)\s+([A-Za-z_$][\w$]*(?:Timer|Interval|Observer|Cache|Map|Set|Rows|History|Queue|Frames|Documents|Nodes|Records|Snapshots)[A-Za-z0-9_$]*)\s*(?:=\s*([^;\n]+))?;'
)
lines_out.append('GLOBAL-LIKE MUTABLE OWNER DECLARATIONS')
for match in owner_regex.finditer(source):
    line = source.count('\n', 0, match.start()) + 1
    init = (match.group(2) or '').strip()
    lines_out.append(f'{line}: {match.group(1)} = {init[:180]}')
lines_out.append('')

# Exact assignments to long-lived handles and cleanup operations.
needles = (
    'setInterval(', 'setTimeout(', 'new MutationObserver(',
    'addEventListener(', 'removeEventListener(', '.disconnect()',
    'clearInterval(', 'clearTimeout(', 'cancelAnimationFrame(',
    '.clear()', '.delete(', '.push(', '.splice(', 'innerHTML =',
)
lines_out.append('LIFECYCLE ASSIGNMENTS AND CLEANUP CALLS')
for number, line in enumerate(lines, 1):
    if any(needle in line for needle in needles):
        lines_out.append(f'{number}: {line.strip()}')
lines_out.append('')

# Extract the complete high-value functions for manual review.
important_tokens = (
    'Memory', 'memory', 'Mutation', 'Observer', 'AutoMode', 'Auto',
    'cleanup', 'Cleanup', 'suspend', 'Suspend', 'resume', 'Resume',
    'cache', 'Cache', 'watch', 'Watch', 'runtime', 'Runtime',
    'initialize', 'Initialize', 'removeMissionFinder', 'releaseRemoved',
    'pageHide', 'pageShow', 'MissionFinderMutation', 'EventCollectible',
)
important = []
for score, name, start_line, counts, body in sorted(ranked, reverse=True):
    if any(token in name for token in important_tokens):
        important.append((name, start_line, body))

lines_out.append('IMPORTANT FUNCTION BODIES')
for name, start_line, body in important[:70]:
    lines_out.append(f'\n===== {name} @ line {start_line} =====\n{body}\n')

REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
REPORT_PATH.write_text('\n'.join(lines_out), encoding='utf-8')
print(f'Wrote {REPORT_PATH} ({REPORT_PATH.stat().st_size:,} bytes)')
