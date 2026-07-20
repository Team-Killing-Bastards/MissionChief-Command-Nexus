from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()
report = []

patterns = [
    r'public_order',
    r'police_sergeant',
    r'police_medic',
    r'level\s*1',
    r'level\s*2',
    r'trained.*person',
    r'required.*training',
    r'training.*codes?',
    r'\.every\s*\(',
    r'\.some\s*\(',
    r'hasAll',
    r'qualif',
    r'registry',
]
combined = re.compile('|'.join(f'(?:{p})' for p in patterns), re.I)

hits = [i for i, line in enumerate(lines, start=1) if combined.search(line)]
windows = []
for hit in hits:
    start = max(1, hit - 8)
    end = min(len(lines), hit + 12)
    if windows and start <= windows[-1][1] + 3:
        windows[-1] = (windows[-1][0], max(windows[-1][1], end))
    else:
        windows.append((start, end))

report.append('ISSUE 57 TRAINED POLICE PROFILE AUDIT')
report.append(f'Source lines: {len(lines)}')
report.append(f'Windows: {len(windows)}')
report.append('')

function_re = re.compile(r'^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')
report.append('RELEVANT FUNCTION INDEX')
for i, line in enumerate(lines, start=1):
    match = function_re.search(line)
    if match and re.search(r'train|police|person|registry|vehicle|require|select|verify', match.group(1), re.I):
        report.append(f'{i}: {match.group(1)}')
report.append('')

for start, end in windows:
    report.append(f'--- lines {start}-{end} ---')
    for n in range(start, end + 1):
        report.append(f'{n:05d}: {lines[n-1]}')
    report.append('')

Path('ISSUE_57_AUDIT.txt').write_text('\n'.join(report), encoding='utf-8')

segment_ranges = [
    (15420, 15940),
    (15940, 16680),
    (16680, 17480),
    (17880, 18180),
]
segment = []
for start, end in segment_ranges:
    segment.append(f'===== SOURCE {start}-{end} =====')
    for n in range(start, min(end, len(lines)) + 1):
        segment.append(f'{n:05d}: {lines[n-1]}')
    segment.append('')
Path('ISSUE_57_SOURCE.txt').write_text('\n'.join(segment), encoding='utf-8')

print(f'Wrote ISSUE_57_AUDIT.txt ({len(report)} lines)')
print(f'Wrote ISSUE_57_SOURCE.txt ({len(segment)} lines)')
