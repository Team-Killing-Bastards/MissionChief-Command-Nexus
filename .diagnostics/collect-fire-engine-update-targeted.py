#!/usr/bin/env python3
from pathlib import Path

lines = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8').splitlines()
needles = [
    'auto-mode-button', 'autoModeButton', 'autoModeBtn', 'mf-auto',
    'mfQueueRestartEnabled', 'mf_next_queue_restart', 'queueRestart',
    'next queue', 'queue restart', 'Start Auto Mode', 'checkbox'
]
out=[]
seen=set()
for needle in needles:
    hits=[i for i,l in enumerate(lines) if needle.lower() in l.lower()]
    out.append(f'=== {needle}: {len(hits)} ===')
    for i in hits:
        a=max(0,i-45); b=min(len(lines),i+70)
        key=(a,b)
        if key in seen: continue
        seen.add(key)
        out.append(f'--- source {a+1}-{b} ---')
        for j in range(a,b): out.append(f'{j+1:06d}: {lines[j]}')
    out.append('')
Path('.diagnostics/fire-engine-update-targeted.txt').write_text('\n'.join(out)+'\n',encoding='utf-8')
