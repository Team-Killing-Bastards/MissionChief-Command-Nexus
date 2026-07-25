from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()

patterns = [
    r'getLiveRequirementDispatchTarget',
    r'readLiveMissionRequirementRow',
    r'Missing Personnel',
    r'Police Officers?',
    r'getPoliceOfficer',
    r'Rescue Support Vehicles?',
    r'Major Foam Tenders?',
    r'Fire Engine or RIV',
    r'recordUpdateRequirement',
    r'normalise.*Requirement',
    r'convert.*Police',
]
combined = re.compile('|'.join(f'(?:{p})' for p in patterns), re.I)

hits = []
for i, line in enumerate(lines, 1):
    if combined.search(line):
        hits.append(i)

windows = []
for line_no in hits:
    start = max(1, line_no - 12)
    end = min(len(lines), line_no + 24)
    if windows and start <= windows[-1][1] + 4:
        windows[-1] = (windows[-1][0], max(windows[-1][1], end))
    else:
        windows.append((start, end))

out = []
out.append('LIVE UPDATE / POLICE OFFICER AUDIT')
out.append(f'Source lines: {len(lines)}')
out.append(f'Windows: {len(windows)}')
out.append('')
for start, end in windows:
    out.append(f'===== lines {start}-{end} =====')
    for n in range(start, end + 1):
        out.append(f'{n:05d}: {lines[n-1]}')
    out.append('')

Path('LIVE_UPDATE_POLICE_OFFICER_AUDIT.txt').write_text('\n'.join(out), encoding='utf-8')
print(f'Wrote audit with {len(out)} lines')
