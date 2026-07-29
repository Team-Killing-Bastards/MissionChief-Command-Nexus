#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-mission-definition-trained-personnel.mjs')
text = path.read_text(encoding='utf-8')
old = r'''requireText("source:\n                            'mission-definition-required-personnel'", 'mission-definition source marker');'''
new = '''requireText("'mission-definition-required-personnel'", 'mission-definition source marker');'''
if old not in text:
    raise SystemExit('Expected formatting-sensitive mission-definition assertion was not found.')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Updated mission-definition regression source-marker assertion.')
