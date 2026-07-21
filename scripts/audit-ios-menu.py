from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
module = source.split('MODULE 2: MISSION FINDER', 1)[0]
lines = module.splitlines()

patterns = re.compile(
    r'navigator|userAgent|platform|MacIntel|maxTouchPoints|iPhone|iPad|iPod|Safari|mobile|'
    r'matchMedia|innerWidth|visualViewport|orientation|touchstart|pointer|'
    r'position\s*:\s*fixed|position\s*=|style\.left|style\.top|style\.width|style\.height|'
    r'appendChild|insertBefore|DOMContentLoaded|load\b|requestAnimationFrame|'
    r'create.*(?:Panel|Window|Menu|Tool)|render.*(?:Panel|Window|Menu|Tool)|'
    r'ACTIVE_TAB_STORAGE_KEY|TOOL_UI_ELEMENT_CACHE|drag|collapsed|zIndex',
    re.I,
)

hits = [i for i, line in enumerate(lines, start=1) if patterns.search(line)]
windows = []
for line_no in hits:
    start = max(1, line_no - 6)
    end = min(len(lines), line_no + 12)
    if windows and start <= windows[-1][1] + 3:
        windows[-1] = (windows[-1][0], max(windows[-1][1], end))
    else:
        windows.append((start, end))

out = [
    'IOS SAFARI MENU AUDIT',
    f'Module lines: {len(lines)}',
    f'Context windows: {len(windows)}',
    '',
]

for start, end in windows:
    out.append(f'--- lines {start}-{end} ---')
    for number in range(start, end + 1):
        out.append(f'{number:05d}: {lines[number - 1]}')
    out.append('')

Path('IOS_MENU_AUDIT.txt').write_text('\n'.join(out), encoding='utf-8')

function_re = re.compile(r'(?m)^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')
function_names = []
for match in function_re.finditer(module):
    name = match.group(1)
    line_no = module.count('\n', 0, match.start()) + 1
    if re.search(r'init|panel|drag|viewport|mobile|ios|safari|collapse|create|mount|ready', name, re.I):
        function_names.append((line_no, name, match.start()))


def extract_function(start_index: int) -> str:
    brace_start = module.find('{', start_index)
    if brace_start < 0:
        return ''
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    i = brace_start
    while i < len(module):
        ch = module[i]
        nxt = module[i + 1] if i + 1 < len(module) else ''
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
                quote = ''
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
        if ch in ('"', "'", '`'):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return module[start_index:i + 1]
        i += 1
    return ''

focused = ['IOS MENU FUNCTION INDEX', '']
for line_no, name, start_index in function_names:
    focused.append(f'{line_no}: {name}')
focused.append('')

for line_no, name, start_index in function_names:
    body = extract_function(start_index)
    focused.append(f'===== {name} @ line {line_no} =====')
    focused.append(body)
    focused.append('')

for start, end, label in [
    (1075, 1165, 'STARTUP'),
    (1325, 1875, 'PANEL_AND_CSS'),
    (2350, 2445, 'COLLAPSE_AND_TAB'),
]:
    focused.append(f'===== {label} source lines {start}-{end} =====')
    for number in range(start, min(end, len(lines)) + 1):
        focused.append(f'{number:05d}: {lines[number - 1]}')
    focused.append('')

Path('IOS_MENU_FUNCTIONS.txt').write_text('\n'.join(focused), encoding='utf-8')
print(f'Wrote IOS_MENU_AUDIT.txt with {len(out)} lines')
print(f'Wrote IOS_MENU_FUNCTIONS.txt with {len(focused)} lines')
