from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()

ranges = [
    (21308, 21398, 'PROCESS ROW MISSING PUSH'),
    (21540, 21705, 'RETRY AND FINAL POPUP'),
    (25890, 26120, 'ALERT ROW COLLECTION'),
]

out = ['EXACT FINAL MISSING BLOCKS', '']
for start, end, title in ranges:
    out.append(f'===== {title} =====')
    for number in range(start, end + 1):
        out.append(f'{number:05d}: {lines[number - 1]}')
    out.append('')

Path('LIVE_UPDATE_EXACT.txt').write_text('\n'.join(out), encoding='utf-8')
print('Wrote exact final missing blocks')
