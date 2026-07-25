from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()

ranges = [
    (12380, 12780, 'FIND UNIT BUTTON AND STRICT FALLBACKS'),
    (21270, 21405, 'PROCESS ROW RESULT AND MISSING PUSH'),
    (21540, 21710, 'RETRY RESULT AND FINAL POPUP'),
    (23900, 24480, 'GENERIC AND LIVE UPDATE ROWS'),
    (25820, 26220, 'MISSING PERSONNEL COLLECTION'),
]

out = [
    'FINAL MISSING-UNIT MUTATION AUDIT',
    f'Source lines: {len(lines)}',
    '',
]

for start, end, title in ranges:
    out.append(f'===== {title}: source lines {start}-{end} =====')
    for number in range(start, min(end, len(lines)) + 1):
        out.append(f'{number:05d}: {lines[number - 1]}')
    out.append('')

Path('LIVE_UPDATE_MUTATION.txt').write_text('\n'.join(out), encoding='utf-8')
print('Wrote final missing-unit mutation audit')
