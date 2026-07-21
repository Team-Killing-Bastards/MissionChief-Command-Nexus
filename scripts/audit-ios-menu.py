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
print(f'Wrote IOS_MENU_AUDIT.txt with {len(out)} lines')
