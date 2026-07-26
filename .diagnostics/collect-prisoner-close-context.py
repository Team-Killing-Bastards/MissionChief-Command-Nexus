#!/usr/bin/env python3
from pathlib import Path
import re

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')
lines = source.splitlines()
out = [f'SOURCE_LINES={len(lines)}', '']

names = [
    'mfIsVisibleInOwnDocument',
    'realClickForQueueRestart',
    'getActivePrisonerCellSelectionContext',
    'getVisibleAutoPrisonerReleaseDismissContexts',
    'getTopmostAutoPrisonerReleaseDismissContext',
    'isAutoPrisonerReleaseDismissContextVisible',
    'closeAutoPrisonerReleaseDismissAfterClick',
    'getExactAutoReleasePrisonersLink',
    'handleAutoPrisonerReleaseAfterActions',
    'getVisibleMissionCloseButtonsForQueueRestart',
    'closeMissionScreenForQueueRestart',
]

for name in names:
    match = re.search(rf'^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(', source, re.M)
    if not match:
        out.append(f'=== FUNCTION {name}: NOT FOUND ===')
        out.append('')
        continue
    next_match = re.search(r'^\s*(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(', source[match.end():], re.M)
    end = match.end() + next_match.start() if next_match else len(source)
    start_line = source.count('\n', 0, match.start()) + 1
    end_line = source.count('\n', 0, end) + 1
    out.append(f'=== FUNCTION {name}: lines {start_line}-{end_line} ===')
    out.append(source[match.start():end].rstrip())
    out.append('')

out.append('=== PRISONER RELEASE CONSTANTS ===')
for index, line in enumerate(lines, 1):
    if 'MF_AUTO_PRISONER_RELEASE_' in line:
        start = max(1, index - 2)
        end = min(len(lines), index + 3)
        out.append(f'--- lines {start}-{end} ---')
        for line_no in range(start, end + 1):
            out.append(f'{line_no:06d}: {lines[line_no - 1]}')

out.append('=== LIGHTBOX CLOSE OCCURRENCES ===')
for index, line in enumerate(lines, 1):
    if re.search(r'lightbox-close|control-btn-container|modals-container|vm--container|vm--overlay', line, re.I):
        start = max(1, index - 4)
        end = min(len(lines), index + 4)
        out.append(f'--- lines {start}-{end} ---')
        for line_no in range(start, end + 1):
            out.append(f'{line_no:06d}: {lines[line_no - 1]}')

Path('.diagnostics/prisoner-close-context.txt').write_text('\n'.join(out) + '\n', encoding='utf-8')
