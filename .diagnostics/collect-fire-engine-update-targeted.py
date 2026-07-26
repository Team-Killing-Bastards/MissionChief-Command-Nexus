#!/usr/bin/env python3
from pathlib import Path
import re

source = Path('src/missionchief-command-nexus.user.js').read_text(encoding='utf-8')
lines = source.splitlines(True)
starts=[]
pos=0
for i,line in enumerate(lines):
    starts.append(pos); pos += len(line)

def line_for(offset):
    import bisect
    return bisect.bisect_right(starts, offset)

out=[]
patterns=[
    r'Starts\s*from\s*the\s*current',
    r'Dispatch\s*after\s*queue',
    r'keeps\s*repeating',
    r'Unit\s*Finder\s*[-→>]+\s*Mission\s*Update',
    r'Live\s*current-mission\s*source\s*found',
]
for pat in patterns:
    ms=list(re.finditer(pat, source, re.I|re.S))
    out.append(f'=== {pat}: {len(ms)} ===')
    for m in ms:
        a=max(0,m.start()-1400); b=min(len(source),m.end()+1800)
        out.append(f'--- chars {a}-{b} approx lines {line_for(a)}-{line_for(b)} ---')
        out.append(source[a:b])
    out.append('')

Path('.diagnostics/fire-engine-update-targeted.txt').write_text('\n'.join(out), encoding='utf-8')
