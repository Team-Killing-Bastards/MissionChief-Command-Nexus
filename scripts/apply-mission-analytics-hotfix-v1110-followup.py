#!/usr/bin/env python3
from pathlib import Path

OLD = "buildId: '1.1.9-activity-recorder-2'"
NEW = "buildId: '1.1.10-upload-lock-hotfix-1'"

updated = []
for path in sorted(Path('scripts').glob('check-*.mjs')):
    text = path.read_text(encoding='utf-8')
    if OLD not in text:
        continue
    path.write_text(text.replace(OLD, NEW), encoding='utf-8')
    updated.append(path.as_posix())

if not updated:
    raise SystemExit('No remaining logger build-marker regressions were updated')

print('Updated logger build marker in:')
for path in updated:
    print(f'  {path}')
