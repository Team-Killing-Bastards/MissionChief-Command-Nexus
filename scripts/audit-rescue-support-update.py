from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()
terms = [
    'Rescue Support Vehicle',
    'Major Foam Tender',
    'Fire Engine or RIV',
    'Fire Engines or RIVs',
    'resolveUnitName',
    'countSelectedMatchingVehicles',
    'missingAfterAttempt',
    'selectVehicleUnits',
    'Final missing units',
    'processMissionRequirements',
    'processRequirementRows',
    'readMissionUpdateRows',
    'mission help',
    'sourceLabel',
]

hits = []
for index, line in enumerate(lines, start=1):
    if any(term.lower() in line.lower() for term in terms):
        hits.append(index)

windows = []
for line_no in hits:
    start = max(1, line_no - 14)
    end = min(len(lines), line_no + 28)
    if windows and start <= windows[-1][1] + 3:
        windows[-1] = (windows[-1][0], max(windows[-1][1], end))
    else:
        windows.append((start, end))

# Always include the complete shared requirement-processing and retry block.
windows.append((18600, 19520))
windows = sorted(windows)
merged = []
for start, end in windows:
    if merged and start <= merged[-1][1] + 3:
        merged[-1] = (merged[-1][0], max(merged[-1][1], end))
    else:
        merged.append((start, end))

out = []
out.append('RESCUE SUPPORT / FIRE ENGINE UPDATE AUDIT')
out.append(f'Total lines: {len(lines)}')
out.append(f'Windows: {len(merged)}')
out.append('')
for start, end in merged:
    out.append(f'===== {start}-{end} =====')
    for n in range(start, end + 1):
        out.append(f'{n:05d}: {lines[n-1]}')
    out.append('')

Path('RESCUE_SUPPORT_UPDATE_AUDIT.txt').write_text('\n'.join(out), encoding='utf-8')
print(f'Wrote {len(out)} report lines')
