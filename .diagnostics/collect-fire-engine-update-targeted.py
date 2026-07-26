#!/usr/bin/env python3
from pathlib import Path

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines()
out=[]
for needle in ['Start Auto Mode','Stop Auto Mode','Auto Mode','dispatch','queue','Unit Finder','Mission Update']:
    hits=[i for i,l in enumerate(lines) if needle.lower() in l.lower()]
    out.append(f'=== {needle}: {len(hits)} ===')
    for i in hits[:120]:
        if needle in ['Auto Mode','dispatch','queue','Unit Finder','Mission Update'] and not any(k in lines[i].lower() for k in ['checkbox','label','createelement','innerhtml','textcontent','append','auto-mode','auto mode','dispatch after','queue']):
            continue
        a=max(0,i-28); b=min(len(lines),i+45)
        out.append(f'--- source {a+1}-{b} ---')
        for j in range(a,b): out.append(f'{j+1:06d}: {lines[j]}')
    out.append('')
Path('.diagnostics/fire-engine-update-targeted.txt').write_text('\n'.join(out)+'\n',encoding='utf-8')
