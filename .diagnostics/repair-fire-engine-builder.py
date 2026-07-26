#!/usr/bin/env python3
from pathlib import Path

path = Path('.diagnostics/apply-fire-engine-update-fix.py')
text = path.read_text(encoding='utf-8')

old = "source.indexOf('\\n    function "
new = "source.indexOf('\\\\n    function "
count = text.count(old)
if count != 5:
    raise SystemExit(f'Expected 5 generated JavaScript newline anchors, found {count}')
text = text.replace(old, new)

old_selector = r'"input[type=\"checkbox\"]"'
new_selector = "'input[type=\"checkbox\"]'"
if text.count(old_selector) != 1:
    raise SystemExit(f'Expected one generated checkbox assertion token, found {text.count(old_selector)}')
text = text.replace(old_selector, new_selector, 1)

path.write_text(text, encoding='utf-8')
print('Repaired generated JavaScript escape sequences in Fire Engine builder.')
