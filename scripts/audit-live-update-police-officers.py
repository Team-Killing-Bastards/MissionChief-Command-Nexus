from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()

ranges = [
    (10720, 10940, 'RIV AND MAJOR FOAM SELECTORS'),
    (11390, 11810, 'VEHICLE MATCH CANDIDATES'),
    (17080, 17220, 'MISSING PERSONNEL SEGMENT AND COUNT PARSER'),
    (20620, 20940, 'POLICE OFFICER AND MISSING PERSONNEL CONVERTERS'),
    (21080, 21680, 'SHARED REQUIREMENT PROCESSING AND RETRY'),
    (23880, 24480, 'MISSION UPDATE LIVE ROW TARGETS'),
    (25380, 25530, 'UNIT FINDER PERSONNEL NORMALISATION'),
    (25880, 26140, 'MISSING PERSONNEL UPDATE COLLECTION'),
]

out = [
    'CRITICAL LIVE UPDATE SOURCE BLOCKS',
    f'Source lines: {len(lines)}',
    '',
]

for marker in [
    'function resolveUnitName(',
    'function selectMatchingVehicles(',
    'function processRequirementRows(',
    'function retryMissingUnits(',
]:
    matches = [index for index, line in enumerate(lines, 1) if marker in line]
    out.append(f'MARKER {marker}: {matches}')
    for line_no in matches:
        start = max(1, line_no - 25)
        end = min(len(lines), line_no + 120)
        out.append(f'===== DYNAMIC {marker}: source lines {start}-{end} =====')
        for number in range(start, end + 1):
            out.append(f'{number:05d}: {lines[number - 1]}')
        out.append('')

for start, end, title in ranges:
    out.append(f'===== {title}: source lines {start}-{end} =====')
    for number in range(start, min(end, len(lines)) + 1):
        out.append(f'{number:05d}: {lines[number - 1]}')
    out.append('')

Path('LIVE_UPDATE_CRITICAL.txt').write_text('\n'.join(out), encoding='utf-8')
print('Wrote critical source blocks')
