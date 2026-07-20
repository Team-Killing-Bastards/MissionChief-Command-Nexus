from pathlib import Path
import re

source_path = Path('src/missionchief-command-nexus.user.js')
report_path = Path('UNIT_MEMORY_AUDIT.txt')
source = source_path.read_text(encoding='utf-8')
module = source.split('MODULE 2: MISSION FINDER', 1)[0]
lines = module.splitlines()

patterns = [
    r'\bUNIT_[A-Z0-9_]+\b',
    r'\bunit[A-Z][A-Za-z0-9_]*\b',
    r'\brename[A-Z][A-Za-z0-9_]*\b',
    r'\bvehicle[A-Z][A-Za-z0-9_]*\b',
    r'new\s+(?:Map|Set|WeakMap|WeakSet)\b',
    r'addEventListener\s*\(',
    r'setInterval\s*\(',
    r'setTimeout\s*\(',
    r'new\s+MutationObserver\b',
    r'new\s+DOMParser\b',
    r'fetch\s*\(',
    r'AbortController',
    r'iframe',
    r'lightbox',
    r'innerHTML',
    r'TOOL_LOG',
    r'cleanup',
]
combined = re.compile('|'.join(f'(?:{p})' for p in patterns), re.I)

interesting = []
for index, line in enumerate(lines, start=1):
    if combined.search(line):
        interesting.append(index)

# Collapse nearby hits into compact context windows.
windows = []
for line_no in interesting:
    start = max(1, line_no - 3)
    end = min(len(lines), line_no + 5)
    if windows and start <= windows[-1][1] + 2:
        windows[-1] = (windows[-1][0], max(windows[-1][1], end))
    else:
        windows.append((start, end))

out = []
out.append('UNIT NAMING STATIC MEMORY AUDIT')
out.append(f'Module lines scanned: {len(lines)}')
out.append(f'Context windows: {len(windows)}')
out.append('')

# Inventory function declarations with likely unit-renamer relevance.
function_re = re.compile(r'^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')
out.append('FUNCTION INDEX')
for index, line in enumerate(lines, start=1):
    match = function_re.search(line)
    if match and re.search(r'unit|vehicle|rename|station|tool|fetch|log|cache|run|stop|pause', match.group(1), re.I):
        out.append(f'{index}: {match.group(1)}')
out.append('')

out.append('CONTEXT')
for start, end in windows:
    out.append(f'--- lines {start}-{end} ---')
    for number in range(start, end + 1):
        out.append(f'{number:05d}: {lines[number - 1]}')
    out.append('')

report_path.write_text('\n'.join(out), encoding='utf-8')
print(f'Wrote {report_path} with {len(out)} lines')
